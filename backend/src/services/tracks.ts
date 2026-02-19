import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import * as schema from '../db/schema';

// Types
type DbType = {
  select: (...args: any[]) => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
};

// Track with computed fields
export interface TrackWithStats extends schema.Track {
  agentNames?: string[];
  recentCommits?: number;
  recentDevlogs?: number;
}

/**
 * Get all tracks for a workspace
 */
export async function getWorkspaceTracks(
  db: DbType,
  workspaceId: string,
  filters?: {
    status?: string;
    category?: string;
    priority?: string;
  }
): Promise<TrackWithStats[]> {
  let query = db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.workspaceId, workspaceId))
    .orderBy(desc(schema.tracks.updatedAt));

  if (filters?.status) {
    query = query.where(eq(schema.tracks.status, filters.status));
  }

  const tracks = await query;
  
  // Enhance with agent names
  const enhancedTracks = await Promise.all(
    tracks.map(async (track: schema.Track) => {
      const agentIds = JSON.parse(track.agentIds || '[]');
      let agentNames: string[] = [];
      
      if (agentIds.length > 0) {
        const agents = await db
          .select({ name: schema.agents.name })
          .from(schema.agents)
          .where(sql`${schema.agents.id} IN ${agentIds}`);
        agentNames = agents.map((a: { name: string }) => a.name);
      }

      return {
        ...track,
        agentNames,
      };
    })
  );

  return enhancedTracks;
}

/**
 * Get track by ID
 */
export async function getTrackById(
  db: DbType,
  trackId: string,
  workspaceId: string
): Promise<TrackWithStats | null> {
  const [track] = await db
    .select()
    .from(schema.tracks)
    .where(
      and(
        eq(schema.tracks.id, trackId),
        eq(schema.tracks.workspaceId, workspaceId)
      )
    );

  if (!track) return null;

  const agentIds = JSON.parse(track.agentIds || '[]');
  let agentNames: string[] = [];
  
  if (agentIds.length > 0) {
    const agents = await db
      .select({ name: schema.agents.name })
      .from(schema.agents)
      .where(sql`${schema.agents.id} IN ${agentIds}`);
    agentNames = agents.map((a: { name: string }) => a.name);
  }

  // Get recent commits count
  const commitsCount = await db
    .select({ count: sql`COUNT(*)` })
    .from(schema.gitCommits)
    .where(
      and(
        eq(schema.gitCommits.trackId, trackId),
        gte(schema.gitCommits.committedAt, sql`datetime('now', '-7 days')`)
      )
    );

  // Get recent devlogs count
  const devlogsCount = await db
    .select({ count: sql`COUNT(*)` })
    .from(schema.devlogs)
    .where(
      and(
        eq(schema.devlogs.trackId, trackId),
        gte(schema.devlogs.createdAt, sql`datetime('now', '-7 days')`)
      )
    );

  return {
    ...track,
    agentNames,
    recentCommits: commitsCount[0]?.count || 0,
    recentDevlogs: devlogsCount[0]?.count || 0,
  };
}

/**
 * Create a new track
 */
export async function createTrack(
  db: DbType,
  workspaceId: string,
  userId: string,
  data: {
    name: string;
    slug?: string;
    description?: string;
    category?: string;
    priority?: string;
    dueDate?: string;
    agentIds?: string[];
    tags?: string[];
    estimatedTokens?: number;
    estimatedCost?: number;
  }
): Promise<schema.Track> {
  const now = new Date().toISOString();
  const trackId = `track-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');

  await db.insert(schema.tracks).values({
    id: trackId,
    workspaceId,
    userId,
    name: data.name,
    slug,
    description: data.description ?? null,
    category: data.category ?? 'feature',
    status: 'active',
    priority: data.priority ?? 'medium',
    progress: 0,
    totalTasks: 0,
    completedTasks: 0,
    estimatedTokens: data.estimatedTokens ?? 0,
    usedTokens: 0,
    estimatedCost: data.estimatedCost ?? 0,
    actualCost: 0,
    timeSpent: 0,
    agentIds: JSON.stringify(data.agentIds || []),
    tags: JSON.stringify(data.tags || []),
    startedAt: now,
    dueDate: data.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const [track] = await db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.id, trackId));

  return track;
}

/**
 * Update track
 */
export async function updateTrack(
  db: DbType,
  trackId: string,
  workspaceId: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    progress: number;
    dueDate: string;
    agentIds: string[];
    tags: string[];
    estimatedTokens: number;
    estimatedCost: number;
  }>
): Promise<schema.Track> {
  const updates: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (data.agentIds) {
    updates.agentIds = JSON.stringify(data.agentIds);
  }
  if (data.tags) {
    updates.tags = JSON.stringify(data.tags);
  }

  await db
    .update(schema.tracks)
    .set(updates)
    .where(
      and(
        eq(schema.tracks.id, trackId),
        eq(schema.tracks.workspaceId, workspaceId)
      )
    );

  const [track] = await db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.id, trackId));

  return track;
}

/**
 * Delete track
 */
export async function deleteTrack(
  db: DbType,
  trackId: string,
  workspaceId: string
): Promise<void> {
  await db
    .delete(schema.tracks)
    .where(
      and(
        eq(schema.tracks.id, trackId),
        eq(schema.tracks.workspaceId, workspaceId)
      )
    );
}

/**
 * Update track progress based on tasks
 */
export async function updateTrackProgress(
  db: DbType,
  trackId: string
): Promise<void> {
  const [stats] = await db
    .select({
      total: sql`COUNT(*)`,
      completed: sql`SUM(CASE WHEN ${schema.tasks.status} = 'done' THEN 1 ELSE 0 END)`,
    })
    .from(schema.tasks)
    .where(eq(schema.tasks.trackId, trackId));

  const total = Number(stats?.total || 0);
  const completed = Number(stats?.completed || 0);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  await db
    .update(schema.tracks)
    .set({
      totalTasks: total,
      completedTasks: completed,
      progress,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.tracks.id, trackId));
}

/**
 * Get track statistics for dashboard
 */
export async function getTrackStats(
  db: DbType,
  workspaceId: string
): Promise<{
  total: number;
  active: number;
  completed: number;
  totalProgress: number;
  totalCost: number;
  totalTime: number;
}> {
  const [stats] = await db
    .select({
      total: sql`COUNT(*)`,
      active: sql`SUM(CASE WHEN ${schema.tracks.status} = 'active' THEN 1 ELSE 0 END)`,
      completed: sql`SUM(CASE WHEN ${schema.tracks.status} = 'completed' THEN 1 ELSE 0 END)`,
      totalProgress: sql`AVG(${schema.tracks.progress})`,
      totalCost: sql`SUM(${schema.tracks.actualCost})`,
      totalTime: sql`SUM(${schema.tracks.timeSpent})`,
    })
    .from(schema.tracks)
    .where(eq(schema.tracks.workspaceId, workspaceId));

  return {
    total: Number(stats?.total || 0),
    active: Number(stats?.active || 0),
    completed: Number(stats?.completed || 0),
    totalProgress: Math.round(Number(stats?.totalProgress || 0)),
    totalCost: Number(stats?.totalCost || 0),
    totalTime: Number(stats?.totalTime || 0),
  };
}

/**
 * Add time to track
 */
export async function addTrackTime(
  db: DbType,
  trackId: string,
  minutes: number
): Promise<void> {
  await db
    .update(schema.tracks)
    .set({
      timeSpent: sql`${schema.tracks.timeSpent} + ${minutes}`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.tracks.id, trackId));
}

/**
 * Add tokens/cost to track
 */
export async function addTrackUsage(
  db: DbType,
  trackId: string,
  tokens: number,
  cost: number
): Promise<void> {
  await db
    .update(schema.tracks)
    .set({
      usedTokens: sql`${schema.tracks.usedTokens} + ${tokens}`,
      actualCost: sql`${schema.tracks.actualCost} + ${cost}`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.tracks.id, trackId));
}

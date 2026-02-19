import { eq, and, desc, sql, gte } from 'drizzle-orm';
import * as schema from '../db/schema';

// Types
type DbType = {
  select: (...args: any[]) => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
};

export interface DevlogWithRelations extends schema.Devlog {
  agentName?: string;
  trackName?: string;
  taskTitle?: string;
}

/**
 * Get devlogs for workspace
 */
export async function getWorkspaceDevlogs(
  db: DbType,
  workspaceId: string,
  options?: {
    trackId?: string;
    agentId?: string;
    category?: string;
    limit?: number;
    offset?: number;
    isMilestone?: boolean;
  }
): Promise<DevlogWithRelations[]> {
  let query = db
    .select()
    .from(schema.devlogs)
    .where(eq(schema.devlogs.workspaceId, workspaceId));

  if (options?.trackId) {
    query = query.where(eq(schema.devlogs.trackId, options.trackId));
  }

  if (options?.agentId) {
    query = query.where(eq(schema.devlogs.agentId, options.agentId));
  }

  if (options?.category) {
    query = query.where(eq(schema.devlogs.category, options.category));
  }

  if (options?.isMilestone !== undefined) {
    query = query.where(eq(schema.devlogs.isMilestone, options.isMilestone));
  }

  const devlogs = await query
    .orderBy(desc(schema.devlogs.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);

  // Enhance with relations
  const enhanced = await Promise.all(
    devlogs.map(async (devlog: schema.Devlog) => {
      let agentName, trackName, taskTitle;

      if (devlog.agentId) {
        const [agent] = await db
          .select({ name: schema.agents.name })
          .from(schema.agents)
          .where(eq(schema.agents.id, devlog.agentId));
        agentName = agent?.name;
      }

      if (devlog.trackId) {
        const [track] = await db
          .select({ name: schema.tracks.name })
          .from(schema.tracks)
          .where(eq(schema.tracks.id, devlog.trackId));
        trackName = track?.name;
      }

      if (devlog.taskId) {
        const [task] = await db
          .select({ title: schema.tasks.title })
          .from(schema.tasks)
          .where(eq(schema.tasks.id, devlog.taskId));
        taskTitle = task?.title;
      }

      return {
        ...devlog,
        agentName,
        trackName,
        taskTitle,
      };
    })
  );

  return enhanced;
}

/**
 * Get devlog by ID
 */
export async function getDevlogById(
  db: DbType,
  devlogId: string,
  workspaceId: string
): Promise<DevlogWithRelations | null> {
  const [devlog] = await db
    .select()
    .from(schema.devlogs)
    .where(
      and(
        eq(schema.devlogs.id, devlogId),
        eq(schema.devlogs.workspaceId, workspaceId)
      )
    );

  if (!devlog) return null;

  let agentName, trackName, taskTitle;

  if (devlog.agentId) {
    const [agent] = await db
      .select({ name: schema.agents.name })
      .from(schema.agents)
      .where(eq(schema.agents.id, devlog.agentId));
    agentName = agent?.name;
  }

  if (devlog.trackId) {
    const [track] = await db
      .select({ name: schema.tracks.name })
      .from(schema.tracks)
      .where(eq(schema.tracks.id, devlog.trackId));
    trackName = track?.name;
  }

  if (devlog.taskId) {
    const [task] = await db
      .select({ title: schema.tasks.title })
      .from(schema.tasks)
      .where(eq(schema.tasks.id, devlog.taskId));
    taskTitle = task?.title;
  }

  return {
    ...devlog,
    agentName,
    trackName,
    taskTitle,
  };
}

/**
 * Create new devlog
 */
export async function createDevlog(
  db: DbType,
  workspaceId: string,
  userId: string,
  data: {
    title: string;
    content: string;
    category?: string;
    trackId?: string;
    taskId?: string;
    agentId?: string;
    filesChanged?: string[];
    linesAdded?: number;
    linesRemoved?: number;
    tokensUsed?: number;
    sessionDuration?: number;
    isMilestone?: boolean;
  }
): Promise<schema.Devlog> {
  const devlogId = `devlog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  await db.insert(schema.devlogs).values({
    id: devlogId,
    workspaceId,
    userId,
    trackId: data.trackId ?? null,
    taskId: data.taskId ?? null,
    agentId: data.agentId ?? null,
    title: data.title,
    content: data.content,
    category: data.category ?? 'implementation',
    filesChanged: JSON.stringify(data.filesChanged || []),
    linesAdded: data.linesAdded ?? 0,
    linesRemoved: data.linesRemoved ?? 0,
    tokensUsed: data.tokensUsed ?? 0,
    sessionDuration: data.sessionDuration ?? 0,
    isMilestone: data.isMilestone ? 1 : 0,
    createdAt: new Date().toISOString(),
  });

  const [devlog] = await db
    .select()
    .from(schema.devlogs)
    .where(eq(schema.devlogs.id, devlogId));

  return devlog;
}

/**
 * Update devlog
 */
export async function updateDevlog(
  db: DbType,
  devlogId: string,
  workspaceId: string,
  data: Partial<{
    title: string;
    content: string;
    category: string;
    filesChanged: string[];
    linesAdded: number;
    linesRemoved: number;
    tokensUsed: number;
    sessionDuration: number;
    isMilestone: boolean;
  }>
): Promise<schema.Devlog> {
  const updates: Record<string, unknown> = { ...data };

  if (data.filesChanged) {
    updates.filesChanged = JSON.stringify(data.filesChanged);
  }

  if (data.isMilestone !== undefined) {
    updates.isMilestone = data.isMilestone ? 1 : 0;
  }

  await db
    .update(schema.devlogs)
    .set(updates)
    .where(
      and(
        eq(schema.devlogs.id, devlogId),
        eq(schema.devlogs.workspaceId, workspaceId)
      )
    );

  const [devlog] = await db
    .select()
    .from(schema.devlogs)
    .where(eq(schema.devlogs.id, devlogId));

  return devlog;
}

/**
 * Delete devlog
 */
export async function deleteDevlog(
  db: DbType,
  devlogId: string,
  workspaceId: string
): Promise<void> {
  await db
    .delete(schema.devlogs)
    .where(
      and(
        eq(schema.devlogs.id, devlogId),
        eq(schema.devlogs.workspaceId, workspaceId)
      )
    );
}

/**
 * Get devlog statistics
 */
export async function getDevlogStats(
  db: DbType,
  workspaceId: string
): Promise<{
  totalDevlogs: number;
  milestones: number;
  totalFilesChanged: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  categoryBreakdown: Record<string, number>;
}> {
  const [stats] = await db
    .select({
      total: sql`COUNT(*)`,
      milestones: sql`SUM(CASE WHEN ${schema.devlogs.isMilestone} = 1 THEN 1 ELSE 0 END)`,
      filesChanged: sql`SUM(JSON_LENGTH(${schema.devlogs.filesChanged}))`,
      linesAdded: sql`SUM(${schema.devlogs.linesAdded})`,
      linesRemoved: sql`SUM(${schema.devlogs.linesRemoved})`,
    })
    .from(schema.devlogs)
    .where(eq(schema.devlogs.workspaceId, workspaceId));

  // Get category breakdown
  const categories = await db
    .select({
      category: schema.devlogs.category,
      count: sql`COUNT(*)`,
    })
    .from(schema.devlogs)
    .where(eq(schema.devlogs.workspaceId, workspaceId))
    .groupBy(schema.devlogs.category);

  const categoryBreakdown: Record<string, number> = {};
  categories.forEach((c: any) => {
    categoryBreakdown[c.category] = Number(c.count);
  });

  return {
    totalDevlogs: Number(stats?.total || 0),
    milestones: Number(stats?.milestones || 0),
    totalFilesChanged: Number(stats?.filesChanged || 0),
    totalLinesAdded: Number(stats?.linesAdded || 0),
    totalLinesRemoved: Number(stats?.linesRemoved || 0),
    categoryBreakdown,
  };
}

/**
 * Get today's devlogs
 */
export async function getTodayDevlogs(
  db: DbType,
  workspaceId: string,
  limit: number = 10
): Promise<DevlogWithRelations[]> {
  const today = new Date().toISOString().split('T')[0];

  const devlogs = await db
    .select()
    .from(schema.devlogs)
    .where(
      and(
        eq(schema.devlogs.workspaceId, workspaceId),
        gte(schema.devlogs.createdAt, today)
      )
    )
    .orderBy(desc(schema.devlogs.createdAt))
    .limit(limit);

  // Enhance with agent info
  const enhanced = await Promise.all(
    devlogs.map(async (devlog: schema.Devlog) => {
      let agentName;

      if (devlog.agentId) {
        const [agent] = await db
          .select({ name: schema.agents.name })
          .from(schema.agents)
          .where(eq(schema.agents.id, devlog.agentId));
        agentName = agent?.name;
      }

      return {
        ...devlog,
        agentName,
      };
    })
  );

  return enhanced;
}

/**
 * Auto-generate devlog from session
 */
export async function generateDevlogFromSession(
  db: DbType,
  workspaceId: string,
  userId: string,
  sessionId: string
): Promise<schema.Devlog | null> {
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.id, sessionId),
        eq(schema.sessions.workspaceId, workspaceId)
      )
    );

  if (!session) return null;

  const [agent] = await db
    .select({ name: schema.agents.name })
    .from(schema.agents)
    .where(eq(schema.agents.id, session.agentId));

  // Get session logs summary
  const logs = await db
    .select()
    .from(schema.sessionLogs)
    .where(eq(schema.sessionLogs.sessionId, sessionId))
    .orderBy(schema.sessionLogs.timestamp);

  // Generate content from logs
  const content = logs
    .filter((log: schema.SessionLog) => log.type === 'tool_call' || log.type === 'message')
    .slice(0, 10)
    .map((log: schema.SessionLog) => `- ${log.content.slice(0, 100)}`)
    .join('\n');

  const title = `Session with ${agent?.name || 'Agent'} - ${new Date().toLocaleDateString()}`;

  return createDevlog(db, workspaceId, userId, {
    title,
    content: content || 'Session completed successfully',
    category: 'implementation',
    trackId: session.trackId ?? undefined,
    taskId: session.taskId ?? undefined,
    agentId: session.agentId,
    tokensUsed: session.inputTokens + session.outputTokens,
    sessionDuration: Math.floor(session.duration / 60),
  });
}

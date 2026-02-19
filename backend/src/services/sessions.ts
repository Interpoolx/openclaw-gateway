import { eq, and, desc, sql, gte } from 'drizzle-orm';
import * as schema from '../db/schema';

// Types
type DbType = {
  select: (...args: any[]) => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
};

export interface SessionWithAgent extends schema.Session {
  agentName?: string;
  agentAvatar?: string;
  trackName?: string;
}

/**
 * Get active sessions for workspace
 */
export async function getActiveSessions(
  db: DbType,
  workspaceId: string,
  limit: number = 10
): Promise<SessionWithAgent[]> {
  const sessions = await db
    .select()
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.workspaceId, workspaceId),
        eq(schema.sessions.status, 'active')
      )
    )
    .orderBy(desc(schema.sessions.lastActivityAt))
    .limit(limit);

  // Enhance with agent info
  const enhanced = await Promise.all(
    sessions.map(async (session: schema.Session) => {
      let agentName, agentAvatar, trackName;
      
      if (session.agentId) {
        const [agent] = await db
          .select({ name: schema.agents.name, avatar: schema.agents.avatar })
          .from(schema.agents)
          .where(eq(schema.agents.id, session.agentId));
        agentName = agent?.name;
        agentAvatar = agent?.avatar;
      }

      if (session.trackId) {
        const [track] = await db
          .select({ name: schema.tracks.name })
          .from(schema.tracks)
          .where(eq(schema.tracks.id, session.trackId));
        trackName = track?.name;
      }

      return {
        ...session,
        agentName,
        agentAvatar,
        trackName,
      };
    })
  );

  return enhanced;
}

/**
 * Get all sessions for workspace
 */
export async function getWorkspaceSessions(
  db: DbType,
  workspaceId: string,
  options?: {
    status?: string;
    agentId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<SessionWithAgent[]> {
  let query = db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.workspaceId, workspaceId));

  if (options?.status) {
    query = query.where(eq(schema.sessions.status, options.status));
  }

  if (options?.agentId) {
    query = query.where(eq(schema.sessions.agentId, options.agentId));
  }

  const sessions = await query
    .orderBy(desc(schema.sessions.startedAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);

  // Enhance with agent info
  const enhanced = await Promise.all(
    sessions.map(async (session: schema.Session) => {
      let agentName, agentAvatar;
      
      if (session.agentId) {
        const [agent] = await db
          .select({ name: schema.agents.name, avatar: schema.agents.avatar })
          .from(schema.agents)
          .where(eq(schema.agents.id, session.agentId));
        agentName = agent?.name;
        agentAvatar = agent?.avatar;
      }

      return {
        ...session,
        agentName,
        agentAvatar,
      };
    })
  );

  return enhanced;
}

/**
 * Get session by ID with logs
 */
export async function getSessionWithLogs(
  db: DbType,
  sessionId: string,
  workspaceId: string
): Promise<{ session: SessionWithAgent; logs: schema.SessionLog[] } | null> {
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
    .select({ name: schema.agents.name, avatar: schema.agents.avatar })
    .from(schema.agents)
    .where(eq(schema.agents.id, session.agentId));

  const logs = await db
    .select()
    .from(schema.sessionLogs)
    .where(eq(schema.sessionLogs.sessionId, sessionId))
    .orderBy(schema.sessionLogs.timestamp);

  return {
    session: {
      ...session,
      agentName: agent?.name,
      agentAvatar: agent?.avatar,
    },
    logs,
  };
}

/**
 * Create new session
 */
export async function createSession(
  db: DbType,
  workspaceId: string,
  data: {
    agentId: string;
    taskId?: string;
    trackId?: string;
  }
): Promise<schema.Session> {
  const now = new Date().toISOString();
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  await db.insert(schema.sessions).values({
    id: sessionId,
    workspaceId,
    agentId: data.agentId,
    taskId: data.taskId ?? null,
    trackId: data.trackId ?? null,
    status: 'active',
    messages: 0,
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
    startedAt: now,
    lastActivityAt: now,
    duration: 0,
  });

  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId));

  return session;
}

/**
 * Update session
 */
export async function updateSession(
  db: DbType,
  sessionId: string,
  workspaceId: string,
  data: Partial<{
    status: string;
    messages: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>
): Promise<schema.Session> {
  const updates: Record<string, unknown> = {
    ...data,
    lastActivityAt: new Date().toISOString(),
  };

  if (data.status === 'completed' || data.status === 'error') {
    updates.endedAt = new Date().toISOString();
    // Calculate duration
    const [session] = await db
      .select({ startedAt: schema.sessions.startedAt })
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId));
    
    if (session?.startedAt) {
      const duration = Math.floor(
        (Date.now() - new Date(session.startedAt).getTime()) / 1000
      );
      updates.duration = duration;
    }
  }

  await db
    .update(schema.sessions)
    .set(updates)
    .where(
      and(
        eq(schema.sessions.id, sessionId),
        eq(schema.sessions.workspaceId, workspaceId)
      )
    );

  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId));

  return session;
}

/**
 * Add session log
 */
export async function addSessionLog(
  db: DbType,
  sessionId: string,
  data: {
    type: string;
    content: string;
    metadata?: Record<string, unknown>;
    tokensIn?: number;
    tokensOut?: number;
  }
): Promise<schema.SessionLog> {
  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  await db.insert(schema.sessionLogs).values({
    id: logId,
    sessionId,
    type: data.type,
    content: data.content,
    metadata: JSON.stringify(data.metadata || {}),
    tokensIn: data.tokensIn ?? 0,
    tokensOut: data.tokensOut ?? 0,
    timestamp: new Date().toISOString(),
  });

  // Update session token counts
  await db
    .update(schema.sessions)
    .set({
      messages: sql`${schema.sessions.messages} + 1`,
      inputTokens: sql`${schema.sessions.inputTokens} + ${data.tokensIn ?? 0}`,
      outputTokens: sql`${schema.sessions.outputTokens} + ${data.tokensOut ?? 0}`,
      lastActivityAt: new Date().toISOString(),
    })
    .where(eq(schema.sessions.id, sessionId));

  const [log] = await db
    .select()
    .from(schema.sessionLogs)
    .where(eq(schema.sessionLogs.id, logId));

  return log;
}

/**
 * Get session statistics
 */
export async function getSessionStats(
  db: DbType,
  workspaceId: string
): Promise<{
  totalSessions: number;
  activeSessions: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
}> {
  const [stats] = await db
    .select({
      total: sql`COUNT(*)`,
      active: sql`SUM(CASE WHEN ${schema.sessions.status} = 'active' THEN 1 ELSE 0 END)`,
      totalTokens: sql`SUM(${schema.sessions.inputTokens} + ${schema.sessions.outputTokens})`,
      totalCost: sql`SUM(${schema.sessions.cost})`,
      avgDuration: sql`AVG(${schema.sessions.duration})`,
    })
    .from(schema.sessions)
    .where(eq(schema.sessions.workspaceId, workspaceId));

  return {
    totalSessions: Number(stats?.total || 0),
    activeSessions: Number(stats?.active || 0),
    totalTokens: Number(stats?.totalTokens || 0),
    totalCost: Number(stats?.totalCost || 0),
    avgDuration: Math.round(Number(stats?.avgDuration || 0)),
  };
}

/**
 * Get today's token usage
 */
export async function getTodayTokenUsage(
  db: DbType,
  workspaceId: string
): Promise<{
  tokens: number;
  cost: number;
  sessions: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  
  const [usage] = await db
    .select({
      tokens: sql`SUM(${schema.sessions.inputTokens} + ${schema.sessions.outputTokens})`,
      cost: sql`SUM(${schema.sessions.cost})`,
      sessions: sql`COUNT(*)`,
    })
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.workspaceId, workspaceId),
        gte(schema.sessions.startedAt, today)
      )
    );

  return {
    tokens: Number(usage?.tokens || 0),
    cost: Number(usage?.cost || 0),
    sessions: Number(usage?.sessions || 0),
  };
}

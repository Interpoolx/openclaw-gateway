import { sql, eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';

// Types
export interface WorkspaceContext {
  workspaceId: string;
  workspace: schema.Workspace;
  memberRole: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  workspace?: WorkspaceContext;
}

// Helper type for DB instance
type DbType = {
  select: (...args: any[]) => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
};

/**
 * Get user's workspaces
 */
export async function getUserWorkspaces(
  db: DbType,
  userId: string
): Promise<schema.Workspace[]> {
  const memberWorkspaces = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      description: schema.workspaces.description,
      ownerId: schema.workspaces.ownerId,
      gatewayUrl: schema.workspaces.gatewayUrl,
      gatewayToken: schema.workspaces.gatewayToken,
      settings: schema.workspaces.settings,
      tier: schema.workspaces.tier,
      isDefault: schema.workspaces.isDefault,
      avatar: schema.workspaces.avatar,
      color: schema.workspaces.color,
      createdAt: schema.workspaces.createdAt,
      updatedAt: schema.workspaces.updatedAt,
    })
    .from(schema.workspaces)
    .innerJoin(
      schema.workspaceMembers,
      eq(schema.workspaces.id, schema.workspaceMembers.workspaceId)
    )
    .where(eq(schema.workspaceMembers.userId, userId))
    .orderBy(desc(schema.workspaces.updatedAt));

  return memberWorkspaces;
}

/**
 * Get workspace by slug with membership check
 */
export async function getWorkspaceBySlug(
  db: DbType,
  userId: string,
  slug: string
): Promise<{ workspace: schema.Workspace; memberRole: string } | null> {
  const [result] = await db
    .select({
      workspace: schema.workspaces,
      memberRole: schema.workspaceMembers.role,
    })
    .from(schema.workspaces)
    .innerJoin(
      schema.workspaceMembers,
      eq(schema.workspaces.id, schema.workspaceMembers.workspaceId)
    )
    .where(
      and(
        eq(schema.workspaces.slug, slug),
        eq(schema.workspaceMembers.userId, userId)
      )
    );

  if (!result) return null;
  
  return {
    workspace: result.workspace,
    memberRole: result.memberRole,
  };
}

/**
 * Get workspace by ID with membership check
 */
export async function getWorkspaceById(
  db: DbType,
  userId: string,
  workspaceId: string
): Promise<{ workspace: schema.Workspace; memberRole: string } | null> {
  const [result] = await db
    .select({
      workspace: schema.workspaces,
      memberRole: schema.workspaceMembers.role,
    })
    .from(schema.workspaces)
    .innerJoin(
      schema.workspaceMembers,
      eq(schema.workspaces.id, schema.workspaceMembers.workspaceId)
    )
    .where(
      and(
        eq(schema.workspaces.id, workspaceId),
        eq(schema.workspaceMembers.userId, userId)
      )
    );

  if (!result) return null;
  
  return {
    workspace: result.workspace,
    memberRole: result.memberRole,
  };
}

/**
 * Check if user has required permission in workspace
 */
export function hasWorkspacePermission(
  memberRole: string,
  requiredRole: 'viewer' | 'member' | 'admin' | 'owner'
): boolean {
  const roleHierarchy: Record<string, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
  };

  return roleHierarchy[memberRole] >= roleHierarchy[requiredRole];
}

/**
 * Create a new workspace with default agents and tasks
 */
export async function createWorkspace(
  db: DbType,
  userId: string,
  data: {
    name: string;
    slug: string;
    description?: string;
    gatewayUrl?: string;
    gatewayToken?: string;
    avatar?: string;
    color?: string;
  }
): Promise<schema.Workspace> {
  const now = new Date().toISOString();
  const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    ownerId: userId,
    gatewayUrl: data.gatewayUrl ?? null,
    gatewayToken: data.gatewayToken ?? null,
    avatar: data.avatar ?? null,
    color: data.color ?? '#3b82f6',
    isDefault: false,
    tier: 'free',
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.workspaceMembers).values({
    workspaceId,
    userId,
    role: 'owner',
    joinedAt: now,
    invitedBy: null,
  });

  await createDefaultAgents(db, workspaceId, userId);
  await createDefaultTasks(db, workspaceId, userId);

  const [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));

  return workspace;
}

/**
 * Create default agents for a new workspace
 */
async function createDefaultAgents(
  db: DbType,
  workspaceId: string,
  userId: string
): Promise<void> {
  const defaultAgents = [
    {
      name: 'Assistant',
      avatar: '🤖',
      role: 'General Assistant',
      level: 'specialist',
      description: 'A general-purpose AI assistant ready to help with a wide range of tasks including answering questions, providing explanations, and offering guidance.',
      model: 'claude-3-sonnet',
    },
    {
      name: 'Developer',
      avatar: '💻',
      role: 'Software Developer',
      level: 'specialist',
      description: 'Expert programmer skilled in multiple languages and frameworks. Specializes in code reviews, debugging, and implementing features.',
      model: 'claude-3-opus',
    },
    {
      name: 'Researcher',
      avatar: '🔬',
      role: 'Research Analyst',
      level: 'specialist',
      description: 'Specialist in gathering, analyzing, and synthesizing information. Expert at finding patterns and extracting insights from data.',
      model: 'claude-3-sonnet',
    },
    {
      name: 'Writer',
      avatar: '✍️',
      role: 'Content Creator',
      level: 'specialist',
      description: 'Creative writer skilled in crafting engaging content, documentation, marketing copy, and technical writing.',
      model: 'claude-3-sonnet',
    },
  ];

  const now = new Date().toISOString();

  for (const agent of defaultAgents) {
    const agentId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await db.insert(schema.agents).values({
      id: agentId,
      workspaceId,
      userId,
      name: agent.name,
      avatar: agent.avatar,
      role: agent.role,
      level: agent.level,
      status: 'idle',
      model: agent.model,
      description: agent.description,
      toolsEnabled: JSON.stringify(['read', 'write', 'edit', 'exec', 'session_status']),
      skills: 5,
      wakeupConfig: JSON.stringify({ method: 'poll', intervalMs: 900000 }),
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Create default tasks for a new workspace
 */
async function createDefaultTasks(
  db: DbType,
  workspaceId: string,
  userId: string
): Promise<void> {
  const defaultTasks = [
    {
      title: 'Explore the codebase and understand the project structure',
      description: 'Take some time to familiarize yourself with the project. Identify key directories, main entry points, and architectural patterns. Note any interesting features or potential improvements you discover.',
      priority: 'high',
      tags: JSON.stringify(['onboarding', 'exploration']),
      category: 'research',
    },
    {
      title: 'Review recent changes and identify improvements',
      description: 'Check the git history for recent commits. Look for patterns, bug fixes, or new features. Consider what areas might benefit from refactoring or additional testing.',
      priority: 'medium',
      tags: JSON.stringify(['review', 'analysis']),
      category: 'research',
    },
    {
      title: 'Set up development environment',
      description: 'Ensure all dependencies are installed and configured correctly. Verify that the development server runs without errors. Document any setup steps that were not already covered.',
      priority: 'high',
      tags: JSON.stringify(['setup', 'onboarding']),
      category: 'feature',
    },
  ];

  const now = new Date().toISOString();

  for (const task of defaultTasks) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await db.insert(schema.tasks).values({
      id: taskId,
      workspaceId,
      userId,
      title: task.title,
      description: task.description,
      status: 'inbox',
      priority: task.priority,
      creatorId: userId,
      tags: task.tags,
      category: task.category,
      dueDate: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Update workspace
 */
export async function updateWorkspace(
  db: DbType,
  workspaceId: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    gatewayUrl: string;
    gatewayToken: string;
    settings: string;
    avatar: string;
    color: string;
  }>
): Promise<schema.Workspace> {
  const updates: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await db
    .update(schema.workspaces)
    .set(updates)
    .where(eq(schema.workspaces.id, workspaceId));

  const [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));

  return workspace;
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(
  db: DbType,
  workspaceId: string
): Promise<void> {
  await db
    .delete(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId));
}

/**
 * Invite member to workspace
 */
export async function inviteWorkspaceMember(
  db: DbType,
  workspaceId: string,
  invitedBy: string,
  userId: string,
  role: string = 'member'
): Promise<schema.WorkspaceMember> {
  const now = new Date().toISOString();

  await db.insert(schema.workspaceMembers).values({
    workspaceId,
    userId,
    role,
    joinedAt: now,
    invitedBy,
  });

  const [member] = await db
    .select()
    .from(schema.workspaceMembers)
    .where(
      and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId)
      )
    );

  return member;
}

/**
 * Remove member from workspace
 */
export async function removeWorkspaceMember(
  db: DbType,
  workspaceId: string,
  userId: string
): Promise<void> {
  await db
    .delete(schema.workspaceMembers)
    .where(
      and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId)
      )
    );
}

/**
 * Update member role
 */
export async function updateMemberRole(
  db: DbType,
  workspaceId: string,
  userId: string,
  newRole: string
): Promise<void> {
  await db
    .update(schema.workspaceMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.userId, userId)
      )
    );
}

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(
  db: DbType,
  workspaceId: string
): Promise<Array<{ member: schema.WorkspaceMember; user: schema.User }>> {
  const results = await db
    .select({
      member: schema.workspaceMembers,
      user: schema.users,
    })
    .from(schema.workspaceMembers)
    .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
    .where(eq(schema.workspaceMembers.workspaceId, workspaceId));

  return results;
}

/**
 * Set user's current workspace
 */
export async function setUserCurrentWorkspace(
  db: DbType,
  userId: string,
  workspaceId: string | null
): Promise<void> {
  await db
    .update(schema.users)
    .set({ currentWorkspaceId: workspaceId })
    .where(eq(schema.users.id, userId));
}

/**
 * Get user's current workspace
 */
export async function getUserCurrentWorkspace(
  db: DbType,
  userId: string
): Promise<schema.Workspace | null> {
  const [result] = await db
    .select({
      workspace: schema.workspaces,
    })
    .from(schema.users)
    .leftJoin(
      schema.workspaces,
      eq(schema.users.currentWorkspaceId, schema.workspaces.id)
    )
    .where(eq(schema.users.id, userId));

  return result?.workspace ?? null;
}

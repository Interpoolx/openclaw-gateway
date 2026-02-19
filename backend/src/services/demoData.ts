import { eq, and } from 'drizzle-orm';
import { agents, tasks, activities, users, userChannels, messages, workspaces, workspaceMembers, installedSkills } from '../db/schema';
import { SkillsService } from './skills';

// Core Default Agents for EVERY user
const DEFAULT_AGENTS = [
  {
    id: '0194f484-98c6-7934-8b45-4b219f7e813a',
    name: 'Spock',
    avatar: '🖖',
    role: 'Logic & Analysis Specialist',
    level: 'lead',
    status: 'idle',
    model: 'claude-3-opus',
    description: 'Logical, precise, and unemotional. Specializes in data analysis, code review, and problem-solving with pure reason.',
    skills: 10,
    toolsEnabled: ['read', 'write', 'edit', 'exec', 'web_search', 'memory_search', 'session_status'],
  },
  {
    id: '0194f484-9c42-7723-9271-8b4b7f7e9145',
    name: 'Data',
    avatar: '🤖',
    role: 'Coding & Technical Expert',
    level: 'specialist',
    status: 'idle',
    model: 'gpt-4-turbo',
    description: 'Android with vast technical knowledge. Excels at programming, debugging, and explaining complex technical concepts.',
    skills: 10,
    toolsEnabled: ['read', 'write', 'edit', 'apply_patch', 'exec', 'process', 'web_search', 'session_status'],
  },
  {
    id: '0194f485-021d-7934-a472-4b219f7e813a',
    name: 'Uhura',
    avatar: '📡',
    role: 'Communications & Marketing Lead',
    level: 'lead',
    status: 'idle',
    model: 'claude-3-opus',
    description: 'Master of communications and languages. Crafts compelling marketing copy, handles PR, and manages all messaging.',
    skills: 9,
    toolsEnabled: ['read', 'write', 'edit', 'web_search', 'web_fetch', 'memory_search', 'session_status'],
  },
];

// Demo-only agents (not part of the 3 defaults)
const EXTRA_DEMO_AGENTS = [
  {
    id: '0194f485-0a12-7934-8b45-4b219f7e813a', // Scotty
    name: 'Scotty',
    avatar: '🔧',
    role: 'Film & Media Engineer',
    level: 'specialist',
    status: 'idle',
    model: 'gpt-4-turbo',
    description: '"I cannae change the laws of physics!" Expert in video editing, audio processing, and media production workflows.',
    skills: 9,
    toolsEnabled: ['read', 'write', 'edit', 'exec', 'process', 'session_status'],
  },
  {
    id: '0194f485-115a-7934-8b45-4b219f7e813a', // Dr. Crusher
    name: 'Dr. Crusher',
    avatar: '🏥',
    role: 'Personal AI Assistant',
    level: 'specialist',
    status: 'idle',
    model: 'claude-3-opus',
    description: 'Caring and attentive personal assistant. Manages schedules, health reminders, and personal tasks with empathy.',
    skills: 8,
    toolsEnabled: ['read', 'write', 'edit', 'sessions_list', 'sessions_send', 'session_status', 'agents_list'],
  },
];

// Sub-agents for demo users
const DEMO_SUB_AGENTS = [
  {
    id: '0194f485-1b4e-7934-8b45-4b219f7e813a', // Tuvok
    parentId: '0194f484-98c6-7934-8b45-4b219f7e813a', // Spock
    name: 'Tuvok',
    avatar: '🧠',
    role: 'Security Analyst',
    level: 'specialist',
    status: 'idle',
    model: 'claude-3-sonnet',
    description: 'Vulcan security officer. Specializes in security audits, threat analysis, and risk assessment.',
    skills: 8,
    toolsEnabled: ['read', 'web_search', 'memory_search', 'session_status'],
  },
  {
    id: '0194f485-22a8-7934-8b45-4b219f7e813a', // LaForge
    parentId: '0194f484-9c42-7723-9271-8b4b7f7e9145', // Data
    name: 'Geordi LaForge',
    avatar: '👓',
    role: 'Systems Engineer',
    level: 'specialist',
    status: 'idle',
    model: 'gpt-4-turbo',
    description: 'Chief Engineer with VISOR. Expert in system architecture and infrastructure.',
    skills: 9,
    toolsEnabled: ['read', 'write', 'edit', 'exec', 'process', 'session_status'],
  },
];

const DEMO_TASKS = [
  { id: '0194f485-2a32-7934-a472-874b7f7e2145', title: 'Analyze quarterly performance metrics', description: 'Review the Q4 data and provide insights on trends', status: 'in_progress', priority: 'high', category: 'analysis' },
  { id: '0194f485-31bc-7934-8b45-4b219f7e813a', title: 'Draft marketing campaign', description: 'Create copy for the launch campaign', status: 'inbox', priority: 'medium', category: 'marketing' },
  { id: '0194f485-392d-7934-8b45-4b219f7e813a', title: 'Debug authentication module', description: 'Fix login issues', status: 'inbox', priority: 'urgent', category: 'development' },
];

/**
 * Ensure the 3 default agents exist for ANY user
 */
export async function ensureDefaultAgents(db: any, userId: string): Promise<void> {
  const now = new Date().toISOString();

  for (const agent of DEFAULT_AGENTS) {
    // Check if an agent with this name already exists for this user
    const [existingAgent] = await db.select()
      .from(agents)
      .where(and(eq(agents.userId, userId), eq(agents.name, agent.name)))
      .limit(1);

    if (!existingAgent) {
      await db.insert(agents).values({
        id: crypto.randomUUID(),
        userId,
        parentId: null,
        name: agent.name,
        avatar: agent.avatar,
        role: agent.role,
        level: agent.level,
        status: agent.status,
        model: agent.model,
        description: agent.description,
        skills: agent.skills,
        toolsEnabled: JSON.stringify(agent.toolsEnabled),
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

/**
 * Legacy check kept for compatibility in index.ts
 */
export async function hasDemoData(db: any, userId: string): Promise<boolean> {
  const userAgents = await db.select({ id: agents.id }).from(agents).where(eq(agents.userId, userId)).limit(1);
  return userAgents.length > 0;
}

/**
 * Check if the user has deep demo data (beyond just defaults)
 */
export async function hasFullDemoData(db: any, userId: string): Promise<boolean> {
  // Check for tasks as a proxy for full demo data
  const userTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId)).limit(1);
  return userTasks.length > 0;
}

/**
 * Create full demo data for a user (Default Agents + Extras + Tasks)
 */
export async function createDemoData(db: any, userId: string): Promise<void> {
  // 1. Ensure Defaults
  await ensureDefaultAgents(db, userId);

  // 1.5 Ensure Default Skills for the default workspace
  // We need to find the default workspace ID first
  const [member] = await db.select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .limit(1);

  if (member) {
    await SkillsService.installDefaultSkills(db, userId, member.workspaces.id);
  }

  const now = new Date().toISOString();

  try {
    // 2. Add Extra demo agents
    for (const agent of EXTRA_DEMO_AGENTS) {
      const [existing] = await db.select()
        .from(agents)
        .where(and(eq(agents.userId, userId), eq(agents.name, agent.name)))
        .limit(1);

      if (!existing) {
        await db.insert(agents).values({
          id: crypto.randomUUID(),
          userId,
          parentId: null,
          name: agent.name,
          avatar: agent.avatar,
          role: agent.role,
          level: agent.level,
          status: agent.status,
          model: agent.model,
          description: agent.description,
          skills: agent.skills,
          toolsEnabled: JSON.stringify(agent.toolsEnabled),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 3. Add Sub-agents
    for (const sub of DEMO_SUB_AGENTS) {
      const [existing] = await db.select()
        .from(agents)
        .where(and(eq(agents.userId, userId), eq(agents.name, sub.name)))
        .limit(1);

      if (!existing) {
        // Find parent's current ID in DB for this user
        // We look for parents by name for this user specifically
        const parentName = sub.parentId === '0194f484-98c6-7934-8b45-4b219f7e813a' ? 'Spock' : 'Data';
        const [parent] = await db.select()
          .from(agents)
          .where(and(eq(agents.userId, userId), eq(agents.name, parentName)))
          .limit(1);

        if (parent) {
          await db.insert(agents).values({
            id: crypto.randomUUID(),
            userId,
            parentId: parent.id,
            name: sub.name,
            avatar: sub.avatar,
            role: sub.role,
            level: sub.level,
            status: sub.status,
            model: sub.model,
            description: sub.description,
            skills: sub.skills,
            toolsEnabled: JSON.stringify(sub.toolsEnabled),
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // 4. Add Sample Tasks
    for (const task of DEMO_TASKS) {
      const [existing] = await db.select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.title, task.title)))
        .limit(1);

      if (!existing) {
        await db.insert(tasks).values({
          id: crypto.randomUUID(),
          userId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          category: task.category,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  } catch (error) {
    console.error('Error creating demo data:', error);
    throw error;
  }
}

/**
 * Ensure the user has at least one workspace.
 * If none exist, create a default one.
 */
export async function ensureDefaultWorkspace(db: any, userId: string, userName: string): Promise<any> {
  // Check for any workspace the user is a member of
  const [existingMember] = await db.select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .orderBy(workspaces.createdAt)
    .limit(1);

  if (existingMember) {
    return existingMember.workspaces;
  }

  // No workspace found, create a default one
  console.log(`[AUTH] No workspace found for user ${userId}, creating default...`);

  const workspaceId = crypto.randomUUID();
  // Simple slug: ws- + first 8 chars of UUID
  const slug = `ws-${workspaceId.substring(0, 8)}`;
  const now = new Date().toISOString();

  await db.insert(workspaces).values({
    id: workspaceId,
    name: `${userName}'s Workspace`,
    slug,
    ownerId: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceMembers).values({
    workspaceId,
    userId,
    role: 'owner',
    joinedAt: now,
  });

  const [newWorkspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  return newWorkspace;
}

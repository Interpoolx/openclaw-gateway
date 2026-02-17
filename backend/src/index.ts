/**
 * CLAWPUTE BACKEND SERVICE
 * 
 * This file is the main entry point for the backend API (Cloudflare Worker).
 * Its purpose is to:
 * 1. Initialize the Hono application.
 * 2. Configure global middleware (CORS, Logging, etc.).
 * 3. Define API routes for user authentication, task management, and agent orchestration.
 * 4. Serve as the bridge between the frontend and the D1 database.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { sql, eq, and, inArray, desc } from 'drizzle-orm';
import * as schema from './db/schema';
import { createDemoData, hasDemoData, ensureDefaultAgents, hasFullDemoData, ensureDefaultWorkspace } from './services/demoData';
import { getDb, getUserFromToken } from './middleware/auth';
import { hashPassword, verifyPassword } from './lib/crypto';
import { SecurityService } from './services/security';
import {
  convertWsToHttp,
  discoverOpenClawInfo,
  OpenClawHttpClient,
  testOpenClawHttp,
  createGatewayAgent,
  createAgentViaCli,
  invokeOpenClawViaWebSocketAny,
  getChannelsViaCli,
  getCronJobsViaCli,
  getGatewayConfigViaCli,
  getLogsViaCli,
  getSessionsViaCli,
  getSkillsViaCli,
  getUsageViaCli,
  fetchGatewayAgentsList,
  fetchGatewayDataset,
  probeGatewayAgents,
} from './lib/openclaw-gateway';
import { runFullDiagnostic } from './lib/openclaw-gateway/diagnostic';
import { SkillsService } from './services/skills';

// Types for environment
interface Env {
  DB: D1Database;
  OPENCLAW_URL: string;
  OPENCLAW_API_KEY: string;
  OPENCLAW_MODE: string;
  JWT_SECRET: string;
}

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/api/health', async (c) => {
  return c.json({
    status: 'ok',
    mode: c.env.OPENCLAW_MODE ?? 'unknown',
    timestamp: new Date().toISOString()
  });
});

// ========== AUTH ROUTES ==========

// Demo user credentials (in production, these would be in the database with hashed passwords)
app.get('/api/debug/crypto', async (c) => {
  try {
    const { hashPassword, verifyPassword } = await import('./lib/crypto');
    const start = Date.now();
    const hash = await hashPassword('test');
    const isValid = await verifyPassword('test', hash);

    return c.json({
      status: 'ok',
      buffer: typeof Buffer !== 'undefined' ? 'global' : 'module',
      crypto: typeof crypto !== 'undefined' ? 'present' : 'missing',
      subtle: typeof crypto?.subtle !== 'undefined' ? 'present' : 'missing',
      test: { hash, isValid },
      duration: Date.now() - start
    });
  } catch (err) {
    return c.json({
      error: 'Crypto test failed',
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    }, 500);
  }
});

const DEMO_USERS: Record<string, { id: string; passwordHash: string; name: string; role: string; avatar: string }> = {
  'admin1$@clawpute.com': {
    id: '0194f484-98c5-7f41-863a-8745582f3c3a',
    passwordHash: 'pbkdf2:100000:7Hsywgj17Cu2oaNfc4kl9w==:hGp1zy0cCnNuKo0TBQnZHDtm9u6T2S6j4TeU98qNX1w=',
    name: 'Super Admin',
    role: 'super_admin',
    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff',
  },
};

// Demo login endpoint
app.post('/api/auth/demo-login', async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json();
  const { email, password } = body;

  // 1. Check database for existing user first (More Secure)
  const [dbUser] = await db.select().from(schema.users).where(eq(schema.users.email, email?.toLowerCase()));

  if (dbUser) {
    console.log(`[AUTH] Found user in DB: ${dbUser.email} (ID: ${dbUser.id})`);
    console.log(`[AUTH] DB Hash present: ${!!dbUser.passwordHash}`);

    // 1. Check database password hash (Standard path)
    const hashToVerify = dbUser.passwordHash || DEMO_USERS[email?.toLowerCase()]?.passwordHash;
    console.log(`[AUTH] Using hash for verify: ${hashToVerify?.substring(0, 20)}...`);

    const isValid = hashToVerify && await verifyPassword(password, hashToVerify);
    console.log(`[AUTH] Password verification result: ${isValid}`);

    if (isValid) {
      console.log(`[AUTH] Login success for ${email}`);

      const defaultWorkspace = await ensureDefaultWorkspace(db, dbUser.id, dbUser.name);

      return c.json({
        success: true,
        token: dbUser.id,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          avatar: dbUser.avatar,
          isDemo: !!dbUser.isDemo,
        },
        defaultWorkspaceId: defaultWorkspace.id,
        defaultWorkspaceSlug: defaultWorkspace.slug
      });
    } else {
      console.warn(`[AUTH] Password verification failed for ${email}`);
    }
  } else {
    console.warn(`[AUTH] User not found in DB: ${email}`);
  }

  // 2. Initial login fallback (for users not yet in DB)
  const demoUser = DEMO_USERS[email?.toLowerCase()];
  if (!demoUser || !(await verifyPassword(password, demoUser.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // If we reach here, it's a valid DEMO_USER
  const userId = demoUser.id;
  const now = new Date().toISOString();

  try {
    // Ensure user record exists
    const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

    if (!existingUser) {
      await db.insert(schema.users).values({
        id: userId,
        email,
        name: demoUser.name,
        avatar: demoUser.avatar,
        role: demoUser.role,
        loginMethod: 'demo',
        isDemo: email === 'demo@clawpute.com',
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Created user record for demo user ${userId}`);
    }

    // Proactively check and create demo data if missing (idempotent)
    const demoDataUsers = [
      '0194f484-98c5-7ca5-9856-4b219f7e1234', // demo@clawpute.com
      '0194f484-98c5-703d-8289-4b219f7e813a', //
      '0194f484-98c6-7145-a472-874b7f7e2145'  //
    ];

    // EVERY user gets the 3 default agents
    await ensureDefaultAgents(db, userId);

    if (demoDataUsers.includes(userId)) {
      const fullDataExists = await hasFullDemoData(db, userId);
      if (!fullDataExists) {
        console.log(`[DEMO-LOGIN] Generating full demo data for ${userId}`);
        await createDemoData(db, userId);
      } else {
        console.log(`[DEMO-LOGIN] Full demo data already exists for ${userId}`);
      }
    }

    const defaultWorkspace = await ensureDefaultWorkspace(db, userId, demoUser.name);

    // Return user info and token
    return c.json({
      success: true,
      token: userId,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: demoUser.name,
        avatar: demoUser.avatar,
        role: demoUser.role,
        isDemo: true,
      },
      defaultWorkspaceId: defaultWorkspace.id,
      defaultWorkspaceSlug: defaultWorkspace.slug
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Proper login endpoint (DB-first, no demo fallback)
app.post('/api/auth/login', async (c) => {
  try {
    const db = getDb(c.env);
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Check database for existing user
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email?.toLowerCase()));

    // Verify against hashed password
    const isValid = user && await verifyPassword(password, user.passwordHash || '');

    if (!user || !isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Ensure default agents exist for every logged in user
    await ensureDefaultAgents(db, user.id);

    // Ensure user has a workspace
    const defaultWorkspace = await ensureDefaultWorkspace(db, user.id, user.name);

    // Return user info and token
    return c.json({
      success: true,
      token: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        isDemo: !!user.isDemo,
      },
      defaultWorkspaceId: defaultWorkspace.id,
      defaultWorkspaceSlug: defaultWorkspace.slug
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal server error during login' }, 500);
  }
});

// Get current user
app.get('/api/auth/me', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [userData] = await db.select().from(schema.users).where(eq(schema.users.id, user.userId));
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      role: userData.role,
      isDemo: userData.isDemo,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== SKILLS ROUTES (New) ==========

app.get('/api/skills', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // If no skills exist for this user, install defaults automatically
    // This is a lazy-init for existing users who log in
    const skills = await SkillsService.getInstalledSkills(db, user.userId, workspaceId);

    if (skills.length === 0 && workspaceId) {
      await SkillsService.installDefaultSkills(db, user.userId, workspaceId);
      // Fetch again after install
      const newSkills = await SkillsService.getInstalledSkills(db, user.userId, workspaceId);
      return c.json(newSkills);
    }

    return c.json(skills);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/skills/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const skill = await SkillsService.getInstalledSkill(db, id, user.userId);

    if (!skill) {
      return c.json({ error: 'Skill not found' }, 404);
    }

    return c.json(skill);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== AGENTS ROUTES (User-scoped) ==========

app.get('/api/agents', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    let agents;
    if (workspaceId) {
      // Filter by workspaceId (new multi-workspace behavior)
      agents = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.workspaceId, workspaceId))
        .orderBy(schema.agents.createdAt);
    } else {
      // Fallback to userId for backwards compatibility
      agents = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.userId, user.userId))
        .orderBy(schema.agents.createdAt);
    }
    return c.json({ agents });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/agents/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, id), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    return c.json(agent);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/agents', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const now = new Date().toISOString();
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : null;

    let workspaceConnection: { gatewayUrl?: string | null; gatewayToken?: string | null } | null = null;

    if (workspaceId) {
      const [workspaceMember] = await db
        .select({ workspace: schema.workspaces })
        .from(schema.workspaces)
        .innerJoin(
          schema.workspaceMembers,
          eq(schema.workspaces.id, schema.workspaceMembers.workspaceId)
        )
        .where(and(
          eq(schema.workspaces.id, workspaceId),
          eq(schema.workspaceMembers.userId, user.userId)
        ));

      if (!workspaceMember?.workspace) {
        return c.json({ error: 'Workspace not found or access denied' }, 404);
      }

      workspaceConnection = {
        gatewayUrl: workspaceMember.workspace.gatewayUrl,
        gatewayToken: workspaceMember.workspace.gatewayToken,
      };
    }

    const agentRecord: schema.NewAgent = {
      id,
      workspaceId,
      userId: user.userId,
      name: body.name ?? 'Unnamed Agent',
      avatar: body.avatar ?? '🤖',
      role: body.role ?? 'Agent',
      level: body.level ?? 'junior',
      status: 'idle',
      model: body.model ?? 'claude-3-sonnet',
      description: body.description ?? null,
      toolsEnabled: body.toolsEnabled ? JSON.stringify(body.toolsEnabled) : '[]',
      skills: body.skills ?? 0,
      wakeupConfig: JSON.stringify({ method: 'event', intervalMs: 60000 }),
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.agents).values(agentRecord);

    const shouldSyncToGateway = body.syncToGateway !== false;
    let gatewaySync: { synced: boolean; error?: string } = { synced: false };

    if (shouldSyncToGateway && workspaceConnection?.gatewayUrl && workspaceConnection?.gatewayToken) {
      try {
        const createResult = await createGatewayAgent(workspaceConnection.gatewayUrl, workspaceConnection.gatewayToken, {
          id,
          name: agentRecord.name,
          avatar: agentRecord.avatar,
          role: agentRecord.role,
          level: agentRecord.level,
          model: agentRecord.model,
          description: agentRecord.description,
          toolsEnabled: JSON.parse(agentRecord.toolsEnabled ?? '[]'),
        });
        if (createResult.created) {
          gatewaySync = { synced: true };
        } else {
          gatewaySync = { synced: false, error: createResult.error };
        }
      } catch (gatewayError) {
        gatewaySync = {
          synced: false,
          error: gatewayError instanceof Error ? gatewayError.message : 'Failed to sync agent to gateway',
        };
      }
    }

    return c.json({
      success: true,
      agent: { ...agentRecord },
      gatewaySync,
    }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.patch('/api/agents/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    const updates: Record<string, unknown> = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    if (body.toolsEnabled) {
      updates.toolsEnabled = JSON.stringify(body.toolsEnabled);
    }

    await db.update(schema.agents)
      .set(updates)
      .where(and(eq(schema.agents.id, id), eq(schema.agents.userId, user.userId)));

    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, id), eq(schema.agents.userId, user.userId)));

    return c.json({ success: true, agent: agent ?? null });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.delete('/api/agents/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    await db.delete(schema.agents)
      .where(and(eq(schema.agents.id, id), eq(schema.agents.userId, user.userId)));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== TOOLS ROUTES ==========

app.get('/api/tools', async (c) => {
  const tools = [
    { id: 'read', name: 'Read', description: 'Read files from disk', category: 'filesystem', enabled: true },
    { id: 'write', name: 'Write', description: 'Create new files', category: 'filesystem', enabled: true },
    { id: 'edit', name: 'Edit', description: 'Modify existing files', category: 'filesystem', enabled: true },
    { id: 'apply_patch', name: 'Apply Patch', description: 'Apply code patches', category: 'filesystem', enabled: false },
    { id: 'exec', name: 'Execute', description: 'Run shell commands', category: 'runtime', enabled: true },
    { id: 'process', name: 'Process', description: 'Manage processes', category: 'runtime', enabled: false },
    { id: 'web_search', name: 'Web Search', description: 'Search the web', category: 'web', enabled: true },
    { id: 'web_fetch', name: 'Web Fetch', description: 'Fetch web content', category: 'web', enabled: true },
    { id: 'memory_search', name: 'Memory Search', description: 'Search memories', category: 'memory', enabled: true },
    { id: 'memory_get', name: 'Memory Get', description: 'Get memories', category: 'memory', enabled: true },
    { id: 'session_status', name: 'Session Status', description: 'Check session status', category: 'sessions', enabled: true },
    { id: 'sessions_list', name: 'Sessions List', description: 'List all sessions', category: 'sessions', enabled: false },
    { id: 'sessions_history', name: 'Sessions History', description: 'View session history', category: 'sessions', enabled: false },
    { id: 'sessions_send', name: 'Sessions Send', description: 'Send to session', category: 'sessions', enabled: false },
    { id: 'sessions_spawn', name: 'Sessions Spawn', description: 'Spawn sub-agent', category: 'sessions', enabled: false },
    { id: 'agents_list', name: 'Agents List', description: 'List agents', category: 'sessions', enabled: false },
    { id: 'browser', name: 'Browser', description: 'Control browser', category: 'ui', enabled: false },
    { id: 'canvas', name: 'Canvas', description: 'Node-code canvas', category: 'ui', enabled: false },
  ];

  const categories = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof tools>);

  return c.json({
    tools: Object.entries(categories).map(([name, tools]) => ({ name, tools })),
    total: tools.length,
  });
});

app.post('/api/agents/:id/tools/preset', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');
  const { preset } = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const presets: Record<string, string[]> = {
    potato: ['session_status'],
    coding: ['read', 'write', 'edit', 'exec', 'session_status'],
    messaging: ['sessions_send', 'sessions_list', 'session_status'],
    full: ['read', 'write', 'edit', 'apply_patch', 'exec', 'process', 'web_search', 'web_fetch', 'memory_search', 'memory_get', 'session_status', 'sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn', 'agents_list', 'browser', 'canvas'],
  };

  const tools = presets[preset] ?? presets['potato'];

  try {
    await db.update(schema.agents)
      .set({ toolsEnabled: JSON.stringify(tools) })
      .where(and(eq(schema.agents.id, id), eq(schema.agents.userId, user.userId)));

    return c.json({ success: true, preset, tools });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== TASKS ROUTES (User-scoped) ==========

app.get('/api/tasks', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');
  const status = c.req.query('status');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    let tasks;
    const conditions = [];

    if (workspaceId) {
      conditions.push(eq(schema.tasks.workspaceId, workspaceId));
    } else {
      conditions.push(eq(schema.tasks.userId, user.userId));
    }

    if (status) {
      conditions.push(eq(schema.tasks.status, status));
    }

    tasks = await db
      .select()
      .from(schema.tasks)
      .where(and(...conditions))
      .orderBy(schema.tasks.dueDate);

    // Fetch all assignees for these tasks from the junction table
    const taskIds = tasks.map((t: any) => t.id);
    let assignees: any[] = [];

    if (taskIds.length > 0) {
      try {
        assignees = await db
          .select()
          .from(schema.taskAssignees)
          .where(inArray(schema.taskAssignees.taskId, taskIds));
      } catch (e) {
        console.error('Error fetching assignees:', e);
        // Continue without assignees if there's an error
      }
    }

    // Create a map of taskId -> assigneeIds
    const assigneeMap: Record<string, string[]> = {};
    assignees.forEach((a: any) => {
      if (!assigneeMap[a.taskId]) {
        assigneeMap[a.taskId] = [];
      }
      assigneeMap[a.taskId].push(a.agentId);
    });

    // Add assigneeIds to each task
    const tasksWithAssignees = tasks.map((task: any) => ({
      ...task,
      assigneeIds: assigneeMap[task.id] || [],
    }));

    return c.json({ tasks: tasksWithAssignees });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get tasks for calendar view (by date range)
app.get('/api/tasks/calendar', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  console.log(`Calendar request: startDate=${startDate}, endDate=${endDate} for user=${user.userId}`);

  try {
    let whereClause = and(
      eq(schema.tasks.userId, user.userId),
      sql`${schema.tasks.dueDate} IS NOT NULL`
    );

    // Build where clause based on date params
    if (startDate && endDate) {
      whereClause = and(
        whereClause,
        sql`${schema.tasks.dueDate} >= ${startDate}`,
        sql`${schema.tasks.dueDate} <= ${endDate}`
      ) as any;
    } else if (startDate) {
      whereClause = and(
        whereClause,
        sql`${schema.tasks.dueDate} >= ${startDate}`
      ) as any;
    }

    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(whereClause)
      .orderBy(schema.tasks.dueDate);

    console.log(`Found ${tasks.length} tasks for calendar`);

    // Group tasks by date
    const tasksByDate: Record<string, any[]> = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = task.dueDate.split('T')[0];
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
      }
    });

    return c.json({ tasks, tasksByDate });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/tasks/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(task);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/tasks', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    const now = new Date().toISOString();
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await db.insert(schema.tasks).values({
      id,
      userId: user.userId,
      workspaceId: body.workspaceId ?? null,
      trackId: body.trackId ?? null,
      title: body.title ?? 'Untitled Task',
      description: body.description ?? null,
      status: body.status ?? 'inbox',
      priority: body.priority ?? 'medium',
      creatorId: body.creatorId ?? null,
      tags: body.tags ? JSON.stringify(body.tags) : '[]',
      category: body.category ?? null,
      dueDate: body.dueDate ?? null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // Handle assigneeIds if provided
    const assigneeIds = body.assigneeIds || [];
    for (const agentId of assigneeIds) {
      if (agentId) {
        await db.insert(schema.taskAssignees).values({
          taskId: id,
          agentId: agentId,
          assignedAt: now,
        });
      }
    }

    // Log activity
    await db.insert(schema.activities).values({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'task_created',
      taskId: id,
      userId: user.userId,
      content: `New task "${body.title ?? 'Untitled Task'}" created`,
      timestamp: now,
    });

    return c.json({ success: true, task: { id, ...body, assigneeIds } }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.patch('/api/tasks/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      ...body,
      tags: body.tags ? JSON.stringify(body.tags) : undefined,
      updatedAt: now,
    };

    await db.update(schema.tasks)
      .set(updates)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    // Log activity
    await db.insert(schema.activities).values({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'task_updated',
      taskId: id,
      userId: user.userId,
      content: `Task "${task.title}" updated`,
      timestamp: now,
    });

    return c.json({ success: true, task: task ?? null });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/tasks/:id/move', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');
  const { status } = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    // Get current task to track status change
    const [currentTask] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    if (!currentTask) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const now = new Date().toISOString();
    const updates: Record<string, string> = { status, updatedAt: now };

    if (status === 'in_progress') {
      updates.startedAt = now;
    } else if (status === 'done') {
      updates.completedAt = now;
    }

    await db.update(schema.tasks)
      .set(updates)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    // Log activity
    const activityType = status === 'done' ? 'task_completed' : 'task_moved';
    const activityContent = status === 'done'
      ? `Task "${task.title}" completed`
      : `Task "${task.title}" moved from ${currentTask.status} to ${status}`;

    await db.insert(schema.activities).values({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: activityType,
      taskId: id,
      userId: user.userId,
      content: activityContent,
      timestamp: now,
    });

    return c.json({ success: true, task });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.delete('/api/tasks/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    // Get task info before deleting for activity log
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    const taskTitle = task?.title ?? 'Unknown task';

    await db.delete(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    // Log activity
    await db.insert(schema.activities).values({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'task_deleted',
      userId: user.userId,
      content: `Task "${taskTitle}" deleted`,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== TASK ASSIGNMENT ROUTES ==========

// Assign an agent to a task
app.post('/api/tasks/:id/assign', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const agentId = body.agentId || body.agent_id;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!agentId) {
    return c.json({ error: 'agentId is required' }, 400);
  }

  try {
    // Verify task belongs to user
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Verify agent belongs to user
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    // Check if already assigned
    const [existing] = await db
      .select()
      .from(schema.taskAssignees)
      .where(and(
        eq(schema.taskAssignees.taskId, id),
        eq(schema.taskAssignees.agentId, agentId)
      ));

    if (!existing) {
      // Insert the assignment
      await db.insert(schema.taskAssignees).values({
        taskId: id,
        agentId: agentId,
        assignedAt: new Date().toISOString(),
      });

      // Log activity
      await db.insert(schema.activities).values({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'task_assigned',
        taskId: id,
        agentId: agentId,
        userId: user.userId,
        content: `Task "${task.title}" assigned to ${agent.name}`,
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({ success: true, taskId: id, agentId });
  } catch (error) {
    console.error('Assign task error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Unassign an agent from a task
app.post('/api/tasks/:id/unassign', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const agentId = body.agentId || body.agent_id;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!agentId) {
    return c.json({ error: 'agentId is required' }, 400);
  }

  try {
    // Verify task belongs to user
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.userId)));

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Delete the assignment
    await db.delete(schema.taskAssignees)
      .where(and(
        eq(schema.taskAssignees.taskId, id),
        eq(schema.taskAssignees.agentId, agentId)
      ));

    return c.json({ success: true, taskId: id, agentId });
  } catch (error) {
    console.error('Unassign task error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== GLOBAL SEARCH API ==========

app.get('/api/search', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const query = c.req.query('q');
  const types = c.req.query('types') || 'tasks,documents,activities';
  const limit = parseInt(c.req.query('limit') ?? '20');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!query || query.trim() === '') {
    return c.json({ tasks: [], documents: [], activities: [] });
  }

  const searchTerm = query.trim().toLowerCase();
  const typeList = types.split(',');

  try {
    const results: {
      tasks: any[];
      documents: any[];
      activities: any[];
    } = {
      tasks: [],
      documents: [],
      activities: [],
    };

    // Search tasks
    if (typeList.includes('tasks')) {
      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.userId, user.userId))
        .all();

      results.tasks = tasks
        .filter((task: any) => {
          const titleMatch = task.title?.toLowerCase().includes(searchTerm);
          const descMatch = task.description?.toLowerCase().includes(searchTerm);
          const tagMatch = task.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm));
          return titleMatch || descMatch || tagMatch;
        })
        .slice(0, limit);
    }

    // Search documents
    if (typeList.includes('documents')) {
      const documents = await db
        .select()
        .from(schema.documents)
        .where(eq(schema.documents.userId, user.userId))
        .all();

      results.documents = documents
        .filter((doc: any) => {
          const titleMatch = doc.title?.toLowerCase().includes(searchTerm);
          const contentMatch = doc.content?.toLowerCase().includes(searchTerm);
          return titleMatch || contentMatch;
        })
        .slice(0, limit);
    }

    // Search activities
    if (typeList.includes('activities')) {
      const activities = await db
        .select()
        .from(schema.activities)
        .where(eq(schema.activities.userId, user.userId))
        .all();

      results.activities = activities
        .filter((activity: any) => {
          const contentMatch = activity.content?.toLowerCase().includes(searchTerm);
          return contentMatch;
        })
        .slice(0, limit);
    }

    return c.json(results);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== MESSAGES/CHAT ROUTES (User & Task scoped) ==========

// Get messages for a specific task
app.get('/api/tasks/:taskId/messages', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const taskId = c.req.param('taskId');
  const limit = parseInt(c.req.query('limit') ?? '50');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // First verify the task belongs to the user
    const task = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.userId, user.userId)))
      .get();

    if (!task) {
      return c.json({ error: 'Task not found or unauthorized' }, 404);
    }

    // Get messages for the task
    const messages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.taskId, taskId))
      .orderBy(schema.messages.timestamp)
      .limit(limit);

    return c.json({ messages });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Create a new message for a task
app.post('/api/tasks/:taskId/messages', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const taskId = c.req.param('taskId');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Verify task belongs to user
    const task = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.userId, user.userId)))
      .get();

    if (!task) {
      return c.json({ error: 'Task not found or unauthorized' }, 404);
    }

    const body = await c.req.json();
    const newMessage = {
      id: crypto.randomUUID(),
      taskId,
      userId: user.userId,
      agentId: body.agentId || null,
      content: body.content,
      type: body.type || 'comment',
      source: body.source || 'webchat',
      attachments: JSON.stringify(body.attachments || []),
      timestamp: new Date().toISOString(),
    };

    await db.insert(schema.messages).values(newMessage);

    return c.json({ message: newMessage }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== SESSIONS ROUTES ==========

app.get('/api/sessions', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get sessions for user's agents only
    const userAgents = await db
      .select({ id: schema.agents.id })
      .from(schema.agents)
      .where(eq(schema.agents.userId, user.userId));

    const agentIds = userAgents.map(a => a.id);

    const sessions = await db
      .select()
      .from(schema.sessions)
      .where(sql`${schema.sessions.agentId} IN ${agentIds}`)
      .orderBy(schema.sessions.startedAt);

    return c.json({ sessions });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== STATS ROUTES (User-scoped) ==========

app.get('/api/stats', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const agents = await db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.userId, user.userId));

    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.userId, user.userId));

    return c.json({
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'inbox' || t.status === 'in_progress').length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== ACTIVITIES ROUTES (User-scoped) ==========

app.get('/api/activities', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const limit = parseInt(c.req.query('limit') ?? '50');
  const offset = parseInt(c.req.query('offset') ?? '0');
  const type = c.req.query('type');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    let whereClause = eq(schema.activities.userId, user.userId);

    if (type) {
      whereClause = and(whereClause, eq(schema.activities.type, type)) as any;
    }

    if (startDate) {
      whereClause = and(whereClause, sql`${schema.activities.timestamp} >= ${startDate}`) as any;
    }

    if (endDate) {
      whereClause = and(whereClause, sql`${schema.activities.timestamp} <= ${endDate}`) as any;
    }

    const activities = await db
      .select()
      .from(schema.activities)
      .where(whereClause)
      .orderBy(sql`${schema.activities.timestamp} DESC`)
      .limit(limit)
      .offset(offset);

    return c.json({ activities, limit, offset });
  } catch (error) {
    console.error('Activities error:', error);
    // Fallback to mock data if table not ready
    return c.json({
      activities: [
        { id: '1', type: 'agent_created', content: 'Welcome to your Command Center!', timestamp: new Date().toISOString() },
      ]
    });
  }
});

// ========== USER CHANNELS ROUTES ==========

// ========== CLAWHUB SKILLS ROUTES ==========

app.get('/api/skills/browse', async (c) => {
  const user = await getUserFromToken(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Mock list of skills from ClawHub marketplace
  const mockSkills = [
    {
      id: 'skill_web_scraper',
      name: 'Dynamic Web Scraper',
      description: 'Powerful tool to extract data from any website even with heavy JS. Perfect for lead generation and market research.',
      author: 'ScrapeMaster',
      version: '3.0.1',
      category: 'tools',
      rating: 4.9,
      installs: 5600,
      price: 'free'
    },
    {
      id: 'skill_social_media',
      name: 'Social Media Manager',
      description: 'Automate post scheduling and engagement across Twitter, LinkedIn and Discord with AI-driven content generation.',
      author: 'SocialFlow',
      version: '1.2.0',
      category: 'marketing',
      rating: 4.2,
      installs: 2100,
      price: 'free'
    },
    {
      id: 'skill_coding_assistant',
      name: 'Advanced Coding Assistant',
      description: 'Expert coding skills with deep knowledge of React, Node.js, and Cloudflare Workers. Includes refactoring tools.',
      author: 'ClawHub Official',
      version: '2.1.0',
      category: 'coding',
      rating: 4.8,
      installs: 1250,
      price: 'free'
    },
    {
      id: 'skill_data_analyst',
      name: 'Data Analysis & Viz',
      description: 'Turn spreadsheet data into beautiful charts and actionable insights using advanced statistical models.',
      author: 'DataGenie',
      version: '1.0.4',
      category: 'productivity',
      rating: 4.5,
      installs: 840,
      price: 'free'
    },
    {
      id: 'skill_seo_optimizer',
      name: 'SEO Content Strategist',
      description: 'Analyze search trends and optimize your web content for maximum visibility and organic growth.',
      author: 'SearchPro',
      version: '1.1.2',
      category: 'marketing',
      rating: 4.6,
      installs: 3200,
      price: 'free'
    },
    {
      id: 'skill_image_gen',
      name: 'AI Image Generator',
      description: 'Generate high-fidelity assets and illustrations directly within your workflow using state-of-the-art models.',
      author: 'PixelMind',
      version: '2.0.0',
      category: 'creative',
      rating: 4.7,
      installs: 4500,
      price: 'free'
    }
  ];

  return c.json({ skills: mockSkills });
});

app.get('/api/skills', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const installed = await db
      .select()
      .from(schema.installedSkills)
      .where(eq(schema.installedSkills.userId, user.userId))
      .orderBy(sql`${schema.installedSkills.installDate} DESC`);

    return c.json({ skills: installed });
  } catch (error) {
    return c.json({ skills: [] });
  }
});

app.post('/api/skills/install', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const { skill } = body;

  if (!skill || !skill.id) {
    return c.json({ error: 'Invalid skill data' }, 400);
  }

  try {
    const installed = await SecurityService.installSkill(db, user.userId, skill);
    return c.json({ skill: installed });
  } catch (error) {
    console.error('Install error:', error);
    return c.json({ error: 'Failed to install skill' }, 500);
  }
});

app.delete('/api/skills/:skillId', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const skillId = c.req.param('skillId');

  try {
    const success = await SecurityService.uninstallSkill(db, user.userId, skillId);
    if (!success) {
      return c.json({ error: 'Skill not found or unauthorized' }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to uninstall skill' }, 500);
  }
});

app.get('/api/channels', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const channels = await db
      .select()
      .from(schema.userChannels)
      .where(eq(schema.userChannels.userId, user.userId))
      .orderBy(schema.userChannels.createdAt);

    return c.json({ channels });
  } catch (error) {
    return c.json({ channels: [] });
  }
});

// ========== OPENCLAW INTEGRATION ROUTES ==========

app.get('/api/openclaw/config', async (c) => {
  return c.json({
    mode: c.env.OPENCLAW_MODE ?? 'external',
    externalUrl: c.env.OPENCLAW_URL ?? '',
  });
});

// Configure OpenClaw plugin/hook for a workspace
app.post('/api/openclaw/plugin/setup', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : '';
  const serverUrl = typeof body.serverUrl === 'string' ? body.serverUrl.trim() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';

  if (!workspaceId || !serverUrl || !token) {
    return c.json({ error: 'workspaceId, serverUrl and token are required' }, 400);
  }

  const [workspaceMember] = await db
    .select({ workspace: schema.workspaces })
    .from(schema.workspaces)
    .innerJoin(
      schema.workspaceMembers,
      eq(schema.workspaces.id, schema.workspaceMembers.workspaceId)
    )
    .where(and(
      eq(schema.workspaces.id, workspaceId),
      eq(schema.workspaceMembers.userId, user.userId)
    ));

  if (!workspaceMember?.workspace) {
    return c.json({ error: 'Workspace not found or access denied' }, 404);
  }

  const workspace = workspaceMember.workspace;

  let settings: Record<string, unknown> = {};
  try {
    settings = workspace.settings ? JSON.parse(workspace.settings) : {};
  } catch {
    settings = {};
  }

  const existingSecret = typeof settings.openclawWebhookSecret === 'string'
    ? settings.openclawWebhookSecret
    : '';
  const webhookSecret = existingSecret || crypto.randomUUID().replace(/-/g, '');

  const nextSettings = {
    ...settings,
    openclawWebhookSecret: webhookSecret,
    openclawPluginEnabled: true,
    openclawPluginUpdatedAt: new Date().toISOString(),
  };

  await db.update(schema.workspaces)
    .set({
      gatewayUrl: serverUrl,
      gatewayToken: token,
      settings: JSON.stringify(nextSettings),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.workspaces.id, workspaceId));

  const webhookUrl = `${new URL(c.req.url).origin}/api/webhooks/openclaw`;

  return c.json({
    success: true,
    workspaceId,
    plugin: {
      webhookUrl,
      workspaceId,
      webhookSecret,
      env: {
        CLAWPUTE_WEBHOOK_URL: webhookUrl,
        CLAWPUTE_WORKSPACE_ID: workspaceId,
        CLAWPUTE_WEBHOOK_SECRET: webhookSecret,
      },
    },
  });
});

app.get('/api/openclaw/plugin/setup/:workspaceId', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.param('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const [workspaceMember] = await db
    .select({ workspace: schema.workspaces })
    .from(schema.workspaces)
    .innerJoin(
      schema.workspaceMembers,
      eq(schema.workspaces.id, schema.workspaceMembers.workspaceId)
    )
    .where(and(
      eq(schema.workspaces.id, workspaceId),
      eq(schema.workspaceMembers.userId, user.userId)
    ));

  if (!workspaceMember?.workspace) {
    return c.json({ error: 'Workspace not found or access denied' }, 404);
  }

  const workspace = workspaceMember.workspace;
  let settings: Record<string, unknown> = {};
  try {
    settings = workspace.settings ? JSON.parse(workspace.settings) : {};
  } catch {
    settings = {};
  }

  const webhookSecret = typeof settings.openclawWebhookSecret === 'string'
    ? settings.openclawWebhookSecret
    : null;

  return c.json({
    success: true,
    workspaceId,
    serverUrl: workspace.gatewayUrl,
    tokenConfigured: Boolean(workspace.gatewayToken),
    pluginEnabled: settings.openclawPluginEnabled === true,
    webhookSecret,
  });
});

// Check actual connection to OpenClaw instance

// Check connection to OpenClaw Gateway
// Uses protocol-aware discovery first (WS -> HTTP fallback), without hard-gating on GET /
app.post('/api/openclaw/check-connection', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return c.json({
      connected: false,
      message: 'Server URL and Gateway Token are required'
    }, 400);
  }

  try {
    const gatewayInfo = await discoverOpenClawInfo(serverUrl, token);
    const diagnostics = gatewayInfo.diagnostics || [];

    const hasStrongSignal =
      gatewayInfo.version !== 'unknown' ||
      (gatewayInfo.agentCount ?? 0) > 0 ||
      (gatewayInfo.channelCount ?? 0) > 0 ||
      Boolean(gatewayInfo.model) ||
      diagnostics.some((d) => /connected|auth|successful|ready/i.test(d));

    if (!hasStrongSignal || gatewayInfo.error) {
      return c.json({
        connected: false,
        message: gatewayInfo.error || 'Unable to authenticate with OpenClaw Gateway',
        errorDetails: gatewayInfo.errorDetails || null,
        diagnostics,
        timestamp: new Date().toISOString(),
      }, 503);
    }

    const isFullyConnected = gatewayInfo.version !== 'unknown';
    const responseData: Record<string, unknown> = {
      connected: true,
      message: isFullyConnected
        ? 'Successfully connected to OpenClaw Gateway'
        : 'Connected to OpenClaw Gateway but version info unavailable',
      version: gatewayInfo.version,
      uptime: gatewayInfo.uptime || null,
      agents: gatewayInfo.agents || [],
      agentCount: gatewayInfo.agentCount ?? 0,
      channels: gatewayInfo.channels || [],
      channelCount: gatewayInfo.channelCount ?? 0,
      model: gatewayInfo.model || null,
      provider: gatewayInfo.provider || null,
      config: gatewayInfo.config || null,
      diagnostics,
      timestamp: new Date().toISOString(),
    };

    if (!isFullyConnected) {
      responseData.warning = 'Gateway is reachable, but version info is unavailable from current endpoints.';
      responseData.troubleshooting = [
        'WebSocket auth appears to work; some metadata endpoints may be disabled',
        'Verify gateway auth mode and API/tool permissions',
        'If needed, enable HTTP endpoints for richer metadata',
      ];
    }

    return c.json(responseData);
  } catch (error) {
    console.error('OpenClaw connection check error:', error);

    let message = 'Failed to connect to OpenClaw';
    let errorDetails = '';
    let actionRequired = '';

    if (error instanceof Error) {
      errorDetails = error.message;

      // Check for Cloudflare Tunnel errors
      if (error.message.includes('530') || error.message.includes('1033')) {
        message = 'Cloudflare Tunnel is not running or cannot reach OpenClaw';
        errorDetails = `The tunnel appears to be down (HTTP 530 / Error 1033).\n\n`;
        actionRequired = `To fix this, run the following command in your terminal:\n\n` +
          `cloudflared tunnel run openclaw\n\n` +
          `Or use the local URL instead:\n` +
          `http://localhost:18789`;
      } else if (error.name === 'AbortError') {
        message = 'Connection timeout after 5 seconds.';
        errorDetails = `OpenClaw instance may be down or unreachable.\n\n` +
          `Troubleshooting steps:\n` +
          `1. Check if OpenClaw is running: openclaw gateway status\n` +
          `2. Verify the URL is correct (e.g., http://127.0.0.1:18789)\n` +
          `3. If using a tunnel, ensure it's running: cloudflared tunnel run openclaw\n` +
          `4. Check firewall settings for port 18789`;
      } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        message = 'Cannot reach OpenClaw server.';
        errorDetails = `Connection refused to the specified URL.\n\n` +
          `Please verify:\n` +
          `- OpenClaw is running (check with 'openclaw gateway status')\n` +
          `- The URL is correct (e.g., http://127.0.0.1:18789 for local)\n` +
          `- If using a tunnel, ensure it's running\n` +
          `- Firewall allows connections on the specified port`;
      }
    }

    return c.json({
      connected: false,
      message,
      errorDetails,
      actionRequired,
      timestamp: new Date().toISOString(),
    }, 503);
  }
});


// Test connection to OpenClaw Gateway
app.post('/api/openclaw/test-connection', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token, password, mode } = body;

  // Validate required fields
  if (!serverUrl || !token) {
    return c.json({
      success: false,
      message: 'WebSocket URL and Gateway Token are required'
    }, 400);
  }

  try {
    // Validate URL format (allow ws://, wss://, http://, https://)
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(serverUrl);
      const validProtocols = ['ws:', 'wss:', 'http:', 'https:'];
      if (!validProtocols.includes(validatedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return c.json({
        success: false,
        message: 'Invalid WebSocket URL format. Please provide a valid URL (e.g., ws://127.0.0.1:18789)'
      }, 400);
    }

    // Validate token format (Gateway tokens are typically hex strings)
    if (token.length < 10) {
      return c.json({
        success: false,
        message: 'Invalid Gateway Token format. Token should be at least 10 characters.'
      }, 400);
    }

    // Use HTTP API (primary method) - works reliably through Cloudflare Tunnel
    try {
      const httpResult = await testOpenClawHttp({
        serverUrl,
        token,
        sessionKey: 'agent:main:main',
        timeout: 8000,
      });

      if (httpResult.success) {
        return c.json({
          success: true,
          message: httpResult.message,
          version: httpResult.version,
          protocol: 'http',
          diagnostics: httpResult.diagnostics,
        });
      } else {
        return c.json({
          success: false,
          message: httpResult.message,
          diagnostics: httpResult.diagnostics,
        }, 503);
      }
    } catch (httpError) {
      console.log('HTTP API test failed:', httpError);
    }

    // Fallback to basic HTTP check
    const baseUrl = convertWsToHttp(serverUrl);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return c.json({
          success: true,
          message: `Connected to OpenClaw Gateway at ${validatedUrl.host} (HTTP fallback)`,
          protocol: 'http',
        });
      } else if (response.status === 401) {
        return c.json({
          success: false,
          message: 'Authentication failed. Your Gateway Token is invalid or expired.'
        }, 401);
      } else {
        return c.json({
          success: false,
          message: `OpenClaw returned status ${response.status}. Please check your Gateway Token and server configuration.`
        }, 503);
      }
    } catch (httpError) {
      return c.json({
        success: false,
        message: 'Failed to connect via WebSocket or HTTP. Please verify:\n- OpenClaw is running (run: openclaw status)\n- The WebSocket URL is correct (e.g., ws://127.0.0.1:18789)\n- Firewall allows connections on port 18789'
      }, 503);
    }
  } catch (error) {
    console.error('OpenClaw connection test error:', error);

    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    }, 503);
  }
});

// Diagnostic endpoint for detailed connection debugging
app.post('/api/openclaw/diagnose', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return c.json({
      success: false,
      message: 'Server URL and Gateway Token are required'
    }, 400);
  }

  try {
    const results = await runFullDiagnostic(serverUrl, token);

    return c.json({
      success: true,
      websocket: results.websocket,
      http: results.http,
      summary: {
        websocketSuccess: results.websocket.some(r => r.stage === 'handshake-success'),
        httpSuccess: results.http.some(r => r.stage === 'http-root' && r.success),
        totalStages: results.websocket.length + results.http.length,
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Diagnostic failed',
    }, 500);
  }
});

// ========== AGENT FILES ROUTES (SOUL.md, IDENTITY.md, HEARTBEAT.md, USER.md, MEMORY.md) ==========

// Default file templates
const defaultFileTemplates: Record<string, string> = {
  'SOUL.md': `# Agent Soul

## Essence
This file contains the core personality and essence of the agent.

## Core Values
- Integrity: Always act with honesty and transparency
- Curiosity: Continuously learn and explore
- Empathy: Understand and consider user perspectives

## Personality Traits
- Tone: Professional yet approachable
- Style: Clear and concise communication
- Approach: Solution-oriented thinking

## Purpose
[Define the agent's primary purpose and mission]

## Principles
1. Prioritize user safety and privacy
2. Provide accurate and helpful information
3. Acknowledge limitations when uncertain
4. Continuously improve through feedback
`,
  'IDENTITY.md': `# Agent Identity

## Basic Information
- Name: [Agent Name]
- Role: [Agent Role]
- Level: [junior/specialist/lead]
- Model: [AI Model]

## Capabilities
- [List key capabilities and skills]

## Specializations
- [List areas of expertise]

## Background
[Agent background story and context]

## Communication Style
- Formal/Informal: [Choice]
- Technical Level: [Beginner/Intermediate/Advanced]
- Language Preferences: [List languages]

## Boundaries
- What the agent can do
- What the agent cannot do
- When to escalate to human
`,
  'HEARTBEAT.md': `# Agent Heartbeat

## Status Log

### Latest Check-in
- Timestamp: [Auto-updated]
- Status: [active/idle/busy/offline]
- Health: [healthy/warning/critical]

## Performance Metrics
- Tasks Completed: [Count]
- Success Rate: [Percentage]
- Average Response Time: [Time]

## System Health
- CPU Usage: [Percentage]
- Memory Usage: [Percentage]
- Last Error: [Timestamp or "None"]

## Activity Log
| Timestamp | Event | Details |
|-----------|-------|---------|
| [Time] | [Event] | [Details] |

## Alerts
- [List any active alerts or warnings]
`,
  'USER.md': `# User Context

## Primary User
- User ID: [User ID]
- Name: [User Name]
- Preferences: [Key preferences]

## Interaction History
### Recent Conversations
- [Summary of recent interactions]

## User Preferences
- Communication Style: [Preferred style]
- Technical Level: [User's technical expertise]
- Response Length: [Brief/Detailed]

## Context Notes
- Important facts about the user
- Recurring topics of interest
- Previous issues and resolutions

## Access Permissions
- [What the agent can access for this user]
`,
  'MEMORY.md': `# Agent Memory

## Short-term Memory
[Recent context and active conversation threads]

## Long-term Memory
### Key Facts
- [Important facts learned]

### Learned Patterns
- [Behavioral patterns observed]

### Preferences Over Time
- [How preferences have evolved]

## Knowledge Base
### Domain Knowledge
- [Specific domain expertise]

### Procedures
- [Standard operating procedures]

### Connections
- [Relationships between concepts]

## Memory Triggers
- Keywords that recall specific memories
- Contexts that activate certain knowledge
`};

// Get all files for an agent
app.get('/api/agents/:id/files', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Verify agent belongs to user
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    // Get all files for agent
    const files = await db
      .select()
      .from(schema.agentFiles)
      .where(eq(schema.agentFiles.agentId, agentId));

    // Return existing files or create defaults
    const existingFilenames = files.map(f => f.filename);
    const allFilenames = Object.keys(defaultFileTemplates);

    const result = allFilenames.map(filename => {
      const existing = files.find(f => f.filename === filename);
      if (existing) {
        return existing;
      }
      // Return template for missing files
      return {
        id: `temp-${filename}`,
        agentId,
        filename,
        content: defaultFileTemplates[filename],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    return c.json({ files: result });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get a specific file
app.get('/api/agents/:id/files/:filename', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');
  const filename = c.req.param('filename');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Validate filename
  if (!defaultFileTemplates[filename]) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  try {
    // Verify agent belongs to user
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    // Get file
    const [file] = await db
      .select()
      .from(schema.agentFiles)
      .where(and(eq(schema.agentFiles.agentId, agentId), eq(schema.agentFiles.filename, filename)));

    if (file) {
      return c.json(file);
    }

    // Return template if not found
    return c.json({
      id: `temp-${filename}`,
      agentId,
      filename,
      content: defaultFileTemplates[filename],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Update or create a file
app.put('/api/agents/:id/files/:filename', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');
  const filename = c.req.param('filename');
  const { content } = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Demo users cannot edit files
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Validate filename
  if (!defaultFileTemplates[filename]) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  try {
    // Verify agent belongs to user
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const now = new Date().toISOString();

    // Check if file exists
    const [existing] = await db
      .select()
      .from(schema.agentFiles)
      .where(and(eq(schema.agentFiles.agentId, agentId), eq(schema.agentFiles.filename, filename)));

    if (existing) {
      // Update existing
      await db
        .update(schema.agentFiles)
        .set({ content, updatedAt: now })
        .where(eq(schema.agentFiles.id, existing.id));

      return c.json({ success: true, id: existing.id, updatedAt: now });
    } else {
      // Create new
      const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await db.insert(schema.agentFiles).values({
        id,
        agentId,
        filename,
        content,
        createdAt: now,
        updatedAt: now,
      });

      return c.json({ success: true, id, createdAt: now }, 201);
    }
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Delete a file (reset to template)
app.delete('/api/agents/:id/files/:filename', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');
  const filename = c.req.param('filename');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    // Verify agent belongs to user
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    // Delete file (will revert to template on next GET)
    await db
      .delete(schema.agentFiles)
      .where(and(eq(schema.agentFiles.agentId, agentId), eq(schema.agentFiles.filename, filename)));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== OPENCLAW GATEWAY INTEGRATION - STATS & MESSAGES ==========

// Helper to get OpenClaw config from request or env
async function getOpenClawConfigFromRequest(c: any) {
  const body = await c.req.json().catch(() => ({}));
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return { error: 'Server URL and Gateway Token are required' };
  }

  return { serverUrl, token };
}

// Get OpenClaw gateway stats and configuration
// Uses discoverOpenClawInfo to try multiple endpoints and gather comprehensive data
app.post('/api/openclaw/gateway-stats', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return c.json({ error: 'Server URL and Gateway Token are required' }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);

    // Use comprehensive discovery to get full stats
    // Pass the original serverUrl (WebSocket) to try WebSocket first
    const gatewayInfo = await discoverOpenClawInfo(serverUrl, token);

    // Always return success if we got any response - even if version is unknown
    // OpenClaw uses WebSocket primarily, so HTTP endpoints may be limited
    const isDataAvailable = gatewayInfo.version !== 'unknown' ||
      (gatewayInfo.agents && gatewayInfo.agents.length > 0) ||
      (gatewayInfo.channels && gatewayInfo.channels.length > 0) ||
      gatewayInfo.model ||
      gatewayInfo.config;

    // Since we successfully called discoverOpenClawInfo, the gateway is reachable
    // We consider it connected even if specific data isn't available
    if (isDataAvailable || gatewayInfo.diagnostics && gatewayInfo.diagnostics.length > 0) {
      const responseData: Record<string, unknown> = {
        success: true,
        connected: true,
        version: gatewayInfo.version,
        uptime: gatewayInfo.uptime || 'N/A',
        model: gatewayInfo.model || null,
        provider: gatewayInfo.provider || null,
        agents: gatewayInfo.agents || [],
        agentCount: gatewayInfo.agentCount ?? 0,
        channels: gatewayInfo.channels || [],
        channelCount: gatewayInfo.channelCount ?? 0,
        gateway: {
          url: baseUrl,
          status: 'connected',
        },
        timestamp: new Date().toISOString(),
        config: gatewayInfo.config || null,
        diagnostics: gatewayInfo.diagnostics || [],
      };

      // Add note if version is unknown
      if (gatewayInfo.version === 'unknown') {
        responseData.note = 'Gateway is accessible but version info not available via HTTP API. This is normal for WebSocket-only OpenClaw installations.';
        responseData.endpointsTried = gatewayInfo.diagnostics || [];
      }

      return c.json(responseData);
    } else {
      return c.json({
        success: false,
        connected: false,
        error: 'Could not fetch gateway stats. Gateway may not expose these endpoints.',
        errorDetails: gatewayInfo.errorDetails,
        diagnostics: gatewayInfo.diagnostics || [],
      }, 503);
    }
  } catch (error) {
    console.error('OpenClaw stats error:', error);
    return c.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to fetch OpenClaw stats',
    }, 500);
  }
});

// Gateway health snapshot (separate endpoint for diagnostics UI)
app.post('/api/openclaw/gateway-health', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);
  }

  try {
    const gatewayInfo = await discoverOpenClawInfo(serverUrl, token);
    const diagnostics = gatewayInfo.diagnostics ?? [];
    const hasConnectionSignal =
      gatewayInfo.version !== 'unknown' ||
      Boolean(gatewayInfo.uptime) ||
      Boolean(gatewayInfo.model) ||
      Boolean(gatewayInfo.provider) ||
      (gatewayInfo.agentCount ?? 0) > 0 ||
      (gatewayInfo.channelCount ?? 0) > 0 ||
      diagnostics.some((d) => /connected|auth|successful|ready/i.test(d));
    const hasMetadataSignal =
      gatewayInfo.version !== 'unknown' ||
      Boolean(gatewayInfo.uptime) ||
      Boolean(gatewayInfo.model) ||
      Boolean(gatewayInfo.provider) ||
      (gatewayInfo.channelCount ?? 0) > 0;
    const limitedMetadata = hasConnectionSignal && !hasMetadataSignal;
    const metadataWarning = limitedMetadata
      ? 'Gateway is reachable, but this runtime exposes limited metadata tools (likely agents_list-only).'
      : null;

    if (!hasConnectionSignal) {
      return c.json({
        success: false,
        connected: false,
        version: gatewayInfo.version,
        uptime: gatewayInfo.uptime ?? 'N/A',
        model: gatewayInfo.model ?? null,
        provider: gatewayInfo.provider ?? null,
        limitedMetadata: false,
        warning: null,
        diagnostics,
        error: gatewayInfo.error ?? 'Unable to fetch gateway health metadata',
        errorDetails: gatewayInfo.errorDetails ?? null,
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({
      success: true,
      connected: true,
      version: gatewayInfo.version,
      uptime: gatewayInfo.uptime ?? 'N/A',
      model: gatewayInfo.model ?? null,
      provider: gatewayInfo.provider ?? null,
      limitedMetadata,
      warning: metadataWarning,
      diagnostics,
      error: gatewayInfo.error ?? null,
      errorDetails: gatewayInfo.errorDetails ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to fetch gateway health',
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// Gateway agents snapshot (separate endpoint for diagnostics UI)
app.post('/api/openclaw/gateway-agents', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);
  }

  try {
    const gatewayAgents = await probeGatewayAgents(serverUrl, token);
    const agents = gatewayAgents.agents;

    return c.json({
      success: gatewayAgents.success,
      connected: gatewayAgents.connected,
      agents,
      agentCount: agents.length,
      diagnostics: gatewayAgents.diagnostics,
      errorDetails: gatewayAgents.error ?? null,
      timestamp: new Date().toISOString(),
    }, gatewayAgents.success ? 200 : 503);
  } catch (error) {
    return c.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to fetch gateway agents',
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// Gateway channels snapshot (separate endpoint for diagnostics UI)
app.post('/api/openclaw/gateway-channels', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);
  }

  try {
    const gatewayInfo = await discoverOpenClawInfo(serverUrl, token);
    const channels = gatewayInfo.channels ?? [];
    const connected = channels.length > 0 || (gatewayInfo.channelCount ?? 0) > 0;

    if (!connected) {
      const cliChannels = await getChannelsViaCli();
      if (cliChannels.ok) {
        const payload = cliChannels.payload ?? {};
        const channelMap = (payload as any)?.channels;
        const cliList = channelMap && typeof channelMap === 'object'
          ? Object.entries(channelMap as Record<string, unknown>).map(([id, value]) => ({ id, ...(typeof value === 'object' && value ? value as Record<string, unknown> : {}) }))
          : [];
        return c.json({
          success: true,
          connected: true,
          channels: cliList,
          channelCount: cliList.length,
          diagnostics: [...(gatewayInfo.diagnostics ?? []), ...cliChannels.diagnostics],
          errorDetails: null,
          timestamp: new Date().toISOString(),
          source: 'cli',
        });
      }
    }

    return c.json({
      success: true,
      connected,
      channels,
      channelCount: gatewayInfo.channelCount ?? 0,
      diagnostics: gatewayInfo.diagnostics ?? [],
      errorDetails: gatewayInfo.errorDetails ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to fetch gateway channels',
      timestamp: new Date().toISOString(),
    }, 500);
  }
});




app.post('/api/openclaw/gateway-chat-messages', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;
  if (!serverUrl || !token) return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);

  const result = await fetchGatewayDataset({
    serverUrl,
    token,
    kind: 'chat_messages',
    toolCandidates: ['chat.history', 'sessions.history', 'sessions_history', 'messages.list', 'messages_list'],
    httpCandidates: ['/api/messages', '/api/chat/messages', '/api/tasks/messages'],
    cliFallback: async () => ({ items: [], diagnostics: ['[cli] chat message listing is not exposed by current CLI command set'] }),
  });

  return c.json(result, result.success ? 200 : 503);
});

app.post('/api/openclaw/gateway-sessions', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;
  if (!serverUrl || !token) return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);

  const result = await fetchGatewayDataset({
    serverUrl,
    token,
    kind: 'sessions',
    toolCandidates: ['sessions.list', 'sessions_list', 'sessions.history', 'sessions_history'],
    httpCandidates: ['/api/sessions', '/api/session/list'],
    cliFallback: async () => {
      const cli = await getSessionsViaCli();
      if (!cli.ok) return { items: [], diagnostics: cli.diagnostics, error: cli.error };
      const sessions = Array.isArray((cli.payload as any)?.sessions)
        ? (cli.payload as any).sessions
        : (Array.isArray(cli.payload) ? cli.payload : []);
      return { items: sessions, diagnostics: cli.diagnostics };
    },
  });

  return c.json(result, result.success ? 200 : 503);
});

app.post('/api/openclaw/gateway-workspace-files', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;
  if (!serverUrl || !token) return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);

  const result = await fetchGatewayDataset({
    serverUrl,
    token,
    kind: 'workspace_files',
    toolCandidates: ['agents.files.list', 'files.list', 'files_list', 'workspace.files', 'workspace_files'],
    httpCandidates: ['/api/files', '/api/workspace/files', '/api/workspaces/files'],
    cliFallback: async () => ({ items: [], diagnostics: ['[cli] workspace file listing not available in current OpenClaw CLI'] }),
  });

  return c.json(result, result.success ? 200 : 503);
});

app.post('/api/openclaw/gateway-usage', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;
  if (!serverUrl || !token) return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);

  const result = await fetchGatewayDataset({
    serverUrl,
    token,
    kind: 'usage',
    toolCandidates: ['usage.cost', 'usage.stats', 'usage_stats', 'token_usage', 'billing_usage'],
    httpCandidates: ['/api/usage', '/api/token-usage', '/api/billing/usage'],
    cliFallback: async () => {
      const cli = await getUsageViaCli();
      if (!cli.ok) return { items: [], diagnostics: cli.diagnostics, error: cli.error };
      const daily = Array.isArray((cli.payload as any)?.daily)
        ? (cli.payload as any).daily
        : [];
      return { items: daily, diagnostics: cli.diagnostics };
    },
  });

  return c.json(result, result.success ? 200 : 503);
});

app.post('/api/openclaw/gateway-cron-jobs', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;
  if (!serverUrl || !token) return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);

  const result = await fetchGatewayDataset({
    serverUrl,
    token,
    kind: 'cron_jobs',
    toolCandidates: ['cron.list', 'cron_list', 'jobs.list', 'jobs_list'],
    httpCandidates: ['/api/cron', '/api/cron/jobs', '/api/jobs'],
    cliFallback: async () => {
      const cli = await getCronJobsViaCli();
      if (!cli.ok) return { items: [], diagnostics: cli.diagnostics, error: cli.error };
      const jobs = Array.isArray((cli.payload as any)?.jobs)
        ? (cli.payload as any).jobs
        : (Array.isArray(cli.payload) ? cli.payload : []);
      return { items: jobs, diagnostics: cli.diagnostics };
    },
  });

  return c.json(result, result.success ? 200 : 503);
});

app.post('/api/openclaw/gateway-skills', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;
  if (!serverUrl || !token) return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);

  const result = await fetchGatewayDataset({
    serverUrl,
    token,
    kind: 'skills',
    toolCandidates: ['skills.status', 'skills.list', 'skills_list', 'installed_skills'],
    httpCandidates: ['/api/skills', '/api/installed-skills'],
    cliFallback: async () => {
      const cli = await getSkillsViaCli();
      if (!cli.ok) return { items: [], diagnostics: cli.diagnostics, error: cli.error };
      const skills = Array.isArray((cli.payload as any)?.skills)
        ? (cli.payload as any).skills
        : (Array.isArray(cli.payload) ? cli.payload : []);
      return { items: skills, diagnostics: cli.diagnostics };
    },
  });

  return c.json(result, result.success ? 200 : 503);
});

app.post('/api/openclaw/gateway-logs', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;
  if (!serverUrl || !token) return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);

  const result = await fetchGatewayDataset({
    serverUrl,
    token,
    kind: 'logs',
    toolCandidates: ['logs.tail', 'logs_tail', 'session.status', 'session_status'],
    httpCandidates: ['/api/logs', '/api/system/logs'],
    cliFallback: async () => {
      const cli = await getLogsViaCli();
      if (!cli.ok) return { items: [], diagnostics: cli.diagnostics, error: cli.error };
      const items = Array.isArray(cli.payload) ? cli.payload : [cli.payload];
      return { items, diagnostics: cli.diagnostics };
    },
  });

  return c.json(result, result.success ? 200 : 503);
});

app.post('/api/openclaw/send-message', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token, password, message, sessionKey = 'agent:main:main' } = body;

  if (!serverUrl || !token || !message) {
    return c.json({
      error: 'Server URL, Gateway Token, and message are required'
    }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const agentId = sessionKey.split(':')[1] ?? 'main';

    // Try sending with token first, then password if provided
    let authToken = token;
    let response: Response;

    const trySend = async (auth: string): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${baseUrl}/v1/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth}`,
          'Content-Type': 'application/json',
          'x-openclaw-agent-id': agentId,
          'x-openclaw-session-key': sessionKey,
        },
        body: JSON.stringify({
          model: `openclaw:${agentId}`,
          input: message,
          max_output_tokens: 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res;
    };

    // First attempt with token
    response = await trySend(token);

    // If 401 and password provided, try with password
    if (response.status === 401 && password) {
      response = await trySend(password);
    }

    if (response.ok) {
      const data = await response.json().catch(() => ({})) as Record<string, unknown>;
      return c.json({
        success: true,
        message: 'Message sent to OpenClaw',
        sessionKey,
        response: data,
        timestamp: new Date().toISOString(),
      });
    } else if (response.status === 404 || response.status === 405) {
      return c.json({
        success: false,
        error: 'OpenResponses API is not enabled.\n\nTo enable it, add this to your OpenClaw config:\n\n{\n  "gateway": {\n    "http": {\n      "endpoints": {\n        "responses": { "enabled": true }\n      }\n    }\n  }\n}\n\nThen restart OpenClaw.',
      }, 405);
    } else if (response.status === 401) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
      return c.json({
        success: false,
        error: `Authentication failed (401).\n\nThe Gateway Token works for the dashboard but not for the OpenResponses API.\n\nTroubleshooting:\n1. Check auth mode: openclaw config get gateway.auth.mode\n2. If using "password" mode, enter the password in the Password field above\n3. If using "token" mode, the token may need to be regenerated\n\nError: ${JSON.stringify(errorData)}`,
      }, 401);
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      return c.json({
        success: false,
        error: `Failed to send message: ${response.status} - ${errorText}`,
      }, response.status as 400 | 401 | 403 | 404 | 500 | 503);
    }
  } catch (error) {
    console.error('OpenClaw send message error:', error);

    let errorMessage = 'Failed to send message';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout (30s). OpenClaw may be unresponsive or the AI model is taking too long.';
      } else {
        errorMessage = error.message;
      }
    }

    return c.json({
      success: false,
      error: errorMessage,
    }, 500);
  }
});


// Fetch detailed configuration from OpenClaw Gateway
app.post('/api/openclaw/gateway-config', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return c.json({ 
      success: false,
      error: 'Server URL and Gateway Token are required' 
    }, 400);
  }

  try {
    const diagnostics: string[] = [];
    try {
      const wsResult = await invokeOpenClawViaWebSocketAny({
        serverUrl,
        token,
        methods: ['config.get', 'config_get'],
        params: {},
        timeout: 10000,
      });
      diagnostics.push(`[ws] ${wsResult.method} succeeded`);
      return c.json({ success: true, config: wsResult.payload, source: 'ws', diagnostics });
    } catch (wsError) {
      diagnostics.push(`[ws] config.get failed: ${wsError instanceof Error ? wsError.message : 'Unknown error'}`);
    }

    const client = new OpenClawHttpClient({ serverUrl, token, timeout: 10000 });

    try {
      const config = await client.getConfig();
      diagnostics.push('config.get/config_get via /tools/invoke succeeded');
      return c.json({ success: true, config, source: 'tool', diagnostics });
    } catch (toolError) {
      diagnostics.push(`config.get/config_get failed: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`);
    }

    // Fallback for legacy gateways that expose direct REST config endpoint.
    const baseUrl = convertWsToHttp(serverUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${baseUrl}/api/config`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const text = await response.text().catch(() => '');
      let config: unknown = null;
      try {
        config = JSON.parse(text);
      } catch {
        config = null;
      }
      if (!config) {
        const htmlLike = contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
        diagnostics.push(htmlLike
          ? '/api/config fallback returned HTML (gateway UI/auth page), not JSON'
          : '/api/config fallback returned non-JSON payload');
        return c.json({
          success: false,
          error: 'Gateway config endpoint returned non-JSON content',
          details: htmlLike ? 'The URL likely points to dashboard/auth HTML instead of gateway config API.' : 'Invalid JSON payload from gateway',
          source: 'none',
          diagnostics,
        }, 502);
      }
      diagnostics.push('/api/config fallback succeeded');
      return c.json({ success: true, config, source: 'http', diagnostics });
    }

    const errorBody = await response.text().catch(() => '');
    diagnostics.push(`HTTP fallback failed: ${response.status}`);
    if (errorBody) diagnostics.push(errorBody.slice(0, 200));

    const cliConfig = await getGatewayConfigViaCli();
    if (cliConfig.ok) {
      diagnostics.push(...cliConfig.diagnostics);
      return c.json({
        success: true,
        config: cliConfig.payload,
        source: 'cli',
        diagnostics,
      });
    }

    return c.json({
      success: false,
      error: `Failed to fetch config: HTTP ${response.status}`,
      details: errorBody || cliConfig.error || 'No response body',
      source: 'none',
      diagnostics: [...diagnostics, ...cliConfig.diagnostics],
    });
  } catch (error) {
    const cliConfig = await getGatewayConfigViaCli();
    if (cliConfig.ok) {
      return c.json({
        success: true,
        config: cliConfig.payload,
        source: 'cli',
        diagnostics: cliConfig.diagnostics,
      });
    }
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to connect to OpenClaw Gateway',
      source: 'none',
      diagnostics: cliConfig.diagnostics,
    });
  }
});

// Update configuration on OpenClaw Gateway
app.post('/api/openclaw/gateway-config-update', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token, config } = body;

  if (!serverUrl || !token || !config) {
    return c.json({ success: false, error: 'Server URL, Token, and Config are required' }, 400);
  }

  try {
    const diagnostics: string[] = [];
    try {
      const wsSet = await invokeOpenClawViaWebSocketAny({
        serverUrl,
        token,
        methods: ['config.set', 'config_set', 'config.patch'],
        params: { raw: JSON.stringify(config) },
        timeout: 15000,
      });
      diagnostics.push(`[ws] ${wsSet.method} succeeded`);
      return c.json({ success: true, message: 'Configuration updated successfully', source: 'ws', diagnostics });
    } catch (wsError) {
      diagnostics.push(`[ws] config.set/config.patch failed: ${wsError instanceof Error ? wsError.message : 'Unknown error'}`);
    }

    const client = new OpenClawHttpClient({ serverUrl, token, timeout: 15000 });

    const toolUpdated = await client.updateConfig(config as Record<string, any>);
    if (toolUpdated) {
      diagnostics.push('config_set via /tools/invoke succeeded');
      return c.json({ success: true, message: 'Configuration updated successfully', source: 'tool', diagnostics });
    }
    diagnostics.push('config_set failed, trying /api/config fallback');

    // Fallback for legacy gateways with direct REST config endpoint.
    const baseUrl = convertWsToHttp(serverUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${baseUrl}/api/config`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      diagnostics.push('/api/config fallback succeeded');
      return c.json({ success: true, message: 'Configuration updated successfully', source: 'http', diagnostics });
    }

    const errorText = await response.text().catch(() => '');
    return c.json({
      success: false,
      error: `Failed to update config: ${response.status} - ${errorText || 'No response body'}`,
      source: 'none',
      diagnostics,
    }, 503);
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Restart OpenClaw Gateway
app.post('/api/openclaw/gateway-restart', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!serverUrl || !token) {
    return c.json({ error: 'Server URL and Gateway Token are required' }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const diagnostics: string[] = [];

    const toolCandidates = ['gateway.restart', 'gateway_restart', 'system.restart', 'system_restart', 'restart'];
    for (const tool of toolCandidates) {
      try {
        const toolResp = await fetch(`${baseUrl}/tools/invoke`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool,
            action: 'json',
            args: {},
            sessionKey: 'agent:main:main',
            dryRun: false,
          }),
        });

        if (toolResp.ok) {
          diagnostics.push(`Restart via tool '${tool}' succeeded`);
          return c.json({ success: true, message: 'Gateway restart initiated', source: 'tool', diagnostics });
        }
        diagnostics.push(`Tool '${tool}' returned HTTP ${toolResp.status}`);
      } catch (toolError) {
        diagnostics.push(`Tool '${tool}' failed: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`);
      }
    }

    // Fallback for legacy gateways.
    const response = await fetch(`${baseUrl}/api/restart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      diagnostics.push('/api/restart fallback succeeded');
      return c.json({ success: true, message: 'Gateway restart initiated', source: 'http', diagnostics });
    }

    return c.json({
      success: false,
      error: `Failed to restart gateway: HTTP ${response.status}`,
      source: 'none',
      diagnostics,
    }, 503);
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Sync agents with OpenClaw gateway
app.post('/api/openclaw/sync-agents', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();
  const {
    serverUrl,
    token,
    workspaceId,
    pruneMissing = false,
    maxAgents = 200,
  } = body as {
    serverUrl?: string;
    token?: string;
    workspaceId?: string;
    pruneMissing?: boolean;
    maxAgents?: number;
  };

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) {
    return c.json({
      success: false,
      error: 'workspaceId is required for workspace-scoped sync',
    }, 400);
  }

  const workspace = await getWorkspaceById(db, user.userId, workspaceId);
  if (!workspace) {
    return c.json({ success: false, error: 'Workspace not found or access denied' }, 404);
  }

  if (!serverUrl || !token) {
    return c.json({ success: false, error: 'Server URL and Gateway Token are required' }, 400);
  }

  const safeMaxAgents = Math.min(Math.max(Number(maxAgents) || 200, 1), 1000);

  try {
    const gatewayAgents = await fetchGatewayAgentsList(serverUrl, token);
    if (!gatewayAgents.length) {
      throw new Error('Unable to fetch agents from gateway (agents.list/agents_list unavailable or empty)');
    }
    const syncStartedAt = new Date().toISOString();
    const limitedAgents = gatewayAgents.slice(0, safeMaxAgents);
    const syncedAgentNames = new Set<string>();

    const existingAgents = await db
      .select()
      .from(schema.agents)
      .where(and(
        eq(schema.agents.userId, user.userId),
        eq(schema.agents.workspaceId, workspaceId),
      ));

    const existingByName = new Map(existingAgents.map((agent) => [agent.name, agent]));

    const results: Array<{ id: string; name: string; action: 'created' | 'updated' | 'unchanged' }> = [];

    for (const gAgent of limitedAgents) {
      const name = String(gAgent.name ?? '').trim();
      if (!name) continue;

      syncedAgentNames.add(name);

      const normalizedTools = Array.isArray((gAgent.tools as { enabled?: unknown[] } | undefined)?.enabled)
        ? ((gAgent.tools as { enabled?: unknown[] }).enabled ?? [])
        : Array.isArray(gAgent.toolsEnabled)
          ? gAgent.toolsEnabled
          : [];

      const nextAgentValues = {
        role: String(gAgent.role ?? 'Agent'),
        level: String(gAgent.level ?? 'intern'),
        status: String(gAgent.status ?? 'idle'),
        model: String(gAgent.model ?? 'claude-3-opus'),
        description: String(gAgent.description ?? ''),
        avatar: String(gAgent.avatar ?? '🤖'),
        toolsEnabled: JSON.stringify(normalizedTools),
      };

      const existing = existingByName.get(name);

      if (existing) {
        const hasChanges =
          existing.role !== nextAgentValues.role ||
          existing.level !== nextAgentValues.level ||
          existing.status !== nextAgentValues.status ||
          existing.model !== nextAgentValues.model ||
          (existing.description || '') !== nextAgentValues.description ||
          (existing.avatar || '🤖') !== nextAgentValues.avatar ||
          (existing.toolsEnabled || '[]') !== nextAgentValues.toolsEnabled;

        if (!hasChanges) {
          results.push({ id: existing.id, name, action: 'unchanged' });
          continue;
        }

        await db.update(schema.agents).set({
          ...nextAgentValues,
          updatedAt: syncStartedAt,
        }).where(eq(schema.agents.id, existing.id));

        results.push({ id: existing.id, name, action: 'updated' });
        continue;
      }

      const id = `agent-${crypto.randomUUID()}`;
      await db.insert(schema.agents).values({
        id,
        workspaceId,
        userId: user.userId,
        name,
        ...nextAgentValues,
        createdAt: syncStartedAt,
        updatedAt: syncStartedAt,
      });

      results.push({ id, name, action: 'created' });
    }

    if (pruneMissing) {
      const idsToOffline = existingAgents
        .filter((localAgent) => !syncedAgentNames.has(localAgent.name))
        .map((localAgent) => localAgent.id);

      if (idsToOffline.length > 0) {
        await db
          .update(schema.agents)
          .set({ status: 'offline', updatedAt: syncStartedAt })
          .where(inArray(schema.agents.id, idsToOffline));
      }
    }

    const created = results.filter((r) => r.action === 'created').length;
    const updated = results.filter((r) => r.action === 'updated').length;
    const unchanged = results.filter((r) => r.action === 'unchanged').length;

    return c.json({
      success: true,
      workspaceId,
      synced: results.length,
      created,
      updated,
      unchanged,
      truncated: gatewayAgents.length > limitedAgents.length,
      sourceCount: gatewayAgents.length,
      results,
    });
  } catch (error) {
    console.error('Sync agents error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Sync failed' }, 500);
  }
});

// Sync skills with OpenClaw gateway
app.post('/api/openclaw/sync-skills', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const { serverUrl, token } = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!serverUrl || !token) return c.json({ error: 'Server URL and Gateway Token are required' }, 400);

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const response = await fetch(`${baseUrl}/api/skills`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Gateway returned ${response.status}`);
    const jsonSkillResponse = await response.json() as any;
    const gatewaySkills = jsonSkillResponse.data;

    if (!Array.isArray(gatewaySkills)) throw new Error('Invalid response from gateway');

    const now = new Date().toISOString();
    const results = [];

    for (const gSkill of gatewaySkills) {
      const [existing] = await db.select().from(schema.installedSkills).where(and(eq(schema.installedSkills.skillId, gSkill.id), eq(schema.installedSkills.userId, user.userId)));

      if (existing) {
        await db.update(schema.installedSkills).set({
          name: gSkill.name || existing.name,
          version: gSkill.version || existing.version,
          description: gSkill.description || existing.description,
          category: gSkill.category || existing.category,
        }).where(eq(schema.installedSkills.id, existing.id));
        results.push({ id: existing.id, skillId: gSkill.id, action: 'updated' });
      } else {
        const id = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        await db.insert(schema.installedSkills).values({
          id,
          userId: user.userId,
          skillId: gSkill.id,
          name: gSkill.name,
          version: gSkill.version || '1.0.0',
          author: gSkill.author || 'OpenClaw',
          description: gSkill.description || '',
          category: gSkill.category || 'general',
          installDate: now
        });
        results.push({ id, skillId: gSkill.id, action: 'created' });
      }
    }

    return c.json({ success: true, results });
  } catch (error) {
    console.error('Sync skills error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Sync failed' }, 500);
  }
});

// Sync chats with OpenClaw gateway for a specific task
app.post('/api/openclaw/sync-chats', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const { serverUrl, token, taskId, sessionKey } = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!serverUrl || !token || !taskId) return c.json({ error: 'Server URL, Token, and TaskID are required' }, 400);

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    // OpenClaw might have an endpoint for getting session history
    const response = await fetch(`${baseUrl}/api/sessions/${sessionKey || 'agent:main:main'}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Gateway returned ${response.status}`);
    const jsonChatResp = await response.json() as any;
    const gatewayMessages = jsonChatResp.data || [];

    if (!Array.isArray(gatewayMessages)) throw new Error('Invalid response from gateway');

    const results = [];
    for (const gMsg of gatewayMessages) {
      // Check if message already exists (using externalId if available, or timestamp+content hash)
      // For now, we'll just check if a message with same content and timestamp exists for this task
      const [existing] = await db.select().from(schema.messages).where(and(
        eq(schema.messages.taskId, taskId),
        eq(schema.messages.content, gMsg.content),
        eq(schema.messages.timestamp, gMsg.timestamp)
      ));

      if (!existing) {
        const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        await db.insert(schema.messages).values({
          id,
          taskId,
          userId: gMsg.role === 'user' ? user.userId : null,
          agentId: gMsg.role === 'assistant' ? (gMsg.agentId || null) : null,
          content: gMsg.content,
          type: gMsg.type || 'comment',
          source: 'openclaw',
          timestamp: gMsg.timestamp || new Date().toISOString()
        });
        results.push({ id, status: 'synced' });
      }
    }

    return c.json({ success: true, synced: results.length });
  } catch (error) {
    console.error('Sync chats error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Sync failed' }, 500);
  }
});

// Configure Gateway Sleep Time
app.post('/api/openclaw/gateway-sleep', async (c) => {
  const body = await c.req.json();
  const { serverUrl, token, sleepTimeMs } = body;

  if (!serverUrl || !token || sleepTimeMs === undefined) {
    return c.json({ error: 'Server URL, Token, and Sleep Time are required' }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const configUpdateResponse = await fetch(`${baseUrl}/api/config`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gateway: {
          performance: {
            idleSleepMs: sleepTimeMs
          }
        }
      })
    });

    if (configUpdateResponse.ok) {
      return c.json({ success: true, message: 'Sleep time updated' });
    } else {
      return c.json({ success: false, error: `Failed to update sleep time: ${configUpdateResponse.status}` }, 503);
    }
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Push agents from dashboard to OpenClaw Gateway
app.post('/api/openclaw/push-agents', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const { serverUrl, token, cliWorkspaceDir, useCliFallback = true } = await c.req.json() as {
    serverUrl?: string;
    token?: string;
    cliWorkspaceDir?: string;
    useCliFallback?: boolean;
  };

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!serverUrl || !token) return c.json({ error: 'Server URL and Gateway Token are required' }, 400);

  try {
    // Get all agents from local database for this user
    const agents = await db.select().from(schema.agents).where(eq(schema.agents.userId, user.userId));
    
    if (agents.length === 0) {
      return c.json({ success: true, pushed: 0, message: 'No agents to push' });
    }

    const results = [];
    let pushedCount = 0;

    for (const agent of agents) {
      try {
        const createResult = await createGatewayAgent(serverUrl, token, {
          name: agent.name,
          avatar: agent.avatar,
          role: agent.role,
          level: agent.level,
          status: agent.status,
          model: agent.model,
          description: agent.description,
          sessionKey: agent.sessionKey,
          skills: agent.skills,
        });

        if (createResult.created) {
          pushedCount++;
          results.push({ id: agent.id, name: agent.name, action: 'pushed' });
        } else {
          const canUseCliFallback = Boolean(useCliFallback);

          if (!canUseCliFallback) {
            results.push({ id: agent.id, name: agent.name, action: 'failed', error: createResult.error ?? 'Unsupported by gateway profile' });
            continue;
          }

          const cliResult = await createAgentViaCli({
            name: agent.name,
            model: agent.model,
            emoji: agent.avatar,
            avatar: null,
            workspaceDir: cliWorkspaceDir ?? null,
          });

          if (cliResult.created) {
            pushedCount++;
            results.push({
              id: agent.id,
              name: agent.name,
              action: 'pushed',
              method: 'cli',
              gatewayError: createResult.error ?? null,
              diagnostics: cliResult.diagnostics,
            });
          } else {
            results.push({
              id: agent.id,
              name: agent.name,
              action: 'failed',
              error: cliResult.error ?? createResult.error ?? 'Unsupported by gateway profile',
              method: 'cli',
              diagnostics: cliResult.diagnostics,
            });
          }
        }
      } catch (agentError) {
        results.push({ id: agent.id, name: agent.name, action: 'failed', error: agentError instanceof Error ? agentError.message : 'Unknown error' });
      }
    }

    const failedCount = results.filter((item) => item.action === 'failed').length;
    const firstFailure = results.find((item) => item.action === 'failed') as { error?: string } | undefined;
    const success = failedCount === 0;
    const message = success
      ? `Pushed ${pushedCount} agents`
      : pushedCount > 0
        ? `Partially pushed agents (${pushedCount} succeeded, ${failedCount} failed)`
        : `No agents were pushed (${firstFailure?.error ?? 'gateway create capability unavailable'})`;

    return c.json({ success, pushed: pushedCount, failed: failedCount, message, results });
  } catch (error) {
    console.error('Push agents error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Push failed' }, 500);
  }
});

// Push agent files from dashboard to OpenClaw Gateway
app.post('/api/openclaw/push-files', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const { serverUrl, token } = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!serverUrl || !token) return c.json({ error: 'Server URL and Gateway Token are required' }, 400);

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    
    // Get all agents from local database for this user
    const agents = await db.select().from(schema.agents).where(eq(schema.agents.userId, user.userId));
    
    if (agents.length === 0) {
      return c.json({ success: true, pushed: 0, message: 'No agents to push files for' });
    }

    // Get agent files for all agents
    const results = [];
    let pushedCount = 0;

    for (const agent of agents) {
      try {
        // Get agent files from local database
        const agentFiles = await db.select().from(schema.agentFiles).where(eq(schema.agentFiles.agentId, agent.id));
        
        for (const file of agentFiles) {
          try {
            // Push each file to the gateway
            const response = await fetch(`${baseUrl}/api/agents/${agent.name}/files/${file.filename}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: file.content
              })
            });

            if (response.ok) {
              pushedCount++;
              results.push({ agent: agent.name, filename: file.filename, action: 'pushed' });
            } else {
              const errorText = await response.text();
              results.push({ agent: agent.name, filename: file.filename, action: 'failed', error: errorText });
            }
          } catch (fileError) {
            results.push({ agent: agent.name, filename: file.filename, action: 'failed', error: fileError instanceof Error ? fileError.message : 'Unknown error' });
          }
        }
      } catch (agentError) {
        console.error(`Error processing agent ${agent.name}:`, agentError);
      }
    }

    return c.json({ success: true, pushed: pushedCount, results });
  } catch (error) {
    console.error('Push files error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Push failed' }, 500);
  }
});

// Fetch Agent Memory (memory.md)
app.get('/api/openclaw/agent-memory/:agentId', async (c) => {
  const agentId = c.req.param('agentId');
  const serverUrl = c.req.query('serverUrl');
  const token = c.req.query('token');

  if (!serverUrl || !token) {
    return c.json({ error: 'Server URL and Gateway Token are required' }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const response = await fetch(`${baseUrl}/api/agents/${agentId}/memory`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json() as any;
      return c.json({ success: true, memory: data.content || '' });
    } else {
      return c.json({ success: false, error: `Failed to fetch memory: ${response.status}` }, 503);
    }
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Update Agent Memory (memory.md)
app.patch('/api/openclaw/agent-memory/:agentId', async (c) => {
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  const { serverUrl, token, content } = body;

  if (!serverUrl || !token || content === undefined) {
    return c.json({ error: 'Server URL, Token, and Content are required' }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const response = await fetch(`${baseUrl}/api/agents/${agentId}/memory`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      return c.json({ success: true, message: 'Memory updated' });
    } else {
      return c.json({ success: false, error: `Failed to update memory: ${response.status}` }, 503);
    }
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// OpenClaw Gateway - Heartbeat endpoints for agent wake-up configuration
// Docs: https://docs.openclaw.ai/gateway/heartbeat

app.get('/api/agents/:id/heartbeat', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const wakeupConfig = typeof agent.wakeupConfig === 'string'
      ? JSON.parse(agent.wakeupConfig ?? '{}')
      : agent.wakeupConfig ?? {};

    return c.json({
      success: true,
      agentId,
      heartbeat: {
        enabled: wakeupConfig.method === 'heartbeat',
        every: wakeupConfig.everyMs ?? 900000,
        target: wakeupConfig.target ?? null,
        includeReasoning: wakeupConfig.includeReasoning ?? false,
        activeHours: wakeupConfig.activeHours ?? null,
        method: wakeupConfig.method ?? 'poll',
        intervalMs: wakeupConfig.intervalMs ?? 900000,
      },
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.put('/api/agents/:id/heartbeat', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const existingConfig = typeof agent.wakeupConfig === 'string'
      ? JSON.parse(agent.wakeupConfig ?? '{}')
      : agent.wakeupConfig ?? {};

    const newConfig = {
      ...existingConfig,
      method: body.method ?? existingConfig.method ?? 'poll',
      intervalMs: body.intervalMs ?? existingConfig.intervalMs ?? 900000,
      everyMs: body.every ?? existingConfig.everyMs,
      target: body.target ?? existingConfig.target ?? null,
      includeReasoning: body.includeReasoning ?? existingConfig.includeReasoning ?? false,
      activeHours: body.activeHours ?? existingConfig.activeHours ?? null,
    };

    await db
      .update(schema.agents)
      .set({ wakeupConfig: JSON.stringify(newConfig), updatedAt: new Date().toISOString() })
      .where(eq(schema.agents.id, agentId));

    return c.json({
      success: true,
      agentId,
      heartbeat: {
        enabled: newConfig.method === 'heartbeat',
        every: newConfig.everyMs,
        target: newConfig.target,
        includeReasoning: newConfig.includeReasoning,
        activeHours: newConfig.activeHours,
        method: newConfig.method,
        intervalMs: newConfig.intervalMs,
      },
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.delete('/api/agents/:id/heartbeat', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    await db
      .update(schema.agents)
      .set({
        wakeupConfig: JSON.stringify({ method: 'poll', intervalMs: 900000 }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.agents.id, agentId));

    return c.json({
      success: true,
      message: 'Heartbeat configuration removed, reverted to poll mode',
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/agents/:id/wake', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');
  const body = await c.req.json();
  const { serverUrl, token } = body;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [agent] = await db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.id, agentId), eq(schema.agents.userId, user.userId)));

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const sessionKey = agent.sessionKey ?? `agent:${agentId}:main`;

    if (!serverUrl || !token) {
      return c.json({
        success: false,
        error: 'serverUrl and token are required to wake the agent via gateway',
      }, 400);
    }

    const baseUrl = convertWsToHttp(serverUrl);
    const response = await fetch(`${baseUrl}/api/agents/${sessionKey}/wake`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.ok) {
      return c.json({
        success: true,
        message: `Wake signal sent to agent via ${sessionKey}`,
      });
    } else {
      const errorText = await response.text();
      return c.json({
        success: false,
        error: `Failed to wake agent: ${response.status} - ${errorText}`,
      }, 503);
    }
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ========== BEADS / TASK CONTROL PLANE ==========
// Invoke Beads CLI (br) for task management
// Docs: https://docs.openclaw.ai/beads

app.post('/api/beads/execute', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();
  const { command, args, cwd } = body;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!command) {
    return c.json({ error: 'Command is required' }, 400);
  }

  try {
    const fullArgs = args ?? [];

    let brPath = 'br';
    try {
      const { execSync } = await import('child_process');
      try {
        execSync('which br', { stdio: 'ignore' });
        brPath = 'br';
      } catch {
        try {
          execSync('where br', { stdio: 'ignore' });
          brPath = 'br';
        } catch {
          brPath = 'npx br';
        }
      }
    } catch {
      brPath = 'npx br';
    }

    const { execSync } = await import('child_process');
    const workingDir = cwd ?? process.cwd();
    const fullCommand = `${brPath} ${command} ${fullArgs.join(' ')}`;

    const output = execSync(fullCommand, {
      cwd: workingDir,
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });

    let parsedOutput = output;
    try {
      parsedOutput = JSON.parse(output);
    } catch {
    }

    return c.json({
      success: true,
      command,
      args: fullArgs,
      cwd: workingDir,
      output: parsedOutput,
      rawOutput: output,
    });
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('ENOENT')) {
        return c.json({
          success: false,
          error: 'Beads CLI (br) not found. Please install Beads or ensure it is in PATH.',
        }, 400);
      }
      if (message.includes('timeout')) {
        return c.json({
          success: false,
          error: 'Command timed out after 60 seconds',
        }, 408);
      }
      return c.json({
        success: false,
        error: message,
      }, 500);
    }
    return c.json({ error: 'Unknown error executing command' }, 500);
  }
});

app.get('/api/beads/tasks', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') ?? '20');
  const offset = parseInt(c.req.query('offset') ?? '0');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    let whereClause = eq(schema.tasks.userId, user.userId);
    if (status) {
      whereClause = and(whereClause, eq(schema.tasks.status, status)) as any;
    }

    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(whereClause)
      .orderBy(schema.tasks.createdAt)
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tasks)
      .where(eq(schema.tasks.userId, user.userId));

    return c.json({
      success: true,
      tasks,
      pagination: {
        total: total[0]?.count ?? 0,
        limit,
        offset,
        hasMore: offset + tasks.length < (total[0]?.count ?? 0),
      },
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/beads/tasks/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const taskId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.userId, user.userId)));

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const messages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.taskId, taskId))
      .orderBy(schema.messages.timestamp);

    return c.json({
      success: true,
      task,
      messages,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== CONFIG GET/SET WITH OPTIMISTIC LOCKING ==========

app.get('/api/config', async (c) => {
  const user = await getUserFromToken(c);
  const { serverUrl, token } = await c.req.json().catch(() => ({}));

  if (!serverUrl || !token) {
    return c.json({
      success: false,
      error: 'serverUrl and token are required',
    }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${baseUrl}/api/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const config = await response.json();
      const hash = await computeHash(JSON.stringify(config));

      return c.json({
        success: true,
        config,
        hash,
        timestamp: new Date().toISOString(),
      });
    } else {
      return c.json({
        success: false,
        error: `Failed to fetch config: ${response.status}`,
      }, 503);
    }
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

app.post('/api/config/set', async (c) => {
  const user = await getUserFromToken(c);
  const body = await c.req.json();
  const { serverUrl, token, config, expectedHash } = body;

  if (!serverUrl || !token || !config) {
    return c.json({
      success: false,
      error: 'serverUrl, token, and config are required',
    }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);

    if (expectedHash) {
      const currentConfigResponse = await fetch(`${baseUrl}/api/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (currentConfigResponse.ok) {
        const currentConfig = await currentConfigResponse.json();
        const currentHash = await computeHash(JSON.stringify(currentConfig));

        if (currentHash !== expectedHash) {
          return c.json({
            success: false,
            error: 'Config has been modified by another process. Please refresh and try again.',
            currentHash,
            expectedHash,
            retry: true,
          }, 409);
        }
      }
    }

    const response = await fetch(`${baseUrl}/api/config`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (response.ok) {
      const newConfig = await response.json();
      const newHash = await computeHash(JSON.stringify(newConfig));

      return c.json({
        success: true,
        config: newConfig,
        hash: newHash,
        message: 'Configuration updated successfully',
      });
    } else {
      const errorText = await response.text();
      return c.json({
        success: false,
        error: `Failed to update config: ${response.status} - ${errorText}`,
      }, 503);
    }
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== AGENT FILES VIA GATEWAY ==========

app.get('/api/agents/:id/files/:filename/gateway', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');
  const filename = c.req.param('filename');
  const { serverUrl, token } = await c.req.json().catch(() => ({}));

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!serverUrl || !token) {
    return c.json({
      success: false,
      error: 'serverUrl and token are required to fetch from gateway',
    }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const sessionKey = `agent:${agentId}:main`;
    const endpoint = filename === 'MEMORY.md' ? '/memory' : `/${filename.replace('.md', '')}`;

    const response = await fetch(`${baseUrl}/api/agents/${sessionKey}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/markdown,application/json',
      },
    });

    if (response.ok) {
      const content = await response.text();
      return c.json({
        success: true,
        agentId,
        filename,
        content,
        source: 'gateway',
      });
    } else if (response.status === 404) {
      return c.json({
        success: false,
        error: `${filename} not found on gateway for agent ${agentId}`,
      }, 404);
    } else {
      return c.json({
        success: false,
        error: `Failed to fetch ${filename}: ${response.status}`,
      }, 503);
    }
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

app.put('/api/agents/:id/files/:filename/gateway', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const agentId = c.req.param('id');
  const filename = c.req.param('filename');
  const { serverUrl, token, content } = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!serverUrl || !token || content === undefined) {
    return c.json({
      success: false,
      error: 'serverUrl, token, and content are required',
    }, 400);
  }

  try {
    const baseUrl = convertWsToHttp(serverUrl);
    const sessionKey = `agent:${agentId}:main`;
    const endpoint = filename === 'MEMORY.md' ? '/memory' : `/${filename.replace('.md', '')}`;

    const response = await fetch(`${baseUrl}/api/agents/${sessionKey}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      return c.json({
        success: true,
        agentId,
        filename,
        message: `${filename} updated on gateway`,
        source: 'gateway',
      });
    } else {
      return c.json({
        success: false,
        error: `Failed to update ${filename}: ${response.status}`,
      }, 503);
    }
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Webhook to receive events from OpenClaw via user-installed hook
async function computeHmacHex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

app.post('/api/webhooks/openclaw', async (c) => {
  const db = getDb(c.env);
  const rawBody = await c.req.text();
  let body: Record<string, unknown>;

  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const workspaceIdHeader = c.req.header('X-Clawpute-Workspace-Id');
  const signatureHeader = c.req.header('X-Clawpute-Signature');
  const timestampHeader = c.req.header('X-Clawpute-Timestamp');

  if (!workspaceIdHeader) {
    return c.json({ error: 'Missing X-Clawpute-Workspace-Id header' }, 400);
  }

  const [workspace] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceIdHeader));
  if (!workspace) {
    return c.json({ error: 'Workspace not found for webhook' }, 404);
  }

  let workspaceSettings: Record<string, unknown> = {};
  try {
    workspaceSettings = workspace.settings ? JSON.parse(workspace.settings) : {};
  } catch {
    workspaceSettings = {};
  }

  const expectedSecret = typeof workspaceSettings.openclawWebhookSecret === 'string'
    ? workspaceSettings.openclawWebhookSecret
    : '';

  if (expectedSecret) {
    if (!signatureHeader || !timestampHeader) {
      return c.json({ error: 'Missing webhook signature headers' }, 401);
    }

    const expectedSignature = await computeHmacHex(expectedSecret, `${timestampHeader}.${rawBody}`);
    if (signatureHeader !== expectedSignature) {
      return c.json({ error: 'Invalid webhook signature' }, 401);
    }
  }

  const runId = typeof body.runId === 'string' ? body.runId : '';
  const action = typeof body.action === 'string' ? body.action : '';
  const sessionKey = typeof body.sessionKey === 'string' ? body.sessionKey : null;
  const agentId = typeof body.agentId === 'string' ? body.agentId : null;
  const timestamp = typeof body.timestamp === 'string' ? body.timestamp : null;
  const prompt = typeof body.prompt === 'string' ? body.prompt : null;
  const message = typeof body.message === 'string' ? body.message : null;
  const error = typeof body.error === 'string' ? body.error : null;
  const response = typeof body.response === 'string' ? body.response : null;
  const source = typeof body.source === 'string' ? body.source : null;
  const eventType = typeof body.eventType === 'string' ? body.eventType : null;
  const document = (body.document && typeof body.document === 'object')
    ? body.document as { title?: string; content?: string; type?: string; path?: string }
    : null;

  // Validate required fields
  if (!runId || !action) {
    return c.json({ error: 'Missing required fields: runId, action' }, 400);
  }

  try {
    const systemUserId = workspace.ownerId ?? null;
    if (!systemUserId) {
      return c.json({ error: 'Workspace owner not found for webhook routing' }, 400);
    }

    switch (action) {
      case 'start': {
        // Check if task already exists for this run
        const [existingTask] = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.openclawRunId, runId));

        if (existingTask) {
          return c.json({ success: true, taskId: existingTask.id, message: 'Task already exists' });
        }

        // Find or create system agent
        const [systemAgent] = await db
          .select()
          .from(schema.agents)
          .where(eq(schema.agents.name, 'OpenClaw'));

        let systemAgentId: string;
        if (!systemAgent) {
          systemAgentId = `agent-openclaw-${Date.now()}`;
          await db.insert(schema.agents).values({
            id: systemAgentId,
            userId: systemUserId,
            name: 'OpenClaw',
            avatar: '🤖',
            role: 'AI Assistant',
            level: 'specialist',
            status: 'active',
            model: 'claude-3-opus',
            description: 'System agent for OpenClaw integration',
          });
        } else {
          systemAgentId = systemAgent.id;
        }

        // Try to find agent by name if provided
        let assignedAgentId = systemAgentId;
        if (agentId) {
          const [namedAgent] = await db
            .select()
            .from(schema.agents)
            .where(eq(schema.agents.name, agentId));
          if (namedAgent) {
            assignedAgentId = namedAgent.id;
          }
        }

        // Create a new task
        const now = new Date().toISOString();
        const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const title = prompt
          ? prompt.slice(0, 80) + (prompt.length > 80 ? '...' : '')
          : `OpenClaw Task ${runId.slice(0, 8)}`;

        await db.insert(schema.tasks).values({
          id: taskId,
          workspaceId: workspaceIdHeader,
          userId: systemUserId,
          title,
          description: prompt || `Task from OpenClaw run ${runId}`,
          status: 'in_progress',
          priority: 'medium',
          tags: JSON.stringify(['openclaw', 'auto', source].filter(Boolean)),
          category: 'openclaw',
          sessionKey: sessionKey || null,
          openclawRunId: runId,
          startedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        // Add initial message
        await db.insert(schema.messages).values({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          taskId,
          workspaceId: workspaceIdHeader,
          agentId: assignedAgentId,
          content: `🚀 **Started**${source ? ` from ${source}` : ''}\n\n${prompt || 'N/A'}`,
          type: 'system',
          source: source || null,
          timestamp: now,
        });

        // Log activity
        await db.insert(schema.activities).values({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'openclaw_task_started',
          agentId: assignedAgentId,
          taskId,
          workspaceId: workspaceIdHeader,
          userId: systemUserId,
          content: `OpenClaw started: "${title}"`,
          metadata: JSON.stringify({ runId, source, sessionKey }),
          timestamp: now,
        });

        return c.json({ success: true, taskId });
      }

      case 'progress': {
        // Find task by runId
        const [task] = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.openclawRunId, runId));

        if (!task) {
          return c.json({ error: 'Task not found' }, 404);
        }

        // Add progress message
        const now = new Date().toISOString();
        await db.insert(schema.messages).values({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          workspaceId: workspaceIdHeader,
          taskId: task.id,
          content: message || 'Progress update',
          type: 'progress',
          source: source || null,
          timestamp: now,
        });

        // Flag coding tool usage
        if (eventType === 'tool:start' && message) {
          const codingTools = ['edit', 'exec', 'bash', 'run', 'process'];
          const toolMatch = message.match(/Using tool:\s*(\S+)/);
          if (toolMatch && codingTools.includes(toolMatch[1])) {
            await db.update(schema.tasks)
              .set({ usedCodingTools: true, updatedAt: now })
              .where(eq(schema.tasks.id, task.id));
          }
        }

        return c.json({ success: true });
      }

      case 'end': {
        // Find task by runId
        const [task] = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.openclawRunId, runId));

        if (!task) {
          return c.json({ error: 'Task not found' }, 404);
        }

        const now = new Date().toISOString();

        // Calculate duration
        const startedAt = task.startedAt ? new Date(task.startedAt).getTime() : Date.now();
        const duration = Date.now() - startedAt;
        const durationStr = formatDuration(duration);

        // Determine if needs review
        const needsFeedback = response ? response.includes('?') : false;
        const isCodingTask = task.usedCodingTools ?? false;
        const endStatus = needsFeedback || isCodingTask ? 'review' : 'done';

        // Update task
        await db.update(schema.tasks)
          .set({
            status: endStatus,
            completedAt: now,
            updatedAt: now
          })
          .where(eq(schema.tasks.id, task.id));

        // Add completion message
        const icon = needsFeedback ? '❓' : '✅';
        const statusText = needsFeedback ? 'Needs Input' : 'Completed';
        let completionMsg = `${icon} **${statusText}** in **${durationStr}**`;
        if (response) {
          const truncatedResponse = response.length > 1000
            ? response.slice(0, 1000) + '...'
            : response;
          completionMsg += `\n\n${truncatedResponse}`;
        }

        await db.insert(schema.messages).values({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          workspaceId: workspaceIdHeader,
          taskId: task.id,
          content: completionMsg,
          type: 'system',
          timestamp: now,
        });

        // Log activity
        await db.insert(schema.activities).values({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'openclaw_task_completed',
          agentId: task.creatorId,
          taskId: task.id,
          userId: systemUserId,
          content: `${needsFeedback ? 'Needs input on' : 'Completed'} "${task.title}" in ${durationStr}`,
          metadata: JSON.stringify({ runId, duration }),
          timestamp: now,
        });

        return c.json({ success: true, status: endStatus, duration: durationStr });
      }

      case 'error': {
        // Find task by runId
        const [task] = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.openclawRunId, runId));

        if (!task) {
          return c.json({ error: 'Task not found' }, 404);
        }

        const now = new Date().toISOString();

        // Calculate duration even for errors
        const startedAt = task.startedAt ? new Date(task.startedAt).getTime() : Date.now();
        const duration = Date.now() - startedAt;
        const durationStr = formatDuration(duration);

        // Move to review status
        await db.update(schema.tasks)
          .set({
            status: 'review',
            updatedAt: now
          })
          .where(eq(schema.tasks.id, task.id));

        // Add error message
        await db.insert(schema.messages).values({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          workspaceId: workspaceIdHeader,
          taskId: task.id,
          content: `❌ **Error** after **${durationStr}**\n\n${error || 'Unknown error'}`,
          type: 'system',
          timestamp: now,
        });

        // Log activity
        await db.insert(schema.activities).values({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'openclaw_task_error',
          agentId: task.creatorId,
          taskId: task.id,
          userId: systemUserId,
          content: `Error on "${task.title}" after ${durationStr}`,
          metadata: JSON.stringify({ runId, error }),
          timestamp: now,
        });

        return c.json({ success: true });
      }

      case 'document': {
        if (!document) {
          return c.json({ error: 'Missing document data' }, 400);
        }

        // Find task by runId
        const [task] = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.openclawRunId, runId));

        const now = new Date().toISOString();
        const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const docContent = typeof document.content === 'string' ? document.content : '';

        // Create document
        await db.insert(schema.documents).values({
          id: docId,
          title: document.title || 'Untitled Document',
          content: docContent.length > 50000
            ? docContent.slice(0, 50000) + '\n\n[Content truncated...]'
            : docContent,
          type: document.type || 'text',
          path: document.path || null,
          taskId: task?.id || null,
          userId: systemUserId,
          createdAt: now,
        });

        // If task exists, add message about document
        if (task) {
          await db.insert(schema.messages).values({
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            workspaceId: workspaceIdHeader,
            taskId: task.id,
            content: `📄 Created document: **${document.title || 'Untitled Document'}**\n\nType: ${document.type || 'text'}${document.path ? `\nPath: \`${document.path}\`` : ''}`,
            type: 'system',
            attachments: JSON.stringify([docId]),
            timestamp: now,
          });
        }

        return c.json({ success: true, documentId: docId });
      }

      default:
        return c.json({ success: false, error: 'Unknown action' }, 400);
    }
  } catch (err) {
    console.error('Webhook error:', err);
    return c.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

// Helper function to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ========== MESSAGES API ==========

// Get messages for a task
app.get('/api/tasks/:id/messages', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const taskId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const messages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.taskId, taskId))
      .orderBy(schema.messages.timestamp);

    return c.json({ messages });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Create a message on a task
app.post('/api/tasks/:id/messages', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const taskId = c.req.param('id');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    const now = new Date().toISOString();
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await db.insert(schema.messages).values({
      id,
      taskId,
      userId: user.userId,
      content: body.content || '',
      type: body.type || 'comment',
      timestamp: now,
    });

    return c.json({ success: true, message: { id, ...body } }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== DOCUMENTS API ==========

// Get documents for a task
app.get('/api/tasks/:id/documents', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const taskId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const documents = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.taskId, taskId))
      .orderBy(schema.documents.createdAt);

    return c.json({ documents });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get all documents for user
app.get('/api/documents', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const documents = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.userId, user.userId))
      .orderBy(schema.documents.createdAt);

    return c.json({ documents });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get single document
app.get('/api/documents/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [document] = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id));

    if (!document) {
      return c.json({ error: 'Document not found' }, 404);
    }

    return c.json(document);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== BIDIRECTIONAL OPENCLAW INTEGRATION ==========

// Execute a task in OpenClaw (send from Clawpute to OpenClaw)
app.post('/api/tasks/:id/execute', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const taskId = c.req.param('id');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    // Get task details
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.userId, user.userId)));

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Get OpenClaw connection settings
    const [connection] = await db
      .select()
      .from(schema.openclawConnections)
      .where(and(eq(schema.openclawConnections.isDefault, true), eq(schema.openclawConnections.userId, user.userId)))
      .limit(1);

    if (!connection) {
      return c.json({ error: 'No OpenClaw connection configured' }, 400);
    }

    // Prepare the prompt from task
    const prompt = body.prompt || task.description || task.title;

    // Get assigned agent from task, or use provided agent, or default to 'main'
    const agentName = body.agent || 'main';

    // Generate run ID for tracking
    const runId = `clawpute-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Update task with run ID
    const now = new Date().toISOString();
    await db.update(schema.tasks)
      .set({
        openclawRunId: runId,
        status: 'in_progress',
        startedAt: now,
        updatedAt: now
      })
      .where(eq(schema.tasks.id, taskId));

    // Add system message
    await db.insert(schema.messages).values({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId,
      userId: user.userId,
      content: `🚀 **Task sent to OpenClaw**\n\nAgent: **${agentName}**\nPrompt: ${prompt.slice(0, 200)}${prompt.length > 200 ? '...' : ''}`,
      type: 'system',
      timestamp: now,
    });

    // Send to OpenClaw via HTTP API (fire and forget - webhook will handle updates)
    // Note: In production, you might want to use a queue for this
    const openclawUrl = connection.url.replace(/\/$/, '');

    // Try to trigger OpenClaw execution
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${openclawUrl}/api/agents/${agentName}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': connection.apiKey ? `Bearer ${connection.apiKey}` : '',
        },
        body: JSON.stringify({
          instruction: prompt,
          session_id: runId,
          metadata: {
            clawputeTaskId: taskId,
            clawputeUserId: user.userId,
            source: 'clawpute'
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('OpenClaw execution error:', errorText);

        // Don't fail - webhook might still work
        await db.insert(schema.messages).values({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          taskId,
          content: `⚠️ **OpenClaw HTTP trigger failed**\n\nThe webhook may still process this task. Error: ${errorText.slice(0, 200)}`,
          type: 'system',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (execError) {
      console.error('Failed to trigger OpenClaw:', execError);
      // Task is already created - webhook will handle updates if it works
    }

    // Log activity
    await db.insert(schema.activities).values({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'task_executed',
      taskId,
      userId: user.userId,
      content: `Task "${task.title}" sent to OpenClaw for execution`,
      metadata: JSON.stringify({ runId, agent: agentName }),
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      taskId,
      runId,
      message: 'Task sent to OpenClaw for execution'
    });

  } catch (error) {
    console.error('Execute task error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== OPENCLAW STATS & SETTINGS ==========

// Get OpenClaw stats (version, agents, health)
app.get('/api/openclaw/stats', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get default connection
    const [connection] = await db
      .select()
      .from(schema.openclawConnections)
      .where(and(eq(schema.openclawConnections.isDefault, true), eq(schema.openclawConnections.userId, user.userId)))
      .limit(1);

    if (!connection) {
      return c.json({
        connected: false,
        message: 'No OpenClaw connection configured',
        stats: null
      });
    }

    // Try to fetch stats from OpenClaw
    const baseUrl = connection.url.replace(/\/$/, '');
    const stats: {
      connected: boolean;
      version?: string;
      uptime?: string;
      agents?: number;
      message?: string;
      lastError?: string;
    } = {
      connected: false
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Try health endpoint first
      const healthResponse = await fetch(`${baseUrl}/health`, {
        headers: connection.apiKey ? { 'Authorization': `Bearer ${connection.apiKey}` } : {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (healthResponse.ok) {
        const health = await healthResponse.json().catch(() => ({})) as { version?: string; uptime?: string };
        stats.connected = true;
        stats.version = health.version || 'unknown';
        stats.uptime = health.uptime;
      }

      // Try to get agent count
      try {
        const agentsResponse = await fetch(`${baseUrl}/api/agents`, {
          headers: connection.apiKey ? { 'Authorization': `Bearer ${connection.apiKey}` } : {},
        });
        if (agentsResponse.ok) {
          const agents = await agentsResponse.json().catch(() => []);
          stats.agents = Array.isArray(agents) ? agents.length : 0;
        }
      } catch {
        // Ignore agent count errors
      }

      stats.message = 'Connected to OpenClaw';

    } catch (error) {
      stats.connected = false;
      stats.message = 'Failed to connect to OpenClaw';
      stats.lastError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Get our local stats
    const [taskStats] = await db
      .select({
        total: sql<number>`count(*)`,
        inProgress: sql<number>`sum(case when status = 'in_progress' then 1 else 0 end)`,
        completed: sql<number>`sum(case when status = 'done' then 1 else 0 end)`,
        fromOpenClaw: sql<number>`sum(case when openclaw_run_id is not null then 1 else 0 end)`
      })
      .from(schema.tasks)
      .where(eq(schema.tasks.userId, user.userId));

    return c.json({
      connection: {
        id: connection.id,
        name: connection.name,
        url: connection.url,
        mode: connection.mode,
        lastSyncAt: connection.lastSyncAt,
        syncStatus: connection.syncStatus,
      },
      openclaw: stats,
      tasks: {
        total: taskStats?.total || 0,
        inProgress: taskStats?.inProgress || 0,
        completed: taskStats?.completed || 0,
        fromOpenClaw: taskStats?.fromOpenClaw || 0,
      }
    });

  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Test OpenClaw connection
app.post('/api/openclaw/test', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { url, apiKey } = body;

  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }

  try {
    const baseUrl = url.replace(/\/$/, '');
    const results: {
      success: boolean;
      checks: Array<{ name: string; success: boolean; message: string }>;
      version?: string;
      agents?: number;
    } = {
      success: false,
      checks: []
    };

    // Test 1: Basic connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/health`, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const health = await response.json().catch(() => ({})) as { version?: string };
        results.checks.push({
          name: 'Health Endpoint',
          success: true,
          message: `OK${health.version ? ` (version: ${health.version})` : ''}`
        });
        results.version = health.version;
        results.success = true;
      } else {
        results.checks.push({
          name: 'Health Endpoint',
          success: false,
          message: `HTTP ${response.status}`
        });
      }
    } catch (error) {
      results.checks.push({
        name: 'Health Endpoint',
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      });
    }

    // Test 2: Agents endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/api/agents`, {
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const agents = await response.json().catch(() => []);
        const agentCount = Array.isArray(agents) ? agents.length : 0;
        results.checks.push({
          name: 'Agents API',
          success: true,
          message: `${agentCount} agents found`
        });
        results.agents = agentCount;
        results.success = true;
      } else {
        results.checks.push({
          name: 'Agents API',
          success: false,
          message: `HTTP ${response.status}`
        });
      }
    } catch (error) {
      results.checks.push({
        name: 'Agents API',
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      });
    }

    // Test 3: Webhook readiness
    results.checks.push({
      name: 'Webhook Integration',
      success: true,
      message: 'Ready to receive events'
    });

    return c.json(results);

  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: []
    }, 500);
  }
});

// Save OpenClaw connection settings
app.post('/api/openclaw/connection', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  const { name, url, apiKey, mode = 'external', isDefault = false } = body;

  if (!name || !url) {
    return c.json({ error: 'Name and URL are required' }, 400);
  }

  try {
    const now = new Date().toISOString();
    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.update(schema.openclawConnections)
        .set({ isDefault: false })
        .where(and(eq(schema.openclawConnections.isDefault, true), eq(schema.openclawConnections.userId, user.userId)));
    }

    await db.insert(schema.openclawConnections).values({
      id,
      userId: user.userId, // Link to user
      name,
      url: url.replace(/\/$/, ''),
      apiKey: apiKey || null,
      mode,
      isDefault: isDefault ? true : false,
      createdAt: now,
      updatedAt: now,
    });

    return c.json({
      success: true,
      connection: {
        id,
        name,
        url,
        mode,
        isDefault
      }
    }, 201);

  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Update OpenClaw connection
app.patch('/api/openclaw/connection/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    const now = new Date().toISOString();

    // Verify ownership
    const [existing] = await db
      .select()
      .from(schema.openclawConnections)
      .where(and(eq(schema.openclawConnections.id, id), eq(schema.openclawConnections.userId, user.userId)));

    if (!existing) {
      return c.json({ error: 'Connection not found' }, 404);
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await db.update(schema.openclawConnections)
        .set({ isDefault: false })
        .where(and(eq(schema.openclawConnections.isDefault, true), eq(schema.openclawConnections.userId, user.userId)));
    }

    await db.update(schema.openclawConnections)
      .set({
        ...body,
        updatedAt: now,
      })
      .where(and(eq(schema.openclawConnections.id, id), eq(schema.openclawConnections.userId, user.userId)));

    const [connection] = await db
      .select()
      .from(schema.openclawConnections)
      .where(and(eq(schema.openclawConnections.id, id), eq(schema.openclawConnections.userId, user.userId)));

    return c.json({
      success: true,
      connection
    });

  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get OpenClaw connections
app.get('/api/openclaw/connections', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const connections = await db
      .select({
        id: schema.openclawConnections.id,
        name: schema.openclawConnections.name,
        url: schema.openclawConnections.url,
        mode: schema.openclawConnections.mode,
        isDefault: schema.openclawConnections.isDefault,
        lastSyncAt: schema.openclawConnections.lastSyncAt,
        syncStatus: schema.openclawConnections.syncStatus,
        createdAt: schema.openclawConnections.createdAt,
      })
      .from(schema.openclawConnections)
      .where(eq(schema.openclawConnections.userId, user.userId))
      .orderBy(schema.openclawConnections.createdAt);

    return c.json({ connections });

  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Delete OpenClaw connection
app.delete('/api/openclaw/connection/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const id = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // try block continues...

  try {
    await db.delete(schema.openclawConnections)
      .where(and(eq(schema.openclawConnections.id, id), eq(schema.openclawConnections.userId, user.userId)));

    return c.json({ success: true });

  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== WORKSPACE API ==========

import {
  getUserWorkspaces,
  getWorkspaceBySlug,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateMemberRole,
  setUserCurrentWorkspace,
  getUserCurrentWorkspace,
  hasWorkspacePermission,
} from './services/workspaces';

import {
  getWorkspaceTracks,
  getTrackById,
  createTrack,
  updateTrack,
  deleteTrack,
  updateTrackProgress,
  getTrackStats,
  addTrackTime,
  addTrackUsage,
} from './services/tracks';

// Get all workspaces for current user
app.get('/api/workspaces', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const workspaces = await getUserWorkspaces(db, user.userId);
    const currentWorkspace = await getUserCurrentWorkspace(db, user.userId);

    return c.json({
      workspaces,
      currentWorkspace,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get workspace by slug
app.get('/api/workspaces/:slug', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const slug = c.req.param('slug');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const result = await getWorkspaceBySlug(db, user.userId, slug);

    if (!result) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    return c.json({
      workspace: result.workspace,
      memberRole: result.memberRole,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Create new workspace
app.post('/api/workspaces', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!body.name || !body.slug) {
    return c.json({ error: 'Name and slug are required' }, 400);
  }

  try {
    const workspace = await createWorkspace(db, user.userId, {
      name: body.name,
      slug: body.slug,
      description: body.description,
      gatewayUrl: body.gatewayUrl,
      gatewayToken: body.gatewayToken,
      avatar: body.avatar,
      color: body.color,
    });

    return c.json({ success: true, workspace }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Update workspace
app.patch('/api/workspaces/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.param('id');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Check user has permission to update
    const result = await getWorkspaceById(db, user.userId, workspaceId);

    if (!result) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    if (!hasWorkspacePermission(result.memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const workspace = await updateWorkspace(db, workspaceId, body);

    return c.json({ success: true, workspace });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Delete workspace
app.delete('/api/workspaces/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Check user has permission to delete (owner only)
    const result = await getWorkspaceById(db, user.userId, workspaceId);

    if (!result) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    if (result.memberRole !== 'owner') {
      return c.json({ error: 'Only workspace owner can delete' }, 403);
    }

    await deleteWorkspace(db, workspaceId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Set current workspace
app.post('/api/workspaces/:id/set-current', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Verify user has access to workspace
    const result = await getWorkspaceById(db, user.userId, workspaceId);

    if (!result) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    await setUserCurrentWorkspace(db, user.userId, workspaceId);

    return c.json({ success: true, workspace: result.workspace });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get workspace members
app.get('/api/workspaces/:id/members', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Verify user has access to workspace
    const result = await getWorkspaceById(db, user.userId, workspaceId);

    if (!result) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    const members = await getWorkspaceMembers(db, workspaceId);

    return c.json({ members });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Invite member to workspace
app.post('/api/workspaces/:id/members', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.param('id');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!body.userId) {
    return c.json({ error: 'User ID is required' }, 400);
  }

  try {
    // Check user has permission to invite (admin or owner)
    const result = await getWorkspaceById(db, user.userId, workspaceId);

    if (!result) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    if (!hasWorkspacePermission(result.memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const member = await inviteWorkspaceMember(
      db,
      workspaceId,
      user.userId,
      body.userId,
      body.role || 'member'
    );

    return c.json({ success: true, member }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Remove member from workspace
app.delete('/api/workspaces/:id/members/:userId', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.param('id');
  const memberUserId = c.req.param('userId');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Check user has permission to remove (admin or owner, or self)
    const result = await getWorkspaceById(db, user.userId, workspaceId);

    if (!result) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    // Allow self-removal or admin+ removal
    if (memberUserId !== user.userId && !hasWorkspacePermission(result.memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    await removeWorkspaceMember(db, workspaceId, memberUserId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Update member role
app.patch('/api/workspaces/:id/members/:userId/role', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.param('id');
  const memberUserId = c.req.param('userId');
  const body = await c.req.json();

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!body.role) {
    return c.json({ error: 'Role is required' }, 400);
  }

  try {
    // Check user has permission to update roles (admin or owner)
    const result = await getWorkspaceById(db, user.userId, workspaceId);

    if (!result) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    // Only owner can change owner role
    if (body.role === 'owner' && result.memberRole !== 'owner') {
      return c.json({ error: 'Only owner can transfer ownership' }, 403);
    }

    if (!hasWorkspacePermission(result.memberRole, 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    await updateMemberRole(db, workspaceId, memberUserId, body.role);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== TRACKS API ==========

// ========== PROJECTS API (Backward Compatibility) ==========
// Legacy frontend paths still call /api/projects first.
// Keep these aliases mapped to tracks to avoid noisy 404 fallbacks.

app.get('/api/projects', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');
  const status = c.req.query('status');
  const category = c.req.query('category');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found or access denied' }, 404);

    const projects = await getWorkspaceTracks(db, workspaceId, { status, category });
    return c.json({ projects });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/projects/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const projectId = c.req.param('id');
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found or access denied' }, 404);

    const project = await getTrackById(db, projectId, workspaceId);
    if (!project) return c.json({ error: 'Project not found' }, 404);

    return c.json(project);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/projects', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!body.workspaceId || !body.name) return c.json({ error: 'Workspace ID and name are required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, body.workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found or access denied' }, 404);
    if (!hasWorkspacePermission(workspace.memberRole, 'member')) return c.json({ error: 'Insufficient permissions' }, 403);

    const project = await createTrack(db, body.workspaceId, user.userId, {
      name: body.name,
      slug: body.slug,
      description: body.description,
      category: body.category,
      priority: body.priority,
      dueDate: body.dueDate,
      agentIds: body.agentIds,
      tags: body.tags,
      estimatedTokens: body.estimatedTokens,
      estimatedCost: body.estimatedCost,
    });

    return c.json(project, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.patch('/api/projects/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const projectId = c.req.param('id');
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!body.workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, body.workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found or access denied' }, 404);
    if (!hasWorkspacePermission(workspace.memberRole, 'member')) return c.json({ error: 'Insufficient permissions' }, 403);

    const project = await updateTrack(db, projectId, body.workspaceId, body);
    return c.json(project);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.delete('/api/projects/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const projectId = c.req.param('id');
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found or access denied' }, 404);
    if (!hasWorkspacePermission(workspace.memberRole, 'admin')) return c.json({ error: 'Insufficient permissions' }, 403);

    await deleteTrack(db, projectId, workspaceId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/projects/stats/dashboard', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found or access denied' }, 404);

    const stats = await getTrackStats(db, workspaceId);
    return c.json(stats);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== SESSIONS API ==========

import {
  getActiveSessions,
  getWorkspaceSessions,
  getSessionWithLogs,
  createSession,
  updateSession,
  addSessionLog,
  getSessionStats,
  getTodayTokenUsage,
} from './services/sessions';

// Get active sessions
app.get('/api/sessions/active', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const sessions = await getActiveSessions(db, workspaceId);
    return c.json({ sessions });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get all sessions
app.get('/api/sessions', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');
  const status = c.req.query('status');
  const agentId = c.req.query('agentId');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const sessions = await getWorkspaceSessions(db, workspaceId, { status, agentId, limit, offset });
    return c.json({ sessions });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get session by ID with logs
app.get('/api/sessions/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const sessionId = c.req.param('id');
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const result = await getSessionWithLogs(db, sessionId, workspaceId);
    if (!result) return c.json({ error: 'Session not found' }, 404);

    return c.json(result);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Create new session
app.post('/api/sessions', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!body.workspaceId || !body.agentId) return c.json({ error: 'Workspace ID and Agent ID are required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, body.workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    if (!hasWorkspacePermission(workspace.memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const session = await createSession(db, body.workspaceId, {
      agentId: body.agentId,
      taskId: body.taskId,
      trackId: body.trackId,
    });

    return c.json({ success: true, session }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Update session
app.patch('/api/sessions/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const sessionId = c.req.param('id');
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!body.workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, body.workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const session = await updateSession(db, sessionId, body.workspaceId, body);
    return c.json({ success: true, session });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Add session log
app.post('/api/sessions/:id/logs', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const sessionId = c.req.param('id');
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const log = await addSessionLog(db, sessionId, body);
    return c.json({ success: true, log }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get session stats
app.get('/api/sessions/stats/dashboard', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const stats = await getSessionStats(db, workspaceId);
    const today = await getTodayTokenUsage(db, workspaceId);

    return c.json({ ...stats, today });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ========== DEVLOGS API ==========

import {
  getWorkspaceDevlogs,
  getDevlogById,
  createDevlog,
  updateDevlog,
  deleteDevlog,
  getDevlogStats,
  getTodayDevlogs,
  generateDevlogFromSession,
} from './services/devlogs';

// Get all devlogs
app.get('/api/devlogs', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');
  const trackId = c.req.query('trackId');
  const agentId = c.req.query('agentId');
  const category = c.req.query('category');
  const isMilestone = c.req.query('isMilestone');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const devlogs = await getWorkspaceDevlogs(db, workspaceId, {
      trackId,
      agentId,
      category,
      limit,
      offset,
      isMilestone: isMilestone === 'true' ? true : isMilestone === 'false' ? false : undefined,
    });

    return c.json({ devlogs });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get devlog by ID
app.get('/api/devlogs/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const devlogId = c.req.param('id');
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const devlog = await getDevlogById(db, devlogId, workspaceId);
    if (!devlog) return c.json({ error: 'Devlog not found' }, 404);

    return c.json(devlog);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Create new devlog
app.post('/api/devlogs', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!body.workspaceId || !body.title || !body.content) {
    return c.json({ error: 'Workspace ID, title, and content are required' }, 400);
  }

  try {
    const workspace = await getWorkspaceById(db, user.userId, body.workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    if (!hasWorkspacePermission(workspace.memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const devlog = await createDevlog(db, body.workspaceId, user.userId, body);

    // Log activity
    await db.insert(schema.activities).values({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'devlog_created',
      workspaceId: body.workspaceId,
      userId: user.userId,
      content: `Devlog "${devlog.title}" created`,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true, devlog }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Update devlog
app.patch('/api/devlogs/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const devlogId = c.req.param('id');
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!body.workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, body.workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const devlog = await updateDevlog(db, devlogId, body.workspaceId, body);
    return c.json({ success: true, devlog });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Delete devlog
app.delete('/api/devlogs/:id', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const devlogId = c.req.param('id');
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    if (!hasWorkspacePermission(workspace.memberRole, 'member')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    await deleteDevlog(db, devlogId, workspaceId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get devlog stats
app.get('/api/devlogs/stats/dashboard', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const stats = await getDevlogStats(db, workspaceId);
    return c.json(stats);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Get today's devlogs
app.get('/api/devlogs/today', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const workspaceId = c.req.query('workspaceId');
  const limit = parseInt(c.req.query('limit') || '10');

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!workspaceId) return c.json({ error: 'Workspace ID is required' }, 400);

  try {
    const workspace = await getWorkspaceById(db, user.userId, workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const devlogs = await getTodayDevlogs(db, workspaceId, limit);
    return c.json({ devlogs });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Generate devlog from session
app.post('/api/devlogs/generate-from-session', async (c) => {
  const db = getDb(c.env);
  const user = await getUserFromToken(c);
  const body = await c.req.json();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!body.workspaceId || !body.sessionId) {
    return c.json({ error: 'Workspace ID and Session ID are required' }, 400);
  }

  try {
    const workspace = await getWorkspaceById(db, user.userId, body.workspaceId);
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);

    const devlog = await generateDevlogFromSession(db, body.workspaceId, user.userId, body.sessionId);
    if (!devlog) return c.json({ error: 'Failed to generate devlog' }, 500);

    return c.json({ success: true, devlog }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Export for Cloudflare Workers
export default app;


import { sqliteTable, text, integer, primaryKey, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table for SaaS multi-tenancy - MUST BE FIRST (referenced by workspaces)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  role: text('role').default('user'),
  loginMethod: text('login_method').default('google'),
  isDemo: integer('is_demo', { mode: 'boolean' }).default(false),
  currentWorkspaceId: text('current_workspace_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Workspaces table for multi-workspace support
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }),
  gatewayUrl: text('gateway_url'),
  gatewayToken: text('gateway_token'),
  settings: text('settings').default('{"defaultModel":"claude-3-opus","maxAgents":10,"maxTasks":100,"retentionDays":30}'),
  tier: text('tier').default('free'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  avatar: text('avatar'),
  color: text('color').default('#3b82f6'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Workspace members table for access control
export const workspaceMembers = sqliteTable('workspace_members', {
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('member'),
  joinedAt: text('joined_at').default(sql`CURRENT_TIMESTAMP`),
  invitedBy: text('invited_by').references(() => users.id, { onDelete: 'set null' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
}));

// Tracks/Projects table
export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug'),
  description: text('description'),
  category: text('category').default('feature'),
  status: text('status').default('active'),
  progress: integer('progress').default(0),
  priority: text('priority').default('medium'),
  totalTasks: integer('total_tasks').default(0),
  completedTasks: integer('completed_tasks').default(0),
  estimatedTokens: integer('estimated_tokens').default(0),
  usedTokens: integer('used_tokens').default(0),
  estimatedCost: real('estimated_cost').default(0),
  actualCost: real('actual_cost').default(0),
  timeSpent: integer('time_spent').default(0),
  agentIds: text('agent_ids').default('[]'),
  tags: text('tags').default('[]'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  dueDate: text('due_date'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Agents table (workspace-scoped)
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  slug: text('slug'),
  avatar: text('avatar').default('🤖'),
  role: text('role').default('Agent'),
  level: text('level').default('intern'),
  status: text('status').default('idle'),
  model: text('model').default('claude-3-opus'),
  description: text('description'),
  lastHeartbeat: text('last_heartbeat'),
  sessionKey: text('session_key'),
  currentTaskId: text('current_task_id'),
  toolsEnabled: text('tools_enabled').default('[]'),
  skills: integer('skills').default(0),
  wakeupConfig: text('wakeup_config').default('{"method":"poll","intervalMs":900000}'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Tasks table (workspace-scoped and linked to tracks)
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  trackId: text('track_id').references(() => tracks.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('inbox'),
  priority: text('priority').default('medium'),
  creatorId: text('creator_id').default('system'),
  tags: text('tags').default('[]'),
  category: text('category'),
  dueDate: text('due_date'),
  scheduledDate: text('scheduled_date'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  sessionKey: text('session_key'),
  openclawRunId: text('openclaw_run_id'),
  usedCodingTools: integer('used_coding_tools', { mode: 'boolean' }).default(false),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  estimatedCost: real('estimated_cost').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Task assignees (many-to-many)
export const taskAssignees = sqliteTable('task_assignees', {
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  assignedAt: text('assigned_at').default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.agentId] }),
}));

// Comments table
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull(),
  authorType: text('author_type').default('user'),
  content: text('content').notNull(),
  mentions: text('mentions').default('[]'),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
  editedAt: text('edited_at'),
});

// Activities table
export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  trackId: text('track_id').references(() => tracks.id, { onDelete: 'set null' }),
  userId: text('user_id'),
  content: text('content').notNull(),
  metadata: text('metadata').default('{}'),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

// Devlogs table
export const devlogs = sqliteTable('devlogs', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  trackId: text('track_id').references(() => tracks.id, { onDelete: 'set null' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').default('implementation'),
  filesChanged: text('files_changed').default('[]'),
  linesAdded: integer('lines_added').default(0),
  linesRemoved: integer('lines_removed').default(0),
  tokensUsed: integer('tokens_used').default(0),
  sessionDuration: integer('session_duration').default(0),
  isMilestone: integer('is_milestone', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Enhanced Sessions table
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  trackId: text('track_id').references(() => tracks.id, { onDelete: 'set null' }),
  status: text('status').default('active'),
  messages: integer('messages').default(0),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  cost: real('cost').default(0),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  endedAt: text('ended_at'),
  lastActivityAt: text('last_activity_at').default(sql`CURRENT_TIMESTAMP`),
  duration: integer('duration').default(0),
});

// Session logs
export const sessionLogs = sqliteTable('session_logs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  content: text('content').notNull(),
  metadata: text('metadata').default('{}'),
  tokensIn: integer('tokens_in').default(0),
  tokensOut: integer('tokens_out').default(0),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

// OpenClaw connections
export const openclawConnections = sqliteTable('openclaw_connections', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  apiKey: text('api_key'),
  mode: text('mode').default('external'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  lastSyncAt: text('last_sync_at'),
  syncStatus: text('sync_status').default('idle'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Settings table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// User Channel Integrations
export const userChannels = sqliteTable('user_channels', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  channelType: text('channel_type').notNull(),
  name: text('name').notNull(),
  config: text('config').default('{}'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
  status: text('status').default('disconnected'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Agent Files table
export const agentFiles = sqliteTable('agent_files', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  content: text('content').notNull().default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Messages table
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  type: text('type').default('comment'),
  source: text('source'),
  attachments: text('attachments').default('[]'),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
});

// Documents table
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  type: text('type').notNull(),
  path: text('path'),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'set null' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Installed skills table
export const installedSkills = sqliteTable('installed_skills', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  author: text('author'),
  description: text('description'),
  category: text('category'),
  source: text('source').default('clawhub'),
  config: text('config').default('{}'),
  isEnabled: integer('is_enabled').default(1),
  securityStatus: text('security_status').default('pending'),
  installDate: text('install_date').default(sql`CURRENT_TIMESTAMP`),
  lastUsed: text('last_used'),
});

// Git integrations table
export const gitIntegrations = sqliteTable('git_integrations', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  repository: text('repository').notNull(),
  branch: text('branch').default('main'),
  accessToken: text('access_token'),
  webhookSecret: text('webhook_secret'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Git commits table
export const gitCommits = sqliteTable('git_commits', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  integrationId: text('integration_id').references(() => gitIntegrations.id, { onDelete: 'cascade' }),
  trackId: text('track_id').references(() => tracks.id, { onDelete: 'set null' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  sha: text('sha').notNull(),
  message: text('message').notNull(),
  author: text('author').notNull(),
  filesChanged: text('files_changed').default('[]'),
  linesAdded: integer('lines_added').default(0),
  linesRemoved: integer('lines_removed').default(0),
  committedAt: text('committed_at').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Token usage analytics table
export const tokenUsage = sqliteTable('token_usage', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  trackId: text('track_id').references(() => tracks.id, { onDelete: 'set null' }),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  cost: real('cost').default(0),
  date: text('date').notNull(),
  hour: integer('hour'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Config builder templates table
export const configTemplates = sqliteTable('config_templates', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  goal: text('goal').notNull(),
  category: text('category').notNull(),
  templateType: text('template_type').default('assistant'),
  channels: text('channels').default('[]'),
  providers: text('providers').default('[]'),
  tags: text('tags').default('[]'),
  baseConfigJson: text('base_config_json').notNull(),
  defaultOptionsJson: text('default_options_json').default('{}'),
  schemaJson: text('schema_json').default('{}'),
  isOfficial: integer('is_official', { mode: 'boolean' }).default(false),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(true),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Config builder saved setups table
export const configSetups = sqliteTable('config_setups', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug'),
  sourceMode: text('source_mode').notNull(),
  templateId: text('template_id').references(() => configTemplates.id, { onDelete: 'set null' }),
  optionsJson: text('options_json').default('{}'),
  configJson: text('config_json').notNull(),
  summary: text('summary'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  downloads: integer('downloads').default(0),
  lastDownloadedAt: text('last_downloaded_at'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Config setup versions table
export const configSetupVersions = sqliteTable('config_setup_versions', {
  id: text('id').primaryKey(),
  setupId: text('setup_id').references(() => configSetups.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  configJson: text('config_json').notNull(),
  optionsJson: text('options_json').default('{}'),
  createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionLog = typeof sessionLogs.$inferSelect;
export type NewSessionLog = typeof sessionLogs.$inferInsert;
export type Devlog = typeof devlogs.$inferSelect;
export type NewDevlog = typeof devlogs.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type OpenClawConnection = typeof openclawConnections.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type UserChannel = typeof userChannels.$inferSelect;
export type NewUserChannel = typeof userChannels.$inferInsert;
export type AgentFile = typeof agentFiles.$inferSelect;
export type NewAgentFile = typeof agentFiles.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type InstalledSkill = typeof installedSkills.$inferSelect;
export type NewInstalledSkill = typeof installedSkills.$inferInsert;
export type GitIntegration = typeof gitIntegrations.$inferSelect;
export type NewGitIntegration = typeof gitIntegrations.$inferInsert;
export type GitCommit = typeof gitCommits.$inferSelect;
export type NewGitCommit = typeof gitCommits.$inferInsert;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;
export type ConfigTemplate = typeof configTemplates.$inferSelect;
export type NewConfigTemplate = typeof configTemplates.$inferInsert;
export type ConfigSetup = typeof configSetups.$inferSelect;
export type NewConfigSetup = typeof configSetups.$inferInsert;
export type ConfigSetupVersion = typeof configSetupVersions.$inferSelect;
export type NewConfigSetupVersion = typeof configSetupVersions.$inferInsert;

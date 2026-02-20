-- Complete Clawpute Schema
-- Generated: 2026-02-10
-- Version: Advanced Command Center

PRAGMA defer_foreign_keys=TRUE;

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  login_method TEXT DEFAULT 'google',
  is_demo INTEGER DEFAULT 0,
  current_workspace_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Workspaces table (Multi-tenancy)
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  gateway_url TEXT,
  gateway_token TEXT,
  settings TEXT DEFAULT '{"defaultModel":"claude-3-opus","maxAgents":10,"maxTasks":100,"retentionDays":30}',
  tier TEXT DEFAULT 'free',
  is_default INTEGER DEFAULT 0,
  avatar TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Workspace members (Access control)
CREATE TABLE workspace_members (
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TEXT DEFAULT (datetime('now')),
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (workspace_id, user_id)
);

-- ============================================
-- TRACKS (PROJECTS)
-- ============================================

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  category TEXT DEFAULT 'feature',
  status TEXT DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  estimated_tokens INTEGER DEFAULT 0,
  used_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  actual_cost REAL DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  agent_ids TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  started_at TEXT,
  completed_at TEXT,
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- AGENTS
-- ============================================

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  avatar TEXT DEFAULT '🤖',
  role TEXT DEFAULT 'Agent',
  level TEXT DEFAULT 'intern',
  status TEXT DEFAULT 'idle',
  model TEXT DEFAULT 'claude-3-opus',
  description TEXT,
  last_heartbeat TEXT,
  session_key TEXT,
  current_task_id TEXT,
  tools_enabled TEXT DEFAULT '[]',
  skills INTEGER DEFAULT 0,
  wakeup_config TEXT DEFAULT '{"method":"poll","intervalMs":900000}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox',
  priority TEXT DEFAULT 'medium',
  creator_id TEXT DEFAULT 'system',
  tags TEXT DEFAULT '[]',
  category TEXT,
  due_date TEXT,
  scheduled_date TEXT,
  started_at TEXT,
  completed_at TEXT,
  external_id TEXT,
  external_url TEXT,
  session_key TEXT,
  openclaw_run_id TEXT,
  used_coding_tools INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Task assignees (many-to-many)
CREATE TABLE task_assignees (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, agent_id)
);

-- ============================================
-- SESSIONS (Enhanced with token tracking)
-- ============================================

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  messages INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  last_activity_at TEXT DEFAULT (datetime('now')),
  duration INTEGER DEFAULT 0
);

-- Session logs for real-time monitoring
CREATE TABLE session_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  timestamp TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- DEVLOGS (Development activity tracking)
-- ============================================

CREATE TABLE devlogs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'implementation',
  files_changed TEXT DEFAULT '[]',
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0,
  is_milestone INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- ACTIVITIES
-- ============================================

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
  user_id TEXT,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  timestamp TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- COMMENTS
-- ============================================

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_type TEXT DEFAULT 'user',
  content TEXT NOT NULL,
  mentions TEXT DEFAULT '[]',
  timestamp TEXT DEFAULT (datetime('now')),
  edited_at TEXT
);

-- ============================================
-- MESSAGES
-- ============================================

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'comment',
  source TEXT,
  attachments TEXT DEFAULT '[]',
  timestamp TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL,
  path TEXT,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- AGENT FILES
-- ============================================

CREATE TABLE agent_files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(agent_id, filename)
);

-- ============================================
-- USER CHANNELS
-- ============================================

CREATE TABLE user_channels (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  name TEXT NOT NULL,
  config TEXT DEFAULT '{}',
  is_enabled INTEGER DEFAULT 1,
  status TEXT DEFAULT 'disconnected',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- OPENCLAW CONNECTIONS
-- ============================================

CREATE TABLE openclaw_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_key TEXT,
  mode TEXT DEFAULT 'external',
  is_default INTEGER DEFAULT 0,
  last_sync_at TEXT,
  sync_status TEXT DEFAULT 'idle',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SETTINGS
-- ============================================

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INSTALLED SKILLS
-- ============================================

CREATE TABLE installed_skills (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  author TEXT,
  description TEXT,
  category TEXT,
  source TEXT DEFAULT 'clawhub',
  config TEXT DEFAULT '{}',
  is_enabled INTEGER DEFAULT 1,
  security_status TEXT DEFAULT 'pending',
  install_date TEXT DEFAULT (datetime('now')),
  last_used TEXT
);

-- ============================================
-- GIT INTEGRATIONS (Future Feature)
-- ============================================

CREATE TABLE git_integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  repository TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  access_token TEXT,
  webhook_secret TEXT,
  is_enabled INTEGER DEFAULT 1,
  last_sync_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Git commits tracking
CREATE TABLE git_commits (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id TEXT REFERENCES git_integrations(id) ON DELETE CASCADE,
  track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author TEXT NOT NULL,
  files_changed TEXT DEFAULT '[]',
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  committed_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- TOKEN USAGE ANALYTICS (Future Feature)
-- ============================================

CREATE TABLE token_usage (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  date TEXT NOT NULL,
  hour INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_current_workspace ON users(current_workspace_id);

-- Workspaces
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- Workspace members
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Tracks
CREATE INDEX idx_tracks_workspace ON tracks(workspace_id);
CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_tracks_user ON tracks(user_id);

-- Agents
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_parent_id ON agents(parent_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_level ON agents(level);

-- Tasks
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_track ON tasks(track_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_openclaw_run_id ON tasks(openclaw_run_id);
CREATE INDEX idx_tasks_session_key ON tasks(session_key);

-- Task assignees
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_agent ON task_assignees(agent_id);

-- Sessions
CREATE INDEX idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX idx_sessions_agent ON sessions(agent_id);
CREATE INDEX idx_sessions_task ON sessions(task_id);
CREATE INDEX idx_sessions_track ON sessions(track_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Session logs
CREATE INDEX idx_session_logs_session ON session_logs(session_id);
CREATE INDEX idx_session_logs_timestamp ON session_logs(timestamp);

-- Devlogs
CREATE INDEX idx_devlogs_workspace ON devlogs(workspace_id);
CREATE INDEX idx_devlogs_track ON devlogs(track_id);
CREATE INDEX idx_devlogs_agent ON devlogs(agent_id);
CREATE INDEX idx_devlogs_created ON devlogs(created_at);

-- Activities
CREATE INDEX idx_activities_workspace ON activities(workspace_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_agent_id ON activities(agent_id);
CREATE INDEX idx_activities_task_id ON activities(task_id);
CREATE INDEX idx_activities_track_id ON activities(track_id);
CREATE INDEX idx_activities_timestamp ON activities(timestamp);

-- Comments
CREATE INDEX idx_comments_workspace ON comments(workspace_id);
CREATE INDEX idx_comments_task_id ON comments(task_id);

-- Messages
CREATE INDEX idx_messages_workspace ON messages(workspace_id);
CREATE INDEX idx_messages_task_id ON messages(task_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Documents
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_task_id ON documents(task_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Agent files
CREATE INDEX idx_agent_files_workspace ON agent_files(workspace_id);
CREATE INDEX idx_agent_files_agent_id ON agent_files(agent_id);
CREATE INDEX idx_agent_files_user_id ON agent_files(user_id);

-- User channels
CREATE INDEX idx_user_channels_workspace ON user_channels(workspace_id);
CREATE INDEX idx_user_channels_user_id ON user_channels(user_id);

-- OpenClaw connections
CREATE INDEX idx_openclaw_connections_workspace ON openclaw_connections(workspace_id);
CREATE INDEX idx_openclaw_connections_user_id ON openclaw_connections(user_id);

-- Settings
CREATE INDEX idx_settings_workspace ON settings(workspace_id);

-- Installed skills
CREATE INDEX idx_installed_skills_workspace ON installed_skills(workspace_id);
CREATE INDEX idx_installed_skills_user_id ON installed_skills(user_id);
CREATE INDEX idx_installed_skills_skill_id ON installed_skills(skill_id);
CREATE INDEX idx_installed_skills_category ON installed_skills(category);
CREATE INDEX idx_installed_skills_install_date ON installed_skills(install_date);

-- Git integrations
CREATE INDEX idx_git_integrations_workspace ON git_integrations(workspace_id);

-- Git commits
CREATE INDEX idx_git_commits_workspace ON git_commits(workspace_id);
CREATE INDEX idx_git_commits_track ON git_commits(track_id);
CREATE INDEX idx_git_commits_sha ON git_commits(sha);

-- Token usage
CREATE INDEX idx_token_usage_workspace ON token_usage(workspace_id);
CREATE INDEX idx_token_usage_date ON token_usage(date);
CREATE INDEX idx_token_usage_agent ON token_usage(agent_id);

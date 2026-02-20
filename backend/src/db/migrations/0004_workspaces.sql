-- Migration: Add workspace support and advanced command center tables
-- Created: 2026-02-10

-- ============================================
-- WORKSPACES
-- ============================================

CREATE TABLE IF NOT EXISTS workspaces (
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);

-- ============================================
-- WORKSPACE MEMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- ============================================
-- TRACKS (Projects)
-- ============================================

CREATE TABLE IF NOT EXISTS tracks (
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracks_workspace ON tracks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_user ON tracks(user_id);

-- ============================================
-- UPDATE EXISTING TABLES WITH WORKSPACE_ID
-- ============================================

-- Add workspace_id to users table
ALTER TABLE users ADD COLUMN current_workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to agents table
ALTER TABLE agents ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to tasks table
ALTER TABLE tasks ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN input_tokens INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN output_tokens INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN estimated_cost REAL DEFAULT 0;

-- Add workspace_id to activities table
ALTER TABLE activities ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL;

-- Add workspace_id to sessions table
ALTER TABLE sessions ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN input_tokens INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN output_tokens INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN cost REAL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN ended_at TEXT;
ALTER TABLE sessions ADD COLUMN last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sessions ADD COLUMN duration INTEGER DEFAULT 0;

-- Add workspace_id to comments table
ALTER TABLE comments ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to openclaw_connections table
ALTER TABLE openclaw_connections ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to user_channels table
ALTER TABLE user_channels ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to agent_files table
ALTER TABLE agent_files ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to messages table
ALTER TABLE messages ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to documents table
ALTER TABLE documents ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to settings table
ALTER TABLE settings ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to installed_skills table
ALTER TABLE installed_skills ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================
-- NEW TABLES FOR ADVANCED FEATURES
-- ============================================

-- Session logs for real-time monitoring
CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_logs_session ON session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_timestamp ON session_logs(timestamp);

-- Devlogs table
CREATE TABLE IF NOT EXISTS devlogs (
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devlogs_workspace ON devlogs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_devlogs_track ON devlogs(track_id);
CREATE INDEX IF NOT EXISTS idx_devlogs_created ON devlogs(created_at);

-- Git integrations
CREATE TABLE IF NOT EXISTS git_integrations (
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_git_integrations_workspace ON git_integrations(workspace_id);

-- Git commits
CREATE TABLE IF NOT EXISTS git_commits (
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_git_commits_workspace ON git_commits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_track ON git_commits(track_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_sha ON git_commits(sha);

-- Token usage analytics
CREATE TABLE IF NOT EXISTS token_usage (
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_usage_workspace ON token_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(date);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent ON token_usage(agent_id);

-- ============================================
-- UPDATE EXISTING INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_track ON tasks(track_id);
CREATE INDEX IF NOT EXISTS idx_activities_workspace ON activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id);

-- ============================================
-- DEFAULT WORKSPACE MIGRATION
-- ============================================

-- Create default workspace for existing users
INSERT INTO workspaces (id, name, slug, owner_id, description, is_default, tier, created_at, updated_at)
SELECT 
  'ws-' || lower(hex(randomblob(16))),
  'Personal Workspace',
  'personal-' || lower(substr(id, 1, 8)),
  id,
  'Your default personal workspace',
  1,
  'free',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM users;

-- Update users with their default workspace
UPDATE users 
SET current_workspace_id = (
  SELECT id FROM workspaces WHERE owner_id = users.id AND is_default = 1 LIMIT 1
);

-- Migrate existing data to default workspace
UPDATE agents 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = agents.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE tasks 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = tasks.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE activities 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = activities.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE sessions 
SET workspace_id = (
  SELECT w.id FROM workspaces w 
  JOIN agents a ON a.id = sessions.agent_id 
  WHERE w.owner_id = a.user_id AND w.is_default = 1 
  LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE comments 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = comments.author_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE openclaw_connections 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = openclaw_connections.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE user_channels 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = user_channels.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE agent_files 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = agent_files.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE messages 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = messages.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE documents 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = documents.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

UPDATE installed_skills 
SET workspace_id = (
  SELECT w.id FROM workspaces w WHERE w.owner_id = installed_skills.user_id AND w.is_default = 1 LIMIT 1
)
WHERE workspace_id IS NULL;

-- Add workspace members for owners
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT id, owner_id, 'owner', CURRENT_TIMESTAMP
FROM workspaces;

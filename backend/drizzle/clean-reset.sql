-- Nuclear option: Reset entire database
-- This deletes EVERYTHING and recreates from scratch

-- Disable foreign keys to avoid constraint errors during drop
PRAGMA foreign_keys = OFF;

-- Get all tables and drop them
DROP TABLE IF EXISTS task_assignees;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS user_channels;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS openclaw_connections;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS sqlite_sequence;

-- Also drop any indexes
DROP INDEX IF EXISTS idx_agents_user_id;
DROP INDEX IF EXISTS idx_agents_parent_id;
DROP INDEX IF EXISTS idx_tasks_user_id;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_activities_user_id;
DROP INDEX IF EXISTS idx_user_channels_user_id;

PRAGMA foreign_keys = ON;

-- Now create fresh schema
-- Users table for SaaS multi-tenancy
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  login_method TEXT DEFAULT 'google',
  is_demo INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Agents table (user-scoped for SaaS)
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT,
  name TEXT NOT NULL,
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (user-scoped for SaaS)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox',
  priority TEXT DEFAULT 'medium',
  creator_id TEXT DEFAULT 'system',
  tags TEXT DEFAULT '[]',
  category TEXT,
  due_date TEXT,
  started_at TEXT,
  completed_at TEXT,
  external_id TEXT,
  external_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Task assignees (many-to-many)
CREATE TABLE task_assignees (
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, agent_id)
);

-- Comments table
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_type TEXT DEFAULT 'user',
  content TEXT NOT NULL,
  mentions TEXT DEFAULT '[]',
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  edited_at TEXT
);

-- Activities table (for activity feed)
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  messages INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- OpenClaw connections table
CREATE TABLE openclaw_connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_key TEXT,
  mode TEXT DEFAULT 'external',
  is_default INTEGER DEFAULT 0,
  last_sync_at TEXT,
  sync_status TEXT DEFAULT 'idle',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User Channel Integrations
CREATE TABLE user_channels (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  name TEXT NOT NULL,
  config TEXT DEFAULT '{}',
  is_enabled INTEGER DEFAULT 1,
  status TEXT DEFAULT 'disconnected',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_parent_id ON agents(parent_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_user_channels_user_id ON user_channels(user_id);

-- Insert default settings
INSERT INTO settings (key, value) VALUES ('version', '2.0.0');
INSERT INTO settings (key, value) VALUES ('install_date', datetime('now'));

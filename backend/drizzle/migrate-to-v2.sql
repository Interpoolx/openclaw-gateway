-- Migration to v2: Add SaaS multi-tenancy support
-- This handles both fresh installs and existing databases

-- For existing databases, we need to drop and recreate tables
-- SQLite doesn't support ALTER TABLE for adding foreign key columns easily

-- Check if we're migrating or fresh install
-- This script DROPS ALL EXISTING DATA - use only in development

PRAGMA foreign_keys = OFF;

-- Drop all existing tables (if they exist)
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

PRAGMA foreign_keys = ON;

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
  parent_id TEXT, -- For sub-agents (references agents.id)
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

-- User Channel Integrations (SaaS - each user has their own channel configs)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_parent_id ON agents(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_channels_user_id ON user_channels(user_id);

-- Insert default settings
INSERT INTO settings (key, value) VALUES ('version', '2.0.0');
INSERT INTO settings (key, value) VALUES ('install_date', datetime('now'));

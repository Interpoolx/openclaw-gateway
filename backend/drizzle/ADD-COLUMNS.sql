-- Add missing columns to existing tables (SQLite compatible)
-- This handles the case where tables exist but are missing columns

-- Add user_id to agents table (if not exists)
ALTER TABLE agents ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Add parent_id to agents table (if not exists)  
ALTER TABLE agents ADD COLUMN parent_id TEXT;

-- Add user_id to tasks table (if not exists)
ALTER TABLE tasks ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to activities table (if not exists)
ALTER TABLE activities ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
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

-- Create user_channels table if not exists
CREATE TABLE IF NOT EXISTS user_channels (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_parent_id ON agents(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_channels_user_id ON user_channels(user_id);

SELECT 'Migration complete - columns added!' as status;

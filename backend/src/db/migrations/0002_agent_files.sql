-- Migration: 0002_agent_files
-- Adds agent_files table structure
-- Run: npx wrangler d1 execute openclaw_admin --local --file=./migrations/0002_agent_files.sql

-- Create agent_files table if not exists
CREATE TABLE IF NOT EXISTS agent_files (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, filename)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_agent_files_agent_id ON agent_files(agent_id);

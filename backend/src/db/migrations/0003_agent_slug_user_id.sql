-- Migration: 0003_agent_slug_user_id
-- Adds slug to agents and user_id to agent_files
-- Run: npx wrangler d1 execute openclaw_admin --local --file=./migrations/0003_agent_slug_user_id.sql

-- Add slug to agents
ALTER TABLE agents ADD COLUMN slug TEXT;

-- Add user_id to agent_files
ALTER TABLE agent_files ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Backfill user_id in agent_files from agents table
UPDATE agent_files 
SET user_id = (SELECT user_id FROM agents WHERE agents.id = agent_files.agent_id);

-- Create index for user_id in agent_files
CREATE INDEX IF NOT EXISTS idx_agent_files_user_id ON agent_files(user_id);

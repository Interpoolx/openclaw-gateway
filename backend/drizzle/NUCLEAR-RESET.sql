-- NUCLEAR RESET - Drop everything one by one
-- Run this if clean-reset.sql doesn't work

-- Drop in correct order (children first, parents last)
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

-- Verify all tables are gone
SELECT 'All tables dropped' as status;

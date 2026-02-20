-- Demo Seed Data - Fixed Version
-- Workspaces
INSERT OR REPLACE INTO workspaces (id, name, slug, description, owner_id, gateway_url, gateway_token, settings, tier, is_default, avatar, color, created_at, updated_at) 
VALUES ('ws-demo-001', 'Starfleet Command', 'starfleet-command', 'Main workspace for Starfleet operations and mission control', '0194f484-98c5-703d-8289-4b219f7e813a', 'ws://localhost:18789', 'demo-token-starfleet', '{"defaultModel":"claude-3-opus","maxAgents":10,"maxTasks":100,"retentionDays":30}', 'pro', 1, '🚀', '#3b82f6', datetime('now'), datetime('now'));

INSERT OR REPLACE INTO workspaces (id, name, slug, description, owner_id, gateway_url, gateway_token, settings, tier, is_default, avatar, color, created_at, updated_at) 
VALUES ('ws-demo-002', 'Personal Projects', 'personal-projects', 'Personal workspace for side projects and experiments', '0194f484-98c5-703d-8289-4b219f7e813a', NULL, NULL, '{"defaultModel":"gpt-4-turbo","maxAgents":5,"maxTasks":50,"retentionDays":30}', 'free', 0, '👤', '#10b981', datetime('now'), datetime('now'));

-- Workspace members
INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role, joined_at, invited_by) 
VALUES ('ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'owner', datetime('now'), NULL);

INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role, joined_at, invited_by) 
VALUES ('ws-demo-001', '0194f484-98c5-7ca5-9856-4b219f7e1234', 'admin', datetime('now'), '0194f484-98c5-703d-8289-4b219f7e813a');

INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role, joined_at, invited_by) 
VALUES ('ws-demo-002', '0194f484-98c5-703d-8289-4b219f7e813a', 'owner', datetime('now'), NULL);

-- Update user current workspace
UPDATE users SET current_workspace_id = 'ws-demo-001' WHERE id = '0194f484-98c5-703d-8289-4b219f7e813a';
UPDATE users SET current_workspace_id = 'ws-demo-001' WHERE id = '0194f484-98c5-7ca5-9856-4b219f7e1234';

-- Clear and re-insert agents with workspace_id
DELETE FROM agents WHERE user_id IN ('0194f484-98c5-703d-8289-4b219f7e813a', '0194f484-98c5-7ca5-9856-4b219f7e1234');

-- Main agents
INSERT INTO agents (id, workspace_id, user_id, name, slug, avatar, role, level, status, model, description, tools_enabled, skills, created_at, updated_at) 
VALUES ('agent-spock-001', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'Spock', 'spock', '🖖', 'Logic & Analysis Specialist', 'lead', 'active', 'claude-3-opus', 'Logical and precise', '["read","write"]', 10, datetime('now'), datetime('now'));

INSERT INTO agents (id, workspace_id, user_id, name, slug, avatar, role, level, status, model, description, tools_enabled, skills, created_at, updated_at) 
VALUES ('agent-data-002', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'Data', 'data', '🤖', 'Coding Expert', 'specialist', 'active', 'gpt-4-turbo', 'Technical expert', '["read","write","edit"]', 10, datetime('now'), datetime('now'));

INSERT INTO agents (id, workspace_id, user_id, name, slug, avatar, role, level, status, model, description, tools_enabled, skills, created_at, updated_at) 
VALUES ('agent-uhura-003', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'Uhura', 'uhura', '📡', 'Communications Lead', 'lead', 'idle', 'claude-3-opus', 'Master of communications', '["read","write"]', 9, datetime('now'), datetime('now'));

-- Tracks
INSERT INTO tracks (id, workspace_id, user_id, name, slug, description, category, status, progress, priority, total_tasks, completed_tasks, estimated_tokens, used_tokens, estimated_cost, actual_cost, time_spent, agent_ids, tags, created_at, updated_at) 
VALUES ('track-001', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'Dashboard Redesign', 'dashboard-redesign', 'Complete overhaul of the mission control dashboard', 'feature', 'active', 65, 'high', 8, 5, 500000, 325000, 15.00, 9.75, 480, '["agent-spock-001","agent-data-002"]', '["ui","frontend"]', datetime('now'), datetime('now'));

INSERT INTO tracks (id, workspace_id, user_id, name, slug, description, category, status, progress, priority, total_tasks, completed_tasks, estimated_tokens, used_tokens, estimated_cost, actual_cost, time_spent, agent_ids, tags, created_at, updated_at) 
VALUES ('track-002', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'API Performance', 'api-optimization', 'Optimize API response times', 'refactor', 'active', 40, 'urgent', 6, 2, 300000, 120000, 10.00, 4.00, 240, '["agent-data-002"]', '["backend","api"]', datetime('now'), datetime('now'));

INSERT INTO tracks (id, workspace_id, user_id, name, slug, description, category, status, progress, priority, total_tasks, completed_tasks, estimated_tokens, used_tokens, estimated_cost, actual_cost, time_spent, agent_ids, tags, created_at, updated_at) 
VALUES ('track-003', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'Security Audit', 'security-audit', 'Security review and assessment', 'research', 'active', 80, 'high', 5, 4, 150000, 120000, 5.00, 4.00, 360, '["agent-spock-001"]', '["security"]', datetime('now'), datetime('now'));

-- Clear existing tasks
DELETE FROM tasks WHERE user_id = '0194f484-98c5-703d-8289-4b219f7e813a';

-- Tasks
INSERT INTO tasks (id, workspace_id, user_id, track_id, title, description, status, priority, category, input_tokens, output_tokens, estimated_cost, created_at, updated_at) 
VALUES ('task-001-001', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'track-001', 'Design new layout mockups', 'Create Figma mockups for dashboard', 'done', 'high', 'design', 25000, 15000, 0.80, datetime('now'), datetime('now'));

INSERT INTO tasks (id, workspace_id, user_id, track_id, title, description, status, priority, category, input_tokens, output_tokens, estimated_cost, created_at, updated_at) 
VALUES ('task-001-002', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'track-001', 'Implement workspace selector', 'Add workspace switching to sidebar', 'done', 'high', 'frontend', 35000, 22000, 1.15, datetime('now'), datetime('now'));

INSERT INTO tasks (id, workspace_id, user_id, track_id, title, description, status, priority, category, input_tokens, output_tokens, estimated_cost, created_at, updated_at) 
VALUES ('task-001-003', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'track-001', 'Add session monitoring', 'Real-time session display', 'in_progress', 'high', 'frontend', 42000, 0, 1.40, datetime('now'), datetime('now'));

INSERT INTO tasks (id, workspace_id, user_id, track_id, title, description, status, priority, category, input_tokens, output_tokens, estimated_cost, created_at, updated_at) 
VALUES ('task-002-001', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'track-002', 'Profile database queries', 'Identify slow queries', 'done', 'urgent', 'backend', 30000, 20000, 1.00, datetime('now'), datetime('now'));

INSERT INTO tasks (id, workspace_id, user_id, track_id, title, description, status, priority, category, input_tokens, output_tokens, estimated_cost, created_at, updated_at) 
VALUES ('task-002-002', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'track-002', 'Implement caching', 'Add Redis caching', 'in_progress', 'high', 'backend', 45000, 15000, 1.50, datetime('now'), datetime('now'));

-- Sessions
INSERT INTO sessions (id, workspace_id, agent_id, task_id, track_id, status, messages, input_tokens, output_tokens, cost, started_at, last_activity_at, duration) 
VALUES ('session-001', 'ws-demo-001', 'agent-data-002', 'task-001-003', 'track-001', 'active', 15, 25000, 18000, 0.86, datetime('now', '-2 hours'), datetime('now'), 7200);

INSERT INTO sessions (id, workspace_id, agent_id, task_id, track_id, status, messages, input_tokens, output_tokens, cost, started_at, last_activity_at, duration) 
VALUES ('session-002', 'ws-demo-001', 'agent-spock-001', NULL, NULL, 'active', 8, 12000, 9500, 0.43, datetime('now', '-45 minutes'), datetime('now'), 2700);

-- Devlogs
INSERT INTO devlogs (id, workspace_id, user_id, track_id, task_id, agent_id, title, content, category, files_changed, lines_added, lines_removed, tokens_used, session_duration, is_milestone, created_at) 
VALUES ('devlog-001', 'ws

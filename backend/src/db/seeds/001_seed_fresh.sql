-- ============================================
-- Demo Seed Data - Safe Version
-- This script safely adds demo data without foreign key errors
-- ============================================

-- Temporarily disable foreign key constraints for safe seeding
PRAGMA foreign_keys = OFF;

-- ============================================
-- STEP 1: Ensure Demo User Exists
-- ============================================
INSERT OR REPLACE INTO users (
  id, email, name, avatar, password_hash, is_demo, current_workspace_id, created_at, updated_at
) VALUES (
  '0194f484-98c5-703d-8289-4b219f7e813a',
  'demo@clawpute.com',
  'Demo User',
  'https://ui-avatars.com/api/?name=Demo+User&background=F59D0A&color=000',
  'pbkdf2:100000:bp3CjQIs/auKdGpNqQ7OiA==:95l+NDqM/iVN22+oyUBlpeIRdshI9l9cRbzDDrqePME=',
  1,
  'ws-demo-001',
  datetime('now'),
  datetime('now')
);

-- ============================================
-- STEP 2: Create Demo Workspaces
-- ============================================
INSERT OR REPLACE INTO workspaces (
  id, name, slug, description, owner_id, gateway_url, gateway_token, 
  settings, tier, is_default, avatar, color, created_at, updated_at
) VALUES 
('ws-demo-001', 'Starfleet Command', 'starfleet-command', 'Main workspace for your AI operations', 
 '0194f484-98c5-703d-8289-4b219f7e813a', 'ws://localhost:18789', 'demo-token', 
 '{}', 'pro', 1, '🚀', '#3b82f6', datetime('now'), datetime('now')),

('ws-demo-002', 'Personal Projects', 'personal-projects', 'Your side projects and experiments', 
 '0194f484-98c5-703d-8289-4b219f7e813a', '', '', '{}', 'free', 0, '👤', '#10b981', 
 datetime('now'), datetime('now'));

-- ============================================
-- STEP 3: Add Workspace Memberships
-- ============================================
INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role, joined_at, invited_by) VALUES
('ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'owner', datetime('now'), NULL),
('ws-demo-002', '0194f484-98c5-703d-8289-4b219f7e813a', 'owner', datetime('now'), NULL);

-- ============================================
-- STEP 4: Create Demo Tracks
-- ============================================
INSERT OR REPLACE INTO tracks (
  id, workspace_id, user_id, name, slug, description, category, 
  status, progress, priority, total_tasks, completed_tasks, 
  estimated_tokens, used_tokens, estimated_cost, actual_cost, 
  time_spent, agent_ids, tags, created_at, updated_at
) VALUES
('track-001', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 
 'Dashboard Redesign', 'dashboard-redesign', 'Complete UI overhaul with modern design', 
 'feature', 'active', 65, 'high', 8, 5, 500000, 325000, 15.00, 9.75, 480, '[]', '["ui","design"]', 
 datetime('now'), datetime('now')),

('track-002', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 
 'API Performance', 'api-optimization', 'Optimize response times and caching', 
 'refactor', 'active', 40, 'urgent', 6, 2, 300000, 120000, 10.00, 4.00, 240, '[]', '["performance","api"]', 
 datetime('now'), datetime('now')),

('track-003', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 
 'Security Audit', 'security-audit', 'Comprehensive security review and patches', 
 'research', 'active', 80, 'high', 5, 4, 150000, 120000, 5.00, 4.00, 360, '[]', '["security","audit"]', 
 datetime('now'), datetime('now'));

-- ============================================
-- STEP 5: Create Demo Sessions (skipped - requires agents)
-- ============================================
-- Note: Sessions require existing agents, skipping for now

-- ============================================
-- STEP 6: Create Demo Devlogs
-- ============================================
INSERT OR REPLACE INTO devlogs (
  id, workspace_id, user_id, track_id, agent_id, title, content, 
  category, files_changed, lines_added, lines_removed, 
  tokens_used, session_duration, is_milestone, created_at
) VALUES
('devlog-001', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'track-001', NULL,
 'Completed dashboard mockups', 'Created Figma mockups for Mission Control dashboard with progress bars and status indicators',
 'implementation', '["dashboard.tsx","styles.css"]', 245, 32, 45000, 180, 0, datetime('now')),

('devlog-002', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'track-002', NULL,
 'API Performance Optimization', 'Implemented caching layer and optimized database queries',
 'refactor', '["api.ts","cache.ts"]', 189, 45, 32000, 240, 1, datetime('now')),

('devlog-003', 'ws-demo-001', '0194f484-98c5-703d-8289-4b219f7e813a', 'track-003', NULL,
 'Security vulnerability fixes', 'Patched 3 medium-priority security issues identified in audit',
 'bugfix', '["auth.ts","middleware.ts"]', 56, 12, 15000, 90, 0, datetime('now'));

-- ============================================
-- STEP 7: Create Demo Activities
-- ============================================
INSERT OR REPLACE INTO activities (
  id, workspace_id, type, track_id, user_id, content, metadata, timestamp
) VALUES
('act-001', 'ws-demo-001', 'track_created', 'track-001',
 '0194f484-98c5-703d-8289-4b219f7e813a', 'Created track "Dashboard Redesign"', '{}', datetime('now')),

('act-002', 'ws-demo-001', 'track_created', 'track-002',
 '0194f484-98c5-703d-8289-4b219f7e813a', 'Created track "API Performance"', '{}', datetime('now'));

-- ============================================
-- STEP 8: Create Demo Settings
-- ============================================
INSERT OR REPLACE INTO settings (key, workspace_id, value) VALUES
('theme.default', 'ws-demo-001', '"dark"'),
('notifications.enabled', 'ws-demo-001', 'true');

-- ============================================
-- STEP 9: Update User's Current Workspace
-- ============================================
UPDATE users SET current_workspace_id = 'ws-demo-001' 
WHERE id = '0194f484-98c5-703d-8289-4b219f7e813a';

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================
-- VERIFICATION: Show what was created
-- ============================================
SELECT '🎉 Demo Data Successfully Applied!' as status;
SELECT '========================================' as separator;
SELECT '📊 Summary:' as header;
SELECT '   • Workspaces: ' || count(*) FROM workspaces;
SELECT '   • Tracks: ' || count(*) FROM tracks;
SELECT '   • Sessions: ' || count(*) FROM sessions;
SELECT '   • Devlogs: ' || count(*) FROM devlogs;
SELECT '   • Activities: ' || count(*) FROM activities;
SELECT '========================================' as separator;

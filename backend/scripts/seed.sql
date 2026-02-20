-- Seed data for Clawpute v2.0 (SaaS Multi-tenancy with Star Trek Demo)
-- Generated: 2026-02-07T04:14:36.550Z
-- Run: npx wrangler d1 execute openclaw_admin --local --file=./src/db/seed.sql

-- ============================================================================
-- DEMO USER
-- ============================================================================
INSERT INTO users (id, email, name, avatar, role, login_method, is_demo, created_at, updated_at) VALUES
('demo-user-001', 'demo@clawpute.com', 'Demo User', 'https://ui-avatars.com/api/?name=Demo+User&background=10b981&color=fff', 'user', 'demo', 1, datetime('now'), datetime('now'));

-- ============================================================================
-- MAIN AGENTS (5)
-- ============================================================================
INSERT INTO agents (id, user_id, parent_id, name, avatar, role, level, status, model, description, tools_enabled, skills, wakeup_config, created_at, updated_at) VALUES
('spock-demo', 'demo-user-001', NULL, 'Spock', '🖖', 'Logic & Analysis Specialist', 'lead', 'idle', 'claude-3-opus', 'Logical, precise, and unemotional. Specializes in data analysis, code review, and problem-solving with pure reason.', '["read","write","edit","exec","web_search","memory_search","session_status"]', 10, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now')),
('data-demo', 'demo-user-001', NULL, 'Data', '🤖', 'Coding & Technical Expert', 'specialist', 'idle', 'gpt-4-turbo', 'Android with vast technical knowledge. Excels at programming, debugging, and explaining complex technical concepts.', '["read","write","edit","apply_patch","exec","process","web_search","session_status"]', 10, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now')),
('uhura-demo', 'demo-user-001', NULL, 'Uhura', '📡', 'Communications & Marketing Lead', 'lead', 'idle', 'claude-3-opus', 'Master of communications and languages. Crafts compelling marketing copy, handles PR, and manages all messaging.', '["read","write","edit","web_search","web_fetch","memory_search","session_status"]', 9, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now')),
('scott-demo', 'demo-user-001', NULL, 'Scotty', '🔧', 'Film & Media Engineer', 'specialist', 'idle', 'gpt-4-turbo', '"I cannae change the laws of physics!" Expert in video editing, audio processing, and media production workflows.', '["read","write","edit","exec","process","session_status"]', 9, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now')),
('crusher-demo', 'demo-user-001', NULL, 'Dr. Crusher', '🏥', 'Personal AI Assistant', 'specialist', 'idle', 'claude-3-opus', 'Caring and attentive personal assistant. Manages schedules, health reminders, and personal tasks with empathy.', '["read","write","edit","sessions_list","sessions_send","session_status","agents_list"]', 8, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now'));

-- ============================================================================
-- SUB-AGENTS (5)
-- ============================================================================
INSERT INTO agents (id, user_id, parent_id, name, avatar, role, level, status, model, description, tools_enabled, skills, wakeup_config, created_at, updated_at) VALUES
('tuvok-demo', 'demo-user-001', 'spock-demo', 'Tuvok', '🧠', 'Security Analyst', 'specialist', 'idle', 'claude-3-sonnet', 'Vulcan security officer. Specializes in security audits, threat analysis, and risk assessment.', '["read","web_search","memory_search","session_status"]', 8, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now')),
('laforge-demo', 'demo-user-001', 'data-demo', 'Geordi LaForge', '👓', 'Systems Engineer', 'specialist', 'idle', 'gpt-4-turbo', 'Chief Engineer with VISOR. Expert in system architecture and infrastructure.', '["read","write","edit","exec","process","session_status"]', 9, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now')),
('troi-demo', 'demo-user-001', 'uhura-demo', 'Deanna Troi', '💜', 'User Experience Counselor', 'specialist', 'idle', 'claude-3-sonnet', 'Empathic counselor. Understands user emotions for better UX copy.', '["read","write","edit","web_search","session_status"]', 8, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now')),
('obrien-demo', 'demo-user-001', 'scott-demo', 'Miles O'Brien', '🎬', 'Video Production Tech', 'intern', 'idle', 'gpt-4-turbo', 'Media tech handling video compression and format conversion.', '["read","exec","process","session_status"]', 7, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now')),
('pulaski-demo', 'demo-user-001', 'crusher-demo', 'Dr. Pulaski', '💉', 'Health & Wellness Specialist', 'specialist', 'idle', 'claude-3-sonnet', 'Senior medical officer focusing on health tracking and wellness.', '["read","write","web_search","memory_search","session_status"]', 8, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now'));

-- ============================================================================
-- TASKS
-- ============================================================================
INSERT INTO tasks (id, user_id, title, description, status, priority, creator_id, tags, category, scheduled_date, created_at, updated_at) VALUES
('task-001-demo', 'demo-user-001', 'System Diagnostics', 'Perform a full system diagnostic on the warp core.', 'inbox', 'high', 'system', '[]', 'engineering', '2026-02-02T03:30:00.000Z', datetime('now'), datetime('now')),
('task-002-demo', 'demo-user-001', 'Comms Array Calibration', 'Recalibrate the long-range communications array.', 'assigned', 'medium', 'system', '[]', 'communications', '2026-02-03T04:30:00.000Z', datetime('now'), datetime('now')),
('task-003-demo', 'demo-user-001', 'Bio-filter Maintenance', 'Update and maintain the transporter bio-filters.', 'in_progress', 'urgent', 'system', '[]', 'medical', '2026-02-04T05:30:00.000Z', datetime('now'), datetime('now')),
('task-004-demo', 'demo-user-001', 'Dilithium Crystal Analysis', 'Analyze the recent batch of dilithium crystals.', 'done', 'low', 'system', '[]', 'science', '2026-02-05T08:30:00.000Z', datetime('now'), datetime('now')),
('task-005-demo', 'demo-user-001', 'Hull Integrity Check', 'Manual hull integrity check of Deck 15.', 'waiting', 'medium', 'system', '[]', 'engineering', '2026-02-06T09:30:00.000Z', datetime('now'), datetime('now')),
('task-006-demo', 'demo-user-001', 'Sensor Array Tuning', 'Fine-tune the astrometrics sensor array.', 'inbox', 'high', 'system', '[]', 'science', '2026-02-01T10:30:00.000Z', datetime('now'), datetime('now'));

-- ============================================================================
-- CHANNELS
-- ============================================================================
INSERT INTO user_channels (id, user_id, channel_type, name, config, is_enabled, status, created_at, updated_at) VALUES
('telegram-demo', 'demo-user-001', 'telegram', 'Telegram Bot', '{"botName":"@ClawputeDemoBot","status":"connected","demo":true}', 1, 'connected', datetime('now'), datetime('now')),
('discord-demo', 'demo-user-001', 'discord', 'Discord Server', '{"serverName":"Starfleet Command","status":"connected","demo":true}', 1, 'connected', datetime('now'), datetime('now')),
('slack-demo', 'demo-user-001', 'slack', 'Slack Workspace', '{"workspace":"Utopia Planitia","status":"disconnected","demo":true}', 0, 'disconnected', datetime('now'), datetime('now'));

-- ============================================================================
-- ACTIVITIES
-- ============================================================================
INSERT INTO activities (id, type, agent_id, task_id, user_id, content, metadata, timestamp) VALUES
('act-001', 'agent_created', 'spock-demo', NULL, 'demo-user-001', 'Spock has joined your crew', '{}', datetime('now')),
('act-002', 'agent_created', 'data-demo', NULL, 'demo-user-001', 'Data has come online', '{}', datetime('now')),
('act-003', 'agent_created', 'uhura-demo', NULL, 'demo-user-001', 'Uhura is ready for communications', '{}', datetime('now')),
('act-004', 'agent_created', 'scott-demo', NULL, 'demo-user-001', 'Scotty is standing by', '{}', datetime('now')),
('act-005', 'agent_created', 'crusher-demo', NULL, 'demo-user-001', 'Dr. Crusher is on duty', '{}', datetime('now')),
('act-006', 'agent_created', 'tuvok-demo', NULL, 'demo-user-001', 'Tuvok (sub-agent) reporting for security', '{}', datetime('now')),
('act-007', 'agent_created', 'laforge-demo', NULL, 'demo-user-001', 'Geordi LaForge (sub-agent) ready in engineering', '{}', datetime('now')),
('act-008', 'task_completed', 'scott-demo', 'task-004-demo', 'demo-user-001', 'Scotty completed video editing task', '{}', datetime('now')),
('act-009', 'agent_message', 'crusher-demo', NULL, 'demo-user-001', 'Dr. Crusher scheduled your daily standup', '{}', datetime('now')),
('act-010', 'task_created', NULL, 'task-003-demo', 'demo-user-001', 'New high priority task assigned', '{}', datetime('now'));

-- ============================================================================
-- TASK MESSAGES (Chat History)
-- ============================================================================
INSERT INTO messages (id, task_id, agent_id, user_id, content, type, source, attachments, timestamp) VALUES
('msg-001', 'task-001-demo', 'spock-demo', NULL, 'Logical analysis initiated. Q4 metrics show 23% growth in user engagement.', 'comment', 'agent', '[]', datetime('now', '-7 hours')),
('msg-002', 'task-001-demo', NULL, 'demo-user-001', 'Great! Can you break down the metrics by product line?', 'comment', 'webchat', '[]', datetime('now', '-23 hours')),
('msg-003', 'task-001-demo', 'spock-demo', NULL, 'Affirmative. Product A: +31%, Product B: +18%, Product C: +20%. Detailed breakdown in attached document.', 'comment', 'agent', '[]', datetime('now', '-9 hours')),
('msg-004', 'task-001-demo', 'tuvok-demo', NULL, 'Security audit completed. No anomalies detected in data sources.', 'system', 'agent', '[]', datetime('now', '-4 hours')),
('msg-005', 'task-002-demo', NULL, 'demo-user-001', 'We need this for the product launch next week. Focus on the AI features.', 'comment', 'webchat', '[]', datetime('now', '-1 hours')),
('msg-006', 'task-002-demo', 'uhura-demo', NULL, 'Understood. I''ll craft compelling copy highlighting the AI automation capabilities. Target audience: tech-savvy professionals?', 'comment', 'agent', '[]', datetime('now', '-17 hours')),
('msg-007', 'task-002-demo', NULL, 'demo-user-001', 'Yes, and emphasize the time-saving benefits', 'comment', 'webchat', '[]', datetime('now', '-12 hours')),
('msg-008', 'task-002-demo', 'troi-demo', NULL, 'From a UX perspective, I suggest emphasizing emotional benefits: "Reclaim your time" rather than just "Save time"', 'comment', 'agent', '[]', datetime('now', '-17 hours')),
('msg-009', 'task-003-demo', 'data-demo', NULL, 'Analyzing authentication module. Detected race condition in token refresh logic.', 'system', 'agent', '[]', datetime('now', '-23 hours')),
('msg-010', 'task-003-demo', 'data-demo', NULL, 'Root cause identified: concurrent requests creating multiple refresh tokens. Implementing mutex lock pattern.', 'comment', 'agent', '[]', datetime('now', '-18 hours')),
('msg-011', 'task-003-demo', 'laforge-demo', NULL, 'I''ve reviewed Data''s proposed fix. Recommend adding Redis-based distributed lock for multi-instance deployments.', 'comment', 'agent', '[]', datetime('now', '-1 hours')),
('msg-012', 'task-003-demo', NULL, 'demo-user-001', 'Good catch! Please implement both solutions', 'comment', 'webchat', '[]', datetime('now', '-14 hours')),
('msg-013', 'task-004-demo', 'scott-demo', NULL, 'Video editing complete! Added intro with logo animation and outro with CTA.', 'comment', 'agent', '[]', datetime('now', '-12 hours')),
('msg-014', 'task-004-demo', 'obrien-demo', NULL, 'Compressed to 1080p H.265 for web delivery. File size reduced by 60% with minimal quality loss.', 'system', 'agent', '[]', datetime('now', '-20 hours')),
('msg-015', 'task-004-demo', NULL, 'demo-user-001', 'Looks perfect! Great work team', 'comment', 'webchat', '[]', datetime('now', '-19 hours')),
('msg-016', 'task-004-demo', 'scott-demo', NULL, 'Happy to help! If ye need any adjustments, just give me a shout.', 'comment', 'agent', '[]', datetime('now', '-14 hours')),
('msg-017', 'task-005-demo', 'crusher-demo', NULL, 'I''ve reviewed everyone''s calendars. Proposing weekly 1:1s on Tuesdays at 2 PM.', 'comment', 'agent', '[]', datetime('now', '-2 hours')),
('msg-018', 'task-005-demo', 'pulaski-demo', NULL, 'Recommend including a wellness assessment questionnaire in the first meeting.', 'comment', 'agent', '[]', datetime('now', '-23 hours')),
('msg-019', 'task-005-demo', NULL, 'demo-user-001', 'Good idea. Let''s start next week', 'comment', 'webchat', '[]', datetime('now', '-13 hours'));

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '✅ Seed data inserted successfully!' as result;
SELECT 'Users: ' || count(*) as count FROM users;
SELECT 'Agents (main): ' || count(*) as count FROM agents WHERE parent_id IS NULL;
SELECT 'Agents (sub): ' || count(*) as count FROM agents WHERE parent_id IS NOT NULL;
SELECT 'Tasks: ' || count(*) as count FROM tasks;
SELECT 'Channels: ' || count(*) as count FROM user_channels;
SELECT 'Activities: ' || count(*) as count FROM activities;
SELECT 'Messages: ' || count(*) as count FROM messages;

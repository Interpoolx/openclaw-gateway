/**
 * Seed script for Clawpute v2.0
 * Generates seed.sql with demo data (Star Trek agents, sub-agents, tasks, etc.)
 * 
 * Run: npx tsx src/db/seed.ts
 * Then: npm run db:seed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const now = new Date().toISOString();

// Demo user
const demoUser = {
  id: 'demo-user-001',
  email: 'demo@clawpute.com',
  name: 'Demo User',
  avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=10b981&color=fff',
  role: 'user',
  loginMethod: 'demo',
  isDemo: 1,
};

// Main Star Trek agents
const mainAgents = [
  {
    id: 'spock-demo',
    name: 'Spock',
    avatar: '🖖',
    role: 'Logic & Analysis Specialist',
    level: 'lead',
    model: 'claude-3-opus',
    description: 'Logical, precise, and unemotional. Specializes in data analysis, code review, and problem-solving with pure reason.',
    tools: ['read', 'write', 'edit', 'exec', 'web_search', 'memory_search', 'session_status'],
    skills: 10,
  },
  {
    id: 'data-demo',
    name: 'Data',
    avatar: '🤖',
    role: 'Coding & Technical Expert',
    level: 'specialist',
    model: 'gpt-4-turbo',
    description: 'Android with vast technical knowledge. Excels at programming, debugging, and explaining complex technical concepts.',
    tools: ['read', 'write', 'edit', 'apply_patch', 'exec', 'process', 'web_search', 'session_status'],
    skills: 10,
  },
  {
    id: 'uhura-demo',
    name: 'Uhura',
    avatar: '📡',
    role: 'Communications & Marketing Lead',
    level: 'lead',
    model: 'claude-3-opus',
    description: 'Master of communications and languages. Crafts compelling marketing copy, handles PR, and manages all messaging.',
    tools: ['read', 'write', 'edit', 'web_search', 'web_fetch', 'memory_search', 'session_status'],
    skills: 9,
  },
  {
    id: 'scott-demo',
    name: 'Scotty',
    avatar: '🔧',
    role: 'Film & Media Engineer',
    level: 'specialist',
    model: 'gpt-4-turbo',
    description: '"I cannae change the laws of physics!" Expert in video editing, audio processing, and media production workflows.',
    tools: ['read', 'write', 'edit', 'exec', 'process', 'session_status'],
    skills: 9,
  },
  {
    id: 'crusher-demo',
    name: 'Dr. Crusher',
    avatar: '🏥',
    role: 'Personal AI Assistant',
    level: 'specialist',
    model: 'claude-3-opus',
    description: 'Caring and attentive personal assistant. Manages schedules, health reminders, and personal tasks with empathy.',
    tools: ['read', 'write', 'edit', 'sessions_list', 'sessions_send', 'session_status', 'agents_list'],
    skills: 8,
  },
];

// Sub-agents
const subAgents = [
  {
    id: 'tuvok-demo',
    parentId: 'spock-demo',
    name: 'Tuvok',
    avatar: '🧠',
    role: 'Security Analyst',
    level: 'specialist',
    model: 'claude-3-sonnet',
    description: 'Vulcan security officer. Specializes in security audits, threat analysis, and risk assessment.',
    tools: ['read', 'web_search', 'memory_search', 'session_status'],
    skills: 8,
  },
  {
    id: 'laforge-demo',
    parentId: 'data-demo',
    name: 'Geordi LaForge',
    avatar: '👓',
    role: 'Systems Engineer',
    level: 'specialist',
    model: 'gpt-4-turbo',
    description: 'Chief Engineer with VISOR. Expert in system architecture and infrastructure.',
    tools: ['read', 'write', 'edit', 'exec', 'process', 'session_status'],
    skills: 9,
  },
  {
    id: 'troi-demo',
    parentId: 'uhura-demo',
    name: 'Deanna Troi',
    avatar: '💜',
    role: 'User Experience Counselor',
    level: 'specialist',
    model: 'claude-3-sonnet',
    description: 'Empathic counselor. Understands user emotions for better UX copy.',
    tools: ['read', 'write', 'edit', 'web_search', 'session_status'],
    skills: 8,
  },
  {
    id: 'obrien-demo',
    parentId: 'scott-demo',
    name: 'Miles O\'Brien',
    avatar: '🎬',
    role: 'Video Production Tech',
    level: 'intern',
    model: 'gpt-4-turbo',
    description: 'Media tech handling video compression and format conversion.',
    tools: ['read', 'exec', 'process', 'session_status'],
    skills: 7,
  },
  {
    id: 'pulaski-demo',
    parentId: 'crusher-demo',
    name: 'Dr. Pulaski',
    avatar: '💉',
    role: 'Health & Wellness Specialist',
    level: 'specialist',
    model: 'claude-3-sonnet',
    description: 'Senior medical officer focusing on health tracking and wellness.',
    tools: ['read', 'write', 'web_search', 'memory_search', 'session_status'],
    skills: 8,
  },
];

// Tasks
const tasks = [
  { id: 'task-001-demo', title: 'System Diagnostics', desc: 'Perform a full system diagnostic on the warp core.', status: 'inbox', priority: 'high', category: 'engineering', scheduled: 1, hour: 9 },
  { id: 'task-002-demo', title: 'Comms Array Calibration', desc: 'Recalibrate the long-range communications array.', status: 'assigned', priority: 'medium', category: 'communications', scheduled: 2, hour: 10 },
  { id: 'task-003-demo', title: 'Bio-filter Maintenance', desc: 'Update and maintain the transporter bio-filters.', status: 'in_progress', priority: 'urgent', category: 'medical', scheduled: 3, hour: 11 },
  { id: 'task-004-demo', title: 'Dilithium Crystal Analysis', desc: 'Analyze the recent batch of dilithium crystals.', status: 'done', priority: 'low', category: 'science', scheduled: 4, hour: 14 },
  { id: 'task-005-demo', title: 'Hull Integrity Check', desc: 'Manual hull integrity check of Deck 15.', status: 'waiting', priority: 'medium', category: 'engineering', scheduled: 5, hour: 15 },
  { id: 'task-006-demo', title: 'Sensor Array Tuning', desc: 'Fine-tune the astrometrics sensor array.', status: 'inbox', priority: 'high', category: 'science', scheduled: 0, hour: 16 },
];

// Channels
const channels = [
  { id: 'telegram-demo', type: 'telegram', name: 'Telegram Bot', config: JSON.stringify({ botName: '@ClawputeDemoBot', status: 'connected', demo: true }), enabled: 1, status: 'connected' },
  { id: 'discord-demo', type: 'discord', name: 'Discord Server', config: JSON.stringify({ serverName: 'Starfleet Command', status: 'connected', demo: true }), enabled: 1, status: 'connected' },
  { id: 'slack-demo', type: 'slack', name: 'Slack Workspace', config: JSON.stringify({ workspace: 'Utopia Planitia', status: 'disconnected', demo: true }), enabled: 0, status: 'disconnected' },
];

// Generate SQL
let sql = `-- Seed data for Clawpute v2.0 (SaaS Multi-tenancy with Star Trek Demo)
-- Generated: ${now}
-- Run: npx wrangler d1 execute openclaw_admin --local --file=./src/db/seed.sql

-- ============================================================================
-- DEMO USER
-- ============================================================================
INSERT INTO users (id, email, name, avatar, role, login_method, is_demo, created_at, updated_at) VALUES
('${demoUser.id}', '${demoUser.email}', '${demoUser.name}', '${demoUser.avatar}', '${demoUser.role}', '${demoUser.loginMethod}', ${demoUser.isDemo}, datetime('now'), datetime('now'));

-- ============================================================================
-- MAIN AGENTS (5)
-- ============================================================================
INSERT INTO agents (id, user_id, parent_id, name, avatar, role, level, status, model, description, tools_enabled, skills, wakeup_config, created_at, updated_at) VALUES\n`;

// Add main agents
const agentValues = mainAgents.map(a =>
  `('${a.id}', '${demoUser.id}', NULL, '${a.name}', '${a.avatar}', '${a.role}', '${a.level}', 'idle', '${a.model}', '${a.description.replace(/'/g, "''")}', '${JSON.stringify(a.tools)}', ${a.skills}, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now'))`
).join(',\n');

sql += agentValues + ';\n\n';

// Add sub-agents
sql += `-- ============================================================================
-- SUB-AGENTS (5)
-- ============================================================================
INSERT INTO agents (id, user_id, parent_id, name, avatar, role, level, status, model, description, tools_enabled, skills, wakeup_config, created_at, updated_at) VALUES\n`;

const subAgentValues = subAgents.map(a =>
  `('${a.id}', '${demoUser.id}', '${a.parentId}', '${a.name}', '${a.avatar}', '${a.role}', '${a.level}', 'idle', '${a.model}', '${a.description.replace(/'/g, "''")}', '${JSON.stringify(a.tools)}', ${a.skills}, '{"method":"poll","intervalMs":900000}', datetime('now'), datetime('now'))`
).join(',\n');

sql += subAgentValues + ';\n\n';

// Add tasks
sql += `-- ============================================================================
-- TASKS
-- ============================================================================
INSERT INTO tasks (id, user_id, title, description, status, priority, creator_id, tags, category, scheduled_date, created_at, updated_at) VALUES\n`;

const taskValues = tasks.map(t => {
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() - scheduledDate.getDay() + (t.scheduled || 0));
  scheduledDate.setHours(t.hour || 12, 0, 0, 0);
  const scheduledStr = scheduledDate.toISOString();

  return `('${t.id}', '${demoUser.id}', '${t.title}', '${t.desc}', '${t.status}', '${t.priority}', 'system', '[]', '${t.category}', '${scheduledStr}', datetime('now'), datetime('now'))`;
}).join(',\n');

sql += taskValues + ';\n\n';

// Add channels
sql += `-- ============================================================================
-- CHANNELS
-- ============================================================================
INSERT INTO user_channels (id, user_id, channel_type, name, config, is_enabled, status, created_at, updated_at) VALUES\n`;

const channelValues = channels.map(c =>
  `('${c.id}', '${demoUser.id}', '${c.type}', '${c.name}', '${c.config}', ${c.enabled}, '${c.status}', datetime('now'), datetime('now'))`
).join(',\n');

sql += channelValues + ';\n\n';

// Add activities
const activities = [
  { type: 'agent_created', agentId: 'spock-demo', content: 'Spock has joined your crew' },
  { type: 'agent_created', agentId: 'data-demo', content: 'Data has come online' },
  { type: 'agent_created', agentId: 'uhura-demo', content: 'Uhura is ready for communications' },
  { type: 'agent_created', agentId: 'scott-demo', content: 'Scotty is standing by' },
  { type: 'agent_created', agentId: 'crusher-demo', content: 'Dr. Crusher is on duty' },
  { type: 'agent_created', agentId: 'tuvok-demo', content: 'Tuvok (sub-agent) reporting for security' },
  { type: 'agent_created', agentId: 'laforge-demo', content: 'Geordi LaForge (sub-agent) ready in engineering' },
  { type: 'task_completed', agentId: 'scott-demo', taskId: 'task-004-demo', content: 'Scotty completed video editing task' },
  { type: 'agent_message', agentId: 'crusher-demo', content: 'Dr. Crusher scheduled your daily standup' },
  { type: 'task_created', taskId: 'task-003-demo', content: 'New high priority task assigned' },
];

sql += `-- ============================================================================
-- ACTIVITIES
-- ============================================================================
INSERT INTO activities (id, type, agent_id, task_id, user_id, content, metadata, timestamp) VALUES\n`;

const activityValues = activities.map((a, i) =>
  `('act-${String(i + 1).padStart(3, '0')}', '${a.type}', ${a.agentId ? `'${a.agentId}'` : 'NULL'}, ${a.taskId ? `'${a.taskId}'` : 'NULL'}, '${demoUser.id}', '${a.content}', '{}', datetime('now'))`
).join(',\n');

sql += activityValues + ';\n\n';

// Add task messages (chat history)
const messages = [
  // Task 1: Analyze quarterly performance metrics (in_progress)
  { taskId: 'task-001-demo', agentId: 'spock-demo', userId: null, content: 'Logical analysis initiated. Q4 metrics show 23% growth in user engagement.', type: 'comment', source: 'agent' },
  { taskId: 'task-001-demo', agentId: null, userId: demoUser.id, content: 'Great! Can you break down the metrics by product line?', type: 'comment', source: 'webchat' },
  { taskId: 'task-001-demo', agentId: 'spock-demo', userId: null, content: 'Affirmative. Product A: +31%, Product B: +18%, Product C: +20%. Detailed breakdown in attached document.', type: 'comment', source: 'agent' },
  { taskId: 'task-001-demo', agentId: 'tuvok-demo', userId: null, content: 'Security audit completed. No anomalies detected in data sources.', type: 'system', source: 'agent' },

  // Task 2: Draft marketing campaign (inbox)
  { taskId: 'task-002-demo', agentId: null, userId: demoUser.id, content: 'We need this for the product launch next week. Focus on the AI features.', type: 'comment', source: 'webchat' },
  { taskId: 'task-002-demo', agentId: 'uhura-demo', userId: null, content: 'Understood. I\'ll craft compelling copy highlighting the AI automation capabilities. Target audience: tech-savvy professionals?', type: 'comment', source: 'agent' },
  { taskId: 'task-002-demo', agentId: null, userId: demoUser.id, content: 'Yes, and emphasize the time-saving benefits', type: 'comment', source: 'webchat' },
  { taskId: 'task-002-demo', agentId: 'troi-demo', userId: null, content: 'From a UX perspective, I suggest emphasizing emotional benefits: "Reclaim your time" rather than just "Save time"', type: 'comment', source: 'agent' },

  // Task 3: Debug authentication module (urgent, inbox)
  { taskId: 'task-003-demo', agentId: 'data-demo', userId: null, content: 'Analyzing authentication module. Detected race condition in token refresh logic.', type: 'system', source: 'agent' },
  { taskId: 'task-003-demo', agentId: 'data-demo', userId: null, content: 'Root cause identified: concurrent requests creating multiple refresh tokens. Implementing mutex lock pattern.', type: 'comment', source: 'agent' },
  { taskId: 'task-003-demo', agentId: 'laforge-demo', userId: null, content: 'I\'ve reviewed Data\'s proposed fix. Recommend adding Redis-based distributed lock for multi-instance deployments.', type: 'comment', source: 'agent' },
  { taskId: 'task-003-demo', agentId: null, userId: demoUser.id, content: 'Good catch! Please implement both solutions', type: 'comment', source: 'webchat' },

  // Task 4: Edit product demo video (done)
  { taskId: 'task-004-demo', agentId: 'scott-demo', userId: null, content: 'Video editing complete! Added intro with logo animation and outro with CTA.', type: 'comment', source: 'agent' },
  { taskId: 'task-004-demo', agentId: 'obrien-demo', userId: null, content: 'Compressed to 1080p H.265 for web delivery. File size reduced by 60% with minimal quality loss.', type: 'system', source: 'agent' },
  { taskId: 'task-004-demo', agentId: null, userId: demoUser.id, content: 'Looks perfect! Great work team', type: 'comment', source: 'webchat' },
  { taskId: 'task-004-demo', agentId: 'scott-demo', userId: null, content: 'Happy to help! If ye need any adjustments, just give me a shout.', type: 'comment', source: 'agent' },

  // Task 5: Schedule team wellness check-ins (inbox, low priority)
  { taskId: 'task-005-demo', agentId: 'crusher-demo', userId: null, content: 'I\'ve reviewed everyone\'s calendars. Proposing weekly 1:1s on Tuesdays at 2 PM.', type: 'comment', source: 'agent' },
  { taskId: 'task-005-demo', agentId: 'pulaski-demo', userId: null, content: 'Recommend including a wellness assessment questionnaire in the first meeting.', type: 'comment', source: 'agent' },
  { taskId: 'task-005-demo', agentId: null, userId: demoUser.id, content: 'Good idea. Let\'s start next week', type: 'comment', source: 'webchat' },
];

sql += `-- ============================================================================
-- TASK MESSAGES (Chat History)
-- ============================================================================
INSERT INTO messages (id, task_id, agent_id, user_id, content, type, source, attachments, timestamp) VALUES\n`;

const messageValues = messages.map((m, i) =>
  `('msg-${String(i + 1).padStart(3, '0')}', '${m.taskId}', ${m.agentId ? `'${m.agentId}'` : 'NULL'}, ${m.userId ? `'${m.userId}'` : 'NULL'}, '${m.content.replace(/'/g, "''")}', '${m.type}', '${m.source}', '[]', datetime('now', '-${Math.floor(Math.random() * 24)} hours'))`
).join(',\n');

sql += messageValues + ';\n\n';

sql += `-- ============================================================================
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
`;

// Write file
const outputPath = path.join(__dirname, 'seed.sql');
fs.writeFileSync(outputPath, sql);

console.log('✅ Generated seed.sql');
console.log(`   Location: ${outputPath}`);
console.log(`   Run: npm run db:seed`);

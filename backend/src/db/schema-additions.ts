/**
 * schema-additions.ts
 *
 * Drizzle table definitions for 3 LobsterAI-inspired features.
 * These tables are ADDED on top of the existing schema.ts.
 *
 * Run migration:
 *   npx wrangler d1 execute openclaw_admin --remote \
 *     --file=./drizzle/0002_lobster_features.sql
 */

import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Feature 1: Agent Memories ────────────────────────────────────────────────
// Extracted facts about users, injected into agent system prompts

export const agentMemories = sqliteTable('agent_memories', {
  id:          text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  userId:      text('user_id').notNull(),
  agentId:     text('agent_id'),              // null = applies to all agents
  taskId:      text('task_id'),               // which task it was extracted from
  category:    text('category').notNull(),    // profile|preference|ownership|assistant_pref|explicit
  content:     text('content').notNull(),     // e.g. "The user prefers TypeScript"
  confidence:  real('confidence').default(0.8),
  source:      text('source').default('auto'), // auto | explicit
  isActive:    integer('is_active', { mode: 'boolean' }).default(true),
  timesUsed:   integer('times_used').default(0),
  lastUsedAt:  text('last_used_at'),
  createdAt:   text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:   text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ─── Feature 2: Scheduled Tasks ───────────────────────────────────────────────
// Cron-based recurring task creation

export const scheduledTaskDefs = sqliteTable('scheduled_task_defs', {
  id:           text('id').primaryKey(),
  workspaceId:  text('workspace_id').notNull(),
  userId:       text('user_id').notNull(),
  agentId:      text('agent_id'),
  name:         text('name').notNull(),
  description:  text('description'),
  cronExpr:     text('cron_expr').notNull(),       // standard 5-field cron expression
  taskTemplate: text('task_template').notNull(),   // JSON: { title, description, priority, tags }
  timezone:     text('timezone').default('UTC'),
  isEnabled:    integer('is_enabled', { mode: 'boolean' }).default(true),
  lastFiredAt:  text('last_fired_at'),
  nextFireAt:   text('next_fire_at'),
  lastTaskId:   text('last_task_id'),
  totalFired:   integer('total_fired').default(0),
  createdAt:    text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt:    text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const scheduledTaskRuns = sqliteTable('scheduled_task_runs', {
  id:      text('id').primaryKey(),
  defId:   text('def_id').notNull(),
  taskId:  text('task_id'),
  status:  text('status').notNull(), // fired | task_created | error
  error:   text('error'),
  firedAt: text('fired_at').default(sql`CURRENT_TIMESTAMP`),
});

// ─── Feature 3: Tool Approvals ────────────────────────────────────────────────
// Per-invocation user approval before dangerous tools execute

export const toolApprovals = sqliteTable('tool_approvals', {
  id:          text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  userId:      text('user_id').notNull(),
  taskId:      text('task_id'),
  agentId:     text('agent_id'),
  tool:        text('tool').notNull(),
  params:      text('params').default('{}'),      // JSON params shown to user
  status:      text('status').default('pending'), // pending|approved|rejected|expired
  scope:       text('scope').default('once'),     // once|session|always
  expiresAt:   text('expires_at'),
  decidedAt:   text('decided_at'),
  decidedBy:   text('decided_by'),
  requestedAt: text('requested_at').default(sql`CURRENT_TIMESTAMP`),
});

export const toolPermissions = sqliteTable('tool_permissions', {
  id:          text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  userId:      text('user_id').notNull(),
  tool:        text('tool').notNull(),
  allowed:     integer('allowed', { mode: 'boolean' }).default(true),
  scope:       text('scope').default('always'),
  grantedAt:   text('granted_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt:   text('expires_at'),
}, (t) => ({
  pk: primaryKey({ columns: [t.workspaceId, t.userId, t.tool] }),
}));

// ─── Type exports ─────────────────────────────────────────────────────────────

export type AgentMemory         = typeof agentMemories.$inferSelect;
export type NewAgentMemory      = typeof agentMemories.$inferInsert;
export type ScheduledTaskDef    = typeof scheduledTaskDefs.$inferSelect;
export type NewScheduledTaskDef = typeof scheduledTaskDefs.$inferInsert;
export type ScheduledTaskRun    = typeof scheduledTaskRuns.$inferSelect;
export type ToolApproval        = typeof toolApprovals.$inferSelect;
export type ToolPermission      = typeof toolPermissions.$inferSelect;
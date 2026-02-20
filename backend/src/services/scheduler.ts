/**
 * services/scheduler.ts — Feature 2: Scheduled Tasks
 *
 * Pure-JS cron parser (no npm deps, works in Cloudflare Workers).
 * The scheduled() export handles the Cloudflare Cron Trigger (every minute).
 *
 * WIRING IN index.ts — add these two lines:
 *
 *   import { handleScheduled } from './services/scheduler'
 *   export const scheduled = (e: ScheduledEvent, env: Env, ctx: ExecutionContext) =>
 *     ctx.waitUntil(handleScheduled(e, env))
 */

import { eq, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as ext from '../db/schema-additions';
import * as schema from '../db/schema';
import { getDb } from '../middleware/auth';

type DB = DrizzleD1Database<Record<string, unknown>>;

// ─── Cron parser ──────────────────────────────────────────────────────────────

function parseCronField(field: string, min: number, max: number): Set<number> {
  const result = new Set<number>();
  if (field === '*') {
    for (let i = min; i <= max; i++) result.add(i);
    return result;
  }
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const stepNum = parseInt(step);
      const [lo, hi] = range === '*' ? [min, max] : range.split('-').map(Number);
      for (let i = lo; i <= hi; i += stepNum) result.add(i);
    } else if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number);
      for (let i = lo; i <= hi; i++) result.add(i);
    } else {
      result.add(parseInt(part));
    }
  }
  return result;
}

/** Returns true if the given date matches the 5-field cron expression (UTC). */
export function cronMatches(expr: string, date: Date = new Date()): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minE, hourE, domE, monE, dowE] = parts;
  return (
    parseCronField(minE,  0, 59).has(date.getUTCMinutes()) &&
    parseCronField(hourE, 0, 23).has(date.getUTCHours()) &&
    parseCronField(domE,  1, 31).has(date.getUTCDate()) &&
    parseCronField(monE,  1, 12).has(date.getUTCMonth() + 1) &&
    parseCronField(dowE,  0,  6).has(date.getUTCDay())
  );
}

/** Returns ISO string of next fire time, or null if nothing matches in 1 year. */
export function getNextFireAt(expr: string, from: Date = new Date()): string | null {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setTime(d.getTime() + 60_000); // start from next minute
  for (let i = 0; i < 525_600; i++) {
    if (cronMatches(expr, d)) return d.toISOString();
    d.setTime(d.getTime() + 60_000);
  }
  return null;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export interface CreateScheduledTaskInput {
  workspaceId:  string;
  userId:       string;
  agentId?:     string | null;
  name:         string;
  description?: string;
  cronExpr:     string;
  taskTemplate: {
    title:        string;
    description?: string;
    priority?:    string;
    tags?:        string[];
    trackId?:     string;
  };
  timezone?: string;
}

export async function createScheduledTask(db: DB, input: CreateScheduledTaskInput) {
  const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const nextFireAt = getNextFireAt(input.cronExpr);

  await db.insert(ext.scheduledTaskDefs).values({
    id,
    workspaceId:  input.workspaceId,
    userId:       input.userId,
    agentId:      input.agentId ?? undefined,
    name:         input.name,
    description:  input.description ?? undefined,
    cronExpr:     input.cronExpr,
    taskTemplate: JSON.stringify(input.taskTemplate),
    timezone:     input.timezone ?? 'UTC',
    isEnabled:    true,
    nextFireAt:   nextFireAt ?? undefined,
    totalFired:   0,
    createdAt:    now,
    updatedAt:    now,
  });

  return { id, nextFireAt };
}

export async function getScheduledTasks(db: DB, workspaceId: string) {
  const defs = await db
    .select()
    .from(ext.scheduledTaskDefs)
    .where(eq(ext.scheduledTaskDefs.workspaceId, workspaceId))
    .orderBy(desc(ext.scheduledTaskDefs.createdAt));

  return defs.map(d => ({ ...d, taskTemplate: JSON.parse(d.taskTemplate as string) }));
}

export async function updateScheduledTask(
  db:    DB,
  id:    string,
  input: Partial<CreateScheduledTaskInput> & { isEnabled?: boolean },
) {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined)         updates.name = input.name;
  if (input.description !== undefined)  updates.description = input.description;
  if (input.agentId !== undefined)      updates.agentId = input.agentId;
  if (input.isEnabled !== undefined)    updates.isEnabled = input.isEnabled;
  if (input.taskTemplate !== undefined) updates.taskTemplate = JSON.stringify(input.taskTemplate);
  if (input.cronExpr !== undefined) {
    updates.cronExpr   = input.cronExpr;
    updates.nextFireAt = getNextFireAt(input.cronExpr);
  }

  await db.update(ext.scheduledTaskDefs).set(updates).where(eq(ext.scheduledTaskDefs.id, id));
}

export async function deleteScheduledTask(db: DB, id: string) {
  await db.delete(ext.scheduledTaskDefs).where(eq(ext.scheduledTaskDefs.id, id));
}

// ─── Cloudflare scheduled() handler ──────────────────────────────────────────

interface SchedulerEnv { DB: D1Database; }

export async function handleScheduled(
  event: { scheduledTime: number },
  env:   SchedulerEnv,
): Promise<void> {
  const db  = getDb(env as any);
  const now = new Date(event.scheduledTime);
  console.log(`[scheduler] tick at ${now.toISOString()}`);

  const allDefs = await db
    .select()
    .from(ext.scheduledTaskDefs)
    .where(eq(ext.scheduledTaskDefs.isEnabled, true));

  let fired = 0;

  for (const def of allDefs) {
    if (!cronMatches(def.cronExpr as string, now)) continue;

    console.log(`[scheduler] firing def "${def.name}" (${def.id})`);

    try {
      const template = JSON.parse(def.taskTemplate as string) as {
        title: string; description?: string; priority?: string;
        tags?: string[]; trackId?: string;
      };

      const taskId  = `task-sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const taskNow = now.toISOString();
      const title   = (template.title as string).replace('{{date}}', now.toLocaleDateString('en-US'));

      await db.insert(schema.tasks).values({
        id:          taskId,
        workspaceId: def.workspaceId as string,
        userId:      def.userId as string,
        trackId:     template.trackId ?? undefined,
        title,
        description: template.description ?? undefined,
        status:      'inbox',
        priority:    (template.priority ?? 'medium') as any,
        creatorId:   'scheduler',
        tags:        JSON.stringify(template.tags ?? ['scheduled']),
        category:    'scheduled',
        createdAt:   taskNow,
        updatedAt:   taskNow,
      });

      // Log this run
      await db.insert(ext.scheduledTaskRuns).values({
        id:      `run-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        defId:   def.id as string,
        taskId,
        status:  'task_created',
        firedAt: taskNow,
      });

      // Update the def
      const nextFire = getNextFireAt(def.cronExpr as string, new Date(now.getTime() + 60_000));
      await db.update(ext.scheduledTaskDefs).set({
        lastFiredAt: taskNow,
        lastTaskId:  taskId,
        nextFireAt:  nextFire ?? undefined,
        totalFired:  ((def.totalFired as number) ?? 0) + 1,
        updatedAt:   taskNow,
      }).where(eq(ext.scheduledTaskDefs.id, def.id as string));

      fired++;
    } catch (err) {
      console.error(`[scheduler] error firing ${def.id}:`, err);
      await db.insert(ext.scheduledTaskRuns).values({
        id:      `run-err-${Date.now()}`,
        defId:   def.id as string,
        status:  'error',
        error:   String(err),
        firedAt: now.toISOString(),
      }).catch(() => {});
    }
  }

  console.log(`[scheduler] done — fired ${fired} task(s)`);
}
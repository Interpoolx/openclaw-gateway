/**
 * middleware/auth.ts
 *
 * Shared auth helpers. All routes use these two functions.
 * Token is the userId (simple bearer token — same as original).
 */

import { drizzle } from 'drizzle-orm/d1';
import type { Context } from 'hono';
import * as schema from '../db/schema';

export interface Env {
  DB: D1Database;
  OPENCLAW_URL: string;
  OPENCLAW_API_KEY: string;
  OPENCLAW_MODE: string;
  JWT_SECRET: string;
  CONFIG_BUILDER_RATELIMIT_KV?: KVNamespace;
  ANTHROPIC_KEY?: string;
}

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export async function getUserFromToken(c: Context<{ Bindings: Env }>) {
  const authHeader = c.req.header('Authorization');
  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim()
    : c.req.query('token') ?? null;

  if (!token) return null;
  return { userId: token };
}

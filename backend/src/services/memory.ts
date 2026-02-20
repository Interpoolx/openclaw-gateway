/**
 * services/memory.ts — Feature 1: Persistent Agent Memory
 *
 * HOW TO USE:
 *
 * 1. After a task/conversation ends, trigger extraction:
 *
 *    const msgs = await db.select().from(messages).where(eq(messages.taskId, id))
 *    const conversation = msgs.map(m => ({ role: m.userId ? 'user' : 'assistant', content: m.content }))
 *    const extracted = await extractMemoriesFromConversation(conversation, env.ANTHROPIC_KEY)
 *    await saveMemories(db, workspaceId, userId, agentId, taskId, extracted)
 *
 * 2. Before creating a new agent session, inject memories:
 *
 *    const memories = await getActiveMemories(db, workspaceId, userId, agentId, 12)
 *    const memBlock  = buildMemorySystemPrompt(memories)
 *    const systemPrompt = memBlock + existingSystemPrompt
 */

import { eq, and, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as ext from '../db/schema-additions';

type DB = DrizzleD1Database<Record<string, unknown>>;

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryCategory =
  | 'profile'        // "My name is Alex", "I'm a software engineer"
  | 'preference'     // "I prefer concise answers", "Use TypeScript"
  | 'ownership'      // "I use a Mac", "I have a cat named Luna"
  | 'assistant_pref' // "Always show code examples", "Respond in French"
  | 'explicit';      // User said "remember that..." / "always..."

export interface ExtractedMemory {
  category:   MemoryCategory;
  content:    string;
  confidence: number; // 0.0 – 1.0
}

// ─── Extraction via Claude Haiku ──────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a memory extractor for an AI assistant platform. Analyze this conversation and extract memorable, reusable facts about the user.

Return ONLY a JSON array — no markdown, no preamble, no backticks.

Each item: { "category": string, "content": string, "confidence": number }

Categories:
- "profile"        → personal facts (name, job, location, background, age)
- "preference"     → how they like things done (language, style, format, brevity)
- "ownership"      → tools/services/products they use or own
- "assistant_pref" → how they want the AI to behave
- "explicit"       → they explicitly said "remember", "always", "never", "I want you to know"

Confidence scores:
- 0.99 → explicit ("remember that...")
- 0.95 → profile (stated facts)
- 0.90 → ownership
- 0.85 → assistant_pref
- 0.80 → preference (implied)

Rules:
- Only extract clear, specific, reusable facts — not one-off task details
- Skip vague or context-specific statements
- Return [] if nothing worthy is found`;

export async function extractMemoriesFromConversation(
  messages:     Array<{ role: 'user' | 'assistant'; content: string }>,
  anthropicKey: string,
  strictness:   'strict' | 'standard' | 'relaxed' = 'standard',
): Promise<ExtractedMemory[]> {
  const recent = messages.slice(-20);
  if (recent.length < 2) return [];

  const minConf = strictness === 'strict' ? 0.95 : strictness === 'relaxed' ? 0.70 : 0.80;

  const conversation = recent
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:     EXTRACTION_SYSTEM,
        messages:   [{ role: 'user', content: conversation }],
      }),
    });

    if (!response.ok) {
      console.error('[memory] extraction API error:', response.status);
      return [];
    }

    const data = await response.json() as { content: Array<{ type: string; text?: string }> };
    const text = data.content?.find(b => b.type === 'text')?.text ?? '[]';

    const raw = JSON.parse(text.replace(/```json|```/g, '').trim()) as ExtractedMemory[];
    return raw.filter(m => m.confidence >= minConf && m.content?.length > 5);
  } catch (err) {
    console.error('[memory] extraction failed:', err);
    return [];
  }
}

// ─── Jaccard deduplication ────────────────────────────────────────────────────

function tokenize(s: string): Set<string> {
  return new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 2));
}

function jaccard(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const inter = [...ta].filter(t => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : inter / union;
}

// ─── Save memories ────────────────────────────────────────────────────────────

export async function saveMemories(
  db:          DB,
  workspaceId: string,
  userId:      string,
  agentId:     string | null,
  taskId:      string | null,
  memories:    ExtractedMemory[],
): Promise<number> {
  if (!memories.length) return 0;

  // Load existing active memory contents for dedup
  const existing = await db
    .select({ content: ext.agentMemories.content })
    .from(ext.agentMemories)
    .where(and(
      eq(ext.agentMemories.workspaceId, workspaceId),
      eq(ext.agentMemories.userId, userId),
      eq(ext.agentMemories.isActive, true),
    ));

  let saved = 0;
  const now = new Date().toISOString();

  for (const m of memories) {
    // Skip near-duplicates (>75% Jaccard similarity)
    const isDuplicate = existing.some(e => jaccard(e.content, m.content) > 0.75);
    if (isDuplicate) continue;

    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(ext.agentMemories).values({
      id,
      workspaceId,
      userId,
      agentId:    agentId ?? undefined,
      taskId:     taskId ?? undefined,
      category:   m.category,
      content:    m.content,
      confidence: m.confidence,
      source:     'auto',
      isActive:   true,
      timesUsed:  0,
      createdAt:  now,
      updatedAt:  now,
    });

    existing.push({ content: m.content });
    saved++;
  }

  return saved;
}

// ─── Retrieve memories ────────────────────────────────────────────────────────

export async function getActiveMemories(
  db:          DB,
  workspaceId: string,
  userId:      string,
  agentId:     string | null,
  limit        = 12,
): Promise<ext.AgentMemory[]> {
  return db
    .select()
    .from(ext.agentMemories)
    .where(and(
      eq(ext.agentMemories.workspaceId, workspaceId),
      eq(ext.agentMemories.userId, userId),
      eq(ext.agentMemories.isActive, true),
    ))
    .orderBy(desc(ext.agentMemories.confidence), desc(ext.agentMemories.createdAt))
    .limit(limit) as Promise<ext.AgentMemory[]>;
}

// ─── Build system prompt block ────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  profile:        'About the user',
  preference:     'User preferences',
  ownership:      'Tools & environment',
  assistant_pref: 'How to behave',
  explicit:       'Explicitly remembered',
};

export function buildMemorySystemPrompt(memories: ext.AgentMemory[]): string {
  if (!memories.length) return '';

  const groups: Record<string, string[]> = {};
  for (const m of memories) {
    const cat = m.category as string;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m.content);
  }

  const sections = Object.entries(groups)
    .map(([cat, items]) =>
      `### ${CATEGORY_LABELS[cat] ?? cat}\n${items.map(i => `- ${i}`).join('\n')}`
    )
    .join('\n\n');

  return `<memory>\nFacts remembered from previous sessions with this user:\n\n${sections}\n</memory>\n\n`;
}

// ─── Mark memories as used ────────────────────────────────────────────────────

export async function markMemoriesUsed(
  db:  DB,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const now = new Date().toISOString();
  for (const id of ids) {
    await db
      .update(ext.agentMemories)
      .set({ lastUsedAt: now })
      .where(eq(ext.agentMemories.id, id))
      .catch(() => {});
  }
}
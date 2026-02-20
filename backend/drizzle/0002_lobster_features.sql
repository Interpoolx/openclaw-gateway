-- ============================================================
-- Migration: 0002_lobster_features.sql
-- Run AFTER the base schema.sql
--
-- Apply:
--   npx wrangler d1 execute openclaw_admin --remote \
--     --file=./drizzle/0002_lobster_features.sql
-- ============================================================

-- ─── Feature 1: Agent Memories ───────────────────────────────
CREATE TABLE IF NOT EXISTS agent_memories (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  agent_id      TEXT,
  task_id       TEXT,
  category      TEXT NOT NULL CHECK (category IN ('profile','preference','ownership','assistant_pref','explicit')),
  content       TEXT NOT NULL,
  confidence    REAL DEFAULT 0.8,
  source        TEXT DEFAULT 'auto' CHECK (source IN ('auto','explicit')),
  is_active     INTEGER DEFAULT 1,
  times_used    INTEGER DEFAULT 0,
  last_used_at  TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_workspace_user ON agent_memories(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_memories_agent ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_active ON agent_memories(is_active, confidence DESC);

-- ─── Feature 2: Scheduled Tasks ──────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_task_defs (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  agent_id       TEXT,
  name           TEXT NOT NULL,
  description    TEXT,
  cron_expr      TEXT NOT NULL,
  task_template  TEXT NOT NULL,
  timezone       TEXT DEFAULT 'UTC',
  is_enabled     INTEGER DEFAULT 1,
  last_fired_at  TEXT,
  next_fire_at   TEXT,
  last_task_id   TEXT,
  total_fired    INTEGER DEFAULT 0,
  created_at     TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at     TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sched_workspace ON scheduled_task_defs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sched_enabled ON scheduled_task_defs(is_enabled);

CREATE TABLE IF NOT EXISTS scheduled_task_runs (
  id        TEXT PRIMARY KEY,
  def_id    TEXT NOT NULL,
  task_id   TEXT,
  status    TEXT NOT NULL CHECK (status IN ('fired','task_created','error')),
  error     TEXT,
  fired_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_runs_def ON scheduled_task_runs(def_id);

-- ─── Feature 3: Tool Approvals ───────────────────────────────
CREATE TABLE IF NOT EXISTS tool_approvals (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  task_id       TEXT,
  agent_id      TEXT,
  tool          TEXT NOT NULL,
  params        TEXT DEFAULT '{}',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  scope         TEXT DEFAULT 'once' CHECK (scope IN ('once','session','always')),
  expires_at    TEXT,
  decided_at    TEXT,
  decided_by    TEXT,
  requested_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_user_status ON tool_approvals(workspace_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_task ON tool_approvals(task_id);

CREATE TABLE IF NOT EXISTS tool_permissions (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  tool          TEXT NOT NULL,
  allowed       INTEGER DEFAULT 1,
  scope         TEXT DEFAULT 'always',
  granted_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at    TEXT,
  UNIQUE(workspace_id, user_id, tool)
);

CREATE INDEX IF NOT EXISTS idx_permissions_user ON tool_permissions(workspace_id, user_id);
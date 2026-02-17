Backend API errors

# OpenClaw Gateway Diagnostics

## 2) Check System Health

**Endpoint:** `/api/openclaw/gateway-health`

**Status:** `Connected=yes` | `Metadata=limited (agents-only)`

> ⚠️ **Gateway access is blocked by configuration**
> Origin is rejected. Add this app URL to `gateway.controlUi.allowedOrigins` or open the Control UI from the gateway host.

<details><summary>Diagnostics (36 items)</summary>_36 diagnostic entries_</details>

---

## 3) Fetch Config

**Endpoint:** `/api/openclaw/gateway-config`

> ❌ Request failed with status code `502`

---

## 4) Update Config

**Endpoint:** `/api/openclaw/gateway-config-update`

> ❌ Request failed with status code `503`

---

## 5) Fetch Agents

**Endpoint:** `/api/openclaw/gateway-agents`

**Status:** Fetched **1** agent(s)

<details><summary>Diagnostics (4 items)</summary>_4 diagnostic entries_</details>

---

## 6) Fetch Channels

**Endpoint:** `/api/openclaw/gateway-channels`

**Status:** Fetched **0** channels

> ⚠️ **Gateway access is blocked by configuration**
> Origin is rejected. Add this app URL to `gateway.controlUi.allowedOrigins` or open the Control UI from the gateway host.

<details><summary>Diagnostics (36 items)</summary>_36 diagnostic entries_</details>

---

## 7–13) Fetch Endpoints

| # | Endpoint | Status | Source | Diagnostics |
|---|---|---|---|---|
| 7 | `gateway-chat-messages` | 0 chat messages | cli | 17 items |
| 8 | `gateway-sessions` | 0 sessions | cli | 18 items |
| 9 | `gateway-workspace-files` | 0 workspace files | cli | 17 items |
| 10 | `gateway-usage` | 0 usage entries | cli | 22 items |
| 11 | `gateway-cron-jobs` | 0 cron jobs | cli | 20 items |
| 12 | `gateway-skills` | 0 skills | cli | 18 items |
| 13 | `gateway-logs` | 0 log entries | cli | 18 items |


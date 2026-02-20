/**
 * frontend/src/lib/connection-config.ts
 *
 * Config-driven local/remote mode switching for the OpenClaw dashboard.
 *
 * LOCAL mode
 *   Browser WS → Vite proxy (/openclaw-ws) → ws://127.0.0.1:18789
 *   Token: VITE_OPENCLAW_TOKEN from .env.local (never deployed to production)
 *   Use when: running the dashboard on the same machine as the gateway.
 *
 * REMOTE mode
 *   Browser WS → wss://your-worker.dev/api/gateway/ws?workspaceId=xxx
 *   Auth: same user JWT you already use for API calls (localStorage 'heyclaw_token')
 *   Worker reads gatewayUrl + gatewayToken from D1 and proxies upstream.
 *   Gateway token NEVER leaves the worker.
 *   Use when: exposing via Cloudflare Tunnel or any remote deployment.
 *
 * Config is persisted in localStorage under 'oc_conn_cfg'.
 * Call applyStoredConfig() once on app boot (in App.tsx or main.tsx).
 */

import { gatewayClient } from './gateway-client'

export type ConnectionMode = 'local' | 'remote'

export interface ConnectionConfig {
  mode:        ConnectionMode
  workspaceId: string   // which workspace to proxy to in remote mode
  backendUrl:  string   // e.g. "https://openclaw-admin-backend.workers.dev"
}

const STORAGE_KEY    = 'oc_conn_cfg'
const LOCAL_WS_PATH  = '/openclaw-ws'  // Vite proxy target

// ── Defaults ──────────────────────────────────────────────────────────────────

function defaults(): ConnectionConfig {
  return {
    mode:        'local',
    workspaceId: '',
    backendUrl:  '',
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────

export function loadConnectionConfig(): ConnectionConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults(), ...JSON.parse(raw) } as ConnectionConfig
  } catch {}
  return defaults()
}

export function saveConnectionConfig(cfg: ConnectionConfig): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)) } catch {}
}

// ── Apply config to gatewayClient ─────────────────────────────────────────────

export function applyConnectionConfig(cfg: ConnectionConfig): void {
  if (cfg.mode === 'local') {
    // Local: Vite proxy, token from .env.local
    const localToken = (import.meta.env.VITE_OPENCLAW_TOKEN as string | undefined) ?? ''
    gatewayClient.setCredentials(LOCAL_WS_PATH, localToken)
    gatewayClient.setRemoteMode(false, null, null)
  } else {
    // Remote: Worker proxy. User JWT from localStorage['heyclaw_token'] is used
    // as the Authorization header. The worker looks up the workspace's
    // gatewayToken from D1 and injects it upstream — never sent to browser.
    const userToken  = getUserToken()
    const wsUrl      = toWsUrl(cfg.backendUrl) + '/api/gateway/ws'
    const fullUrl    = cfg.workspaceId
      ? `${wsUrl}?workspaceId=${encodeURIComponent(cfg.workspaceId)}&token=${encodeURIComponent(userToken)}`
      : `${wsUrl}?token=${encodeURIComponent(userToken)}`

    // In remote mode we pass the full URL with token as query param
    // (browser WebSocket API does not support custom headers)
    gatewayClient.setCredentials(fullUrl, '')
    gatewayClient.setRemoteMode(true, cfg.backendUrl, cfg.workspaceId)
  }
}

export function applyStoredConfig(): ConnectionConfig {
  const cfg = loadConnectionConfig()
  applyConnectionConfig(cfg)
  return cfg
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** https:// → wss://, http:// → ws:// */
function toWsUrl(url: string): string {
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return url.replace(/\/$/, '')
  }
  return url
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
    .replace(/\/$/, '')
}

function getUserToken(): string {
  return localStorage.getItem('heyclaw_token')
    ?? localStorage.getItem('token')
    ?? ''
}

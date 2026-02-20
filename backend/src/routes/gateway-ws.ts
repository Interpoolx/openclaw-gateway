/**
 * src/routes/gateway-ws.ts
 *
 * WebSocket proxy route: GET /api/gateway/ws
 *
 * How to use:
 *   1. Copy this file to backend/src/routes/gateway-ws.ts
 *   2. Copy src/lib/gateway-ws/ folder to backend/src/lib/gateway-ws/
 *   3. Add two lines to backend/src/index.ts (see bottom of this file)
 *
 * What this does:
 *   - Browser connects to wss://your-worker.dev/api/gateway/ws?workspaceId=xxx
 *   - Worker validates the existing user JWT (same auth as all other routes)
 *   - Worker checks the user is a member of that workspace
 *   - Worker reads gatewayUrl + gatewayToken from D1 workspaces table
 *   - Worker opens a second WS to the gateway, injects the token server-side
 *   - Worker pipes frames bidirectionally — gateway token NEVER sent to browser
 *
 * The frontend switches between:
 *   Local mode:  ws://localhost:5173/openclaw-ws  (Vite proxy → :18789 direct)
 *   Remote mode: wss://your-worker.dev/api/gateway/ws?workspaceId=xxx  (this route)
 */

import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { getDb, getUserFromToken } from '../middleware/auth'
import { startGatewayProxy } from '../lib/gateway-ws'
import * as schema from '../db/schema'

// Match your existing Env interface from index.ts
interface Env {
  DB: D1Database
  OPENCLAW_URL: string
  OPENCLAW_API_KEY: string
  OPENCLAW_MODE: string
  JWT_SECRET: string
}

const gatewayWsRoute = new Hono<{ Bindings: Env }>()

/**
 * GET /api/gateway/ws
 *
 * Query params:
 *   workspaceId  (required) — which workspace's gateway to connect to
 *
 * Headers:
 *   Authorization: Bearer <userId>   — same token used by all other API calls
 *
 * In local mode the frontend ignores this route entirely and connects
 * directly via the Vite proxy. This route only handles remote mode.
 */
gatewayWsRoute.get('/', async (c) => {
  // ── 1. Must be a WebSocket upgrade ────────────────────────────────────────
  const upgrade = c.req.header('Upgrade')
  if (upgrade?.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426)
  }

  // ── 2. Validate user auth (same mechanism as every other route) ────────────
  const user = await getUserFromToken(c)
  if (!user) {
    return new Response('Unauthorized: invalid or missing token', { status: 401 })
  }

  // ── 3. Require workspaceId ─────────────────────────────────────────────────
  const workspaceId = c.req.query('workspaceId')
  if (!workspaceId) {
    return new Response('workspaceId query param is required', { status: 400 })
  }

  // ── 4. Look up workspace — user must be a member ───────────────────────────
  const db = getDb(c.env)

  const [result] = await db
    .select({
      gatewayUrl:   schema.workspaces.gatewayUrl,
      gatewayToken: schema.workspaces.gatewayToken,
      workspaceName: schema.workspaces.name,
    })
    .from(schema.workspaces)
    .innerJoin(
      schema.workspaceMembers,
      eq(schema.workspaces.id, schema.workspaceMembers.workspaceId)
    )
    .where(
      and(
        eq(schema.workspaces.id, workspaceId),
        eq(schema.workspaceMembers.userId, user.userId)
      )
    )

  if (!result) {
    return new Response('Workspace not found or access denied', { status: 404 })
  }

  if (!result.gatewayUrl || !result.gatewayToken) {
    return new Response(
      'This workspace has no gateway configured. Set gatewayUrl and gatewayToken in workspace settings.',
      { status: 422 }
    )
  }

  // ── 5. Create WebSocket pair ───────────────────────────────────────────────
  // clientSocket  → returned to browser
  // serverSocket  → we hold, connect to gateway, pipe frames
  const { 0: clientSocket, 1: serverSocket } = new WebSocketPair()
  serverSocket.accept()

  // ── 6. Start the bidirectional proxy ──────────────────────────────────────
  // gatewayToken is injected into the upstream connect frame server-side.
  // It is NEVER forwarded to clientSocket (the browser).
  startGatewayProxy({
    upstreamUrl:  result.gatewayUrl,
    gatewayToken: result.gatewayToken,
    clientSocket: serverSocket,
    onConnect: () => {
      console.log(`[gateway-ws] Connected: user=${user.userId} workspace=${workspaceId} upstream=${result.gatewayUrl}`)
    },
    onDisconnect: (code, reason) => {
      console.log(`[gateway-ws] Disconnected: code=${code} reason=${reason.slice(0, 80)}`)
    },
    onError: (msg) => {
      console.error(`[gateway-ws] Error: ${msg}`)
    },
  })

  // ── 7. Return 101 Switching Protocols ─────────────────────────────────────
  return new Response(null, {
    status:    101,
    webSocket: clientSocket,
  })
})

export default gatewayWsRoute

/**
 * ════════════════════════════════════════════════════════
 * HOW TO WIRE THIS INTO backend/src/index.ts
 * ════════════════════════════════════════════════════════
 *
 * Add these two lines near the bottom of index.ts,
 * BEFORE the `export default app` line:
 *
 *   import gatewayWsRoute from './routes/gateway-ws'
 *   app.route('/api/gateway/ws', gatewayWsRoute)
 *
 * That's it. One import, one route mount.
 * ════════════════════════════════════════════════════════
 */

/**
 * lib/gateway-ws/proxy.ts
 *
 * Bidirectional WebSocket proxy: Browser ↔ Cloudflare Worker ↔ OpenClaw Gateway
 *
 * Security model:
 *   - Browser sends its user JWT (Authorization header or ?token= query param)
 *   - Worker validates the JWT, looks up workspace membership in D1
 *   - Worker reads gatewayToken from D1 and injects it into the upstream connect frame
 *   - The gateway token NEVER travels to the browser
 *
 * Usage: call startGatewayProxy() after serverSocket.accept()
 */

interface ConnectFrame {
  type:   'req';
  id:     string;
  method: 'connect';
  params: {
    auth?:   { token?: string };
    client?: { id?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
}

function isConnectFrame(obj: unknown): obj is ConnectFrame {
  if (typeof obj !== 'object' || obj === null) return false;
  const f = obj as Record<string, unknown>;
  return f.type === 'req' && f.method === 'connect';
}

/** Inject real gateway token + safe client identity into the connect frame */
function injectToken(frame: ConnectFrame, gatewayToken: string): string {
  const { device: _device, auth: _auth, client: inputClient, ...restParams } = frame.params as ConnectFrame['params'] & {
    device?: unknown;
  };

  return JSON.stringify({
    ...frame,
    params: {
      ...restParams,
      auth: { token: gatewayToken },
      client: {
        ...(inputClient ?? {}),
        id:          'clawpute-backend-proxy',  // avoids device-signature-stale 1008
        displayName: 'Clawpute Worker Proxy',
        version:     '1.0.0',
        platform:    'cloudflare-worker',
        mode:        'operator',
      },
    },
  });
}

export interface GatewayProxyOptions {
  upstreamUrl:   string;    // ws:// or wss:// of the OpenClaw gateway
  gatewayToken:  string;    // from workspaces.gateway_token in D1
  clientSocket:  WebSocket; // the serverSocket from WebSocketPair (already accepted)
  onConnect?:    () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?:      (msg: string) => void;
}

export function startGatewayProxy(opts: GatewayProxyOptions): void {
  const { gatewayToken, clientSocket } = opts;
  const upstreamUrl = normalizeUpstreamUrl(opts.upstreamUrl);

  let upstream: WebSocket | null = null;
  let upstreamReady = false;
  const pendingFrames: string[] = [];

  // Connect to upstream gateway
  try {
    upstream = new WebSocket(upstreamUrl);
  } catch (err) {
    clientSocket.close(1011, `Upstream connect failed: ${String(err)}`);
    return;
  }

  // Upstream → Browser
  upstream.addEventListener('open', () => {
    upstreamReady = true;
    for (const frame of pendingFrames) upstream!.send(frame);
    pendingFrames.length = 0;
    opts.onConnect?.();
  });

  upstream.addEventListener('message', (ev: MessageEvent) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(ev.data as string);
    }
  });

  upstream.addEventListener('close', (ev: CloseEvent) => {
    opts.onDisconnect?.(ev.code, ev.reason);
    if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close(ev.code, ev.reason);
  });

  upstream.addEventListener('error', () => {
    opts.onError?.('Upstream WebSocket error');
    clientSocket.close(1011, 'Upstream error');
  });

  // Browser → Upstream
  clientSocket.addEventListener('message', (ev: MessageEvent) => {
    const raw = ev.data as string;
    let outbound = raw;

    // Intercept connect frame — inject real gateway token
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isConnectFrame(parsed)) {
        outbound = injectToken(parsed, gatewayToken);
      }
    } catch {
      // Not JSON or not a connect frame — pass through unchanged
    }

    if (upstreamReady && upstream && upstream.readyState === WebSocket.OPEN) {
      upstream.send(outbound);
    } else {
      pendingFrames.push(outbound);
    }
  });

  clientSocket.addEventListener('close', (ev: CloseEvent) => {
    if (upstream && upstream.readyState === WebSocket.OPEN) upstream.close(ev.code, ev.reason);
  });

  clientSocket.addEventListener('error', () => {
    upstream?.close(1011, 'Client error');
  });
}

function normalizeUpstreamUrl(url: string): string {
  if (url.startsWith('wss://') || url.startsWith('ws://')) return url;
  if (url.startsWith('https://')) return `wss://${url.slice('https://'.length)}`;
  if (url.startsWith('http://')) return `ws://${url.slice('http://'.length)}`;
  return `ws://${url}`;
}

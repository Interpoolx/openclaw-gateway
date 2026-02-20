/**
 * useOpenClawWebSocket - Direct browser WebSocket connection to OpenClaw Gateway
 *
 * Implements the OpenClaw challenge-response authentication protocol:
 *   1. Connect to WebSocket endpoint
 *   2. Receive `connect.challenge` event from server
 *   3. Respond with `{type: 'req', method: 'connect', ...}` message
 *   4. Receive `connect.ready` event confirming authentication
 *
 * FIXED: client.platform must be "linux" | "macos" | "windows" | "ios" | "android"
 *        NOT "browser" — the gateway validates platform against a strict enum.
 *        client.mode must be "operator" for operator role, "node" for node role.
 *        device.nonce must be included (echoed from the challenge).
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export type WsConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'challenged'
  | 'authenticating'
  | 'connected'
  | 'error'
  | 'disconnected';

export interface WsDiagnosticEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

export interface UseOpenClawWebSocketConfig {
  serverUrl: string;
  gatewayToken: string;
  sessionKey?: string;
  password?: string;
  role?: 'operator' | 'node';
  mode?: string;
  timeout?: number;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export interface UseOpenClawWebSocketReturn {
  status: WsConnectionStatus;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  diagnostics: WsDiagnosticEntry[];
  gatewayVersion: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: Record<string, unknown>) => boolean;
  testConnection: () => Promise<{
    success: boolean;
    message: string;
    version?: string;
    diagnostics: WsDiagnosticEntry[];
  }>;
}

/**
 * Convert HTTP/HTTPS URL to WebSocket URL
 */
function toWsUrl(url: string): string {
  let wsUrl = url.replace(/\/$/, '');
  if (wsUrl.startsWith('http://')) {
    wsUrl = wsUrl.replace('http://', 'ws://');
  } else if (wsUrl.startsWith('https://')) {
    wsUrl = wsUrl.replace('https://', 'wss://');
  } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
    wsUrl = `ws://${wsUrl}`;
  }
  return wsUrl;
}

function addDiag(
  list: WsDiagnosticEntry[],
  message: string,
  type: WsDiagnosticEntry['type'] = 'info'
): WsDiagnosticEntry[] {
  return [...list, { timestamp: Date.now(), message, type }];
}

/**
 * Clean Gateway Token - remove Bearer prefix and whitespace
 */
function cleanToken(token: string): string {
  if (!token) return '';
  return token.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Parse OpenClaw Setup Code (Base64 JSON)
 * Standard format: {"url": "...", "token": "..."}
 */
export function parseSetupCode(code: string): { url: string; token: string } | null {
  try {
    const decoded = atob(code.trim());
    const data = JSON.parse(decoded);
    if (data.url && data.token) {
      return { url: data.url, token: data.token };
    }
  } catch (e) {
    try {
      const cleaned = code.trim().replace(/^openclaw:\/\/setup\//i, '');
      const decoded = atob(cleaned);
      const data = JSON.parse(decoded);
      if (data.url && data.token) {
        return { url: data.url, token: data.token };
      }
    } catch (e2) { }
  }
  return null;
}

/**
 * Get or generate a stable device ID and Ed25519 keypair for this browser.
 * Aligns with OpenClaw Protocol 3 (V3) requirements.
 */
interface DeviceIdentity {
  id: string;
  publicKey: string;
  privateKey?: CryptoKey;
}

let cachedIdentity: DeviceIdentity | null = null;

export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (cachedIdentity) return cachedIdentity;

  const IDENTITY_KEY = 'openclaw-device-identity-v1';
  let identityData: any = null;

  try {
    const stored = localStorage.getItem(IDENTITY_KEY);
    if (stored) identityData = JSON.parse(stored);
  } catch (e) { }

  if (identityData?.privateKeyJwk && identityData?.publicKeyBase64) {
    try {
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        identityData.privateKeyJwk,
        { name: 'Ed25519' },
        true,
        ['sign']
      );

      cachedIdentity = {
        id: identityData.deviceId,
        publicKey: identityData.publicKeyBase64,
        privateKey
      };
      return cachedIdentity;
    } catch (e) {
      console.error("[OpenClaw] Failed to import stored key, re-generating...", e);
    }
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );

  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKeySpki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeySpki)));

  const deviceId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const newIdentity = {
    version: 1,
    deviceId,
    publicKeyBase64,
    privateKeyJwk,
    createdAtMs: Date.now()
  };

  localStorage.setItem(IDENTITY_KEY, JSON.stringify(newIdentity));

  cachedIdentity = {
    id: deviceId,
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey
  };

  return cachedIdentity;
}

/**
 * Sign a challenge nonce using the device's private key.
 */
export async function signHandshake(nonce: string, ts: number): Promise<string> {
  const identity = await getDeviceIdentity();
  if (!identity.privateKey) throw new Error("Private key not available for signing");

  const message = `${nonce}:${ts}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    identity.privateKey,
    data
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Build a valid connect request params object per OpenClaw Protocol 3.
 *
 * IMPORTANT - validated enum values from https://docs.openclaw.ai/gateway/protocol:
 *
 *   client.id:
 *     - "cli"      for operator role (CLI / web UI / automation)
 *     - "ios-node" | "android-node" | "macos-node" etc for node role
 *
 *   client.platform: must be one of the gateway's allowed platform constants.
 *     - "linux" | "macos" | "windows" | "ios" | "android"
 *     - "browser" is NOT a valid value — use "linux" for web clients
 *
 *   client.mode: must match the role exactly:
 *     - "operator" when role === "operator"
 *     - "node"     when role === "node"
 *
 *   device.nonce: MUST echo back the nonce from the connect.challenge event.
 */
function buildConnectParams(
  role: 'operator' | 'node',
  cleanedToken: string,
  identity: DeviceIdentity,
  signature: string,
  nonce: string,
  ts: number,
  password?: string
) {
  const isNode = role === 'node';

  const params: Record<string, unknown> = {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: isNode ? 'headless-node' : 'cli',       // "cli" for operators per docs
      version: '2.0.0',
      platform: 'linux',                           // FIX: "browser" is invalid; use "linux" for web clients
      mode: isNode ? 'node' : 'operator',          // must match role exactly
    },
    role: role,
    scopes: isNode
      ? []
      : ['operator.read', 'operator.write'],
    caps: isNode ? ['canvas', 'camera', 'screen', 'location'] : [],
    commands: isNode
      ? ['canvas.navigate', 'canvas.eval', 'canvas.snapshot', 'screen.record', 'location.get']
      : [],
    permissions: isNode
      ? { 'camera.capture': false, 'screen.record': false }
      : {},
    auth: { token: cleanedToken },
    locale: 'en-US',
    userAgent: 'openclaw-browser/2.0.0',
    device: {
      id: identity.id,
      publicKey: identity.publicKey,
      signature: signature,
      signedAt: ts,
      nonce: nonce,                               // FIX: must echo back the challenge nonce
    },
  };

  if (password) {
    (params.auth as any).password = password;
  }

  return params;
}

export function useOpenClawWebSocket(
  config: UseOpenClawWebSocketConfig
): UseOpenClawWebSocketReturn {
  const {
    serverUrl,
    gatewayToken,
    sessionKey = 'agent:main:main',
    password = '',
    role = 'operator',
    mode = 'operator',
    timeout = 10000,
    autoReconnect = false,
    reconnectDelay = 3000,
  } = config;

  const [status, setStatus] = useState<WsConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<WsDiagnosticEntry[]>([]);
  const [gatewayVersion, setGatewayVersion] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus('disconnected');
  }, [cleanup]);

  const connect = useCallback(async () => {
    cleanup();

    if (!gatewayToken?.trim()) {
      setError('Gateway Token is required');
      setStatus('error');
      setDiagnostics((prev) =>
        addDiag(prev, 'Missing gateway token', 'error')
      );
      return;
    }

    const wsUrl = toWsUrl(serverUrl);
    const cleanedToken = cleanToken(gatewayToken);
    const identity = await getDeviceIdentity();

    setStatus('connecting');
    setError(null);
    setGatewayVersion(null);
    setDiagnostics([
      { timestamp: Date.now(), message: `Connecting to ${wsUrl}...`, type: 'info' },
      { timestamp: Date.now(), message: `Device ID: ${identity.id.slice(0, 8)}... (${role})`, type: 'info' },
    ]);

    try {
      const wsUrlWithAuth = `${wsUrl}?token=${encodeURIComponent(cleanedToken)}`;
      const ws = new WebSocket(wsUrlWithAuth);
      wsRef.current = ws;

      timeoutRef.current = setTimeout(() => {
        setDiagnostics((prev) =>
          addDiag(prev, `Connection timeout after ${timeout}ms`, 'error')
        );
        setError(`Connection timeout after ${timeout / 1000}s`);
        setStatus('error');
        ws.close();
      }, timeout);

      ws.addEventListener('open', () => {
        setDiagnostics((prev) =>
          addDiag(prev, '✓ WebSocket opened, waiting for challenge...', 'success')
        );
      });

      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'event' && data.event === 'connect.challenge') {
            const { nonce, ts } = data.payload || {};
            setStatus('challenged');
            setDiagnostics((prev) =>
              addDiag(prev, '🔐 Received connect.challenge, signing handshake...', 'info')
            );

            void (async () => {
              try {
                const signature = await signHandshake(nonce, ts);
                const identity = await getDeviceIdentity();

                const connectRequest = {
                  type: 'req',
                  id: `auth-${Date.now()}`,
                  method: 'connect',
                  params: buildConnectParams(role, cleanedToken, identity, signature, nonce, ts, password),
                };

                ws.send(JSON.stringify(connectRequest));
                setStatus('authenticating');
                setDiagnostics((prev) =>
                  addDiag(prev, `↗ Signed handshake sent (role=${role}, platform=linux, mode=${role})`, 'info')
                );
              } catch (signErr) {
                setDiagnostics((prev) =>
                  addDiag(
                    prev,
                    `✗ Signing failed: ${signErr instanceof Error ? signErr.message : 'Unknown'}`,
                    'error'
                  )
                );
                setError('Cryptographic signing failed');
                setStatus('error');
              }
            })();
            return;
          }

          if (data.type === 'event' && data.event === 'connect.ready') {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setStatus('connected');
            setError(null);

            if (data.payload?.version) {
              setGatewayVersion(data.payload.version);
            }

            setDiagnostics((prev) =>
              addDiag(prev, `🎉 Authenticated as ${role}! Connection ready.`, 'success')
            );
            return;
          }

          if (data.error || data.type === 'error') {
            const errMsg =
              typeof data.error === 'string'
                ? data.error
                : data.error?.message || data.message || 'Unknown server error';
            setDiagnostics((prev) =>
              addDiag(prev, `✗ Server error: ${errMsg}`, 'error')
            );
            setError(errMsg);
            setStatus('error');
            return;
          }

          if (data.type === 'res') {
            if (!data.ok && data.error) {
              const errMsg = data.error?.message || 'Request failed';
              setDiagnostics((prev) =>
                addDiag(prev, `✗ Response error: ${errMsg}`, 'error')
              );
              if (
                data.error?.code === 'UNAUTHORIZED' ||
                errMsg.includes('token')
              ) {
                setError(`Authentication failed: ${errMsg}`);
                setStatus('error');
              }
            }
          }
        } catch (parseErr) {
          setDiagnostics((prev) =>
            addDiag(prev, `✗ Failed to parse message: ${event.data?.substring(0, 100)}`, 'error')
          );
        }
      });

      ws.addEventListener('error', () => {
        setDiagnostics((prev) =>
          addDiag(prev, '✗ WebSocket error', 'error')
        );
      });

      ws.addEventListener('close', (event: CloseEvent) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        wsRef.current = null;

        const reason = event.reason || 'No reason provided';
        setDiagnostics((prev) =>
          addDiag(prev, `Connection closed (code: ${event.code}, reason: ${reason})`, 'warn')
        );

        if (event.code === 1008) {
          setError(`Pairing Required: Run "openclaw devices list" to see pending request, then "openclaw devices approve <requestId>"`);
          setStatus('error');
          setDiagnostics((prev) =>
            addDiag(prev, `⚠️ Device Pairing Required (${role}). Approve in gateway terminal.`, 'warn')
          );
        } else if (event.code !== 1000 && status !== 'error') {
          setError(`Connection closed (code: ${event.code})`);
          setStatus('disconnected');
        } else if (event.code === 1000) {
          if (status !== 'connected' && status !== 'error') {
            setStatus('disconnected');
          }
        }

        if (autoReconnect && event.code !== 1008 && event.code !== 1000) {
          setDiagnostics((prev) =>
            addDiag(prev, `Reconnecting in ${reconnectDelay}ms...`, 'info')
          );
          reconnectRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      });
    } catch (err) {
      setDiagnostics((prev) =>
        addDiag(
          prev,
          `✗ Failed to create WebSocket: ${err instanceof Error ? err.message : 'Unknown'}`,
          'error'
        )
      );
      setError(err instanceof Error ? err.message : 'Failed to create WebSocket');
      setStatus('error');
    }
  }, [serverUrl, gatewayToken, sessionKey, password, role, mode, timeout, cleanup, autoReconnect, reconnectDelay]);

  const sendMessage = useCallback(
    (message: Record<string, unknown>): boolean => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        return true;
      }
      return false;
    },
    []
  );

  /**
   * One-shot test connection: connects, authenticates, then disconnects.
   */
  const testConnection = useCallback((): Promise<{
    success: boolean;
    message: string;
    version?: string;
    diagnostics: WsDiagnosticEntry[];
  }> => {
    return new Promise((resolve) => {
      cleanup();

      if (!gatewayToken?.trim()) {
        const diag: WsDiagnosticEntry[] = [
          { timestamp: Date.now(), message: 'Missing gateway token', type: 'error' },
        ];
        setDiagnostics(diag);
        setStatus('error');
        setError('Gateway Token is required');
        resolve({ success: false, message: 'Gateway Token is required', diagnostics: diag });
        return;
      }

      setStatus('connecting');
      setError(null);
      setGatewayVersion(null);

      const diags: WsDiagnosticEntry[] = [];
      const pushDiag = (msg: string, type: WsDiagnosticEntry['type'] = 'info') => {
        diags.push({ timestamp: Date.now(), message: msg, type });
        setDiagnostics([...diags]);
      };

      void (async () => {
        let testWs: WebSocket | null = null;
        let resolved = false;

        const resolveOnce = (result: {
          success: boolean;
          message: string;
          version?: string;
        }) => {
          if (resolved) return;
          resolved = true;
          if (testWs && (testWs.readyState === WebSocket.OPEN || testWs.readyState === WebSocket.CONNECTING)) {
            testWs.close(1000, 'Test complete');
          }
          resolve({ ...result, diagnostics: [...diags] });
        };

        try {
          const identity = await getDeviceIdentity();
          const cleanedToken = cleanToken(gatewayToken);
          const wsUrl = toWsUrl(serverUrl);

          pushDiag(`Connecting to ${wsUrl}...`);
          pushDiag(`Device ID: ${identity.id.slice(0, 8)}... (${role})`);

          const wsUrlWithAuth = `${wsUrl}?token=${encodeURIComponent(cleanedToken)}`;
          testWs = new WebSocket(wsUrlWithAuth);

          const tid = setTimeout(() => {
            pushDiag(`Connection timeout after ${timeout}ms`, 'error');
            resolveOnce({
              success: false,
              message: `Connection timeout after ${timeout / 1000}s. Verify your OpenClaw URL and ensure the gateway is running.`,
            });
          }, timeout);

          testWs.addEventListener('open', () => {
            pushDiag('✓ WebSocket opened, waiting for challenge...', 'success');
          });

          testWs.addEventListener('message', (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);

              if (data.type === 'event' && data.event === 'connect.challenge') {
                const { nonce, ts } = data.payload || {};
                setStatus('challenged');
                pushDiag('🔐 Received challenge, signing handshake...', 'info');

                void (async () => {
                  try {
                    const signature = await signHandshake(nonce, ts);

                    const connectRequest = {
                      type: 'req',
                      id: `test-auth-${Date.now()}`,
                      method: 'connect',
                      params: buildConnectParams(role, cleanedToken, identity, signature, nonce, ts, password),
                    };

                    testWs?.send(JSON.stringify(connectRequest));
                    setStatus('authenticating');
                    pushDiag(`↗ Signed handshake sent (role=${role}, platform=linux, mode=${role})`, 'info');
                  } catch (signErr) {
                    pushDiag(`✗ Signing failed: ${signErr instanceof Error ? signErr.message : 'Unknown'}`, 'error');
                    resolveOnce({ success: false, message: 'Signing failed' });
                  }
                })();
                return;
              }

              if (data.type === 'event' && data.event === 'connect.ready') {
                clearTimeout(tid);
                const version = data.payload?.version || undefined;
                pushDiag(`🎉 Authenticated as ${role}! Connection ready.`, 'success');
                resolveOnce({
                  success: true,
                  message: `✓ Connected to OpenClaw Gateway as ${role}${version ? ` v${version}` : ''}`,
                  version,
                });
                return;
              }

              if (data.error || data.type === 'error') {
                clearTimeout(tid);
                const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Unknown error';
                pushDiag(`✗ Server error: ${errMsg}`, 'error');
                resolveOnce({ success: false, message: errMsg });
                return;
              }

              if (data.type === 'res' && !data.ok && data.error) {
                clearTimeout(tid);
                const errMsg = data.error?.message || 'Auth failed';
                pushDiag(`✗ Auth error: ${errMsg}`, 'error');
                resolveOnce({ success: false, message: `Authentication failed: ${errMsg}` });
              }
            } catch (e) {
              pushDiag('✗ Failed to parse server message', 'error');
            }
          });

          testWs.addEventListener('error', () => {
            clearTimeout(tid);
            pushDiag('✗ WebSocket connection failed', 'error');
            resolveOnce({ success: false, message: 'WebSocket connection failed' });
          });

          testWs.addEventListener('close', (event) => {
            clearTimeout(tid);
            if (event.code === 1008) {
              pushDiag('⚠️ Device Pairing Required: This device is not authorized.', 'warn');
              pushDiag(`👉 Run: openclaw devices list`, 'info');
              pushDiag(`👉 Then: openclaw devices approve <requestId>`, 'info');
              resolveOnce({
                success: false,
                message: `Device Pairing Required!\n\nYour device (${identity.id.substring(0, 8)}...) needs approval.\n\n1. Run: openclaw devices list\n2. Find your request ID\n3. Run: openclaw devices approve <requestId>`
              });
            } else if (event.code !== 1000) {
              pushDiag(`Connection closed (code: ${event.code})`, 'error');
              resolveOnce({ success: false, message: `Connection closed (code: ${event.code})` });
            }
          });

        } catch (err) {
          pushDiag(`✗ Error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
          resolveOnce({ success: false, message: 'Internal error' });
        }
      })();
    });
  }, [serverUrl, gatewayToken, password, role, timeout, cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    status,
    isConnected: status === 'connected',
    isAuthenticated: status === 'connected',
    error,
    diagnostics,
    gatewayVersion,
    connect,
    disconnect,
    sendMessage,
    testConnection,
  };
}
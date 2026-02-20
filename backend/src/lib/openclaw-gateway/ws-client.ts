import type { OpenClawAgent, OpenClawChannel, OpenClawGatewayInfo, OpenClawWsConfig, OpenClawWsResponse } from './types';
import { cleanToken, convertHttpToWs } from './url';

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractAgents(payload: any): OpenClawAgent[] {
  const source = payload?.agents ?? payload?.data ?? payload;
  const list = Array.isArray(source) ? source : [];
  return list.map((a: any) => ({
    id: a.id || a.agentId || a.name || 'unknown',
    name: a.name || a.id || a.agentId || 'Unknown Agent',
    status: a.status || 'unknown',
    model: a.model,
    workspace: a.workspace,
  }));
}

function extractChannels(payload: any): OpenClawChannel[] {
  const channels: OpenClawChannel[] = [];
  const source = payload?.channels ?? payload?.data ?? payload;

  if (Array.isArray(source)) {
    return source.map((c: any) => ({
      type: c.type || c.platform || c.channel || 'unknown',
      name: c.name || c.id || c.type || 'Unknown',
      status: c.status || 'unknown',
      id: c.id,
    }));
  }

  if (source && typeof source === 'object') {
    Object.entries(source as Record<string, any>).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        channels.push({
          type: key,
          name: value.name || value.id || key,
          status: value.status || 'unknown',
          id: value.id,
        });
      }
    });
  }

  return channels;
}

async function sendConnectRequest(
  ws: WebSocket,
  authRequestId: string,
  token: string,
  diagnostics: string[]
): Promise<void> {
  ws.send(JSON.stringify({
    type: 'req',
    id: authRequestId,
    method: 'connect',
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'webchat',
        version: '0.5.0',
        platform: 'web',
        mode: 'webchat',
      },
      role: 'operator',
      scopes: ['operator.read', 'operator.write'],
      caps: [],
      commands: [],
      permissions: {},
      auth: { token },
      locale: 'en-US',
      userAgent: 'clawpute-backend',
    },
  }));
  diagnostics.push('[WS] sent connect request');
}

type WsInvokeResult = {
  method: string;
  payload: any;
};

export async function invokeOpenClawViaWebSocketAny(
  config: OpenClawWsConfig & { methods: string[]; params?: Record<string, unknown> }
): Promise<WsInvokeResult> {
  const { serverUrl, token, methods, params = {}, timeout = 12000 } = config;
  const wsUrl = convertHttpToWs(serverUrl);
  const cleanedToken = cleanToken(token);

  return new Promise((resolve, reject) => {
    const pending = new Map<string, PendingRequest>();
    let ws: WebSocket;
    let authenticated = false;
    let authRequestId: string | null = null;
    let callIndex = 0;

    const teardown = () => {
      pending.clear();
      if (ws && ws.readyState === WebSocket.OPEN) ws.close(1000, 'done');
    };

    const timeoutId = setTimeout(() => {
      teardown();
      reject(new Error(`WebSocket invoke timeout after ${timeout}ms`));
    }, timeout);

    const request = (method: string): Promise<any> => new Promise((reqResolve, reqReject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reqReject(new Error('WebSocket not connected'));
        return;
      }
      const id = generateId();
      pending.set(id, { resolve: reqResolve, reject: reqReject });
      ws.send(JSON.stringify({ type: 'req', id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reqReject(new Error(`Request timeout for ${method}`));
        }
      }, 7000);
    });

    const runNextMethod = async () => {
      if (callIndex >= methods.length) {
        clearTimeout(timeoutId);
        teardown();
        reject(new Error('No WebSocket method candidate succeeded'));
        return;
      }
      const method = methods[callIndex++]!;
      try {
        const payload = await request(method);
        clearTimeout(timeoutId);
        teardown();
        resolve({ method, payload });
      } catch {
        await runNextMethod();
      }
    };

    try {
      ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(cleanedToken)}`);

      ws.addEventListener('message', (event: MessageEvent) => {
        let data: OpenClawWsResponse;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === 'event' && data.event === 'connect.challenge') {
          authRequestId = generateId();
          void sendConnectRequest(ws, authRequestId, cleanedToken, []);
          return;
        }

        if (data.type === 'event' && data.event === 'connect.ready' && !authenticated) {
          authenticated = true;
          void runNextMethod();
          return;
        }

        if (data.type === 'res') {
          if (data.id && pending.has(data.id)) {
            const req = pending.get(data.id)!;
            pending.delete(data.id);
            if (data.ok) req.resolve(data.payload);
            else req.reject(new Error(data.error?.message || 'request failed'));
            return;
          }

          if (!authenticated && authRequestId && data.id === authRequestId) {
            if (data.ok) {
              authenticated = true;
              void runNextMethod();
            } else {
              clearTimeout(timeoutId);
              teardown();
              reject(new Error(data.error?.message || 'Authentication failed'));
            }
            return;
          }

          if (!authenticated && data.ok) {
            authenticated = true;
            void runNextMethod();
          }
        }
      });

      ws.addEventListener('error', () => {
        clearTimeout(timeoutId);
        teardown();
        reject(new Error(`WebSocket connection failed to ${wsUrl}`));
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to create WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

export async function queryOpenClawViaWebSocket(config: OpenClawWsConfig): Promise<OpenClawGatewayInfo> {
  const { serverUrl, token, timeout = 15000 } = config;
  const wsUrl = convertHttpToWs(serverUrl);
  const cleanedToken = cleanToken(token);
  const diagnostics: string[] = [
    `[WS] Connecting to ${wsUrl}`,
    `[WS] Token length: ${cleanedToken.length}`,
  ];

  return new Promise((resolve, reject) => {
    const pending = new Map<string, PendingRequest>();
    let ws: WebSocket;
    let authenticated = false;
    let authRequestId: string | null = null;

    const teardown = () => {
      pending.clear();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'done');
      }
    };

    const timeoutId = setTimeout(() => {
      teardown();
      reject(new Error(`WebSocket connection timeout after ${timeout}ms`));
    }, timeout);

    const request = (method: string, params: Record<string, unknown> = {}): Promise<any> => {
      return new Promise((reqResolve, reqReject) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          reqReject(new Error('WebSocket not connected'));
          return;
        }
        const id = generateId();
        pending.set(id, { resolve: reqResolve, reject: reqReject });
        ws.send(JSON.stringify({ type: 'req', id, method, params }));
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            reqReject(new Error(`Request timeout for ${method}`));
          }
        }, 8000);
      });
    };

    const tryMethods = async (methods: string[]): Promise<any> => {
      let lastError: Error | null = null;
      for (const method of methods) {
        try {
          diagnostics.push(`[WS] request ${method}`);
          return await request(method, {});
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          diagnostics.push(`[WS] ${method} failed: ${lastError.message}`);
        }
      }
      throw lastError ?? new Error('No method succeeded');
    };

    const runQueries = async () => {
      const result: OpenClawGatewayInfo = { version: 'unknown' };

      try {
        const status = await tryMethods(['status']);
        const maybeVersion = status?.version || status?.gateway?.version || status?.server?.version || status?.data?.version;
        if (maybeVersion) result.version = maybeVersion;
        result.uptime = status?.uptime || status?.gateway?.uptime || status?.server?.uptime;
        const statusConfig = status?.config || status?.gateway?.config || status?.data;
        if (statusConfig && typeof statusConfig === 'object') {
          result.config = statusConfig;
          result.model = (statusConfig as any).model || (statusConfig as any).defaultModel;
          result.provider = (statusConfig as any).provider;
        }
      } catch (error) {
        diagnostics.push(`[WS] status query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        const agentsPayload = await tryMethods(['agents.list', 'agents_list']);
        const agents = extractAgents(agentsPayload);
        if (agents.length) {
          result.agents = agents;
          result.agentCount = agents.length;
        }
      } catch (error) {
        diagnostics.push(`[WS] agents query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        const channelsPayload = await tryMethods(['channels.status', 'channels.list', 'channels_status', 'channels_list']);
        const channels = extractChannels(channelsPayload);
        if (channels.length) {
          result.channels = channels;
          result.channelCount = channels.length;
        }
      } catch (error) {
        diagnostics.push(`[WS] channels query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (!result.model) {
        try {
          const configPayload = await tryMethods(['config.get', 'config_get']);
          if (configPayload && typeof configPayload === 'object') {
            result.config = configPayload;
            result.model = (configPayload as any).model || (configPayload as any).defaultModel;
            result.provider = (configPayload as any).provider;
          }
        } catch (error) {
          diagnostics.push(`[WS] config query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.diagnostics = diagnostics;
      clearTimeout(timeoutId);
      teardown();
      resolve(result);
    };

    try {
      ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(cleanedToken)}`);

      ws.addEventListener('open', () => {
        diagnostics.push('[WS] socket open');
      });

      ws.addEventListener('message', (event: MessageEvent) => {
        let data: OpenClawWsResponse;
        try {
          data = JSON.parse(event.data);
        } catch {
          diagnostics.push('[WS] failed to parse server message');
          return;
        }

        if (data.type === 'event' && data.event === 'connect.challenge') {
          diagnostics.push('[WS] received connect.challenge');
          authRequestId = generateId();
          void sendConnectRequest(ws, authRequestId, cleanedToken, diagnostics);
          return;
        }

        if (data.type === 'event' && data.event === 'connect.ready' && !authenticated) {
          authenticated = true;
          diagnostics.push('[WS] received connect.ready');
          void runQueries();
          return;
        }

        if (data.type === 'res') {
          if (data.id && pending.has(data.id)) {
            const req = pending.get(data.id)!;
            pending.delete(data.id);
            if (data.ok) req.resolve(data.payload);
            else req.reject(new Error(data.error?.message || 'request failed'));
            return;
          }

          // VibeClaw behavior: first successful auth response marks connection complete.
          if (!authenticated && authRequestId && data.id === authRequestId) {
            if (data.ok) {
              authenticated = true;
              diagnostics.push('[WS] auth response ok');
              void runQueries();
            } else {
              const errorMessage = data.error?.message || 'Authentication failed';
              if (/origin not allowed/i.test(errorMessage)) {
                diagnostics.push('[WS] gateway rejected backend websocket origin; use HTTP /tools/invoke for server-side discovery');
              }
              clearTimeout(timeoutId);
              teardown();
              reject(new Error(errorMessage));
            }
            return;
          }

          if (!authenticated && data.ok) {
            authenticated = true;
            diagnostics.push('[WS] accepted generic successful response as auth success');
            void runQueries();
            return;
          }
        }

        if (data.type === 'event' && data.event) {
          diagnostics.push(`[WS] event: ${data.event}`);
        }
      });

      ws.addEventListener('error', () => {
        clearTimeout(timeoutId);
        teardown();
        reject(new Error(`WebSocket connection failed to ${wsUrl}`));
      });

      ws.addEventListener('close', (evt: CloseEvent) => {
        if (!authenticated) {
          clearTimeout(timeoutId);
          reject(new Error(`Connection closed before authentication (code: ${evt.code})`));
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to create WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

export async function testOpenClawWebSocket(
  config: OpenClawWsConfig
): Promise<{ success: boolean; message: string; version?: string; diagnostics?: string[] }> {
  try {
    const info = await queryOpenClawViaWebSocket({ ...config, timeout: 8000 });
    return {
      success: true,
      message: `Connected to OpenClaw Gateway${info.version !== 'unknown' ? ` v${info.version}` : ''}`,
      version: info.version,
      diagnostics: info.diagnostics,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      diagnostics: [],
    };
  }
}

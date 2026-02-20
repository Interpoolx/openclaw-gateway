export type GatewayClientStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type GatewayRequestFrame = {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
};

type GatewayResponseFrame = {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { message?: string };
};

type GatewayEventFrame = {
  type: 'event';
  event: string;
  payload?: unknown;
};

type GatewayFrame = GatewayResponseFrame | GatewayEventFrame;
type Listener = (...args: unknown[]) => void;

let requestCounter = 0;

function nextId(): string {
  requestCounter += 1;
  return `gw-${Date.now()}-${requestCounter}`;
}

function createConnectFrame(token: string): GatewayRequestFrame {
  return {
    type: 'req',
    id: nextId(),
    method: 'connect',
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'openclaw-react-dashboard',
        displayName: 'OpenClaw Dashboard',
        version: '1.0.0',
        platform: 'web',
        mode: 'operator',
      },
      role: 'operator',
      scopes: ['operator.read', 'operator.write'],
      caps: [],
      commands: [],
      permissions: {},
      auth: { token },
      locale: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'dashboard',
    },
  };
}

class GatewayClient {
  private ws: WebSocket | null = null;
  private wsUrl = '/openclaw-ws';
  private token = '';
  private status: GatewayClientStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private remoteMode = false;
  private remoteBackendUrl: string | null = null;
  private remoteWorkspaceId: string | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private pending = new Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
  private wantsConnection = false;

  setCredentials(wsUrl: string, token: string): void {
    const urlChanged = wsUrl !== this.wsUrl;
    const tokenChanged = token !== this.token;
    this.wsUrl = wsUrl;
    this.token = token;
    if ((urlChanged || tokenChanged) && this.ws) {
      this.ws.close(1000, 'Reconfigure');
    }
  }

  setRemoteMode(enabled: boolean, backendUrl: string | null, workspaceId: string | null): void {
    this.remoteMode = enabled;
    this.remoteBackendUrl = backendUrl;
    this.remoteWorkspaceId = workspaceId;
  }

  getStatus(): GatewayClientStatus {
    return this.status;
  }

  getConnectionInfo(): { remoteMode: boolean; backendUrl: string | null; workspaceId: string | null; wsUrl: string } {
    return {
      remoteMode: this.remoteMode,
      backendUrl: this.remoteBackendUrl,
      workspaceId: this.remoteWorkspaceId,
      wsUrl: this.wsUrl,
    };
  }

  connect(): void {
    this.wantsConnection = true;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.openSocket();
  }

  disconnect(): void {
    this.wantsConnection = false;
    this.clearReconnectTimer();
    this.clearConnectTimeout();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }
      const id = nextId();
      const frame: GatewayRequestFrame = { type: 'req', id, method, params };
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, 15000);

      this.pending.set(id, { resolve: (value) => resolve(value as T), reject, timeout });
      this.ws.send(JSON.stringify(frame));
    });
  }

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  private openSocket(): void {
    this.clearReconnectTimer();
    this.clearConnectTimeout();
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (err) {
      this.setStatus('error', `Failed to create WebSocket: ${String(err)}`);
      this.scheduleReconnect();
      return;
    }

    this.connectTimeout = setTimeout(() => {
      this.setStatus('error', 'Handshake timeout');
      this.ws?.close(1000, 'Handshake timeout');
    }, 12000);

    this.ws.addEventListener('open', () => {
      if (!this.ws) return;
      const frame = createConnectFrame(this.token);
      this.pending.set(frame.id, {
        resolve: () => {
          this.setStatus('connected');
        },
        reject: (err) => {
          this.setStatus('error', err.message);
          this.ws?.close(1008, 'Connect failed');
        },
        timeout: setTimeout(() => {
          this.pending.delete(frame.id);
          this.setStatus('error', 'Connect response timeout');
          this.ws?.close(1008, 'Connect timeout');
        }, 10000),
      });
      this.ws.send(JSON.stringify(frame));
    });

    this.ws.addEventListener('message', (event) => {
      this.handleMessage(event.data as string);
    });

    this.ws.addEventListener('close', () => {
      this.clearConnectTimeout();
      this.setStatus('disconnected');
      this.rejectPending('WebSocket closed');
      this.ws = null;
      this.scheduleReconnect();
    });

    this.ws.addEventListener('error', () => {
      this.setStatus('error', 'WebSocket error');
    });
  }

  private handleMessage(raw: string): void {
    let frame: GatewayFrame;
    try {
      frame = JSON.parse(raw) as GatewayFrame;
    } catch {
      return;
    }

    if (frame.type === 'res') {
      const pending = this.pending.get(frame.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pending.delete(frame.id);
      this.clearConnectTimeout();
      if (frame.ok) {
        pending.resolve(frame.payload);
      } else {
        pending.reject(new Error(frame.error?.message ?? 'Gateway request failed'));
      }
      return;
    }

    if (frame.type === 'event') {
      this.emit(frame.event, frame.payload);
    }
  }

  private scheduleReconnect(): void {
    if (!this.wantsConnection) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, 3000);
  }

  private rejectPending(message: string): void {
    this.pending.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error(message));
    });
    this.pending.clear();
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearConnectTimeout(): void {
    if (!this.connectTimeout) return;
    clearTimeout(this.connectTimeout);
    this.connectTimeout = null;
  }

  private setStatus(status: GatewayClientStatus, detail?: string): void {
    this.status = status;
    this.emit('status', status, detail ?? null);
  }

  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((listener) => {
      listener(...args);
    });
  }
}

export const gatewayClient = new GatewayClient();


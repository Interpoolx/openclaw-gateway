import { convertWsToHttp } from './url';
import { invokeOpenClawViaWebSocketAny } from './ws-client';

const DEFAULT_SESSION_KEY = 'agent:main:main';
const GATEWAY_REQUEST_TIMEOUT_MS = 12000;

const CREATE_AGENT_TOOL_CANDIDATES = [
  'agents.create',
  'agents_create',
  'agents.add',
  'agents_add',
  'agents.upsert',
  'agents_upsert',
  'agent.create',
  'agent_create',
];

function cleanToken(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim();
}

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${cleanToken(token)}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function parseToolErrorMessage(body: any, fallback: string): string {
  return String(body?.error?.message || body?.message || fallback);
}

function parseJsonFromText(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function invokeGatewayTool(
  serverUrl: string,
  token: string,
  tool: string,
  args: Record<string, unknown> = {},
  dryRun = false
): Promise<{ ok: boolean; status: number; body: any; error?: string }> {
  const wsCandidates = Array.from(new Set([
    tool,
    tool.includes('_') ? tool.replace(/_/g, '.') : tool,
  ]));

  try {
    const wsResult = await invokeOpenClawViaWebSocketAny({
      serverUrl,
      token,
      methods: wsCandidates,
      params: args,
      timeout: 9000,
    });
    return { ok: true, status: 200, body: wsResult.payload };
  } catch {
    // Fall back to HTTP /tools/invoke for runtimes that only expose that path.
  }

  const baseUrl = convertWsToHttp(serverUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GATEWAY_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/tools/invoke`, {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({
        tool,
        action: 'json',
        args,
        sessionKey: DEFAULT_SESSION_KEY,
        dryRun,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, status: 0, body: null, error: `Request timeout after ${GATEWAY_REQUEST_TIMEOUT_MS}ms` };
    }
    return { ok: false, status: 0, body: null, error: error instanceof Error ? error.message : 'Network error' };
  }
  clearTimeout(timeoutId);

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body,
      error: parseToolErrorMessage(body, `HTTP ${response.status}`),
    };
  }

  return { ok: true, status: response.status, body };
}

function unwrapGatewayToolResult(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const result = payload.result ?? payload.payload ?? payload.data ?? payload;
  if (result && typeof result === 'object' && Array.isArray(result.content)) {
    const textItem = result.content.find((entry: any) => entry?.type === 'text' && typeof entry?.text === 'string');
    if (textItem?.text) {
      try {
        return JSON.parse(textItem.text);
      } catch {
        return result;
      }
    }
  }
  return result;
}

function extractArray(payload: any): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.agents,
    payload.channels,
    payload.sessions,
    payload.files,
    payload.skills,
    payload.logs,
    payload.jobs,
    payload.entries,
    payload.items,
    payload.data,
    payload.result?.items,
    payload.result?.data,
  ];

  const found = candidates.find((value) => Array.isArray(value));
  return Array.isArray(found) ? found : [];
}

export interface GatewayAgentsResult {
  success: boolean;
  connected: boolean;
  agents: Array<Record<string, unknown>>;
  diagnostics: string[];
  error?: string;
}

export async function probeGatewayAgents(serverUrl: string, token: string): Promise<GatewayAgentsResult> {
  const diagnostics: string[] = [];
  let gatewayResponded = false;

  for (const tool of ['agents.list', 'agents_list']) {
    diagnostics.push(`[tool] trying ${tool}`);
    const response = await invokeGatewayTool(serverUrl, token, tool, {});
    if (response.ok) {
      const parsed = unwrapGatewayToolResult(response.body);
      const agents = (
        (Array.isArray(parsed?.agents) && parsed.agents) ||
        (Array.isArray(parsed?.data) && parsed.data) ||
        (Array.isArray(parsed?.items) && parsed.items) ||
        (Array.isArray(parsed) ? parsed : [])
      ) as Array<Record<string, unknown>>;
      diagnostics.push(`[tool] ${tool} ok (${agents.length} agents)`);
      return { success: true, connected: true, agents, diagnostics };
    }

    if (response.status === 401) {
      diagnostics.push(`[tool] ${tool} unauthorized`);
      return { success: false, connected: false, agents: [], diagnostics, error: 'Gateway authentication failed' };
    }

    gatewayResponded = true;
    diagnostics.push(`[tool] ${tool} failed: ${response.error ?? `HTTP ${response.status}`}`);
  }

  const baseUrl = convertWsToHttp(serverUrl);
  for (const path of ['/api/agents', '/agents']) {
    diagnostics.push(`[http] trying ${path}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GATEWAY_REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${baseUrl}${path}`, {
          method: 'GET',
          headers: buildAuthHeaders(token),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      if (response.status === 401) {
        diagnostics.push(`[http] ${path} unauthorized`);
        return { success: false, connected: false, agents: [], diagnostics, error: 'Gateway authentication failed' };
      }
      if (!response.ok) {
        gatewayResponded = true;
        diagnostics.push(`[http] ${path} HTTP ${response.status}`);
        continue;
      }

      gatewayResponded = true;
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const text = await response.text().catch(() => '');
      const payload = parseJsonFromText(text);
      if (!payload) {
        const htmlLike = contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
        diagnostics.push(
          htmlLike
            ? `[http] ${path} returned HTML instead of JSON`
            : `[http] ${path} returned non-JSON payload`
        );
        continue;
      }
      const agents = extractArray(payload) as Array<Record<string, unknown>>;
      diagnostics.push(`[http] ${path} ok (${agents.length} agents)`);
      return { success: true, connected: true, agents, diagnostics };
    } catch (error) {
      diagnostics.push(`[http] ${path} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: false,
    connected: gatewayResponded,
    agents: [],
    diagnostics,
    error: gatewayResponded
      ? 'Gateway reachable but agent list capability is unavailable in this runtime profile'
      : 'Gateway did not respond',
  };
}

export async function fetchGatewayAgentsList(serverUrl: string, token: string): Promise<Array<Record<string, unknown>>> {
  const result = await probeGatewayAgents(serverUrl, token);
  return result.agents;
}

export async function createGatewayAgent(
  serverUrl: string,
  token: string,
  args: Record<string, unknown>
): Promise<{ created: boolean; error?: string; diagnostics?: string[] }> {
  const diagnostics: string[] = [];
  let gatewayResponded = false;

  for (const tool of CREATE_AGENT_TOOL_CANDIDATES) {
    diagnostics.push(`[tool] trying ${tool}`);
    const response = await invokeGatewayTool(serverUrl, token, tool, args, false);
    if (response.ok) {
      diagnostics.push(`[tool] ${tool} ok`);
      return { created: true, diagnostics };
    }
    if (response.status === 401) {
      diagnostics.push(`[tool] ${tool} unauthorized`);
      return { created: false, error: 'Gateway authentication failed', diagnostics };
    }
    if (response.status !== 404 && response.status !== 400) {
      diagnostics.push(`[tool] ${tool} failed: ${response.error ?? `HTTP ${response.status}`}`);
      return { created: false, error: response.error, diagnostics };
    }
    gatewayResponded = true;
    diagnostics.push(`[tool] ${tool} unavailable`);
  }

  return {
    created: false,
    diagnostics,
    error: gatewayResponded
      ? 'Gateway runtime does not expose any agent creation tool (plugin/bridge capability missing)'
      : 'Gateway did not respond to creation requests',
  };
}

export interface GatewayDatasetResponse {
  success: boolean;
  connected: boolean;
  source: 'tool' | 'http' | 'cli' | 'none';
  kind: string;
  items: unknown[];
  count: number;
  diagnostics: string[];
  errorDetails?: string | null;
  timestamp: string;
}

async function fetchGatewayToolDataset(params: {
  serverUrl: string;
  token: string;
  tool: string;
  args?: Record<string, unknown>;
  diagnostics: string[];
}): Promise<{ items: unknown[] | null; connected: boolean; authFailed: boolean }> {
  const { serverUrl, token, tool, args = {}, diagnostics } = params;
  diagnostics.push(`[tool:${tool}] invoking`);
  const response = await invokeGatewayTool(serverUrl, token, tool, args);
  if (!response.ok) {
    diagnostics.push(`[tool:${tool}] ${response.error ?? `HTTP ${response.status}`}`);
    return {
      items: null,
      connected: response.status !== 0,
      authFailed: response.status === 401,
    };
  }

  const parsed = unwrapGatewayToolResult(response.body);
  const items = extractArray(parsed);
  diagnostics.push(`[tool:${tool}] success (${items.length} items)`);
  return { items, connected: true, authFailed: false };
}

async function fetchGatewayHttpDataset(params: {
  serverUrl: string;
  token: string;
  path: string;
  diagnostics: string[];
}): Promise<{ items: unknown[] | null; connected: boolean; authFailed: boolean }> {
  const { serverUrl, token, path, diagnostics } = params;
  const baseUrl = convertWsToHttp(serverUrl);

  diagnostics.push(`[http:${path}] fetching`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GATEWAY_REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: buildAuthHeaders(token),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      diagnostics.push(`[http:${path}] unauthorized`);
      return { items: null, connected: false, authFailed: true };
    }

    if (!response.ok) {
      diagnostics.push(`[http:${path}] HTTP ${response.status}`);
      return { items: null, connected: true, authFailed: false };
    }
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const text = await response.text().catch(() => '');
    const payload = parseJsonFromText(text);
    if (!payload) {
      const htmlLike = contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
      diagnostics.push(
        htmlLike
          ? `[http:${path}] received HTML instead of JSON (likely gateway UI or auth page)`
          : `[http:${path}] non-JSON response`
      );
      return { items: null, connected: true, authFailed: false };
    }
    const items = extractArray(payload);
    diagnostics.push(`[http:${path}] success (${items.length} items)`);
    return { items, connected: true, authFailed: false };
  } catch (error) {
    diagnostics.push(`[http:${path}] ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { items: null, connected: false, authFailed: false };
  }
}

export async function fetchGatewayDataset(params: {
  serverUrl: string;
  token: string;
  kind: string;
  toolCandidates: string[];
  httpCandidates: string[];
  cliFallback?: () => Promise<{ items: unknown[]; diagnostics?: string[]; error?: string } | null>;
}): Promise<GatewayDatasetResponse> {
  const { serverUrl, token, kind, toolCandidates, httpCandidates, cliFallback } = params;
  const diagnostics: string[] = [];
  let gatewayResponded = false;

  for (const tool of toolCandidates) {
    const result = await fetchGatewayToolDataset({ serverUrl, token, tool, diagnostics });
    gatewayResponded = gatewayResponded || result.connected;
    if (result.authFailed) {
      return {
        success: false,
        connected: false,
        source: 'none',
        kind,
        items: [],
        count: 0,
        diagnostics,
        errorDetails: 'Gateway authentication failed',
        timestamp: new Date().toISOString(),
      };
    }
    if (result.items) {
      return {
        success: true,
        connected: true,
        source: 'tool',
        kind,
        items: result.items,
        count: result.items.length,
        diagnostics,
        timestamp: new Date().toISOString(),
      };
    }
  }

  for (const path of httpCandidates) {
    const result = await fetchGatewayHttpDataset({ serverUrl, token, path, diagnostics });
    gatewayResponded = gatewayResponded || result.connected;
    if (result.authFailed) {
      return {
        success: false,
        connected: false,
        source: 'none',
        kind,
        items: [],
        count: 0,
        diagnostics,
        errorDetails: 'Gateway authentication failed',
        timestamp: new Date().toISOString(),
      };
    }
    if (result.items) {
      return {
        success: true,
        connected: true,
        source: 'http',
        kind,
        items: result.items,
        count: result.items.length,
        diagnostics,
        timestamp: new Date().toISOString(),
      };
    }
  }

  if (cliFallback) {
    try {
      const cli = await cliFallback();
      if (cli && Array.isArray(cli.items)) {
        diagnostics.push(...(cli.diagnostics ?? []));
        return {
          success: true,
          connected: true,
          source: 'cli',
          kind,
          items: cli.items,
          count: cli.items.length,
          diagnostics,
          timestamp: new Date().toISOString(),
        };
      }
      if (cli?.error) {
        diagnostics.push(`[cli] ${cli.error}`);
      }
    } catch (error) {
      diagnostics.push(`[cli] ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: false,
    connected: gatewayResponded,
    source: 'none',
    kind,
    items: [],
    count: 0,
    diagnostics,
    errorDetails: gatewayResponded
      ? `Gateway reachable but no matching tool or HTTP endpoint responded for ${kind}`
      : `Gateway did not respond for ${kind}`,
    timestamp: new Date().toISOString(),
  };
}

import { queryOpenClawViaHttp } from './http-client';
import type { OpenClawGatewayInfo } from './types';
import { queryOpenClawViaWebSocket } from './ws-client';
import { convertWsToHttp } from './url';

function isLocalGatewayUrl(serverUrl: string): boolean {
  try {
    const parsed = new URL(convertWsToHttp(serverUrl));
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

async function fallbackHttpProbe(serverUrl: string, token: string, existingDiagnostics: string[]): Promise<OpenClawGatewayInfo> {
  const diagnostics = [...existingDiagnostics];
  const result: OpenClawGatewayInfo = { version: 'unknown' };
  const baseUrl = convertWsToHttp(serverUrl);

  diagnostics.push('[fallback] probing HTTP endpoints');

  const tryFetch = async (path: string, timeoutMs = 4000): Promise<any | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json, text/html',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        diagnostics.push(`[fallback] ${path} -> HTTP ${response.status}`);
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json().catch(() => null);
      }

      const html = await response.text();
      const versionMatch = html.match(/version["']?\s*[:=]\s*["']?([\w.\-]+)/i);
      return versionMatch ? { version: versionMatch[1] } : null;
    } catch (error) {
      diagnostics.push(`[fallback] ${path} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  const root = await tryFetch('/');
  const status = await tryFetch('/api/status') || await tryFetch('/status');
  const config = await tryFetch('/api/config');
  const agents = await tryFetch('/api/agents');
  const channels = await tryFetch('/api/channels') || await tryFetch('/api/channel/status');
  const merged = status || root;
  if (merged?.version) result.version = merged.version;
  if (merged?.uptime) result.uptime = merged.uptime;
  if (merged?.config && typeof merged.config === 'object') result.config = merged.config;
  if (config && typeof config === 'object') {
    result.config = config;
    if ((config as any).model || (config as any).defaultModel) {
      result.model = (config as any).model || (config as any).defaultModel;
    }
    if ((config as any).provider) {
      result.provider = (config as any).provider;
    }
  }
  if (agents && Array.isArray((agents as any).agents)) {
    result.agentCount = (agents as any).agents.length;
  } else if (Array.isArray(agents)) {
    result.agentCount = agents.length;
  }
  if (channels && Array.isArray((channels as any).channels)) {
    result.channelCount = (channels as any).channels.length;
  } else if (Array.isArray(channels)) {
    result.channelCount = channels.length;
  }

  result.diagnostics = diagnostics;
  if (result.version === 'unknown') {
    result.error = 'Unable to discover gateway details via WebSocket or HTTP fallback';
  }
  return result;
}

export async function discoverOpenClawInfo(serverUrl: string, token: string): Promise<OpenClawGatewayInfo> {
  const diagnostics: string[] = [];
  const isLocal = isLocalGatewayUrl(serverUrl);

  diagnostics.push(
    isLocal
      ? 'Using HTTP API first (local gateway mode)...'
      : 'Using HTTP API first (remote gateway mode - avoids Control UI origin restrictions)...'
  );
  try {
    const httpResult = await queryOpenClawViaHttp({
      serverUrl,
      token,
      sessionKey: 'agent:main:main',
      timeout: 15000,
    });
    if (httpResult.diagnostics) diagnostics.push(...httpResult.diagnostics);
    diagnostics.push('HTTP API query successful');
    return { ...httpResult, diagnostics };
  } catch (httpError) {
    diagnostics.push(`HTTP first-pass failed: ${httpError instanceof Error ? httpError.message : 'Unknown error'}`);
    diagnostics.push('Falling back to WebSocket API...');
  }

  diagnostics.push(isLocal ? 'Using WebSocket API...' : 'Using WebSocket API (fallback only)...');
  try {
    const wsResult = await queryOpenClawViaWebSocket({
      serverUrl,
      token,
      sessionKey: 'agent:main:main',
      timeout: 15000,
    });

    if (wsResult.diagnostics) diagnostics.push(...wsResult.diagnostics);
    diagnostics.push('WebSocket query successful');
    return { ...wsResult, diagnostics };
  } catch (wsError) {
    diagnostics.push(`WebSocket failed: ${wsError instanceof Error ? wsError.message : 'Unknown error'}`);
    diagnostics.push('Falling back to HTTP API...');
  }

  try {
    const httpResult = await queryOpenClawViaHttp({
      serverUrl,
      token,
      sessionKey: 'agent:main:main',
      timeout: 15000,
    });
    if (httpResult.diagnostics) diagnostics.push(...httpResult.diagnostics);
    diagnostics.push('HTTP API fallback successful');
    return { ...httpResult, diagnostics };
  } catch (httpError) {
    diagnostics.push(`HTTP fallback also failed: ${httpError instanceof Error ? httpError.message : 'Unknown error'}`);
  }

  return fallbackHttpProbe(serverUrl, token, diagnostics);
}

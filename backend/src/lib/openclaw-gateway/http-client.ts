/**
 * OpenClaw HTTP API Client
 * 
 * Implements the OpenClaw Gateway HTTP protocol for querying
 * version, agents, channels, and other gateway information.
 * 
 * Uses /tools/invoke endpoint instead of WebSocket
 * Works reliably through Cloudflare Tunnel and other proxies
 * 
 * Protocol docs: https://docs.openclaw.ai/gateway/protocol
 * 
 * Example usage:
 * const client = new OpenClawHttpClient({
 * serverUrl: 'https://openclaw.clawpute.com',
 * token: '728a7307166292b0d62b2a8232f55e4cfa3daacb2991e4f2',
 * sessionKey: 'agent:main:main',
 * });
 *
 * // Bidirectional operations
 * await client.listAgents();           // GET data
 * await client.sendMessage('Hi');      // SEND commands  
 * await client.updateConfig({...});    // UPDATE settings
 * await client.getSessionMessages();   // GET messages
 */

export interface OpenClawHttpConfig {
  serverUrl: string;  // http:// or https://
  token: string;
  password?: string;
  sessionKey?: string;
  timeout?: number;
}

export interface OpenClawGatewayStatus {
  version: string;
  uptime: string;
  gateway?: {
    version?: string;
    uptime?: string;
    status?: string;
  };
  config?: {
    model?: string;
    provider?: string;
    defaultModel?: string;
  };
}

export interface OpenClawAgent {
  id: string;
  name?: string;
  status?: string;
  model?: string;
  workspace?: string;
}

export interface OpenClawChannel {
  type: string;
  name?: string;
  status?: string;
  id?: string;
}

export interface OpenClawGatewayInfo {
  version: string;
  uptime?: string;
  model?: string;
  provider?: string;
  agents?: OpenClawAgent[];
  agentCount?: number;
  channels?: OpenClawChannel[];
  channelCount?: number;
  config?: Record<string, unknown>;
  error?: string;
  errorDetails?: string;
  diagnostics?: string[];
}

/**
 * Normalize HTTP URL - converts any protocol (ws://, wss://) to proper HTTP
 */
function normalizeHttpUrl(url: string): string {
  // Remove trailing slash
  let normalized = url.replace(/\/$/, '');

  // Convert WebSocket protocols to HTTP equivalents
  if (normalized.startsWith('wss://')) {
    normalized = normalized.replace('wss://', 'https://');
  } else if (normalized.startsWith('ws://')) {
    normalized = normalized.replace('ws://', 'http://');
  } else if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    // Add https:// if no protocol specified
    normalized = `https://${normalized}`;
  }

  return normalized;
}

/**
 * Clean Gateway Token - remove Bearer prefix and whitespace
 */
function cleanToken(token: string): string {
  if (!token) return '';
  return token.replace(/^Bearer\s+/i, '').trim();
}

function parseJsonSafely(value: string): any | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function unwrapToolResult(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;

  if (payload.ok === true && payload.result !== undefined) {
    const result = payload.result;
    if (result && typeof result === 'object' && Array.isArray(result.content)) {
      const textItem = result.content.find(
        (entry: any) => entry && entry.type === 'text' && typeof entry.text === 'string'
      );
      if (textItem?.text) {
        const parsed = parseJsonSafely(textItem.text);
        return parsed ?? result;
      }
    }
    return result;
  }

  return payload;
}

function collectListCandidates(payload: any, keys: string[]): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.result?.[key])) return payload.result[key];
    if (Array.isArray(payload?.payload?.[key])) return payload.payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }

  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function isToolUnavailableMessage(message: string): boolean {
  return /tool .* unavailable|tool not available|not_found/i.test(message);
}

/**
 * Query OpenClaw Gateway via HTTP API
 * 
 * @param config - HTTP configuration
 * @returns Gateway information including version, agents, channels
 */
export async function queryOpenClawViaHttp(
  config: OpenClawHttpConfig
): Promise<OpenClawGatewayInfo> {
  const { serverUrl, token, password = '', sessionKey = 'agent:main:main', timeout = 15000 } = config;
  const httpUrl = normalizeHttpUrl(serverUrl);
  const cleanedToken = cleanToken(token);
  const diagnostics: string[] = [];

  diagnostics.push(`[HTTP] Connecting to ${httpUrl}...`);
  diagnostics.push(`[HTTP] Token length: ${cleanedToken.length} chars (cleaned)`);

  // Store results
  const result: OpenClawGatewayInfo = { version: 'unknown' };

  // Track which queries we've completed
  let queriesCompleted = 0;
  const totalQueries = 4; // status, agents.list, channels.status, config.get

  /**
   * Invoke any OpenClaw tool via HTTP
   */
  const invokeTool = async (
    tool: string,
    args: Record<string, any> = {}
  ): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Create Authorization header
      // If password is provided, some gateways might expect it joined with token or in a separate header
      // For standard Bearer token, we just use the cleaned token
      const authHeader = `Bearer ${cleanedToken}`;

      const headers: Record<string, string> = {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      };

      // If password is provided but token is used for Bearer, 
      // some OpenClaw implementations might use X-Gateway-Password
      if (password) {
        headers['X-Gateway-Password'] = password;
      }

      const response = await fetch(`${httpUrl}/tools/invoke`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tool,
          action: 'json',
          args,
          sessionKey,
          dryRun: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed - check your token');
        }
        if (response.status === 404) {
          throw new Error(`Tool '${tool}' unavailable on this gateway`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return unwrapToolResult(data);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  };

  const invokeToolAny = async (
    tools: string[],
    args: Record<string, any> = {}
  ): Promise<any> => {
    let lastError: Error | null = null;
    for (const tool of tools) {
      try {
        diagnostics.push(`[HTTP] trying tool: ${tool}`);
        return await invokeTool(tool, args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        diagnostics.push(`[HTTP] tool failed (${tool}): ${lastError.message}`);
      }
    }
    throw lastError ?? new Error('No tool candidates succeeded');
  };

  // Query all gateway info
  try {
    diagnostics.push('[HTTP] Starting data queries...');
    let policyDeniedCount = 0;
    let anyToolSucceeded = false;
    let missingStatusTool = false;
    let missingChannelsTool = false;
    let missingConfigTool = false;

    // Query 1: status for version and uptime
    diagnostics.push('[HTTP] Query 1/4: status');
    try {
      const status = await invokeTool('status', {});
      diagnostics.push('[HTTP] ✓ Status response received');
      queriesCompleted++;
      anyToolSucceeded = true;

      if (status) {
        // Try multiple possible locations for version
        const possibleVersions = [
          status.version,
          status.gateway?.version,
          status.server?.version,
          status.data?.version,
        ];

        for (const v of possibleVersions) {
          if (v && v !== 'unknown') {
            result.version = v;
            diagnostics.push(`[HTTP] ✓ Found version: ${v}`);
            break;
          }
        }

        // Try multiple possible locations for uptime
        result.uptime = status.uptime || status.gateway?.uptime || status.server?.uptime;

        // Try multiple possible locations for config
        const config = status.config || status.gateway?.config || status.data;
        if (config) {
          result.config = config;
          if (config.model || config.defaultModel) {
            result.model = config.model || config.defaultModel;
            diagnostics.push(`[HTTP] ✓ Found model: ${result.model}`);
          }
          if (config.provider) {
            result.provider = config.provider;
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      if (isToolUnavailableMessage(msg)) missingStatusTool = true;
      if (/blocked by policy|not allowed/i.test(msg)) policyDeniedCount++;
      diagnostics.push(`[HTTP] ? Status query failed: ${msg}`);
      queriesCompleted++;
    }

    // Query 2: agents.list
    diagnostics.push('[HTTP] Query 2/4: agents.list');
    try {
      const agentsResponse = await invokeToolAny(['agents.list', 'agents_list'], {});
      diagnostics.push('[HTTP] ✓ Agents response received');
      queriesCompleted++;
      anyToolSucceeded = true;

      const agents = collectListCandidates(agentsResponse, ['agents']);

      if (agents.length > 0) {
        result.agents = agents.map((a: any) => ({
          id: a.id || a.agentId || a.name || 'unknown',
          name: a.name || a.id || a.agentId || 'Unknown Agent',
          status: a.status || 'unknown',
          model: a.model,
          workspace: a.workspace,
        }));
        result.agentCount = result.agents.length;
        diagnostics.push(`[HTTP] ✓ Found ${result.agentCount} agents`);
      } else {
        diagnostics.push('[HTTP] No agents found in response');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      if (/blocked by policy|not allowed/i.test(msg)) policyDeniedCount++;
      diagnostics.push(`[HTTP] ✗ Agents query failed: ${msg}`);
      queriesCompleted++;
    }

    // Query 3: channels.status
    diagnostics.push('[HTTP] Query 3/4: channels.status');
    try {
      const channelsResponse = await invokeToolAny(['channels.status', 'channels.list', 'channels_status', 'channels_list'], {});
      diagnostics.push('[HTTP] ✓ Channels response received');
      queriesCompleted++;
      anyToolSucceeded = true;

      const channels: OpenClawChannel[] = [];

      if (channelsResponse) {
        const channelList = collectListCandidates(channelsResponse, ['channels']);
        if (channelList.length > 0) {
          channels.push(...channelList.map((c: any) => ({
            type: c.type || c.platform || c.channel || 'unknown',
            name: c.name || c.id || c.type || 'Unknown',
            status: c.status || 'unknown',
            id: c.id,
          })));
        }

        // Handle different response formats
        if (channels.length === 0 && Array.isArray(channelsResponse.channels)) {
          channels.push(...channelsResponse.channels.map((c: any) => ({
            type: c.type || c.platform || c.channel || 'unknown',
            name: c.name || c.id || c.type || 'Unknown',
            status: c.status || 'unknown',
            id: c.id,
          })));
        } else if (channels.length === 0 && Array.isArray(channelsResponse)) {
          channels.push(...channelsResponse.map((c: any) => ({
            type: c.type || c.platform || c.channel || 'unknown',
            name: c.name || c.id || c.type || 'Unknown',
            status: c.status || 'unknown',
            id: c.id,
          })));
        } else if (channels.length === 0 && channelsResponse.data && Array.isArray(channelsResponse.data)) {
          channels.push(...channelsResponse.data.map((c: any) => ({
            type: c.type || c.platform || c.channel || 'unknown',
            name: c.name || c.id || c.type || 'Unknown',
            status: c.status || 'unknown',
            id: c.id,
          })));
        } else if (channels.length === 0 && typeof channelsResponse === 'object') {
          // Might be keyed by channel type
          Object.entries(channelsResponse).forEach(([key, value]: [string, any]) => {
            if (key !== 'type' && value && typeof value === 'object' && !Array.isArray(value)) {
              channels.push({
                type: key,
                name: value.name || value.id || key,
                status: value.status || 'unknown',
                id: value.id,
              });
            }
          });
        }

        if (channels.length > 0) {
          result.channels = channels;
          result.channelCount = channels.length;
          diagnostics.push(`[HTTP] ✓ Found ${result.channelCount} channels`);
        } else {
          diagnostics.push('[HTTP] No channels found in response');
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      if (isToolUnavailableMessage(msg)) missingChannelsTool = true;
      if (/blocked by policy|not allowed/i.test(msg)) policyDeniedCount++;
      diagnostics.push(`[HTTP] ? Channels query failed: ${msg}`);
      queriesCompleted++;
    }

    // Query 4: config.get for model info if not already found
    if (!result.model) {
      diagnostics.push('[HTTP] Query 4/4: config.get');
      try {
        const configResponse = await invokeToolAny(['config.get', 'config_get'], {});
        diagnostics.push('[HTTP] ✓ Config response received');
        queriesCompleted++;
        anyToolSucceeded = true;

        if (configResponse && typeof configResponse === 'object') {
          result.config = configResponse;

          if ((configResponse as any).model || (configResponse as any).defaultModel) {
            result.model = (configResponse as any).model || (configResponse as any).defaultModel;
            diagnostics.push(`[HTTP] ✓ Found model from config: ${result.model}`);
          }

          if ((configResponse as any).provider) {
            result.provider = (configResponse as any).provider;
            diagnostics.push(`[HTTP] ✓ Found provider: ${result.provider}`);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown';
        if (isToolUnavailableMessage(msg)) missingConfigTool = true;
        if (/blocked by policy|not allowed/i.test(msg)) policyDeniedCount++;
        diagnostics.push(`[HTTP] ? Config query failed: ${msg}`);
        queriesCompleted++;
      }
    } else {
      diagnostics.push('[HTTP] Query 4/4: config.get (skipped - model already found)');
      queriesCompleted++;
    }

    diagnostics.push(`[HTTP] Query progress: ${queriesCompleted}/${totalQueries}`);
    diagnostics.push('[HTTP] All queries completed');

    if (
      (result.agentCount ?? 0) > 0 &&
      result.version === 'unknown' &&
      missingStatusTool &&
      missingConfigTool &&
      missingChannelsTool
    ) {
      diagnostics.push('[HTTP] Gateway appears reachable with a minimal tool profile (agents_list only).');
      diagnostics.push('[HTTP] Version/model/channels are unavailable because status/config/channels tools are not exposed by this gateway instance.');
    }
    const hasStrongSignal =
      result.version !== 'unknown' ||
      Boolean(result.uptime) ||
      Boolean(result.model) ||
      Boolean(result.provider) ||
      (result.agentCount ?? 0) > 0 ||
      (result.channelCount ?? 0) > 0 ||
      anyToolSucceeded;

    if (!hasStrongSignal) {
      if (policyDeniedCount > 0) {
        result.error = 'Gateway reachable, but requested tools are blocked by policy';
        diagnostics.push('[HTTP] No strong signal found; tool policy likely blocking metadata tools');
      } else {
        result.error = 'Gateway reachable, but no metadata returned from current endpoints';
        diagnostics.push('[HTTP] No strong signal found from status/agents/channels/config');
      }
      result.diagnostics = diagnostics;
      throw new Error(result.error);
    }

    result.diagnostics = diagnostics;
    return result;

  } catch (error) {
    diagnostics.push(`[HTTP] ✗ Connection failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    result.diagnostics = diagnostics;
    result.error = error instanceof Error ? error.message : 'Connection failed';
    result.errorDetails = error instanceof Error ? error.stack : undefined;

    // Return partial results if we have any
    if (result.version !== 'unknown' || result.agents || result.channels) {
      diagnostics.push('[HTTP] Returning partial results');
      return result;
    }

    throw error;
  }
}

/**
 * Quick connection test via HTTP
 */
export async function testOpenClawHttp(
  config: OpenClawHttpConfig
): Promise<{ success: boolean; message: string; version?: string; diagnostics?: string[] }> {
  try {
    const info = await queryOpenClawViaHttp({ ...config, timeout: 8000 });
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

/**
 * Additional types for full client
 */
export interface OpenClawTask {
  id: string;
  title: string;
  status: string;
  description?: string;
}

export interface OpenClawMessage {
  id: string;
  content: string;
  from?: string;
  timestamp?: string;
}

/**
 * Full-featured HTTP Client for OpenClaw
 * Provides methods for all common operations
 */
export class OpenClawHttpClient {
  private baseUrl: string;
  private token: string;
  private timeout: number;
  private sessionKey: string;

  constructor(config: OpenClawHttpConfig) {
    this.baseUrl = normalizeHttpUrl(config.serverUrl);
    this.token = cleanToken(config.token);
    this.timeout = config.timeout || 10000;
    this.sessionKey = config.sessionKey || 'agent:main:main';
  }

  /**
   * Invoke any OpenClaw tool via HTTP
   */
  private async invokeTool(
    tool: string,
    args: Record<string, any> = {},
    action?: string
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool,
          action: action || 'json',
          args,
          sessionKey: this.sessionKey,
          dryRun: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed - check your token');
        }
        if (response.status === 404) {
          throw new Error(`Tool '${tool}' unavailable on this gateway`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return unwrapToolResult(data);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  private async invokeToolAny(
    tools: string[],
    args: Record<string, any> = {},
    action?: string
  ): Promise<any> {
    let lastError: Error | null = null;
    for (const tool of tools) {
      try {
        return await this.invokeTool(tool, args, action);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error('No tool candidates succeeded');
  }

  /**
   * Get full gateway information (version, agents, channels, config)
   */
  async getGatewayInfo(): Promise<OpenClawGatewayInfo> {
    return queryOpenClawViaHttp({
      serverUrl: this.baseUrl,
      token: this.token,
      sessionKey: this.sessionKey,
      timeout: this.timeout,
    });
  }

  /**
   * Get gateway status and version
   */
  async getStatus(): Promise<{
    version: string;
    uptime?: string;
    model?: string;
    provider?: string;
  }> {
    const result = await this.invokeTool('status');

    return {
      version: result.version || result.gateway?.version || 'unknown',
      uptime: result.uptime || result.gateway?.uptime,
      model: result.config?.model || result.config?.defaultModel,
      provider: result.config?.provider,
    };
  }

  /**
   * List all agents
   */
  async listAgents(): Promise<OpenClawAgent[]> {
    const result = await this.invokeToolAny(['agents.list', 'agents_list']);
    const agents =
      (Array.isArray(result?.agents) ? result.agents : null) ??
      (Array.isArray(result?.items) ? result.items : null) ??
      (Array.isArray(result?.data) ? result.data : null) ??
      (Array.isArray(result?.result?.agents) ? result.result.agents : null) ??
      (Array.isArray(result?.payload?.agents) ? result.payload.agents : null) ??
      (Array.isArray(result) ? result : []);

    return agents.map((a: any) => ({
      id: a.id || a.agentId || a.name || 'unknown',
      name: a.name || a.id || 'Unknown Agent',
      status: a.status || 'unknown',
      model: a.model,
      workspace: a.workspace,
    }));
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<any[]> {
    const result = await this.invokeToolAny(['sessions.list', 'sessions_list']);
    return result.sessions || result || [];
  }

  /**
   * Get session messages
   */
  async getSessionMessages(sessionKey?: string): Promise<OpenClawMessage[]> {
    const result = await this.invokeToolAny(['sessions.get', 'sessions_get', 'chat.history', 'sessions_history'], {
      sessionKey: sessionKey || this.sessionKey
    });

    const messages = result.messages || result.history || [];

    return messages.map((m: any, index: number) => ({
      id: m.id || `msg-${index}`,
      content: m.content || m.text || m.message || '',
      from: m.from || m.role || m.author,
      timestamp: m.timestamp || m.createdAt,
    }));
  }

  /**
   * Send a message to OpenClaw
   */
  async sendMessage(
    message: string,
    sessionKey?: string
  ): Promise<{ success: boolean; response?: string }> {
    try {
      const result = await this.invokeToolAny(['sessions.send', 'sessions_send', 'chat.send'], {
        sessionKey: sessionKey || this.sessionKey,
        message,
      });

      return {
        success: true,
        response: result.response || result.reply || 'Message sent',
      };
    } catch (error) {
      return {
        success: false,
        response: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Get configuration
   */
  async getConfig(): Promise<Record<string, any>> {
    const result = await this.invokeToolAny(['config.get', 'config_get']);
    return result || {};
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Record<string, any>): Promise<boolean> {
    try {
      await this.invokeToolAny(['config.set', 'config_set'], updates);
      return true;
    } catch (error) {
      console.error('Failed to update config:', error);
      return false;
    }
  }

  /**
   * Get channel status
   */
  async getChannelStatus(): Promise<OpenClawChannel[]> {
    const result = await this.invokeToolAny(['channels.status', 'channels.list', 'channels_status', 'channels_list']);

    const channels: OpenClawChannel[] = [];

    if (Array.isArray(result.channels)) {
      channels.push(...result.channels.map((c: any) => ({
        type: c.type || c.platform || 'unknown',
        name: c.name || c.id || 'Unknown',
        status: c.status || 'unknown',
        id: c.id,
      })));
    } else if (Array.isArray(result)) {
      channels.push(...result.map((c: any) => ({
        type: c.type || c.platform || 'unknown',
        name: c.name || c.id || 'Unknown',
        status: c.status || 'unknown',
        id: c.id,
      })));
    } else if (typeof result === 'object') {
      Object.entries(result).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object') {
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

  /**
   * Test connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    version?: string;
  }> {
    try {
      const status = await this.getStatus();
      return {
        success: true,
        message: `Connected to OpenClaw v${status.version}`,
        version: status.version,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

export default OpenClawHttpClient;

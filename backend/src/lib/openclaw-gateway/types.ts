export interface OpenClawWsConfig {
  serverUrl: string;
  token: string;
  sessionKey?: string;
  timeout?: number;
}

export interface OpenClawHttpConfig {
  serverUrl: string;
  token: string;
  password?: string;
  sessionKey?: string;
  timeout?: number;
}

export interface OpenClawWsResponse {
  type: 'res' | 'event';
  id?: string;
  ok?: boolean;
  payload?: any;
  error?: any;
  event?: string;
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

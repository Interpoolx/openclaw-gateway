import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// API configuration
// In development, Vite proxy forwards /api to localhost:8787
// In production, use the Cloudflare Worker backend
const API_BASE_URL = import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '/api' : 'https://api.clawpute.com/api');

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('heyclaw_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors
    if (error.response?.status === 401) {
      localStorage.removeItem('heyclaw_token');
      localStorage.removeItem('heyclaw_user');
      // Don't redirect, let the component handle it
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

// API methods - Handle wrapped response format
const extractData = <T>(data: any): T => {
  // Handle wrapped format { agents: [...] } or { tasks: [...] }
  if (!data || typeof data !== 'object') return data as T;

  if (Array.isArray(data)) return data as T;

  // Don't extract if it looks like a full response object we need (like login)
  if ('token' in data) return data as T;
  // Preserve structured status payloads (OpenClaw diagnostics, health checks, etc.).
  // These often include arrays like "agents"/"channels" but should not be unwrapped.
  const metadataKeys = [
    'success',
    'connected',
    'message',
    'error',
    'errorDetails',
    'timestamp',
    'version',
    'uptime',
    'model',
    'provider',
    'warning',
    'troubleshooting',
  ];
  if (metadataKeys.some((key) => key in data)) return data as T;

  // Check for wrapped arrays
  const pluralKeys = ['agents', 'tasks', 'sessions', 'data', 'results', 'projects', 'activities', 'devlogs', 'channels', 'skills', 'tracks', 'members'];
  for (const key of pluralKeys) {
    if (key in data && Array.isArray((data as any)[key])) {
      return (data as any)[key] as T;
    }
  }
  // Check for wrapped singular objects
  const singularKeys = ['agent', 'task', 'session', 'data', 'result', 'project', 'activity', 'channel', 'skill', 'user', 'track', 'member'];
  for (const key of singularKeys) {
    if (key in data && (data as any)[key] && typeof (data as any)[key] === 'object' && !Array.isArray((data as any)[key])) {
      return (data as any)[key] as T;
    }
  }

  return data as T;
};

export const apiGet = <T>(url: string, config?: AxiosRequestConfig) =>
  api.get<T>(url, config).then((res) => extractData<T>(res.data));

export const apiPost = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.post<T>(url, data, config).then((res) => extractData<T>(res.data));

export const apiPut = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.put<T>(url, data, config).then((res) => extractData<T>(res.data));

export const apiPatch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.patch<T>(url, data, config).then((res) => extractData<T>(res.data));

export const apiDelete = <T>(url: string, config?: AxiosRequestConfig) =>
  api.delete<T>(url, config).then((res) => res.data);

// Types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Config Builder
export type ConfigValidationStatus = 'INVALID' | 'VALID' | 'READY';
export type SourceMode = 'template' | 'builder' | 'import';

export interface ConfigValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ConfigTemplate {
  id: string;
  workspaceId?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  goal: string;
  category: string;
  templateType?: string;
  channels: string[];
  providers: string[];
  tags: string[];
  baseConfigJson: string;
  defaultOptionsJson: string;
  schemaJson: string;
  isOfficial: boolean;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConfigBuilderGeneratePayload {
  mode: SourceMode;
  templateId?: string;
  options: Record<string, unknown>;
}

export interface ConfigBuilderGenerateResponse {
  configJson: Record<string, unknown>;
  summary: string;
  meta: {
    status: ConfigValidationStatus;
    generatedAt: string;
    lineCount: number;
    sizeBytes: number;
  };
  warnings: ConfigValidationIssue[];
  errors: ConfigValidationIssue[];
  info: ConfigValidationIssue[];
}

export interface ConfigBuilderValidateResponse {
  status: ConfigValidationStatus;
  errors: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
  info: ConfigValidationIssue[];
}

export interface ConfigSetup {
  id: string;
  workspaceId: string | null;
  userId: string | null;
  name: string;
  slug: string | null;
  sourceMode: SourceMode;
  templateId: string | null;
  optionsJson: Record<string, unknown>;
  configJson: Record<string, unknown>;
  summary: string | null;
  isPublic: boolean;
  downloads: number;
  lastDownloadedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveConfigPayload {
  workspaceId: string;
  name?: string;
  sourceMode: SourceMode;
  templateId?: string | null;
  optionsJson: Record<string, unknown>;
  configJson: Record<string, unknown> | string;
  summary?: string;
  isPublic?: boolean;
}

export interface ConfigSetupVersion {
  id: string;
  setupId: string;
  version: number;
  configJson: Record<string, unknown>;
  optionsJson: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
}

export const getConfigTemplates = (params: {
  goal?: string;
  channel?: string;
  provider?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => api.get<{ templates: ConfigTemplate[]; total: number; limit: number; offset: number }>('/config-builder/templates', { params })
  .then((res) => res.data);

export const getConfigTemplate = (idOrSlug: string) =>
  apiGet<ConfigTemplate>(`/config-builder/templates/${idOrSlug}`);

export const generateBuilderConfig = (payload: ConfigBuilderGeneratePayload) =>
  apiPost<ConfigBuilderGenerateResponse>('/config-builder/generate', payload);

export const validateBuilderConfig = (payload: { configJson: string | Record<string, unknown> }) =>
  apiPost<ConfigBuilderValidateResponse>('/config-builder/validate', payload);

export const getSavedConfigs = (workspaceId: string, includeDeleted: boolean = false) =>
  api.get<{ setups: ConfigSetup[]; total: number }>('/config-builder/setups', {
    params: { workspaceId, includeDeleted },
  }).then((res) => res.data);

export const getSavedConfig = (id: string) =>
  apiGet<ConfigSetup>(`/config-builder/setups/${id}`);

export const saveConfig = (payload: SaveConfigPayload) =>
  apiPost<{ success: boolean; setup: ConfigSetup }>('/config-builder/setups', payload);

export const updateSavedConfig = (id: string, payload: Partial<SaveConfigPayload>) =>
  apiPatch<{ success: boolean; setup: ConfigSetup }>(`/config-builder/setups/${id}`, payload);

export const deleteSavedConfig = (id: string) =>
  apiDelete<{ success: boolean }>(`/config-builder/setups/${id}`);

export const restoreSavedConfig = (id: string) =>
  apiPost<{ success: boolean }>(`/config-builder/setups/${id}/restore`);

export const duplicateSavedConfig = (id: string) =>
  apiPost<{ success: boolean; setup: ConfigSetup }>(`/config-builder/setups/${id}/duplicate`);

export const getSavedConfigVersions = (id: string) =>
  apiGet<{ versions: ConfigSetupVersion[]; total: number }>(`/config-builder/setups/${id}/versions`);

export const markSavedConfigDownloaded = (id: string) =>
  apiPost<{ success: boolean }>(`/config-builder/setups/${id}/downloaded`);

export const getPublicConfigSetup = (id: string) =>
  apiGet<{
    id: string;
    name: string;
    summary: string | null;
    sourceMode: SourceMode;
    configJson: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>(`/config-builder/public/${id}`);

// Health check
export const healthCheck = () => apiGet<{ status: string; mode: string }>('/health');

// Stats
export interface Stats {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
}

export const getStats = () => apiGet<Stats>('/stats');

// Agents
export interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  level: string;
  status: 'idle' | 'active' | 'busy' | 'offline';
  model: string;
  description?: string;
  lastHeartbeat: string | null;
  sessionKey: string;
  currentTaskId: string | null;
  tools: {
    enabled: string[];
  };
  skills: number;
  wakeupConfig: {
    method: string;
    intervalMs: number;
  };
  workspaceId?: string;
  workspaceName?: string;
  syncToGateway?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Agents parser
export const parseAgent = (agent: any): Agent => ({
  ...agent,
  tools: {
    enabled: typeof agent.toolsEnabled === 'string' ? JSON.parse(agent.toolsEnabled ?? '[]') : agent.toolsEnabled ?? [],
  },
  wakeupConfig: typeof agent.wakeupConfig === 'string' ? JSON.parse(agent.wakeupConfig ?? '{}') : agent.wakeupConfig ?? { method: 'poll', intervalMs: 900000 },
});

export const parseAgents = (agents: any[]): Agent[] => agents.map(parseAgent);

export const getAgents = async (workspaceId?: string) => {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
  const data = await apiGet<any[]>(`/agents${params}`);
  return parseAgents(data ?? []);
};

export const getAgent = async (id: string) => {
  const data = await apiGet<any>(`/agents/${id}`);
  return data ? parseAgent(data) : null;
};

export const createAgent = (data: Partial<Agent>) => apiPost<Agent>('/agents', data);

export const updateAgent = (id: string, data: Partial<Agent>) => apiPatch<Agent>(`/agents/${id}`, data);

export const deleteAgent = (id: string) => apiDelete(`/agents/${id}`);

// Tools
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export interface ToolCategory {
  name: string;
  tools: Tool[];
}

export const getTools = () => apiGet<ToolCategory[]>('/tools');

export const enableTool = (agentId: string, toolId: string) =>
  apiPost(`/agents/${agentId}/tools/enable`, { tool_id: toolId });

export const disableTool = (agentId: string, toolId: string) =>
  apiPost(`/agents/${agentId}/tools/disable`, { tool_id: toolId });

export const applyToolPreset = (agentId: string, preset: string) =>
  apiPost(`/agents/${agentId}/tools/preset`, { preset });

// Tasks
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'waiting' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  creatorId: string;
  tags: string[];
  category: string | null;
  assigneeIds: string[];
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  projectId?: string;
  trackId?: string; // Fallback for transition
  workspaceId?: string;
}

// Tasks parser
export const parseTask = (task: any): Task => {
  const tags = typeof task.tags === 'string' ? JSON.parse(task.tags ?? '[]') : task.tags ?? [];

  // Try plural field names first
  let assigneeIds = task.assigneeIds ?? task.assignee_ids;

  // If string, parse it
  if (typeof assigneeIds === 'string') {
    try {
      assigneeIds = JSON.parse(assigneeIds);
    } catch (e) {
      assigneeIds = [];
    }
  }

  // If still not an array, try singular fallback
  if (!Array.isArray(assigneeIds)) {
    const singularId = task.agentId ?? task.agent_id ?? task.assignee_id;
    assigneeIds = singularId ? [singularId] : [];
  }

  return {
    ...task,
    tags,
    assigneeIds,
    projectId: task.projectId ?? task.trackId ?? task.project_id ?? task.track_id,
    trackId: task.trackId ?? task.projectId ?? task.track_id ?? task.project_id, // Keep for backward compatibility
  };
};

export const parseTasks = (tasks: any[]): Task[] => tasks.map(parseTask);

export const getTasks = async (workspaceId?: string, filters?: { status?: string; priority?: string; assigneeId?: string }) => {
  const params = new URLSearchParams();
  if (workspaceId) params.append('workspaceId', workspaceId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
  const data = await apiGet<any[]>(`/tasks?${params.toString()}`);
  return parseTasks(data ?? []);
};

export const getTask = (id: string) => apiGet<Task>(`/tasks/${id}`);

export const createTask = (data: Partial<Task>) => apiPost<Task>('/tasks', data);

export const updateTask = (id: string, data: Partial<Task>) => apiPatch<Task>(`/tasks/${id}`, data);

export const deleteTask = (id: string) => apiDelete(`/tasks/${id}`);

export const moveTask = (id: string, status: Task['status']) =>
  apiPost<Task>(`/tasks/${id}/move`, { status });

export const assignTask = (taskId: string, agentId: string) =>
  apiPost(`/tasks/${taskId}/assign`, { agentId, agent_id: agentId });

export const unassignTask = (taskId: string, agentId: string) =>
  apiPost(`/tasks/${taskId}/unassign`, { agentId });

// Sessions
export interface Session {
  id: string;
  agentId: string;
  status: 'active' | 'completed' | 'error';
  createdAt: string;
  messages: number;
}

export const getSessions = () => apiGet<Session[]>('/sessions');

export const createSession = (agentId: string) => apiPost<Session>('/sessions', { agent_id: agentId });

export const getSessionStatus = (id: string) => apiGet<Session>(`/sessions/${id}/status`);

// Activities
export interface Activity {
  id: string;
  type: string;
  agentId?: string;
  taskId?: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityParams {
  limit?: number;
  offset?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export const getActivities = async (params: ActivityParams = {}) => {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.type && params.type !== 'all') queryParams.append('type', params.type);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const data = await apiGet<any>(`/activities?${queryParams.toString()}`);
  // Handle wrapped response format { activities: [...] }
  if (data && typeof data === 'object' && 'activities' in data) {
    return (data as any).activities as Activity[];
  }
  // Handle direct array format
  if (Array.isArray(data)) {
    return data as Activity[];
  }
  return [];
};

export interface InstalledSkill {
  id: string;
  userId: string;
  skillId: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  category?: string;
  source?: string;
  config?: string;
  isEnabled: number;
  securityStatus: string;
  installDate: string;
  lastUsed?: string;
  // Enhanced fields for detail view
  dependencies?: {
    env?: string[];
    bins?: string[];
    bg_process?: boolean;
  };
  instructions?: string;
}

export const browseSkills = async () => {
  const data = await apiGet<{ skills: any[] }>('/skills/browse');
  return data?.skills || [];
};

export const getInstalledSkills = async () => {
  const data = await apiGet<{ skills: InstalledSkill[] }>('/skills');
  return data?.skills || [];
};

// Devlogs - Detailed development activity logs from agents
export interface Devlog {
  id: string;
  title: string;
  content: string;
  category: 'implementation' | 'bugfix' | 'refactor' | 'research';
  agentId?: string;
  agentName?: string;
  projectId?: string;
  trackId?: string; // Fallback for transition
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  tokensUsed: number;
  sessionDuration: number;
  isMilestone: boolean;
  createdAt: string;
}

export const getDevlogs = async (params: { limit?: number; workspaceId?: string } = {}) => {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.workspaceId) queryParams.set('workspaceId', params.workspaceId);
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  try {
    const data = await apiGet<any[]>(`/devlogs${query}`);
    return data ?? [];
  } catch {
    return [];
  }
};

// Cron Jobs - Scheduled tasks (from localStorage for local mode)
interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  agentId?: string;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'error';
  createdAt: string;
}

export const getCronJobs = async (): Promise<CronJob[]> => {
  const saved = localStorage.getItem('openclaw_cron_jobs');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const installSkill = async (skill: any) => {
  return await apiPost<{ skill: InstalledSkill }>('/skills/install', { skill });
};

export const uninstallSkill = async (skillId: string) => {
  return await apiDelete<{ success: boolean }>(`/skills/${skillId}`);
};

// Calendar API
export interface CalendarTasksResponse {
  tasks: Task[];
  tasksByDate: Record<string, Task[]>;
}

export const getCalendarTasks = async (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get<CalendarTasksResponse>(`/tasks/calendar?${params.toString()}`);
  const data = response.data;
  // Parse tasks
  const tasks = data.tasks ? parseTasks(data.tasks) : [];
  const tasksByDate: Record<string, Task[]> = {};
  if (data.tasksByDate) {
    for (const [date, dateTasks] of Object.entries(data.tasksByDate)) {
      tasksByDate[date] = parseTasks(dateTasks as any[]);
    }
  }
  return { tasks, tasksByDate };
};

// Global Search API
export interface SearchResults {
  tasks: Task[];
  documents: Document[];
  activities: Activity[];
}

export const globalSearch = async (query: string, types?: string[], limit?: number) => {
  const params = new URLSearchParams();
  params.append('q', query);
  if (types && types.length > 0) params.append('types', types.join(','));
  if (limit) params.append('limit', limit.toString());

  const data = await apiGet<SearchResults>(`/search?${params.toString()}`);

  // Parse results
  return {
    tasks: data.tasks ? parseTasks(data.tasks as any[]) : [],
    documents: data.documents || [],
    activities: data.activities || [],
  };
};

// OpenClaw Integration
export interface OpenClawConfig {
  mode: 'unified' | 'external';
  externalUrl?: string;
  apiKey?: string;
}

export interface OpenClawConnectionTestRequest {
  serverUrl: string;
  token: string;
  password?: string;
  mode: string;
}

export interface OpenClawConnectionTestResponse {
  success: boolean;
  message?: string;
  version?: string;
}

export interface OpenClawCheckConnectionRequest {
  serverUrl: string;
  token: string;
}

export interface OpenClawAgent {
  id: string;
  name: string;
  status?: string;
}

export interface OpenClawChannel {
  type: string;
  name: string;
  status: string;
}

export interface OpenClawCheckConnectionResponse {
  connected: boolean;
  message: string;
  version?: string;
  uptime?: string;
  agents?: OpenClawAgent[];
  agentCount?: number;
  channels?: OpenClawChannel[];
  channelCount?: number;
  model?: string;
  provider?: string;
  config?: Record<string, unknown>;
  errorDetails?: string;
  timestamp: string;
}

export const getOpenClawConfig = () => apiGet<OpenClawConfig>('/openclaw/config');

// Check actual live connection to OpenClaw instance
export const checkOpenClawConnection = (data: OpenClawCheckConnectionRequest) =>
  apiPost<OpenClawCheckConnectionResponse>('/openclaw/check-connection', data);

export interface SyncOpenClawAgentsRequest {
  serverUrl: string;
  token: string;
  workspaceId: string;
  pruneMissing?: boolean;
  maxAgents?: number;
}

export interface SyncOpenClawAgentsResponse {
  success: boolean;
  workspaceId: string;
  synced: number;
  created: number;
  updated: number;
  unchanged: number;
  truncated: boolean;
  sourceCount: number;
  results: Array<{ id: string; name: string; action: 'created' | 'updated' | 'unchanged' }>;
  error?: string;
}

export const syncOpenClawAgents = (data: SyncOpenClawAgentsRequest) =>
  apiPost<SyncOpenClawAgentsResponse>('/openclaw/sync-agents', data);


export interface OpenClawPluginSetupRequest {
  workspaceId: string;
  serverUrl: string;
  token: string;
}

export interface OpenClawPluginSetupResponse {
  success: boolean;
  workspaceId: string;
  plugin: {
    webhookUrl: string;
    workspaceId: string;
    webhookSecret: string;
    env: {
      CLAWPUTE_WEBHOOK_URL: string;
      CLAWPUTE_WORKSPACE_ID: string;
      CLAWPUTE_WEBHOOK_SECRET: string;
    };
  };
}

export interface OpenClawPluginStatusResponse {
  success: boolean;
  workspaceId: string;
  serverUrl?: string;
  tokenConfigured: boolean;
  pluginEnabled: boolean;
  webhookSecret: string | null;
}

export const setupOpenClawPlugin = (data: OpenClawPluginSetupRequest) =>
  apiPost<OpenClawPluginSetupResponse>('/openclaw/plugin/setup', data);

export const getOpenClawPluginStatus = (workspaceId: string) =>
  apiGet<OpenClawPluginStatusResponse>(`/openclaw/plugin/setup/${workspaceId}`);

// ========== OPENCLAW GATEWAY STATS & MESSAGES ==========

export interface OpenClawStatsRequest {
  serverUrl: string;
  token: string;
}

export interface OpenClawStatsResponse {
  success: boolean;
  connected: boolean;
  version?: string;
  uptime?: string;
  model?: string;
  provider?: string;
  agents?: OpenClawAgent[];
  agentCount?: number;
  channels?: OpenClawChannel[];
  channelCount?: number;
  gateway?: { url: string; status: string };
  timestamp?: string;
  config?: Record<string, unknown>;
  error?: string;
  errorDetails?: string;
}

export interface OpenClawGatewayHealthResponse {
  success: boolean;
  connected: boolean;
  version?: string;
  uptime?: string;
  model?: string | null;
  provider?: string | null;
  limitedMetadata?: boolean;
  warning?: string | null;
  diagnostics?: string[];
  error?: string;
  errorDetails?: string | null;
  timestamp?: string;
}

export interface OpenClawGatewayAgentsResponse {
  success: boolean;
  connected: boolean;
  agents: OpenClawAgent[];
  agentCount: number;
  diagnostics?: string[];
  error?: string;
  errorDetails?: string | null;
  timestamp?: string;
}

export interface OpenClawGatewayChannelsResponse {
  success: boolean;
  connected: boolean;
  channels: OpenClawChannel[];
  channelCount: number;
  diagnostics?: string[];
  error?: string;
  errorDetails?: string | null;
  timestamp?: string;
}

export interface OpenClawGatewayDatasetResponse {
  success: boolean;
  connected: boolean;
  source: 'tool' | 'http' | 'cli' | 'none';
  kind: string;
  items: unknown[];
  count: number;
  diagnostics?: string[];
  errorDetails?: string | null;
  timestamp?: string;
}

export interface OpenClawGatewayConfigResponse {
  success: boolean;
  config: Record<string, unknown>;
  error?: string;
}

export interface OpenClawGatewayConfigUpdateResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SendMessageToOpenClawRequest {
  serverUrl: string;
  token: string;
  password?: string;
  message: string;
  sessionKey?: string;
}

export interface SendMessageToOpenClawResponse {
  success: boolean;
  message?: string;
  sessionKey?: string;
  response?: Record<string, unknown>;
  error?: string;
}

export const sendMessageToOpenClaw = (data: SendMessageToOpenClawRequest) =>
  apiPost<SendMessageToOpenClawResponse>('/openclaw/send-message', data);

// Channels
export type ChannelType = 'discord' | 'telegram' | 'whatsapp' | 'webhook' | 'slack' | 'email';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  status: 'active' | 'inactive' | 'error';
  config: Record<string, string>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const getChannels = () => apiGet<Channel[]>('/channels');

export const getChannel = (id: string) => apiGet<Channel>(`/channels/${id}`);

export const createChannel = (data: Partial<Channel>) => apiPost<Channel>('/channels', data);

export const updateChannel = (id: string, data: Partial<Channel>) => apiPatch<Channel>(`/channels/${id}`, data);

export const deleteChannel = (id: string) => apiDelete(`/channels/${id}`);

export const testChannelConnection = (id: string) => apiPost<{ success: boolean; message?: string }>(`/channels/${id}/test`);

// ========== AUTH API ==========

export interface LoginResponse {
  success: boolean;
  message?: string;
  error?: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: string;
    isDemo?: boolean;
  };
  token: string;
  defaultWorkspaceId?: string | null;
  defaultWorkspaceSlug?: string | null;
}

export const demoLogin = (email: string, password: string) =>
  apiPost<LoginResponse>('/auth/demo-login', { email, password });

export const login = (email: string, password: string) =>
  apiPost<LoginResponse>('/auth/login', { email, password });

export const getCurrentUser = () =>
  apiGet<{ id: string; email: string; name: string; avatar?: string; role: string; isDemo?: boolean }>('/auth/me');

// ========== AGENT FILES API ==========

export interface AgentFile {
  id: string;
  agentId: string;
  filename: 'SOUL.md' | 'IDENTITY.md' | 'HEARTBEAT.md' | 'USER.md' | 'MEMORY.md';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const getAgentFiles = (agentId: string) =>
  apiGet<AgentFile[]>(`/agents/${agentId}/files`).then(data => {
    // Handle wrapped response
    if (data && typeof data === 'object' && 'files' in data) {
      return (data as any).files as AgentFile[];
    }
    return data as AgentFile[];
  });

export const getAgentFile = (agentId: string, filename: string) =>
  apiGet<AgentFile>(`/agents/${agentId}/files/${filename}`);

export const updateAgentFile = (agentId: string, filename: string, content: string) =>
  apiPut<{ success: boolean; id: string; updatedAt: string }>(`/agents/${agentId}/files/${filename}`, { content });

export const deleteAgentFile = (agentId: string, filename: string) =>
  apiDelete<{ success: boolean }>(`/agents/${agentId}/files/${filename}`);

// ========== HEARTBEAT CONFIGURATION API ==========

export interface HeartbeatConfig {
  enabled: boolean;
  every: number;
  target: string | null;
  includeReasoning: boolean;
  activeHours: { start: string; end: string } | null;
  method: string;
  intervalMs: number;
}

export const getAgentHeartbeat = (agentId: string) =>
  apiGet<{ success: boolean; heartbeat: HeartbeatConfig }>(`/agents/${agentId}/heartbeat`);

export const updateAgentHeartbeat = (agentId: string, config: Partial<HeartbeatConfig>) =>
  apiPut<{ success: boolean; heartbeat: HeartbeatConfig }>(`/agents/${agentId}/heartbeat`, config);

export const deleteAgentHeartbeat = (agentId: string) =>
  apiDelete<{ success: boolean; message: string }>(`/agents/${agentId}/heartbeat`);

export const wakeAgent = (agentId: string, data: { serverUrl: string; token: string }) =>
  apiPost<{ success: boolean; message: string; error?: string }>(`/agents/${agentId}/wake`, data);

// ========== GATEWAY CONFIG WITH OPTIMISTIC LOCKING ==========

export interface GatewayConfigResponse {
  success: boolean;
  config: Record<string, unknown>;
  hash: string;
  timestamp: string;
  error?: string;
}

export interface GatewayConfigSetResponse {
  success: boolean;
  config: Record<string, unknown>;
  hash: string;
  message: string;
  error?: string;
  retry?: boolean;
  currentHash?: string;
  expectedHash?: string;
}

export const getGatewayConfigWithHash = (data: OpenClawStatsRequest) =>
  apiPost<GatewayConfigResponse>('/config', data);

export const setGatewayConfigWithLock = (data: OpenClawStatsRequest & { config: Record<string, unknown>; expectedHash?: string }) =>
  apiPost<GatewayConfigSetResponse>('/config/set', data);

// ========== AGENT FILES VIA GATEWAY ==========

export interface GatewayFileResponse {
  success: boolean;
  agentId: string;
  filename: string;
  content: string;
  source: string;
  error?: string;
}

export const getAgentFileFromGateway = (agentId: string, filename: string, data: OpenClawStatsRequest) =>
  apiPost<GatewayFileResponse>(`/agents/${agentId}/files/${filename}/gateway`, data);

export const updateAgentFileOnGateway = (agentId: string, filename: string, data: OpenClawStatsRequest & { content: string }) =>
  apiPut<GatewayFileResponse>(`/agents/${agentId}/files/${filename}/gateway`, data);

// ========== BEADS / TASK CONTROL PLANE ==========

export interface BeadsExecuteRequest {
  command: string;
  args?: string[];
  cwd?: string;
}

export interface BeadsExecuteResponse {
  success: boolean;
  command: string;
  args: string[];
  cwd: string;
  output: unknown;
  rawOutput: string;
  error?: string;
}

export const executeBeadsCommand = (data: BeadsExecuteRequest) =>
  apiPost<BeadsExecuteResponse>('/beads/execute', data);

export interface TaskListItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResponse {
  success: boolean;
  tasks: TaskListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const getBeadsTasks = (filters?: { status?: string; limit?: number; offset?: number }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());
  return apiGet<TaskListResponse>(`/beads/tasks?${params.toString()}`);
};

export interface TaskDetailResponse {
  success: boolean;
  task: TaskListItem;
  messages: Message[];
}

export const getBeadsTask = (taskId: string) =>
  apiGet<TaskDetailResponse>(`/beads/tasks/${taskId}`);

// ========== MESSAGES API ==========

export interface Message {
  id: string;
  taskId: string;
  agentId?: string;
  userId?: string;
  content: string;
  type: 'comment' | 'system' | 'progress' | 'openclaw';
  source?: string;
  attachments?: string[];
  timestamp: string;
}

export const getTaskMessages = (taskId: string) =>
  apiGet<Message[]>(`/tasks/${taskId}/messages`).then(data => {
    if (data && typeof data === 'object' && 'messages' in data) {
      return (data as any).messages as Message[];
    }
    return data as Message[];
  });

export const createTaskMessage = (taskId: string, content: string, type: string = 'comment') =>
  apiPost<Message>(`/tasks/${taskId}/messages`, { content, type });

// ========== DOCUMENTS API ==========

export interface Document {
  id: string;
  title: string;
  content?: string;
  type: 'code' | 'markdown' | 'image' | 'text' | 'media' | 'document';
  path?: string;
  taskId?: string;
  agentId?: string;
  createdAt: string;
}

export const getTaskDocuments = (taskId: string) =>
  apiGet<Document[]>(`/tasks/${taskId}/documents`).then(data => {
    if (data && typeof data === 'object' && 'documents' in data) {
      return (data as any).documents as Document[];
    }
    return data as Document[];
  });

export const getDocuments = () =>
  apiGet<Document[]>('/documents').then(data => {
    if (data && typeof data === 'object' && 'documents' in data) {
      return (data as any).documents as Document[];
    }
    return data as Document[];
  });

export const getDocument = (id: string) =>
  apiGet<Document>(`/documents/${id}`);

// ========== BIDIRECTIONAL TASK EXECUTION ==========

export interface ExecuteTaskRequest {
  prompt?: string;
  agent?: string;
}

export interface ExecuteTaskResponse {
  success: boolean;
  taskId: string;
  runId: string;
  message: string;
}

export const executeTaskInOpenClaw = (taskId: string, data: ExecuteTaskRequest) =>
  apiPost<ExecuteTaskResponse>(`/tasks/${taskId}/execute`, data);

// ========== OPENCLAW STATS & SETTINGS ==========

export interface OpenClawConnection {
  id: string;
  name: string;
  url: string;
  mode: string;
  isDefault: boolean;
  lastSyncAt?: string;
  syncStatus?: string;
  createdAt: string;
}

export interface OpenClawStats {
  connected: boolean;
  version?: string;
  uptime?: string;
  agents?: number;
  message?: string;
  lastError?: string;
}

export interface OpenClawStatsResponse {
  connection: {
    id: string;
    name: string;
    url: string;
    mode: string;
    lastSyncAt?: string;
    syncStatus?: string;
  };
  openclaw: OpenClawStats;
  tasks: {
    total: number;
    inProgress: number;
    completed: number;
    fromOpenClaw: number;
  };
}

export const getOpenClawStats = () =>
  apiGet<OpenClawStatsResponse>('/openclaw/stats');

// Alias for backward compatibility
export const fetchOpenClawStats = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawStatsResponse>('/openclaw/gateway-stats', data);

export const getGatewayConfig = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayConfigResponse>('/openclaw/gateway-config', data);

export const getGatewayHealth = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayHealthResponse>('/openclaw/gateway-health', data);

export const getGatewayAgents = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayAgentsResponse>('/openclaw/gateway-agents', data);

export const getGatewayChannels = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayChannelsResponse>('/openclaw/gateway-channels', data);

export const getGatewayChatMessages = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayDatasetResponse>('/openclaw/gateway-chat-messages', data);

export const getGatewaySessions = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayDatasetResponse>('/openclaw/gateway-sessions', data);

export const getGatewayWorkspaceFiles = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayDatasetResponse>('/openclaw/gateway-workspace-files', data);

export const getGatewayUsage = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayDatasetResponse>('/openclaw/gateway-usage', data);

export const getGatewayCronJobs = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayDatasetResponse>('/openclaw/gateway-cron-jobs', data);

export const getGatewaySkills = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayDatasetResponse>('/openclaw/gateway-skills', data);

export const getGatewayLogs = (data: OpenClawStatsRequest) =>
  apiPost<OpenClawGatewayDatasetResponse>('/openclaw/gateway-logs', data);

export const updateGatewayConfig = (data: OpenClawStatsRequest & { config: Record<string, unknown> }) =>
  apiPost<OpenClawGatewayConfigUpdateResponse>('/openclaw/gateway-config-update', data);

export const restartGateway = (data: OpenClawStatsRequest) =>
  apiPost<{ success: boolean; message: string }>('/openclaw/gateway-restart', data);

export const updateGatewaySleep = (data: OpenClawStatsRequest & { sleepTimeMs: number }) =>
  apiPost<{ success: boolean; message: string }>('/openclaw/gateway-sleep', data);

// Push all agents to OpenClaw Gateway
export interface PushAgentsResponse {
  success: boolean;
  pushed?: number;
  failed?: number;
  message?: string;
  error?: string;
}

export const pushAgentsToOpenClaw = (data: OpenClawStatsRequest) =>
  apiPost<PushAgentsResponse>('/openclaw/push-agents', data);

// Push all agent files to OpenClaw Gateway
export interface PushFilesResponse {
  success: boolean;
  pushed?: number;
  message?: string;
  error?: string;
}

export const pushFilesToOpenClaw = (data: OpenClawStatsRequest) =>
  apiPost<PushFilesResponse>('/openclaw/push-files', data);

export const getAgentMemory = (agentId: string, data: OpenClawStatsRequest) =>
  apiGet<{ success: boolean; memory: string }>(`/openclaw/agent-memory/${agentId}?serverUrl=${encodeURIComponent(data.serverUrl)}&token=${encodeURIComponent(data.token)}`);

export const updateAgentMemory = (agentId: string, data: OpenClawStatsRequest & { content: string }) =>
  apiPatch<{ success: boolean; message: string }>(`/openclaw/agent-memory/${agentId}`, data);

export interface TestConnectionRequest {
  url: string;
  apiKey?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  checks: Array<{
    name: string;
    success: boolean;
    message: string;
  }>;
  version?: string;
  agents?: number;
}

export const testOpenClawConnection = (data: TestConnectionRequest) =>
  apiPost<TestConnectionResponse>('/openclaw/test', data);

// Alias for old API
export const testOpenClawConnectionAPI = (data: OpenClawConnectionTestRequest) =>
  apiPost<OpenClawConnectionTestResponse>('/openclaw/test-connection', data);

export const createOpenClawConnection = (data: Partial<OpenClawConnection> & { apiKey?: string }) =>
  apiPost<{ success: boolean; connection: OpenClawConnection }>('/openclaw/connection', data);

export const updateOpenClawConnection = (id: string, data: Partial<OpenClawConnection>) =>
  apiPatch<{ success: boolean; connection: OpenClawConnection }>(`/openclaw/connection/${id}`, data);

export const getOpenClawConnections = () =>
  apiGet<{ connections: OpenClawConnection[] }>('/openclaw/connections').then(data =>
    data?.connections || []
  );

export const deleteOpenClawConnection = (id: string) =>
  apiDelete<{ success: boolean }>(`/openclaw/connection/${id}`);

export default api;

import axios from 'axios';
import { v4 as uuid } from 'uuid';

// OpenClaw Integration Service
// Handles both unified (local data directory) and external (API-based) modes

export interface OpenClawConfig {
  mode: 'unified' | 'external';
  externalUrl?: string;
  apiKey?: string;
  dataDir?: string;
}

export interface OpenClawAgent {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  role: string;
  level: string;
  status: string;
  model: string;
  tools: {
    enabled: string[];
    quick_preset?: string;
  };
  skills?: number;
  sub_agents?: OpenClawAgent[];
  created_at?: string;
  updated_at?: string;
}

export interface OpenClawTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ExternalApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class OpenClawService {
  private config: OpenClawConfig;
  private httpClient;

  constructor(config: OpenClawConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.externalUrl || '',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ========== AGENT OPERATIONS ==========

  async getAgents(): Promise<OpenClawAgent[]> {
    if (this.config.mode === 'unified') {
      return this.getLocalAgents();
    }
    return this.getExternalAgents();
  }

  async getAgent(id: string): Promise<OpenClawAgent | null> {
    if (this.config.mode === 'unified') {
      return this.getLocalAgent(id);
    }
    return this.getExternalAgent(id);
  }

  async createAgent(agent: Partial<OpenClawAgent>): Promise<OpenClawAgent> {
    if (this.config.mode === 'unified') {
      return this.createLocalAgent(agent);
    }
    return this.createExternalAgent(agent);
  }

  async updateAgent(id: string, updates: Partial<OpenClawAgent>): Promise<OpenClawAgent | null> {
    if (this.config.mode === 'unified') {
      return this.updateLocalAgent(id, updates);
    }
    return this.updateExternalAgent(id, updates);
  }

  async deleteAgent(id: string): Promise<boolean> {
    if (this.config.mode === 'unified') {
      return this.deleteLocalAgent(id);
    }
    return this.deleteExternalAgent(id);
  }

  // ========== TASK OPERATIONS ==========

  async getTasks(filters?: { status?: string; assigneeId?: string }): Promise<OpenClawTask[]> {
    if (this.config.mode === 'unified') {
      return this.getLocalTasks(filters);
    }
    return this.getExternalTasks(filters);
  }

  async createTask(task: Partial<OpenClawTask>): Promise<OpenClawTask> {
    if (this.config.mode === 'unified') {
      return this.createLocalTask(task);
    }
    return this.createExternalTask(task);
  }

  async updateTask(id: string, updates: Partial<OpenClawTask>): Promise<OpenClawTask | null> {
    if (this.config.mode === 'unified') {
      return this.updateLocalTask(id, updates);
    }
    return this.updateExternalTask(id, updates);
  }

  // ========== EXECUTION OPERATIONS ==========

  async runAgent(agentId: string, instruction: string): Promise<{ sessionId: string }> {
    if (this.config.mode === 'unified') {
      return this.runLocalAgent(agentId, instruction);
    }
    return this.runExternalAgent(agentId, instruction);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.config.mode === 'unified') {
      // For unified mode, just check if data directory exists
      return { success: true, message: 'Unified mode - local data directory' };
    }

    try {
      const response = await this.httpClient.get('/api/health');
      return {
        success: response.data.status === 'connected',
        message: response.data.status === 'connected' ? 'Connected' : 'Server responded but not ready',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ========== EXTERNAL MODE IMPLEMENTATIONS ==========

  private async getExternalAgents(): Promise<OpenClawAgent[]> {
    const response = await this.httpClient.get<ExternalApiResponse<OpenClawAgent[]>>('/api/agents');
    return response.data.data || [];
  }

  private async getExternalAgent(id: string): Promise<OpenClawAgent | null> {
    const response = await this.httpClient.get<ExternalApiResponse<OpenClawAgent>>(`/api/agents/${id}`);
    return response.data.data || null;
  }

  private async createExternalAgent(agent: Partial<OpenClawAgent>): Promise<OpenClawAgent> {
    const response = await this.httpClient.post<ExternalApiResponse<OpenClawAgent>>('/api/agents', agent);
    if (!response.data.data) throw new Error('Failed to create agent');
    return response.data.data;
  }

  private async updateExternalAgent(id: string, updates: Partial<OpenClawAgent>): Promise<OpenClawAgent | null> {
    const response = await this.httpClient.patch<ExternalApiResponse<OpenClawAgent>>(`/api/agents/${id}`, updates);
    return response.data.data || null;
  }

  private async deleteExternalAgent(id: string): Promise<boolean> {
    const response = await this.httpClient.delete<ExternalApiResponse<void>>(`/api/agents/${id}`);
    return response.data.success;
  }

  private async getExternalTasks(filters?: { status?: string; assigneeId?: string }): Promise<OpenClawTask[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
    const response = await this.httpClient.get<ExternalApiResponse<OpenClawTask[]>>(`/api/tasks?${params.toString()}`);
    return response.data.data || [];
  }

  private async createExternalTask(task: Partial<OpenClawTask>): Promise<OpenClawTask> {
    const response = await this.httpClient.post<ExternalApiResponse<OpenClawTask>>('/api/tasks', task);
    if (!response.data.data) throw new Error('Failed to create task');
    return response.data.data;
  }

  private async updateExternalTask(id: string, updates: Partial<OpenClawTask>): Promise<OpenClawTask | null> {
    const response = await this.httpClient.patch<ExternalApiResponse<OpenClawTask>>(`/api/tasks/${id}`, updates);
    return response.data.data || null;
  }

  private async runExternalAgent(agentId: string, instruction: string): Promise<{ sessionId: string }> {
    const response = await this.httpClient.post<ExternalApiResponse<{ sessionId: string }>>(`/api/agents/${agentId}/run`, { instruction });
    if (!response.data.data) throw new Error('Failed to run agent');
    return response.data.data;
  }

  // ========== UNIFIED MODE IMPLEMENTATIONS ==========
  // These would read/write to the local data directory

  private async getLocalAgents(): Promise<OpenClawAgent[]> {
    // Would read from config.dataDir/agents/*.json
    // For now, return empty array as placeholder
    return [];
  }

  private async getLocalAgent(id: string): Promise<OpenClawAgent | null> {
    return null;
  }

  private async createLocalAgent(agent: Partial<OpenClawAgent>): Promise<OpenClawAgent> {
    const newAgent: OpenClawAgent = {
      id: uuid(),
      name: agent.name || 'New Agent',
      avatar: agent.avatar || '🤖',
      role: agent.role || 'Agent',
      level: agent.level || 'intern',
      status: 'idle',
      model: agent.model || 'claude-3-opus',
      tools: { enabled: [] },
      ...agent,
    };
    return newAgent;
  }

  private async updateLocalAgent(id: string, updates: Partial<OpenClawAgent>): Promise<OpenClawAgent | null> {
    return null;
  }

  private async deleteLocalAgent(id: string): Promise<boolean> {
    return true;
  }

  private async getLocalTasks(filters?: { status?: string; assigneeId?: string }): Promise<OpenClawTask[]> {
    return [];
  }

  private async createLocalTask(task: Partial<OpenClawTask>): Promise<OpenClawTask> {
    const newTask: OpenClawTask = {
      id: uuid(),
      title: task.title || 'New Task',
      description: task.description || '',
      status: task.status || 'inbox',
      priority: task.priority || 'medium',
      ...task,
    };
    return newTask;
  }

  private async updateLocalTask(id: string, updates: Partial<OpenClawTask>): Promise<OpenClawTask | null> {
    return null;
  }

  private async runLocalAgent(agentId: string, instruction: string): Promise<{ sessionId: string }> {
    // In unified mode, would spawn agent locally
    return { sessionId: uuid() };
  }
}

// Factory function to create OpenClaw service
export function createOpenClawService(config: OpenClawConfig): OpenClawService {
  return new OpenClawService(config);
}

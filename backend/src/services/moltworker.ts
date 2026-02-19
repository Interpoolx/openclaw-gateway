// MoltWorker Service
// Provides sandboxed execution environment for OpenClaw agents
// Uses Cloudflare Workers for isolated, serverless execution

export interface MoltWorkerConfig {
  enabled: boolean;
  timeoutMs: number;
  memoryLimit: number;
  cpuLimit: number;
}

export interface MoltWorkerTask {
  id: string;
  agentId: string;
  instruction: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentExecutionRequest {
  agentId: string;
  instruction: string;
  sandbox?: boolean;
}

export interface AgentExecutionResponse {
  success: boolean;
  sessionId: string;
  output?: string;
  error?: string;
}

// MoltWorker types for Cloudflare Workers
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ModuleWorkerEnv {
  OPENCLAW_URL: string;
  OPENCLAW_API_KEY: string;
}

export class MoltWorkerService {
  private config: MoltWorkerConfig;
  private env: ModuleWorkerEnv;
  private ctx: ExecutionContext;

  constructor(config: MoltWorkerConfig, env: ModuleWorkerEnv, ctx: ExecutionContext) {
    this.config = config;
    this.env = env;
    this.ctx = ctx;
  }

  // Execute an agent instruction in a sandboxed environment
  async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const sessionId = this.generateSessionId();

    if (!this.config.enabled) {
      // Execute directly without sandbox
      return this.executeDirect(request, sessionId);
    }

    // Execute in sandbox (MoltWorker)
    return this.executeInSandbox(request, sessionId);
  }

  private async executeDirect(request: AgentExecutionRequest, sessionId: string): Promise<AgentExecutionResponse> {
    try {
      // Call OpenClaw directly
      const response = await fetch(`${this.env.OPENCLAW_URL}/api/agents/${request.agentId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.OPENCLAW_API_KEY}`,
        },
        body: JSON.stringify({
          instruction: request.instruction,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenClaw API error: ${response.statusText}`);
      }

      const data: { output?: string; result?: string } = await response.json();

      return {
        success: true,
        sessionId,
        output: data.output || data.result,
      };
    } catch (error) {
      return {
        success: false,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeInSandbox(request: AgentExecutionRequest, sessionId: string): Promise<AgentExecutionResponse> {
    // MoltWorker sandbox execution
    // In a real implementation, this would spawn a separate worker or use isolates
    try {
      // Create sandboxed task
      const sandboxTask: MoltWorkerTask = {
        id: sessionId,
        agentId: request.agentId,
        instruction: request.instruction,
        status: 'pending',
      };

      // Submit to sandbox queue
      await this.submitToSandbox(sandboxTask);

      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      return {
        success: false,
        sessionId,
        error: error instanceof Error ? error.message : 'Sandbox execution failed',
      };
    }
  }

  private async submitToSandbox(task: MoltWorkerTask): Promise<void> {
    // Submit task to MoltWorker sandbox
    // This would typically go to a queue or durable object
    console.log(`[MoltWorker] Submitting task: ${task.id}`);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Check sandbox status
  async getSandboxStatus(): Promise<{ healthy: boolean; activeTasks: number }> {
    return {
      healthy: true,
      activeTasks: 0,
    };
  }

  // Terminate a running task
  async terminateTask(sessionId: string): Promise<boolean> {
    console.log(`[MoltWorker] Terminating task: ${sessionId}`);
    return true;
  }
}

// Factory function
export function createMoltWorkerService(
  config: MoltWorkerConfig,
  env: ModuleWorkerEnv,
  ctx: ExecutionContext
): MoltWorkerService {
  return new MoltWorkerService(config, env, ctx);
}

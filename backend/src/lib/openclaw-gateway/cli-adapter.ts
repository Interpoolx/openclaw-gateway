type CliRunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  command: string;
  error?: string;
};

type CliJsonRunResult = {
  ok: boolean;
  payload: any;
  diagnostics: string[];
  command?: string;
  error?: string;
};

export interface CliCreateAgentArgs {
  name: string;
  model?: string | null;
  emoji?: string | null;
  avatar?: string | null;
  workspaceDir?: string | null;
}

export interface CliCreateAgentResult {
  created: boolean;
  agentId?: string;
  diagnostics: string[];
  error?: string;
}

function getCliCandidates(): Array<{ bin: string; prefix: string[]; label: string }> {
  const candidates: Array<{ bin: string; prefix: string[]; label: string }> = [];

  const envBin = (globalThis as any)?.process?.env?.OPENCLAW_CLI_BIN;
  if (typeof envBin === 'string' && envBin.trim().length > 0) {
    const cleaned = envBin.trim();
    if (cleaned.includes(' ')) {
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        candidates.push({
          bin: parts[0]!,
          prefix: parts.slice(1),
          label: `env:${cleaned}`,
        });
      }
    } else {
      candidates.push({ bin: cleaned, prefix: [], label: `env:${cleaned}` });
    }
  }

  candidates.push({ bin: 'openclaw', prefix: [], label: 'openclaw' });
  candidates.push({
    bin: 'wsl',
    prefix: ['~/.npm-global/bin/openclaw'],
    label: 'wsl:/home/vibecoder/.npm-global/bin/openclaw',
  });
  candidates.push({ bin: 'wsl', prefix: ['openclaw'], label: 'wsl:openclaw' });

  return candidates;
}

function defaultCliWorkspaceDir(): string {
  const envPath = (globalThis as any)?.process?.env?.OPENCLAW_CLI_WORKSPACE;
  if (typeof envPath === 'string' && envPath.trim().length > 0) {
    return envPath.trim();
  }
  return '/home/vibecoder/.openclaw/workspace';
}

async function runCli(prefix: string[], args: string[]): Promise<CliRunResult> {
  try {
    const { spawnSync } = await import('child_process');
    const bin = prefix[0]!;
    const fullArgs = [...prefix.slice(1), ...args];
    const result = spawnSync(bin, fullArgs, {
      encoding: 'utf-8',
      timeout: 20000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const stdout = typeof result.stdout === 'string' ? result.stdout : '';
    const stderr = typeof result.stderr === 'string' ? result.stderr : '';
    const command = `${bin} ${fullArgs.join(' ')}`.trim();

    if (result.error) {
      return {
        ok: false,
        stdout,
        stderr,
        command,
        error: result.error.message,
      };
    }

    if ((result.status ?? 1) !== 0) {
      return {
        ok: false,
        stdout,
        stderr,
        command,
        error: stderr || stdout || `CLI exited with status ${result.status}`,
      };
    }

    return { ok: true, stdout, stderr, command };
  } catch (error) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      command: `${prefix.join(' ')} ${args.join(' ')}`.trim(),
      error: error instanceof Error ? error.message : 'Failed to execute CLI command',
    };
  }
}

function extractJsonObject(text: string): any | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const candidate = trimmed.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  return null;
}

function parseAgentIdFromCliPayload(payload: any): string | undefined {
  const possible = [
    payload?.agentId,
    payload?.agent?.id,
    payload?.id,
    payload?.data?.id,
    payload?.result?.id,
  ];
  for (const value of possible) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function parseJsonLines(text: string): any[] {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: any[] = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      parsed.push(obj);
    } catch {
    }
  }
  return parsed;
}

async function runOpenClawCliJson(args: string[]): Promise<CliJsonRunResult> {
  const diagnostics: string[] = [];
  const candidates = getCliCandidates();
  let lastError = 'No CLI candidate succeeded';

  for (const candidate of candidates) {
    const prefix = [candidate.bin, ...candidate.prefix];
    diagnostics.push(`[cli] trying ${candidate.label}: ${args.join(' ')}`);
    const result = await runCli(prefix, args);
    if (!result.ok) {
      lastError = result.error ?? 'command failed';
      diagnostics.push(`[cli] failed ${candidate.label}: ${lastError}`);
      continue;
    }

    const payload = extractJsonObject(result.stdout);
    if (payload !== null) {
      diagnostics.push(`[cli] success ${candidate.label}`);
      return { ok: true, payload, diagnostics, command: result.command };
    }

    const jsonLines = parseJsonLines(result.stdout);
    if (jsonLines.length > 0) {
      diagnostics.push(`[cli] success ${candidate.label} (json-lines=${jsonLines.length})`);
      return { ok: true, payload: jsonLines, diagnostics, command: result.command };
    }

    lastError = 'CLI command returned non-JSON output';
    diagnostics.push(`[cli] ${candidate.label} non-JSON output`);
  }

  return { ok: false, payload: null, diagnostics, error: lastError };
}

export async function createAgentViaCli(input: CliCreateAgentArgs): Promise<CliCreateAgentResult> {
  const diagnostics: string[] = [];
  const name = input.name.trim();
  if (!name) {
    return { created: false, diagnostics, error: 'Agent name is required for CLI fallback' };
  }

  const candidates = getCliCandidates();
  let lastError = 'No OpenClaw CLI candidate succeeded';
  const workspaceDir = (input.workspaceDir && input.workspaceDir.trim()) || defaultCliWorkspaceDir();

  for (const candidate of candidates) {
    const prefix = [candidate.bin, ...candidate.prefix];
    const addArgs = ['agents', 'add', name, '--json'];
    if (input.model) {
      addArgs.push('--model', input.model);
    }
    addArgs.push('--workspace', workspaceDir, '--non-interactive');

    diagnostics.push(`[cli] trying ${candidate.label}: agents add`);
    const addResult = await runCli(prefix, addArgs);
    if (!addResult.ok) {
      lastError = addResult.error ?? 'agents add failed';
      diagnostics.push(`[cli] add failed (${candidate.label}): ${lastError}`);
      continue;
    }

    diagnostics.push(`[cli] add ok (${candidate.label})`);
    const payload = extractJsonObject(addResult.stdout);
    const agentId = parseAgentIdFromCliPayload(payload);

    if (!agentId) {
      return {
        created: true,
        diagnostics,
      };
    }

    const identityArgs = ['agents', 'set-identity', '--agent', agentId, '--name', name, '--json'];
    identityArgs.push('--workspace', workspaceDir);
    if (input.emoji) identityArgs.push('--emoji', input.emoji);
    if (input.avatar) identityArgs.push('--avatar', input.avatar);

    const identityResult = await runCli(prefix, identityArgs);
    if (!identityResult.ok) {
      diagnostics.push(`[cli] set-identity skipped/failed for ${agentId}: ${identityResult.error ?? 'unknown'}`);
      return { created: true, agentId, diagnostics };
    }

    diagnostics.push(`[cli] set-identity ok for ${agentId}`);
    return { created: true, agentId, diagnostics };
  }

  return {
    created: false,
    diagnostics,
    error: lastError,
  };
}

export async function getGatewayStatusViaCli(): Promise<CliJsonRunResult> {
  return runOpenClawCliJson(['gateway', 'status', '--json']);
}

export async function getGatewayConfigViaCli(): Promise<CliJsonRunResult> {
  return runOpenClawCliJson(['config', 'get', 'gateway', '--json']);
}

export async function getChannelsViaCli(): Promise<CliJsonRunResult> {
  return runOpenClawCliJson(['channels', 'status', '--json']);
}

export async function getSessionsViaCli(): Promise<CliJsonRunResult> {
  return runOpenClawCliJson(['sessions', '--json']);
}

export async function getSkillsViaCli(): Promise<CliJsonRunResult> {
  return runOpenClawCliJson(['skills', 'list', '--json']);
}

export async function getCronJobsViaCli(): Promise<CliJsonRunResult> {
  return runOpenClawCliJson(['cron', 'list', '--json']);
}

export async function getUsageViaCli(): Promise<CliJsonRunResult> {
  return runOpenClawCliJson(['gateway', 'usage-cost', '--json']);
}

export async function getLogsViaCli(): Promise<CliJsonRunResult> {
  return runOpenClawCliJson(['logs', '--json', '--limit', '200']);
}

export type ConfigValidationStatus = 'INVALID' | 'VALID' | 'READY';

export interface ConfigValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ConfigValidationResult {
  status: ConfigValidationStatus;
  errors: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
  info: ConfigValidationIssue[];
}

const PROVIDERS = new Set(['anthropic', 'openai', 'ollama', 'mistralai', 'other', 'minimax', 'openrouter']);
const KNOWN_MODELS = new Set([
  'claude-3-5-sonnet',
  'claude-3-7-sonnet',
  'claude-opus-4',
  'gpt-4o',
  'gpt-4.1',
  'gpt-5',
  'gpt-3.5-turbo',
  'o3-mini',
  'mistral-large',
  'mistral-small',
  'llama3.1',
  'qwen2.5',
  'minimax-m2.1',
  'anthropic/claude-3-5-sonnet',
  'openai/gpt-4o',
  'ollama/llama3.1',
  'openrouter/anthropic/claude-opus',
]);

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /YOUR_[A-Z_]+/,
  /<[A-Z_]+>/,
  /REPLACE_ME/i,
  /YOUR[-_]TOKEN/i,
  /API[-_]KEY[-_]HERE/i,
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function detectPlaceholders(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[]
): void {
  if (typeof value === 'string') {
    if (isPlaceholder(value)) {
      issues.push({
        field: path || '$',
        message: 'Placeholder value detected. Replace before deploying.',
        severity: 'warning',
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => detectPlaceholders(item, `${path}[${index}]`, issues));
    return;
  }

  if (isObject(value)) {
    Object.entries(value).forEach(([key, nested]) => {
      const nestedPath = path ? `${path}.${key}` : key;
      detectPlaceholders(nested, nestedPath, issues);
    });
  }
}

function parseConfigInput(config: string | Record<string, unknown>): {
  data: Record<string, unknown> | null;
  parseError?: ConfigValidationIssue;
} {
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config) as unknown;
      if (!isObject(parsed)) {
        return {
          data: null,
          parseError: {
            field: '$',
            message: 'Config JSON must be an object at the root.',
            severity: 'error',
          },
        };
      }
      return { data: parsed };
    } catch (error) {
      return {
        data: null,
        parseError: {
          field: '$',
          message: `Invalid JSON: ${error instanceof Error ? error.message : 'unknown parse error'}`,
          severity: 'error',
        },
      };
    }
  }

  if (!isObject(config)) {
    return {
      data: null,
      parseError: {
        field: '$',
        message: 'Config must be a JSON object.',
        severity: 'error',
      },
    };
  }

  return { data: config };
}

export function validateConfig(config: string | Record<string, unknown>): ConfigValidationResult {
  const errors: ConfigValidationIssue[] = [];
  const warnings: ConfigValidationIssue[] = [];
  const info: ConfigValidationIssue[] = [];

  const parsed = parseConfigInput(config);
  if (!parsed.data) {
    return {
      status: 'INVALID',
      errors: parsed.parseError ? [parsed.parseError] : [],
      warnings,
      info,
    };
  }

  const jsonSize = JSON.stringify(parsed.data).length;
  if (jsonSize > 64 * 1024) {
    errors.push({
      field: '$',
      message: 'Config exceeds 64KB size limit for saved setups.',
      severity: 'error',
    });
  }

  const root = parsed.data;

  if (!('version' in root)) {
    errors.push({ field: 'version', message: 'Missing required root key: version', severity: 'error' });
  }

  if (!('agent' in root) || !isObject(root.agent)) {
    errors.push({ field: 'agent', message: 'Missing or invalid required root key: agent', severity: 'error' });
  }

  if (!('channels' in root) || !Array.isArray(root.channels) || root.channels.length === 0) {
    errors.push({
      field: 'channels',
      message: 'channels must be a non-empty array.',
      severity: 'error',
    });
  }

  if (isObject(root.agent)) {
    const provider = typeof root.agent.provider === 'string' ? root.agent.provider.toLowerCase() : '';
    const model = typeof root.agent.model === 'string' ? root.agent.model.trim() : '';

    if (!provider) {
      errors.push({ field: 'agent.provider', message: 'agent.provider is required.', severity: 'error' });
    } else if (!PROVIDERS.has(provider)) {
      errors.push({
        field: 'agent.provider',
        message: `Unsupported provider "${provider}".`,
        severity: 'error',
      });
    }

    if (!model) {
      errors.push({ field: 'agent.model', message: 'agent.model is required.', severity: 'error' });
    }

    const tools = root.agent.tools;
    if (Array.isArray(tools)) {
      const deduped = new Set<string>();
      for (const tool of tools) {
        const name = String(tool);
        if (deduped.has(name)) {
          errors.push({
            field: 'agent.tools',
            message: `Duplicate tool entry "${name}" found.`,
            severity: 'error',
          });
          break;
        }
        deduped.add(name);
      }
    }

    const fallbackChain = root.agent.fallback_chain;
    if (Array.isArray(fallbackChain)) {
      for (const fallbackModel of fallbackChain) {
        const modelValue = String(fallbackModel);
        if (!KNOWN_MODELS.has(modelValue)) {
          warnings.push({
            field: 'agent.fallback_chain',
            message: `Fallback model "${modelValue}" is not in known model list.`,
            severity: 'warning',
          });
        }
      }

      if (fallbackChain.length === 1) {
        info.push({
          field: 'agent.fallback_chain',
          message: 'Fallback chain has one entry; behavior is similar to no chain.',
          severity: 'info',
        });
      }
    }

    const memory = root.agent.memory;
    if (isObject(memory) && memory.enabled === true && !memory.backend) {
      warnings.push({
        field: 'agent.memory.backend',
        message: 'Memory is enabled but no memory.backend is configured.',
        severity: 'warning',
      });
    }

    if (!('system_prompt' in root.agent)) {
      info.push({
        field: 'agent.system_prompt',
        message: 'No system prompt set. Adding one can improve behavior consistency.',
        severity: 'info',
      });
    }
  }

  if (Array.isArray(root.channels)) {
    root.channels.forEach((channel, index) => {
      const path = `channels[${index}]`;
      if (!isObject(channel)) {
        errors.push({
          field: path,
          message: 'Each channel entry must be an object.',
          severity: 'error',
        });
        return;
      }

      const channelType = typeof channel.type === 'string' ? channel.type.trim() : '';
      if (!channelType) {
        errors.push({
          field: `${path}.type`,
          message: 'Channel type is required.',
          severity: 'error',
        });
      }

      if (!channel.token || isPlaceholder(channel.token)) {
        warnings.push({
          field: `${path}.token`,
          message: `Channel token for ${channelType || 'channel'} is missing or placeholder.`,
          severity: 'warning',
        });
      }
    });
  }

  detectPlaceholders(root, '', warnings);

  if (errors.length > 0) {
    return { status: 'INVALID', errors, warnings, info };
  }

  const hasWarnings = warnings.length > 0;
  return {
    status: hasWarnings ? 'VALID' : 'READY',
    errors,
    warnings,
    info,
  };
}


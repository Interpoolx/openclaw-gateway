import { ConfigValidationIssue, ConfigValidationStatus } from '../../lib/api';
import { BuilderState, BuilderStep } from './types';

const PROVIDERS = new Set(['anthropic', 'openai', 'ollama', 'mistralai', 'other']);
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

function detectPlaceholders(
  value: unknown,
  path: string,
  warnings: ConfigValidationIssue[]
): void {
  if (typeof value === 'string') {
    if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
      warnings.push({
        field: path || '$',
        message: 'Placeholder value detected. Replace before deployment.',
        severity: 'warning',
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => detectPlaceholders(item, `${path}[${index}]`, warnings));
    return;
  }

  if (isObject(value)) {
    Object.entries(value).forEach(([key, nested]) => {
      detectPlaceholders(nested, path ? `${path}.${key}` : key, warnings);
    });
  }
}

export function validateStep(state: BuilderState, step: BuilderStep): boolean {
  if (step === 1) {
    return Boolean(state.goal) && state.channels.length > 0;
  }

  if (step === 2) {
    if (!state.provider || !state.model) return false;
    if (state.fallbackEnabled && state.fallbackChain.length === 0) return false;
    return true;
  }

  if (step === 3) {
    return true;
  }

  return true;
}

export function getStepValidationErrors(state: BuilderState, step: BuilderStep): string[] {
  const errors: string[] = [];
  if (step === 1) {
    if (!state.goal) errors.push('Goal is required.');
    if (state.channels.length === 0) errors.push('At least one channel is required.');
  }
  if (step === 2) {
    if (!state.provider) errors.push('Provider is required.');
    if (!state.model) errors.push('Model is required.');
    if (state.fallbackEnabled && state.fallbackChain.length === 0) {
      errors.push('Add at least one fallback model.');
    }
  }
  return errors;
}

export function validateGeneratedConfig(config: Record<string, unknown>): {
  status: ConfigValidationStatus;
  errors: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
  info: ConfigValidationIssue[];
} {
  const errors: ConfigValidationIssue[] = [];
  const warnings: ConfigValidationIssue[] = [];
  const info: ConfigValidationIssue[] = [];

  if (!('version' in config)) {
    errors.push({ field: 'version', message: 'Missing required key: version', severity: 'error' });
  }

  const agent = isObject(config.agent) ? config.agent : null;
  if (!agent) {
    errors.push({ field: 'agent', message: 'Missing required object: agent', severity: 'error' });
  } else {
    const provider = typeof agent.provider === 'string' ? agent.provider.toLowerCase() : '';
    if (!provider || !PROVIDERS.has(provider)) {
      errors.push({ field: 'agent.provider', message: 'Invalid provider value', severity: 'error' });
    }

    const model = typeof agent.model === 'string' ? agent.model.trim() : '';
    if (!model) {
      errors.push({ field: 'agent.model', message: 'Model is required', severity: 'error' });
    }

    if (Array.isArray(agent.tools)) {
      const uniqueTools = new Set(agent.tools.map((item) => String(item)));
      if (uniqueTools.size !== agent.tools.length) {
        errors.push({ field: 'agent.tools', message: 'Duplicate tools detected', severity: 'error' });
      }
    }

    if (!('system_prompt' in agent)) {
      info.push({
        field: 'agent.system_prompt',
        message: 'No system prompt set. Add one for better behavior.',
        severity: 'info',
      });
    }
  }

  const channels = Array.isArray(config.channels) ? config.channels : null;
  if (!channels || channels.length === 0) {
    errors.push({ field: 'channels', message: 'At least one channel is required', severity: 'error' });
  } else {
    channels.forEach((channel, index) => {
      if (!isObject(channel)) {
        errors.push({
          field: `channels[${index}]`,
          message: 'Channel must be an object',
          severity: 'error',
        });
        return;
      }
      if (!channel.token || typeof channel.token !== 'string' || channel.token.trim().length === 0) {
        warnings.push({
          field: `channels[${index}].token`,
          message: 'Channel token is missing.',
          severity: 'warning',
        });
      }
    });
  }

  detectPlaceholders(config, '', warnings);

  if (errors.length > 0) {
    return { status: 'INVALID', errors, warnings, info };
  }

  return {
    status: warnings.length > 0 ? 'VALID' : 'READY',
    errors,
    warnings,
    info,
  };
}


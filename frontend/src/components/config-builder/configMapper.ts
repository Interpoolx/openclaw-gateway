import { ConfigTemplate } from '../../lib/api';
import { BuilderState } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeParseObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function mapBuilderStateToConfig(
  state: BuilderState,
  template?: ConfigTemplate | null
): Record<string, unknown> {
  const templateBase = safeParseObject(template?.baseConfigJson);
  const templateDefaults = safeParseObject(template?.defaultOptionsJson);
  const provider = (state.provider ?? 'openai').toLowerCase();
  const model = state.model ?? 'gpt-4o';

  const merged = {
    version: '1.0.0',
    ...templateBase,
    ...templateDefaults,
    name: state.configName || template?.name || 'OpenClaw Setup',
    metadata: {
      source_mode: state.sourceMode,
      template_id: state.templateId,
      goal: state.goal,
    },
    agent: {
      ...(isObject(templateBase.agent) ? templateBase.agent : {}),
      provider,
      model,
      logging_level: state.loggingLevel,
      safety_flags: dedupe(state.safetyFlags),
      tools: dedupe([
        'read',
        'write',
        'edit',
        ...(Array.isArray((templateBase.agent as any)?.tools)
          ? (templateBase.agent as any).tools.map((item: unknown) => String(item))
          : []),
      ]),
    },
    channels: dedupe(state.channels).map((channel) => ({
      type: channel,
      enabled: true,
      token: state.credentials[channel] || state.credentials[`${channel}_token`] || 'YOUR_TOKEN',
    })),
  } as Record<string, unknown>;

  if (state.fallbackEnabled && state.fallbackChain.length > 0) {
    (merged.agent as Record<string, unknown>).fallback_chain = dedupe(state.fallbackChain);
  }

  if (state.memory) {
    (merged.agent as Record<string, unknown>).memory = {
      enabled: true,
      backend: state.credentials.memory_backend || 'sqlite',
    };
  } else {
    delete (merged.agent as Record<string, unknown>).memory;
  }

  if (provider === 'ollama') {
    (merged.agent as Record<string, unknown>).endpoint = 'http://127.0.0.1:11434';
    delete (merged.agent as Record<string, unknown>).api_key;
  } else if (!(merged.agent as Record<string, unknown>).api_key) {
    const providerKey = provider.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    (merged.agent as Record<string, unknown>).api_key =
      state.credentials[`${provider}_api_key`] || `YOUR_${providerKey}_API_KEY`;
  }

  if (Object.keys(state.passthroughFields).length > 0) {
    merged.passthrough = state.passthroughFields;
  }

  return merged;
}

export function mapImportedConfigToBuilderState(config: Record<string, unknown>): Partial<BuilderState> {
  const agent = isObject(config.agent) ? config.agent : {};
  const channels = Array.isArray(config.channels)
    ? config.channels
        .map((entry) => (isObject(entry) && typeof entry.type === 'string' ? entry.type : null))
        .filter((entry): entry is string => Boolean(entry))
    : [];

  const passthroughFields: Record<string, unknown> = {};
  const knownRoot = new Set(['version', 'name', 'goal', 'metadata', 'agent', 'channels']);
  Object.entries(config).forEach(([key, value]) => {
    if (!knownRoot.has(key)) passthroughFields[key] = value;
  });

  const credentials: Record<string, string> = {};
  if (Array.isArray(config.channels)) {
    config.channels.forEach((entry) => {
      if (!isObject(entry) || typeof entry.type !== 'string') return;
      if (typeof entry.token === 'string') {
        credentials[entry.type] = entry.token;
      }
    });
  }

  if (typeof agent.api_key === 'string') {
    const provider = typeof agent.provider === 'string' ? agent.provider.toLowerCase() : 'provider';
    credentials[`${provider}_api_key`] = agent.api_key;
  }

  return {
    goal: typeof config.goal === 'string' ? config.goal : null,
    channels: dedupe(channels),
    provider: typeof agent.provider === 'string' ? agent.provider.toLowerCase() : null,
    model: typeof agent.model === 'string' ? agent.model : null,
    fallbackEnabled: Array.isArray(agent.fallback_chain) && agent.fallback_chain.length > 0,
    fallbackChain: Array.isArray(agent.fallback_chain)
      ? agent.fallback_chain.map((entry) => String(entry))
      : [],
    memory: isObject(agent.memory) && agent.memory.enabled === true,
    loggingLevel: (agent.logging_level === 'none' || agent.logging_level === 'verbose')
      ? agent.logging_level
      : 'errors',
    safetyFlags: Array.isArray(agent.safety_flags)
      ? dedupe(agent.safety_flags.map((entry) => String(entry)))
      : [],
    credentials,
    configName: typeof config.name === 'string' ? config.name : '',
    passthroughFields,
    sourceMode: 'import',
    step: 3,
  };
}

export function applyTemplateDefaults(
  state: BuilderState,
  template: ConfigTemplate
): Partial<BuilderState> {
  const defaults = safeParseObject(template.defaultOptionsJson);
  const base = safeParseObject(template.baseConfigJson);
  const agent = isObject(base.agent) ? base.agent : {};

  return {
    ...state,
    goal: typeof defaults.goal === 'string' ? defaults.goal : template.goal,
    channels: Array.isArray(defaults.channels)
      ? dedupe(defaults.channels.map((entry) => String(entry)))
      : template.channels,
    provider: typeof defaults.provider === 'string'
      ? defaults.provider
      : (typeof agent.provider === 'string' ? agent.provider : null),
    model: typeof defaults.model === 'string'
      ? defaults.model
      : (typeof agent.model === 'string' ? agent.model : null),
    fallbackEnabled: Boolean(defaults.fallbackEnabled),
    fallbackChain: Array.isArray(defaults.fallbackChain)
      ? dedupe(defaults.fallbackChain.map((entry) => String(entry)))
      : [],
    memory: Boolean(defaults.memory),
    sourceMode: 'template',
    templateId: template.id,
    step: 1,
  };
}

export function mapBuilderStateToGeneratePayload(state: BuilderState): Record<string, unknown> {
  return {
    step: state.step,
    goal: state.goal,
    channels: state.channels,
    provider: state.provider,
    model: state.model,
    fallbackEnabled: state.fallbackEnabled,
    fallbackChain: state.fallbackChain,
    memory: state.memory,
    loggingLevel: state.loggingLevel,
    safetyFlags: state.safetyFlags,
    credentials: state.credentials,
    configName: state.configName,
    sourceMode: state.sourceMode,
    templateId: state.templateId,
    passthroughFields: state.passthroughFields,
  };
}


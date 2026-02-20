import {
  ConfigValidationIssue,
  ConfigValidationResult,
  validateConfig,
} from './configValidator';

export type SourceMode = 'template' | 'builder' | 'import';

export interface BuilderStatePayload {
  step?: 1 | 2 | 3 | 4;
  goal?: string | null;
  channels?: string[];
  provider?: string | null;
  model?: string | null;
  fallbackEnabled?: boolean;
  fallbackChain?: string[];
  memory?: boolean;
  loggingLevel?: 'none' | 'errors' | 'verbose';
  safetyFlags?: string[];
  credentials?: Record<string, string>;
  configName?: string;
  sourceMode?: SourceMode;
  templateId?: string | null;
  passthroughFields?: Record<string, unknown>;
}

export interface ConfigTemplateRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  goal: string;
  channels: string;
  providers: string;
  baseConfigJson: string;
  defaultOptionsJson: string;
  schemaJson: string;
}

export interface ConfigGenerationResult {
  configJson: Record<string, unknown>;
  summary: string;
  status: ConfigValidationResult['status'];
  warnings: ConfigValidationIssue[];
  errors: ConfigValidationIssue[];
  info: ConfigValidationIssue[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeParseObject(value: string, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isObject(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function dedupeStringList(values: unknown[]): string[] {
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (isObject(value)) {
    const normalized: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      normalized[key] = normalizeValue(nested);
    }
    return normalized;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    return trimmed;
  }

  return value;
}

function getCredentialForChannel(
  channel: string,
  credentials: Record<string, string>
): string {
  const exact = credentials[channel];
  if (typeof exact === 'string' && exact.length > 0) return exact;
  const generic = credentials[`${channel}_token`];
  if (typeof generic === 'string' && generic.length > 0) return generic;
  return 'YOUR_TOKEN';
}

function createBaseScaffold(): Record<string, unknown> {
  return {
    version: '1.0.0',
    agent: {
      provider: 'openai',
      model: 'gpt-4o',
      tools: ['read', 'write', 'edit'],
      logging_level: 'errors',
      safety_flags: [],
    },
    channels: [],
  };
}

export function buildSummary(config: Record<string, unknown>, validation: ConfigValidationResult): string {
  const agent = isObject(config.agent) ? config.agent : {};
  const channels = Array.isArray(config.channels) ? config.channels : [];
  const provider = typeof agent.provider === 'string' ? agent.provider : 'unknown';
  const model = typeof agent.model === 'string' ? agent.model : 'unknown';
  const fallback = Array.isArray(agent.fallback_chain) ? agent.fallback_chain.map(String).join(' -> ') : 'None';
  const memoryEnabled = isObject(agent.memory) && agent.memory.enabled === true;
  const loggingLevel = typeof agent.logging_level === 'string' ? agent.logging_level : 'errors';

  const lines: string[] = [
    `Primary model: ${model} via ${provider}`,
    `Fallback chain: ${fallback}`,
    `Channels: ${channels.length > 0 ? channels.map((item) => {
      if (isObject(item) && typeof item.type === 'string') return item.type;
      return 'unknown';
    }).join(', ') : 'None'}`,
    `Memory: ${memoryEnabled ? 'Enabled' : 'Disabled'}`,
    `Logging: ${loggingLevel}`,
  ];

  if (validation.warnings.length > 0) {
    lines.push(`Warnings: ${validation.warnings.length}`);
  }
  if (validation.errors.length > 0) {
    lines.push(`Errors: ${validation.errors.length}`);
  }

  return lines.join('\n');
}

function applyProviderRules(
  config: Record<string, unknown>,
  provider: string,
  model: string,
  fallbackEnabled: boolean,
  fallbackChain: string[],
  credentials: Record<string, string>
): void {
  const agent = isObject(config.agent) ? config.agent : {};
  agent.provider = provider;
  agent.model = model;

  if (fallbackEnabled && fallbackChain.length > 0) {
    agent.fallback_chain = dedupeStringList(fallbackChain);
  } else {
    delete agent.fallback_chain;
  }

  if (provider === 'ollama') {
    agent.endpoint = 'http://127.0.0.1:11434';
    delete agent.api_key;
  } else {
    delete agent.endpoint;
    if (!agent.api_key) {
      const providerKey = provider.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      agent.api_key = credentials[`${provider}_api_key`] ?? `YOUR_${providerKey}_API_KEY`;
    }
  }

  config.agent = agent;
}

function applyChannelRules(
  config: Record<string, unknown>,
  channels: string[],
  credentials: Record<string, string>
): void {
  const uniqueChannels = dedupeStringList(channels);
  config.channels = uniqueChannels.map((channel) => ({
    type: channel,
    enabled: true,
    token: getCredentialForChannel(channel, credentials),
  }));
}

function normalizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const normalized = normalizeValue(config) as Record<string, unknown>;

  if (!('version' in normalized)) normalized.version = '1.0.0';
  if (!('agent' in normalized) || !isObject(normalized.agent)) normalized.agent = {};
  if (!('channels' in normalized) || !Array.isArray(normalized.channels)) normalized.channels = [];

  const agent = normalized.agent as Record<string, unknown>;
  if (Array.isArray(agent.tools)) {
    agent.tools = dedupeStringList(agent.tools);
  }

  return normalized;
}

export function generateConfig(options: {
  mode: SourceMode;
  template?: ConfigTemplateRecord | null;
  builderState: BuilderStatePayload;
}): ConfigGenerationResult {
  const { mode, template, builderState } = options;
  const sourceMode = builderState.sourceMode ?? mode;
  const credentials = builderState.credentials ?? {};
  const channels = builderState.channels ?? [];
  const provider = (builderState.provider ?? 'openai').toLowerCase();
  const model = builderState.model ?? 'gpt-4o';
  const fallbackEnabled = builderState.fallbackEnabled === true;
  const fallbackChain = builderState.fallbackChain ?? [];
  const memoryEnabled = builderState.memory === true;
  const loggingLevel = builderState.loggingLevel ?? 'errors';
  const safetyFlags = builderState.safetyFlags ?? [];
  const passthrough = builderState.passthroughFields ?? {};

  const templateBase = template ? safeParseObject(template.baseConfigJson, createBaseScaffold()) : createBaseScaffold();
  const templateOptions = template ? safeParseObject(template.defaultOptionsJson) : {};
  const initialConfig = {
    ...templateBase,
    metadata: {
      source_mode: sourceMode,
      template_id: template?.id ?? null,
      goal: builderState.goal ?? null,
    },
  } as Record<string, unknown>;

  const config = {
    ...initialConfig,
    ...templateOptions,
  } as Record<string, unknown>;

  applyProviderRules(config, provider, model, fallbackEnabled, fallbackChain, credentials);
  applyChannelRules(config, channels, credentials);

  const agent = isObject(config.agent) ? config.agent : {};
  agent.logging_level = loggingLevel;
  agent.safety_flags = dedupeStringList(safetyFlags);
  if (memoryEnabled) {
    agent.memory = {
      enabled: true,
      backend: credentials.memory_backend ?? 'sqlite',
    };
  } else {
    delete agent.memory;
  }
  config.agent = agent;

  if (builderState.configName && builderState.configName.trim()) {
    config.name = builderState.configName.trim();
  }

  if (isObject(passthrough) && Object.keys(passthrough).length > 0) {
    config.passthrough = passthrough;
  }

  const normalized = normalizeConfig(config);
  const validation = validateConfig(normalized);
  const summary = buildSummary(normalized, validation);

  return {
    configJson: normalized,
    summary,
    status: validation.status,
    warnings: validation.warnings,
    errors: validation.errors,
    info: validation.info,
  };
}


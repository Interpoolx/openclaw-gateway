import { BuilderState } from './types';

export const BUILDER_DRAFT_STORAGE_KEY = 'clawpute_builder_draft';

export const GOAL_OPTIONS = [
  { value: 'support', label: 'Support Bot' },
  { value: 'sales', label: 'Sales Assistant' },
  { value: 'community', label: 'Community Manager' },
  { value: 'dev', label: 'Developer Tool' },
  { value: 'content', label: 'Content Creator' },
  { value: 'personal', label: 'Personal Assistant' },
  { value: 'research', label: 'Research' },
  { value: 'custom', label: 'Custom' },
];

export const CHANNEL_OPTIONS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'slack', label: 'Slack' },
  { value: 'discord', label: 'Discord' },
  { value: 'api', label: 'API' },
  { value: 'custom', label: 'Custom' },
];

export const PROVIDER_OPTIONS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'mistralai', label: 'MistralAI' },
  { value: 'other', label: 'Other' },
];

export const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ['claude-3-5-sonnet', 'claude-3-7-sonnet', 'claude-opus-4'],
  openai: ['gpt-4o', 'gpt-4.1', 'gpt-5', 'gpt-3.5-turbo', 'o3-mini'],
  ollama: ['llama3.1', 'qwen2.5', 'mistral-small'],
  mistralai: ['mistral-large', 'mistral-small'],
  other: ['custom-model'],
};

export const SAFETY_FLAGS = [
  { value: 'safe_commands', label: 'Safe Commands' },
  { value: 'prompt_guard', label: 'Prompt Guard' },
  { value: 'pii_masking', label: 'PII Masking' },
  { value: 'strict_mode', label: 'Strict Mode' },
];

export const DEFAULT_BUILDER_STATE: BuilderState = {
  step: 1,
  goal: null,
  channels: [],
  provider: null,
  model: null,
  fallbackEnabled: false,
  fallbackChain: [],
  memory: false,
  loggingLevel: 'errors',
  safetyFlags: [],
  credentials: {},
  configName: '',
  sourceMode: 'builder',
  templateId: null,
  passthroughFields: {},
};

export const SUMMARY_FIELD_STEP_MAP: Record<string, 1 | 2 | 3> = {
  goal: 1,
  channels: 1,
  provider: 2,
  model: 2,
  fallback: 2,
  memory: 3,
  logging: 3,
  credentials: 3,
};


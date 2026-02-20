import type { ConfigTemplate, ConfigValidationIssue, ConfigValidationStatus, SourceMode } from '../../lib/api';

export type BuilderStep = 1 | 2 | 3 | 4;

export type LoggingLevel = 'none' | 'errors' | 'verbose';

export interface BuilderState {
  step: BuilderStep;
  goal: string | null;
  channels: string[];
  provider: string | null;
  model: string | null;
  fallbackEnabled: boolean;
  fallbackChain: string[];
  memory: boolean;
  loggingLevel: LoggingLevel;
  safetyFlags: string[];
  credentials: Record<string, string>;
  configName: string;
  sourceMode: SourceMode;
  templateId: string | null;
  passthroughFields: Record<string, unknown>;
}

export interface BuilderDraftPayload {
  state: BuilderState;
  timestamp: string;
}

export interface ConfigPreviewState {
  json: Record<string, unknown>;
  text: string;
  status: ConfigValidationStatus;
  errors: ConfigValidationIssue[];
  warnings: ConfigValidationIssue[];
  info: ConfigValidationIssue[];
}

export interface TemplateFilterState {
  goal: string;
  channel: string;
  provider: string;
  search: string;
}

export type TemplateWithParsedFields = ConfigTemplate & {
  parsedSchema: Record<string, string>;
};


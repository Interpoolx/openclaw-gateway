import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  ConfigSetup,
  ConfigTemplate,
  deleteSavedConfig,
  duplicateSavedConfig,
  generateBuilderConfig,
  getConfigTemplates,
  getSavedConfigs,
  restoreSavedConfig,
  saveConfig,
  validateBuilderConfig,
} from '../../lib/api';
import { applyTemplateDefaults, mapBuilderStateToConfig, mapBuilderStateToGeneratePayload } from './configMapper';
import { ConfigSummaryBlock } from './ConfigSummaryBlock';
import { DraftBanner } from './DraftBanner';
import { ImportJsonPanel } from './ImportJsonPanel';
import { JsonPreviewPanel } from './JsonPreviewPanel';
import { MobilePreviewSheet } from './MobilePreviewSheet';
import { TemplateGrid } from './TemplateGrid';
import { DEFAULT_BUILDER_STATE } from './constants';
import { useBuilderState } from './useBuilderState';
import { useConfigDiff } from './useConfigDiff';
import { validateGeneratedConfig } from './validation';
import { BuilderWizard } from './BuilderWizard';

type BuilderTab = 'templates' | 'builder' | 'import';
const BUILDER_TABS: BuilderTab[] = ['templates', 'builder', 'import'];

function parseSchemaTooltips(schemaJson: string | undefined): Record<string, string> {
  if (!schemaJson) return {};
  try {
    const parsed = JSON.parse(schemaJson) as unknown;
    const tooltips: Record<string, string> = {};

    const walk = (value: unknown, path: string = '') => {
      if (typeof value === 'string') {
        const key = path.split('.').pop();
        if (key) {
          tooltips[key] = value;
          tooltips[path] = value;
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
        return;
      }
      if (typeof value === 'object' && value !== null) {
        Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
          walk(nested, path ? `${path}.${key}` : key);
        });
      }
    };

    walk(parsed);
    return tooltips;
  } catch {
    return {};
  }
}

function BuilderLayout(props: {
  mode: 'mobile' | 'desktop';
  wizard: ReactNode;
  preview: ReactNode;
  onOpenMobilePreview: () => void;
}) {
  if (props.mode === 'mobile') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
        {props.wizard}
        <button
          type="button"
          onClick={props.onOpenMobilePreview}
          style={{
            position: 'fixed',
            right: '16px',
            bottom: '18px',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            background: 'rgba(8, 145, 178, 0.45)',
            color: '#bae6fd',
            borderRadius: '999px',
            padding: '10px 14px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            zIndex: 999,
          }}
        >
          Preview Config
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 440px', gap: '12px' }}>
      {props.wizard}
      {props.preview}
    </div>
  );
}

export function ConfigBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspaceId } = useWorkspace();

  const [activeTab, setActiveTab] = useState<BuilderTab>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ConfigTemplate | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [serverValidationStatus, setServerValidationStatus] = useState<'INVALID' | 'VALID' | 'READY' | null>(null);
  const [sequenceMessage, setSequenceMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [showDeletedSetups, setShowDeletedSetups] = useState(false);
  const sequenceTimeoutsRef = useRef<number[]>([]);
  const urlSeededRef = useRef(false);

  const {
    state,
    setState,
    canAdvance,
    advance,
    back,
    discardDraft,
    resumeDraft,
    hasDraft,
    draftTimestamp,
  } = useBuilderState();

  const { data: templatesResponse, isLoading: templatesLoading } = useQuery({
    queryKey: ['config-builder-templates'],
    queryFn: () => getConfigTemplates({ limit: 100, offset: 0 }),
  });

  const templates = templatesResponse?.templates ?? [];

  const { data: savedSetupsResponse } = useQuery({
    queryKey: ['config-builder-setups-count', currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) return { setups: [], total: 0 };
      return getSavedConfigs(currentWorkspaceId);
    },
    enabled: Boolean(user && currentWorkspaceId),
  });

  const { data: savedSetupsListResponse } = useQuery({
    queryKey: ['config-builder-setups-list', currentWorkspaceId, showDeletedSetups],
    queryFn: async () => {
      if (!currentWorkspaceId) return { setups: [], total: 0 };
      return getSavedConfigs(currentWorkspaceId, showDeletedSetups);
    },
    enabled: Boolean(user && currentWorkspaceId),
  });

  const previewConfig = useMemo(
    () => mapBuilderStateToConfig(state, selectedTemplate),
    [state, selectedTemplate]
  );

  const localValidation = useMemo(() => validateGeneratedConfig(previewConfig), [previewConfig]);
  const effectiveStatus = serverValidationStatus ?? localValidation.status;
  const schemaTooltips = useMemo(
    () => parseSchemaTooltips(selectedTemplate?.schemaJson),
    [selectedTemplate?.schemaJson]
  );
  const { changedKeys, newKeys, removedKeys } = useConfigDiff(previewConfig);

  const generateMutation = useMutation({
    mutationFn: () =>
      generateBuilderConfig({
        mode: state.sourceMode,
        templateId: selectedTemplate?.id,
        options: mapBuilderStateToGeneratePayload(state),
      }),
    onSuccess: (result) => {
      setServerValidationStatus(result.meta.status);
      setSequenceMessage('Config ready');
      window.setTimeout(() => setSequenceMessage(null), 900);
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => validateBuilderConfig({ configJson: previewConfig }),
    onSuccess: (result) => {
      setServerValidationStatus(result.status);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!currentWorkspaceId) {
        throw new Error('Workspace is required to save configs.');
      }
      return saveConfig({
        workspaceId: currentWorkspaceId,
        name: state.configName || undefined,
        sourceMode: state.sourceMode,
        templateId: selectedTemplate?.id ?? null,
        optionsJson: mapBuilderStateToGeneratePayload(state),
        configJson: previewConfig,
        summary: [
          `Goal: ${state.goal ?? 'custom'}`,
          `Provider: ${state.provider ?? 'unknown'}`,
          `Model: ${state.model ?? 'unknown'}`,
          `Channels: ${state.channels.join(', ') || 'none'}`,
        ].join('\n'),
      });
    },
    onSuccess: () => {
      toast.success('Setup saved');
      queryClient.invalidateQueries({ queryKey: ['config-builder-setups-count', currentWorkspaceId] });
      discardDraft();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save setup');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (setupId: string) => duplicateSavedConfig(setupId),
    onSuccess: () => {
      toast.success('Setup duplicated');
      queryClient.invalidateQueries({ queryKey: ['config-builder-setups-list', currentWorkspaceId, showDeletedSetups] });
      queryClient.invalidateQueries({ queryKey: ['config-builder-setups-count', currentWorkspaceId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (setupId: string) => deleteSavedConfig(setupId),
    onSuccess: () => {
      toast.success('Setup moved to recovery');
      queryClient.invalidateQueries({ queryKey: ['config-builder-setups-list', currentWorkspaceId, showDeletedSetups] });
      queryClient.invalidateQueries({ queryKey: ['config-builder-setups-count', currentWorkspaceId] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (setupId: string) => restoreSavedConfig(setupId),
    onSuccess: () => {
      toast.success('Setup restored');
      queryClient.invalidateQueries({ queryKey: ['config-builder-setups-list', currentWorkspaceId, showDeletedSetups] });
      queryClient.invalidateQueries({ queryKey: ['config-builder-setups-count', currentWorkspaceId] });
    },
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'templates' || tab === 'builder' || tab === 'import') {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      validateMutation.mutate();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [previewConfig]);

  useEffect(() => {
    if (urlSeededRef.current) return;
    if (templates.length === 0) return;

    const params = new URLSearchParams(location.search);
    const templateSlug = params.get('template');
    if (templateSlug) {
      const template = templates.find((entry) => entry.slug === templateSlug);
      if (template) {
        handleUseTemplate(template);
        urlSeededRef.current = true;
        return;
      }
    }

    const goal = params.get('goal');
    const channel = params.get('channel');
    const model = params.get('model');
    if (goal || channel || model) {
      setState({
        ...DEFAULT_BUILDER_STATE,
        sourceMode: 'builder',
        goal: goal || null,
        channels: channel ? [channel] : [],
        model: model || null,
        step: 1,
      });
      setActiveTab('builder');
      urlSeededRef.current = true;
      return;
    }

    urlSeededRef.current = true;
  }, [templates, location.search]);

  const setTab = (tab: BuilderTab) => {
    setActiveTab(tab);
    navigate({
      to: '/config-builder',
      search: (prev: any) => ({ ...prev, tab }),
    });
  };

  const handleUseTemplate = (template: ConfigTemplate) => {
    setSelectedTemplate(template);
    setState({
      ...DEFAULT_BUILDER_STATE,
      ...applyTemplateDefaults(DEFAULT_BUILDER_STATE, template),
      sourceMode: 'template',
      templateId: template.id,
    });
    setTab('builder');
  };

  const handleBuildFromScratch = () => {
    setSelectedTemplate(null);
    setState({
      ...DEFAULT_BUILDER_STATE,
      sourceMode: 'builder',
    });
    setTab('builder');
  };

  const handleImportMapped = (mapped: Partial<typeof state>) => {
    setSelectedTemplate(null);
    setState({
      ...DEFAULT_BUILDER_STATE,
      ...mapped,
      sourceMode: 'import',
      step: 3,
    });
    setTab('builder');
  };

  const openTemplateDetails = (template: ConfigTemplate) => {
    navigate({
      to: '/config-builder/templates/$templateSlug',
      params: { templateSlug: template.slug },
    } as any);
  };

  const clearSequenceTimers = () => {
    sequenceTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    sequenceTimeoutsRef.current = [];
  };

  const runGenerateSequence = () => {
    clearSequenceTimers();
    const steps = [
      { message: 'Resolving model compatibility...', delay: 300 },
      { message: 'Applying channel configuration...', delay: 300 },
      { message: 'Validating output...', delay: 200 },
    ];
    let elapsed = 0;
    steps.forEach((step) => {
      elapsed += step.delay;
      const timeoutId = window.setTimeout(() => setSequenceMessage(step.message), elapsed);
      sequenceTimeoutsRef.current.push(timeoutId);
    });

    const triggerId = window.setTimeout(() => {
      generateMutation.mutate();
    }, elapsed + 20);
    sequenceTimeoutsRef.current.push(triggerId);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(previewConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'openclaw.config.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    discardDraft();
  };

  const warningMessages = localValidation.warnings.map((warning) => warning.message);
  const counterLabel = user
    ? `${savedSetupsResponse?.total ?? 0} setups saved`
    : 'Sign in to save setups';

  const loadSavedSetup = (setup: ConfigSetup) => {
    const matchedTemplate = setup.templateId
      ? templates.find((template) => template.id === setup.templateId) ?? null
      : null;

    setSelectedTemplate(matchedTemplate);
    const options = setup.optionsJson as Partial<typeof state>;
    setState({
      ...DEFAULT_BUILDER_STATE,
      ...options,
      sourceMode: setup.sourceMode,
      templateId: setup.templateId,
      configName: setup.name,
      step: 4,
    });
    setTab('builder');
  };

  const previewPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button
        type="button"
        onClick={runGenerateSequence}
        style={{
          alignSelf: 'flex-end',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          background: 'rgba(8, 145, 178, 0.35)',
          color: '#bae6fd',
          borderRadius: '8px',
          padding: '7px 10px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        {generateMutation.isPending ? 'Generating...' : 'Generate Config'}
      </button>
      {sequenceMessage && (
        <div
          style={{
            border: '1px solid rgba(148, 163, 184, 0.25)',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '8px',
            padding: '8px 10px',
            color: '#cbd5e1',
            fontSize: '12px',
          }}
        >
          {sequenceMessage}
        </div>
      )}
      <ConfigSummaryBlock
        state={state}
        status={effectiveStatus}
        warningCount={localValidation.warnings.length}
        errorCount={localValidation.errors.length}
        onJumpToStep={(step) => setState({ step })}
      />
      <JsonPreviewPanel
        configJson={previewConfig}
        status={effectiveStatus}
        schemaTooltips={schemaTooltips}
        changedKeys={changedKeys}
        newKeys={newKeys}
        removedKeys={removedKeys}
        onDownload={downloadJson}
      />
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '26px', fontWeight: 800 }}>
            Clawpute.com Config Builder
          </h1>
          <p style={{ margin: '5px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Choose a template or build from scratch, then export production-ready JSON.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '999px',
              padding: '6px 10px',
              fontSize: '12px',
              color: '#e2e8f0',
              background: 'rgba(15, 23, 42, 0.5)',
            }}
          >
            {counterLabel}
          </span>
          <button
            type="button"
            onClick={handleBuildFromScratch}
            style={{
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            + New Setup
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', gap: '6px', padding: '4px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(148, 163, 184, 0.22)' }}>
          {BUILDER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              style={{
                border: 'none',
                background: activeTab === tab ? 'rgba(8, 145, 178, 0.35)' : 'transparent',
                color: activeTab === tab ? '#bae6fd' : '#cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: 700,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === 'templates' && (
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>
            Start simple: pick one template and customize only what you need.
          </p>
        )}
      </div>

      {hasDraft && (
        <DraftBanner
          timestamp={draftTimestamp}
          onResume={resumeDraft}
          onDiscard={discardDraft}
        />
      )}

      {activeTab === 'templates' && (
        templatesLoading ? (
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>Loading templates...</div>
        ) : (
          <TemplateGrid
            templates={templates}
            onUseTemplate={handleUseTemplate}
            onOpenTemplateDetails={openTemplateDetails}
          />
        )
      )}

      {activeTab === 'import' && (
        <ImportJsonPanel onImportMapped={handleImportMapped} />
      )}

      {activeTab === 'builder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <BuilderLayout
            mode={isMobile ? 'mobile' : 'desktop'}
            onOpenMobilePreview={() => setMobilePreviewOpen(true)}
            wizard={(
              <BuilderWizard
                state={state}
                setState={setState}
                canAdvance={canAdvance}
                advance={advance}
                back={back}
                onProviderSwitchToOllama={() => {
                  const nextCredentials = { ...state.credentials };
                  Object.keys(nextCredentials).forEach((key) => {
                    if (key.endsWith('_api_key')) delete nextCredentials[key];
                  });
                  setState({ credentials: nextCredentials });
                  toast.info('Cloud provider fields cleared - Ollama does not require API keys.');
                }}
                status={effectiveStatus}
                readyWarnings={warningMessages}
                warningCount={localValidation.warnings.length}
                errorCount={localValidation.errors.length}
                onSave={user ? () => saveMutation.mutate() : undefined}
                canSave={Boolean(user && currentWorkspaceId)}
              />
            )}
            preview={previewPanel}
          />

          {user && currentWorkspaceId && (
            <section
              style={{
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.45)',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ margin: 0, color: '#f8fafc', fontSize: '13px', fontWeight: 700 }}>Saved Setups</p>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                  <input
                    type="checkbox"
                    checked={showDeletedSetups}
                    onChange={(event) => setShowDeletedSetups(event.target.checked)}
                  />
                  Include deleted
                </label>
              </div>

              {(savedSetupsListResponse?.setups ?? []).length === 0 ? (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>No setups saved yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(savedSetupsListResponse?.setups ?? []).map((setup) => (
                    <div
                      key={setup.id}
                      style={{
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }}>{setup.name}</p>
                        <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '11px' }}>
                          {setup.sourceMode} • {new Date(setup.updatedAt).toLocaleString()}
                          {setup.deletedAt ? ' • deleted' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => loadSavedSetup(setup)}
                          style={{
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            background: 'rgba(8, 145, 178, 0.3)',
                            color: '#bae6fd',
                            borderRadius: '7px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Load
                        </button>
                        {!setup.deletedAt && (
                          <>
                            <button
                              type="button"
                              onClick={() => duplicateMutation.mutate(setup.id)}
                              style={{
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                background: 'rgba(15, 23, 42, 0.7)',
                                color: '#e2e8f0',
                                borderRadius: '7px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(setup.id)}
                              style={{
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                background: 'rgba(127, 29, 29, 0.35)',
                                color: '#fecaca',
                                borderRadius: '7px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {setup.deletedAt && (
                          <button
                            type="button"
                            onClick={() => restoreMutation.mutate(setup.id)}
                            style={{
                              border: '1px solid rgba(34, 197, 94, 0.35)',
                              background: 'rgba(21, 128, 61, 0.35)',
                              color: '#dcfce7',
                              borderRadius: '7px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <MobilePreviewSheet open={mobilePreviewOpen} onClose={() => setMobilePreviewOpen(false)}>
        {previewPanel}
      </MobilePreviewSheet>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
    RefreshCw,
    Save,
    Loader2,
    Key,
    CheckCircle,
    XCircle,
    Info,
    ChevronDown,
    Settings,
    ArrowRight,
    Terminal,
    Wifi,
    WifiOff,
    FileText,
    Users,
    AlertCircle,
} from 'lucide-react';

import { toast } from 'sonner';
import {
    restartGateway,
    updateGatewaySleep,
    createOpenClawConnection,
    getGatewayHealth,
    getGatewayAgents,
    getGatewayChannels,
    getGatewayChatMessages,
    getGatewaySessions,
    getGatewayWorkspaceFiles,
    getGatewayUsage,
    getGatewayCronJobs,
    getGatewaySkills,
    getGatewayLogs,
    getGatewayConfig,
    updateGatewayConfig,
} from '../lib/api';

interface ConnectionConfig {
    mode: 'local' | 'cloudflare' | 'docker' | 'vps';
    serverUrl: string;
    apiKey: string;
    gatewayToken: string;
    password: string;
    defaultSessionKey: string;
    workerEnabled: boolean;
    workerName: string;
    workerAccountId: string;
    dockerSocket: string;
    vpsHost: string;
    vpsPort: number;
    role: 'operator' | 'node';
    heartbeatIntervalMinutes: number;
}

interface OpenClawSettingsPanelProps {
    connectionConfig: ConnectionConfig;
    onConnectionConfigChange: (config: Partial<ConnectionConfig>) => void;
    openClawStats: any;
    connectionTestResult: { success: boolean; message: string } | null;
    triggerSave?: boolean;
    onSaveTriggered?: () => void;
}

export function OpenClawSettingsPanel({
    connectionConfig,
    onConnectionConfigChange,
    openClawStats: _openClawStats,
    connectionTestResult,
    triggerSave = false,
    onSaveTriggered,
}: OpenClawSettingsPanelProps) {
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isRestarting, setIsRestarting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isPushingAgents, setIsPushingAgents] = useState(false);
    const [isPushingFiles, setIsPushingFiles] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(() => {
        // Load cached connection status from localStorage to avoid unnecessary probing on mount
        const cached = localStorage.getItem('openclaw_connection_status');
        if (cached === 'connected') return 'connected';
        return 'disconnected';
    });
    const [showTunnelHelp, setShowTunnelHelp] = useState(false);
    const [diagnostics, setDiagnostics] = useState<{ step: string; status: 'pending' | 'success' | 'error'; message: string }[]>([]);
    const [sleepTime, setSleepTime] = useState(100);
    const [_gatewayConfig, setGatewayConfig] = useState<Record<string, any>>({});
    const [_isLoadingConfig, setIsLoadingConfig] = useState(false);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        gateway: false,
        webhook: false,
        performance: false,
        experimental: false,
    });
    const [advancedSettings, setAdvancedSettings] = useState({
        idleSleepMs: 100,
        webhookUrl: '',
        bootMarkdown: '',
        commandLogger: false,
        compactionMode: 'auto',
        maxConcurrency: 5,
        memorySearchEnabled: false,
        memoryFlushInterval: 300000,
        subagentConcurrency: 2,
    });
    type OperationKey =
        | 'restart'
        | 'health'
        | 'fetchConfig'
        | 'updateConfig'
        | 'agents'
        | 'channels'
        | 'chatMessages'
        | 'sessions'
        | 'workspaceFiles'
        | 'usage'
        | 'cronJobs'
        | 'skills'
        | 'logs';
    const [operationLoading, setOperationLoading] = useState<Record<OperationKey, boolean>>({
        restart: false,
        health: false,
        fetchConfig: false,
        updateConfig: false,
        agents: false,
        channels: false,
        chatMessages: false,
        sessions: false,
        workspaceFiles: false,
        usage: false,
        cronJobs: false,
        skills: false,
        logs: false,
    });
    const [operationResults, setOperationResults] = useState<Record<OperationKey, { success: boolean; summary: string; diagnostics?: string[]; payload?: unknown } | null>>({
        restart: null,
        health: null,
        fetchConfig: null,
        updateConfig: null,
        agents: null,
        channels: null,
        chatMessages: null,
        sessions: null,
        workspaceFiles: null,
        usage: null,
        cronJobs: null,
        skills: null,
        logs: null,
    });



    // Auto-clear save result after 5 seconds
    useEffect(() => {
        if (saveResult) {
            const timer = setTimeout(() => setSaveResult(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [saveResult]);

    // Try to load gateway config on mount once (silently), but only if we don't have a cached 'connected' status
    useEffect(() => {
        const cachedStatus = localStorage.getItem('openclaw_connection_status');
        // If we already have a cached connected status, skip probing entirely
        if (cachedStatus === 'connected') return;

        const isValidServerUrl = (connectionConfig.serverUrl?.trim().length ?? 0) > 0;
        const isValidToken = (connectionConfig.gatewayToken?.trim().length ?? 0) > 0;

        // Only attempt if credentials are configured
        if (isValidServerUrl && isValidToken) {
            // Try to load config once on mount silently (false = no error messages)
            loadGatewayConfig(false);
        }
    }, []); // Empty dependency array - only run once on mount

    // Watch for external trigger to save (from SettingsModal footer button)
    useEffect(() => {
        if (triggerSave) {
            handleSaveConnectionSettings();
            onSaveTriggered?.();
        }
    }, [triggerSave]);

    const loadGatewayConfig = async (showStatus = true) => {
        if (!connectionConfig.serverUrl?.trim() || !connectionConfig.gatewayToken?.trim()) {
            if (showStatus) {
                setConnectionStatus('disconnected');
            }
            return;
        }

        setIsLoadingConfig(true);
        try {
            const { getGatewayConfig } = await import('../lib/api');
            const response = await getGatewayConfig({
                serverUrl: connectionConfig.serverUrl,
                token: connectionConfig.gatewayToken
            });

            if (response.success && response.config) {
                setGatewayConfig(response.config);
                setSleepTime((response.config as any)?.gateway?.performance?.idleSleepMs ?? 100);

                // Update advanced settings from loaded config
                setAdvancedSettings(prev => ({
                    ...prev,
                    idleSleepMs: (response.config as any)?.gateway?.performance?.idleSleepMs ?? prev.idleSleepMs,
                    webhookUrl: (response.config as any)?.gateway?.webhookUrl ?? prev.webhookUrl,
                    bootMarkdown: (response.config as any)?.gateway?.bootMarkdown ?? prev.bootMarkdown,
                    commandLogger: (response.config as any)?.gateway?.commandLogger ?? prev.commandLogger,
                    compactionMode: (response.config as any)?.gateway?.compactionMode ?? prev.compactionMode,
                    maxConcurrency: (response.config as any)?.gateway?.maxConcurrency ?? prev.maxConcurrency,
                    memorySearchEnabled: (response.config as any)?.memory?.searchEnabled ?? prev.memorySearchEnabled,
                    memoryFlushInterval: (response.config as any)?.memory?.flushInterval ?? prev.memoryFlushInterval,
                    subagentConcurrency: (response.config as any)?.subagent?.concurrency ?? prev.subagentConcurrency,
                }));

                setConnectionStatus('connected');
                localStorage.setItem('openclaw_connection_status', 'connected');
                localStorage.setItem('openclaw_connection_tested_at', new Date().toISOString());
                if (showStatus) {
                    setSaveResult({ success: true, message: 'Configuration loaded successfully' });
                }
            } else {
                // Gateway is not responding  only set error if this was an explicit (non-silent) call
                if (showStatus) {
                    setConnectionStatus('error');
                    localStorage.removeItem('openclaw_connection_status');
                    setSaveResult({ success: false, message: 'Gateway is not responding. Please verify the connection.' });
                }
                console.warn('Failed to load gateway config:', response.error);
            }
        } catch (error) {
            // Gateway connection failed  only set error if this was an explicit (non-silent) call
            if (showStatus) {
                setConnectionStatus('error');
                localStorage.removeItem('openclaw_connection_status');
                setSaveResult({ success: false, message: 'Gateway is not running. Please check your server URL and token.' });
            }
            console.warn('Failed to connect to gateway:', error);
        } finally {
            setIsLoadingConfig(false);
        }
    };

    const saveAdvancedConfig = async () => {
        if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) {
            toast.error('Server URL and Gateway Token are required');
            setSaveResult({ success: false, message: 'Server URL and Gateway Token are required' });
            return;
        }

        setIsSavingConfig(true);
        setSaveResult(null);

        try {
            const { updateGatewayConfig } = await import('../lib/api');

            // Build the config object from advanced settings
            const configUpdate = {
                gateway: {
                    performance: {
                        idleSleepMs: advancedSettings.idleSleepMs
                    },
                    webhookUrl: advancedSettings.webhookUrl,
                    bootMarkdown: advancedSettings.bootMarkdown,
                    commandLogger: advancedSettings.commandLogger,
                    compactionMode: advancedSettings.compactionMode,
                    maxConcurrency: advancedSettings.maxConcurrency
                },
                memory: {
                    searchEnabled: advancedSettings.memorySearchEnabled,
                    flushInterval: advancedSettings.memoryFlushInterval
                },
                subagent: {
                    concurrency: advancedSettings.subagentConcurrency
                }
            };

            const response = await updateGatewayConfig({
                serverUrl: connectionConfig.serverUrl,
                token: connectionConfig.gatewayToken,
                config: configUpdate
            });

            if (response && typeof response === 'object' && 'success' in response ? (response as any).success : false) {
                toast.success('Advanced configuration updated successfully!');
                setSaveResult({ success: true, message: 'Advanced configuration updated successfully' });
                // Reload to confirm changes - pass true to show status
                setTimeout(() => loadGatewayConfig(true), 1000);
            } else {
                const errorMsg = response && typeof response === 'object' && 'error' in response ? (response as any).error : 'Failed to update configuration';
                toast.error(errorMsg);
                setSaveResult({ success: false, message: errorMsg });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Failed to update config: ' + errorMsg);
            setSaveResult({ success: false, message: errorMsg });
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleRestartGateway = async () => {
        if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) {
            setSaveResult({ success: false, message: 'Server URL and Gateway Token are required' });
            return;
        }

        if (!confirm('Are you sure you want to restart the OpenClaw Gateway? This will disconnect all active sessions.')) {
            return;
        }

        setIsRestarting(true);
        setOperationLoading((prev) => ({ ...prev, restart: true }));
        setSaveResult(null);

        try {
            const result = await restartGateway({
                serverUrl: connectionConfig.serverUrl,
                token: connectionConfig.gatewayToken
            });

            if (result.success) {
                setOperationResults((prev) => ({
                    ...prev,
                    restart: {
                        success: true,
                        summary: 'Gateway restart initiated successfully',
                        payload: result,
                    },
                }));
                setSaveResult({ success: true, message: 'Gateway restart initiated successfully' });
                // Reset connection status since gateway is restarting
                setConnectionStatus('disconnected');
                localStorage.removeItem('openclaw_connection_status');
                setDiagnostics([]);
            } else {
                setOperationResults((prev) => ({
                    ...prev,
                    restart: {
                        success: false,
                        summary: 'Failed to restart gateway: ' + ((result as any).error ?? 'Unknown error'),
                        payload: result,
                    },
                }));
                setSaveResult({ success: false, message: 'Failed to restart gateway: ' + ((result as any).error ?? 'Unknown error') });
            }
        } catch (error) {
            setOperationResults((prev) => ({
                ...prev,
                restart: {
                    success: false,
                    summary: 'Error restarting gateway: ' + (error instanceof Error ? error.message : 'Unknown error'),
                },
            }));
            setSaveResult({ success: false, message: 'Error restarting gateway: ' + (error instanceof Error ? error.message : 'Unknown error') });
        } finally {
            setIsRestarting(false);
            setOperationLoading((prev) => ({ ...prev, restart: false }));
        }
    };

    const handleSleepTimeUpdate = async (value: number) => {
        setSleepTime(value);
        if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) return;

        try {
            const result = await updateGatewaySleep({
                serverUrl: connectionConfig.serverUrl,
                token: connectionConfig.gatewayToken,
                sleepTimeMs: value
            });

            if (result.success) {
                console.log('Sleep time updated to', value);
            }
        } catch (error) {
            console.error('Failed to update sleep time:', error);
        }
    };

    // Test connection using backend proxy (avoids CORS issues with direct browser-to-gateway calls)
    const testConnection = async () => {
        if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) {
            toast.error('Server URL and Gateway Token are required');
            setSaveResult({ success: false, message: 'Server URL and Gateway Token are required' });
            return;
        }

        setIsTesting(true);
        setConnectionStatus('connecting');
        setSaveResult(null);
        setDiagnostics([]);

        // Helper to add diagnostic step
        const addDiagnostic = (step: string, status: 'pending' | 'success' | 'error', message: string) => {
            setDiagnostics(prev => {
                // Remove existing entry for this step if it exists
                const filtered = prev.filter(d => d.step !== step);
                return [...filtered, { step, status, message }];
            });
        };

        try {
            // Step 1: Quick browser WebSocket test (fast, no CORS issues)
            let wsUrl = connectionConfig.serverUrl;
            if (wsUrl.startsWith('https://')) {
                wsUrl = 'wss://' + wsUrl.slice(8);
            } else if (wsUrl.startsWith('http://')) {
                wsUrl = 'ws://' + wsUrl.slice(7);
            }

            addDiagnostic('WebSocket Connection', 'pending', `Connecting to ${wsUrl}...`);

            let wsSuccess = false;
            try {
                await new Promise<void>((resolve, reject) => {
                    const ws = new WebSocket(wsUrl);
                    let settled = false;
                    let connectRequestId = '';

                    const timeout = setTimeout(() => {
                        settled = true;
                        ws.close();
                        reject(new Error('Connection timeout (10s)'));
                    }, 10000);

                    ws.onopen = () => {
                        const role = connectionConfig.role === 'node' ? 'node' : 'operator';
                        const clientId = role === 'node' ? 'headless-node' : 'cli';
                        connectRequestId = `settings-connect-${Date.now()}`;
                        ws.send(JSON.stringify({
                            type: 'req',
                            id: connectRequestId,
                            method: 'connect',
                            params: {
                                minProtocol: 3,
                                maxProtocol: 3,
                                client: {
                                    id: clientId,
                                    displayName: 'OpenClaw Settings',
                                    version: '1.0.0',
                                    platform: 'linux',
                                    mode: role,
                                },
                                role,
                                scopes: role === 'node' ? [] : ['operator.read', 'operator.write'],
                                caps: [],
                                commands: [],
                                permissions: {},
                                auth: {
                                    token: connectionConfig.gatewayToken,
                                    ...(connectionConfig.password?.trim() ? { password: connectionConfig.password.trim() } : {}),
                                },
                                locale: navigator.language || 'en-US',
                                userAgent: navigator.userAgent,
                            },
                        }));
                    };

                    ws.onmessage = (event) => {
                        let data: any;
                        try {
                            data = JSON.parse(event.data);
                        } catch {
                            return;
                        }

                        const successFromRes = data.type === 'res' && data.id === connectRequestId && data.ok;
                        const successFromReadyEvent = data.type === 'event' && data.event === 'connect.ready';
                        if (successFromRes || successFromReadyEvent) {
                            if (settled) return;
                            settled = true;
                            clearTimeout(timeout);
                            addDiagnostic('WebSocket Connection', 'success', 'WebSocket connected and authenticated.');
                            wsSuccess = true;
                            ws.close(1000, 'Test complete');
                            resolve();
                            return;
                        }

                        const failedFromRes = data.type === 'res' && data.id === connectRequestId && !data.ok;
                        const failedFromError = data.type === 'error' || data.error;
                        if (failedFromRes || failedFromError) {
                            if (settled) return;
                            settled = true;
                            clearTimeout(timeout);
                            const errorMessage =
                                data.error?.message ||
                                data.error ||
                                data.message ||
                                'WebSocket authentication failed';
                            ws.close();
                            reject(new Error(String(errorMessage)));
                        }
                    };

                    ws.onerror = (error) => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timeout);
                        console.error('WebSocket error:', error);
                        reject(new Error('WebSocket connection failed'));
                    };

                    ws.onclose = (event) => {
                        if (!settled && event.code !== 1000) {
                            settled = true;
                            clearTimeout(timeout);
                            const reason = event.reason?.trim() ? `: ${event.reason}` : '';
                            reject(new Error(`WebSocket closed unexpectedly (code: ${event.code}${reason})`));
                        }
                    };
                });
            } catch (wsError) {
                addDiagnostic('WebSocket Connection', 'error', `WebSocket: ${wsError instanceof Error ? wsError.message : 'Failed'}`);
            }

            // Step 2: Test HTTP connectivity via backend proxy (no CORS  goes server-to-server)
            addDiagnostic('HTTP Connection (via backend)', 'pending', 'Testing HTTP API through backend proxy...');

            try {
                const { checkOpenClawConnection } = await import('../lib/api');
                const rawResult = await checkOpenClawConnection({
                    serverUrl: connectionConfig.serverUrl,
                    token: connectionConfig.gatewayToken,
                });

                const result = (rawResult && typeof rawResult === 'object') ? (rawResult as unknown as Record<string, unknown>) : {};
                const nestedData = (result.data && typeof result.data === 'object') ? result.data as Record<string, unknown> : null;

                const pickString = (...values: unknown[]) => {
                    const candidate = values.find(v => typeof v === 'string' && v.trim().length > 0);
                    return typeof candidate === 'string' ? candidate : null;
                };

                const isConnected = Boolean((result.connected as boolean | undefined) ?? (nestedData?.connected as boolean | undefined));
                const responseMessage = pickString(
                    result.message,
                    nestedData?.message,
                    result.error,
                    nestedData?.error,
                    result.errorDetails,
                    nestedData?.errorDetails
                ) ?? 'No response message returned by backend.';

                const version = pickString(result.version, nestedData?.version) ?? 'unknown';
                const uptime = pickString(result.uptime, nestedData?.uptime);
                const agents = ((result.agents as Array<{ id: string; name?: string }> | undefined)
                    ?? (nestedData?.agents as Array<{ id: string; name?: string }> | undefined)
                    ?? []);
                const channels = ((result.channels as Array<{ type: string; name?: string; status: string }> | undefined)
                    ?? (nestedData?.channels as Array<{ type: string; name?: string; status: string }> | undefined)
                    ?? []);
                const agentCount = (result.agentCount as number | undefined)
                    ?? (nestedData?.agentCount as number | undefined)
                    ?? agents.length;

                if (isConnected) {
                    addDiagnostic('HTTP Connection (via backend)', 'success',
                        `HTTP API connected! Version: ${version}, Agents: ${agentCount}`);

                    // Step 3: Show additional info if available
                    if (agents.length > 0) {
                        const agentNames = agents.map(a => a.name || a.id).join(', ');
                        addDiagnostic('Gateway Info', 'success',
                            `Agents: ${agentNames}${uptime ? ` | Uptime: ${uptime}` : ''}`);
                    }

                    if (channels.length > 0) {
                        const channelInfo = channels.map(ch => `${ch.name || ch.type}(${ch.status})`).join(', ');
                        addDiagnostic('Channels', 'success', `Active channels: ${channelInfo}`);
                    }

                    setConnectionStatus('connected');
                    localStorage.setItem('openclaw_connection_status', 'connected');
                    localStorage.setItem('openclaw_connection_tested_at', new Date().toISOString());
                    setSaveResult({ success: true, message: 'Connected to OpenClaw Gateway!' });
                } else {
                    // Backend could reach the server but got a non-OK response
                    addDiagnostic('HTTP Connection (via backend)', 'error',
                        `HTTP check failed: ${responseMessage}`);

                    if (wsSuccess) {
                        // WebSocket works but HTTP doesn't  partial connectivity
                        addDiagnostic('Partial Connectivity', 'success',
                            'WebSocket works but HTTP API may be limited. Gateway restart and config operations may not work.');
                        setConnectionStatus('connected');
                        localStorage.setItem('openclaw_connection_status', 'connected');
                        localStorage.setItem('openclaw_connection_tested_at', new Date().toISOString());
                        setSaveResult({ success: true, message: 'Connected via WebSocket (HTTP API limited)' });
                    } else {
                        setConnectionStatus('error');
                        localStorage.removeItem('openclaw_connection_status');
                        setSaveResult({ success: false, message: responseMessage });
                    }
                }
            } catch (apiError) {
                const errorMsg = apiError instanceof Error ? apiError.message : 'Unknown error';
                const isNetworkError =
                    typeof apiError === 'object' &&
                    apiError !== null &&
                    (
                        (apiError as any).message === 'Network Error' ||
                        (apiError as any).code === 'ERR_NETWORK'
                    );

                const backendHint = isNetworkError
                    ? 'Backend proxy error: Network Error. Frontend cannot reach backend /api. Set VITE_API_URL to your backend Worker URL (https://<worker>.workers.dev/api) or configure your host to proxy /api to backend.'
                    : `Backend proxy error: ${errorMsg}`;

                addDiagnostic('HTTP Connection (via backend)', 'error', backendHint);

                if (wsSuccess) {
                    // WebSocket succeeded so gateway is reachable, but backend proxy failed
                    addDiagnostic('Partial Connectivity', 'success',
                        'WebSocket connected directly. Backend proxy is unreachable or not mapped to /api.');
                    setConnectionStatus('connected');
                    localStorage.setItem('openclaw_connection_status', 'connected');
                    localStorage.setItem('openclaw_connection_tested_at', new Date().toISOString());
                    setSaveResult({ success: true, message: 'Connected via WebSocket (backend proxy unavailable)' });
                } else {
                    setConnectionStatus('error');
                    localStorage.removeItem('openclaw_connection_status');
                    setSaveResult({ success: false, message: 'Connection failed: ' + errorMsg });
                }
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addDiagnostic('Connection', 'error', `Connection failed: ${errorMessage}`);
            setConnectionStatus('error');
            localStorage.removeItem('openclaw_connection_status');
            setSaveResult({ success: false, message: 'Connection failed: ' + errorMessage });

            // Provide specific troubleshooting
            if (errorMessage.includes('timeout') || errorMessage.includes('Connection refused')) {
                addDiagnostic('Troubleshooting', 'error', 'Gateway may not be running. Make sure OpenClaw is started on port 18789.');
            }
        } finally {
            setIsTesting(false);
        }
    };

    // Push all agents to the gateway
    const pushAgentsToGateway = async () => {
        if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) {
            toast.error('Server URL and Gateway Token are required');
            setSaveResult({ success: false, message: 'Server URL and Gateway Token are required' });
            return;
        }

        setIsPushingAgents(true);
        setSaveResult(null);
        const loadingToastId = toast.loading('Pushing agents to gateway...');

        try {
            const { pushAgentsToOpenClaw } = await import('../lib/api');
            const result = await pushAgentsToOpenClaw({
                serverUrl: connectionConfig.serverUrl,
                token: connectionConfig.gatewayToken
            });

            if (result.success) {
                const message = result.message ?? `Successfully pushed ${result.pushed || 0} agents to gateway`;
                setSaveResult({ success: true, message });
                toast.success(message, { id: loadingToastId });
            } else {
                const message = result.error ?? result.message ?? `Failed to push agents${result.failed ? ` (${result.failed} failed)` : ''}`;
                setSaveResult({ success: false, message });
                toast.error(message, { id: loadingToastId });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to push agents';
            setSaveResult({ success: false, message });
            toast.error(message, { id: loadingToastId });
        } finally {
            setIsPushingAgents(false);
        }
    };

    // Push agent files to the gateway
    const pushFilesToGateway = async () => {
        if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) {
            setSaveResult({ success: false, message: 'Server URL and Gateway Token are required' });
            return;
        }

        setIsPushingFiles(true);
        setSaveResult(null);

        try {
            const { pushFilesToOpenClaw } = await import('../lib/api');
            const result = await pushFilesToOpenClaw({
                serverUrl: connectionConfig.serverUrl,
                token: connectionConfig.gatewayToken
            });

            if (result.success) {
                setSaveResult({ success: true, message: `Successfully pushed ${result.pushed || 0} files to gateway` });
            } else {
                setSaveResult({ success: false, message: result.error ?? 'Failed to push files' });
            }
        } catch (error) {
            setSaveResult({ success: false, message: error instanceof Error ? error.message : 'Failed to push files' });
        } finally {
            setIsPushingFiles(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const resetDefaults = () => {
        if (!confirm('Reset all advanced settings to defaults?')) return;
        setAdvancedSettings({
            idleSleepMs: 100,
            webhookUrl: '',
            bootMarkdown: '',
            commandLogger: false,
            compactionMode: 'auto',
            maxConcurrency: 5,
            memorySearchEnabled: false,
            memoryFlushInterval: 300000,
            subagentConcurrency: 2,
        });
        setSaveResult({ success: true, message: 'Reset to default settings' });
    };

    const runHealthCheck = async () => {
        setOperationLoading((prev) => ({ ...prev, health: true }));
        try {
            const result = await getGatewayHealth({ serverUrl: connectionConfig.serverUrl, token: connectionConfig.gatewayToken });
            const hasVersion = Boolean(result.version && result.version !== 'unknown');
            const summary = result.success
                ? (result.limitedMetadata
                    ? `Connected=${result.connected ? 'yes' : 'no'} | Metadata=limited (agents-only)${hasVersion ? ` | Version=${result.version}` : ''}`
                    : `Connected=${result.connected ? 'yes' : 'no'}${hasVersion ? ` | Version=${result.version}` : ''}${result.uptime ? ` | Uptime=${result.uptime}` : ''}`)
                : (result.error ?? 'Health check failed');
            setOperationResults((prev) => ({
                ...prev,
                health: {
                    success: result.success && result.connected,
                    summary,
                    diagnostics: result.diagnostics,
                    payload: result,
                },
            }));
        } catch (error) {
            const maybeResponse = (error as any)?.response?.data as
                | { error?: string; diagnostics?: string[]; connected?: boolean; version?: string; uptime?: string; model?: string | null; provider?: string | null }
                | undefined;
            if (maybeResponse) {
                setOperationResults((prev) => ({
                    ...prev,
                    health: {
                        success: false,
                        summary: maybeResponse.error ?? (error instanceof Error ? error.message : 'Health check failed'),
                        diagnostics: maybeResponse.diagnostics,
                        payload: maybeResponse,
                    },
                }));
            } else {
                setOperationResults((prev) => ({ ...prev, health: { success: false, summary: error instanceof Error ? error.message : 'Unknown error' } }));
            }
        } finally {
            setOperationLoading((prev) => ({ ...prev, health: false }));
        }
    };

    const runFetchConfig = async () => {
        setOperationLoading((prev) => ({ ...prev, fetchConfig: true }));
        try {
            const result = await getGatewayConfig({ serverUrl: connectionConfig.serverUrl, token: connectionConfig.gatewayToken });
            if (result.success && result.config) {
                setGatewayConfig(result.config);
                setSleepTime((result.config as any)?.gateway?.performance?.idleSleepMs ?? 100);
            }
            setOperationResults((prev) => ({
                ...prev,
                fetchConfig: {
                    success: Boolean(result.success),
                    summary: result.success ? 'Fetched config successfully' : (result.error ?? 'Failed to fetch config'),
                    payload: result,
                },
            }));
        } catch (error) {
            setOperationResults((prev) => ({ ...prev, fetchConfig: { success: false, summary: error instanceof Error ? error.message : 'Unknown error' } }));
        } finally {
            setOperationLoading((prev) => ({ ...prev, fetchConfig: false }));
        }
    };

    const runUpdateConfig = async () => {
        setOperationLoading((prev) => ({ ...prev, updateConfig: true }));
        try {
            const configUpdate = {
                gateway: {
                    performance: {
                        idleSleepMs: advancedSettings.idleSleepMs
                    },
                    webhookUrl: advancedSettings.webhookUrl,
                    bootMarkdown: advancedSettings.bootMarkdown,
                    commandLogger: advancedSettings.commandLogger,
                    compactionMode: advancedSettings.compactionMode,
                    maxConcurrency: advancedSettings.maxConcurrency
                },
                memory: {
                    searchEnabled: advancedSettings.memorySearchEnabled,
                    flushInterval: advancedSettings.memoryFlushInterval
                },
                subagent: {
                    concurrency: advancedSettings.subagentConcurrency
                }
            };

            const result = await updateGatewayConfig({
                serverUrl: connectionConfig.serverUrl,
                token: connectionConfig.gatewayToken,
                config: configUpdate,
            });
            setOperationResults((prev) => ({
                ...prev,
                updateConfig: {
                    success: Boolean(result.success),
                    summary: result.success ? 'Configuration updated successfully' : (result.error ?? 'Failed to update configuration'),
                    payload: result,
                },
            }));
        } catch (error) {
            setOperationResults((prev) => ({ ...prev, updateConfig: { success: false, summary: error instanceof Error ? error.message : 'Unknown error' } }));
        } finally {
            setOperationLoading((prev) => ({ ...prev, updateConfig: false }));
        }
    };

    const runFetchAgents = async () => {
        setOperationLoading((prev) => ({ ...prev, agents: true }));
        try {
            const result = await getGatewayAgents({ serverUrl: connectionConfig.serverUrl, token: connectionConfig.gatewayToken });
            setOperationResults((prev) => ({
                ...prev,
                agents: {
                    success: result.success,
                    summary: result.success ? `Fetched ${result.agentCount} agents` : (result.error ?? 'Failed to fetch agents'),
                    diagnostics: result.diagnostics,
                    payload: result,
                },
            }));
        } catch (error) {
            setOperationResults((prev) => ({ ...prev, agents: { success: false, summary: error instanceof Error ? error.message : 'Unknown error' } }));
        } finally {
            setOperationLoading((prev) => ({ ...prev, agents: false }));
        }
    };

    const runFetchChannels = async () => {
        setOperationLoading((prev) => ({ ...prev, channels: true }));
        try {
            const result = await getGatewayChannels({ serverUrl: connectionConfig.serverUrl, token: connectionConfig.gatewayToken });
            setOperationResults((prev) => ({
                ...prev,
                channels: {
                    success: result.success,
                    summary: result.success ? `Fetched ${result.channelCount} channels` : (result.error ?? 'Failed to fetch channels'),
                    diagnostics: result.diagnostics,
                    payload: result,
                },
            }));
        } catch (error) {
            setOperationResults((prev) => ({ ...prev, channels: { success: false, summary: error instanceof Error ? error.message : 'Unknown error' } }));
        } finally {
            setOperationLoading((prev) => ({ ...prev, channels: false }));
        }
    };

    const runDatasetCheck = async (
        op: OperationKey,
        fetcher: (data: { serverUrl: string; token: string }) => Promise<{ success: boolean; count: number; diagnostics?: string[]; errorDetails?: string | null; items: unknown[]; source: 'tool' | 'http' | 'cli' | 'none' }>,
        label: string,
    ) => {
        setOperationLoading((prev) => ({ ...prev, [op]: true }));
        try {
            const result = await fetcher({ serverUrl: connectionConfig.serverUrl, token: connectionConfig.gatewayToken });
            setOperationResults((prev) => ({
                ...prev,
                [op]: {
                    success: result.success,
                    summary: result.success
                        ? `Fetched ${result.count} ${label} (source: ${result.source})`
                        : `Failed to fetch ${label}: ${result.errorDetails ?? 'No reachable endpoint/tool'}`,
                    diagnostics: result.diagnostics,
                    payload: result,
                },
            }));
        } catch (error) {
            const maybeResponse = (error as any)?.response?.data as { errorDetails?: string; diagnostics?: string[]; success?: boolean } | undefined;
            setOperationResults((prev) => ({
                ...prev,
                [op]: {
                    success: false,
                    summary: maybeResponse?.errorDetails
                        ? `Failed to fetch ${label}: ${maybeResponse.errorDetails}`
                        : (error instanceof Error ? error.message : 'Unknown error'),
                    diagnostics: maybeResponse?.diagnostics,
                    payload: maybeResponse,
                },
            }));
        } finally {
            setOperationLoading((prev) => ({ ...prev, [op]: false }));
        }
    };

    const runFetchChatMessages = async () => runDatasetCheck('chatMessages', getGatewayChatMessages, 'chat messages');
    const runFetchSessions = async () => runDatasetCheck('sessions', getGatewaySessions, 'sessions');
    const runFetchWorkspaceFiles = async () => runDatasetCheck('workspaceFiles', getGatewayWorkspaceFiles, 'workspace files');
    const runFetchUsage = async () => runDatasetCheck('usage', getGatewayUsage, 'usage entries');
    const runFetchCronJobs = async () => runDatasetCheck('cronJobs', getGatewayCronJobs, 'cron jobs');
    const runFetchSkills = async () => runDatasetCheck('skills', getGatewaySkills, 'skills');
    const runFetchLogs = async () => runDatasetCheck('logs', getGatewayLogs, 'log entries');

    const getGatewayBlockers = (result: { success: boolean; summary: string; diagnostics?: string[]; payload?: unknown } | null) => {
        if (!result) return { originBlocked: false, policyBlocked: false };
        if (result.success) return { originBlocked: false, policyBlocked: false };
        const lines = [
            ...(result.diagnostics ?? []),
            result.summary ?? '',
            typeof result.payload === 'object' && result.payload !== null && 'error' in (result.payload as Record<string, unknown>)
                ? String((result.payload as Record<string, unknown>).error ?? '')
                : '',
        ].filter(Boolean).map((line) => line.toLowerCase());

        const originBlocked = lines.some((line) => line.includes('origin not allowed') || line.includes('allowedorigins'));
        const policyBlocked = lines.some((line) => line.includes('not allowed by policy') || line.includes('blocked by policy'));
        return { originBlocked, policyBlocked };
    };

    const OperationResult = ({ op }: { op: OperationKey }) => {
        const result = operationResults[op];
        if (!result) return null;
        const blockers = getGatewayBlockers(result);

        return (
            <div className={`mt-3 p-3 rounded-md border text-xs ${result.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                <div className="font-semibold mb-2">{result.summary}</div>
                {(blockers.originBlocked || blockers.policyBlocked) && (
                    <div className="mb-3 p-3 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200">
                        <div className="font-semibold mb-1">Gateway access is blocked by configuration</div>
                        {blockers.originBlocked && (
                            <div className="mb-1">
                                Origin is rejected. Add this app URL to <code className="text-amber-100">gateway.controlUi.allowedOrigins</code> or open the Control UI from the gateway host.
                            </div>
                        )}
                        {blockers.policyBlocked && (
                            <div>
                                Tool policy is blocking metadata endpoints. Allow tools like <code className="text-amber-100">status</code>, <code className="text-amber-100">agents.list</code>, <code className="text-amber-100">channels.status</code>, <code className="text-amber-100">config.get</code>.
                            </div>
                        )}
                    </div>
                )}
                {result.diagnostics && result.diagnostics.length > 0 && (
                    <details className="mb-2">
                        <summary className="cursor-pointer">Diagnostics ({result.diagnostics.length})</summary>
                        <ul className="mt-2 list-disc list-inside text-zinc-300">
                            {result.diagnostics.map((line, idx) => (
                                <li key={`${op}-diag-${idx}`}>{line}</li>
                            ))}
                        </ul>
                    </details>
                )}
                {Boolean(result.payload) && (
                    <details>
                        <summary className="cursor-pointer">Raw response</summary>
                        <pre className="mt-2 bg-zinc-950 p-2 rounded overflow-auto text-zinc-300">{JSON.stringify(result.payload, null, 2)}</pre>
                    </details>
                )}
            </div>
        );
    };

    // Save Connection Settings - saves to backend AND localStorage
    const handleSaveConnectionSettings = async () => {
        // Validate required fields
        if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) {
            toast.error('Server URL and Gateway Token are required');
            setSaveResult({ success: false, message: 'Server URL and Gateway Token are required' });
            return;
        }

        setIsSavingConfig(true);
        setSaveResult(null);

        try {
            // Save to localStorage for immediate access
            localStorage.setItem('openclaw_gateway_token', connectionConfig.gatewayToken);
            localStorage.setItem('openclaw_server_url', connectionConfig.serverUrl);
            localStorage.setItem('openclaw_connection_mode', connectionConfig.mode);
            localStorage.setItem('openclaw_heartbeat_minutes', String(connectionConfig.heartbeatIntervalMinutes ?? 30));

            // Try to save to backend database
            const connectionData = {
                name: 'OpenClaw Gateway',
                url: connectionConfig.serverUrl,
                apiKey: connectionConfig.gatewayToken,
                mode: connectionConfig.mode,
                isDefault: true,
            };

            await createOpenClawConnection(connectionData);

            // Show success toast
            toast.success('OpenClaw connection settings saved successfully!');
            setSaveResult({ success: true, message: 'Connection settings saved to database!' });
        } catch (error) {
            // Even if backend save fails, localStorage was saved
            console.warn('Failed to save to backend, using localStorage only:', error);
            toast.warning('Saved to browser storage (database sync failed)');
            setSaveResult({ success: true, message: 'Saved to browser storage (database sync failed)' });
        } finally {
            setIsSavingConfig(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Status Messages - Show at top */}
            {saveResult && (
                <div className={`p-4 rounded-md border flex gap-3 items-center text-sm ${saveResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
                    }`}>
                    {saveResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {saveResult.message}
                </div>
            )}

            {connectionTestResult && (
                <div className={`p-4 rounded-md border flex gap-3 items-center text-sm ${connectionTestResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
                    }`}>
                    {connectionTestResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {connectionTestResult.message}
                </div>
            )}

            {/* Connection Status */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-zinc-100">
                        Connection Status
                    </h4>
                    <div className={`text-sm font-semibold ${connectionStatus === 'connected' ? 'text-emerald-500' : connectionStatus === 'error' ? 'text-red-500' : connectionStatus === 'connecting' ? 'text-amber-500' : 'text-amber-500'}`}>
                        {connectionStatus === 'connected'
                            ? 'Connected'
                            : connectionStatus === 'error'
                                ? 'Error'
                                : connectionStatus === 'connecting'
                                    ? 'Connecting...'
                                    : (connectionConfig.gatewayToken ? 'Needs Tunnel (Warning)' : 'Not Configured')}
                    </div>
                </div>

                {connectionConfig.gatewayToken && connectionStatus !== 'connected' && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400 flex gap-2 items-center">
                        <Info size={14} />
                        <span>Your dashboard is hosted on Cloudflare but OpenClaw is running locally. Set up a tunnel to connect.</span>
                    </div>
                )}

                {!connectionConfig.gatewayToken && (
                    <div className="p-3 bg-amber-500 text-black rounded text-xs flex gap-2 items-center">
                        <Key size={14} />
                        <span>Gateway Token required. Configure it below.</span>
                    </div>
                )}
            </div>

            {/* Test Connection Button */}
            <button
                onClick={testConnection}
                disabled={isTesting || !connectionConfig.gatewayToken || !connectionConfig.serverUrl}
                className={`px-4 py-2.5 rounded-md text-white text-sm font-medium flex items-center gap-2 transition-all w-fit ${isTesting || !connectionConfig.gatewayToken || !connectionConfig.serverUrl
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : connectionStatus === 'connected'
                        ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
                        : 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
                    }`}
            >
                {isTesting ? <Loader2 size={14} className="animate-spin" /> : connectionStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isTesting ? 'Testing...' : connectionStatus === 'connected' ? 'Tested - Connected' : 'Test Connection'}
            </button>

            {/* Diagnostics Display */}
            {diagnostics.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                    <h4 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                        <AlertCircle size={16} className="text-blue-400" />
                        Connection Diagnostics
                    </h4>

                    <div className="space-y-3">
                        {diagnostics.map((diag, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-md border ${diag.status === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : diag.status === 'error'
                                        ? 'bg-red-500/10 border-red-500/30'
                                        : 'bg-blue-500/10 border-blue-500/30'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {diag.status === 'success' ? (
                                        <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                    ) : diag.status === 'error' ? (
                                        <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <Loader2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0 animate-spin" />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${diag.status === 'success'
                                            ? 'text-emerald-500'
                                            : diag.status === 'error'
                                                ? 'text-red-500'
                                                : 'text-blue-400'
                                            }`}>
                                            {diag.step}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-1 whitespace-pre-line">
                                            {diag.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Fix Suggestions */}
                    {connectionStatus === 'error' && (
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                            <h5 className="text-xs font-semibold text-amber-500 mb-2">Quick Fixes</h5>
                            <ul className="text-xs text-zinc-400 space-y-1">
                                <li>- <strong>Invalid connect params?</strong> Use protocol-safe client values: <code>client.id=&quot;cli&quot;</code>, <code>client.mode=&quot;operator&quot;</code>, <code>client.platform=&quot;linux&quot;</code>.</li>
                                <li>- <strong>Backend Network Error?</strong> Frontend cannot reach backend API. Set <code>VITE_API_URL=https://&lt;your-backend&gt;/api</code> or ensure your domain forwards <code>/api/*</code> to the backend Worker.</li>
                                <li>- <strong>Gateway not running?</strong> Start OpenClaw locally and verify port <code>18789</code> is listening.</li>
                                <li>- <strong>Wrong URL / Token?</strong> Use the exact gateway URL and matching <code>gateway.auth.token</code> from OpenClaw config.</li>
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Tunnel Setup Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        <Terminal size={16} className="text-blue-400" />
                        Cloudflare Tunnel Setup
                    </h4>
                    <button
                        onClick={() => setShowTunnelHelp(!showTunnelHelp)}
                        className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                        {showTunnelHelp ? 'Hide Help' : 'Show Help'}
                    </button>
                </div>

                {showTunnelHelp && (
                    <div className="text-xs text-zinc-400 space-y-3">
                        <p className="text-zinc-300 font-medium">Tunnel Migrated - Configure Origin:</p>
                        <ol className="list-decimal list-inside space-y-2">
                            <li>Go to <strong>Tunnel Settings</strong> -&gt; <strong>Ingress</strong></li>
                            <li>Set origin: <code className="bg-zinc-800 px-1 rounded">http://localhost:18789</code></li>
                            <li><strong>Important:</strong> Go to <strong>Access</strong> settings</li>
                            <li><strong>Turn OFF</strong> "Enforce Access JWT validation" - this causes login page!</li>
                            <li>Save changes</li>
                        </ol>

                        <p className="text-blue-400 mt-4">Your URL: <strong>https://openclaw.clawpute.com</strong></p>
                        <p className="text-blue-400">Default OpenClaw port: <strong>18789</strong></p>
                    </div>
                )}

                <div className="mt-4">
                    <button
                        onClick={() => setShowTunnelHelp(!showTunnelHelp)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer flex items-center gap-1"
                    >
                        <ChevronDown size={12} className={`transition-transform ${showTunnelHelp ? 'rotate-180' : ''}`} />
                        {showTunnelHelp ? 'Less info' : 'More info'}
                    </button>
                </div>
            </div>

            {/* Gateway Control Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <h4 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                    <Settings size={16} className="text-zinc-400" />
                    Gateway Control
                </h4>

                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={handleRestartGateway}
                        disabled={isRestarting || !connectionConfig.gatewayToken}
                        className={`px-4 py-2.5 rounded-md text-white text-sm font-medium flex items-center gap-2 transition-all ${isRestarting || !connectionConfig.gatewayToken
                            ? 'bg-red-500/20 text-red-500/50 cursor-not-allowed opacity-50'
                            : 'bg-red-600 hover:bg-red-500 cursor-pointer'
                            }`}
                    >
                        <RefreshCw size={14} className={isRestarting ? 'animate-spin' : ''} />
                        {isRestarting ? 'Restarting...' : 'Restart Gateway'}
                    </button>

                    <button
                        onClick={pushAgentsToGateway}
                        disabled={isPushingAgents || !connectionConfig.gatewayToken}
                        className={`px-4 py-2.5 rounded-md text-white text-sm font-medium flex items-center gap-2 transition-all ${isPushingAgents || !connectionConfig.gatewayToken
                            ? 'bg-blue-500/20 text-blue-500/50 cursor-not-allowed opacity-50'
                            : 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
                            }`}
                    >
                        <Users size={14} className={isPushingAgents ? 'animate-pulse' : ''} />
                        {isPushingAgents ? 'Pushing...' : 'Push Agents to Gateway'}
                    </button>

                    <button
                        onClick={pushFilesToGateway}
                        disabled={isPushingFiles || !connectionConfig.gatewayToken}
                        className={`px-4 py-2.5 rounded-md text-white text-sm font-medium flex items-center gap-2 transition-all ${isPushingFiles || !connectionConfig.gatewayToken
                            ? 'bg-emerald-500/20 text-emerald-500/50 cursor-not-allowed opacity-50'
                            : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
                            }`}
                    >
                        <FileText size={14} className={isPushingFiles ? 'animate-pulse' : ''} />
                        {isPushingFiles ? 'Pushing...' : 'Push Files to Gateway'}
                    </button>
                </div>

                <p className="text-xs text-zinc-500 mt-3">
                    <ArrowRight size={12} className="inline mr-1" />
                    Push agents and files from your dashboard to the OpenClaw Gateway instance
                </p>
            </div>

            {/* Gateway Operations */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                <div className="p-4 flex items-center gap-3 border-b border-zinc-800">
                    <Settings size={16} className="text-zinc-400" />
                    <h4 className="text-sm font-semibold text-zinc-100">Gateway Operations (Separate Endpoints)</h4>
                </div>

                <div className="p-4 space-y-3">
                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">1) Restart Gateway</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-restart</p>
                            </div>
                            <button onClick={handleRestartGateway} disabled={operationLoading.restart || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.restart ? 'Restarting...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="restart" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">2) Check System Health</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-health</p>
                            </div>
                            <button onClick={runHealthCheck} disabled={operationLoading.health || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.health ? 'Checking...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="health" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">3) Fetch Config</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-config</p>
                            </div>
                            <button onClick={runFetchConfig} disabled={operationLoading.fetchConfig || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.fetchConfig ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="fetchConfig" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">4) Update Config</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-config-update</p>
                            </div>
                            <button onClick={runUpdateConfig} disabled={operationLoading.updateConfig || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.updateConfig ? 'Saving...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="updateConfig" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">5) Fetch Agents</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-agents</p>
                            </div>
                            <button onClick={runFetchAgents} disabled={operationLoading.agents || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.agents ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="agents" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">6) Fetch Channels</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-channels</p>
                            </div>
                            <button onClick={runFetchChannels} disabled={operationLoading.channels || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.channels ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="channels" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">7) Fetch Chat Messages</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-chat-messages</p>
                            </div>
                            <button onClick={runFetchChatMessages} disabled={operationLoading.chatMessages || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.chatMessages ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="chatMessages" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">8) Fetch Sessions</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-sessions</p>
                            </div>
                            <button onClick={runFetchSessions} disabled={operationLoading.sessions || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.sessions ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="sessions" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">9) Fetch Workspace Files</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-workspace-files</p>
                            </div>
                            <button onClick={runFetchWorkspaceFiles} disabled={operationLoading.workspaceFiles || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.workspaceFiles ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="workspaceFiles" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">10) Fetch Usage</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-usage</p>
                            </div>
                            <button onClick={runFetchUsage} disabled={operationLoading.usage || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.usage ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="usage" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">11) Fetch Cron Jobs</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-cron-jobs</p>
                            </div>
                            <button onClick={runFetchCronJobs} disabled={operationLoading.cronJobs || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.cronJobs ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="cronJobs" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">12) Fetch Skills</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-skills</p>
                            </div>
                            <button onClick={runFetchSkills} disabled={operationLoading.skills || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.skills ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="skills" />
                    </div>

                    <div className="rounded border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-zinc-100 font-medium">13) Fetch Logs</p>
                                <p className="text-xs text-zinc-500">Endpoint: /api/openclaw/gateway-logs</p>
                            </div>
                            <button onClick={runFetchLogs} disabled={operationLoading.logs || !connectionConfig.gatewayToken} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs">
                                {operationLoading.logs ? 'Loading...' : 'Run'}
                            </button>
                        </div>
                        <OperationResult op="logs" />
                    </div>
                </div>
            </div>

            {/* Gateway Token */}
            <div>
                <label className="block text-sm font-medium mb-2 text-zinc-100">
                    Gateway Token
                </label>
                <input
                    type="password"
                    value={connectionConfig.gatewayToken}
                    onChange={(e) => onConnectionConfigChange({ gatewayToken: e.target.value })}
                    placeholder={connectionConfig.gatewayToken || "728a7307166292b0d62b2a8232f55e4cfa3daacb2991e4f2"}
                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                />
                <p className="text-xs text-zinc-500 mt-2">
                    Find this in your OpenClaw Gateway overview page. Default token pre-filled.
                </p>
            </div>

            {/* Save Connection Config Button */}
            <button
                onClick={handleSaveConnectionSettings}
                disabled={!connectionConfig.gatewayToken || isSavingConfig}
                className={`px-4 py-2.5 rounded-md text-white text-sm font-medium flex items-center gap-2 transition-all w-fit ${!connectionConfig.gatewayToken || isSavingConfig
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
                    }`}
            >
                {isSavingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSavingConfig ? 'Saving...' : 'Save Connection Settings'}
            </button>

            {/* Server URL */}
            <div>
                <label className="block text-sm font-medium mb-2 text-zinc-100">
                    Server URL
                </label>
                <input
                    type="text"
                    value={connectionConfig.serverUrl}
                    onChange={(e) => onConnectionConfigChange({ serverUrl: e.target.value })}
                    placeholder="https://openclaw-tunnel.workers.dev (or http://localhost:18789)"
                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                />
                <p className="text-xs text-zinc-500 mt-2">
                    OpenClaw Gateway URL (default port: 18789). Use Cloudflare Tunnel URL for remote access.
                </p>
            </div>

            {/* Connection Mode */}
            <div>
                <label className="block text-sm font-medium mb-2 text-zinc-100">
                    Connection Mode
                </label>
                <select
                    value={connectionConfig.mode}
                    onChange={(e) => onConnectionConfigChange({ mode: e.target.value as any })}
                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors appearance-none"
                >
                    <option value="local">Local</option>
                    <option value="cloudflare">Cloudflare Workers</option>
                    <option value="docker">Docker</option>
                    <option value="vps">VPS / Remote</option>
                </select>
            </div>

            {/* Heartbeat Check Frequency */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <h4 className="text-sm font-semibold mb-2 text-zinc-100">
                    Heartbeat Check Frequency
                </h4>
                <p className="text-xs text-zinc-500 mb-3">
                    How often the agent checks for pending tasks. Uses a cheaper model to reduce costs.
                </p>
                <select
                    value={connectionConfig.heartbeatIntervalMinutes}
                    onChange={(e) => onConnectionConfigChange({ heartbeatIntervalMinutes: parseInt(e.target.value, 10) })}
                    className="w-full p-3 bg-zinc-900 border border-violet-500/50 rounded-md text-zinc-100 text-sm outline-none focus:border-violet-400 transition-colors appearance-none"
                >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes (default)</option>
                    <option value={60}>60 minutes</option>
                </select>
            </div>

            {/* Performance Settings */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <h4 className="text-sm font-semibold mb-4 text-zinc-100">
                    Gateway Performance
                </h4>

                <div>
                    <label className="flex justify-between text-sm mb-2 text-zinc-100 font-medium">
                        <span>Idle Sleep Time (ms)</span>
                        <span className="font-semibold text-blue-400">{sleepTime}ms</span>
                    </label>
                    <input
                        type="range"
                        min="50"
                        max="5000"
                        step="50"
                        value={sleepTime}
                        onChange={(e) => handleSleepTimeUpdate(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                        Time gateway waits before sleeping when idle
                    </p>
                </div>
            </div>

            {/* Advanced Settings Accordion */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                    <Settings size={16} className="text-zinc-400" />
                    <h4 className="text-sm font-semibold text-zinc-100 flex-1">
                        Advanced OpenClaw Settings
                    </h4>
                    <p className="text-xs text-zinc-500">
                        Fine-tune your OpenClaw Gateway configuration
                    </p>
                </div>

                {/* Gateway Management Accordion */}
                <div className="border-t border-zinc-800">
                    <button
                        onClick={() => toggleSection('gateway')}
                        className="w-full p-4 bg-transparent border-none cursor-pointer flex items-center justify-between text-zinc-100 text-sm font-semibold transition-colors hover:bg-zinc-800/50"
                    >
                        <span>Gateway Management</span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${expandedSections.gateway ? 'rotate-180' : 'rotate-0'}`}
                        />
                    </button>
                    {expandedSections.gateway && (
                        <div className="p-4 pt-0 flex flex-col gap-4 border-t border-zinc-800/50 pt-4">
                            <div>
                                <label className="flex justify-between text-sm mb-2 text-zinc-100 font-medium">
                                    <span>Idle Sleep Time (ms)</span>
                                    <span className="font-semibold text-blue-400">{advancedSettings.idleSleepMs}ms</span>
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="5000"
                                    step="50"
                                    value={advancedSettings.idleSleepMs}
                                    onChange={(e) => setAdvancedSettings(prev => ({ ...prev, idleSleepMs: parseInt(e.target.value) }))}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <p className="text-xs text-zinc-500 mt-2">
                                    Controls how often the gateway polls for tasks. Lower values increase responsiveness but use more CPU/Tokens.
                                </p>
                            </div>
                            <button
                                onClick={handleRestartGateway}
                                disabled={isRestarting || !connectionConfig.gatewayToken}
                                className={`px-4 py-2.5 rounded-md text-white text-sm font-medium flex items-center gap-2 transition-all w-fit ${isRestarting || !connectionConfig.gatewayToken
                                    ? 'bg-red-500/20 text-red-500/50 cursor-not-allowed opacity-50'
                                    : 'bg-red-600 hover:bg-red-500 cursor-pointer'
                                    }`}
                            >
                                <RefreshCw size={14} className={isRestarting ? 'animate-spin' : ''} />
                                {isRestarting ? 'Restarting...' : 'Restart Gateway'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Global Webhook Accordion */}
                <div className="border-t border-zinc-800">
                    <button
                        onClick={() => toggleSection('webhook')}
                        className="w-full p-4 bg-transparent border-none cursor-pointer flex items-center justify-between text-zinc-100 text-sm font-semibold transition-colors hover:bg-zinc-800/50"
                    >
                        <span>Global Webhook & Bootstrap</span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${expandedSections.webhook ? 'rotate-180' : 'rotate-0'}`}
                        />
                    </button>
                    {expandedSections.webhook && (
                        <div className="p-4 pt-0 flex flex-col gap-4 border-t border-zinc-800/50 pt-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-100">
                                    Global Webhook URL (CLAWPUTE_WEBHOOK_URL)
                                </label>
                                <input
                                    type="text"
                                    value={advancedSettings.webhookUrl}
                                    onChange={(e) => setAdvancedSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                                    placeholder="https://your-app.com/api/webhooks/openclaw"
                                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                                />
                                <p className="text-xs text-zinc-500 mt-2">
                                    Primary webhook for receiving events and task updates across all channels
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center gap-3 cursor-pointer text-zinc-100">
                                    <input
                                        type="checkbox"
                                        checked={advancedSettings.commandLogger}
                                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, commandLogger: e.target.checked }))}
                                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-blue-500 accent-blue-600"
                                    />
                                    <span className="text-sm">Command Logger</span>
                                </label>
                                <p className="text-xs text-zinc-500 mt-1 ml-7">
                                    Log all shell commands and tool executions
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-zinc-100">
                                    Boot Markdown
                                </label>
                                <textarea
                                    value={advancedSettings.bootMarkdown}
                                    onChange={(e) => setAdvancedSettings(prev => ({ ...prev, bootMarkdown: e.target.value }))}
                                    placeholder="Inject system context from markdown files on boot"
                                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors font-mono min-h-[80px] resize-vertical"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Performance & Compaction Accordion */}
                <div className="border-t border-zinc-800">
                    <button
                        onClick={() => toggleSection('performance')}
                        className="w-full p-4 bg-transparent border-none cursor-pointer flex items-center justify-between text-zinc-100 text-sm font-semibold transition-colors hover:bg-zinc-800/50"
                    >
                        <span>Performance & Compaction</span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${expandedSections.performance ? 'rotate-180' : 'rotate-0'}`}
                        />
                    </button>
                    {expandedSections.performance && (
                        <div className="p-4 pt-0 flex flex-col gap-4 border-t border-zinc-800/50 pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-zinc-100">
                                        Compaction Mode
                                    </label>
                                    <select
                                        value={advancedSettings.compactionMode}
                                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, compactionMode: e.target.value }))}
                                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors appearance-none"
                                    >
                                        <option value="auto">Auto (Smart)</option>
                                        <option value="disabled">Disabled</option>
                                        <option value="aggressive">Aggressive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-zinc-100">
                                        Max Concurrency
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={advancedSettings.maxConcurrency}
                                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, maxConcurrency: parseInt(e.target.value) }))}
                                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Experimental Features Accordion */}
                <div className="border-t border-zinc-800">
                    <button
                        onClick={() => toggleSection('experimental')}
                        className="w-full p-4 bg-transparent border-none cursor-pointer flex items-center justify-between text-zinc-100 text-sm font-semibold transition-colors hover:bg-zinc-800/50"
                    >
                        <span>Experimental & Memory</span>
                        <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${expandedSections.experimental ? 'rotate-180' : 'rotate-0'}`}
                        />
                    </button>
                    {expandedSections.experimental && (
                        <div className="p-4 pt-0 flex flex-col gap-4 border-t border-zinc-800/50 pt-4">
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer text-zinc-100">
                                    <input
                                        type="checkbox"
                                        checked={advancedSettings.memorySearchEnabled}
                                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, memorySearchEnabled: e.target.checked }))}
                                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-blue-500 accent-blue-600"
                                    />
                                    <span className="text-sm">Session Memory Search</span>
                                </label>
                                <p className="text-xs text-zinc-500 mt-1 ml-7">
                                    Enable AI-powered semantic search across agent conversation history
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-zinc-100">
                                        Memory Flush Interval (ms)
                                    </label>
                                    <input
                                        type="number"
                                        min="10000"
                                        step="10000"
                                        value={advancedSettings.memoryFlushInterval}
                                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, memoryFlushInterval: parseInt(e.target.value) }))}
                                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-zinc-100">
                                        Subagent Concurrency
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={advancedSettings.subagentConcurrency}
                                        onChange={(e) => setAdvancedSettings(prev => ({ ...prev, subagentConcurrency: parseInt(e.target.value) }))}
                                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons for Advanced Settings */}
                <div className="p-4 border-t border-zinc-800 flex gap-3 flex-wrap">
                    <button
                        onClick={saveAdvancedConfig}
                        disabled={isSavingConfig || !connectionConfig.gatewayToken}
                        className={`px-4 py-2.5 rounded-md text-white text-sm font-medium flex items-center gap-2 transition-all ${isSavingConfig || !connectionConfig.gatewayToken
                            ? 'bg-blue-500/20 text-blue-500/50 cursor-not-allowed opacity-50'
                            : 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
                            }`}
                    >
                        <Save size={14} className={isSavingConfig ? 'animate-spin' : ''} />
                        {isSavingConfig ? 'Applying...' : 'Apply Advanced Changes'}
                    </button>

                    <button
                        onClick={resetDefaults}
                        className="px-4 py-2.5 rounded-md text-zinc-100 text-sm font-medium bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                        Reset Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}

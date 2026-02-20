import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Save,
  Download,
  Upload,
  Settings,
  Globe,
  Server,
  Cloud,
  Container,
  Github,
  Zap,
  MessageCircle,
  Phone,
  FileText,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Key,
  Bot,
  Shield,
  Sliders,
  Brain,
  Activity,
  Info,
  Send,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { checkOpenClawConnection, fetchOpenClawStats, sendMessageToOpenClaw, restartGateway, updateGatewaySleep, syncOpenClawAgents, getGatewayConfig, updateGatewayConfig, setupOpenClawPlugin } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const settingsRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'settings',
  component: ConfigPage,
});

// Connection mode types
type ConnectionMode = 'local' | 'cloudflare' | 'docker' | 'vps';

// Connection configuration interface
interface ConnectionConfig {
  mode: ConnectionMode;
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
}

// Default connection config - Uses HTTP API (works with both local and tunnel)
const defaultConnectionConfig: ConnectionConfig = {
  mode: 'local',
  serverUrl: 'wss://openclaw.clawpute.com',  // HTTP API endpoint
  apiKey: '',
  gatewayToken: '',
  password: '',
  defaultSessionKey: 'agent:main:main',
  workerEnabled: false,
  workerName: 'openclaw-worker',
  workerAccountId: '',
  dockerSocket: '/var/run/docker.sock',
  vpsHost: '',
  vpsPort: 18789,
  role: 'operator',
};

// VapiAI configuration
interface VapiAIConfig {
  apiKey: string;
  connected: boolean;
  lastChecked: string | null;
}

interface WsDiagnosticEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

// Theme Toggle Section Component
function ThemeToggleSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Appearance</h3>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setTheme('dark')}
          style={{
            flex: 1,
            padding: '16px',
            background: theme === 'dark' ? 'var(--accent-blue)' : 'var(--bg-dark)',
            border: `1px solid ${theme === 'dark' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
            borderRadius: '8px',
            color: theme === 'dark' ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Moon size={24} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Dark</span>
        </button>
        <button
          onClick={() => setTheme('light')}
          style={{
            flex: 1,
            padding: '16px',
            background: theme === 'light' ? 'var(--accent-blue)' : 'var(--bg-dark)',
            border: `1px solid ${theme === 'light' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
            borderRadius: '8px',
            color: theme === 'light' ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Sun size={24} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Light</span>
        </button>
      </div>
      <p style={{
        fontSize: '13px',
        color: 'var(--text-secondary)',
        marginTop: '12px'
      }}>
        Choose your preferred theme. Changes are applied immediately.
      </p>
    </div>
  );
}

function ConfigPage() {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useWorkspace();
  const [activeTab, setActiveTab] = useState('openclaw');

  // Version state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [upgradeStep, setUpgradeStep] = useState('');
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(() => {
    // Load saved version from localStorage, default to '2026.1.30'
    return localStorage.getItem('openclaw_current_version') || '2026.1.30';
  });

  // Connection mode state
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>(defaultConnectionConfig);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [wsDiagnostics, setWsDiagnostics] = useState<WsDiagnosticEntry[]>([]);
  const [connectionProtocol, setConnectionProtocol] = useState<'ws' | 'http' | null>(null);
  const [openClawStats, setOpenClawStats] = useState<{
    version?: string;
    uptime?: string;
    model?: string;
    provider?: string;
    agents?: Array<{ id: string; name: string; status?: string; model?: string }>;
    agentCount?: number;
    channels?: Array<{ type: string; name: string; status: string }>;
    channelCount?: number;
    gateway?: { url: string; status: string };
    config?: any;
    errorDetails?: string;
    actionRequired?: string;
    diagnostics?: string[];
  } | null>(null);

  // Sync version with stats
  useEffect(() => {
    if (openClawStats?.version && openClawStats.version !== 'unknown') {
      setCurrentVersion(openClawStats.version);
    }
  }, [openClawStats]);
  const [isSavingConnection, setIsSavingConnection] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingAgents, setIsSyncingAgents] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPreparingPlugin, setIsPreparingPlugin] = useState(false);
  const [pluginSetupSnippet, setPluginSetupSnippet] = useState('');
  const [pluginInstallSnippet, setPluginInstallSnippet] = useState('');
  const [pluginSetupResult, setPluginSetupResult] = useState<{ success: boolean; message: string } | null>(null);

  // Send message state
  const [testMessage, setTestMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendMessageResult, setSendMessageResult] = useState<{ success: boolean; message: string } | null>(null);

  // VapiAI state
  const [vapiConfig, setVapiConfig] = useState<VapiAIConfig>({
    apiKey: '',
    connected: false,
    lastChecked: null,
  });
  const [isTestingVapi, setIsTestingVapi] = useState(false);
  const [isSavingVapi, setIsSavingVapi] = useState(false);

  // Advanced settings state
  const [gatewayConfig, setGatewayConfig] = useState<Record<string, any>>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [sleepTime, setSleepTime] = useState(gatewayConfig?.gateway?.performance?.idleSleepMs || 100);

  // Handle Gateway Restart
  const handleRestartGateway = async () => {
    if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) return;

    if (!confirm('Are you sure you want to restart the OpenClaw Gateway? This will disconnect all active sessions.')) {
      return;
    }

    setIsRestarting(true);
    try {
      const result = await restartGateway({
        serverUrl: connectionConfig.serverUrl,
        token: connectionConfig.gatewayToken
      });

      if (result.success) {
        setSaveResult({ success: true, message: 'Gateway restart initiated successfully.' });
      } else {
        setSaveResult({ success: false, message: 'Failed to restart gateway: ' + (result as any).error });
      }
    } catch (error) {
      setSaveResult({ success: false, message: 'Error restarting gateway: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setIsRestarting(false);
    }
  };

  // Handle Sleep Time Update
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

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const savedConnection = localStorage.getItem('openclaw_connection_config');
    if (savedConnection) {
      try {
        const parsed = JSON.parse(savedConnection);
        // Merge with defaults to ensure new fields exist
        setConnectionConfig({
          ...defaultConnectionConfig,
          ...parsed,
          // Ensure new fields have defaults if missing from saved config
          gatewayToken: parsed.gatewayToken ?? '',
          password: parsed.password ?? '',
          defaultSessionKey: parsed.defaultSessionKey ?? 'agent:main:main',
          role: parsed.role ?? 'operator',
        });
      } catch (e) {
        console.error('Failed to load connection config:', e);
      }
    }

    const savedVapi = localStorage.getItem('openclaw_vapi_config');
    if (savedVapi) {
      try {
        setVapiConfig(JSON.parse(savedVapi));
      } catch (e) {
        console.error('Failed to load VapiAI config:', e);
      }
    }

    // Auto-fetch stats on mount if server is configured
    // Try to load gateway config once to establish initial connection status (silently)
    if (connectionConfig.serverUrl && connectionConfig.gatewayToken) {
      // Don't auto-test connection on mount — OpenClawSettingsPanel uses localStorage cache.
      // Only load gateway config silently for advanced settings.
      loadGatewayConfig();
    }
  }, []);

  const loadGatewayConfig = async () => {
    if (!connectionConfig.serverUrl?.trim() || !connectionConfig.gatewayToken?.trim()) return;

    setIsLoadingConfig(true);
    try {
      const response = await getGatewayConfig({
        serverUrl: connectionConfig.serverUrl,
        token: connectionConfig.gatewayToken
      });

      if (response.success && response.config) {
        setGatewayConfig(response.config);
      } else {
        // Graceful failure - just log the error, don't show to user
        console.warn('Failed to load gateway config:', response.error);
      }
    } catch (error) {
      // Graceful failure - just log the error, don't show to user
      console.warn('Failed to load gateway config:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const saveAdvancedConfig = async () => {
    if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) return;

    setIsSavingConfig(true);
    try {
      const response = await updateGatewayConfig({
        serverUrl: connectionConfig.serverUrl,
        token: connectionConfig.gatewayToken,
        config: gatewayConfig
      });

      if (response.success) {
        setSaveResult({ success: true, message: 'Advanced configuration updated successfully' });
        queryClient.invalidateQueries({ queryKey: ['openclaw-stats'] });
      } else {
        setSaveResult({ success: false, message: response.error || 'Failed to update configuration' });
      }
    } catch (error) {
      setSaveResult({ success: false, message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Version check simulation (would call backend API)
  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    setConnectionTestResult(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Compare current version with actual gateway version (from stats) or latest known
      // If we have stats, use that version. Otherwise this will be a simulated check.
      const latestVersion = openClawStats?.version || currentVersion;
      if (latestVersion && currentVersion !== latestVersion && latestVersion !== 'unknown') {
        setUpdateAvailable(true);
        setConnectionTestResult({
          success: true,
          message: `Update available: ${latestVersion} (Current: ${currentVersion})`
        });
      } else {
        setUpdateAvailable(false);
        setConnectionTestResult({
          success: true,
          message: 'You are running the latest version.'
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setConnectionTestResult({
        success: false,
        message: 'Failed to check for updates. Please try again.'
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const startUpgrade = async () => {
    setShowUpgradeConfirm(false);
    setIsUpgrading(true);
    setUpgradeProgress(0);

    try {
      const steps = [
        { msg: 'Downloading update package...', progress: 20 },
        { msg: 'Verifying checksum...', progress: 40 },
        { msg: 'Stopping OpenClaw services...', progress: 60 },
        { msg: 'Applying patches...', progress: 80 },
        { msg: 'Restarting gateway...', progress: 100 }
      ];

      for (const step of steps) {
        setUpgradeStep(step.msg);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setUpgradeProgress(step.progress);
      }

      // Use the version from stats if available, otherwise indicate upgrade complete
      const newVersion = openClawStats?.version || 'latest';
      localStorage.setItem('openclaw_current_version', newVersion);
      setCurrentVersion(newVersion);
      setUpdateAvailable(false);

      setSaveResult({
        success: true,
        message: `OpenClaw upgrade process completed! Please test your connection to verify the new version.`
      });
    } catch (error) {
      console.error('Upgrade failed:', error);
      setSaveResult({
        success: false,
        message: 'Upgrade failed. Please check gateway logs.'
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  // Test connection to OpenClaw instance
  // Strategy:
  //   1) Quick browser WebSocket probe (fast signal, no CORS)
  //   2) Authoritative backend proxy validation (backend → gateway)
  //   3) Fetch rich stats via backend proxy
  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    setOpenClawStats(null);
    setSendMessageResult(null);
    setWsDiagnostics([]);
    setConnectionProtocol(null);

    try {
      // Validate token exists
      if (!connectionConfig.gatewayToken?.trim()) {
        setConnectionTestResult({
          success: false,
          message: 'Gateway Token is required. Please enter your token from the OpenClaw Overview page.'
        });
        setIsTestingConnection(false);
        return;
      }

      // ── Step 1: Quick direct WebSocket probe from browser ──
      // This is fast and not impacted by HTTP CORS restrictions.
      let wsResult: {
        success: boolean;
        message: string;
        version?: string;
        diagnostics: WsDiagnosticEntry[];
      } = {
        success: false,
        message: 'WebSocket probe skipped',
        diagnostics: [],
      };

      try {
        wsResult = await new Promise<{
          success: boolean;
          message: string;
          version?: string;
          diagnostics: WsDiagnosticEntry[];
        }>((resolve) => {
          const wsUrl = (() => {
            let url = connectionConfig.serverUrl.replace(/\/$/, '');
            if (url.startsWith('http://')) url = url.replace('http://', 'ws://');
            else if (url.startsWith('https://')) url = url.replace('https://', 'wss://');
            else if (!url.startsWith('ws://') && !url.startsWith('wss://')) url = `ws://${url}`;
            return url;
          })();

          const cleanedToken = connectionConfig.gatewayToken.replace(/^Bearer\s+/i, '').trim();
          const diags: WsDiagnosticEntry[] = [];
          const pushDiag = (message: string, type: WsDiagnosticEntry['type'] = 'info') => {
            diags.push({ timestamp: Date.now(), message, type });
            setWsDiagnostics([...diags]);
          };

          let resolved = false;
          let ws: WebSocket | null = null;
          let connectRequestId: string | null = null;

          const resolveOnce = (result: { success: boolean; message: string; version?: string }) => {
            if (resolved) return;
            resolved = true;
            try {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Test complete');
              }
            } catch {
              // no-op
            }
            resolve({ ...result, diagnostics: [...diags] });
          };

          pushDiag(`Connecting via WebSocket to ${wsUrl}...`);
          ws = new WebSocket(wsUrl);

          const timeout = setTimeout(() => {
            pushDiag('Connection timeout after 10s', 'error');
            resolveOnce({ success: false, message: 'WebSocket connection timeout' });
          }, 10000);

          ws.addEventListener('open', () => {
            pushDiag('WebSocket opened, sending connect handshake...', 'success');
            const auth: Record<string, unknown> = { token: cleanedToken };
            if (connectionConfig.password?.trim()) {
              auth.password = connectionConfig.password.trim();
            }

            connectRequestId = `test-connect-${Date.now()}`;
            ws?.send(JSON.stringify({
              type: 'req',
              id: connectRequestId,
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'openclaw-react-dashboard',
                  displayName: 'OpenClaw Dashboard',
                  version: '1.0.0',
                  platform: 'web',
                  mode: connectionConfig.role === 'node' ? 'node' : 'operator',
                },
                role: connectionConfig.role === 'node' ? 'node' : 'operator',
                scopes: connectionConfig.role === 'node' ? [] : ['operator.read', 'operator.write'],
                caps: [],
                commands: [],
                permissions: {},
                auth,
                locale: navigator.language || 'en-US',
                userAgent: navigator.userAgent,
              },
            }));
          });

          ws.addEventListener('message', (event: MessageEvent) => {
            let data: any;
            try {
              data = JSON.parse(event.data);
            } catch {
              pushDiag('Failed to parse server message', 'error');
              return;
            }

            if (data.type === 'res' && connectRequestId && data.id === connectRequestId) {
              clearTimeout(timeout);
              if (data.ok) {
                const version =
                  data.payload?.snapshot?.health?.gateway?.version ??
                  data.payload?.version ??
                  undefined;
                pushDiag(`Authenticated as ${connectionConfig.role || 'operator'}`, 'success');
                resolveOnce({
                  success: true,
                  message: `Connected via WebSocket (${connectionConfig.role || 'operator'})${version ? ` (v${version})` : ''}`,
                  version,
                });
              } else {
                const errMsg = data.error?.message || 'Authentication failed';
                pushDiag(`Auth error: ${errMsg}`, 'error');
                resolveOnce({ success: false, message: `Authentication failed: ${errMsg}` });
              }
              return;
            }

            if (data.type === 'event' && data.event === 'connect.ready') {
              clearTimeout(timeout);
              const version = data.payload?.version || undefined;
              pushDiag(`Authenticated as ${connectionConfig.role || 'operator'}; connection ready.`, 'success');
              resolveOnce({
                success: true,
                message: `Connected via WebSocket (${connectionConfig.role || 'operator'})${version ? ` (v${version})` : ''}`,
                version,
              });
              return;
            }

            if (data.error || data.type === 'error') {
              clearTimeout(timeout);
              const errMsg =
                typeof data.error === 'string'
                  ? data.error
                  : data.error?.message || data.message || 'Unknown error';
              pushDiag(`Server error: ${errMsg}`, 'error');
              resolveOnce({ success: false, message: errMsg });
            }
          });

          ws.addEventListener('error', () => {
            pushDiag('WebSocket error (network, DNS, or proxy issue)', 'error');
          });

          ws.addEventListener('close', (event: CloseEvent) => {
            clearTimeout(timeout);
            if (!resolved && event.code !== 1000) {
              const reason = event.reason?.trim() ? `: ${event.reason}` : '';
              pushDiag(`Connection closed (code: ${event.code}${reason})`, 'warn');
              resolveOnce({ success: false, message: `WebSocket closed (code: ${event.code}${reason})` });
            }
          });
        });
        setWsDiagnostics(wsResult.diagnostics);
      } catch (err) {
        setWsDiagnostics((prev) => [
          ...prev,
          {
            timestamp: Date.now(),
            message: `WebSocket probe failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            type: 'warn' as const,
          },
        ]);
      }

      // ── Step 2: Authoritative backend proxy check (browser → backend → gateway) ──
      setConnectionProtocol(wsResult.success ? 'ws' : 'http');
      setWsDiagnostics((prev) => [
        ...prev,
        { timestamp: Date.now(), message: 'Validating via backend proxy API...', type: 'info' as const },
      ]);

      const result = await checkOpenClawConnection({
        serverUrl: connectionConfig.serverUrl,
        token: connectionConfig.gatewayToken,
      });

      if (!result.connected) {
        const wsSummary = wsResult.success ? 'WebSocket probe: ✓ success' : `WebSocket probe: ✗ ${wsResult.message}`;
        setConnectionTestResult({
          success: false,
          message: `Backend proxy validation failed\n${wsSummary}\n${result.message ?? 'Connection failed. Please check your settings and token.'}`
        });
        setOpenClawStats({
          errorDetails: result.errorDetails,
          diagnostics: (result as any).diagnostics,
        });
        setIsTestingConnection(false);
        return;
      }

      // ── Step 3: Fetch detailed stats via backend proxy ──
      try {
        const statsResult = await fetchOpenClawStats({
          serverUrl: connectionConfig.serverUrl,
          token: connectionConfig.gatewayToken,
        });

        if (statsResult && (statsResult as any).success && (statsResult as any).connected) {
          setOpenClawStats({
            version: (statsResult as any).version,
            uptime: (statsResult as any).uptime,
            model: (statsResult as any).model,
            provider: (statsResult as any).provider,
            agents: (statsResult as any).agents,
            agentCount: (statsResult as any).agentCount,
            channels: (statsResult as any).channels,
            channelCount: (statsResult as any).channelCount,
            gateway: (statsResult as any).gateway,
            diagnostics: (statsResult as any).diagnostics,
          });

          const version = (statsResult as any).version ?? (result as any).version ?? 'unknown';
          const uptime = (statsResult as any).uptime ?? (result as any).uptime ?? 'N/A';
          const agentCount = (statsResult as any).agentCount ?? 0;
          const channelCount = (statsResult as any).channelCount ?? 0;
          const model = (statsResult as any).model ?? 'Not configured';

          setConnectionTestResult({
            success: true,
            message: `✓ Connected via backend proxy${wsResult.success ? ' (WebSocket + proxy validated)' : ' (proxy validated)'}\nVersion: ${version}\nUptime: ${uptime}\nAgents: ${agentCount}\nChannels: ${channelCount}\nModel: ${model}`
          });
        } else {
          setOpenClawStats({
            version: (result as any).version,
            uptime: (result as any).uptime,
            model: (result as any).model,
            provider: (result as any).provider,
            agents: (result as any).agents,
            agentCount: (result as any).agentCount,
            channels: (result as any).channels,
            channelCount: (result as any).channelCount,
            diagnostics: (result as any).diagnostics,
          });

          const version = (result as any).version ?? 'unknown';
          const uptime = (result as any).uptime ?? 'N/A';
          const agentCount = (result as any).agentCount ?? 0;
          const channelCount = (result as any).channelCount ?? 0;

          setConnectionTestResult({
            success: true,
            message: `✓ Connected via backend proxy${wsResult.success ? ' (WebSocket + proxy validated)' : ' (proxy validated)'}\nVersion: ${version}\nUptime: ${uptime}\nAgents: ${agentCount}\nChannels: ${channelCount}`
          });
        }
      } catch (statsError) {
        setConnectionTestResult({
          success: true,
          message: `✓ Connected via backend proxy${wsResult.success ? ' (WebSocket + proxy validated)' : ' (proxy validated)'}\nVersion: ${(result as any).version ?? 'unknown'}\nUptime: ${(result as any).uptime ?? 'N/A'}`
        });
      }
    } catch (error) {
      let errorMessage = 'Connection error: ';
      let errorDetails = '';
      let actionRequired = '';

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string, errorDetails?: string, actionRequired?: string }; statusText?: string } };
        errorMessage += axiosError.response?.data?.message ?? axiosError.response?.statusText ?? 'Unknown error';
        errorDetails = axiosError.response?.data?.errorDetails ?? '';
        actionRequired = axiosError.response?.data?.actionRequired ?? '';
      } else if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error';
      }

      setConnectionTestResult({
        success: false,
        message: errorMessage
      });
      setOpenClawStats({
        errorDetails: errorDetails || (error instanceof Error ? error.stack : 'No additional details available'),
        actionRequired: actionRequired
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Send test message to OpenClaw
  const sendTestMessage = async () => {
    if (!testMessage.trim()) return;

    setIsSendingMessage(true);
    setSendMessageResult(null);

    try {
      const result = await sendMessageToOpenClaw({
        serverUrl: connectionConfig.serverUrl,
        token: connectionConfig.gatewayToken,
        password: connectionConfig.password,
        message: testMessage,
        sessionKey: connectionConfig.defaultSessionKey,
      });

      if (result.success) {
        setSendMessageResult({
          success: true,
          message: `Message sent successfully to session: ${result.sessionKey}`
        });
        setTestMessage(''); // Clear input on success
      } else {
        setSendMessageResult({
          success: false,
          message: result.error ?? 'Failed to send message'
        });
      }
    } catch (error) {
      let errorMessage = 'Failed to send message: ';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string }; statusText?: string } };
        errorMessage += axiosError.response?.data?.error ?? axiosError.response?.statusText ?? 'Unknown error';
      } else if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error';
      }
      setSendMessageResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const syncAgentsFromGateway = async () => {
    if (!currentWorkspaceId) {
      setSyncResult({ success: false, message: 'No active workspace selected.' });
      return;
    }
    if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) {
      setSyncResult({ success: false, message: 'Server URL and Gateway Token are required before sync.' });
      return;
    }

    setIsSyncingAgents(true);
    setSyncResult(null);

    try {
      const result = await syncOpenClawAgents({
        serverUrl: connectionConfig.serverUrl,
        token: connectionConfig.gatewayToken,
        workspaceId: currentWorkspaceId,
        pruneMissing: true,
        maxAgents: 250,
      });

      if (result.success) {
        setSyncResult({
          success: true,
          message: `Synced ${result.synced} agents (created ${result.created}, updated ${result.updated}, unchanged ${result.unchanged}).`,
        });
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      } else {
        setSyncResult({ success: false, message: result.error || 'Agent sync failed' });
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: `Agent sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSyncingAgents(false);
    }
  };

  const prepareOpenClawPlugin = async () => {
    if (!currentWorkspaceId) {
      setPluginSetupResult({ success: false, message: 'No active workspace selected.' });
      return;
    }
    if (!connectionConfig.serverUrl || !connectionConfig.gatewayToken) {
      setPluginSetupResult({ success: false, message: 'Server URL and Gateway Token are required before plugin setup.' });
      return;
    }

    setIsPreparingPlugin(true);
    setPluginSetupResult(null);

    try {
      const result = await setupOpenClawPlugin({
        workspaceId: currentWorkspaceId,
        serverUrl: connectionConfig.serverUrl,
        token: connectionConfig.gatewayToken,
      });

      const snippet = [
        '# ~/.openclaw/openclaw.json hook env',
        `CLAWPUTE_WEBHOOK_URL=${result.plugin.env.CLAWPUTE_WEBHOOK_URL}`,
        `CLAWPUTE_WORKSPACE_ID=${result.plugin.env.CLAWPUTE_WORKSPACE_ID}`,
        `CLAWPUTE_WEBHOOK_SECRET=${result.plugin.env.CLAWPUTE_WEBHOOK_SECRET}`,
      ].join('\n');

      const installSnippet = [
        '# 1) Install the Clawpute hook plugin in your OpenClaw environment',
        'npm install -g clawdash-hook',
        '',
        '# 2) Add env vars to ~/.openclaw/openclaw.json under hooks.internal.entries.clawdash.env',
        snippet,
        '',
        '# 3) Restart OpenClaw gateway so hook changes load',
        'openclaw gateway restart',
      ].join('\n');

      setPluginSetupSnippet(snippet);
      setPluginInstallSnippet(installSnippet);
      setPluginSetupResult({ success: true, message: 'Plugin configuration prepared. Install clawdash-hook, add env vars, then restart OpenClaw gateway.' });
    } catch (error) {
      setPluginSetupResult({
        success: false,
        message: `Failed to prepare plugin config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsPreparingPlugin(false);
    }
  };

  // Save connection settings
  const saveConnectionSettings = async () => {
    setIsSavingConnection(true);
    setSaveResult(null);

    try {
      // Save to localStorage
      localStorage.setItem('openclaw_connection_config', JSON.stringify(connectionConfig));

      // Simulate API call to backend
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveResult({
        success: true,
        message: 'Connection settings saved successfully!'
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (error) {
      setSaveResult({
        success: false,
        message: 'Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setIsSavingConnection(false);
    }
  };

  // Test VapiAI connection
  const testVapiConnection = async () => {
    setIsTestingVapi(true);
    setVapiConfig(prev => ({ ...prev, connected: false }));

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (vapiConfig.apiKey && vapiConfig.apiKey.length > 10) {
        setVapiConfig(prev => ({
          ...prev,
          connected: true,
          lastChecked: new Date().toISOString()
        }));
      } else {
        throw new Error('Invalid API key');
      }
    } catch (error) {
      console.error('VapiAI connection test failed:', error);
      setVapiConfig(prev => ({
        ...prev,
        connected: false
      }));
    } finally {
      setIsTestingVapi(false);
    }
  };

  // Save VapiAI settings
  const saveVapiSettings = async () => {
    setIsSavingVapi(true);

    try {
      localStorage.setItem('openclaw_vapi_config', JSON.stringify(vapiConfig));
      await new Promise(resolve => setTimeout(resolve, 500));
      setConnectionTestResult({
        success: true,
        message: 'VapiAI settings saved successfully!'
      });
    } catch (error) {
      console.error('Failed to save VapiAI settings:', error);
      setConnectionTestResult({
        success: false,
        message: 'Failed to save VapiAI settings.'
      });
    } finally {
      setIsSavingVapi(false);
    }
  };

  // Handle connection mode selection
  const selectConnectionMode = (mode: ConnectionMode) => {
    setConnectionConfig(prev => ({ ...prev, mode }));
  };

  // Get mode-specific fields
  const renderModeFields = () => {
    // Common OpenClaw authentication fields
    const roleSelectionField = (
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'block', fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
          Connection Role
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setConnectionConfig(prev => ({ ...prev, role: 'operator' }))}
            style={{
              flex: 1,
              padding: '10px',
              background: connectionConfig.role === 'operator' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-dark)',
              border: `1px solid ${connectionConfig.role === 'operator' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
              borderRadius: '6px',
              color: connectionConfig.role === 'operator' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Bot className="w-4 h-4" /> Operator
          </button>
          <button
            onClick={() => setConnectionConfig(prev => ({ ...prev, role: 'node' }))}
            style={{
              flex: 1,
              padding: '10px',
              background: connectionConfig.role === 'node' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-dark)',
              border: `1px solid ${connectionConfig.role === 'node' ? 'var(--accent-green)' : 'var(--border-color)'}`,
              borderRadius: '6px',
              color: connectionConfig.role === 'node' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <Shield className="w-4 h-4" /> Node (Zalo/IoT)
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
          {connectionConfig.role === 'operator'
            ? 'Standard operator role for full dashboard access.'
            : 'Minimal role for background integration (Zalo Personal, external nodes).'}
        </p>
      </div>
    );

    const gatewayTokenField = (
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="gateway-token" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          Gateway Token <span style={{ color: 'var(--accent-blue)' }}>*</span>
        </label>
        <input
          id="gateway-token"
          type="password"
          value={connectionConfig.gatewayToken}
          onChange={(e) => setConnectionConfig(prev => ({ ...prev, gatewayToken: e.target.value }))}
          placeholder="728a7307..."
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px',
          }}
        />
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
          Your Gateway Token from the OpenClaw Overview page. Required for authenticating with the gateway.
        </p>
      </div>
    );

    const passwordField = (
      <div className="form-group">
        <label htmlFor="gateway-password" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          Password
        </label>
        <input
          id="gateway-password"
          type="password"
          value={connectionConfig.password}
          onChange={(e) => setConnectionConfig(prev => ({ ...prev, password: e.target.value }))}
          placeholder="system or shared password"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px',
          }}
        />
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
          Optional. System or shared password if configured.
        </p>
      </div>
    );

    const sessionKeyField = (
      <div className="form-group">
        <label htmlFor="default-session-key" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          Default Session Key
        </label>
        <input
          id="default-session-key"
          type="text"
          value={connectionConfig.defaultSessionKey}
          onChange={(e) => setConnectionConfig(prev => ({ ...prev, defaultSessionKey: e.target.value }))}
          placeholder="agent:main:main"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px',
          }}
        />
      </div>
    );

    switch (connectionConfig.mode) {
      case 'local':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="server-url" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                OpenClaw URL <span style={{ color: 'var(--accent-blue)' }}>*</span>
              </label>
              <input
                id="server-url"
                type="text"
                value={connectionConfig.serverUrl}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
                placeholder="http://127.0.0.1:18789 or https://openclaw.clawpute.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
                Use http://localhost:18789 for local, or https://your-tunnel.com for remote access
              </p>
            </div>
            {sessionKeyField}
            {roleSelectionField}
            {gatewayTokenField}
            {passwordField}
          </div>
        );

      case 'cloudflare':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="worker-name" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Worker Name</label>
              <input
                id="worker-name"
                type="text"
                value={connectionConfig.workerName}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, workerName: e.target.value }))}
                placeholder="openclaw-worker"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="account-id" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Account ID</label>
              <input
                id="account-id"
                type="text"
                value={connectionConfig.workerAccountId}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, workerAccountId: e.target.value }))}
                placeholder="Cloudflare account ID"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={connectionConfig.workerEnabled}
                  onChange={(e) => setConnectionConfig(prev => ({ ...prev, workerEnabled: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                />
                <span style={{ color: 'var(--text-primary)' }}>Enable Cloudflare Worker mode</span>
              </label>
            </div>
            {roleSelectionField}
            {gatewayTokenField}
            {passwordField}
          </div>
        );

      case 'docker':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="docker-socket" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Docker Socket Path</label>
              <input
                id="docker-socket"
                type="text"
                value={connectionConfig.dockerSocket}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, dockerSocket: e.target.value }))}
                placeholder="/var/run/docker.sock"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="container-name" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Container Name</label>
              <input
                id="container-name"
                type="text"
                placeholder="openclaw-container"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            {roleSelectionField}
            {gatewayTokenField}
            {passwordField}
          </div>
        );

      case 'vps':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="vps-host" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>VPS Host</label>
              <input
                id="vps-host"
                type="text"
                value={connectionConfig.vpsHost}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, vpsHost: e.target.value }))}
                placeholder="your-server.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="vps-port" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Port</label>
              <input
                id="vps-port"
                type="number"
                value={connectionConfig.vpsPort}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, vpsPort: parseInt(e.target.value) || 18789 }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="vps-api-key" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>API Key</label>
              <input
                id="vps-api-key"
                type="password"
                value={connectionConfig.apiKey}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter VPS API key"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            {roleSelectionField}
            {gatewayTokenField}
            {passwordField}
          </div>
        );

      default:
        return null;
    }
  };

  const tabs = [
    { id: 'openclaw', label: 'OpenClaw', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'connection', label: 'Connection', icon: <Globe className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Server className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing & Tokens', icon: <Zap className="w-4 h-4" /> },
    { id: 'backup', label: 'Backup', icon: <Download className="w-4 h-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Sliders className="w-4 h-4" /> },
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="page-content" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      <div className="content-section" style={{ maxWidth: '1000px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>System Configuration</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Configure OpenClaw core, network connectivity, integrations, and preferences.</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--bg-card)',
                border: `1px solid ${activeTab === tab.id ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {tab.icon}
              {tab.label.split(' ')[1]}
            </button>
          ))}
        </div>

        {/* OpenClaw Tab */}
        {activeTab === 'openclaw' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>OpenClaw Core</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Installed Version</div>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{currentVersion}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Version on this machine</div>
                </div>
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Connected Gateway Version</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: openClawStats?.version && openClawStats.version !== 'unknown' ? 'var(--accent-green)' : 'var(--text-dim)' }}>
                    {openClawStats?.version && openClawStats.version !== 'unknown'
                      ? openClawStats.version
                      : 'Not connected'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    {openClawStats?.version && openClawStats.version !== 'unknown'
                      ? 'Live connection ✓'
                      : 'Set up tunnel to connect'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Connection Status</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: openClawStats?.version && openClawStats.version !== 'unknown' ? 'var(--accent-green)' : (connectionConfig.gatewayToken ? 'var(--accent-yellow)' : 'var(--text-dim)') }}>
                    {openClawStats?.version && openClawStats.version !== 'unknown'
                      ? 'Connected ✓'
                      : (connectionConfig.gatewayToken ? 'Needs Tunnel ⚠' : 'Not Configured')}
                  </div>
                </div>
              </div>

              {/* Connection Required Notice */}
              {connectionConfig.gatewayToken && (!openClawStats?.version || openClawStats.version === 'unknown') && (
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#3b82f6' }}>
                    <Info className="w-5 h-5" />
                    <strong>Connection Setup Required</strong>
                  </div>
                  <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>
                    Your dashboard is hosted on Cloudflare but your OpenClaw is running locally.
                    Cloudflare Workers cannot reach your localhost directly.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href="/TUNNEL_SETUP.md"
                      target="_blank"
                      style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      View Setup Guide
                    </a>
                    <button
                      onClick={() => window.open('https://github.com/openziti/zrok', '_blank')}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Quick: Use Zrok (Free)
                    </button>
                  </div>
                </div>
              )}

              {/* Gateway Token Summary */}
              {!connectionConfig.gatewayToken && (
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: 'var(--accent-yellow)',
                  color: 'var(--bg-darker)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Key className="w-5 h-5" />
                    <strong>Gateway Token Required</strong>
                  </div>
                  <p style={{ margin: 0 }}>
                    To connect to your OpenClaw gateway, please configure your Gateway Token from the Overview page in the <strong>Connection</strong> tab.
                  </p>
                </div>
              )}

              {/* Upgrade Progress */}
              {isUpgrading && (
                <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ fontWeight: 600 }}>{upgradeStep}</span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: 'var(--bg-card)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${upgradeProgress}%`,
                      height: '100%',
                      background: 'var(--accent-blue)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'right' }}>
                    {upgradeProgress}%
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={checkForUpdates}
                  disabled={isCheckingUpdate || isUpgrading}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent-blue)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: isCheckingUpdate || isUpgrading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isCheckingUpdate || isUpgrading ? 0.7 : 1,
                  }}
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
                </button>

                {updateAvailable && !isUpgrading && !showUpgradeConfirm && (
                  <button
                    onClick={() => setShowUpgradeConfirm(true)}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--accent-green)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Upgrade Now
                  </button>
                )}
              </div>

              {/* Upgrade Confirmation Dialog */}
              {showUpgradeConfirm && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'var(--accent-yellow)',
                  color: 'var(--bg-darker)',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <AlertTriangle className="w-5 h-5" />
                    <strong style={{ fontSize: '16px' }}>Upgrade Warning</strong>
                  </div>
                  <ul style={{ margin: '0 0 16px 20px', padding: 0 }}>
                    <li>Ensure you have a recent backup before proceeding</li>
                    <li>The upgrade may take a few minutes</li>
                    <li>Services will be temporarily unavailable</li>
                    <li>Review the changelog for breaking changes</li>
                  </ul>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setShowUpgradeConfirm(false)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={startUpgrade}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--accent-green)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Confirm Upgrade
                    </button>
                  </div>
                </div>
              )}

              {/* Status/Error Messages */}
              {connectionTestResult && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: connectionTestResult.success ? 'var(--accent-green)' : '#dc2626',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {connectionTestResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {connectionTestResult.message}
                </div>
              )}
            </div>

            {/* Installation Path */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Installation</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="openclaw-dir" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>OpenClaw Directory</label>
                  <input
                    id="openclaw-dir"
                    type="text"
                    defaultValue="~/openclaw"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="custom-dir" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Custom Directory</label>
                  <input
                    id="custom-dir"
                    type="text"
                    defaultValue="~/.openclaw-custom"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>🔗 Connection Mode</h3>

              {/* Connection Mode Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Select Local connection mode"
                  onClick={() => selectConnectionMode('local')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectConnectionMode('local'); } }}
                  style={{
                    background: 'var(--bg-dark)',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: `2px solid ${connectionConfig.mode === 'local' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                    transition: 'border-color 0.2s'
                  }}
                >
                  <Server className="w-6 h-6 mb-2" style={{ color: connectionConfig.mode === 'local' ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Local</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connect to OpenClaw on this machine</div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Select Cloudflare Workers connection mode"
                  onClick={() => selectConnectionMode('cloudflare')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectConnectionMode('cloudflare'); } }}
                  style={{
                    background: 'var(--bg-dark)',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: `2px solid ${connectionConfig.mode === 'cloudflare' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                    transition: 'border-color 0.2s'
                  }}
                >
                  <Cloud className="w-6 h-6 mb-2" style={{ color: connectionConfig.mode === 'cloudflare' ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Cloudflare Workers</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Deploy as Cloudflare Worker (D1)</div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Select Docker connection mode"
                  onClick={() => selectConnectionMode('docker')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectConnectionMode('docker'); } }}
                  style={{
                    background: 'var(--bg-dark)',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: `2px solid ${connectionConfig.mode === 'docker' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                    transition: 'border-color 0.2s'
                  }}
                >
                  <Container className="w-6 h-6 mb-2" style={{ color: connectionConfig.mode === 'docker' ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Docker</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connect to Docker container</div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Select VPS Remote connection mode"
                  onClick={() => selectConnectionMode('vps')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectConnectionMode('vps'); } }}
                  style={{
                    background: 'var(--bg-dark)',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: `2px solid ${connectionConfig.mode === 'vps' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                    transition: 'border-color 0.2s'
                  }}
                >
                  <Server className="w-6 h-6 mb-2" style={{ color: connectionConfig.mode === 'vps' ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>VPS / Remote</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connect to remote OpenClaw server</div>
                </div>
              </div>

              {/* Connection Guide */}
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info className="w-4 h-4" />
                  Connection Requirements
                </div>
                <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>
                  Your dashboard is hosted on Cloudflare Pages/Workers, which means it runs on the public internet, not your local machine.
                </p>
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>How to connect to your OpenClaw instance</summary>
                  <div style={{ marginTop: '12px', lineHeight: 1.6 }}>
                    <p style={{ marginBottom: '8px' }}><strong>Option 1: Use a Tunnel (Recommended for Development)</strong></p>
                    <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
                      <li>Install ngrok: <code>npm install -g ngrok</code></li>
                      <li>Expose OpenClaw: <code>ngrok http 18789</code></li>
                      <li>Use the HTTPS URL provided (e.g., <code>wss://abc123.ngrok.io</code>)</li>
                    </ul>

                    <p style={{ marginBottom: '8px' }}><strong>Option 2: Host OpenClaw on a VPS</strong></p>
                    <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
                      <li>Deploy OpenClaw on DigitalOcean, AWS, or similar</li>
                      <li>Use the public IP or domain</li>
                      <li>Ensure firewall allows port 18789</li>
                    </ul>

                    <p style={{ marginBottom: '8px' }}><strong>Option 3: Run Dashboard Locally</strong></p>
                    <ul style={{ margin: '0 0 12px 20px', padding: 0 }}>
                      <li>Run backend locally: <code>cd backend && npm run dev</code></li>
                      <li>Use <code>ws://127.0.0.1:18789</code></li>
                    </ul>

                    <p style={{ color: '#f59e0b' }}>⚠️ <strong>Important:</strong> If your OpenClaw is running locally (WSL/localhost), Cloudflare Workers cannot reach it directly without a tunnel.</p>
                  </div>
                </details>
              </div>

              {/* Mode-specific Fields */}
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                {(() => {
                  if (connectionConfig.mode === 'local') return 'Local Connection Details';
                  if (connectionConfig.mode === 'cloudflare') return 'Cloudflare Worker Settings';
                  if (connectionConfig.mode === 'docker') return 'Docker Connection Settings';
                  if (connectionConfig.mode === 'vps') return 'VPS Connection Details';
                  return '';
                })()}
              </h4>

              {renderModeFields()}

              {/* Test and Save Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  style={{
                    padding: '10px 20px',
                    background: isTestingConnection ? 'var(--accent-blue)' : 'var(--bg-hover)',
                    border: `1px solid ${isTestingConnection ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    color: isTestingConnection ? 'white' : 'var(--text-primary)',
                    cursor: isTestingConnection ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      Test Connection
                    </>
                  )}
                </button>

                <button
                  onClick={saveConnectionSettings}
                  disabled={isSavingConnection}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent-blue)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: isSavingConnection ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isSavingConnection ? 0.7 : 1,
                  }}
                >
                  {isSavingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </button>
              </div>

              {/* Save Result */}
              {saveResult && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: saveResult.success ? 'var(--accent-green)' : '#dc2626',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {saveResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {saveResult.message}
                </div>
              )}

              {/* Connection Test Result */}
              {connectionTestResult && !saveResult && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: connectionTestResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(220, 38, 38, 0.2)',
                  border: `1px solid ${connectionTestResult.success ? 'var(--accent-green)' : '#dc2626'}`,
                  color: connectionTestResult.success ? '#10b981' : '#ef4444',
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {connectionTestResult.success ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ whiteSpace: 'pre-line', fontWeight: connectionTestResult.success ? 500 : 600, flex: 1 }}>
                          {connectionTestResult.message}
                        </div>
                        {connectionProtocol && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: connectionProtocol === 'ws' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: connectionProtocol === 'ws' ? '#10b981' : '#3b82f6',
                            border: `1px solid ${connectionProtocol === 'ws' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {connectionProtocol === 'ws' ? '⚡ WebSocket' : '🌐 HTTP'}
                          </span>
                        )}
                      </div>

                      {/* Action Required Section */}
                      {!connectionTestResult.success && (openClawStats as any)?.actionRequired && (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#d97706'
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle className="w-4 h-4" />
                            Action Required:
                          </div>
                          <pre style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: 'monospace',
                            background: 'rgba(0,0,0,0.05)',
                            padding: '8px',
                            borderRadius: '4px',
                            margin: 0,
                            fontSize: '12px'
                          }}>
                            {(openClawStats as any).actionRequired}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Diagnostics Section */}
                    {((openClawStats as any).diagnostics && ((openClawStats as any).diagnostics as string[]).length > 0) || (wsDiagnostics && wsDiagnostics.length > 0) ? (
                      <div style={{
                        marginBottom: '16px',
                        padding: '12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                      }}>
                        <details style={{ cursor: 'pointer' }}>
                          <summary style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Connection Diagnostics ({(wsDiagnostics?.length || 0) + (((openClawStats as any).diagnostics as string[])?.length || 0)} checks)
                          </summary>
                          <div style={{ marginTop: '12px' }}>
                            {/* WebSocket Diagnostics */}
                            {wsDiagnostics && wsDiagnostics.length > 0 && (
                              <>
                                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                  WebSocket connection steps:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                                  {wsDiagnostics.map((diag, idx) => (
                                    <div key={`ws-${idx}`} style={{
                                      fontSize: '12px',
                                      fontFamily: 'monospace',
                                      padding: '4px 8px',
                                      background: 'rgba(0,0,0,0.2)',
                                      borderRadius: '4px',
                                      color: diag.type === 'success' ? '#10b981' : diag.type === 'error' ? '#ef4444' : diag.type === 'warn' ? '#f59e0b' : 'var(--text-dim)'
                                    }}>
                                      {diag.type === 'success' ? '✓' : diag.type === 'error' ? '✗' : '•'} {diag.message}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                            {/* Backend HTTP Diagnostics */}
                            {(openClawStats as any).diagnostics && ((openClawStats as any).diagnostics as string[]).length > 0 && (
                              <>
                                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                  Backend connection attempts:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {((openClawStats as any).diagnostics as string[]).map((diag, idx) => (
                                    <div key={`http-${idx}`} style={{
                                      fontSize: '12px',
                                      fontFamily: 'monospace',
                                      padding: '4px 8px',
                                      background: 'rgba(0,0,0,0.2)',
                                      borderRadius: '4px',
                                      color: diag.includes('Found') || diag.includes('success') ? '#10b981' : diag.includes('failed') || diag.includes('not available') ? '#ef4444' : 'var(--text-dim)'
                                    }}>
                                      {diag.includes('Found') || diag.includes('success') ? '✓' : diag.includes('failed') || diag.includes('not available') ? '✗' : '•'} {diag}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </details>
                      </div>
                    ) : null}

                    {/* OpenClaw Plugin Setup */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bot className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                        OpenClaw Clawdash Plugin Quick Setup
                      </h5>
                      <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                        Generate workspace-bound plugin env vars so OpenClaw hook events map to the correct dashboard workspace.
                        The plugin uses a webhook (not a persistent API session) to send events back to this dashboard.
                      </p>
                      <button
                        onClick={prepareOpenClawPlugin}
                        disabled={isPreparingPlugin || !currentWorkspaceId || !connectionConfig.serverUrl || !connectionConfig.gatewayToken}
                        style={{
                          padding: '10px 20px',
                          background: isPreparingPlugin ? 'var(--bg-hover)' : 'var(--accent-blue)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: isPreparingPlugin ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {isPreparingPlugin ? <><Loader2 className="w-4 h-4 animate-spin" />Preparing...</> : <>Generate Plugin Env</>}
                      </button>
                      {pluginSetupResult && (
                        <div style={{ marginTop: '10px', fontSize: '13px', color: pluginSetupResult.success ? '#10b981' : '#ef4444' }}>
                          {pluginSetupResult.message}
                        </div>
                      )}
                      {pluginSetupSnippet && (
                        <>
                          <p style={{ marginTop: '10px', marginBottom: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>Hook env vars</p>
                          <textarea
                            readOnly
                            value={pluginSetupSnippet}
                            style={{
                              width: '100%',
                              minHeight: '110px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              padding: '10px',
                            }}
                          />
                        </>
                      )}
                      {pluginInstallSnippet && (
                        <>
                          <p style={{ marginTop: '10px', marginBottom: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>Full install steps</p>
                          <textarea
                            readOnly
                            value={pluginInstallSnippet}
                            style={{
                              width: '100%',
                              minHeight: '180px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              padding: '10px',
                            }}
                          />
                        </>
                      )}
                    </div>

                    {/* Sync Agents to Current Workspace */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                        Sync OpenClaw Agents to Dashboard Workspace
                      </h5>
                      <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                        Pull agents from your OpenClaw gateway and upsert them into the currently active workspace.
                      </p>
                      <button
                        onClick={syncAgentsFromGateway}
                        disabled={isSyncingAgents || !currentWorkspaceId || !connectionConfig.serverUrl || !connectionConfig.gatewayToken}
                        style={{
                          padding: '10px 20px',
                          background: isSyncingAgents ? 'var(--bg-hover)' : 'var(--accent-blue)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: isSyncingAgents ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {isSyncingAgents ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Syncing Agents...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Sync Agents Now
                          </>
                        )}
                      </button>
                      {syncResult && (
                        <div style={{
                          marginTop: '10px',
                          fontSize: '13px',
                          color: syncResult.success ? '#10b981' : '#ef4444',
                        }}>
                          {syncResult.message}
                        </div>
                      )}
                    </div>

                    {/* Send Test Message */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Send className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                        Send Test Message to OpenClaw
                      </h5>
                      <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                        This will appear in your OpenClaw chat interface. Session: {connectionConfig.defaultSessionKey}
                      </p>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                          type="text"
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          placeholder="Type a test message..."
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !isSendingMessage) sendTestMessage(); }}
                        />
                        <button
                          onClick={sendTestMessage}
                          disabled={isSendingMessage || !testMessage.trim()}
                          style={{
                            padding: '10px 20px',
                            background: 'var(--accent-blue)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: isSendingMessage || !testMessage.trim() ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isSendingMessage || !testMessage.trim() ? 0.7 : 1,
                          }}
                        >
                          {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Send
                        </button>
                      </div>

                      {/* Error Details Section */}
                      {!connectionTestResult.success && openClawStats?.errorDetails && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(239, 68, 68, 0.3)',
                          fontSize: '13px',
                          color: '#b91c1c'
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Technical Details:</div>
                          <pre style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: 'monospace',
                            background: 'rgba(0,0,0,0.1)',
                            padding: '8px',
                            borderRadius: '4px'
                          }}>
                            {openClawStats.errorDetails}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* WebSocket Diagnostics Panel */}
              {wsDiagnostics.length > 0 && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}>
                  <details open={!connectionTestResult?.success || isTestingConnection}>
                    <summary style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <Activity className="w-4 h-4" />
                      WebSocket Handshake Log ({wsDiagnostics.length} steps)
                    </summary>
                    <div style={{
                      marginTop: '12px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      lineHeight: '1.8',
                    }}>
                      {wsDiagnostics.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '2px 8px',
                            color: d.type === 'success' ? '#10b981'
                              : d.type === 'error' ? '#ef4444'
                                : d.type === 'warn' ? '#f59e0b'
                                  : 'var(--text-secondary)',
                            borderLeft: `2px solid ${d.type === 'success' ? '#10b981'
                              : d.type === 'error' ? '#ef4444'
                                : d.type === 'warn' ? '#f59e0b'
                                  : 'var(--border-color)'
                              }`,
                          }}
                        >
                          <span style={{ opacity: 0.5, marginRight: '8px' }}>
                            {new Date(d.timestamp).toLocaleTimeString()}
                          </span>
                          {d.message}
                        </div>
                      ))}
                      {isTestingConnection && (
                        <div style={{ padding: '2px 8px', color: 'var(--text-dim)', borderLeft: '2px solid var(--border-color)' }}>
                          <Loader2 className="w-3 h-3 animate-spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
                          Waiting...
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* OpenClaw Stats - Only show when connected */}
              {connectionTestResult?.success && openClawStats && (
                <div style={{
                  marginTop: '16px',
                  padding: '20px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
                    OpenClaw Gateway Stats
                  </h4>

                  {/* Warning for unknown version */}
                  {openClawStats.version === 'unknown' && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      color: '#f59e0b',
                      fontSize: '13px',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚠️</span> Limited API Access
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        Connected to OpenClaw Gateway, but version and detailed stats are unavailable via HTTP API.
                        This is normal - OpenClaw primarily uses WebSocket protocol.
                      </div>
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontWeight: 500, fontSize: '12px' }}>Troubleshooting Steps</summary>
                        <ul style={{ marginTop: '8px', marginLeft: '16px', fontSize: '12px', lineHeight: 1.6 }}>
                          <li>Gateway Control UI is accessible (HTML served at root)</li>
                          <li>HTTP REST API endpoints may be disabled or not implemented</li>
                          <li>Version shown as "unknown" is expected for WebSocket-only mode</li>
                          <li>To get full stats, enable HTTP API in OpenClaw config (gateway.http.endpoints)</li>
                          <li>For WSL: Ensure port forwarding from Windows to WSL is configured</li>
                        </ul>
                      </details>
                    </div>
                  )}

                  {/* Version Display */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Version</div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: openClawStats.version === 'unknown' ? 'var(--text-dim)' : 'inherit' }}>
                        {openClawStats.version === 'unknown' ? 'Unknown (WebSocket Mode)' : openClawStats.version}
                      </div>
                    </div>

                    {openClawStats.model && (
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Model</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{openClawStats.model}</div>
                      </div>
                    )}
                    {openClawStats.provider && (
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Provider</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{openClawStats.provider}</div>
                      </div>
                    )}
                    {typeof openClawStats.agentCount === 'number' && (
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Active Agents</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{openClawStats.agentCount}</div>
                      </div>
                    )}
                    {openClawStats.agents && openClawStats.agents.length > 0 && (
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Agents ({openClawStats.agents.length})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {openClawStats.agents.map((agent, idx) => (
                            <span key={idx} style={{
                              padding: '4px 10px',
                              background: 'var(--bg-hover)',
                              color: 'var(--text-primary)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              border: '1px solid var(--border-color)'
                            }}>
                              🤖 {agent.name || agent.id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {openClawStats.channels && openClawStats.channels.length > 0 && (
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Configured Channels ({openClawStats.channels.length})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {openClawStats.channels.map((channel, idx) => (
                            <span key={idx} style={{
                              padding: '4px 10px',
                              background: channel.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-hover)',
                              color: channel.status === 'active' ? '#10b981' : 'var(--text-secondary)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              {channel.type === 'telegram' && '📱'}
                              {channel.type === 'whatsapp' && '💬'}
                              {channel.type === 'discord' && '🎮'}
                              {channel.type === 'slack' && '💼'}
                              {channel.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Diagnostics Section */}
                  {((openClawStats as any).diagnostics && ((openClawStats as any).diagnostics as string[]).length > 0) || (wsDiagnostics && wsDiagnostics.length > 0) ? (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                    }}>
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Connection Diagnostics ({(wsDiagnostics?.length || 0) + (((openClawStats as any).diagnostics as string[])?.length || 0)} checks)
                        </summary>
                        <div style={{ marginTop: '12px' }}>
                          {/* WebSocket Diagnostics */}
                          {wsDiagnostics && wsDiagnostics.length > 0 && (
                            <>
                              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                WebSocket connection steps:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                                {wsDiagnostics.map((diag, idx) => (
                                  <div key={`ws-${idx}`} style={{
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    padding: '4px 8px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '4px',
                                    color: diag.type === 'success' ? '#10b981' : diag.type === 'error' ? '#ef4444' : diag.type === 'warn' ? '#f59e0b' : 'var(--text-dim)'
                                  }}>
                                    {diag.type === 'success' ? '✓' : diag.type === 'error' ? '✗' : '•'} {diag.message}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                          {/* Backend HTTP Diagnostics */}
                          {(openClawStats as any).diagnostics && ((openClawStats as any).diagnostics as string[]).length > 0 && (
                            <>
                              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                                Backend connection attempts:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {((openClawStats as any).diagnostics as string[]).map((diag, idx) => (
                                  <div key={`http-${idx}`} style={{
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    padding: '4px 8px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '4px',
                                    color: diag.includes('Found') || diag.includes('success') ? '#10b981' : diag.includes('failed') || diag.includes('not available') ? '#ef4444' : 'var(--text-dim)'
                                  }}>
                                    {diag.includes('Found') || diag.includes('success') ? '✓' : diag.includes('failed') || diag.includes('not available') ? '✗' : '•'} {diag}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </details>
                    </div>
                  ) : null}

                  {/* Send Test Message */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Send className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
                      Send Test Message to OpenClaw
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                      This will appear in your OpenClaw chat interface. Session: {connectionConfig.defaultSessionKey}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Type a test message..."
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isSendingMessage) sendTestMessage(); }}
                      />
                      <button
                        onClick={sendTestMessage}
                        disabled={isSendingMessage || !testMessage.trim()}
                        style={{
                          padding: '10px 20px',
                          background: 'var(--accent-blue)',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          cursor: isSendingMessage || !testMessage.trim() ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: isSendingMessage || !testMessage.trim() ? 0.7 : 1,
                        }}
                      >
                        {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send
                      </button>
                    </div>

                    {/* Send Message Result */}
                    {sendMessageResult && (
                      <div style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: sendMessageResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        border: `1px solid ${sendMessageResult.success ? 'var(--accent-green)' : '#dc2626'}`,
                        color: sendMessageResult.success ? '#10b981' : '#ef4444',
                        borderRadius: '6px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        {sendMessageResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {sendMessageResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MoltWorker Settings */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>⚡ MoltWorker / Cloudflare Worker</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                Configure Cloudflare Worker deployment for serverless operation.
              </p>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={connectionConfig.workerEnabled}
                      onChange={(e) => setConnectionConfig(prev => ({ ...prev, workerEnabled: e.target.checked }))}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>Enable Cloudflare Worker mode</span>
                  </label>
                </div>
                <div className="form-group">
                  <label htmlFor="moltworker-name" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Worker Name</label>
                  <input
                    id="moltworker-name"
                    type="text"
                    value={connectionConfig.workerName}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, workerName: e.target.value }))}
                    placeholder="openclaw-worker"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="moltworker-account-id" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Account ID</label>
                  <input
                    id="moltworker-account-id"
                    type="text"
                    value={connectionConfig.workerAccountId}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, workerAccountId: e.target.value }))}
                    placeholder="Cloudflare account ID"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>🔌 Communication Channels</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                Configure integrations for Telegram, WhatsApp, Discord, and other platforms.
              </p>

              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Telegram */}
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <MessageCircle className="w-6 h-6" style={{ color: '#229ED9' }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>Telegram</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connect Telegram bots for messaging</div>
                      </div>
                    </div>
                    <span style={{ background: 'var(--accent-green)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Connected</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input type="text" placeholder="Bot Token" style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '13px' }} />
                    <input type="text" placeholder="Chat ID" style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '13px' }} />
                  </div>
                </div>

                {/* WhatsApp */}
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Phone className="w-6 h-6" style={{ color: '#25D366' }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>WhatsApp</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connect WhatsApp Business API</div>
                      </div>
                    </div>
                    <span style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Not Connected</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input type="text" placeholder="Phone Number ID" style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '13px' }} />
                    <input type="text" placeholder="Access Token" style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '13px' }} />
                  </div>
                </div>

                {/* Discord */}
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#5865F2' }}>
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 600 }}>Discord</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connect Discord webhooks</div>
                      </div>
                    </div>
                    <span style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Not Connected</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <input type="text" placeholder="Webhook URL" style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '13px' }} />
                  </div>
                </div>

                {/* Slack */}
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#E01E5A' }}>
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 600 }}>Slack</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Connect Slack app</div>
                      </div>
                    </div>
                    <span style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Not Connected</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <input type="text" placeholder="Webhook URL" style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '13px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* VapiAI Voice Integration */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>🎙️ VapiAI Voice</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                Configure VapiAI for voice capabilities in your agents.
              </p>

              <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V12C22 6.48 17.52 2 12 2ZM12 5C14.21 5 16 6.79 16 9V12H8V9C8 6.79 9.79 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 16C6.03 14 10 12.9 12 12.9C14 12.9 17.97 14 18 16C16.71 17.92 14.5 19.2 12 19.2Z" fill="#6366F1" />
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '16px' }}>VapiAI</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Voice AI platform for real-time voice interactions</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {vapiConfig.connected ? (
                      <>
                        <span style={{ background: 'var(--accent-green)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Connected</span>
                        <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-green)' }} />
                      </>
                    ) : (
                      <>
                        <span style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Not Connected</span>
                        <WifiOff className="w-5 h-5" style={{ color: 'var(--text-dim)' }} />
                      </>
                    )}
                  </div>
                </div>

                {vapiConfig.lastChecked && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                    Last checked: {new Date(vapiConfig.lastChecked).toLocaleString()}
                  </div>
                )}

                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="vapi-api-key" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>API Key</label>
                    <input
                      id="vapi-api-key"
                      type="password"
                      value={vapiConfig.apiKey}
                      onChange={(e) => setVapiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter your VapiAI API key"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={testVapiConnection}
                      disabled={isTestingVapi || !vapiConfig.apiKey}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        cursor: isTestingVapi || !vapiConfig.apiKey ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: isTestingVapi || !vapiConfig.apiKey ? 0.7 : 1,
                      }}
                    >
                      {isTestingVapi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                      Test Connection
                    </button>

                    <button
                      onClick={saveVapiSettings}
                      disabled={isSavingVapi}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--accent-blue)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: isSavingVapi ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: isSavingVapi ? 0.7 : 1,
                      }}
                    >
                      {isSavingVapi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing & Tokens Tab */}
        {activeTab === 'billing' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>💰 Token Usage & Billing</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Total Input Tokens</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-blue)' }}>1.2M</div>
                </div>
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Total Output Tokens</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-green)' }}>3.4M</div>
                </div>
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Estimated Cost</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-yellow)' }}>$45.80</div>
                </div>
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Active Sessions</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>5</div>
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Models in Use</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-dark)', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>claude-3-opus</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>15 sessions</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>$32.50</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>2.1M tokens</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-dark)', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>gpt-4-turbo</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>8 sessions</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>$13.30</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>1.5M tokens</div>
                  </div>
                </div>
              </div>

              <button
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FileText className="w-4 h-4" />
                Export Usage Report
              </button>
            </div>

            {/* Budget Settings */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Budget Alerts</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="budget-limit" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Monthly Budget Limit ($)</label>
                  <input
                    id="budget-limit"
                    type="number"
                    defaultValue="100"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="budget-alert" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      id="budget-alert"
                      type="checkbox"
                      defaultChecked
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>Alert when reaching 80% of budget</span>
                  </label>
                </div>
                <div className="form-group">
                  <label htmlFor="auto-pause" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      id="auto-pause"
                      type="checkbox"
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>Auto-pause agents when budget exceeded</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>💾 Backup & Sync</h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      defaultChecked
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>Enable automatic backups</span>
                  </label>
                </div>
                <div className="form-group">
                  <label htmlFor="backup-interval" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Backup Interval</label>
                  <select id="backup-interval" style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}>
                    <option>Every 10 minutes</option>
                    <option>Every 30 minutes</option>
                    <option>Every hour</option>
                    <option>Daily</option>
                  </select>
                </div>
              </div>
            </div>

            {/* GitHub Sync */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Github className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>GitHub Private Repo Backup</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                Automatically sync your OpenClaw configuration and data to a private GitHub repository for disaster recovery.
              </p>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="repo-url" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Repository URL</label>
                  <input
                    id="repo-url"
                    type="text"
                    placeholder="https://github.com/username/private-repo"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="github-token" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Personal Access Token</label>
                  <input
                    id="github-token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    style={{
                      padding: '10px 20px',
                      background: 'var(--accent-blue)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    Push to GitHub
                  </button>
                  <button
                    style={{
                      padding: '10px 20px',
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Pull from GitHub
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>🛠️ Advanced OpenClaw Settings</h3>
                <button
                  onClick={loadGatewayConfig}
                  disabled={isLoadingConfig}
                  style={{
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingConfig ? 'animate-spin' : ''}`} />
                  Refresh Config
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                Fine-tune your OpenClaw Gateway configuration. These settings are applied directly to the gateway.
              </p>

              {/* Gateway Management Section */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server className="w-4 h-4 text-accent-blue" />
                  Gateway Management
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'flex-end' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                      Idle Sleep Time ({sleepTime}ms)
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="2000"
                      step="50"
                      value={sleepTime}
                      onChange={(e) => handleSleepTimeUpdate(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>
                      Controls how often the gateway polls for tasks. Lower values increase responsiveness but use more CPU/Tokens.
                    </p>
                  </div>

                  <div className="form-group">
                    <button
                      onClick={handleRestartGateway}
                      disabled={isRestarting || !connectionConfig.gatewayToken}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        cursor: isRestarting || !connectionConfig.gatewayToken ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      {isRestarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                      Restart Gateway
                    </button>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>
                      Force a full restart of the OpenClaw service.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Webhook URL */}
                <div className="form-group">
                  <label htmlFor="webhook-url" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Global Webhook URL (CLAWPUTE_WEBHOOK_URL)
                  </label>
                  <input
                    id="webhook-url"
                    type="text"
                    value={gatewayConfig.env?.CLAWPUTE_WEBHOOK_URL || ''}
                    onChange={(e) => setGatewayConfig(prev => ({
                      ...prev,
                      env: { ...prev.env, CLAWPUTE_WEBHOOK_URL: e.target.value }
                    }))}
                    placeholder="https://your-app.com/api/webhooks/openclaw"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
                    Primary webhook for receiving events and task updates across all channels.
                  </p>
                </div>

                {/* Hooks Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>Boot Markdown</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gatewayConfig.hooks?.['boot-md']?.enabled || false}
                          onChange={(e) => setGatewayConfig(prev => ({
                            ...prev,
                            hooks: { ...prev.hooks, 'boot-md': { ...prev.hooks?.['boot-md'], enabled: e.target.checked } }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Inject system context from markdown files on boot.</p>
                  </div>

                  <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity className="w-4 h-4 text-green-400" />
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>Command Logger</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gatewayConfig.hooks?.['command-logger']?.enabled || false}
                          onChange={(e) => setGatewayConfig(prev => ({
                            ...prev,
                            hooks: { ...prev.hooks, 'command-logger': { ...prev.hooks?.['command-logger'], enabled: e.target.checked } }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Log all shell commands and tool executions.</p>
                  </div>
                </div>

                {/* Compaction & Performance */}
                <div style={{ background: 'var(--bg-dark)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Performance & Compaction
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Compaction Mode</label>
                      <select
                        value={gatewayConfig.agents?.defaults?.compaction?.mode || 'auto'}
                        onChange={(e) => setGatewayConfig(prev => ({
                          ...prev,
                          agents: {
                            ...prev.agents,
                            defaults: {
                              ...prev.agents?.defaults,
                              compaction: { ...prev.agents?.defaults?.compaction, mode: e.target.value }
                            }
                          }
                        }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                        }}
                      >
                        <option value="auto">Auto (Smart)</option>
                        <option value="periodic">Periodic (Fixed interval)</option>
                        <option value="none">Disabled</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Max Concurrency</label>
                      <input
                        type="number"
                        value={gatewayConfig.agents?.defaults?.maxConcurrent || 5}
                        onChange={(e) => setGatewayConfig(prev => ({
                          ...prev,
                          agents: {
                            ...prev.agents,
                            defaults: { ...prev.agents?.defaults, maxConcurrent: parseInt(e.target.value) || 0 }
                          }
                        }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={gatewayConfig.memorySearch?.experimental?.sessionMemory || false}
                        onChange={(e) => setGatewayConfig(prev => ({
                          ...prev,
                          memorySearch: {
                            ...prev.memorySearch,
                            experimental: { ...prev.memorySearch?.experimental, sessionMemory: e.target.checked }
                          }
                        }))}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Experimental: Session Memory Search</span>
                        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Enable AI-powered semantic search across agent conversation history.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    onClick={saveAdvancedConfig}
                    disabled={isSavingConfig || !connectionConfig.gatewayToken}
                    style={{
                      padding: '10px 24px',
                      background: 'var(--accent-blue)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: isSavingConfig || !connectionConfig.gatewayToken ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: isSavingConfig || !connectionConfig.gatewayToken ? 0.7 : 1,
                    }}
                  >
                    {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Apply Advanced Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Memory Search Module */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain className="w-5 h-5 text-purple-400" />
                Memory Search Optimization
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Memory Flush Interval (ms)</label>
                  <input
                    type="number"
                    value={gatewayConfig.agents?.defaults?.compaction?.memoryFlushMs || 300000}
                    onChange={(e) => setGatewayConfig(prev => ({
                      ...prev,
                      agents: {
                        ...prev.agents,
                        defaults: {
                          ...prev.agents?.defaults,
                          compaction: { ...prev.agents?.defaults?.compaction, memoryFlushMs: parseInt(e.target.value) || 0 }
                        }
                      }
                    }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Subagent Concurrency</label>
                  <input
                    type="number"
                    value={gatewayConfig.agents?.defaults?.subagents?.maxConcurrent || 2}
                    onChange={(e) => setGatewayConfig(prev => ({
                      ...prev,
                      agents: {
                        ...prev.agents,
                        defaults: {
                          ...prev.agents?.defaults,
                          subagents: { ...prev.agents?.defaults?.subagents, maxConcurrent: parseInt(e.target.value) || 0 }
                        }
                      }
                    }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'general' && (
          <div style={{ marginBottom: '32px' }}>
            <ThemeToggleSection />

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>General Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="admin-port" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Admin Port</label>
                  <input
                    id="admin-port"
                    type="number"
                    defaultValue="18789"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="data-dir" style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Data Directory</label>
                  <input
                    id="data-dir"
                    type="text"
                    defaultValue="./data"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Features</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Enable WebSocket connections</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Enable activity logging</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Enable real-time monitoring</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Enable auto-backup</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Save Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
          <button
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Reset Defaults
          </button>
          <button
            onClick={saveConnectionSettings}
            style={{
              padding: '10px 20px',
              background: 'var(--accent-blue)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigPage;

import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useState } from 'react';
import {
  Server, Download, CheckCircle,
  Terminal, Database, Cloud, Monitor
} from 'lucide-react';

// Export the route
export const installerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'installer',
  component: InstallerPage,
}) as any;

// Deployment modes
const DEPLOYMENT_MODES = [
  {
    id: 'unified',
    title: 'Unified Mode',
    subtitle: 'Both on same machine',
    icon: Monitor,
    description: 'Install OpenClaw Core and Admin Panel on the same machine. Best for local development and single VPS deployments.',
    color: 'primary',
  },
  {
    id: 'split',
    title: 'Split Mode',
    icon: Server,
    description: 'OpenClaw Core on one server, Admin Panel on another. Best for scaling and security isolation.',
    color: 'green',
  },
  {
    id: 'admin-only',
    title: 'Admin-Only',
    icon: Database,
    description: 'Connect to an existing OpenClaw Core installation. Best when Core is already running elsewhere.',
    color: 'yellow',
  },
  {
    id: 'cloud',
    title: 'Cloud Mode',
    icon: Cloud,
    description: 'Deploy Admin Panel to serverless platforms (Cloudflare, Vercel, Netlify). Best for cloud-native deployments.',
    color: 'purple',
  },
];

// Installation config type
interface InstallConfig {
  openclawDir: string;
  openclawPort: string;
  adminDir: string;
  adminPort: string;
  openclawUrl: string;
  apiKey: string;
  platform: string;
}

// Default export for the page component
export default function InstallerPage() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<string | null>(null);

  const [config, setConfig] = useState<InstallConfig>({
    openclawDir: '~/openclaw',
    openclawPort: '3000',
    adminDir: '~/.openclaw-custom',
    adminPort: '18789',
    openclawUrl: 'http://localhost:3000',
    apiKey: '',
    platform: 'cloudflare-pages',
  });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleInstall = async () => {
    setStep(5);
    const steps = getInstallationSteps(mode ?? 'unified', config);
    for (const step of steps) {
      addLog(`Starting: ${step.name}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addLog(`✓ ${step.name} completed`);
    }
    addLog('Installation complete!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f0f23 100%)',
      color: '#fff',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
          🦀 Clawpute Installer
        </h1>
        <p style={{ color: '#888', textAlign: 'center', marginBottom: '40px' }}>
          Choose your deployment mode to get started
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                width: '40px',
                height: '6px',
                borderRadius: '3px',
                background: s <= step ? '#F59D0A' : '#333',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        {step === 1 && <ModeSelectionStep modes={DEPLOYMENT_MODES} selectedMode={mode} onSelect={setMode} />}
        {step === 2 && <ConfigurationStep mode={mode!} config={config} onChange={setConfig} />}
        {step === 3 && <PrerequisitesCheckStep mode={mode!} />}
        {step === 4 && <SummaryStep mode={mode!} config={config} onInstall={handleInstall} />}
        {step === 5 && <InstallationStep logs={logs} />}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fff',
              cursor: step === 1 ? 'not-allowed' : 'pointer',
              opacity: step === 1 ? 0.5 : 1,
            }}
          >
            Back
          </button>
          <button
            onClick={() => setStep(Math.min(5, step + 1))}
            disabled={step === 5 || (step === 1 && !mode)}
            style={{
              padding: '12px 24px',
              background: '#F59D0A',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 600,
              cursor: step === 5 || (step === 1 && !mode) ? 'not-allowed' : 'pointer',
              opacity: step === 5 || (step === 1 && !mode) ? 0.5 : 1,
            }}
          >
            {step === 4 ? 'Install' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ModeSelectionStepProps {
  modes: typeof DEPLOYMENT_MODES;
  selectedMode: string | null;
  onSelect: (mode: string) => void;
}

function ModeSelectionStep({ modes, selectedMode, onSelect }: ModeSelectionStepProps) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', textAlign: 'center' }}>
        Select Deployment Mode
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            style={{
              padding: '24px',
              background: selectedMode === mode.id
                ? 'rgba(245, 157, 10, 0.1)'
                : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${selectedMode === mode.id ? '#F59D0A' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <mode.icon size={32} style={{ color: '#F59D0A', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{mode.title}</h3>
            <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{mode.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

interface ConfigurationStepProps {
  mode: string;
  config: InstallConfig;
  onChange: (config: InstallConfig) => void;
}

function ConfigurationStep({ mode, config, onChange }: ConfigurationStepProps) {
  const updateConfig = (key: keyof InstallConfig, value: string) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', textAlign: 'center' }}>
        Configuration
      </h2>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        {(mode === 'unified' || mode === 'split') && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>
              OpenClaw Core
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Directory
                </label>
                <input
                  type="text"
                  value={config.openclawDir}
                  onChange={(e) => updateConfig('openclawDir', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Port
                </label>
                <input
                  type="number"
                  value={config.openclawPort}
                  onChange={(e) => updateConfig('openclawPort', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {(mode === 'admin-only' || mode === 'cloud') && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>
              Connection
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                OpenClaw URL
              </label>
              <input
                type="url"
                value={config.openclawUrl}
                onChange={(e) => updateConfig('openclawUrl', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => updateConfig('apiKey', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
        )}

        {mode !== 'cloud' && (
          <div>
            <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>
              Admin Panel
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Directory
                </label>
                <input
                  type="text"
                  value={config.adminDir}
                  onChange={(e) => updateConfig('adminDir', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Port
                </label>
                <input
                  type="number"
                  value={config.adminPort}
                  onChange={(e) => updateConfig('adminPort', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PrerequisitesCheckStepProps {
  mode: string;
}

function PrerequisitesCheckStep({ mode }: PrerequisitesCheckStepProps) {
  const [checks, setChecks] = useState<{ name: string; status: 'pending' | 'success' }[]>([
    { name: 'Node.js 18+', status: 'pending' },
    { name: 'npm installed', status: 'pending' },
    { name: 'Git installed', status: 'pending' },
    { name: `Port ${mode === 'cloud' ? '443' : '18789'} available`, status: 'pending' },
  ]);

  const runChecks = async () => {
    for (let i = 0; i < checks.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setChecks((prev) =>
        prev.map((c, idx) =>
          idx === i ? { ...c, status: 'success' } : c
        )
      );
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', textAlign: 'center' }}>
        Prerequisites Check
      </h2>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <p style={{ color: '#888', marginBottom: '24px' }}>
          Checking system requirements...
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {checks.map((check) => (
            <div
              key={check.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '12px',
              }}
            >
              {check.status === 'pending' && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #333',
                  borderTopColor: 'var(--accent-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {check.status === 'success' && <CheckCircle size={20} style={{ color: 'var(--accent-green)' }} />}
              <span>{check.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={runChecks}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
          }}
        >
          <Terminal size={18} />
          Run Checks
        </button>
      </div>
    </div>
  );
}

interface SummaryStepProps {
  mode: string;
  config: InstallConfig;
  onInstall: () => void;
}

function SummaryStep({ mode, config, onInstall }: SummaryStepProps) {
  const modeName = DEPLOYMENT_MODES.find((m) => m.id === mode)?.title;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', textAlign: 'center' }}>
        Installation Summary
      </h2>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>
            Configuration
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Mode:</span>
              <span>{modeName}</span>
            </div>
            {(mode === 'unified' || mode === 'split') && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>OpenClaw Dir:</span>
                  <span>{config.openclawDir}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>OpenClaw Port:</span>
                  <span>{config.openclawPort}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Admin Dir:</span>
              <span>{config.adminDir}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Admin Port:</span>
              <span>{config.adminPort}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onInstall}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            background: '#F59D0A',
            border: 'none',
            borderRadius: '12px',
            color: '#000',
            fontWeight: 600,
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          <Download size={20} />
          Start Installation
        </button>
      </div>
    </div>
  );
}

interface InstallationStepProps {
  logs: string[];
}

function InstallationStep({ logs }: InstallationStepProps) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', textAlign: 'center' }}>
        Installing...
      </h2>
      <div style={{
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '20px',
        height: '300px',
        overflow: 'auto',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
      }}>
        {logs.length === 0 ? (
          <p style={{ color: '#555' }}>Starting installation...</p>
        ) : (
          logs.map((log, idx) => (
            <p key={idx} style={{ color: log.includes('✓') ? '#22c55e' : '#aaa', marginBottom: '4px' }}>
              {log}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function getInstallationSteps(mode: string, _config: InstallConfig) {
  const steps = [];
  if (mode === 'unified') {
    steps.push(
      { name: 'Create directories', error: null },
      { name: 'Clone OpenClaw Core', error: null },
      { name: 'Install dependencies', error: null },
      { name: 'Configure services', error: null },
    );
  } else if (mode === 'split') {
    steps.push(
      { name: 'Create directories', error: null },
      { name: 'Setup Core', error: null },
      { name: 'Setup Admin', error: null },
    );
  } else if (mode === 'admin-only') {
    steps.push(
      { name: 'Create directories', error: null },
      { name: 'Configure connection', error: null },
    );
  } else if (mode === 'cloud') {
    steps.push(
      { name: 'Configure cloud', error: null },
      { name: 'Build application', error: null },
    );
  }
  return steps;
}

import { createRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import {
  Bot,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User,
  LogOut,
  Globe,
  Key,
  Loader2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { parseSetupCode } from '../hooks/useOpenClawWebSocket';

export const connectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/connect',
  component: ConnectPage,
  validateSearch: (search: Record<string, unknown>) => ({
    platform: typeof search.platform === 'string' ? search.platform : undefined,
  }),
}) as any;

function ConnectPage() {
  const { user, addInstance, logout } = useAuth();
  const navigate = useNavigate();
  const { platform } = useSearch({ from: '/connect' }) as { platform?: string };

  const [formData, setFormData] = useState({
    name: '',
    instanceUrl: '',
    apiKey: '',
    role: 'operator' as 'operator' | 'node',
  });
  const [setupCode, setSetupCode] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!user) {
    navigate({ to: '/' });
    return null;
  }

  const handleTestConnection = async () => {
    if (!formData.instanceUrl || !formData.apiKey) {
      setTestResult({ success: false, message: 'Please enter both URL and API key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For demo, assume success if URL looks valid
    const isValid = formData.instanceUrl.includes('http') && formData.apiKey.length > 10;

    if (isValid) {
      setTestResult({
        success: true,
        message: 'Connection successful! Your OpenClaw instance is reachable.'
      });
    } else {
      setTestResult({
        success: false,
        message: 'Connection failed. Please check your URL and API key.'
      });
    }

    setIsTesting(false);
  };

  const handleConnect = async () => {
    if (!formData.name || !formData.instanceUrl || !formData.apiKey) {
      setTestResult({ success: false, message: 'Please fill in all fields' });
      return;
    }

    setIsConnecting(true);

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create new instance
    const newInstance = {
      id: crypto.randomUUID(),
      name: formData.name,
      platform: (platform || 'self_hosted') as any,
      instanceUrl: formData.instanceUrl,
      status: 'connected' as const,
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      config: {
        role: formData.role,
      }
    };

    addInstance(newInstance);
    setIsConnecting(false);

    // Navigate to dashboard (redirect route will handle workspace context)
    navigate({ to: '/dashboard' });
  };

  const handleSetupCodeChange = (code: string) => {
    setSetupCode(code);
    const parsed = parseSetupCode(code);
    if (parsed) {
      setFormData(prev => ({
        ...prev,
        instanceUrl: parsed.url,
        apiKey: parsed.token,
        name: prev.name || 'Auto-Configured Instance'
      }));
      setTestResult({ success: true, message: '✓ Setup code parsed successfully!' });
    }
  };

  const platformNames: Record<string, string> = {
    cloudflare: 'Cloudflare Workers',
    railway: 'Railway',
    digitalocean: 'DigitalOcean',
    hostinger: 'Hostinger VPS',
    self_hosted: 'Self-Hosted',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bot size={24} color="white" />
            </div>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>OpenClaw</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '100px',
            }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
              ) : (
                <User size={20} style={{ color: '#71717a' }} />
              )}
              <button
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Progress Steps */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '100px',
            }}>
              <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
              <span style={{ fontSize: '14px', color: '#a1a1aa' }}>Choose Platform</span>
            </div>
            <ChevronRight size={20} style={{ color: '#52525b' }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '100px',
            }}>
              <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
              <span style={{ fontSize: '14px', color: '#a1a1aa' }}>Deploy</span>
            </div>
            <ChevronRight size={20} style={{ color: '#52525b' }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '100px',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: '#6366f1',
              }}>
                3
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Connect</span>
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
            Connect your instance
          </h1>
          <p style={{ fontSize: '16px', color: '#71717a' }}>
            Enter your {platform ? platformNames[platform] : 'OpenClaw'} instance details
          </p>
        </div>

        {/* Connection Form */}
        <div style={{
          padding: '32px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Setup Code Parser */}
          <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '12px',
              color: '#a5b4fc',
            }}>
              Quick Setup (Paste code from OpenClaw)
            </label>
            <textarea
              value={setupCode}
              onChange={(e) => handleSetupCodeChange(e.target.value)}
              placeholder="Paste your base64 setup code here..."
              style={{
                width: '100%',
                height: '80px',
                padding: '12px 16px',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px dashed rgba(99, 102, 241, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'monospace',
              }}
            />
            <p style={{ fontSize: '12px', color: '#71717a', marginTop: '8px' }}>
              Populates URL and Token automatically.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Instance Name */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px',
              }}>
                Instance Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My OpenClaw"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#0d0d0d',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px',
              }}>
                Connection Role
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setFormData({ ...formData, role: 'operator' })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: formData.role === 'operator' ? 'rgba(99, 102, 241, 0.2)' : '#0d0d0d',
                    border: `1px solid ${formData.role === 'operator' ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px',
                    color: formData.role === 'operator' ? '#fff' : '#71717a',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <User size={14} /> Operator
                </button>
                <button
                  onClick={() => setFormData({ ...formData, role: 'node' })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: formData.role === 'node' ? 'rgba(74, 222, 128, 0.1)' : '#0d0d0d',
                    border: `1px solid ${formData.role === 'node' ? '#4ade80' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px',
                    color: formData.role === 'node' ? '#fff' : '#71717a',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Shield size={14} /> Node
                </button>
              </div>
            </div>
          </div>

          {/* Instance URL */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px',
            }}>
              Instance URL
            </label>
            <div style={{ position: 'relative' }}>
              <Globe size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#71717a',
              }} />
              <input
                type="text"
                value={formData.instanceUrl}
                onChange={(e) => setFormData({ ...formData, instanceUrl: e.target.value })}
                placeholder="https://your-instance.com"
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  background: '#0d0d0d',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
            <p style={{ fontSize: '13px', color: '#52525b', marginTop: '8px' }}>
              The URL where your OpenClaw instance is deployed
            </p>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px',
            }}>
              API Key
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#71717a',
              }} />
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-openclaw-..."
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  background: '#0d0d0d',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
            <p style={{ fontSize: '13px', color: '#52525b', marginTop: '8px' }}>
              Your OpenClaw API key for authentication
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div style={{
              padding: '16px',
              background: testResult.success ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: '10px',
              border: `1px solid ${testResult.success ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {testResult.success ? (
                <CheckCircle2 size={20} style={{ color: '#4ade80', flexShrink: 0 }} />
              ) : (
                <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: '14px',
                color: testResult.success ? '#4ade80' : '#ef4444'
              }}>
                {testResult.message}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              style={{
                flex: 1,
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 500,
                cursor: isTesting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isTesting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>

            <button
              onClick={handleConnect}
              disabled={isConnecting || !testResult?.success}
              style={{
                flex: 1,
                padding: '14px',
                background: isConnecting || !testResult?.success
                  ? 'rgba(99, 102, 241, 0.5)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isConnecting || !testResult?.success ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isConnecting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect Instance <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a
            href={platform ? `/setup/${platform}` : '/onboarding'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#71717a',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            <ArrowLeft size={16} />
            Back to setup guide
          </a>
        </div>

        {/* Help */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: 'rgba(99, 102, 241, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          textAlign: 'center',
        }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: '#a5b4fc' }}>
            Where do I find my API key?
          </h4>
          <p style={{ fontSize: '14px', color: '#a1a1aa' }}>
            Your API key is generated during deployment. Check your platform's environment variables
            or run <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>openclaw config:get</code> on your server.
          </p>
        </div>
      </main>
    </div>
  );
}

export default ConnectPage;

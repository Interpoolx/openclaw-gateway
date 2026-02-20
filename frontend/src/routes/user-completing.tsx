import { createRoute, useNavigate } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { 
  Check,
  ArrowRight,
  Bot,
  Server,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle,
  Zap
} from 'lucide-react';

export const userCompletingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user/completing',
  component: UserCompletingPage,
}) as any;

interface Selections {
  model: string;
  channel: string;
  deploy: string;
  dashboard: boolean;
}

const modelDetails: Record<string, { name: string; icon: string; provider: string }> = {
  'claude-opus': { name: 'Claude Opus 4.5', icon: '🔥', provider: 'Anthropic' },
  'gpt-5': { name: 'GPT-5.2', icon: '🌀', provider: 'OpenAI' },
  'gemini': { name: 'Gemini 3 Flash', icon: '✨', provider: 'Google' },
  'kimi': { name: 'Kimi 2.5', icon: '🌙', provider: 'Moonshot' },
  'minimax': { name: 'MiniMax', icon: '🎭', provider: 'MiniMax' },
};

const channelDetails: Record<string, { name: string; icon: string }> = {
  'telegram': { name: 'Telegram', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg' },
  'discord': { name: 'Discord', icon: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png' },
  'whatsapp': { name: 'WhatsApp', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
  'slack': { name: 'Slack', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg' },
};

const deployDetails: Record<string, { name: string; time: string }> = {
  'cloudflare': { name: 'Cloudflare Workers', time: '< 2 min' },
  'docker': { name: 'Docker', time: '5 min' },
  'digitalocean': { name: 'DigitalOcean', time: '10 min' },
  'hostinger': { name: 'Hostinger VPS', time: '12 min' },
  'vps': { name: 'Other VPS', time: '15 min' },
};

function UserCompletingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selections, setSelections] = useState<Selections | null>(null);
  const [deployStep, setDeployStep] = useState(0);
  const [isDeploying, setIsDeploying] = useState(true);
  const [deployed, setDeployed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mock deployment URLs
  const [instanceUrl, setInstanceUrl] = useState('');
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [botUsername, setBotUsername] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate({ to: '/' });
      return;
    }

    // Load selections from localStorage
    const saved = localStorage.getItem('heyclaw_selections');
    if (saved) {
      setSelections(JSON.parse(saved));
    }
  }, [user, navigate]);

  // Simulate deployment steps
  useEffect(() => {
    if (!selections || !isDeploying) return;

    const steps = [
      { delay: 1500, message: 'Provisioning infrastructure...' },
      { delay: 2500, message: 'Setting up OpenClaw environment...' },
      { delay: 4000, message: 'Configuring AI model...' },
      { delay: 5500, message: 'Connecting to channel...' },
      { delay: 7000, message: 'Deploying dashboard...' },
      { delay: 8500, message: 'Finalizing setup...' },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setDeployStep(index + 1);
        if (index === steps.length - 1) {
          setIsDeploying(false);
          setDeployed(true);
          // Generate mock URLs
          const randomId = Math.random().toString(36).substring(2, 8);
          setInstanceUrl(`https://claw-${randomId}.workers.dev`);
          setDashboardUrl(`https://claw-${randomId}.workers.dev/admin`);
          setBotUsername(`@heyclaw_${randomId}_bot`);
        }
      }, step.delay);
    });
  }, [selections, isDeploying]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user || !selections) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{ fontSize: '20px', fontWeight: 600 }}>HeyClaw.com</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
            alt={user.name}
            style={{ width: '32px', height: '32px', borderRadius: '8px' }}
          />
          <span style={{ fontSize: '14px', color: '#888' }}>{user.name}</span>
        </div>
      </header>

      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '60px 20px',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '12px',
            letterSpacing: '-0.5px',
          }}>
            {deployed ? '🎉 Your OpenClaw is Ready!' : 'Setting Up Your OpenClaw'}
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#888',
          }}>
            {deployed 
              ? 'Your AI assistant is deployed and ready to use'
              : 'This usually takes less than a minute'
            }
          </p>
        </div>

        {!deployed ? (
          /* Deployment Progress */
          <div style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '16px',
            padding: '40px',
          }}>
            {/* Progress Bar */}
            <div style={{
              height: '4px',
              background: '#1a1a1a',
              borderRadius: '2px',
              marginBottom: '40px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(deployStep / 6) * 100}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: '2px',
                transition: 'width 0.5s ease',
              }} />
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { icon: Server, label: 'Provisioning infrastructure' },
                { icon: Bot, label: 'Setting up OpenClaw environment' },
                { icon: Sparkles, label: 'Configuring AI model' },
                { icon: MessageSquare, label: 'Connecting to channel' },
                { icon: LayoutDashboard, label: 'Deploying dashboard' },
                { icon: CheckCircle, label: 'Finalizing setup' },
              ].map((step, index) => {
                const StepIcon = step.icon;
                const isComplete = deployStep > index;
                const isCurrent = deployStep === index;
                
                return (
                  <div key={step.label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    opacity: isComplete || isCurrent ? 1 : 0.4,
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isComplete ? 'rgba(16, 185, 129, 0.2)' : isCurrent ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isCurrent ? '1px solid #6366f1' : 'none',
                    }}>
                      {isComplete ? (
                        <Check size={20} style={{ color: '#10b981' }} />
                      ) : isCurrent ? (
                        <Loader2 size={20} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <StepIcon size={18} style={{ color: '#666' }} />
                      )}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: isComplete ? '#10b981' : isCurrent ? '#fff' : '#666',
                      }}>
                        {step.label}
                      </div>
                      {isCurrent && (
                        <div style={{ fontSize: '13px', color: '#6366f1', marginTop: '2px' }}>
                          In progress...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Success State */
          <>
            {/* Success Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle size={24} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                  Deployment Complete
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>
                  Your OpenClaw instance is live and ready
                </div>
              </div>
            </div>

            {/* Access Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
              {/* Instance URL */}
              <div style={{
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Instance URL
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <code style={{
                    flex: 1,
                    fontSize: '15px',
                    color: '#6366f1',
                    fontFamily: 'monospace',
                    background: 'rgba(99, 102, 241, 0.1)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                  }}>
                    {instanceUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(instanceUrl)}
                    style={{
                      padding: '10px',
                      background: 'transparent',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#888',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? <Check size={18} style={{ color: '#10b981' }} /> : <Copy size={18} />}
                  </button>
                  <a
                    href={instanceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px',
                      background: '#6366f1',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>

              {/* Bot Username */}
              {selections.channel === 'telegram' && (
                <div style={{
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderRadius: '12px',
                  padding: '20px',
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Telegram Bot
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
                      alt="Telegram"
                      style={{ width: '24px', height: '24px' }}
                    />
                    <code style={{
                      flex: 1,
                      fontSize: '15px',
                      color: '#229ed9',
                      fontFamily: 'monospace',
                      background: 'rgba(34, 158, 217, 0.1)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                    }}>
                      {botUsername}
                    </code>
                    <button
                      onClick={() => copyToClipboard(botUsername)}
                      style={{
                        padding: '10px',
                        background: 'transparent',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#888',
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? <Check size={18} style={{ color: '#10b981' }} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Dashboard URL */}
              {selections.dashboard && (
                <div style={{
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderRadius: '12px',
                  padding: '20px',
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Admin Dashboard
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LayoutDashboard size={24} style={{ color: '#8b5cf6' }} />
                    <code style={{
                      flex: 1,
                      fontSize: '15px',
                      color: '#8b5cf6',
                      fontFamily: 'monospace',
                      background: 'rgba(139, 92, 246, 0.1)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                    }}>
                      {dashboardUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(dashboardUrl)}
                      style={{
                        padding: '10px',
                        background: 'transparent',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#888',
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? <Check size={18} style={{ color: '#10b981' }} /> : <Copy size={18} />}
                    </button>
                    <a
                      href={dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px',
                        background: '#8b5cf6',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Configuration Summary */}
            <div style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '30px',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
                Configuration Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <SummaryItem
                  icon={Sparkles}
                  label="AI Model"
                  value={`${modelDetails[selections.model]?.icon} ${modelDetails[selections.model]?.name}`}
                  color="#f59e0b"
                />
                <SummaryItem
                  icon={MessageSquare}
                  label="Channel"
                  value={channelDetails[selections.channel]?.name}
                  color="#229ed9"
                />
                <SummaryItem
                  icon={Server}
                  label="Platform"
                  value={deployDetails[selections.deploy]?.name}
                  color="#f97316"
                />
                <SummaryItem
                  icon={LayoutDashboard}
                  label="Dashboard"
                  value={selections.dashboard ? 'Enabled' : 'Disabled'}
                  color="#8b5cf6"
                />
              </div>
            </div>

            {/* Next Steps */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '30px',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#6366f1' }} />
                Next Steps
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selections.channel === 'telegram' && (
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#ccc' }}>
                    <span style={{ color: '#6366f1' }}>1.</span>
                    <span>Open Telegram and search for <strong style={{ color: '#fff' }}>{botUsername}</strong></span>
                  </li>
                )}
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#ccc' }}>
                  <span style={{ color: '#6366f1' }}>{selections.channel === 'telegram' ? '2' : '1'}.</span>
                  <span>Start a conversation with your AI assistant</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#ccc' }}>
                  <span style={{ color: '#6366f1' }}>{selections.channel === 'telegram' ? '3' : '2'}.</span>
                  <span>Try asking: &quot;What can you help me with?&quot;</span>
                </li>
                {selections.dashboard && (
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#ccc' }}>
                    <span style={{ color: '#6366f1' }}>{selections.channel === 'telegram' ? '4' : '3'}.</span>
                    <span>Access the <a href={dashboardUrl} style={{ color: '#8b5cf6' }}>Admin Dashboard</a> to manage your bot</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href={instanceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  background: '#fff',
                  color: '#000',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                }}
              >
                Open Instance
                <ExternalLink size={18} />
              </a>
              <a
                href="/user/dashboard"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  background: 'transparent',
                  border: '1px solid #333',
                  color: '#fff',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              >
                Go to Dashboard
                <ArrowRight size={18} />
              </a>
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

interface SummaryItemProps {
  readonly icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
  readonly label: string;
  readonly value: string;
  readonly color: string;
}

function SummaryItem({ icon: Icon, label, value, color }: SummaryItemProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '10px',
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        background: `${color}15`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

export default UserCompletingPage;

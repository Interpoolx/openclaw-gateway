import { createRoute, useNavigate } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bot, 
  Globe, 
  Layers, 
  Cpu, 
  Shield, 
  Code2,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Plus
} from 'lucide-react';

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingPage,
}) as any;

const platforms = [
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers',
    difficulty: 'Easy',
    time: '5 min',
    cost: 'Free tier',
    description: 'Serverless deployment with edge computing. Best for developers getting started.',
    features: ['Global edge network', 'Automatic scaling', 'Free tier available', 'D1 database included'],
    color: '#f97316',
    icon: <Globe size={32} />,
  },
  {
    id: 'railway',
    name: 'Railway',
    difficulty: 'Easy',
    time: '5 min',
    cost: 'From $5/mo',
    description: 'Modern platform with auto-scaling. Perfect for small teams and startups.',
    features: ['One-click deploy', 'Auto-scaling', 'PostgreSQL included', 'Custom domains'],
    color: '#8b5cf6',
    icon: <Layers size={32} />,
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    difficulty: 'Medium',
    time: '15 min',
    cost: 'From $6/mo',
    description: 'Reliable VPS with full control. Great for production workloads.',
    features: ['Full server control', 'SSD storage', '99.99% uptime SLA', 'Floating IPs'],
    color: '#3b82f6',
    icon: <Cpu size={32} />,
  },
  {
    id: 'hostinger',
    name: 'Hostinger VPS',
    difficulty: 'Medium',
    time: '20 min',
    cost: 'From $4/mo',
    description: 'Budget-friendly VPS option. Good for personal projects and experiments.',
    features: ['Affordable pricing', 'KVM virtualization', 'Full root access', 'DDoS protection'],
    color: '#10b981',
    icon: <Shield size={32} />,
  },
  {
    id: 'self_hosted',
    name: 'Self-Hosted',
    difficulty: 'Advanced',
    time: '30 min',
    cost: 'Free',
    description: 'Run on your own hardware or existing infrastructure. Full control.',
    features: ['Complete control', 'No vendor lock-in', 'Custom hardware', 'Private network'],
    color: '#ec4899',
    icon: <Code2 size={32} />,
  },
];

function OnboardingPage() {
  const { user, instances, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate({ to: '/' });
    return null;
  }

  const handlePlatformSelect = (platformId: string) => {
    navigate({ to: '/setup/$platform', params: { platform: platformId } });
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
          maxWidth: '1200px',
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
            {instances.length > 0 && (
              <a
                href="/dashboard"
                style={{
                  color: '#a1a1aa',
                  textDecoration: 'none',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Settings size={18} />
                Dashboard
              </a>
            )}
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
              <span style={{ fontSize: '14px' }}>{user.name}</span>
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

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 24px' }}>
        {/* Progress Steps */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                1
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Choose Platform</span>
            </div>
            <ChevronRight size={20} style={{ color: '#52525b' }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '100px',
              color: '#71717a',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: 'transparent',
                border: '2px solid #52525b',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}>
                2
              </div>
              <span style={{ fontSize: '14px' }}>Deploy</span>
            </div>
            <ChevronRight size={20} style={{ color: '#52525b' }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '100px',
              color: '#71717a',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: 'transparent',
                border: '2px solid #52525b',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}>
                3
              </div>
              <span style={{ fontSize: '14px' }}>Connect</span>
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px' }}>
            Choose your deployment platform
          </h1>
          <p style={{ fontSize: '18px', color: '#71717a', maxWidth: '600px', margin: '0 auto' }}>
            Select the platform that best fits your needs. You can always add more instances later.
          </p>
        </div>

        {/* Existing Instances */}
        {instances.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#a1a1aa' }}>
              Your Instances
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  style={{
                    padding: '20px 24px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Bot size={20} style={{ color: '#6366f1' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{instance.name}</h3>
                      <p style={{ fontSize: '14px', color: '#71717a' }}>{instance.instanceUrl}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: instance.status === 'connected' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: instance.status === 'connected' ? '#4ade80' : '#eab308',
                      borderRadius: '100px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}>
                      {instance.status}
                    </span>
                    <a
                      href="/dashboard"
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      Manage
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '24px',
              padding: '24px',
              background: 'rgba(99, 102, 241, 0.05)',
              borderRadius: '12px',
              border: '1px dashed rgba(99, 102, 241, 0.3)',
              textAlign: 'center',
            }}>
              <button
                onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Plus size={18} />
                Add Another Instance
              </button>
            </div>
          </div>
        )}

        {/* Platform Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handlePlatformSelect(platform.id)}
              style={{
                padding: '28px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: `${platform.color}20`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: platform.color,
                }}>
                  {platform.icon}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 600 }}>{platform.name}</h3>
                    <ArrowRight size={20} style={{ color: '#52525b' }} />
                  </div>

                  <p style={{ fontSize: '15px', color: '#71717a', marginBottom: '16px', lineHeight: 1.5 }}>
                    {platform.description}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} style={{ color: '#71717a' }} />
                      <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{platform.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} style={{ color: '#71717a' }} />
                      <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{platform.difficulty}</span>
                    </div>
                    <span style={{
                      fontSize: '13px',
                      padding: '2px 10px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '100px',
                      color: '#a1a1aa',
                    }}>
                      {platform.cost}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {platform.features.map((feature, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '13px',
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '8px',
                          color: '#71717a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2 size={12} style={{ color: platform.color }} />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Help Section */}
        <div style={{
          marginTop: '60px',
          padding: '32px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Not sure which platform to choose?
          </h3>
          <p style={{ fontSize: '15px', color: '#71717a', marginBottom: '16px' }}>
            Start with Cloudflare Workers for free, or contact us for a recommendation based on your needs.
          </p>
          <a
            href="mailto:support@openclaw.io"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6366f1',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 500,
            }}
          >
            Contact Support <ArrowRight size={16} />
          </a>
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;

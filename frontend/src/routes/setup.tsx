import { createRoute, useNavigate, useParams } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { 
  Bot, 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  User,
  LogOut,
  AlertCircle,
  Terminal,
  Globe,
  Layers,
  Cpu,
  Shield,
  Code2,
} from 'lucide-react';

export const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup/$platform',
  component: SetupPage,
}) as any;

const platformGuides: Record<string, {
  name: string;
  color: string;
  icon: React.ReactNode;
  prerequisites: string[];
  steps: {
    title: string;
    description: string;
    code?: string;
    action?: {
      label: string;
      url: string;
    };
  }[];
}> = {
  cloudflare: {
    name: 'Cloudflare Workers',
    color: '#f97316',
    icon: <Globe size={24} />,
    prerequisites: [
      'Cloudflare account (free)',
      'GitHub account',
      'Node.js 18+ installed locally',
    ],
    steps: [
      {
        title: 'Fork the template repository',
        description: 'Click the button below to fork the OpenClaw Cloudflare template to your GitHub account.',
        action: {
          label: 'Fork on GitHub',
          url: 'https://github.com/openclaw/moltworker-template/fork',
        },
      },
      {
        title: 'Install Wrangler CLI',
        description: 'Install the Cloudflare Wrangler CLI globally on your machine.',
        code: 'npm install -g wrangler',
      },
      {
        title: 'Authenticate with Cloudflare',
        description: 'Run the following command and follow the prompts to log in.',
        code: 'wrangler login',
      },
      {
        title: 'Create D1 Database',
        description: 'Create a new D1 database for your OpenClaw instance.',
        code: 'wrangler d1 create openclaw-db',
      },
      {
        title: 'Deploy your worker',
        description: 'Navigate to your forked repo and deploy.',
        code: 'cd openclaw-moltworker\nwrangler deploy',
      },
      {
        title: 'Get your instance URL',
        description: 'After deployment, you\'ll see your worker URL. It looks like:\nhttps://openclaw.your-subdomain.workers.dev',
      },
    ],
  },
  railway: {
    name: 'Railway',
    color: '#8b5cf6',
    icon: <Layers size={24} />,
    prerequisites: [
      'Railway account (free tier available)',
      'GitHub account',
    ],
    steps: [
      {
        title: 'Click Deploy on Railway',
        description: 'Click the button below to start the deployment process.',
        action: {
          label: 'Deploy on Railway',
          url: 'https://railway.app/template/openclaw',
        },
      },
      {
        title: 'Configure environment variables',
        description: 'Railway will automatically create a PostgreSQL database. Add these environment variables:',
        code: 'OPENCLAW_API_KEY=your-secure-random-key\nNODE_ENV=production',
      },
      {
        title: 'Deploy',
        description: 'Railway will automatically build and deploy your instance.',
      },
      {
        title: 'Get your instance URL',
        description: 'Once deployed, Railway will provide you with a domain like:\nhttps://openclaw-production.up.railway.app',
      },
    ],
  },
  digitalocean: {
    name: 'DigitalOcean',
    color: '#3b82f6',
    icon: <Cpu size={24} />,
    prerequisites: [
      'DigitalOcean account',
      'Basic knowledge of Linux CLI',
      'SSH key set up',
    ],
    steps: [
      {
        title: 'Create a Droplet',
        description: 'Create a new Ubuntu 22.04 droplet with at least 1GB RAM.',
        action: {
          label: 'Create Droplet',
          url: 'https://cloud.digitalocean.com/droplets/new',
        },
      },
      {
        title: 'SSH into your server',
        description: 'Connect to your new droplet via SSH.',
        code: 'ssh root@your-droplet-ip',
      },
      {
        title: 'Install Docker',
        description: 'Install Docker and Docker Compose.',
        code: 'curl -fsSL https://get.docker.com | sh',
      },
      {
        title: 'Download OpenClaw',
        description: 'Clone the OpenClaw repository.',
        code: 'git clone https://github.com/openclaw/openclaw.git\ncd openclaw',
      },
      {
        title: 'Start OpenClaw',
        description: 'Run the Docker Compose stack.',
        code: 'docker-compose up -d',
      },
      {
        title: 'Configure firewall',
        description: 'Open the required ports.',
        code: 'ufw allow 22\nufw allow 18789\nufw enable',
      },
    ],
  },
  hostinger: {
    name: 'Hostinger VPS',
    color: '#10b981',
    icon: <Shield size={24} />,
    prerequisites: [
      'Hostinger VPS plan',
      'Basic knowledge of Linux CLI',
    ],
    steps: [
      {
        title: 'Purchase VPS',
        description: 'Get a VPS plan from Hostinger (KVM 1 or higher recommended).',
        action: {
          label: 'View VPS Plans',
          url: 'https://www.hostinger.com/vps-hosting',
        },
      },
      {
        title: 'Access your VPS',
        description: 'Use the Hostinger panel to get your SSH credentials.',
      },
      {
        title: 'Connect via SSH',
        description: 'SSH into your new VPS.',
        code: 'ssh root@your-vps-ip',
      },
      {
        title: 'Install dependencies',
        description: 'Update packages and install Docker.',
        code: 'apt update && apt upgrade -y\ncurl -fsSL https://get.docker.com | sh',
      },
      {
        title: 'Deploy OpenClaw',
        description: 'Clone and start OpenClaw.',
        code: 'git clone https://github.com/openclaw/openclaw.git\ncd openclaw\ndocker-compose up -d',
      },
    ],
  },
  self_hosted: {
    name: 'Self-Hosted',
    color: '#ec4899',
    icon: <Code2 size={24} />,
    prerequisites: [
      'Linux/macOS/Windows with WSL',
      'Docker & Docker Compose',
      'Git',
    ],
    steps: [
      {
        title: 'Install prerequisites',
        description: 'Make sure you have Docker and Git installed.',
        code: '# macOS\nbrew install docker git\n\n# Ubuntu/Debian\nsudo apt install docker.io docker-compose git',
      },
      {
        title: 'Clone OpenClaw',
        description: 'Download the OpenClaw repository.',
        code: 'git clone https://github.com/openclaw/openclaw.git\ncd openclaw',
      },
      {
        title: 'Configure environment',
        description: 'Copy the example environment file and edit as needed.',
        code: 'cp .env.example .env\nnano .env  # Edit configuration',
      },
      {
        title: 'Start OpenClaw',
        description: 'Launch the OpenClaw stack.',
        code: 'docker-compose up -d',
      },
      {
        title: 'Verify installation',
        description: 'Check that everything is running.',
        code: 'docker-compose ps\ncurl http://localhost:18789/health',
      },
    ],
  },
};

function SetupPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { platform } = useParams({ from: '/setup/$platform' }) as { platform: string };
  const [currentStep, setCurrentStep] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!user) {
    navigate({ to: '/' });
    return null;
  }

  const guide = platformGuides[platform];
  if (!guide) {
    navigate({ to: '/onboarding' });
    return null;
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleContinue = () => {
    if (currentStep < guide.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate({ to: '/connect', search: { platform } });
    }
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
          maxWidth: '1000px',
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
            <a
              href="/onboarding"
              style={{
                color: '#a1a1aa',
                textDecoration: 'none',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={18} />
              Back
            </a>
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

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
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
                2
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Deploy</span>
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

        {/* Platform Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          padding: '24px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '32px',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: `${guide.color}20`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: guide.color,
          }}>
            {guide.icon}
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
              Set up {guide.name}
            </h1>
            <p style={{ fontSize: '15px', color: '#71717a' }}>
              Follow the steps below to deploy your OpenClaw instance
            </p>
          </div>
        </div>

        {/* Prerequisites */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#a1a1aa' }}>
            Prerequisites
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {guide.prerequisites.map((prereq, i) => (
              <div
                key={`prereq-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                }}
              >
                <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
                <span style={{ fontSize: '14px' }}>{prereq}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps Progress */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#a1a1aa' }}>
              Step {currentStep + 1} of {guide.steps.length}
            </span>
            <span style={{ fontSize: '14px', color: '#a1a1aa' }}>
              {Math.round(((currentStep + 1) / guide.steps.length) * 100)}%
            </span>
          </div>
          <div style={{
            height: '6px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${((currentStep + 1) / guide.steps.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>

        {/* Current Step */}
        <div style={{
          padding: '32px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
            }}>
              {currentStep + 1}
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 600 }}>
              {guide.steps[currentStep].title}
            </h2>
          </div>

          <p style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '24px', lineHeight: 1.6 }}>
            {guide.steps[currentStep].description}
          </p>

          {guide.steps[currentStep].action && (
            <a
              href={guide.steps[currentStep].action?.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                padding: '14px 24px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '24px',
              }}
            >
              {guide.steps[currentStep].action!.label}
              <ExternalLink size={18} />
            </a>
          )}

          {guide.steps[currentStep].code && (
            <div style={{
              background: '#0d0d0d',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={16} style={{ color: '#71717a' }} />
                  <span style={{ fontSize: '13px', color: '#71717a' }}>Terminal</span>
                </div>
                <button
                  onClick={() => handleCopyCode(guide.steps[currentStep].code!)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: copiedCode === guide.steps[currentStep].code ? '#4ade80' : '#71717a',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {copiedCode === guide.steps[currentStep].code ? (
                    <>
                      <CheckCircle2 size={14} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre style={{
                padding: '16px',
                margin: 0,
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#e4e4e7',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {guide.steps[currentStep].code}
              </pre>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: currentStep === 0 ? '#52525b' : '#fff',
              fontSize: '15px',
              fontWeight: 500,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>

          <button
            onClick={handleContinue}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {currentStep === guide.steps.length - 1 ? (
              <>
                Continue to Connect <ArrowRight size={18} />
              </>
            ) : (
              <>
                Next Step <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {/* Help */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: 'rgba(234, 179, 8, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(234, 179, 8, 0.2)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <AlertCircle size={20} style={{ color: '#eab308', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: '#eab308' }}>
              Need help?
            </h4>
            <p style={{ fontSize: '14px', color: '#a1a1aa' }}>
              If you encounter any issues during setup, check our{' '}
              <a href="#docs" style={{ color: '#6366f1', textDecoration: 'none' }}>documentation</a>
              {' '}or{' '}
              <a href="#discord" style={{ color: '#6366f1', textDecoration: 'none' }}>join our Discord</a>
              {' '}for support.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SetupPage;

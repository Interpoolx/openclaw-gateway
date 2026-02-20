import { createRoute, useNavigate } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Activity,
  LogOut,
  LayoutDashboard,
  Settings,
  BarChart3,
  Server,
  UserCheck,
  ArrowRight,
  Crown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Globe,
  Zap,
} from 'lucide-react';

export const hpanelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hpanel',
  component: HPanelPage,
}) as any;

// Mock data for dashboard
const MOCK_STATS = {
  totalUsers: 142,
  activeInstances: 38,
  totalAgents: 256,
  totalTasks: 1847,
  newUsersToday: 12,
  revenueToday: 247,
  serverUptime: '99.9%',
  avgResponseTime: '45ms'
};

const MOCK_ACTIVITIES = [
  { id: 1, type: 'user_signup', message: 'New user signed up: john@example.com', time: '2 min ago', icon: UserCheck, color: '#10b981' },
  { id: 2, type: 'instance_created', message: 'New instance deployed on Cloudflare', time: '5 min ago', icon: Server, color: '#f97316' },
  { id: 3, type: 'agent_created', message: 'User created 3 new agents', time: '12 min ago', icon: Shield, color: '#6366f1' },
  { id: 4, type: 'task_completed', message: 'Auto-scaling triggered for DigitalOcean instances', time: '18 min ago', icon: CheckCircle, color: '#8b5cf6' },
  { id: 5, type: 'alert', message: 'High CPU usage on Hostinger VPS #7', time: '25 min ago', icon: AlertCircle, color: '#ef4444' },
];

const MOCK_INSTANCES = [
  { id: 'inst-1', platform: 'Cloudflare', status: 'healthy', users: 45, region: 'US East', color: '#f97316' },
  { id: 'inst-2', platform: 'DigitalOcean', status: 'healthy', users: 38, region: 'EU West', color: '#0069ff' },
  { id: 'inst-3', platform: 'Hostinger', status: 'warning', users: 23, region: 'Asia Pacific', color: '#673de6' },
  { id: 'inst-4', platform: 'Docker', status: 'healthy', users: 12, region: 'US West', color: '#2496ed' },
];

function HPanelPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect non-super-admins
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate({ to: '/user/dashboard' });
    }
  }, [user, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    setTimeout(() => {
      if (credentials.username === 'admin' && credentials.password === 'admin123') {
        // Reload to trigger re-render with auth - super admin login handled by AuthContext
      } else {
        setLoginError('Invalid credentials');
        setIsLoggingIn(false);
      }
    }, 800);
  };

  // Not logged in - show login page
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#050505',
        color: '#fff',
        fontFamily: '"JetBrains Mono", monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139, 92, 246, 0.1), transparent)
          `,
        }} />
        
        {/* Stars */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(2px 2px at 20px 30px, #fff, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 90px 40px, #fff, transparent),
            radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 230px 80px, #fff, transparent),
            radial-gradient(2px 2px at 300px 150px, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 400px 60px, #fff, transparent),
            radial-gradient(2px 2px at 500px 200px, rgba(255,255,255,0.3), transparent)
          `,
          backgroundSize: '550px 250px',
          animation: 'twinkle 4s ease-in-out infinite',
        }} />

        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Login Card */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '420px',
          padding: '0 24px',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '48px',
            backdropFilter: 'blur(10px)',
            animation: 'slideUp 0.5s ease-out',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Shield size={32} color="#fff" />
              </div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 600,
                marginBottom: '8px',
              }}>
                Super Admin Portal
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#666',
              }}>
                Restricted access only
              </p>
            </div>

            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                color: '#ef4444',
              }}>
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="Enter username"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: isLoggingIn ? 'wait' : 'pointer',
                  opacity: isLoggingIn ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    Access Admin Panel
                  </>
                )}
              </button>
            </form>

            <p style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#444',
              marginTop: '24px',
            }}>
              Default: admin / admin123
            </p>

            <a
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '20px',
                fontSize: '14px',
                color: '#666',
                textDecoration: 'none',
              }}
            >
              <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
              Back to HeyClaw.com
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Logged in as super admin - show dashboard
  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
      color: '#fff',
      fontFamily: '"JetBrains Mono", monospace',
      display: 'flex',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Crown size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>HeyClaw</div>
              <div style={{ fontSize: '12px', color: '#6366f1' }}>Super Admin</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <NavItem
            icon={LayoutDashboard}
            label="Overview"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <NavItem
            icon={Users}
            label="User Management"
            active={activeTab === 'users'}
            onClick={() => navigate({ to: '/users' })}
          />
          <NavItem
            icon={Server}
            label="Instances"
            active={activeTab === 'instances'}
            onClick={() => setActiveTab('instances')}
          />
          <NavItem
            icon={BarChart3}
            label="Analytics"
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          />
          <NavItem
            icon={Settings}
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </nav>

        {/* User & Logout */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            marginBottom: '12px',
          }}>
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '36px', height: '36px', borderRadius: '8px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6366f1' }}>Super Admin</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate({ to: '/' });
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: '260px',
        padding: '32px',
      }}>
        <div style={{ maxWidth: '1200px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>
                Super Admin Dashboard
              </h1>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Monitor and manage all HeyClaw instances and users
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '100px',
              fontSize: '13px',
              color: '#10b981',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#10b981',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }} />
              All Systems Operational
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}>
            <StatCard
              label="Total Users"
              value={MOCK_STATS.totalUsers}
              change="+12 today"
              icon={Users}
              color="#6366f1"
            />
            <StatCard
              label="Active Instances"
              value={MOCK_STATS.activeInstances}
              change="98% uptime"
              icon={Server}
              color="#10b981"
            />
            <StatCard
              label="Total Agents"
              value={MOCK_STATS.totalAgents}
              change="+23 this week"
              icon={Shield}
              color="#8b5cf6"
            />
            <StatCard
              label="Tasks Processed"
              value={MOCK_STATS.totalTasks.toLocaleString()}
              change="+1.2K today"
              icon={Activity}
              color="#f59e0b"
            />
          </div>

          {/* Two Column Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '24px',
          }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Instance Status */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Instance Health</h3>
                  <button style={{
                    fontSize: '13px',
                    color: '#6366f1',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}>
                    View All
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {MOCK_INSTANCES.map((instance) => (
                    <InstanceRow key={instance.id} instance={instance} />
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '24px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
                  Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {MOCK_ACTIVITIES.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Quick Stats */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '24px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
                  System Metrics
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <MetricRow label="Server Uptime" value={MOCK_STATS.serverUptime} />
                  <MetricRow label="Avg Response" value={MOCK_STATS.avgResponseTime} />
                  <MetricRow label="New Users Today" value={`+${MOCK_STATS.newUsersToday}`} />
                  <MetricRow label="Revenue Today" value={`$${MOCK_STATS.revenueToday}`} />
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '24px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                  Quick Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <QuickActionButton
                    icon={Users}
                    label="Manage Users"
                    onClick={() => navigate({ to: '/users' })}
                  />
                  <QuickActionButton
                    icon={Server}
                    label="Scale Instances"
                    onClick={() => {}}
                  />
                  <QuickActionButton
                    icon={Globe}
                    label="View Public Site"
                    onClick={() => window.open('/', '_blank')}
                  />
                  <QuickActionButton
                    icon={Zap}
                    label="System Health"
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// Component: NavItem
interface NavItemProps {
  readonly icon: React.ComponentType<{ size?: number | string }>;
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
        border: 'none',
        borderRadius: '10px',
        color: active ? '#6366f1' : '#888',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
      }}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

// Component: StatCard
interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly change: string;
  readonly icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
  readonly color: string;
}

function StatCard({ label, value, change, icon: Icon, color }: StatCardProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '16px',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          background: `${color}15`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={22} style={{ color }} />
        </div>
        <span style={{
          fontSize: '12px',
          color: '#10b981',
          background: 'rgba(16, 185, 129, 0.1)',
          padding: '4px 8px',
          borderRadius: '6px',
        }}>
          {change}
        </span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '14px', color: '#666' }}>{label}</div>
    </div>
  );
}

// Component: InstanceRow
interface InstanceRowProps {
  readonly instance: {
    id: string;
    platform: string;
    status: string;
    users: number;
    region: string;
    color: string;
  };
}

function InstanceRow({ instance }: InstanceRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '10px',
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        background: `${instance.color}15`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Server size={16} style={{ color: instance.color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>{instance.platform}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>{instance.region} • {instance.users} users</div>
      </div>
      <div style={{
        padding: '4px 10px',
        background: instance.status === 'healthy' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        color: instance.status === 'healthy' ? '#10b981' : '#f59e0b',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        textTransform: 'capitalize',
      }}>
        {instance.status}
      </div>
    </div>
  );
}

// Component: ActivityRow
function ActivityRow({ activity }: { activity: any }) {
  const Icon = activity.icon;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        background: `${activity.color}15`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={14} style={{ color: activity.color }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', marginBottom: '2px' }}>{activity.message}</p>
        <span style={{ fontSize: '12px', color: '#666' }}>{activity.time}</span>
      </div>
    </div>
  );
}

// Component: MetricRow
function MetricRow({ label, value }: { label: string, value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: '14px', color: '#888' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// Component: QuickActionButton
function QuickActionButton({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
      }}
    >
      <Icon size={16} style={{ color: '#6366f1' }} />
      {label}
    </button>
  );
}

export default HPanelPage;

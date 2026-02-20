import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { getAgents, getTasks } from '../lib/api';
import { 
  Users, 
  CheckSquare, 
  Activity, 
  Zap, 
  Bot,
  Plus,
  ArrowRight,
  Settings,
  LogOut,
  Sparkles,
  Eye,
  AlertTriangle
} from 'lucide-react';

export const userDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user/dashboard',
  component: UserDashboardPage,
}) as any;

function UserDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in
  if (!user) {
    navigate({ to: '/' });
    return null;
  }

  // Redirect super_admin to hpanel (unless demo)
  if (user.role === 'super_admin' && !user.isDemo) {
    navigate({ to: '/hpanel' });
    return null;
  }

  const isDemo = user.isDemo === true;

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents().catch(() => []),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks().catch(() => []),
  });

  const activeAgents = agents.filter((a: any) => a.status === 'active').length;
  const pendingTasks = tasks.filter((t: any) => t.status === 'inbox' || t.status === 'in_progress').length;
  const completedTasks = tasks.filter((t: any) => t.status === 'done').length;

  return (
    <Layout>
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '32px' 
          }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                Welcome back, {user.name?.split(' ')[0] || 'User'} 👋
              </h1>
              <p style={{ fontSize: '15px', color: '#666' }}>
                Manage your AI agents and tasks
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href="/settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                <Settings size={16} />
                Settings
              </a>
              <button
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          {/* Demo Mode Banner */}
          {isDemo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              marginBottom: '24px',
            }}>
              <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b', marginBottom: '2px' }}>
                  Demo Mode - Read Only
                </p>
                <p style={{ fontSize: '13px', color: '#d97706' }}>
                  Edit, delete, and create actions are disabled. This is a preview environment.
                </p>
              </div>
              <Eye size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
            </div>
          )}

          {/* User Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            background: isDemo ? 'rgba(245, 158, 11, 0.05)' : 'rgba(99, 102, 241, 0.1)',
            border: `1px solid ${isDemo ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
            borderRadius: '12px',
            marginBottom: '32px',
          }}>
            <img 
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
              alt={user.name}
              style={{ width: '40px', height: '40px', borderRadius: '10px' }}
            />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>{user.name}</p>
              <p style={{ fontSize: '13px', color: '#888' }}>{user.email}</p>
            </div>
            <span style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#6366f1',
              borderRadius: '100px',
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'capitalize',
            }}>
              {user.role}
            </span>
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}>
            <StatCard
              label="Total Agents"
              value={agents.length}
              icon={Bot}
              color="#6366f1"
            />
            <StatCard
              label="Active Agents"
              value={activeAgents}
              icon={Activity}
              color="#10b981"
            />
            <StatCard
              label="Pending Tasks"
              value={pendingTasks}
              icon={CheckSquare}
              color="#f59e0b"
            />
            <StatCard
              label="Completed"
              value={completedTasks}
              icon={Zap}
              color="#8b5cf6"
            />
          </div>

          {/* Quick Actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}>
            <ActionCard
              title={isDemo ? "View Agents (Read Only)" : "Create New Agent"}
              description={isDemo ? "Browse existing agents" : "Deploy a new AI assistant"}
              icon={isDemo ? Eye : Plus}
              href="/agents"
              color="#6366f1"
              isDemo={isDemo}
            />
            <ActionCard
              title="Command Center"
              description="View tasks and workflows"
              icon={CheckSquare}
              href="/command-center"
              color="#10b981"
              isDemo={isDemo}
            />
            <ActionCard
              title="View Agents"
              description="Browse your AI team"
              icon={Users}
              href="/agents"
              color="#f59e0b"
              isDemo={isDemo}
            />
            <ActionCard
              title={isDemo ? "View Settings" : "Settings"}
              description={isDemo ? "View configuration options" : "Configure your instance"}
              icon={Settings}
              href="/settings"
              color="#8b5cf6"
            />
          </div>

          {/* Recent Activity */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
              Recent Activity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ActivityItem
                icon={Sparkles}
                text="Welcome to HeyClaw! Your instance is ready."
                time="Just now"
                color="#6366f1"
              />
              <ActivityItem
                icon={Bot}
                text="Default agent 'Assistant' created"
                time="2 minutes ago"
                color="#10b981"
              />
              <ActivityItem
                icon={CheckSquare}
                text="Sample task added to inbox"
                time="5 minutes ago"
                color="#f59e0b"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon, color }: { 
  label: string; 
  value: number; 
  icon: any; 
  color: string;
}) {
  return (
    <div style={{
      padding: '24px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          background: `${color}20`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={22} style={{ color }} />
        </div>
        <span style={{ fontSize: '28px', fontWeight: 700 }}>{value}</span>
      </div>
      <span style={{ fontSize: '14px', color: '#666' }}>{label}</span>
    </div>
  );
}

function ActionCard({ title, description, icon: Icon, href, color, isDemo }: {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  isDemo?: boolean;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        background: 'var(--bg-card)',
        border: `1px solid ${isDemo ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-color)'}`,
        borderRadius: '12px',
        color: '#fff',
        textDecoration: 'none',
        transition: 'all 0.2s',
        opacity: isDemo ? 0.9 : 1,
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        background: `${color}20`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={24} style={{ color }} />
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{title}</h4>
        <p style={{ fontSize: '13px', color: '#666' }}>{description}</p>
      </div>
      <ArrowRight size={20} style={{ color: '#666' }} />
    </a>
  );
}

function ActivityItem({ icon: Icon, text, time, color }: {
  icon: any;
  text: string;
  time: string;
  color: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
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
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px' }}>{text}</p>
      </div>
      <span style={{ fontSize: '12px', color: '#666' }}>{time}</span>
    </div>
  );
}

export default UserDashboardPage;

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { getActivities, getAgents, getDevlogs, getCronJobs, getInstalledSkills, getSavedConfigs } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useProjects } from '../contexts/ProjectContext';
import {
  Sparkles,
  Clock,
  CheckCircle,
  Plus,
  Zap,
  Users,
  Target,
  FileText,
  Calendar,
  BookOpen,
  Wrench
} from 'lucide-react';
import { Card, Button, EmptyState } from '../components/ui';

function QuickAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <Button variant="secondary" fullWidth className="justify-start" onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </Button>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { projects, isLoading: projectsLoading } = useProjects();
  const navigate = useNavigate();

  const { data: agents } = useQuery({
    queryKey: ['dashboard-agents', currentWorkspace?.id],
    queryFn: () => getAgents(currentWorkspace?.id).catch(() => []),
    enabled: !!currentWorkspace,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: () => getActivities({ limit: 5 }).catch(() => []),
  });

  const { data: devlogs, isLoading: devlogsLoading } = useQuery({
    queryKey: ['dashboard-devlogs', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      try {
        const result = await getDevlogs({ limit: 5, workspaceId: currentWorkspace.id });
        return result ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!currentWorkspace?.id,
  });

  const { data: cronJobs, isLoading: cronLoading } = useQuery({
    queryKey: ['dashboard-cron'],
    queryFn: () => getCronJobs().catch(() => []),
  });

  const { data: skills } = useQuery({
    queryKey: ['dashboard-skills'],
    queryFn: () => getInstalledSkills().catch(() => []),
  });

  const { data: configSetupsSummary } = useQuery({
    queryKey: ['dashboard-config-setups', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return { setups: [], total: 0 };
      return getSavedConfigs(currentWorkspace.id).catch(() => ({ setups: [], total: 0 }));
    },
    enabled: !!currentWorkspace?.id,
  });

  const activeAgents = agents?.filter((a: any) => a.status === 'active') || [];
  const activeProjects = projects?.filter((p: any) => p.status === 'active') || [];

  const wsPrefix = currentWorkspace?.slug ? `/${currentWorkspace.slug}` : '';

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-3 mb-2">
          <span className="text-3xl">👋</span>
          Welcome back, {user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-gray-500 text-sm">
          Here's what's happening in {currentWorkspace?.name || 'your workspace'}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <Users size={20} className="text-green-500" />
            <span className="text-gray-400 text-sm">Active Agents</span>
          </div>
          <div className="text-3xl font-bold text-white">{activeAgents.length}</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <Target size={20} className="text-blue-500" />
            <span className="text-gray-400 text-sm">Active Projects</span>
          </div>
          <div className="text-3xl font-bold text-white">{activeProjects.length}</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <Wrench size={20} className="text-amber-500" />
            <span className="text-gray-400 text-sm">Active Skills</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {Array.isArray(skills) ? skills.filter((s: any) => s.isEnabled || s.installed).length : 0}
          </div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <CheckCircle size={20} className="text-purple-500" />
            <span className="text-gray-400 text-sm">Total Tasks</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {projects?.reduce((acc: number, p: any) => acc + (p.totalTasks || 0), 0) || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Active Projects</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: `${wsPrefix}/projects` })}>
                View all
              </Button>
            </div>
            <div className="p-4">
              {projectsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : activeProjects.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No active projects"
                  description="Create your first project to start organizing your work"
                  action={{
                    label: 'Create Project',
                    onClick: () => navigate({ to: `${wsPrefix}/projects`, search: { action: 'create' } })
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {activeProjects.slice(0, 5).map((project: any) => (
                    <ProjectItem key={project.id} project={project} wsPrefix={wsPrefix} />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-700">
              <h2 className="text-base font-semibold text-white">Recent Activity</h2>
            </div>
            <div className="p-4">
              {activitiesLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : !activities || activities.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No recent activity"
                  description="Activity will appear here when agents start working"
                />
              ) : (
                <div className="flex flex-col">
                  {activities.slice(0, 5).map((activity: any, index: number) => (
                    <ActivityItem
                      key={activity.id || index}
                      activity={activity}
                      isLast={index === activities.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Recent Devlogs</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: `${wsPrefix}/devlogs` })}>
                View all
              </Button>
            </div>
            <div className="p-4">
              {devlogsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : !devlogs || (Array.isArray(devlogs) && devlogs.length === 0) ? (
                <EmptyState
                  icon={BookOpen}
                  title="No recent devlogs"
                  description="Devlogs will appear here when agents complete work"
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {(Array.isArray(devlogs) ? devlogs : []).slice(0, 5).map((devlog: any) => (
                    <DevlogItem key={devlog.id} devlog={devlog} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Recent Scheduled</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: `${wsPrefix}/cron` })}>
                View all
              </Button>
            </div>
            <div className="p-4">
              {cronLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : !cronJobs || (Array.isArray(cronJobs) && cronJobs.length === 0) ? (
                <EmptyState
                  icon={Calendar}
                  title="No task is scheduled"
                  description="Schedule tasks to run automatically"
                  action={{
                    label: 'Create Schedule',
                    onClick: () => navigate({ to: `${wsPrefix}/cron`, search: { action: 'create' } })
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {(Array.isArray(cronJobs) ? cronJobs : []).filter((j: any) => j.enabled).slice(0, 5).map((job: any) => (
                    <CronJobItem key={job.id} job={job} />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-700">
              <h2 className="text-base font-semibold text-white">Quick Actions</h2>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/60 flex items-center justify-between">
                <span className="text-xs text-gray-300">
                  {configSetupsSummary?.total ?? 0} setups saved
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/config-builder' })}>
                  New Setup
                </Button>
              </div>
              <QuickAction
                icon={Plus}
                label="New Project"
                onClick={() => navigate({ to: `${wsPrefix}/projects`, search: { action: 'create' } })}
              />
              <QuickAction
                icon={Users}
                label="Manage Agents"
                onClick={() => navigate({ to: `${wsPrefix}/agents` })}
              />
              <QuickAction
                icon={Target}
                label="Command Center"
                onClick={() => navigate({ to: `${wsPrefix}/command-center` })}
              />
              <QuickAction
                icon={FileText}
                label="View Devlogs"
                onClick={() => navigate({ to: `${wsPrefix}/devlogs` })}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProjectItem({ project, wsPrefix }: { project: any; wsPrefix: string }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate({ to: `${wsPrefix}/projects/$projectId`, params: { projectId: project.id } })}
      className="p-3.5 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition-all duration-200"
      onMouseEnter={(e) => {
        e.currentTarget.classList.remove('bg-gray-800/50');
        e.currentTarget.classList.add('bg-gray-800');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.classList.remove('bg-gray-800');
        e.currentTarget.classList.add('bg-gray-800/50');
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-white">{project.name}</span>
        <span className="text-xs text-gray-500">{project.progress || 0}%</span>
      </div>
      <div className="h-1 bg-gray-700 rounded overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded transition-all duration-300"
          style={{ width: `${project.progress || 0}%` }}
        />
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: any; isLast?: boolean }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'agent_created': return <Users size={14} />;
      case 'task_completed': return <CheckCircle size={14} />;
      case 'task_created': return <FileText size={14} />;
      case 'agent_active': return <Zap size={14} />;
      default: return <Sparkles size={14} />;
    }
  };

  return (
    <div className="flex gap-3 py-3 border-b border-gray-700 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white mb-0.5">{activity.content}</p>
        <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
      </div>
    </div>
  );
}

function DevlogItem({ devlog }: { devlog: any }) {
  const categoryColors: Record<string, string> = {
    implementation: 'bg-blue-500/20 text-blue-400',
    bugfix: 'bg-red-500/20 text-red-400',
    refactor: 'bg-purple-500/20 text-purple-400',
    research: 'bg-emerald-500/20 text-emerald-400',
  };

  const categoryIcons: Record<string, string> = {
    implementation: '💻',
    bugfix: '🐛',
    refactor: '♻️',
    research: '🔬',
  };

  const colorClass = categoryColors[devlog.category] || 'bg-gray-500/20 text-gray-400';
  const icon = categoryIcons[devlog.category] || '📝';

  return (
    <div className="flex gap-3 py-2">
      <div className="text-lg flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-white truncate">{devlog.title}</span>
          <span className={`px-2 py-0.5 rounded text-xs capitalize ${colorClass}`}>
            {devlog.category}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {devlog.agentName && `by ${devlog.agentName} • `}
          {new Date(devlog.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function CronJobItem({ job }: { job: any }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${job.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
        <span className="text-sm text-white">{job.name}</span>
      </div>
      <span className="text-xs text-gray-500">{job.schedule}</span>
    </div>
  );
}

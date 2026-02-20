import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useState, useEffect } from 'react';
import { PageLayout, type PageConfig } from '../components/page-config/PageLayout';
import { Play, Pause, Trash2, Edit2, Clock, Calendar, Eye } from 'lucide-react';
import { toast } from 'sonner';

export const cronRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'cron',
  component: CronPage,
});

// Cron job type
interface CronJob {
  id: string;
  name: string;
  schedule: string;
  task: string;
  status: 'active' | 'disabled';
  nextRun: string;
  lastRun?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Default cron jobs - Using real ISO strings for dates
const defaultCronJobs: CronJob[] = [
  { id: '1', name: 'Agent Health Check', schedule: '*/15 * * * *', task: 'health-check', status: 'active', nextRun: new Date(Date.now() + 15 * 60000).toISOString(), lastRun: new Date(Date.now() - 3 * 60000).toISOString(), description: 'Periodic health check for all agents', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '2', name: 'Daily Backup', schedule: '0 0 * * *', task: 'backup', status: 'active', nextRun: new Date(Date.now() + 12 * 3600000).toISOString(), lastRun: new Date(Date.now() - 12 * 3600000).toISOString(), description: 'Full system backup', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '3', name: 'Weekly Report', schedule: '0 0 * * 0', task: 'weekly-report', status: 'disabled', nextRun: new Date(Date.now() + 3 * 86400000).toISOString(), lastRun: new Date(Date.now() - 4 * 86400000).toISOString(), description: 'Generate weekly analytics report', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '4', name: 'Cache Cleanup', schedule: '30 */6 * * *', task: 'cache-cleanup', status: 'active', nextRun: new Date(Date.now() + 5 * 3600000).toISOString(), lastRun: new Date(Date.now() - 1 * 3600000).toISOString(), description: 'Clean up expired cache files', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: '5', name: 'Daily Summary', schedule: '0 12 * * *', task: 'daily-summary', status: 'active', nextRun: new Date(Date.now() + 24 * 3600000).toISOString(), lastRun: new Date(Date.now() - 6 * 3600000).toISOString(), description: 'Daily activity summary', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

const formatSafeDate = (dateString: string | undefined): string => {
  if (!dateString || dateString === 'Calculating...') return 'Pending...';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? 'Not scheduled' : date.toLocaleString();
};

// Table columns for cron jobs
const columns = [
  {
    key: 'name', label: 'Name', sortable: true, render: (_: any, row: CronJob) => (
      <div>
        <div className="text-white text-sm font-medium">{row.name}</div>
        {row.description && (
          <div className="text-gray-500 text-xs mt-0.5">
            {row.description.length > 40 ? row.description.slice(0, 40) + '...' : row.description}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'schedule', label: 'Schedule', sortable: true, render: (value: string) => (
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-gray-400" />
        <span className="text-white text-sm font-mono">{value}</span>
      </div>
    )
  },
  {
    key: 'task', label: 'Task', sortable: true, render: (value: string) => (
      <span className="text-gray-400 text-sm capitalize">{value.replace('-', ' ')}</span>
    )
  },
  {
    key: 'status', label: 'Status', sortable: true, render: (value: string) => (
      <span className={`px-3 py-1 rounded-full text-xs capitalize ${value === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
        }`}>
        {value}
      </span>
    )
  },
  {
    key: 'nextRun', label: 'Next Run', sortable: false, render: (value: string) => (
      <span className="text-gray-400 text-sm">
        {formatSafeDate(value)}
      </span>
    )
  },
];

// Actions for cron jobs
const actions = [
  {
    label: 'View',
    icon: Eye,
    onClick: () => { }, // Handled by PageLayout
    variant: 'secondary' as const,
  },
  {
    label: 'Edit',
    icon: Edit2,
    onClick: () => { }, // Handled by PageLayout
    variant: 'secondary' as const,
  },
  {
    label: 'Toggle',
    icon: Pause,
    onClick: () => { }, // Handled by PageLayout component logic
    variant: 'secondary' as const,
    show: (row: CronJob) => row.status === 'active'
  },
  {
    label: 'Activate',
    icon: Play,
    onClick: () => { }, // Handled by PageLayout component logic
    variant: 'secondary' as const,
    show: (row: CronJob) => row.status === 'disabled'
  },
  {
    label: 'Delete',
    icon: Trash2,
    onClick: () => { }, // Handled by PageLayout
    variant: 'danger' as const,
  },
];

// Cron page config
const cronPageConfig: PageConfig = {
  stats: true,
  search: true,
  filter: true,
  dataDisplay: 'datatable',
  defaultView: 'table',
  showMultiView: true,
  multiViewOptions: ['grid', 'table'],
  importExport: false,
  addEditView: 'drawer' as const,

  pagination: true,
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50],

  sortable: true,
  defaultSortBy: 'name',
  defaultSortOrder: 'asc',

  columns,
  showActions: true,
  actions,

  labels: {
    title: 'Scheduler',
    subtitle: 'Manage automated cron jobs and scheduled tasks',
    searchPlaceholder: 'Search cron jobs...',
    emptyMessage: 'No cron jobs found',
    helpText: 'Cron jobs automate recurring tasks like backups and health checks',
  },

  icon: Calendar,

  statsConfig: {
    cards: [
      { id: 'total', label: 'Total Jobs', valueKey: 'totalJobs', icon: Clock, color: 'blue' as const, format: 'number' as const },
      { id: 'active', label: 'Active', valueKey: 'activeJobs', icon: Play, color: 'green' as const, format: 'number' as const },
      { id: 'disabled', label: 'Disabled', valueKey: 'disabledJobs', icon: Pause, color: 'amber' as const, format: 'number' as const },
      { id: 'tasks', label: 'Task Types', valueKey: 'taskTypes', icon: Calendar, color: 'purple' as const, format: 'number' as const },
    ],
  },

  filterOptions: [
    {
      key: 'status', label: 'All Status', options: [
        { value: 'active', label: 'Active' },
        { value: 'disabled', label: 'Disabled' },
      ]
    },
  ],

  formConfig: {
    fields: [
      { id: 'name', type: 'text', label: 'Job Name', placeholder: 'e.g. Database Backup', required: true },
      { id: 'description', type: 'textarea', label: 'Description', placeholder: 'What does this job do?' },
      { id: 'schedule', type: 'text', label: 'Cron Schedule', placeholder: '*/5 * * * *', required: true },
      {
        id: 'task', type: 'select', label: 'Task Type', required: true, options: [
          { value: 'health-check', label: 'Health Check' },
          { value: 'backup', label: 'System Backup' },
          { value: 'cache-cleanup', label: 'Cache Cleanup' },
          { value: 'weekly-report', label: 'Weekly Report' },
          { value: 'daily-summary', label: 'Daily Summary' },
        ]
      },
    ]
  },
};

function CronPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('openclaw_cron_jobs');
    if (saved) {
      try {
        setCronJobs(JSON.parse(saved));
      } catch (e) {
        setCronJobs(defaultCronJobs);
      }
    } else {
      setCronJobs(defaultCronJobs);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('openclaw_cron_jobs', JSON.stringify(cronJobs));
    }
  }, [cronJobs, isLoading]);

  const handleCreateCron = async (data: Record<string, any>) => {
    const newJob: CronJob = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      description: data.description,
      schedule: data.schedule,
      task: data.task || 'health-check',
      status: 'active',
      nextRun: new Date(Date.now() + 5 * 60000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCronJobs(prev => [newJob, ...prev]);
    toast.success('Cron job created');
  };

  const handleUpdateCron = async (id: string, data: Record<string, any>) => {
    setCronJobs(prev => prev.map(job =>
      job.id === id ? { ...job, ...data, updatedAt: new Date().toISOString() } as CronJob : job
    ));
    toast.success('Cron job updated');
  };

  const handleDeleteCron = async (item: CronJob) => {
    if (confirm(`Delete "${item.name}"?`)) {
      setCronJobs(prev => prev.filter(job => job.id !== item.id));
      toast.success('Cron job deleted');
    }
  };

  const handleToggleCron = (job: CronJob) => {
    const newStatus = job.status === 'active' ? 'disabled' : 'active';
    setCronJobs(prev => prev.map(j =>
      j.id === job.id ? { ...j, status: newStatus as 'active' | 'disabled' } : j
    ));
    toast.info(`Cron job ${newStatus === 'active' ? 'activated' : 'paused'}`);
  };

  const stats = {
    totalJobs: cronJobs.length,
    activeJobs: cronJobs.filter(j => j.status === 'active').length,
    disabledJobs: cronJobs.filter(j => j.status === 'disabled').length,
    taskTypes: new Set(cronJobs.map(j => j.task)).size,
  };

  // Custom Detail View
  const renderDetailView = (job: CronJob) => (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-2">Description</h4>
        <p className="text-white text-sm bg-white/5 p-4 rounded-xl border border-white/5">
          {job.description || 'No description provided.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1">Schedule</h4>
          <p className="text-white font-mono text-sm">{job.schedule}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1">Task Type</h4>
          <p className="text-white text-sm capitalize">{job.task.replace('-', ' ')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1">Next Run</h4>
          <p className="text-blue-400 text-sm">{formatSafeDate(job.nextRun)}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center">
          <div>
            <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1">Status</h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${job.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
              {job.status}
            </span>
          </div>
          <button
            onClick={() => handleToggleCron(job)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
          >
            {job.status === 'active' ? 'Pause Job' : 'Activate Job'}
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 text-[10px] text-gray-600 space-y-1">
        <p>Created: {formatSafeDate(job.createdAt)}</p>
        <p>Last Updated: {formatSafeDate(job.updatedAt)}</p>
        <p>Job ID: {job.id}</p>
      </div>
    </div>
  );

  // Custom Grid View - No outer grid container, just a map of elements
  const renderCustomGridView = (items: CronJob[], handlers: any) => (
    <>
      {items.map((job) => (
        <div
          key={job.id}
          className="bg-[#1a1a1c] border border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col h-full"
          onClick={() => handlers.handleView(job)}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${job.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                {job.status}
              </span>
              <h3 className="text-white font-semibold mt-1 group-hover:text-blue-400 transition-colors">{job.name}</h3>
            </div>
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => handleToggleCron(job)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={job.status === 'active' ? 'Pause' : 'Activate'}
              >
                {job.status === 'active' ? <Pause size={16} className="text-amber-400" /> : <Play size={16} className="text-green-400" />}
              </button>
              <button
                onClick={() => handlers.handleEdit(job)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit2 size={16} className="text-blue-400" />
              </button>
              <button
                onClick={() => handlers.handleDelete(job)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          </div>

          <div className="space-y-3 mt-auto">
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Schedule</p>
              <p className="text-white font-mono text-xs bg-white/5 p-2 rounded-lg mt-1 border border-white/5">
                {job.schedule}
              </p>
            </div>
            <div className="flex justify-between items-end pt-3 border-t border-white/5">
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Next Run</p>
                <p className="text-blue-400 text-[11px] mt-0.5">
                  {formatSafeDate(job.nextRun)}
                </p>
              </div>
              <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-md uppercase font-medium">
                {job.task}
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  );

  const config = {
    ...cronPageConfig,
    actions: cronPageConfig.actions?.map(a => {
      if (a.label === 'Toggle' || a.label === 'Activate') {
        return { ...a, onClick: (row: CronJob) => handleToggleCron(row) };
      }
      return a;
    })
  };

  return (
    <PageLayout
      config={config}
      data={cronJobs}
      stats={stats}
      loading={isLoading}
      onCreate={handleCreateCron}
      onUpdate={handleUpdateCron}
      onDelete={handleDeleteCron}
      renderDetailView={renderDetailView}
      renderCustomGridView={renderCustomGridView}
    />
  );
}

export default CronPage;

import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useQuery } from '@tanstack/react-query';
import { getSessions, Session } from '../lib/api';
import { PageLayout, type PageConfig } from '../components/page-config/PageLayout';
import { Zap, Clock, Activity, AlertCircle } from 'lucide-react';

export const sessionsRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'sessions',
  component: SessionsPage,
});

// Mock sessions for demo fallback
const mockSessions: Session[] = [
  { id: 'sess-001', agentId: 'Coding Wizard', status: 'active', createdAt: new Date(Date.now() - 45 * 60000).toISOString(), messages: 45 },
  { id: 'sess-002', agentId: 'Research Analyst', status: 'active', createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), messages: 23 },
  { id: 'sess-003', agentId: 'Saul Goodman', status: 'completed', createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), messages: 67 },
  { id: 'sess-004', agentId: 'Project Manager', status: 'error', createdAt: new Date(Date.now() - 48 * 3600000).toISOString(), messages: 12 },
  { id: 'sess-005', agentId: 'Security Expert', status: 'completed', createdAt: new Date(Date.now() - 72 * 3600000).toISOString(), messages: 34 },
];

// Table columns for sessions
const columns = [
  {
    key: 'agentId', label: 'Agent', sortable: true, render: (value: string) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Zap size={14} className="text-blue-400" />
        </div>
        <span className="text-white text-sm font-medium">{value || 'Unknown'}</span>
      </div>
    )
  },
  {
    key: 'status', label: 'Status', sortable: true, render: (value: string) => (
      <span className={`px-3 py-1 rounded-full text-xs capitalize ${value === 'active' ? 'bg-green-500/20 text-green-400' :
        value === 'completed' ? 'bg-blue-500/20 text-blue-400' :
          value === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-500/20 text-gray-400'
        }`}>
        {value || 'unknown'}
      </span>
    )
  },
  {
    key: 'duration', label: 'Duration', sortable: true, render: () => (
      <div className="flex items-center gap-1 text-gray-400 text-sm">
        <Clock size={14} />
        <span>-</span>
      </div>
    )
  },
  {
    key: 'messages', label: 'Messages', sortable: false, render: (value: number) => (
      <span className="text-white text-sm">{value || 0}</span>
    )
  },
  {
    key: 'createdAt', label: 'Started', sortable: true, render: (value: string) => (
      <span className="text-gray-400 text-sm">
        {value ? new Date(value).toLocaleString() : '-'}
      </span>
    )
  },
];

// Actions for sessions
const actions = [
  {
    label: 'View',
    icon: Activity,
    onClick: (row: Session) => {
      console.log('View session:', row.id);
    },
    variant: 'secondary' as const,
  },
];

// Session page config
const sessionsPageConfig: PageConfig = {
  stats: true,
  search: true,
  filter: false,
  dataDisplay: 'datatable',
  defaultView: 'table',
  showMultiView: false,
  multiViewOptions: ['grid', 'table'],
  importExport: false,
  addEditView: 'drawer' as const,

  pagination: true,
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50],

  sortable: true,
  defaultSortBy: 'startedAt',
  defaultSortOrder: 'desc',

  columns,

  showActions: true,
  actions,

  labels: {
    title: 'Sessions',
    subtitle: 'Monitor active and completed agent sessions',
    searchPlaceholder: 'Search sessions...',
    emptyMessage: 'No sessions found',
    helpText: 'Sessions appear when agents start working on tasks',
    paginationInfo: (start: number, end: number, total: number) => `Showing ${start} to ${end} of ${total} sessions`,
  },

  icon: Zap,

  statsConfig: {
    cards: [
      { id: 'total', label: 'Total Sessions', valueKey: 'totalSessions', icon: Zap, color: 'blue' as const, format: 'number' as const },
      { id: 'active', label: 'Active Sessions', valueKey: 'activeSessions', icon: Activity, color: 'green' as const, format: 'number' as const },
      { id: 'messages', label: 'Total Messages', valueKey: 'totalTokens', icon: Zap, color: 'purple' as const, format: 'number' as const },
      { id: 'duration', label: 'Avg Duration', valueKey: 'avgDuration', icon: Clock, color: 'amber' as const, format: 'number' as const },
    ],
  },

  // Custom Grid View
  renderCustomGridView: (items: Session[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((session) => (
        <div
          key={session.id}
          className="bg-[#1a1a1c] border border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-all cursor-pointer group"
          onClick={() => console.log('View session:', session.id)}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.status === 'active' ? 'bg-green-500/20' :
                session.status === 'completed' ? 'bg-blue-500/20' :
                  session.status === 'error' ? 'bg-red-500/20' :
                    'bg-gray-500/20'
                }`}>
                <Zap size={18} className={
                  session.status === 'active' ? 'text-green-400' :
                    session.status === 'completed' ? 'text-blue-400' :
                      session.status === 'error' ? 'text-red-400' :
                        'text-gray-400'
                } />
              </div>
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${session.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  session.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                    session.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                  }`}>
                  {session.status || 'unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Agent */}
          <div className="mb-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Agent</p>
            <p className="text-white font-medium">{session.agentId || 'Unknown'}</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
            <div>
              <p className="text-gray-500 text-xs">Messages</p>
              <p className="text-white font-medium">{session.messages || 0}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Started</p>
              <p className="text-white text-sm">
                {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  ),

};

// Custom Detail View
const renderSessionDetail = (session: Session) => (
  <div className="flex flex-col gap-6">
    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${session.status === 'active' ? 'bg-green-500/20' :
            session.status === 'completed' ? 'bg-blue-500/20' :
              session.status === 'error' ? 'bg-red-500/20' :
                'bg-gray-500/20'
            }`}>
            <Zap size={24} className={
              session.status === 'active' ? 'text-green-400' :
                session.status === 'completed' ? 'text-blue-400' :
                  session.status === 'error' ? 'text-red-400' :
                    'text-gray-400'
            } />
          </div>
          <div>
            <h3 className="text-white text-xl font-bold">{session.agentId || 'Unknown Agent'}</h3>
            <p className="text-gray-400 text-sm">Session ID: <span className="font-mono text-xs">{session.id}</span></p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${session.status === 'active' ? 'bg-green-500/20 text-green-400' :
          session.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
            session.status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
          }`}>
          {session.status || 'UNKNOWN'}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
        <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Metrics</h4>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Messages:</span>
            <span className="text-white font-medium">{session.messages || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Duration:</span>
            <span className="text-white font-medium">24m</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Tokens:</span>
            <span className="text-purple-400 font-mono">12.5k</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Cost:</span>
            <span className="text-green-400 font-mono">$0.05</span>
          </div>
        </div>
      </div>
      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
        <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Timing</h4>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Started:</span>
            <span className="text-white">
              {session.createdAt ? new Date(session.createdAt).toLocaleString() : '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Last Activity:</span>
            <span className="text-white">
              {session.createdAt ? new Date(new Date(session.createdAt).getTime() + 24 * 60000).toLocaleString() : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Messages Preview (Mock) */}
    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
      <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Recent Activity</h4>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center">
            <Zap size={12} className="text-blue-400" />
          </div>
          <div>
            <p className="text-gray-300 text-sm">Analyzed codebase structure and identified key components.</p>
            <span className="text-gray-600 text-[10px]">10 mins ago</span>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex-shrink-0 flex items-center justify-center">
            <Activity size={12} className="text-purple-400" />
          </div>
          <div>
            <p className="text-gray-300 text-sm">Generated implementation plan for new feature.</p>
            <span className="text-gray-600 text-[10px]">15 mins ago</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

function SessionsPage() {
  const { data: apiSessions = [], isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => getSessions(),
  });

  // Use mock data if API returns empty during demo/dev
  const sessions = apiSessions.length > 0 ? apiSessions : (isLoading ? [] : mockSessions);

  // Calculate stats
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter((s: Session) => s.status === 'active').length;
  const totalMessages = sessions.reduce((acc: number, s: Session) => acc + (s.messages || 0), 0);

  const transformedStats = {
    totalSessions,
    activeSessions,
    totalTokens: totalMessages,
    avgDuration: '24m',
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load sessions</h2>
          <p className="text-gray-400">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      config={sessionsPageConfig}
      data={sessions}
      stats={transformedStats}
      loading={isLoading}
      renderDetailView={renderSessionDetail}
      renderCustomGridView={sessionsPageConfig.renderCustomGridView}
    />
  );
}

export default SessionsPage;

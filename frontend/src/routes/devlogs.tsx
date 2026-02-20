import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { PageLayout, type PageConfig } from '../components/page-config/PageLayout';
import {
  FileText,

  TrendingUp,
  Layers,
  Star,
} from 'lucide-react';

export const devlogsRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'devlogs',
  component: DevlogsPage,
});

interface Devlog {
  id: string;
  title: string;
  content: string;
  category: 'implementation' | 'bugfix' | 'refactor' | 'research';
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  tokensUsed: number;
  sessionDuration: number;
  isMilestone: boolean;
  createdAt: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'implementation': return '💻';
    case 'bugfix': return '🐛';
    case 'refactor': return '♻️';
    case 'research': return '🔬';
    default: return '📝';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'implementation': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' };
    case 'bugfix': return { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171' };
    case 'refactor': return { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc' };
    case 'research': return { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24' };
    default: return { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af' };
  }
};

// Table columns for devlogs
const columns = [
  {
    key: 'title', label: 'Title', sortable: true, render: (_: any, row: Devlog) => (
      <div className="flex items-center gap-3">
        <span style={{ fontSize: '20px' }}>{getCategoryIcon(row.category)}</span>
        <div>
          <div className="text-white text-sm font-medium">{row.title}</div>
          <div className="text-gray-500 text-xs">
            {row.content.length > 40 ? row.content.slice(0, 40) + '...' : row.content}
          </div>
        </div>
      </div>
    )
  },
  {
    key: 'category', label: 'Category', sortable: true, render: (value: string) => {
      const catStyle = getCategoryColor(value);
      return (
        <span
          className="px-3 py-1 rounded-full text-xs capitalize"
          style={{ background: catStyle.bg, color: catStyle.text }}
        >
          {value}
        </span>
      );
    }
  },
  {
    key: 'isMilestone', label: 'Milestone', sortable: false, render: (value: boolean) => value ? (
      <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400 flex items-center gap-1">
        <Star size={12} /> Milestone
      </span>
    ) : null
  },
  {
    key: 'files', label: 'Files', sortable: false, render: (_: any, row: Devlog) => (
      <span className="text-white text-sm">{row.filesChanged.length}</span>
    )
  },
  {
    key: 'lines', label: 'Lines', sortable: false, render: (_: any, row: Devlog) => (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-400">+{row.linesAdded}</span>
        <span className="text-red-400">-{row.linesRemoved}</span>
      </div>
    )
  },
  {
    key: 'tokens', label: 'Tokens', sortable: false, render: (value: number) => (
      <span className="text-white text-sm font-mono">{(value / 1000).toFixed(1)}k</span>
    )
  },
  {
    key: 'sessionDuration', label: 'Duration', sortable: false, render: (value: number) => (
      <span className="text-gray-400 text-sm">{value || 0}m</span>
    )
  },
  {
    key: 'createdAt', label: 'Date', sortable: true, render: (value: string) => (
      <span className="text-gray-400 text-sm">
        {new Date(value).toLocaleDateString()}
      </span>
    )
  },
];

// Actions for devlogs
const actions = [
  {
    label: 'View',
    icon: FileText,
    onClick: (row: Devlog) => {
      console.log('View devlog:', row.id);
    },
    variant: 'secondary' as const,
  },
];

// Devlogs page config
const devlogsPageConfig: PageConfig = {
  stats: true,
  search: true,
  filter: true,
  dataDisplay: 'datatable',
  defaultView: 'table',
  showMultiView: false,
  multiViewOptions: ['grid', 'table'],
  importExport: false,
  // Devlogs are read-only logs from agents
  showActions: true,

  pagination: true,
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50],

  sortable: true,
  defaultSortBy: 'createdAt',
  defaultSortOrder: 'desc',

  columns,


  actions,

  labels: {
    title: 'Devlogs',
    subtitle: 'Project development activity and milestones',
    searchPlaceholder: 'Search project logs...',
    emptyMessage: 'No devlogs found',
    helpText: 'Devlogs record development work, milestones, and project achievements',
    paginationInfo: (start: number, end: number, total: number) => `Showing ${start} to ${end} of ${total} devlogs`,
  },

  icon: FileText,

  statsConfig: {
    cards: [
      { id: 'total', label: 'Total Devlogs', valueKey: 'totalDevlogs', icon: FileText, color: 'blue' as const, format: 'number' as const },
      { id: 'milestones', label: 'Milestones', valueKey: 'milestones', icon: Star, color: 'amber' as const, format: 'number' as const },
      { id: 'lines', label: 'Lines Added', valueKey: 'linesAdded', icon: TrendingUp, color: 'green' as const, format: 'number' as const },
      { id: 'tokens', label: 'Tokens Used', valueKey: 'tokensUsed', icon: Layers, color: 'purple' as const, format: 'tokens' as const },
    ],
  },

  filterOptions: [
    {
      key: 'category', label: 'All Categories', options: [
        { value: 'implementation', label: 'Implementation' },
        { value: 'bugfix', label: 'Bugfix' },
        { value: 'refactor', label: 'Refactor' },
        { value: 'research', label: 'Research' },
      ]
    },
  ],
};

function DevlogsPage() {
  const { data: devlogs = [], isLoading } = useQuery({
    queryKey: ['devlogs'],
    queryFn: () => apiGet<Devlog[]>('/devlogs').catch(() => []),
  });

  // Mock devlogs for demo
  const mockDevlogs: Devlog[] = [
    {
      id: 'devlog-001',
      title: 'Implemented project progress bars',
      content: 'Added visual progress indicators to the projects page. Each project now shows completion percentage with a progress bar.',
      category: 'implementation',
      filesChanged: ['projects.tsx', 'dashboard.tsx', 'styles.css'],
      linesAdded: 245,
      linesRemoved: 32,
      tokensUsed: 45000,
      sessionDuration: 180,
      isMilestone: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'devlog-002',
      title: 'API Performance Optimization Complete',
      content: 'Successfully reduced API response times by 60% through query optimization and caching.',
      category: 'refactor',
      filesChanged: ['api.ts', 'cache.ts', 'queries.sql'],
      linesAdded: 189,
      linesRemoved: 456,
      tokensUsed: 32000,
      sessionDuration: 240,
      isMilestone: true,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'devlog-003',
      title: 'Fixed authentication token refresh bug',
      content: 'Resolved issue where tokens were not refreshing properly, causing users to be logged out unexpectedly.',
      category: 'bugfix',
      filesChanged: ['auth.ts', 'middleware.ts'],
      linesAdded: 45,
      linesRemoved: 12,
      tokensUsed: 15000,
      sessionDuration: 90,
      isMilestone: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'devlog-004',
      title: 'Dashboard Redesign v2 Launched',
      content: 'Successfully deployed the new dashboard design with improved UX and performance.',
      category: 'implementation',
      filesChanged: ['dashboard.tsx', 'layout.tsx', 'sidebar.tsx', 'widgets.tsx'],
      linesAdded: 1250,
      linesRemoved: 890,
      tokensUsed: 125000,
      sessionDuration: 480,
      isMilestone: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'devlog-005',
      title: 'Research: AI Agent Memory Systems',
      content: 'Explored different approaches to implementing persistent memory for AI agents.',
      category: 'research',
      filesChanged: ['research.md'],
      linesAdded: 890,
      linesRemoved: 45,
      tokensUsed: 89000,
      sessionDuration: 360,
      isMilestone: false,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Use API data or fallback to mock data
  const displayData = devlogs.length > 0 ? devlogs : mockDevlogs;

  // Calculate stats
  const totalDevlogs = displayData.length;
  const milestones = displayData.filter((d: Devlog) => d.isMilestone).length;
  const linesAdded = displayData.reduce((acc: number, d: Devlog) => acc + d.linesAdded, 0);
  const tokensUsed = displayData.reduce((acc: number, d: Devlog) => acc + d.tokensUsed, 0);

  const transformedStats = {
    totalDevlogs,
    milestones,
    linesAdded,
    tokensUsed,
  };

  return (
    <PageLayout
      config={devlogsPageConfig}
      data={displayData}
      stats={transformedStats}
      loading={isLoading}
      renderDetailView={renderDevlogDetail}
      renderCustomGridView={devlogsPageConfig.renderCustomGridView}
    />
  );
}

// Custom Detail View
const renderDevlogDetail = (devlog: Devlog) => (
  <div className="flex flex-col gap-6">
    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getCategoryColor(devlog.category).bg.replace('0.2', '0.3')}`} style={{ color: getCategoryColor(devlog.category).text }}>
          {getCategoryIcon(devlog.category)} {devlog.category}
        </span>
        {devlog.isMilestone && (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-400 flex items-center gap-1">
            <Star size={12} /> Milestone
          </span>
        )}
      </div>
      <h3 className="text-white text-xl font-bold mb-4">{devlog.title}</h3>
      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
        {devlog.content}
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
        <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-2">Metrics</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Files Changed:</span>
            <span className="text-white font-medium">{devlog.filesChanged.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Lines Added:</span>
            <span className="text-green-400">+{devlog.linesAdded}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Lines Removed:</span>
            <span className="text-red-400">-{devlog.linesRemoved}</span>
          </div>
        </div>
      </div>
      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
        <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-2">Session Info</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Duration:</span>
            <span className="text-white font-medium">{devlog.sessionDuration}m</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Tokens Used:</span>
            <span className="text-purple-400 font-mono">{(devlog.tokensUsed / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Date:</span>
            <span className="text-white">{new Date(devlog.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
      <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-2">Changed Files</h4>
      <div className="flex flex-wrap gap-2">
        {devlog.filesChanged.map(file => (
          <span key={file} className="px-2 py-1 bg-white/5 border border-white/10 rounded font-mono text-xs text-blue-400">
            {file}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default DevlogsPage;

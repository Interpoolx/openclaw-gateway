import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useQuery } from '@tanstack/react-query';
import { getInstalledSkills, InstalledSkill } from '../lib/api';
import { PageLayout, type PageConfig } from '../components/page-config/PageLayout';
import {
  Package,
  Trash2,
  Shield,
  Globe,
  Settings,
  Tag,
  User,
  Terminal,
  Zap,
  BookOpen,
  Code,
  Box,
  Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

export const skillsRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'skills',
  component: SkillsPage,
});

const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'coding': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' };
    case 'productivity': return { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80' };
    case 'marketing': return { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc' };
    case 'tools': return { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24' };
    case 'creative': return { bg: 'rgba(236, 72, 153, 0.2)', text: '#f472b6' };
    case 'web': return { bg: 'rgba(6, 182, 212, 0.2)', text: '#22d3ee' };
    default: return { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af' };
  }
};

// Table columns for skills
const columns = [
  {
    key: 'name', label: 'Skill', sortable: true, render: (_: any, row: InstalledSkill) => (
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${row.category === 'coding' ? 'bg-blue-500/10' :
          row.category === 'tools' ? 'bg-amber-500/10' :
            row.category === 'creative' ? 'bg-purple-500/10' :
              'bg-gray-500/10'
          }`}>
          <Package size={20} className={
            row.category === 'coding' ? 'text-blue-400' :
              row.category === 'tools' ? 'text-amber-400' :
                row.category === 'creative' ? 'text-purple-400' :
                  'text-gray-400'
          } />
        </div>
        <div>
          <div className="text-white text-sm font-medium">{row.name}</div>
          {row.description && (
            <div className="text-gray-500 text-xs mt-0.5">
              {row.description.length > 40 ? row.description.slice(0, 40) + '...' : row.description}
            </div>
          )}
        </div>
      </div>
    )
  },
  {
    key: 'category', label: 'Category', sortable: true, render: (value: string | undefined) => {
      const catStyle = getCategoryColor(value);
      return (
        <span
          className="px-2.5 py-1 rounded-md text-xs font-medium capitalize"
          style={{ background: catStyle.bg, color: catStyle.text }}
        >
          {value || 'General'}
        </span>
      );
    }
  },
  {
    key: 'version', label: 'Version', sortable: true, render: (value: string) => (
      <span className="text-gray-400 text-sm font-mono bg-white/5 px-2 py-0.5 rounded text-xs">{value || '1.0.0'}</span>
    )
  },
  {
    key: 'author', label: 'Author', sortable: false, render: (value: string) => (
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">
          {value ? value.charAt(0).toUpperCase() : 'U'}
        </div>
        <span className="text-gray-400 text-sm">{value || 'Unknown'}</span>
      </div>
    )
  },
  {
    key: 'installDate', label: 'Installed', sortable: true, render: (value: string) => (
      <span className="text-gray-500 text-xs">
        {value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
      </span>
    )
  },
];

// Actions for skills
const actions = [
  {
    label: 'Settings',
    icon: Settings,
    onClick: (row: InstalledSkill) => {
      console.log('Open settings for:', row.id);
    },
    variant: 'secondary' as const,
  },
  {
    label: 'Uninstall',
    icon: Trash2,
    onClick: (row: InstalledSkill) => {
      console.log('Uninstall skill:', row.id);
    },
    variant: 'danger' as const,
  },
];



// Detail View Component
const SkillDetailView = ({ skill }: { skill: InstalledSkill }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'dependencies' | 'instructions'>('overview');

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b] text-white">
      {/* Detail Header */}
      <div className="p-6 border-b border-white/5 bg-[#111113]">
        <div className="flex items-start gap-5">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${skill.category === 'coding' ? 'bg-blue-500/10 text-blue-400' :
            skill.category === 'tools' ? 'bg-amber-500/10 text-amber-400' :
              skill.category === 'creative' ? 'bg-purple-500/10 text-purple-400' :
                'bg-gray-800 text-gray-400'
            }`}>
            <Package size={40} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
              {skill.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-xs font-mono">v{skill.version}</span>
              <span className="flex items-center gap-1.5"><User size={14} /> {skill.author}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className="flex items-center gap-1.5"><Globe size={14} /> {skill.source || 'Local'}</span>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${skill.securityStatus === 'verified'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                {skill.securityStatus === 'verified' ? <Shield size={12} className="inline mr-1" /> : null}
                {skill.securityStatus}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${skill.category === 'coding' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                skill.category === 'tools' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  skill.category === 'creative' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                    'bg-gray-500/10 border-gray-500/20 text-gray-400'
                }`}>
                {skill.category}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button className="flex-1 bg-white text-black font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
            Configure
          </button>
          <button className="flex-1 bg-white/5 text-white font-medium py-2 px-4 rounded-lg hover:bg-white/10 transition-colors border border-white/10">
            Check Updates
          </button>
          <button className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-[#0a0a0b] px-6">
        {[
          { id: 'overview', icon: Layers, label: 'Overview' },
          { id: 'dependencies', icon: Box, label: 'Dependencies' },
          { id: 'instructions', icon: BookOpen, label: 'Instructions' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">About this Skill</h3>
              <p className="text-gray-400 leading-relaxed text-sm">
                {skill.description || "No description provided."}
              </p>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111113] p-4 rounded-xl border border-white/5">
                <div className="text-gray-500 text-xs mb-1">Installed</div>
                <div className="text-white font-medium">{new Date(skill.installDate).toLocaleDateString()}</div>
              </div>
              <div className="bg-[#111113] p-4 rounded-xl border border-white/5">
                <div className="text-gray-500 text-xs mb-1">Last Used</div>
                <div className="text-white font-medium">{skill.lastUsed ? new Date(skill.lastUsed).toLocaleDateString() : 'Never'}</div>
              </div>
            </div>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Tag size={18} className="text-gray-500" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {['agent', 'tool', skill.category].map((tag, i) => (
                  tag && <span key={i} className="bg-white/5 text-gray-400 px-3 py-1 rounded-full text-xs border border-white/5">#{tag}</span>
                ))}
              </div>
            </section>

          </div>
        )}

        {activeTab === 'dependencies' && (
          <div className="space-y-6 animate-fadeIn">
            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Environment Variables</h3>
              {skill.dependencies?.env && skill.dependencies.env.length > 0 ? (
                <div className="space-y-2">
                  {skill.dependencies.env.map(env => (
                    <div key={env} className="flex items-center justify-between bg-[#111113] p-3 rounded-lg border border-white/5">
                      <code className="text-blue-400 font-mono text-sm">{env}</code>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">Required</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm italic">No environment variables required.</div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Binaries / Tools</h3>
              {skill.dependencies?.bins && skill.dependencies.bins.length > 0 ? (
                <div className="space-y-2">
                  {skill.dependencies.bins.map(bin => (
                    <div key={bin} className="flex items-center gap-3 bg-[#111113] p-3 rounded-lg border border-white/5">
                      <Terminal size={18} className="text-gray-500" />
                      <code className="text-green-400 font-mono text-sm">{bin}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm italic">No external binaries required.</div>
              )}
            </section>

            <section className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
              <div className="flex items-center gap-3 mb-2">
                <Zap size={18} className="text-blue-400" />
                <h3 className="text-blue-400 font-medium text-sm">Background Processing</h3>
              </div>
              <p className="text-gray-400 text-xs">
                {skill.dependencies?.bg_process
                  ? "This skill requires a background process to function optimally. It may consume more resources."
                  : "This skill runs on-demand and does not require a persistent background process."}
              </p>
            </section>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="prose prose-invert prose-sm max-w-none animate-fadeIn">
            {skill.instructions ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {skill.instructions}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <BookOpen size={48} strokeWidth={1} className="mb-4 opacity-50" />
                <p>No instructions available for this skill.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


// Skills page config
const skillsPageConfig: PageConfig = {
  stats: true,
  search: true,
  filter: true,
  dataDisplay: 'datatable',
  defaultView: 'grid', // Switch default to grid for premium feel
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
    title: 'Skills Market',
    subtitle: 'Capabilities and tools to supercharge your agents',
    searchPlaceholder: 'Search for capabilities (e.g. "code", "web")...',
    emptyMessage: 'No skills installed',
    helpText: 'Skills are modular capabilities that can be installed to give your agents new powers.',
    paginationInfo: (start: number, end: number, total: number) => `Showing ${start}-${end} of ${total}`,
    addButton: 'Install Skill'
  },

  icon: Package,

  statsConfig: {
    cards: [
      { id: 'total', label: 'Installed', valueKey: 'totalSkills', icon: Package, color: 'blue' as const, format: 'number' as const },
      { id: 'coding', label: 'Coding', valueKey: 'codingSkills', icon: Code, color: 'blue' as const, format: 'number' as const },
      { id: 'tools', label: 'Tools', valueKey: 'toolsSkills', icon: Terminal, color: 'amber' as const, format: 'number' as const },
      { id: 'creative', label: 'Creative', valueKey: 'creativeSkills', icon: Zap, color: 'purple' as const, format: 'number' as const },
    ],
  },

  filterOptions: [
    {
      key: 'category', label: 'All Categories', options: [
        { value: 'coding', label: 'Coding' },
        { value: 'productivity', label: 'Productivity' },
        { value: 'tools', label: 'Tools' },
        { value: 'creative', label: 'Creative' },
        { value: 'marketing', label: 'Marketing' },
      ]
    },
  ],

  // Wire up the new Detail View
  renderDetailView: (skill: InstalledSkill) => <SkillDetailView skill={skill} />,

  // Premium Grid View
  renderCustomGridView: (items: InstalledSkill[], handlers) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((skill) => (
        <div
          key={skill.id}
          className="group relative bg-[#1a1a1c] border border-white/5 rounded-2xl p-5 hover:bg-[#202022] hover:border-white/10 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-1"
          onClick={() => handlers.handleView(skill)}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${skill.category === 'coding' ? 'bg-blue-500/10 text-blue-400' :
              skill.category === 'tools' ? 'bg-amber-500/10 text-amber-400' :
                skill.category === 'creative' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-gray-500/10 text-gray-400'
              }`}>
              {/* Dynamic Icon based on Category */}
              {skill.category === 'coding' ? <Code size={22} /> :
                skill.category === 'tools' ? <Terminal size={22} /> :
                  skill.category === 'creative' ? <Zap size={22} /> :
                    <Package size={22} />}
            </div>

            {/* Status Pill */}
            <div className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${skill.securityStatus === 'verified'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
              {skill.securityStatus === 'verified' ? <Shield size={10} className="inline mr-1" /> : null}
              {skill.securityStatus}
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <h3 className="text-white font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">
              {skill.name}
            </h3>
            <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
              {skill.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-400 font-mono">v{skill.version}</span>
              <span>by {skill.author || "Unknown"}</span>
            </div>

            {/* Category Tag */}
            <span className={`px-2 py-0.5 rounded capitalize ${skill.category === 'coding' ? 'bg-blue-500/10 text-blue-400' :
              skill.category === 'tools' ? 'bg-amber-500/10 text-amber-400' :
                skill.category === 'creative' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-gray-500/10 text-gray-400'
              }`}>
              {skill.category}
            </span>
          </div>

        </div>
      ))}
    </div>
  ),
};

function SkillsPage() {
  const { data: installedSkills = [], isLoading } = useQuery({
    queryKey: ['installed-skills'],
    queryFn: getInstalledSkills,
  });

  // Use API data or fallback to mock data
  // Use API data
  const displayData = installedSkills;

  // Calculate stats
  const totalSkills = displayData.length;
  const codingSkills = displayData.filter((s: InstalledSkill) => s.category?.toLowerCase() === 'coding').length;
  const toolsSkills = displayData.filter((s: InstalledSkill) => s.category?.toLowerCase() === 'tools').length;
  const creativeSkills = displayData.filter((s: InstalledSkill) => s.category?.toLowerCase() === 'creative').length;

  const transformedStats = {
    totalSkills,
    codingSkills,
    toolsSkills,
    creativeSkills,
  };

  return (
    <PageLayout
      config={skillsPageConfig}
      data={displayData}
      stats={transformedStats}
      loading={isLoading}
      title="Skills Market" // Override title
    />
  );
}

export default SkillsPage;

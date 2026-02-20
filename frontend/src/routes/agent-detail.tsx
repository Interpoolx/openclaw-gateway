import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useQuery } from '@tanstack/react-query';
import { AgentFiles } from '../components/AgentFiles';
import { HeartbeatSettings } from '../components/HeartbeatSettings';
import { getAgent, Agent } from '../lib/api';
import { Wrench, FileText, Activity, History, BarChart3, Clock, Layers, TrendingUp, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const agentDetailRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'agents/$agentId',
  component: AgentDetailPage,
}) as any;

function AgentDetailPage() {
  const params = agentDetailRoute.useParams();
  const agentId = params.agentId;
  const [activeTab, setActiveTab] = useState('files');
  const { user } = useAuth();

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => getAgent(agentId),
    retry: false,
  });

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Agent not found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>The agent you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'files', label: 'Files', icon: React.createElement(FileText, { className: "w-4 h-4" }) },
    { id: 'heartbeat', label: 'Heartbeat', icon: React.createElement(Heart, { className: "w-4 h-4" }) },
    { id: 'tools', label: 'Tools', icon: React.createElement(Wrench, { className: "w-4 h-4" }) },
    { id: 'sessions', label: 'Sessions', icon: React.createElement(Activity, { className: "w-4 h-4" }) },
    { id: 'devlogs', label: 'Devlogs', icon: React.createElement(History, { className: "w-4 h-4" }) },
    { id: 'stats', label: 'Stats', icon: React.createElement(BarChart3, { className: "w-4 h-4" }) },
  ];

  return (
    <div className="agent-detail" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* Agent Header */}
        <div className="agent-header" style={{ display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '48px', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: '12px' }}>
            {agent.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>{agent.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
              {agent.description || 'No description provided'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
              color: 'var(--accent-yellow)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              {agent.level || 'junior'}
            </span>
            <span style={{
              background: getStatusBg(agent.status),
              color: 'white',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              {agent.status || 'idle'}
            </span>
          </div>
        </div>

        <div className="agent-tabs" style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 500 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'files' && (
          <AgentFiles agentId={agentId} isDemo={user?.isDemo} />
        )}
        {activeTab === 'heartbeat' && (
          <HeartbeatSettings agentId={agentId} agentName={agent.name} isDemo={user?.isDemo} />
        )}
        {activeTab === 'tools' && React.createElement(ToolsTabContent, { agent })}
        {activeTab === 'sessions' && React.createElement(SessionsTabContent, { agentId })}
        {activeTab === 'devlogs' && React.createElement(DevlogsTabContent, { agentId })}
        {activeTab === 'stats' && React.createElement(StatsTabContent, { agent })}
      </div>
    );
  }

interface ToolsTabContentProps {
  readonly agent: Agent;
}

function ToolsTabContent({ agent }: ToolsTabContentProps) {
  const [selectedPreset, setSelectedPreset] = useState('potato');
  const enabledTools = agent.tools?.enabled || [];

  const presets = [
    { id: 'potato', name: '🥔 Potato', description: 'Minimal access', tools: ['session_status'] },
    { id: 'coding', name: '💻 Coding', description: 'Files, exec, sessions, memory', tools: ['read', 'write', 'edit', 'exec', 'session_status', 'memory_search', 'memory_get'] },
    { id: 'messaging', name: '💬 Messaging', description: 'Message + sessions', tools: ['sessions_send', 'sessions_list', 'session_status'] },
    { id: 'full', name: '🔥 Full', description: 'Everything', tools: [] },
  ];

  const toolCategories = [
    {
      name: 'Filesystem', id: 'fs', tools: [
        { id: 'read', name: 'read', description: 'Read files' },
        { id: 'write', name: 'write', description: 'Write files' },
        { id: 'edit', name: 'edit', description: 'Edit files' },
        { id: 'apply_patch', name: 'apply_patch', description: 'Apply patches' },
      ]
    },
    {
      name: 'Runtime', id: 'runtime', tools: [
        { id: 'exec', name: 'exec', description: 'Execute commands' },
        { id: 'process', name: 'process', description: 'Manage processes' },
      ]
    },
    {
      name: 'Web', id: 'web', tools: [
        { id: 'web_search', name: 'web_search', description: 'Search the web' },
        { id: 'web_fetch', name: 'web_fetch', description: 'Fetch web content' },
      ]
    },
    {
      name: 'Memory', id: 'memory', tools: [
        { id: 'memory_search', name: 'memory_search', description: 'Semantic search' },
        { id: 'memory_get', name: 'memory_get', description: 'Read memory' },
      ]
    },
    {
      name: 'Sessions', id: 'sessions', tools: [
        { id: 'session_status', name: 'session_status', description: 'View session status' },
        { id: 'sessions_list', name: 'sessions_list', description: 'List sessions' },
        { id: 'sessions_history', name: 'sessions_history', description: 'Get history' },
        { id: 'sessions_send', name: 'sessions_send', description: 'Send messages' },
        { id: 'sessions_spawn', name: 'sessions_spawn', description: 'Spawn sub-agent' },
        { id: 'agents_list', name: 'agents_list', description: 'List agents' },
      ]
    },
    {
      name: 'UI', id: 'ui', tools: [
        { id: 'browser', name: 'browser', description: 'Control browser' },
        { id: 'canvas', name: 'canvas', description: 'Node-canvas' },
      ]
    },
  ];

  const isToolEnabled = (toolId: string) => {
    if (selectedPreset === 'full') return true;
    const preset = presets.find(p => p.id === selectedPreset);
    if (preset && preset.tools.length > 0) {
      return preset.tools.includes(toolId);
    }
    return enabledTools.includes(toolId);
  };

  return (
    <div className="tool-section" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Tool Access</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>
            {enabledTools.length}/24 tools enabled
          </span>
          <button style={{ padding: '6px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Enable All</button>
          <button style={{ padding: '6px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Disable All</button>
        </div>
      </div>

      <div className="quick-presets" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Quick Presets</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
              style={{
                background: selectedPreset === preset.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                border: `1px solid ${selectedPreset === preset.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px', color: selectedPreset === preset.id ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: '13px' }}>{preset.name}</div>
              <div style={{ fontSize: '11px', color: selectedPreset === preset.id ? 'var(--accent-primary)' : 'var(--text-dim)', opacity: 0.8 }}>{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="tool-categories" style={{ display: 'grid', gap: '16px' }}>
        {toolCategories.map((category) => (
          <div key={category.id} style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>{category.name}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {category.tools.map((tool) => (
                <label
                  key={tool.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: isToolEnabled(tool.id) ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    border: `1px solid ${isToolEnabled(tool.id) ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-subtle)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isToolEnabled(tool.id)}
                    onChange={() => { }}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{tool.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{tool.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SessionsTabContentProps {
  readonly agentId: string;
}

function SessionsTabContent({ agentId: _agentId }: SessionsTabContentProps) {
  // Mock sessions data for this agent
  const sessions = [
    {
      id: 'session-001',
      status: 'active',
      messages: 45,
      inputTokens: 125000,
      outputTokens: 85000,
      cost: 3.25,
      startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      duration: 2700,
    },
    {
      id: 'session-002',
      status: 'completed',
      messages: 67,
      inputTokens: 180000,
      outputTokens: 120000,
      cost: 4.80,
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      duration: 5400,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sessions.map((session) => (
        <div key={session.id} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                textTransform: 'uppercase',
                background: session.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: session.status === 'active' ? '#22c55e' : '#3b82f6',
              }}>
                {session.status}
              </span>
              <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Session #{session.id.slice(-6)}
              </span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              {new Date(session.startedAt).toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>{session.messages}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Messages</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
                {((session.inputTokens + session.outputTokens) / 1000).toFixed(1)}k
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>Tokens</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>${session.cost.toFixed(2)}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Cost</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
                {Math.floor(session.duration / 60)}m
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>Duration</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface DevlogsTabContentProps {
  readonly agentId: string;
}

function DevlogsTabContent({ agentId: _agentId }: DevlogsTabContentProps) {
  const devlogs = [
    {
      id: 'devlog-001',
      title: 'Implemented dashboard progress bars',
      content: 'Added visual progress indicators to the tracks page.',
      category: 'implementation',
      filesChanged: ['tracks.tsx', 'dashboard.tsx'],
      linesAdded: 245,
      linesRemoved: 32,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'devlog-002',
      title: 'Fixed authentication token refresh bug',
      content: 'Resolved issue where tokens were not refreshing properly.',
      category: 'bugfix',
      filesChanged: ['auth.ts', 'middleware.ts'],
      linesAdded: 45,
      linesRemoved: 12,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'implementation': return '💻';
      case 'bugfix': return '🐛';
      case 'refactor': return '♻️';
      case 'research': return '🔬';
      default: return '📝';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {devlogs.map((devlog) => (
        <div key={devlog.id} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span>{getCategoryIcon(devlog.category)}</span>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{devlog.title}</h4>
            <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', color: '#888', borderRadius: '4px', textTransform: 'capitalize' }}>
              {devlog.category}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '12px' }}>{devlog.content}</p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666' }}>
            <span>{devlog.filesChanged.length} files changed</span>
            <span style={{ color: '#22c55e' }}>+{devlog.linesAdded}</span>
            <span style={{ color: '#ef4444' }}>-{devlog.linesRemoved}</span>
            <span>{new Date(devlog.createdAt).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface StatsTabContentProps {
  readonly agent: Agent;
}

function StatsTabContent({ agent }: StatsTabContentProps) {
  const stats = {
    totalSessions: 24,
    totalTokens: 2850000,
    totalCost: 45.75,
    avgSessionTime: 45,
    successRate: 96,
    toolsUsed: agent.tools?.enabled?.length || 0,
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '13px', color: '#666' }}>Total Sessions</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{stats.totalSessions}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Layers size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '13px', color: '#666' }}>Total Tokens</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{(stats.totalTokens / 1000).toFixed(0)}k</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <TrendingUp size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '13px', color: '#666' }}>Total Cost</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>${stats.totalCost.toFixed(2)}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Clock size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '13px', color: '#666' }}>Avg Session</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{stats.avgSessionTime}m</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={18} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: '13px', color: '#666' }}>Success Rate</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{stats.successRate}%</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Wrench size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '13px', color: '#666' }}>Tools Enabled</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{stats.toolsUsed}</div>
        </div>
      </div>
    </div>
  );
}

function getStatusBg(status: string): string {
  switch (status) {
    case 'active': return '#22c55e';
    case 'busy': return '#f59e0b';
    case 'offline': return '#71717a';
    default: return '#3b82f6';
  }
}

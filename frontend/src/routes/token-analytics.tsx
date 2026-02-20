import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { Layout } from '../components/Layout';
import { useState } from 'react';
import { 
  TrendingUp,
  DollarSign,
  Activity,
  Bot,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const tokenAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'analytics/token',
  component: TokenAnalyticsPage,
}) as any;

interface TokenStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  sessionCount: number;
  agentCount: number;
  trackCount: number;
  avgTokensPerSession: number;
  avgCostPerSession: number;
}

interface ModelUsage {
  model: string;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
  cost: number;
}

interface AgentUsage {
  agentId: string;
  agentName: string;
  sessions: number;
  tokens: number;
  cost: number;
  timeSpent: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
  sessions: number;
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  trendUp 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '10px', 
          background: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3b82f6'
        }}>
          {icon}
        </div>
        {trend && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            color: trendUp ? '#22c55e' : '#ef4444',
            fontSize: '12px',
            fontWeight: 600
          }}>
            {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: '#666' }}>{title}</div>
      <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>{subtitle}</div>
    </div>
  );
}

function ProgressBar({ value, max, color = '#3b82f6' }: { value: number; max: number; color?: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ 
        width: `${percentage}%`, 
        height: '100%', 
        background: color, 
        borderRadius: '3px',
        transition: 'width 0.3s ease'
      }} />
    </div>
  );
}

function TokenAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  // Mock data - replace with API calls
  const stats: TokenStats = {
    totalInputTokens: 2850000,
    totalOutputTokens: 1200000,
    totalCost: 45.75,
    sessionCount: 156,
    agentCount: 5,
    trackCount: 12,
    avgTokensPerSession: 26025,
    avgCostPerSession: 0.29,
  };

  const modelUsage: ModelUsage[] = [
    { model: 'claude-3-opus', sessions: 45, inputTokens: 1200000, outputTokens: 450000, tokens: 1650000, cost: 22.50 },
    { model: 'claude-3-sonnet', sessions: 78, inputTokens: 1200000, outputTokens: 550000, tokens: 1750000, cost: 15.30 },
    { model: 'gpt-4-turbo', sessions: 23, inputTokens: 350000, outputTokens: 150000, tokens: 500000, cost: 6.50 },
    { model: 'gpt-3.5-turbo', sessions: 10, inputTokens: 100000, outputTokens: 50000, tokens: 150000, cost: 1.45 },
  ];

  const agentUsage: AgentUsage[] = [
    { agentId: '1', agentName: 'Coding Wizard', sessions: 56, tokens: 1450000, cost: 18.20, timeSpent: 2240 },
    { agentId: '2', agentName: 'Research Analyst', sessions: 42, tokens: 980000, cost: 12.40, timeSpent: 1680 },
    { agentId: '3', agentName: 'Saul Goodman', sessions: 28, tokens: 650000, cost: 8.15, timeSpent: 840 },
    { agentId: '4', agentName: 'Project Manager', sessions: 20, tokens: 420000, cost: 5.25, timeSpent: 400 },
    { agentId: '5', agentName: 'Creative Writer', sessions: 10, tokens: 350000, cost: 1.75, timeSpent: 200 },
  ];

  const dailyUsage: DailyUsage[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tokens: Math.floor(Math.random() * 50000) + 20000,
    cost: Math.random() * 2 + 0.5,
    sessions: Math.floor(Math.random() * 8) + 2,
  }));

  const maxTokens = Math.max(...dailyUsage.map(d => d.tokens));
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;

  return (
    <Layout>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              📊 Token Analytics
            </h1>
            <p style={{ color: '#888' }}>Track AI usage, costs, and performance across all agents</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '8px 16px',
                  background: timeRange === range ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${timeRange === range ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '8px',
                  color: timeRange === range ? '#3b82f6' : '#888',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <StatCard
            title="Total Tokens"
            value={`${(totalTokens / 1000000).toFixed(2)}M`}
            subtitle={`${(stats.totalInputTokens / 1000000).toFixed(2)}M in / ${(stats.totalOutputTokens / 1000000).toFixed(2)}M out`}
            icon={<Layers size={20} />}
            trend="12%"
            trendUp={true}
          />
          <StatCard
            title="Total Cost"
            value={`$${stats.totalCost.toFixed(2)}`}
            subtitle={`$${stats.avgCostPerSession.toFixed(2)} avg per session`}
            icon={<DollarSign size={20} />}
            trend="8%"
            trendUp={false}
          />
          <StatCard
            title="Sessions"
            value={stats.sessionCount.toString()}
            subtitle={`${stats.agentCount} active agents`}
            icon={<Activity size={20} />}
            trend="24%"
            trendUp={true}
          />
          <StatCard
            title="Avg Tokens/Session"
            value={`${(stats.avgTokensPerSession / 1000).toFixed(1)}k`}
            subtitle={`~${Math.floor(stats.avgTokensPerSession / 750)} pages`}
            icon={<TrendingUp size={20} />}
          />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Usage Chart */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Daily Token Usage</h3>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '2px' }} />
                  Tokens
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '2px' }} />
                  Cost
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px' }}>
              {dailyUsage.map((day, idx) => (
                <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <div 
                      style={{
                        height: `${(day.tokens / maxTokens) * 180}px`,
                        background: idx % 7 === 6 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.6)',
                        borderRadius: '2px',
                        minHeight: '4px',
                      }}
                      title={`${day.date}: ${(day.tokens / 1000).toFixed(1)}k tokens, $${day.cost.toFixed(2)}`}
                    />
                  </div>
                  {idx % 5 === 0 && (
                    <span style={{ fontSize: '10px', color: '#666' }}>
                      {new Date(day.date).getDate()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Model Distribution */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>Usage by Model</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modelUsage.map((model) => (
                <div key={model.model}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#fff' }}>{model.model}</span>
                    <span style={{ fontSize: '13px', color: '#888' }}>${model.cost.toFixed(2)}</span>
                  </div>
                  <ProgressBar value={model.tokens} max={totalTokens} color="#3b82f6" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#666' }}>
                    <span>{model.sessions} sessions</span>
                    <span>{((model.tokens / totalTokens) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Usage Table */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>Usage by Agent</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Agent</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Sessions</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Tokens</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Cost</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Time</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {agentUsage.map((agent) => (
                  <tr key={agent.agentId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: 'rgba(59, 130, 246, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Bot size={16} style={{ color: '#3b82f6' }} />
                        </div>
                        <span style={{ fontSize: '14px', color: '#fff' }}>{agent.agentName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#888' }}>
                      {agent.sessions}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>
                      {(agent.tokens / 1000).toFixed(1)}k
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>
                      ${agent.cost.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#888' }}>
                      {Math.floor(agent.timeSpent / 60)}h {agent.timeSpent % 60}m
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ProgressBar 
                          value={agent.tokens} 
                          max={Math.max(...agentUsage.map(a => a.tokens))} 
                          color="#22c55e"
                        />
                        <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>
                          {((agent.tokens / totalTokens) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

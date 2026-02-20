import { useQuery } from '@tanstack/react-query';
import { getOpenClawStats, OpenClawStatsResponse } from '../lib/api';
import { Bot, Wifi, WifiOff, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';

export function OpenClawStatsWidget() {
  const { data, isLoading, error } = useQuery<OpenClawStatsResponse>({
    queryKey: ['openclaw-stats'],
    queryFn: getOpenClawStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'var(--text-secondary)'
      }}>
        <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%' }} />
        Loading OpenClaw stats...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--accent-red)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#ef4444'
      }}>
        <AlertCircle className="w-5 h-5" />
        Failed to load OpenClaw stats
      </div>
    );
  }

  const { openclaw, tasks, connection } = data as OpenClawStatsResponse;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bot className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>OpenClaw Integration</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {connection?.name || 'Not configured'}
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '20px',
          background: openclaw?.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: openclaw?.connected ? '#10b981' : '#ef4444',
          fontSize: '13px',
          fontWeight: 500
        }}>
          {openclaw?.connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {openclaw?.connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="Total Tasks"
          value={tasks?.total || 0}
          color="var(--text-primary)"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="In Progress"
          value={tasks?.inProgress || 0}
          color="var(--accent-blue)"
        />
        <StatCard
          icon={<CheckCircle className="w-4 h-4" />}
          label="Completed"
          value={tasks?.completed || 0}
          color="#10b981"
        />
        <StatCard
          icon={<Bot className="w-4 h-4" />}
          label="From OpenClaw"
          value={tasks?.fromOpenClaw || 0}
          color="var(--accent-purple)"
        />
      </div>

      {/* Connection Details */}
      {openclaw?.connected && (
        <div style={{
          background: 'var(--bg-dark)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Version</span>
            <span style={{ fontWeight: 500 }}>{openclaw?.version || 'Unknown'}</span>
          </div>
          {openclaw?.agents !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Agents</span>
              <span style={{ fontWeight: 500 }}>{openclaw.agents}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Device ID</span>
            <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '11px' }}>
              {(() => {
                const identityStr = localStorage.getItem('openclaw-device-identity-v1');
                if (identityStr) {
                  try {
                    const identity = JSON.parse(identityStr);
                    if (identity.deviceId) return identity.deviceId.substring(0, 12);
                  } catch (e) {
                    if (identityStr.length > 30) return identityStr.substring(0, 12);
                  }
                }
                return localStorage.getItem('openclaw_device_id')?.substring(0, 12) || 'None';
              })()}
            </span>
          </div>
        </div>
      )}

      {/* Last Error */}
      {openclaw?.lastError && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <AlertCircle className="w-4 h-4" />
            <strong>Connection Error</strong>
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {openclaw.lastError.includes('Pairing') ? (
              <>
                {openclaw.lastError}<br />
                <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', display: 'inline-block', marginTop: '8px', fontSize: '11px' }}>
                  openclaw devices list
                </code>
              </>
            ) : openclaw.lastError}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-dark)',
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
        {icon}
        <span style={{ fontSize: '12px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

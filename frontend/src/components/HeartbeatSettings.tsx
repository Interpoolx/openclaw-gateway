import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAgentHeartbeat,
  updateAgentHeartbeat,
  deleteAgentHeartbeat,
  wakeAgent,
  type HeartbeatConfig
} from '../lib/api';
import {
  Activity,
  Clock,
  Zap,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  Power
} from 'lucide-react';

interface HeartbeatSettingsProps {
  agentId: string;
  agentName: string;
  isDemo?: boolean;
}

export function HeartbeatSettings({ agentId, agentName, isDemo }: HeartbeatSettingsProps) {
  const queryClient = useQueryClient();
  const [heartbeatConfig, setHeartbeatConfig] = useState<HeartbeatConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [wakeStatus, setWakeStatus] = useState<'idle' | 'waking' | 'woke' | 'error'>('idle');
  const [wakeError, setWakeError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    method: 'poll',
    everyMs: 900000,
    includeReasoning: false,
    activeHoursStart: '',
    activeHoursEnd: '',
  });

  React.useEffect(() => {
    loadHeartbeat();
  }, [agentId]);

  const loadHeartbeat = async () => {
    setIsLoading(true);
    try {
      const data = await getAgentHeartbeat(agentId);
      if (data.heartbeat) {
        setHeartbeatConfig(data.heartbeat);
        setFormData({
          method: data.heartbeat.method ?? 'poll',
          everyMs: data.heartbeat.every ?? 900000,
          includeReasoning: data.heartbeat.includeReasoning ?? false,
          activeHoursStart: data.heartbeat.activeHours?.start ?? '',
          activeHoursEnd: data.heartbeat.activeHours?.end ?? '',
        });
      }
    } catch (error) {
      console.error('Failed to load heartbeat config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (config: Partial<HeartbeatConfig>) => {
      return updateAgentHeartbeat(agentId, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-heartbeat', agentId] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return deleteAgentHeartbeat(agentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-heartbeat', agentId] });
      setFormData({
        method: 'poll',
        everyMs: 900000,
        includeReasoning: false,
        activeHoursStart: '',
        activeHoursEnd: '',
      });
      loadHeartbeat();
    },
  });

  const handleSave = () => {
    if (isDemo) return;
    setSaveStatus('saving');
    const config: Partial<HeartbeatConfig> = {
      method: formData.method,
      intervalMs: formData.everyMs,
      every: formData.everyMs,
      includeReasoning: formData.includeReasoning,
    };
    if (formData.activeHoursStart && formData.activeHoursEnd) {
      config.activeHours = {
        start: formData.activeHoursStart,
        end: formData.activeHoursEnd,
      };
    }
    updateMutation.mutate(config);
  };

  const handleReset = () => {
    if (isDemo) return;
    if (window.confirm('Reset heartbeat configuration to default poll mode?')) {
      deleteMutation.mutate();
    }
  };

  const handleWake = async () => {
    if (isDemo) return;
    setWakeStatus('waking');
    setWakeError(null);
    try {
      const result = await wakeAgent(agentId, {
        serverUrl: localStorage.getItem('openclaw_server_url') ?? '',
        token: localStorage.getItem('openclaw_gateway_token') ?? '',
      });
      if (result.success) {
        setWakeStatus('woke');
        setTimeout(() => setWakeStatus('idle'), 3000);
      } else {
        setWakeStatus('error');
        setWakeError(result.error ?? 'Failed to wake agent');
      }
    } catch (error) {
      setWakeStatus('error');
      setWakeError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const methodOptions = [
    { value: 'poll', label: 'Polling', description: 'Agent checks for tasks periodically' },
    { value: 'heartbeat', label: 'Heartbeat', description: 'Gateway pings agent on schedule' },
    { value: 'event', label: 'Event-driven', description: 'Agent wakes on external events' },
  ];

  const intervalOptions = [
    { value: 300000, label: '5 minutes' },
    { value: 600000, label: '10 minutes' },
    { value: 900000, label: '15 minutes (default)' },
    { value: 1800000, label: '30 minutes' },
    { value: 3600000, label: '1 hour' },
  ];

  if (isLoading) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '40px',
        textAlign: 'center',
      }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading heartbeat configuration...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={20} color="var(--accent-green)" />
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Heartbeat Configuration</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleWake}
            disabled={isDemo || wakeStatus === 'waking'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: wakeStatus === 'woke' ? 'rgba(34, 197, 94, 0.2)' : 'var(--accent-green)',
              border: 'none',
              borderRadius: '6px',
              color: wakeStatus === 'woke' ? 'var(--accent-green)' : '#000',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isDemo ? 'not-allowed' : 'pointer',
              opacity: isDemo ? 0.5 : 1,
            }}
          >
            {wakeStatus === 'waking' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {wakeStatus === 'woke' && <Check size={14} />}
            {wakeStatus === 'error' && <AlertCircle size={14} />}
            <Power size={14} />
            {wakeStatus === 'waking' ? 'Waking...' : wakeStatus === 'woke' ? 'Woke!' : 'Wake Now'}
          </button>
          <button
            onClick={handleReset}
            disabled={isDemo}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: isDemo ? 'not-allowed' : 'pointer',
              opacity: isDemo ? 0.5 : 1,
            }}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isDemo || saveStatus === 'saving'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'var(--accent-blue)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isDemo ? 'not-allowed' : 'pointer',
              opacity: isDemo ? 0.5 : 1,
            }}
          >
            {saveStatus === 'saving' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {saveStatus === 'saved' && <Check size={14} />}
            {saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {wakeError && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          color: '#ef4444',
          marginBottom: '16px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={16} />
          {wakeError}
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Method Selection */}
        <div className="form-group">
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Wake-up Method
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {methodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => !isDemo && setFormData(prev => ({ ...prev, method: option.value }))}
                style={{
                  padding: '16px',
                  background: formData.method === option.value ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-dark)',
                  border: `1px solid ${formData.method === option.value ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  color: formData.method === option.value ? 'white' : 'var(--text-secondary)',
                  cursor: isDemo ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: isDemo ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>{option.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Interval */}
        {formData.method !== 'event' && (
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <Clock size={16} />
              Check Interval
            </label>
            <select
              value={formData.everyMs}
              onChange={(e) => !isDemo && setFormData(prev => ({ ...prev, everyMs: parseInt(e.target.value) }))}
              disabled={isDemo}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                cursor: isDemo ? 'not-allowed' : 'pointer',
              }}
            >
              {intervalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              How often {agentName} checks for new tasks
            </p>
          </div>
        )}

        {/* Active Hours */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            <Zap size={16} />
            Active Hours (Optional)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Start Time
              </label>
              <input
                type="time"
                value={formData.activeHoursStart}
                onChange={(e) => !isDemo && setFormData(prev => ({ ...prev, activeHoursStart: e.target.value }))}
                disabled={isDemo}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  cursor: isDemo ? 'not-allowed' : 'pointer',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                End Time
              </label>
              <input
                type="time"
                value={formData.activeHoursEnd}
                onChange={(e) => !isDemo && setFormData(prev => ({ ...prev, activeHoursEnd: e.target.value }))}
                disabled={isDemo}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  cursor: isDemo ? 'not-allowed' : 'pointer',
                }}
              />
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Agent will only check for tasks during these hours. Leave empty for 24/7 availability.
          </p>
        </div>

        {/* Include Reasoning */}
        {formData.method === 'heartbeat' && (
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: isDemo ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.includeReasoning}
                onChange={(e) => !isDemo && setFormData(prev => ({ ...prev, includeReasoning: e.target.checked }))}
                disabled={isDemo}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: 'var(--accent-blue)',
                  cursor: isDemo ? 'not-allowed' : 'pointer',
                }}
              />
              <div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Include Reasoning</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Send reasoning content in heartbeat responses
                </div>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} />
          {heartbeatConfig?.enabled ? 'Heartbeat enabled' : 'Using default polling (every 15 minutes)'}
        </div>
        {saveStatus !== 'idle' && (
          <span style={{
            color: saveStatus === 'saved' ? 'var(--accent-green)' : saveStatus === 'error' ? '#ef4444' : 'var(--text-muted)',
          }}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}
          </span>
        )}
      </div>
    </div>
  );
}

import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

export const channelsRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'channels',
  component: ChannelsPage,
});

// Channel Types
type ChannelType = 'telegram' | 'whatsapp' | 'discord' | 'slack' | 'email';
type ChannelStatus = 'not_configured' | 'configured' | 'error';

interface ChannelConfig {
  [key: string]: string;
}

interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  description?: string;
  status: ChannelStatus;
  config: ChannelConfig;
  testResult?: { success: boolean; message: string };
  createdAt: string;
  updatedAt: string;
}

// Mock channel configurations
const defaultChannels: Channel[] = [
  {
    id: '1',
    type: 'telegram',
    name: 'Main Telegram',
    description: 'Primary Telegram bot notifications',
    status: 'configured',
    config: { botToken: '123***', chatId: '456***' },
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
];

function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load channels from localStorage on mount
  useEffect(() => {
    const loadChannels = () => {
      setIsLoading(true);
      const saved = localStorage.getItem('openclaw_channels');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setChannels(parsed);
        } catch (e) {
          console.error('Failed to parse channels:', e);
          setChannels(defaultChannels);
        }
      } else {
        setChannels(defaultChannels);
      }
      setIsLoading(false);
    };

    // Simulate loading delay
    setTimeout(loadChannels, 300);
  }, []);

  // Save channels to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('openclaw_channels', JSON.stringify(channels));
    }
  }, [channels, isLoading]);

  const getStatusBadge = (status: ChannelStatus) => {
    switch (status) {
      case 'configured':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
            ✓ Connected
          </span>
        );
      case 'not_configured':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
            ○ Not Configured
          </span>
        );
      case 'error':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
            ✕ Error
          </span>
        );
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      <div style={{ maxWidth: '1000px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>📡 Communication Channels</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Configure channels for agent notifications and communications</p>
        </div>

        {/* Channels List */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading channels...
            </div>
          ) : channels.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>No channels configured yet</div>
              <button
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent-blue)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <BookOpen className="w-4 h-4" /> View Setup Guide
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0' }}>
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{channel.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{channel.type.toUpperCase()}</div>
                  </div>
                  <div>{getStatusBadge(channel.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integration Guide */}
        <div style={{ marginTop: '32px', padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <BookOpen className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Integration Guide</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
            Learn how to configure communication channels for your agents. Each channel requires specific credentials and setup steps. Click below to view the full documentation.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={{
                padding: '10px 20px',
                background: 'var(--accent-blue)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <BookOpen className="w-4 h-4" /> View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

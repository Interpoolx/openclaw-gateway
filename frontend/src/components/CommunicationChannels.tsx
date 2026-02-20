import { useState } from 'react';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { TelegramConfig } from './ChannelConfigs/TelegramConfig';
import { WhatsAppConfig } from './ChannelConfigs/WhatsAppConfig';
import { WebhookChannelConfig } from './ChannelConfigs/WebhookChannelConfig';
import { VapiConfig } from './ChannelConfigs/VapiConfig';

interface ChannelConfig {
  telegram: {
    botToken: string;
    chatId: string;
    connected: boolean;
  };
  whatsapp: {
    phoneNumberId: string;
    accessToken: string;
    connected: boolean;
  };
  discord: {
    webhookUrl: string;
    connected: boolean;
  };
  slack: {
    webhookUrl: string;
    connected: boolean;
  };
  vapi: {
    apiKey: string;
    connected: boolean;
  };
}

interface CommunicationChannelsProps {
  initialConfig?: Partial<ChannelConfig>;
}

export function CommunicationChannels({
  initialConfig,
}: CommunicationChannelsProps) {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const [channels, setChannels] = useState<ChannelConfig>(
    initialConfig as any || {
      telegram: { botToken: '', chatId: '', connected: false },
      whatsapp: { phoneNumberId: '', accessToken: '', connected: false },
      discord: { webhookUrl: '', connected: false },
      slack: { webhookUrl: '', connected: false },
      vapi: { apiKey: '', connected: false },
    }
  );

  const channelsList = [
    { key: 'telegram', name: 'Telegram', emoji: '✈️', description: 'Connect Telegram bots for messaging' },
    { key: 'whatsapp', name: 'WhatsApp', emoji: '💬', description: 'Connect WhatsApp Business API' },
    { key: 'discord', name: 'Discord', emoji: '🎮', description: 'Connect Discord webhooks' },
    { key: 'slack', name: 'Slack', emoji: '💼', description: 'Connect Slack app' },
    { key: 'vapi', name: 'VapiAI', emoji: '🎙️', description: 'Voice AI platform' },
  ];

  const handleChannelSave = (channelKey: string, config: any) => {
    setChannels(prev => ({
      ...prev,
      [channelKey]: { ...prev[channelKey as keyof ChannelConfig], ...config, connected: true }
    }));
    setSaveResult({ success: true, message: `${channelKey.charAt(0).toUpperCase() + channelKey.slice(1)} saved!` });
    setTimeout(() => setSaveResult(null), 2000);
  };

  if (selectedChannel === 'telegram') {
    return (
      <TelegramConfig
        botToken={channels.telegram.botToken}
        chatId={channels.telegram.chatId}
        connected={channels.telegram.connected}
        onBack={() => setSelectedChannel(null)}
        onSave={(config) => handleChannelSave('telegram', config)}
      />
    );
  }

  if (selectedChannel === 'whatsapp') {
    return (
      <WhatsAppConfig
        phoneNumberId={channels.whatsapp.phoneNumberId}
        accessToken={channels.whatsapp.accessToken}
        connected={channels.whatsapp.connected}
        onBack={() => setSelectedChannel(null)}
        onSave={(config) => handleChannelSave('whatsapp', config)}
      />
    );
  }

  if (selectedChannel === 'discord') {
    return (
      <WebhookChannelConfig
        channelName="Discord"
        channelEmoji="🎮"
        primaryColor="#5865f2"
        webhookUrl={channels.discord.webhookUrl}
        connected={channels.discord.connected}
        description="Connect Discord webhooks for receiving notifications and events."
        docLink="https://discord.com/developers/docs/resources/webhook"
        onBack={() => setSelectedChannel(null)}
        onSave={(config) => handleChannelSave('discord', config)}
      />
    );
  }

  if (selectedChannel === 'slack') {
    return (
      <WebhookChannelConfig
        channelName="Slack"
        channelEmoji="💼"
        primaryColor="#36c5f0"
        webhookUrl={channels.slack.webhookUrl}
        connected={channels.slack.connected}
        description="Connect Slack webhooks for sending messages to your workspace."
        docLink="https://api.slack.com/messaging/webhooks"
        onBack={() => setSelectedChannel(null)}
        onSave={(config) => handleChannelSave('slack', config)}
      />
    );
  }

  if (selectedChannel === 'vapi') {
    return (
      <VapiConfig
        apiKey={channels.vapi.apiKey}
        connected={channels.vapi.connected}
        onBack={() => setSelectedChannel(null)}
        onSave={(config) => handleChannelSave('vapi', config)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border-primary)' }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
          Communication Channels
        </h3>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
          Configure integrations for messaging and voice platforms.
        </p>
      </div>

      {/* Channels List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {channelsList.map((channel) => {
          const channelConfig = channels[channel.key as keyof ChannelConfig];
          const isConnected = (channelConfig as any).connected;

          return (
            <button
              key={channel.key}
              onClick={() => setSelectedChannel(channel.key)}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-hover-bg)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, textAlign: 'left' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  flexShrink: 0,
                }}>
                  {channel.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                    {channel.name}
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    {channel.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isConnected && (
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <CheckCircle size={12} />
                    Connected
                  </div>
                )}
                <ChevronRight size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Save Result Message */}
      {saveResult && (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            color: '#10b981',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <CheckCircle size={16} />
          {saveResult.message}
        </div>
      )}
    </div>
  );
}

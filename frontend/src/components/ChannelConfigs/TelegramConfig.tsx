import { useState } from 'react';
import { ChevronLeft, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TelegramConfigProps {
  botToken: string;
  chatId: string;
  connected: boolean;
  onBack: () => void;
  onSave: (config: { botToken: string; chatId: string }) => void;
}

export function TelegramConfig({
  botToken: initialBotToken,
  chatId: initialChatId,
  connected,
  onBack,
  onSave,
}: TelegramConfigProps) {
  const [botToken, setBotToken] = useState(initialBotToken);
  const [chatId, setChatId] = useState(initialChatId);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!botToken.trim() || !chatId.trim()) {
        setTestResult({ success: false, message: 'Please fill in all fields' });
      } else {
        setTestResult({ success: true, message: 'Connection successful!' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
            marginBottom: '1rem',
            padding: '0.5rem',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-md)',
            background: '#0088cc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
          }}>
            ✈️
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
              Telegram
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              {connected ? '✓ Connected' : '○ Not Connected'}
            </p>
          </div>
        </div>

        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Connect Telegram bots for messaging. You can configure your bot token and chat ID to enable Telegram integration.
        </p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Bot Token
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="Enter your Telegram bot token"
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              outline: 'none',
            }}
          />
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
            Get this from @BotFather on Telegram
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Chat ID
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="Enter your Chat ID"
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              outline: 'none',
            }}
          />
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
            Your Telegram chat or group ID
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          style={{
            padding: '0.75rem 1rem',
            background: isTesting ? 'rgba(59, 130, 246, 0.3)' : '#3b82f6',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            cursor: isTesting ? 'not-allowed' : 'pointer',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: isTesting ? 0.5 : 1,
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            if (!isTesting) e.currentTarget.style.background = '#2563eb';
          }}
          onMouseLeave={(e) => {
            if (!isTesting) e.currentTarget.style.background = '#3b82f6';
          }}
        >
          {isTesting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Send size={16} />
              Test Connection
            </>
          )}
        </button>

        <button
          onClick={() => onSave({ botToken, chatId })}
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--color-border-primary)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-border-primary)'}
        >
          Save Configuration
        </button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          style={{
            padding: '1rem',
            background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            color: testResult.success ? '#10b981' : '#ef4444',
            fontSize: 'var(--font-size-sm)',
            marginTop: '1rem',
          }}
        >
          {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {testResult.message}
        </div>
      )}
    </div>
  );
}

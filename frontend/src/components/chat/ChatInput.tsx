import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = 'Type a message...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim() || isLoading || disabled) return;
    onSubmit(message.trim());
    setMessage('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              lineHeight: '1.5',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading || disabled}
          style={{
            padding: '12px',
            background:
              !message.trim() || isLoading || disabled
                ? 'var(--bg-tertiary)'
                : 'var(--accent-primary)',
            border: 'none',
            borderRadius: '12px',
            color: !message.trim() || isLoading || disabled ? 'var(--text-muted)' : 'white',
            cursor:
              !message.trim() || isLoading || disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0,
            width: '44px',
            height: '44px',
          }}
          onMouseEnter={(e) => {
            if (message.trim() && !isLoading && !disabled) {
              e.currentTarget.style.background = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            if (message.trim() && !isLoading && !disabled) {
              e.currentTarget.style.background = 'var(--accent-primary)';
            }
          }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}

import { Bot, User, Copy, Check, Wrench, Brain } from 'lucide-react';
import { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface ChatMessageData {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system' | 'tool' | 'thinking';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'error' | 'streaming';
  metadata?: {
    toolName?: string;
    toolArgs?: Record<string, unknown>;
  };
}

interface ChatMessageProps {
  message: ChatMessageData;
  agentAvatar?: string;
  agentName?: string;
}

export function ChatMessage({ message, agentAvatar = '🤖', agentName = 'Assistant' }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const isTool = message.type === 'tool';
  const isThinking = message.type === 'thinking';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAvatar = () => {
    if (isUser) return { icon: <User className="w-4 h-4" />, bg: 'var(--accent-blue)' };
    if (isSystem) return { icon: <Bot className="w-4 h-4" />, bg: 'var(--accent-orange)' };
    if (isTool) return { icon: <Wrench className="w-4 h-4" />, bg: 'var(--accent-purple)' };
    if (isThinking) return { icon: <Brain className="w-4 h-4" />, bg: 'var(--accent-cyan)' };
    return { icon: <span>{agentAvatar}</span>, bg: 'var(--accent-green)' };
  };

  const getName = () => {
    if (isUser) return 'You';
    if (isSystem) return 'System';
    if (isTool) return `Tool: ${message.metadata?.toolName || 'Unknown'}`;
    if (isThinking) return 'Thinking';
    return agentName;
  };

  const avatar = getAvatar();

  if (isThinking) {
    return (
      <div className="flex gap-3 px-4 py-3 opacity-70">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px]"
          style={{ background: avatar.bg }}
        >
          {avatar.icon}
        </div>
        <div className="flex-1">
          <div className="text-[13px] text-[var(--text-muted)] italic">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cc-msg-bubble flex flex-col mb-1 ${isUser ? 'cc-msg-bubble--user' : 'cc-msg-bubble--agent'}`}
      style={{ border: isTool ? '1px dashed rgba(139, 92, 246, 0.4)' : undefined }}
    >
      {/* Header / Meta */}
      <div className="flex items-center justify-between mb-1.5 gap-3">
        <div className="flex items-center gap-2">
          {!isUser && (
            <div className="text-[14px]">{avatar.icon}</div>
          )}
          <span
            className={`font-extrabold text-[11px] uppercase tracking-wider ${isUser ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-accent-secondary)]'}`}
          >
            {getName()}
          </span>
        </div>
        <span className="text-[var(--color-text-muted)] text-[10px] tabular-nums">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Message Content */}
      <div className="text-[14px] text-[var(--color-text-primary)] leading-[1.6]">
        {isTool ? (
          <div className="bg-black/30 p-2.5 rounded-md font-mono text-[12px] border border-white/5">
            <div className="text-[var(--color-text-muted)] mb-1">
              &gt; exec: {message.metadata?.toolName}
            </div>
            {message.content}
          </div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>

      {/* Status & Actions */}
      <div className="flex items-center justify-end mt-2 gap-3">
        {!isUser && !isTool && (
          <button
            onClick={handleCopy}
            className="bg-transparent border-none text-[var(--color-text-muted)] text-[11px] cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded transition-all hover:bg-white/5 active:scale-95"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}

        {(message.status === 'delivered' || (message.status === 'sent' && isUser)) && (
          <span className="text-[#10b981] text-[10px] opacity-80">✓✓</span>
        )}
        {message.status === 'streaming' && (
          <div className="flex gap-0.5">
            <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0s]"></span>
            <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        )}
      </div>
    </div>
  );
}

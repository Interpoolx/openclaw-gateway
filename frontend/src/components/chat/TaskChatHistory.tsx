import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useEffect } from 'react';
import { ChatContainer } from './ChatContainer';
import { ChatMessage, ChatMessageData } from './ChatMessage';
import { getTaskMessages, createTaskMessage, apiGet, Agent } from '../../lib/api';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface TaskChatHistoryProps {
  taskId: string;
  isExecuting?: boolean;
  agentName?: string;
  agentAvatar?: string;
}

export function TaskChatHistory({
  taskId,
  isExecuting = false,
  agentName = 'OpenClaw',
  agentAvatar = '🤖'
}: TaskChatHistoryProps) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['task-messages', taskId],
    queryFn: () => getTaskMessages(taskId),
    refetchInterval: isExecuting ? 2000 : 5000,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiGet<Agent[]>('/agents'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => createTaskMessage(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-messages', taskId] });
    },
    onError: (err: Error) => {
      console.error('Chat error:', err);
      toast.error('Failed to send message');
    }
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
    setNewMessage('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isExecuting]);

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', minHeight: '200px' }}>
        <Loader2 className="w-6 h-6 animate-spin" />
        <span style={{ marginLeft: '8px' }}>Syncing history...</span>
      </div>
    );
  }

  if (!taskId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', minHeight: '200px' }}>
        <span style={{ fontSize: '13px' }}>Chat history will be available after the task is created.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', minHeight: '200px' }}>
        Unable to load chat history.
      </div>
    );
  }

  const chatMessages: ChatMessageData[] = messages?.map((msg: any) => {
    const isAssistant = msg.type === 'assistant' || !!msg.agentId;
    const msgAgent = isAssistant ? agents?.find((a: Agent) => a.id === msg.agentId) : null;

    return {
      id: msg.id,
      content: msg.content,
      type: msg.type === 'system' ? 'system' : isAssistant ? 'assistant' : 'user',
      timestamp: msg.timestamp,
      status: msg.status,
      metadata: msg.metadata,
      agentName: msgAgent?.name || agentName,
      agentAvatar: msgAgent?.avatar || agentAvatar,
    };
  }) || [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <ChatContainer>
          {chatMessages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              opacity: 0.6
            }}>
              <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>No activity logged</h3>
              <p style={{ fontSize: '12px' }}>Operational history will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {chatMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  agentName={(message as any).agentName}
                  agentAvatar={(message as any).agentAvatar}
                />
              ))}
              {isExecuting && (
                <div className="cc-msg-bubble cc-msg-bubble--agent" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.7 }}>Agent processing command...</span>
                </div>
              )}
            </div>
          )}
        </ChatContainer>
        <div ref={messagesEndRef} />
      </div>

      {/* Terminal Input Area */}
      <div
        style={{
          padding: '20px 24px',
          background: 'rgba(10, 10, 15, 0.8)',
          borderTop: '1px solid var(--color-border-tertiary)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0
        }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <span style={{ color: 'var(--color-accent-secondary)', fontWeight: 900, fontSize: '16px', marginTop: '4px', fontFamily: 'monospace' }}>&gt;</span>
          <textarea
            rows={1}
            placeholder={`Instruct ${agentName}...`}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '14px',
              lineHeight: '1.6',
              fontFamily: 'monospace',
              padding: '4px 0',
              outline: 'none',
              resize: 'none',
              maxHeight: '150px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            style={{
              padding: '6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent-secondary)',
              cursor: 'pointer',
              opacity: newMessage.trim() ? 1 : 0.3,
              transition: 'all 0.2s',
              marginTop: '2px'
            }}
          >
            <Send size={18} />
          </button>
        </div>
        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--color-text-muted)', textAlign: 'right', opacity: 0.5 }}>
          Press Enter to commit, Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}

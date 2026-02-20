import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeTaskInOpenClaw } from '../lib/api';
import { Bot, Loader2, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface ExecuteTaskButtonProps {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
}

export function ExecuteTaskButton({ taskId, taskTitle, taskDescription }: ExecuteTaskButtonProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [agent, setAgent] = useState('main');
  const [prompt, setPrompt] = useState(taskDescription || taskTitle);

  const mutation = useMutation({
    mutationFn: () => executeTaskInOpenClaw(taskId, { prompt, agent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-messages', taskId] });
      setTimeout(() => setShowModal(false), 1500);
    }
  });

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'var(--accent-blue)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <Play className="w-4 h-4" />
        Run in OpenClaw
      </button>

      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            margin: '20px'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <Bot className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Execute in OpenClaw</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Send this task to OpenClaw for execution
                </p>
              </div>
            </div>

            {/* Agent Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                marginBottom: '8px',
                color: 'var(--text-secondary)'
              }}>
                Agent
              </label>
              <select
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="main">main</option>
                <option value="coding">coding</option>
                <option value="default">default</option>
              </select>
            </div>

            {/* Prompt */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                marginBottom: '8px',
                color: 'var(--text-secondary)'
              }}>
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Status */}
            {mutation.isPending && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                marginBottom: '16px',
                color: 'var(--accent-blue)'
              }}>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending to OpenClaw...
              </div>
            )}

            {mutation.isSuccess && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '8px',
                marginBottom: '16px',
                color: '#10b981'
              }}>
                <CheckCircle className="w-5 h-5" />
                Task sent to OpenClaw successfully!
              </div>
            )}

            {mutation.isError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                marginBottom: '16px',
                color: '#ef4444'
              }}>
                <AlertCircle className="w-5 h-5" />
                Failed to send task. Check your connection.
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={mutation.isPending}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  cursor: mutation.isPending ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !prompt.trim()}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent-blue)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: mutation.isPending || !prompt.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: mutation.isPending || !prompt.trim() ? 0.7 : 1
                }}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

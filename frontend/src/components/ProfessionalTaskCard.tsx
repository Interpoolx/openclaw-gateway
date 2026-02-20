import { useState } from 'react';
import { Task, Agent } from '../lib/api';
import { useAgents } from '../hooks/useAgents';
import { MessageSquare, Bot, Calendar, MoreHorizontal, Play } from 'lucide-react';

interface ProfessionalTaskCardProps {
  task: Task;
  onClick: () => void;
  onExecute?: (e: React.MouseEvent) => void;
}

export function ProfessionalTaskCard({ task, onClick, onExecute }: ProfessionalTaskCardProps) {
  const { data: agents } = useAgents();
  const [isHovered, setIsHovered] = useState(false);

  const assignedAgent = (agents as Agent[] | undefined)?.find((a: Agent) => task.assigneeIds?.includes(a.id));

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    inbox: { bg: 'rgba(107, 114, 128, 0.1)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)' },
    assigned: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    in_progress: { bg: 'rgba(245, 158, 11, 0.1)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
    review: { bg: 'rgba(139, 92, 246, 0.1)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
    done: { bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  };

  const statusStyle = statusColors[task.status] || statusColors.inbox;

  const priorityDots: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4,
  };

  const priorityColors: Record<string, string> = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isHovered ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Priority indicator - left border */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '12px',
          bottom: '12px',
          width: '4px',
          borderRadius: '0 2px 2px 0',
          background: priorityColors[task.priority] || '#6b7280',
        }}
      />

      {/* Header - Status badge and menu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: statusStyle.bg,
            color: statusStyle.text,
            border: `1px solid ${statusStyle.border}`,
          }}
        >
          {task.status.replace('_', ' ')}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            // Menu action
          }}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: '4px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      <h4
        style={{
          fontSize: '15px',
          fontWeight: 600,
          margin: '0 0 8px 0',
          color: 'var(--text-primary)',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            margin: '0 0 12px 0',
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                padding: '3px 8px',
                background: 'var(--bg-tertiary)',
                borderRadius: '10px',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer - Meta info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
        {/* Left side - Agent and dates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {assignedAgent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>{assignedAgent.avatar}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {assignedAgent.name}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <Bot className="w-3 h-3" />
              <span style={{ fontSize: '12px' }}>No agent</span>
            </div>
          )}

          {task.dueDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
              <Calendar className="w-3 h-3" />
              <span style={{ fontSize: '11px' }}>
                {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Message count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <MessageSquare className="w-3 h-3" />
            <span style={{ fontSize: '11px' }}>0</span>
          </div>

          {/* Execute button - shown on hover */}
          {onExecute && (
            <button
              onClick={onExecute}
              style={{
                padding: '6px 10px',
                background: 'var(--accent-primary)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateX(0)' : 'translateX(10px)',
                transition: 'all 0.2s',
              }}
            >
              <Play className="w-3 h-3" />
              Run
            </button>
          )}
        </div>
      </div>

      {/* Priority dots */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '2px' }}>
        {Array.from({ length: priorityDots[task.priority] || 1 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: priorityColors[task.priority] || '#6b7280',
            }}
          />
        ))}
      </div>
    </div>
  );
}

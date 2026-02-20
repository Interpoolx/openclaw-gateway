import { Task, Agent } from '../lib/api';
import { 
  Calendar, 
  MessageSquare, 
  GripVertical,
  Clock,
  AlertCircle
} from 'lucide-react';

interface EnhancedTaskCardProps {
  task: Task;
  agents: Agent[];
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick?: () => void;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f59e0b',
    medium: '#eab308',
    low: '#22c55e',
  };
  return colors[priority] ?? '#6b7280';
}

function getPriorityGlow(priority: string): string {
  const glows: Record<string, string> = {
    urgent: '0 0 10px rgba(239, 68, 68, 0.5)',
    high: '0 0 10px rgba(245, 158, 11, 0.4)',
    medium: '0 0 10px rgba(234, 179, 8, 0.3)',
    low: '0 0 10px rgba(34, 197, 94, 0.3)',
  };
  return glows[priority] ?? 'none';
}

function getPriorityBg(priority: string): string {
  const bgs: Record<string, string> = {
    urgent: 'rgba(239, 68, 68, 0.15)',
    high: 'rgba(245, 158, 11, 0.15)',
    medium: 'rgba(234, 179, 8, 0.15)',
    low: 'rgba(34, 197, 94, 0.15)',
  };
  return bgs[priority] ?? 'rgba(107, 114, 128, 0.15)';
}

function getAgentName(agentId: string, agents: Agent[]): string {
  const agent = agents.find(a => a.id === agentId);
  return agent?.name ?? agentId;
}

function getAgentAvatar(agentId: string, agents: Agent[]): string {
  const agent = agents.find(a => a.id === agentId);
  return agent?.avatar ?? '👤';
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '';
  const date = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function EnhancedTaskCard({ 
  task, 
  agents, 
  isDragging = false, 
  isOverlay = false,
  onClick 
}: EnhancedTaskCardProps) {
  const priorityColor = getPriorityColor(task.priority);
  const priorityGlow = getPriorityGlow(task.priority);
  const priorityBg = getPriorityBg(task.priority);
  const overdue = isOverdue(task.dueDate);

  return (
    <div
      onClick={onClick}
      style={{
        background: isDragging ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${isDragging ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.06)'}`,
        borderLeft: `3px solid ${priorityColor}`,
        borderRadius: '12px',
        padding: '16px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isOverlay 
          ? `0 20px 50px rgba(0,0,0,0.5), ${priorityGlow}` 
          : isDragging 
            ? `0 10px 30px rgba(0,0,0,0.3), ${priorityGlow}` 
            : '0 4px 6px rgba(0,0,0,0.1)',
        transform: isOverlay ? 'rotate(2deg) scale(1.02)' : 'none',
        cursor: onClick ? 'pointer' : 'grab',
        opacity: isDragging ? 0.9 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isDragging && !isOverlay) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.4), ${priorityGlow}`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging && !isOverlay) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }
      }}
    >
      {/* Priority Glow Effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: `linear-gradient(90deg, ${priorityColor}, transparent)`,
        boxShadow: `0 0 10px ${priorityColor}`,
        opacity: 0.5,
      }} />

      {/* Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
        }}>
          {/* Priority Badge */}
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: priorityColor,
            background: priorityBg,
            padding: '2px 6px',
            borderRadius: '4px',
            border: `1px solid ${priorityColor}40`,
            textShadow: priorityGlow,
          }}>
            {task.priority}
          </span>

          {/* Category Badge */}
          {task.category && (
            <span style={{
              fontSize: '9px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              {task.category}
            </span>
          )}

          {/* Overdue Indicator */}
          {overdue && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '9px',
              fontWeight: 600,
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              <AlertCircle style={{ width: 10, height: 10 }} />
              Overdue
            </span>
          )}
        </div>

        {/* Drag Handle */}
        <div style={{
          color: 'rgba(255,255,255,0.2)',
          cursor: 'grab',
          padding: '2px',
          borderRadius: '4px',
          transition: 'all 0.15s ease',
        }}
        className="drag-handle"
        >
          <GripVertical style={{ width: 14, height: 14 }} />
        </div>
      </div>

      {/* Task Title */}
      <h4 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#f9fafb',
        lineHeight: '1.5',
        marginBottom: '12px',
        marginTop: 0,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {task.title}
      </h4>

      {/* Footer Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Agent Avatars */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {task.assigneeIds && task.assigneeIds.length > 0 ? (
            <div style={{ display: 'flex', marginLeft: '4px' }}>
              {task.assigneeIds.slice(0, 3).map((id, index) => (
                <div
                  key={id}
                  title={getAgentName(id, agents)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a1a1f, #252530)',
                    border: '2px solid #0f0f12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    marginLeft: index > 0 ? '-10px' : '0',
                    zIndex: 10 - index,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)';
                    e.currentTarget.style.zIndex = '20';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.zIndex = String(10 - index);
                  }}
                >
                  {getAgentAvatar(id, agents)}
                </div>
              ))}
              {task.assigneeIds.length > 3 && (
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid #0f0f12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    marginLeft: '-10px',
                    zIndex: 0,
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 600,
                  }}
                >
                  +{task.assigneeIds.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)',
            }}>
              <Clock style={{ width: 12, height: 12 }} />
            </div>
          )}
        </div>

        {/* Meta Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'rgba(255,255,255,0.35)',
        }}>
          {/* Due Date */}
          {task.dueDate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: overdue ? '#ef4444' : 'inherit',
            }}>
              <Calendar style={{ width: 12, height: 12 }} />
              <span>{formatDueDate(task.dueDate)}</span>
            </div>
          )}

          {/* Comments Indicator (placeholder) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
          }}>
            <MessageSquare style={{ width: 12, height: 12 }} />
            <span>0</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '4px',
          marginTop: '10px',
          flexWrap: 'wrap',
        }}>
          {task.tags.slice(0, 2).map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              style={{
                padding: '3px 8px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '4px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span style={{
              padding: '3px 8px',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.3)',
            }}>
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default EnhancedTaskCard;

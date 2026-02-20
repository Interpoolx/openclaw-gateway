import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Users, CheckSquare, Activity, FolderKanban } from 'lucide-react';

interface StatsBarProps {
  totalAgents?: number;
  activeAgents?: number;
  totalTasks?: number;
  pendingTasks?: number;
  activeSessions?: number;
  totalProjects?: number;
}

export function StatsBar({
  totalAgents = 0,
  activeAgents = 0,
  totalTasks = 0,
  pendingTasks = 0,
  activeSessions = 0,
  totalProjects = 0
}: StatsBarProps) {
  const navigate = useNavigate();

  const stats = [
    {
      id: 'agents',
      label: 'AGENTS',
      value: activeAgents,
      total: totalAgents,
      icon: <Users className="w-3.5 h-3.5" />,
      color: '#3b82f6',
      onClick: () => navigate({ to: '/agents' }),
      pulse: activeAgents > 0
    },
    {
      id: 'tasks',
      label: 'TASKS',
      value: pendingTasks,
      total: totalTasks,
      icon: <CheckSquare className="w-3.5 h-3.5" />,
      color: '#f59e0b',
      onClick: () => navigate({ to: '/command-center' }),
      pulse: pendingTasks > 0
    },
    {
      id: 'sessions',
      label: 'SESSIONS',
      value: activeSessions,
      icon: <Activity className="w-3.5 h-3.5" />,
      color: '#22c55e',
      onClick: () => navigate({ to: '/sessions' }),
      pulse: activeSessions > 0
    },
    {
      id: 'projects',
      label: 'PROJECTS',
      value: totalProjects,
      icon: <FolderKanban className="w-3.5 h-3.5" />,
      color: '#8b5cf6',
      onClick: () => navigate({ to: '/projects' }),
      pulse: false
    }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '32px',
      padding: '12px 24px',
      background: 'rgba(12, 12, 15, 0.6)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
      fontSize: '12px',
      fontWeight: 500,
      letterSpacing: '0.5px'
    }}>
      {stats.map((stat, index) => (
        <React.Fragment key={stat.id}>
          <button
            onClick={stat.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
              color: '#a1a1aa'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.color = '#f4f4f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#a1a1aa';
            }}
          >
            {/* Pulse Indicator */}
            {stat.pulse && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: stat.color,
                boxShadow: `0 0 8px ${stat.color}`,
                animation: 'pulse 2s infinite'
              }} />
            )}
            
            {/* Icon */}
            <span style={{ 
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {stat.icon}
            </span>
            
            {/* Label */}
            <span style={{ 
              color: stat.pulse ? '#f4f4f5' : 'inherit'
            }}>
              {stat.label}
            </span>
            
            {/* Value */}
            <span style={{
              color: stat.color,
              fontWeight: 700,
              fontFamily: 'monospace',
              fontSize: '13px'
            }}>
              {stat.value}
              {stat.total !== undefined && stat.total > stat.value && (
                <span style={{ 
                  color: '#6b7280',
                  fontWeight: 400,
                  fontSize: '11px'
                }}>
                  /{stat.total}
                </span>
              )}
            </span>
          </button>
          
          {/* Separator */}
          {index < stats.length - 1 && (
            <span style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)'
            }} />
          )}
        </React.Fragment>
      ))}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}

export default StatsBar;

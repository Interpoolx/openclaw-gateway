import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { 
  Plus, 
  CheckSquare, 
  FolderKanban, 
  Users, 
  Settings,
  X,
  Clock
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  shortcut?: string;
}

interface QuickActionsProps {
  agents?: Array<{ id: string; name: string; avatar?: string }>;
}

export function QuickActions({ agents = [] }: QuickActionsProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainActions: QuickAction[] = [
    {
      id: 'create-task',
      label: 'New Task',
      icon: <CheckSquare className="w-5 h-5" />,
      color: '#3b82f6',
      shortcut: 'Ctrl+N',
      onClick: () => {
        navigate({ to: '/command-center', search: { action: 'create-task' } });
        setIsOpen(false);
      },
    },
    {
      id: 'create-track',
      label: 'New Project',
      icon: <FolderKanban className="w-5 h-5" />,
      color: '#8b5cf6',
      shortcut: 'Ctrl+Shift+N',
      onClick: () => {
        navigate({ to: '/projects', search: { action: 'create' } });
        setIsOpen(false);
      },
    },
    {
      id: 'create-agent',
      label: 'New Agent',
      icon: <Users className="w-5 h-5" />,
      color: '#22c55e',
      shortcut: 'Ctrl+Shift+A',
      onClick: () => {
        navigate({ to: '/agents', search: { action: 'create' } });
        setIsOpen(false);
      },
    },
  ];

  const recentAgents: QuickAction[] = agents.slice(0, 3).map((agent, index) => ({
    id: `agent-${agent.id}`,
    label: agent.name,
    icon: <span className="text-lg">{agent.avatar || '🤖'}</span>,
    color: ['#3b82f6', '#22c55e', '#f59e0b'][index % 3],
    onClick: () => {
      navigate({ to: '/agents/$agentId', params: { agentId: agent.id } });
      setIsOpen(false);
    },
  }));

  const secondaryActions: QuickAction[] = [
    {
      id: 'view-calendar',
      label: 'Calendar',
      icon: <Clock className="w-5 h-5" />,
      color: '#f59e0b',
      onClick: () => {
        navigate({ to: '/command-center', search: { view: 'calendar' } });
        setIsOpen(false);
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      color: '#6b7280',
      onClick: () => {
        navigate({ to: '/settings' });
        setIsOpen(false);
      },
    },
  ];

  const allActions = isExpanded 
    ? [...mainActions, ...recentAgents, ...secondaryActions]
    : mainActions;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '12px',
      }}
    >
      {/* Action Menu */}
      {isOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '8px',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          {allActions.map((action, index) => (
            <button
              key={action.id}
              onClick={action.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: 'rgba(15, 15, 18, 0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                color: '#f3f4f6',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.15s ease',
                animation: `slideIn 0.2s ease-out ${index * 0.05}s both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(-4px)';
                e.currentTarget.style.borderColor = action.color;
                e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), 0 0 20px ${action.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
              }}
            >
              <span style={{ color: action.color }}>{action.icon}</span>
              <span>{action.label}</span>
              {action.shortcut && (
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: '#6b7280',
                  fontFamily: 'monospace',
                }}>
                  {action.shortcut}
                </span>
              )}
            </button>
          ))}

          {/* Show More/Less Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#6b7280',
              fontSize: '11px',
              cursor: 'pointer',
              alignSelf: 'center',
            }}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isOpen ? 'rgba(239, 68, 68, 0.9)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isOpen 
            ? '0 4px 24px rgba(239, 68, 68, 0.4)' 
            : '0 4px 24px rgba(59, 130, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = isOpen ? 'rotate(45deg) scale(1.1)' : 'rotate(0) scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'rotate(45deg)' : 'rotate(0)';
        }}
        title={isOpen ? 'Close' : 'Quick Actions'}
      >
        {isOpen ? (
          <X className="w-6 h-6" style={{ color: 'white' }} />
        ) : (
          <Plus className="w-6 h-6" style={{ color: 'white' }} />
        )}
      </button>

      {/* Keyboard Hint */}
      {!isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '64px',
            right: '0',
            padding: '6px 10px',
            background: 'rgba(0,0,0,0.8)',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#6b7280',
            whiteSpace: 'nowrap',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
          }}
          className="quick-actions-hint"
        >
          Press <strong style={{ color: '#3b82f6' }}>Q</strong> for quick actions
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .quick-actions-hint {
          opacity: 0;
        }
        button:hover + .quick-actions-hint {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

// Hook to integrate Quick Actions with keyboard shortcut
export function useQuickActionsKeyboard(shortcut: string = 'q') {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in input fields
      const targetElement = e.target as HTMLElement;
      const isInputField = 
        targetElement.tagName === 'INPUT' ||
        targetElement.tagName === 'TEXTAREA' ||
        targetElement.isContentEditable;

      if (isInputField) return;

      if (e.key.toLowerCase() === shortcut.toLowerCase() && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcut]);

  return { isOpen, setIsOpen };
}

export default QuickActions;

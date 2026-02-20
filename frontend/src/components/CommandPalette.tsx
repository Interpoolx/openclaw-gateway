import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  Settings,
  Plus,
  Search,
  Command,
  Activity,
  FolderKanban,
  Zap,
  ChevronRight
} from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action' | 'creation' | 'view' | 'help';
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  agents?: Array<{ id: string; name: string; avatar?: string }>;
  workspaces?: Array<{ id: string; name: string }>;
}

// Fuzzy match algorithm
function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact match gets highest score
  if (lowerText === lowerQuery) return { match: true, score: 100 };

  // Starts with query
  if (lowerText.startsWith(lowerQuery)) return { match: true, score: 90 };

  // Contains query as substring
  if (lowerText.includes(lowerQuery)) return { match: true, score: 70 };

  // Fuzzy match - all characters in order
  let queryIdx = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -1;

  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      if (lastMatchIdx === i - 1) consecutiveBonus += 5;
      lastMatchIdx = i;
      queryIdx++;
    }
  }

  if (queryIdx === lowerQuery.length) {
    const score = 50 + consecutiveBonus - (lastMatchIdx - lowerQuery.length);
    return { match: true, score: Math.max(10, Math.min(score, 69)) };
  }

  return { match: false, score: 0 };
}

export function CommandPalette({ isOpen, onClose, agents = [], workspaces = [] }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { currentWorkspaceId, currentWorkspace } = useWorkspace();
  const workspaceSlug = currentWorkspace?.slug || currentWorkspaceId;

  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const cmds: CommandItem[] = [
      // Navigation commands
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'View overview and stats',
        shortcut: 'G D',
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: 'navigation',
        action: () => {
          if (workspaceSlug) {
            navigate({ to: '/$workspaceId/dashboard', params: { workspaceId: workspaceSlug } });
          }
          onClose();
        },
        keywords: ['home', 'overview', 'stats']
      },
      {
        id: 'nav-agents',
        label: 'Go to Agents',
        description: 'Manage AI agents',
        shortcut: 'G A',
        icon: <Users className="w-4 h-4" />,
        category: 'navigation',
        action: () => {
          if (workspaceSlug) {
            navigate({ to: '/$workspaceId/agents', params: { workspaceId: workspaceSlug } });
          }
          onClose();
        },
        keywords: ['agents', 'bots', 'ai']
      },
      {
        id: 'nav-tasks',
        label: 'Go to Command Center',
        description: 'Task management and Kanban',
        shortcut: 'G T',
        icon: <CheckSquare className="w-4 h-4" />,
        category: 'navigation',
        action: () => {
          if (workspaceSlug) {
            navigate({ to: '/$workspaceId/command-center', params: { workspaceId: workspaceSlug } });
          }
          onClose();
        },
        keywords: ['tasks', 'kanban', 'command', 'center']
      },
      {
        id: 'nav-projects',
        label: 'Go to Projects',
        description: 'Projects and milestones',
        shortcut: 'G R',
        icon: <FolderKanban className="w-4 h-4" />,
        category: 'navigation',
        action: () => {
          if (workspaceSlug) {
            navigate({ to: '/$workspaceId/projects', params: { workspaceId: workspaceSlug } });
          }
          onClose();
        },
        keywords: ['projects', 'milestones', 'tracks']
      },
      {
        id: 'nav-sessions',
        label: 'Go to Sessions',
        description: 'Active agent sessions',
        shortcut: 'G S',
        icon: <Activity className="w-4 h-4" />,
        category: 'navigation',
        action: () => {
          if (workspaceSlug) {
            navigate({ to: '/$workspaceId/sessions', params: { workspaceId: workspaceSlug } });
          }
          onClose();
        },
        keywords: ['sessions', 'active', 'monitoring']
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        description: 'System configuration',
        shortcut: 'G ,',
        icon: <Settings className="w-4 h-4" />,
        category: 'navigation',
        action: () => {
          if (workspaceSlug) {
            navigate({ to: '/$workspaceId/settings', params: { workspaceId: workspaceSlug } });
          }
          onClose();
        },
        keywords: ['settings', 'config', 'preferences']
      },

      // Creation commands
      {
        id: 'create-task',
        label: 'Create New Task',
        description: 'Add a task to the board',
        shortcut: 'Ctrl+N',
        icon: <Plus className="w-4 h-4" />,
        category: 'creation',
        action: () => {
          navigate({ to: '/command-center', search: { action: 'create-task' } });
          onClose();
        },
        keywords: ['new', 'add', 'task', 'create']
      },
      {
        id: 'create-project',
        label: 'Create New Project',
        description: 'Start a new project',
        shortcut: 'Ctrl+Shift+N',
        icon: <FolderKanban className="w-4 h-4" />,
        category: 'creation',
        action: () => {
          navigate({ to: '/projects', search: { action: 'create' } });
          onClose();
        },
        keywords: ['new', 'add', 'project', 'create']
      },
      {
        id: 'create-agent',
        label: 'Create New Agent',
        description: 'Add a new AI agent',
        shortcut: 'Ctrl+Shift+A',
        icon: <Users className="w-4 h-4" />,
        category: 'creation',
        action: () => {
          navigate({ to: '/agents', search: { action: 'create' } });
          onClose();
        },
        keywords: ['new', 'add', 'agent', 'bot', 'create']
      },

      // View commands
      {
        id: 'view-calendar',
        label: 'View Calendar',
        description: 'Task calendar view',
        shortcut: 'Ctrl+Shift+C',
        icon: <Calendar className="w-4 h-4" />,
        category: 'view',
        action: () => {
          navigate({ to: '/command-center', search: { view: 'calendar' } });
          onClose();
        },
        keywords: ['calendar', 'schedule', 'date', 'view']
      },
      {
        id: 'view-list',
        label: 'View List',
        description: 'Task list view',
        shortcut: 'Ctrl+Shift+L',
        icon: <CheckSquare className="w-4 h-4" />,
        category: 'view',
        action: () => {
          navigate({ to: '/command-center', search: { view: 'list' } });
          onClose();
        },
        keywords: ['list', 'view', 'tasks']
      },

      // Help commands
      {
        id: 'help-shortcuts',
        label: 'Show Keyboard Shortcuts',
        description: 'View all available shortcuts',
        shortcut: '?',
        icon: <Command className="w-4 h-4" />,
        category: 'help',
        action: () => setShowShortcuts(true),
        keywords: ['help', 'shortcuts', 'keyboard', 'commands']
      }
    ];

    // Add agent switching commands
    agents.forEach((agent, idx) => {
      cmds.push({
        id: `agent-${agent.id}`,
        label: `Switch to: ${agent.name}`,
        description: 'View agent details',
        shortcut: idx < 9 ? `Ctrl+${idx + 1}` : undefined,
        icon: <span className="text-lg">{agent.avatar || '🤖'}</span>,
        category: 'navigation',
        action: () => {
          navigate({ to: '/agents/$agentId', params: { agentId: agent.id } });
          onClose();
        },
        keywords: ['agent', agent.name.toLowerCase(), 'switch']
      });
    });

    // Add workspace switching commands
    workspaces.forEach((workspace) => {
      cmds.push({
        id: `workspace-${workspace.id}`,
        label: `Switch Workspace: ${workspace.name}`,
        description: 'Change active workspace',
        icon: <Zap className="w-4 h-4" />,
        category: 'navigation',
        action: () => {
          // Workspace switching logic would go here
          onClose();
        },
        keywords: ['workspace', workspace.name.toLowerCase(), 'switch']
      });
    });

    return cmds;
  }, [navigate, onClose, agents, workspaces, workspaceSlug]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    return commands
      .map(cmd => {
        const labelMatch = fuzzyMatch(query, cmd.label);
        const descMatch = cmd.description ? fuzzyMatch(query, cmd.description) : { match: false, score: 0 };
        const keywordMatch = cmd.keywords?.some(k => fuzzyMatch(query, k).match) ?? false;

        const score = Math.max(
          labelMatch.score,
          descMatch.score * 0.5,
          keywordMatch ? 60 : 0
        );

        return { cmd, match: labelMatch.match || descMatch.match || keywordMatch, score };
      })
      .filter(item => item.match)
      .sort((a, b) => b.score - a.score)
      .map(item => item.cmd);
  }, [commands, query]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setShowShortcuts(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const executeSelected = useCallback(() => {
    if (filteredCommands[selectedIndex]) {
      filteredCommands[selectedIndex].action();
    }
  }, [filteredCommands, selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        executeSelected();
        break;
      case 'Escape':
        e.preventDefault();
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          onClose();
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
        } else {
          setSelectedIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        }
        break;
    }
  }, [filteredCommands.length, executeSelected, onClose, showShortcuts]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl+K / ⌘K', desc: 'Open command palette' },
    { key: 'Ctrl+N', desc: 'Create new task' },
    { key: 'Ctrl+Shift+N', desc: 'Create new project' },
    { key: 'Ctrl+Shift+A', desc: 'Create new agent' },
    { key: 'G then D', desc: 'Go to Dashboard' },
    { key: 'G then T', desc: 'Go to Command Center' },
    { key: 'G then A', desc: 'Go to Agents' },
    { key: 'G then R', desc: 'Go to Tracks' },
    { key: 'G then S', desc: 'Go to Sessions' },
    { key: 'Ctrl+Shift+C', desc: 'View Calendar' },
    { key: 'Ctrl+Shift+L', desc: 'View List' },
    { key: '↑/↓', desc: 'Navigate commands' },
    { key: 'Enter', desc: 'Execute command' },
    { key: 'Escape', desc: 'Close palette' },
    { key: '?', desc: 'Show this help' }
  ];

  const categoryColors: Record<string, string> = {
    navigation: '#3b82f6',
    action: '#22c55e',
    creation: '#f59e0b',
    view: '#8b5cf6',
    help: '#6b7280'
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    navigation: <Zap className="w-3 h-3" />,
    action: <Activity className="w-3 h-3" />,
    creation: <Plus className="w-3 h-3" />,
    view: <Search className="w-3 h-3" />,
    help: <Command className="w-3 h-3" />
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '120px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#0f0f12',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          animation: 'slideIn 0.15s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <Command style={{ width: 20, height: 20, color: '#71717a' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder={showShortcuts ? 'Keyboard Shortcuts' : 'Type a command or search...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={showShortcuts}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#f3f4f6',
              fontSize: '16px',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <span style={{
            fontSize: '12px',
            color: '#71717a',
            padding: '4px 8px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px'
          }}>
            ESC
          </span>
        </div>

        {showShortcuts ? (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <Command style={{ width: 14, height: 14 }} />
              Keyboard Shortcuts
            </div>
            <div style={{ padding: '12px 0' }}>
              {shortcuts.map(({ key, desc }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 20px',
                    fontSize: '14px'
                  }}
                >
                  <span style={{ color: '#9ca3af' }}>{desc}</span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#f3f4f6',
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '4px'
                  }}>{key}</span>
                </div>
              ))}
            </div>
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '12px',
              color: '#71717a',
              textAlign: 'center'
            }}>
              Press <span style={{
                padding: '2px 6px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                color: '#f3f4f6'
              }}>ESC</span> to go back
            </div>
          </div>
        ) : (
          <div
            ref={listRef}
            style={{
              maxHeight: '400px',
              overflow: 'auto',
              padding: '8px 0'
            }}
          >
            {filteredCommands.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <Search style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>No commands found</div>
                <div style={{ fontSize: '12px' }}>Try a different search term</div>
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => (
                <div
                  key={cmd.id}
                  data-selected={idx === selectedIndex}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${idx === selectedIndex ? categoryColors[cmd.category] : 'transparent'}`,
                    background: idx === selectedIndex ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    style={{
                      color: categoryColors[cmd.category],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20
                    }}
                    title={cmd.category}
                  >
                    {categoryIcons[cmd.category]}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20 }}>
                    {cmd.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#f3f4f6',
                      fontWeight: 500,
                      marginBottom: '2px'
                    }}>
                      {cmd.label}
                    </div>
                    {cmd.description && (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {cmd.description}
                      </div>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#71717a',
                      padding: '3px 6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap'
                    }}>
                      {cmd.shortcut}
                    </span>
                  )}
                  {idx === selectedIndex && (
                    <ChevronRight style={{ width: 16, height: 16, color: '#71717a' }} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '11px',
          color: '#6b7280'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              padding: '2px 4px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              fontFamily: 'monospace'
            }}>↑↓</span>
            navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              padding: '2px 4px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              fontFamily: 'monospace'
            }}>↵</span>
            select
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              padding: '2px 4px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              fontFamily: 'monospace'
            }}>esc</span>
            close
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              padding: '2px 4px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              fontFamily: 'monospace'
            }}>?</span>
            help
          </span>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default CommandPalette;

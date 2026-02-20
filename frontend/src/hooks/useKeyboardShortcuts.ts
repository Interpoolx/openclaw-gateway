import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useWorkspace } from '../contexts/WorkspaceContext';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: { enabled?: boolean; target?: HTMLElement | Window } = {}
) {
  const { enabled = true, target = window } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const targetElement = event.target as HTMLElement;
    const isInputField =
      targetElement.tagName === 'INPUT' ||
      targetElement.tagName === 'TEXTAREA' ||
      targetElement.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatches = !!shortcut.shift === event.shiftKey;
      const altMatches = !!shortcut.alt === event.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        // Allow '/' and '?' in input fields for help
        if (isInputField && shortcut.key !== 'Escape' && shortcut.key !== '?') {
          continue;
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }

        shortcut.action();
        break;
      }
    }
  }, [enabled]);

  useEffect(() => {
    target.addEventListener('keydown', handleKeyDown as EventListener);
    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [handleKeyDown, target]);
}

// Predefined shortcuts for common navigation
export function useNavigationShortcuts(
  onCommandPalette: () => void,
  onCreateTask?: () => void,
  onCreateProject?: () => void,
  onCreateAgent?: () => void,
  options: { enabled?: boolean } = {}
) {
  const navigate = useNavigate();
  const { currentWorkspaceId, currentWorkspace } = useWorkspace();
  const { enabled = true } = options;
  const workspaceSlug = currentWorkspace?.slug || currentWorkspaceId;

  const shortcuts: ShortcutConfig[] = [
    // Command Palette
    {
      key: 'k',
      ctrl: true,
      action: onCommandPalette,
      description: 'Open Command Palette',
      preventDefault: true
    },
    {
      key: 'k',
      meta: true,
      action: onCommandPalette,
      description: 'Open Command Palette (Mac)',
      preventDefault: true
    },

    // Creation shortcuts
    ...(onCreateTask ? [{
      key: 'n',
      ctrl: true,
      action: onCreateTask,
      description: 'Create New Task',
      preventDefault: true
    } as ShortcutConfig] : []),

    ...(onCreateProject ? [{
      key: 'n',
      ctrl: true,
      shift: true,
      action: onCreateProject,
      description: 'Create New Project',
      preventDefault: true
    } as ShortcutConfig] : []),

    ...(onCreateAgent ? [{
      key: 'a',
      ctrl: true,
      shift: true,
      action: onCreateAgent,
      description: 'Create New Agent',
      preventDefault: true
    } as ShortcutConfig] : []),

    // Navigation shortcuts with G prefix
    {
      key: 'g',
      action: () => {
        // Set up one-time listener for next key
        const handler = (e: KeyboardEvent) => {
          switch (e.key.toLowerCase()) {
            case 'd':
              e.preventDefault();
              navigate({ to: '/$workspaceId/dashboard', params: { workspaceId: workspaceSlug! } });
              break;
            case 't':
              e.preventDefault();
              navigate({ to: '/$workspaceId/command-center', params: { workspaceId: workspaceSlug! } });
              break;
            case 'a':
              e.preventDefault();
              navigate({ to: '/$workspaceId/agents', params: { workspaceId: workspaceSlug! } });
              break;
            case 'r':
              e.preventDefault();
              navigate({ to: '/$workspaceId/projects', params: { workspaceId: workspaceSlug! } });
              break;
            case 's':
              e.preventDefault();
              navigate({ to: '/$workspaceId/sessions', params: { workspaceId: workspaceSlug! } });
              break;
            case ',':
              e.preventDefault();
              navigate({ to: '/$workspaceId/settings', params: { workspaceId: workspaceSlug! } });
              break;
          }
          window.removeEventListener('keydown', handler);
        };

        // Listen for next key press
        window.addEventListener('keydown', handler, { once: true });

        // Clear listener after 1 second if no key pressed
        setTimeout(() => {
          window.removeEventListener('keydown', handler);
        }, 1000);
      },
      description: 'Go to... (followed by D/T/A/R/S/,)',
      preventDefault: false
    },

    // View shortcuts
    {
      key: 'c',
      ctrl: true,
      shift: true,
      action: () => {
        navigate({ to: '/command-center', search: { view: 'calendar' } });
      },
      description: 'View Calendar',
      preventDefault: true
    },
    {
      key: 'l',
      ctrl: true,
      shift: true,
      action: () => {
        navigate({ to: '/command-center', search: { view: 'list' } });
      },
      description: 'View List',
      preventDefault: true
    },

    // Help
    {
      key: '?',
      action: () => {
        // This is handled by Command Palette
        onCommandPalette();
      },
      description: 'Show Keyboard Shortcuts',
      preventDefault: true
    },

    // Escape to close modals
    {
      key: 'Escape',
      action: () => {
        // This should be handled by modal components
        // But we can emit an event or call a callback
      },
      description: 'Close modals/panels',
      preventDefault: false
    }
  ];

  useKeyboardShortcuts(shortcuts, { enabled });

  return shortcuts;
}

// Hook for managing agent-specific shortcuts
export function useAgentShortcuts(
  agents: Array<{ id: string; name: string }>,
  onSelectAgent: (agentId: string) => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  const shortcuts: ShortcutConfig[] = agents.slice(0, 9).map((agent, index) => ({
    key: String(index + 1),
    ctrl: true,
    action: () => onSelectAgent(agent.id),
    description: `Switch to ${agent.name}`,
    preventDefault: true
  }));

  useKeyboardShortcuts(shortcuts, { enabled });

  return shortcuts;
}

export default useKeyboardShortcuts;

import { useEffect, useRef, useCallback } from 'react';
import { Task, updateTask, createTaskMessage } from '../lib/api';

interface TaskStatusUpdate {
  taskIdSuffix: string;
  newStatus: Task['status'];
  confidence: 'high' | 'medium' | 'low';
}

// Parse task status updates from agent messages
// Supports formats like:
// - [TASK #abc123 DONE]
// - [TASK #abc123 STATUS:in_progress]
// - [TASK #abc123 ACTIVE]
// - Task #abc123 is complete
// - Completed task #abc123
export function parseTaskStatusUpdate(text: string): TaskStatusUpdate | null {
  const trimmedText = text.trim();
  
  // Pattern 1: [TASK #abc123 STATUS:status]
  const statusPattern = /\[TASK #([a-zA-Z0-9]+)\s+STATUS:(\w+)\]/i;
  const statusMatch = trimmedText.match(statusPattern);
  
  if (statusMatch) {
    const statusMap: Record<string, Task['status']> = {
      'inbox': 'inbox',
      'assigned': 'assigned',
      'in_progress': 'in_progress',
      'active': 'in_progress',
      'working': 'in_progress',
      'review': 'review',
      'done': 'done',
      'complete': 'done',
      'completed': 'done',
      'finished': 'done',
      'archived': 'archived',
      'waiting': 'waiting'
    };
    
    const status = statusMap[statusMatch[2].toLowerCase()];
    if (status) {
      return { 
        taskIdSuffix: statusMatch[1], 
        newStatus: status,
        confidence: 'high'
      };
    }
  }
  
  // Pattern 2: [TASK #abc123 STATUS]
  const shortPattern = /\[TASK #([a-zA-Z0-9]+)\s+(DONE|COMPLETE|COMPLETED|FINISHED|ACTIVE|STARTED|REVIEW|ARCHIVED)\]/i;
  const shortMatch = trimmedText.match(shortPattern);
  
  if (shortMatch) {
    const shortStatusMap: Record<string, Task['status']> = {
      'done': 'done',
      'complete': 'done',
      'completed': 'done',
      'finished': 'done',
      'active': 'in_progress',
      'started': 'in_progress',
      'review': 'review',
      'archived': 'archived'
    };
    
    const status = shortStatusMap[shortMatch[2].toLowerCase()];
    if (status) {
      return { 
        taskIdSuffix: shortMatch[1], 
        newStatus: status,
        confidence: 'high'
      };
    }
  }
  
  // Pattern 3: Natural language patterns (lower confidence)
  const naturalPatterns = [
    { pattern: /(?:completed?|finished?|done with)\s+(?:task\s+)?#?([a-zA-Z0-9]+)/i, status: 'done' as const },
    { pattern: /(?:started?|working on|began)\s+(?:task\s+)?#?([a-zA-Z0-9]+)/i, status: 'in_progress' as const },
    { pattern: /(?:reviewing?|in review)\s+(?:task\s+)?#?([a-zA-Z0-9]+)/i, status: 'review' as const },
    { pattern: /(?:archived?)\s+(?:task\s+)?#?([a-zA-Z0-9]+)/i, status: 'archived' as const },
  ];
  
  for (const { pattern, status } of naturalPatterns) {
    const match = trimmedText.match(pattern);
    if (match) {
      return {
        taskIdSuffix: match[1],
        newStatus: status,
        confidence: 'medium'
      };
    }
  }
  
  return null;
}

interface UseTaskStatusParserOptions {
  tasks: Task[];
  onStatusChange?: (task: Task, newStatus: Task['status']) => void;
  enableNotifications?: boolean;
}

export function useTaskStatusParser({
  tasks,
  onStatusChange,
  enableNotifications = true
}: UseTaskStatusParserOptions) {
  const tasksRef = useRef(tasks);
  
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const processMessage = useCallback(async (message: string, sourceAgentId?: string) => {
    const update = parseTaskStatusUpdate(message);
    
    if (!update) return null;
    
    // Find matching task by ID suffix
    const matchingTask = tasksRef.current.find(t => 
      t.id.toLowerCase().endsWith(update.taskIdSuffix.toLowerCase()) ||
      t.id.slice(-6).toLowerCase() === update.taskIdSuffix.toLowerCase()
    );
    
    if (!matchingTask) {
      console.log(`[TaskParser] No task found for suffix: ${update.taskIdSuffix}`);
      return null;
    }
    
    // Don't update if status is the same
    if (matchingTask.status === update.newStatus) {
      return null;
    }
    
    console.log(`[TaskParser] Updating task "${matchingTask.title}" from ${matchingTask.status} to ${update.newStatus}`);
    
    try {
      // Update task status
      await updateTask(matchingTask.id, { 
        status: update.newStatus,
        ...(update.newStatus === 'done' ? { completedAt: new Date().toISOString() } : {}),
        ...(update.newStatus === 'in_progress' && !matchingTask.startedAt ? { startedAt: new Date().toISOString() } : {})
      });
      
      // Add system message to task
      await createTaskMessage(
        matchingTask.id,
        `Status updated to "${update.newStatus.replace('_', ' ')}" by agent${sourceAgentId ? ` (${sourceAgentId})` : ''}`,
        'system'
      );
      
      // Notify parent component
      onStatusChange?.(matchingTask, update.newStatus);
      
      // Show browser notification if enabled
      if (enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Task Status Updated', {
          body: `"${matchingTask.title}" is now ${update.newStatus.replace('_', ' ')}`,
          icon: '/favicon.png',
          tag: `task-${matchingTask.id}`
        });
      }
      
      return {
        task: matchingTask,
        oldStatus: matchingTask.status,
        newStatus: update.newStatus,
        confidence: update.confidence
      };
    } catch (error) {
      console.error('[TaskParser] Failed to update task status:', error);
      return null;
    }
  }, [onStatusChange, enableNotifications]);

  return { processMessage, parseTaskStatusUpdate };
}

// Hook to listen for OpenClaw messages and auto-parse task updates
interface UseOpenClawTaskListenerOptions {
  tasks: Task[];
  onStatusChange?: (task: Task, newStatus: Task['status']) => void;
  pollingInterval?: number;
  enableAutoUpdate?: boolean;
}

export function useOpenClawTaskListener({
  tasks,
  onStatusChange,
  pollingInterval = 5000,
  enableAutoUpdate = true
}: UseOpenClawTaskListenerOptions) {
  const { processMessage } = useTaskStatusParser({
    tasks,
    onStatusChange,
    enableNotifications: true
  });

  useEffect(() => {
    if (!enableAutoUpdate) return;

    // Poll for new messages from OpenClaw
    const pollMessages = async () => {
      try {
        // Get recent messages from localStorage (populated by OpenClaw integration)
        const recentMessages = localStorage.getItem('openclaw_recent_messages');
        if (recentMessages) {
          const messages = JSON.parse(recentMessages);
          for (const msg of messages) {
            await processMessage(msg.content, msg.agentId);
          }
          // Clear processed messages
          localStorage.removeItem('openclaw_recent_messages');
        }
      } catch (error) {
        console.error('[OpenClawTaskListener] Error polling messages:', error);
      }
    };

    const interval = setInterval(pollMessages, pollingInterval);
    
    // Also listen for storage events (in case other tabs update)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'openclaw_recent_messages' && e.newValue) {
        try {
          const messages = JSON.parse(e.newValue);
          for (const msg of messages) {
            processMessage(msg.content, msg.agentId);
          }
        } catch (error) {
          console.error('[OpenClawTaskListener] Error processing storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [processMessage, pollingInterval, enableAutoUpdate]);

  return { processMessage };
}

export default useTaskStatusParser;

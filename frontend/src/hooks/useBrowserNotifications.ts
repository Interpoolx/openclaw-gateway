import { useEffect, useState, useCallback } from 'react';

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  onClick?: () => void;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('[Notifications] Failed to request permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const showNotification = useCallback((options: NotificationOptions): Notification | null => {
    if (!isSupported || permission !== 'granted') {
      console.log('[Notifications] Cannot show notification - permission not granted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction,
        badge: '/favicon.png',
        silent: false,
      });

      if (options.onClick) {
        notification.onclick = () => {
          options.onClick?.();
          notification.close();
        };
      }

      // Auto-close after 10 seconds unless requireInteraction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      return notification;
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const notifyTaskAssigned = useCallback((taskTitle: string, taskId: string, onClick?: () => void) => {
    return showNotification({
      title: 'Task Assigned',
      body: `"${taskTitle}" has been assigned to you`,
      tag: `task-assigned-${taskId}`,
      onClick
    });
  }, [showNotification]);

  const notifyTaskCompleted = useCallback((taskTitle: string, taskId: string, onClick?: () => void) => {
    return showNotification({
      title: 'Task Completed',
      body: `"${taskTitle}" has been completed`,
      tag: `task-completed-${taskId}`,
      onClick
    });
  }, [showNotification]);

  const notifyTaskStatusChange = useCallback((
    taskTitle: string, 
    taskId: string, 
    newStatus: string,
    onClick?: () => void
  ) => {
    return showNotification({
      title: 'Task Status Updated',
      body: `"${taskTitle}" is now ${newStatus}`,
      tag: `task-status-${taskId}`,
      onClick
    });
  }, [showNotification]);

  const notifyAgentMessage = useCallback((
    agentName: string, 
    message: string,
    agentId: string,
    onClick?: () => void
  ) => {
    return showNotification({
      title: `${agentName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      tag: `agent-message-${agentId}`,
      onClick
    });
  }, [showNotification]);

  const notifyError = useCallback((error: string, onClick?: () => void) => {
    return showNotification({
      title: 'Error',
      body: error,
      tag: 'error',
      requireInteraction: true,
      onClick
    });
  }, [showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    notifyTaskAssigned,
    notifyTaskCompleted,
    notifyTaskStatusChange,
    notifyAgentMessage,
    notifyError
  };
}

// Hook to request notification permission on mount
export function useRequestNotificationPermission(autoRequest = true) {
  const { isSupported, permission, requestPermission } = useBrowserNotifications();

  useEffect(() => {
    if (autoRequest && isSupported && permission === 'default') {
      // Wait a bit before requesting to not annoy the user immediately
      const timer = setTimeout(() => {
        requestPermission();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [autoRequest, isSupported, permission, requestPermission]);

  return { isSupported, permission, requestPermission };
}

export default useBrowserNotifications;

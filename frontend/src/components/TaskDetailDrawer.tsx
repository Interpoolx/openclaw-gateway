import { useState, useEffect } from 'react';
import { X, MessageSquare, FileText, Play, Loader2, Bot, Calendar } from 'lucide-react';
import { Task } from '../lib/api';
import { TaskChatHistory } from './chat/TaskChatHistory';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeTaskInOpenClaw, updateTask, assignTask, createTask } from '../lib/api';
import { useAgents } from '../hooks/useAgents';
import { toast } from 'sonner';

interface TaskDetailDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}


export function TaskDetailDrawer({ task, isOpen, onClose }: TaskDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'chat'>('info');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { data: agents } = useAgents();

  // Reset edited task when task changes
  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeIds: task.assigneeIds || [],
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '' as any,
        tags: (Array.isArray(task.tags) ? task.tags.join(', ') : '') as any,
      });
      setActiveTab('info');
    } else {
      // Create mode
      setEditedTask({
        title: '',
        description: '',
        status: 'inbox',
        priority: 'medium',
        assigneeIds: [],
        dueDate: '' as any,
        tags: '' as any,
      });
      setActiveTab('info');
    }
  }, [task, isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const executeMutation = useMutation({
    mutationFn: () => {
      if (!task) return Promise.reject('No task');
      setIsExecuting(true);
      return executeTaskInOpenClaw(task.id, {
        prompt: task.description || task.title,
        agent: getAssignedAgent()?.name || 'main',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-messages', task?.id] });
      setActiveTab('chat');
      toast.success('Task execution started in OpenClaw');
      setTimeout(() => setIsExecuting(false), 3000);
    },
    onError: (err) => {
      setIsExecuting(false);
      toast.error(`Execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Task>) => {
      if (task?.id) {
        return updateTask(task.id, data);
      } else {
        return createTask(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
      setIsSaving(false);
      toast.success(task ? 'Changes saved' : 'Task created');
      if (!task) onClose(); // Close drawer after creation
    },
    onError: (err) => {
      setIsSaving(false);
      toast.error(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!task) return Promise.reject('No task');
      return updateTask(task.id, { status: 'archived' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task archived successfully');
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to delete task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  const handleSave = async () => {
    if (!editedTask.title?.trim()) {
      toast.error('Task title is required');
      return;
    }
    setIsSaving(true);
    const tagsArr = editedTask.tags
      ? (typeof editedTask.tags === 'string'
        ? (editedTask.tags as string).split(',').map(t => t.trim()).filter(Boolean)
        : editedTask.tags)
      : [];

    if (task?.id && editedTask.assigneeIds?.[0]) {
      try {
        await assignTask(task.id, editedTask.assigneeIds[0]);
      } catch (err) {
        console.error('Failed to call dedicated assignTask endpoint:', err);
      }
    }

    const finalTask = {
      ...editedTask,
      tags: tagsArr,
      scheduledDate: editedTask.dueDate || null,
      assigneeIds: editedTask.assigneeIds || [],
    };

    saveMutation.mutate(finalTask as any);
  };

  const getAssignedAgent = () => {
    if (!task?.assigneeIds?.length || !agents) return null;
    return (agents as import('../lib/api').Agent[]).find((a: import('../lib/api').Agent) => a.id === task.assigneeIds[0]);
  };

  const assignedAgent = getAssignedAgent();

  const [showContent, setShowContent] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShowContent(true);
    } else {
      const timer = setTimeout(() => setShowContent(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!showContent && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`cc-drawer-backdrop fixed inset-0 bg-black/70 backdrop-blur-md z-[100] transition-opacity duration-400 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={`cc-drawer fixed top-0 right-0 bottom-0 w-[640px] max-w-full z-[101] transition-transform duration-400 cubic-bezier[0.4,0,0.2,1] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header - Glassmorphism */}
        <div className="cc-drawer__header">
          <div className="cc-drawer__title-group">
            <h2 className="cc-drawer__title">
              {task ? 'Edit Task' : 'New Task'}
            </h2>
            {task && (
              <span
                className="cc-status-badge px-2.5 py-0.5 rounded-xl text-[10px] font-extrabold uppercase text-white"
                style={{
                  background: getStatusColor(task.status),
                  boxShadow: `0 0 10px ${getStatusColor(task.status)}44`
                }}
              >
                {task.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <button onClick={onClose} className="cc-column__collapse-btn p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="cc-drawer__tabs-container">
          <div className="cc-tabs-segmented">
            <button
              className={`cc-tab-segmented ${activeTab === 'info' ? 'cc-tab-segmented--active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <FileText className="w-4 h-4" />
              Configuration
            </button>
            <button
              className={`cc-tab-segmented flex items-center gap-2 ${activeTab === 'chat' ? 'cc-tab-segmented--active' : ''} ${task ? 'opacity-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => {
                if (!task) {
                  toast.error('Save the task first to enable chat');
                  return;
                }
                setActiveTab('chat');
              }}
            >
              <MessageSquare className="w-4 h-4" />
              Chat & History
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'info' ? (
            <div className="cc-drawer__scroll-area">
              {/* Context Section */}
              <div className="cc-drawer__section">
                <div className="cc-drawer__section-title">Task Context</div>

                <div className="cc-drawer__field">
                  <label className="cc-drawer__label">Task Identifier / Title</label>
                  <input
                    className="cc-drawer__input"
                    type="text"
                    placeholder="Brief objective..."
                    value={editedTask.title || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                  />
                </div>

                <div className="cc-drawer__field">
                  <label className="cc-drawer__label">Operational Details / Prompt</label>
                  <textarea
                    className="cc-drawer__textarea"
                    placeholder="Instructions for the agent..."
                    value={editedTask.description || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                    rows={6}
                  />
                </div>
              </div>

              {/* Parameters Section */}
              <div className="cc-drawer__section">
                <div className="cc-drawer__section-title">Execution Parameters</div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
                  <div className="cc-drawer__field">
                    <label className="cc-drawer__label">Current Status</label>
                    <select
                      className="cc-drawer__select"
                      value={editedTask.status || ''}
                      onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as any })}
                    >
                      <option value="inbox">📥 Inbox</option>
                      <option value="waiting">📋 To Do</option>
                      <option value="in_progress">⚡ In Progress</option>
                      <option value="done">✅ Done</option>
                      <option value="archived">📁 Archived</option>
                    </select>
                  </div>
                  <div className="cc-drawer__field">
                    <label className="cc-drawer__label">Priority Level</label>
                    <select
                      className="cc-drawer__select"
                      value={editedTask.priority || ''}
                      onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🟠 High</option>
                      <option value="urgent">🔴 Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="cc-drawer__field">
                    <label className="cc-drawer__label">Target Date</label>
                    <div className="relative">
                      <Calendar
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 opacity-50 pointer-events-none"
                      />
                      <input
                        className="cc-drawer__input pl-[34px]"
                        type="date"
                        value={editedTask.dueDate ? (editedTask.dueDate as any) : ''}
                        onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value as any })}
                      />
                    </div>
                  </div>
                  <div className="cc-drawer__field">
                    <label className="cc-drawer__label">Categorization (Tags)</label>
                    <input
                      className="cc-drawer__input"
                      type="text"
                      placeholder="bug, feature, etc..."
                      value={editedTask.tags ? (editedTask.tags as any) : ''}
                      onChange={(e) => setEditedTask({ ...editedTask, tags: e.target.value as any })}
                    />
                  </div>
                </div>

                <div className="cc-drawer__field">
                  <label className="cc-drawer__label">Assigned Executive Agent</label>
                  <select
                    className="cc-drawer__select"
                    value={editedTask.assigneeIds?.[0] || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, assigneeIds: e.target.value ? [e.target.value] : [] })}
                  >
                    <option value="">System Default</option>
                    {(agents as any)?.map((agent: any) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.avatar} {agent.name} — {agent.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Execution Trigger */}
              {task && (
                <div className="cc-drawer__section">
                  <button
                    onClick={() => executeMutation.mutate()}
                    disabled={isExecuting || executeMutation.isPending}
                    className="cc-btn-primary w-full p-3.5 rounded-xl justify-center text-[14px]"
                  >
                    {isExecuting ? <Loader2 className="animate-spin" /> : <Play size={16} />}
                    {isExecuting ? 'Starting...' : 'Update and run in OpenClaw'}
                  </button>
                  {assignedAgent && (
                    <div className="text-center mt-2.5 text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1.5 font-bold">
                      <Bot size={12} />
                      Assigning to <span>{assignedAgent.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="cc-chat-pane">
              <TaskChatHistory
                taskId={task?.id || ''}
                isExecuting={isExecuting || executeMutation.isPending}
                agentName={assignedAgent?.name || 'Clawputant'}
                agentAvatar={assignedAgent?.avatar}
              />
            </div>
          )}
        </div>

        {/* Footer Utility Bar */}
        <div className="cc-drawer__footer">
          {task ? (
            <button className="cc-drawer__btn-delete" onClick={() => setShowDeleteConfirm(true)}>
              Archive Task
            </button>
          ) : <div></div>}

          <div className="flex gap-3">
            <button className="cc-drawer__btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="cc-drawer__btn-save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : (task ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </div>
      </div >

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-5">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 max-w-[400px] w-full text-center">
            <h3 className="text-[18px] font-semibold mb-3">Delete Task?</h3>
            <p className="text-[var(--text-muted)] text-[14px] mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 bg-transparent border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] cursor-pointer hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                className="px-5 py-2.5 bg-[#ef4444] border-none rounded-lg text-white cursor-pointer hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    inbox: '#8b5cf6',
    todo: '#3b82f6',
    assigned: '#3b82f6',
    waiting: '#3b82f6',
    in_progress: '#f59e0b',
    review: '#f59e0b',
    done: '#22c55e',
  };
  return colors[status] || '#6b7280';
}

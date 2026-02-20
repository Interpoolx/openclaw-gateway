import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Plus, Search, GripVertical, MoreVertical,
  Clock, CheckCircle, Circle, Archive, User
} from 'lucide-react';
import { getTasks, createTask, Task } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'tasks',
  component: TasksPage,
}) as any;

const statusColumns = [
  { id: 'inbox', title: 'Inbox', icon: Circle, color: 'text-dark-400' },
  { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-yellow-400' },
  { id: 'done', title: 'Done', icon: CheckCircle, color: 'text-green-400' },
  { id: 'archived', title: 'Archived', icon: Archive, color: 'text-dark-500' },
];

function TasksPage() {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { currentWorkspaceId } = useWorkspace();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', currentWorkspaceId],
    queryFn: () => getTasks(currentWorkspaceId ?? undefined, {}),
  });

  const filteredTasks = (tasks || []).filter((task: Task) =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark-100">Tasks</h1>
            <p className="text-dark-400 mt-2">Manage your AI agent tasks</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-dark-700 rounded w-24 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-24 bg-dark-700 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {statusColumns.map((column) => (
              <div key={column.id} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <column.icon className={`w-5 h-5 ${column.color}`} />
                  <h3 className="font-medium text-dark-200">{column.title}</h3>
                  <span className="ml-auto text-xs text-dark-500">
                    {filteredTasks.filter((t: Task) => t.status === column.id).length || 0}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredTasks
                    .filter((task: Task) => task.status === column.id)
                    .map((task: Task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTaskModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  const priorityColors: Record<string, string> = {
    low: 'bg-dark-500',
    medium: 'bg-blue-500',
    high: 'bg-yellow-500',
    urgent: 'bg-red-500',
  };

  return (
    <div className="p-3 bg-dark-800 rounded-lg border border-dark-700 hover:border-dark-600 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-dark-500 cursor-grab" />
          <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
        </div>
        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-dark-700 rounded">
          <MoreVertical className="w-4 h-4 text-dark-400" />
        </button>
      </div>
      <h4 className="font-medium text-dark-200 mt-2">{task.title}</h4>
      <p className="text-xs text-dark-400 mt-1 line-clamp-2">{task.description}</p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-dark-500" />
          <span className="text-xs text-dark-500">{task.assigneeIds?.length || 0}</span>
        </div>
        <span className="text-xs text-dark-500">
          {new Date(task.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card w-full max-w-lg mx-4">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-dark-100">Create New Task</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="card-body space-y-4">
            <div>
              <label className="input-label">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="Task title"
                required
              />
            </div>
            <div>
              <label className="input-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input min-h-[100px]"
                placeholder="Task description..."
              />
            </div>
            <div>
              <label className="input-label">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="p-4 border-t border-dark-700/50 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

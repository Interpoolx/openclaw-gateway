import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useProjects } from '../contexts/ProjectContext';
import { PageLayout, type PageConfig } from '../components/page-config/PageLayout';
import { Drawer } from '../components/ui/Drawer';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TrendingUp, Target, CheckCircle2, ListTodo, Eye, Edit2, Trash2, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';

// Helper function to format due date
function formatDueDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)} day${Math.abs(diffInDays) > 1 ? 's' : ''} overdue`;
  } else if (diffInDays === 0) {
    return 'Due today';
  } else if (diffInDays === 1) {
    return 'Due tomorrow';
  } else if (diffInDays < 7) {
    return `Due in ${diffInDays} days`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `Due in ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// Table columns with Tailwind classes
const columns = [
  {
    key: 'name', label: 'Name', sortable: true, render: (_: any, row: any) => (
      <div>
        <div className="text-white font-medium">{row.name}</div>
        {row.description && (
          <div className="text-gray-500 text-xs mt-1">
            {row.description.length > 50 ? row.description.slice(0, 50) + '...' : row.description}
          </div>
        )}
      </div>
    )
  },
  {
    key: 'status', label: 'Status', sortable: true, render: (value: string) => value ? (
      <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300 capitalize">
        {value}
      </span>
    ) : null
  },
  {
    key: 'category', label: 'Category', sortable: true, render: (value: string) => value ? (
      <span className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 capitalize">
        {value}
      </span>
    ) : null
  },
  {
    key: 'dueDate', label: 'Due Date', sortable: true, render: (value: string) => (
      <span className="text-gray-400 text-sm">
        {formatDueDate(value)}
      </span>
    )
  },
  {
    key: 'progress', label: 'Progress', sortable: false, render: (_: any, row: any) => row.totalTasks > 0 ? (
      <div className="flex items-center gap-2">
        <div className="w-15 h-1.5 bg-white/10 rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded"
            style={{ width: `${Math.round((row.completedTasks / row.totalTasks) * 100)}%` }}
          />
        </div>
        <span className="text-white text-xs">
          {Math.round((row.completedTasks / row.totalTasks) * 100)}%
        </span>
      </div>
    ) : <span className="text-gray-500 text-xs">-</span>
  },
  {
    key: 'tasks', label: 'Tasks', sortable: false, align: 'right' as const, render: (_: any, row: any) => (
      <span className="text-white text-sm">
        {row.completedTasks || 0}/{row.totalTasks || 0}
      </span>
    )
  },
];

// Actions configuration
const actions = [
  {
    label: 'View',
    icon: Eye,
    onClick: (row: any) => {
      console.log('View project:', row.id);
    },
    variant: 'secondary' as const,
  },
  {
    label: 'Edit',
    icon: Edit2,
    onClick: (row: any) => {
      console.log('Edit project:', row.id);
    },
    variant: 'secondary' as const,
  },
  {
    label: 'Delete',
    icon: Trash2,
    onClick: (row: any) => {
      console.log('Delete project:', row.id);
    },
    variant: 'danger' as const,
  },
];

// Simple unified PageConfig
const projectsPageConfig: PageConfig = {
  // Features
  stats: true,
  search: true,
  filter: true,
  dataDisplay: 'datatable',
  defaultView: 'table',
  showMultiView: false,
  multiViewOptions: ['grid', 'table'],
  importExport: false,
  addEditView: 'drawer' as const,

  // Pagination
  pagination: true,
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50],

  // Sorting
  sortable: true,
  defaultSortBy: 'name',
  defaultSortOrder: 'asc',

  // Table Columns
  columns,

  // Actions
  showActions: true,
  actions,

  // Labels
  labels: {
    title: 'Projects',
    subtitle: 'Manage your projects and track progress across your workspace',
    addButton: '+ New Project',
    searchPlaceholder: 'Search projects...',
    emptyMessage: 'No projects found',
    helpText: 'A project is a container for tasks that helps you organize and track your work. Projects can have multiple tasks assigned to different team members.',
    paginationInfo: (start: number, end: number, total: number) => `Showing ${start} to ${end} of ${total} projects`,
  },

  // Icon
  icon: TrendingUp,

  // Stats
  statsConfig: {
    cards: [
      { id: 'total', label: 'Total Projects', valueKey: 'totalProjects', icon: TrendingUp, color: 'blue' as const, format: 'number' as const },
      { id: 'tasks', label: 'Total Tasks', valueKey: 'totalTasks', icon: ListTodo, color: 'cyan' as const, format: 'number' as const },
      { id: 'active', label: 'Active Projects', valueKey: 'activeProjects', icon: Target, color: 'green' as const, format: 'number' as const },
      { id: 'completed', label: 'Completed Projects', valueKey: 'completedProjects', icon: CheckCircle2, color: 'purple' as const, format: 'number' as const },
    ],
  },

  // Filters
  filterOptions: [
    {
      key: 'status', label: 'All Status', options: [
        { value: 'active', label: 'Active' },
        { value: 'paused', label: 'Paused' },
        { value: 'completed', label: 'Completed' },
      ]
    },
    {
      key: 'category', label: 'All Categories', options: [
        { value: 'feature', label: 'Feature' },
        { value: 'bugfix', label: 'Bugfix' },
        { value: 'refactor', label: 'Refactor' },
        { value: 'research', label: 'Research' },
      ]
    },
  ],

  // Custom Grid View - Show tasks count and progress like table
  renderCustomGridView: (items: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((project) => (
        <div
          key={project.id}
          className="bg-[#1a1a1c] border border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-all cursor-pointer group"
          onClick={() => console.log('View project:', project.id)}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${project.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  project.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                    project.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-500/20 text-gray-400'
                  }`}>
                  {project.status || 'unknown'}
                </span>
                {project.category && (
                  <span className="px-2 py-0.5 rounded-full text-xs capitalize bg-purple-500/20 text-purple-400">
                    {project.category}
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold text-lg group-hover:text-blue-400 transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Tasks and Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <ListTodo size={14} />
                <span className="text-sm">Tasks</span>
              </div>
              <span className="text-white text-sm font-medium">
                {project.completedTasks || 0}/{project.totalTasks || 0}
              </span>
            </div>

            {project.totalTasks > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((project.completedTasks / project.totalTasks) * 100)}%` }}
                  />
                </div>
                <span className="text-white text-xs font-medium min-w-[40px] text-right">
                  {Math.round((project.completedTasks / project.totalTasks) * 100)}%
                </span>
              </div>
            ) : (
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gray-500/50 rounded-full" style={{ width: '0%' }} />
              </div>
            )}

            {/* Due Date */}
            {project.dueDate && (
              <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t border-white/5">
                <Clock size={14} className="text-amber-400" />
                <span>{formatDueDate(project.dueDate)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-white/5">
              {project.tags.slice(0, 3).map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="px-2 py-0.5 text-gray-500 text-xs">
                  +{project.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  ),

  // Form
  formConfig: {
    fields: [
      { id: 'name', type: 'text' as const, label: 'Name', placeholder: 'Enter project name', required: true },
      { id: 'description', type: 'textarea' as const, label: 'Description', placeholder: 'Describe your project...' },
      {
        id: 'category', type: 'select' as const, label: 'Category', placeholder: 'Select category', options: [
          { value: 'feature', label: 'Feature' },
          { value: 'bugfix', label: 'Bugfix' },
          { value: 'refactor', label: 'Refactor' },
          { value: 'research', label: 'Research' },
        ]
      },
      {
        id: 'priority', type: 'select' as const, label: 'Priority', placeholder: 'Select priority', options: [
          { value: 'urgent', label: 'Urgent' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ]
      },
      { id: 'dueDate', type: 'date' as const, label: 'Due Date' },
      { id: 'tags', type: 'tags' as const, label: 'Tags', placeholder: 'tag1, tag2, tag3' },
      { id: 'estimatedTokens', type: 'number' as const, label: 'Estimated Tokens', placeholder: '100000' },
    ],
  },
};

export const projectsRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'projects',
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projects, isLoading, createProject, updateProject, deleteProject } = useProjects();
  const queryClient = useQueryClient();
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Calculate stats
  const totalTasks = projects?.reduce((acc: number, project: any) => acc + (project.totalTasks || 0), 0) ?? 0;
  const calculatedTotal = projects?.length ?? 0;
  const calculatedActive = projects?.filter((p: any) => p.status === 'active').length ?? 0;
  const calculatedCompleted = projects?.filter((p: any) => p.status === 'completed').length ?? 0;

  const transformedStats = {
    totalProjects: calculatedTotal,
    totalTasks,
    activeProjects: calculatedActive,
    completedProjects: calculatedCompleted,
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      const apiData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        dueDate: formData.dueDate,
        tags: typeof formData.tags === 'string'
          ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : formData.tags,
        estimatedTokens: parseInt(formData.estimatedTokens) || 0,
      };
      await createProject(apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['tracks-stats'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const apiData = {
        name: data.name,
        description: data.description,
        category: data.category,
        priority: data.priority,
        dueDate: data.dueDate,
        tags: typeof data.tags === 'string'
          ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : data.tags,
        estimatedTokens: parseInt(data.estimatedTokens) || 0,
      };
      await updateProject(id, apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['tracks-stats'] });
      toast.success('Project updated successfully');
      setEditingProject(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await deleteProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['tracks-stats'] });
      toast.success('Project deleted successfully');
      setDeleteConfirmId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });

  // Custom render detail view for projects with tabs
  const ProjectDetailView = ({ project }: { project: any }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks'>('overview');

    // Mock tasks for the project - in real app this would come from API
    const projectTasks = [
      { id: '1', title: 'Design database schema', status: 'done', priority: 'high' },
      { id: '2', title: 'Implement API endpoints', status: 'in_progress', priority: 'high' },
      { id: '3', title: 'Create frontend components', status: 'in_progress', priority: 'medium' },
      { id: '4', title: 'Write unit tests', status: 'inbox', priority: 'low' },
      { id: '5', title: 'Deploy to production', status: 'inbox', priority: 'urgent' },
    ];

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'urgent': return 'bg-red-500/20 text-red-400';
        case 'high': return 'bg-amber-500/20 text-amber-400';
        case 'medium': return 'bg-blue-500/20 text-blue-400';
        default: return 'bg-gray-500/20 text-gray-400';
      }
    };

    return (
      <div>
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10 pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'overview'
              ? 'bg-blue-500/20 text-blue-400 border-t border-l border-r border-white/10'
              : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'tasks'
              ? 'bg-blue-500/20 text-blue-400 border-t border-l border-r border-white/10'
              : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            Tasks ({projectTasks.length})
          </button>
        </div>

        {activeTab === 'overview' ? (
          /* Overview Tab - 2 column layout */
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="flex flex-col gap-5">
              {project.description && (
                <div>
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-2 font-medium">Description</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{project.description}</p>
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                {project.status && (
                  <div>
                    <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 font-medium">Status</h4>
                    <span className="px-3 py-1.5 rounded-full text-xs bg-blue-500/20 text-blue-400 capitalize">
                      {project.status}
                    </span>
                  </div>
                )}
                {project.category && (
                  <div>
                    <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 font-medium">Category</h4>
                    <span className="px-3 py-1.5 rounded-full text-xs bg-purple-500/20 text-purple-400 capitalize">
                      {project.category}
                    </span>
                  </div>
                )}
                {project.priority && (
                  <div>
                    <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 font-medium">Priority</h4>
                    <span className={`px-3 py-1.5 rounded text-xs capitalize ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>
                )}
              </div>

              {/* Handle tags */}
              {(() => {
                const tags = project.tags;
                if (!tags) return null;
                const tagsArray = Array.isArray(tags)
                  ? tags
                  : typeof tags === 'string' && tags
                    ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                    : [];
                if (tagsArray.length === 0) return null;
                return (
                  <div>
                    <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-2 font-medium">Tags</h4>
                    <div className="flex gap-2 flex-wrap">
                      {tagsArray.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded text-xs bg-gray-700/50 text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-5">
              {project.totalTasks > 0 && (
                <div>
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-3 font-medium">Progress</h4>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${Math.round((project.completedTasks / project.totalTasks) * 100)}%` }}
                      />
                    </div>
                    <span className="text-white text-sm font-semibold min-w-[48px]">
                      {Math.round((project.completedTasks / project.totalTasks) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle size={14} className="text-green-400" />
                    <span>{project.completedTasks} of {project.totalTasks} tasks completed</span>
                  </div>
                </div>
              )}

              {project.dueDate && (
                <div>
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 font-medium">Due Date</h4>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock size={14} className="text-amber-400" />
                    <span className="text-sm">
                      {new Date(project.dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              )}

              {project.estimatedTokens > 0 && (
                <div>
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 font-medium">Estimated Tokens</h4>
                  <p className="text-gray-300 text-sm font-mono">{project.estimatedTokens.toLocaleString()}</p>
                </div>
              )}

              {(project.createdAt || project.updatedAt) && (
                <div>
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 font-medium">Timeline</h4>
                  <div className="space-y-1.5 text-sm">
                    {project.createdAt && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>Created:</span>
                        <span className="text-gray-300">
                          {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {project.updatedAt && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>Updated:</span>
                        <span className="text-gray-300">
                          {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tasks Tab */
          <div className="space-y-3">
            {projectTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ListTodo size={32} className="mx-auto mb-3 opacity-50" />
                <p>No tasks found for this project</p>
              </div>
            ) : (
              projectTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className={`p-1.5 rounded ${task.status === 'done' ? 'bg-green-500/20' : task.status === 'in_progress' ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
                    {task.status === 'done' ? (
                      <CheckCircle size={14} className="text-green-400" />
                    ) : task.status === 'in_progress' ? (
                      <Clock size={14} className="text-blue-400" />
                    ) : (
                      <ListTodo size={14} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                      {task.title}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  // Custom render detail view for projects with tabs
  const renderProjectDetailView = (project: any) => <ProjectDetailView project={project} />;

  return (
    <>
      <PageLayout
        config={projectsPageConfig}
        data={projects}
        stats={transformedStats}
        loading={isLoading}
        onCreate={createMutation.mutateAsync}
        onEdit={(row) => setEditingProject(row)}
        onDelete={async (row) => { setDeleteConfirmId(row.id); }}
        renderDetailView={renderProjectDetailView}
      />

      {/* Edit Drawer */}
      <Drawer
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        title={editingProject ? 'Edit Project' : 'New Project'}
        width={500}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setEditingProject(null)}
              disabled={updateMutation.isPending}
              className="px-5 py-2.5 bg-white/5 border-none rounded-lg text-white cursor-pointer text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (editingProject) {
                  updateMutation.mutateAsync({ id: editingProject.id, data: editingProject });
                }
              }}
              disabled={updateMutation.isPending}
              className="px-5 py-2.5 bg-blue-500 border-none rounded-lg text-white cursor-pointer text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        {editingProject && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-500 text-sm mb-1.5">Name *</label>
              <input
                type="text"
                value={editingProject.name || ''}
                onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                placeholder="Enter project name"
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-sm mb-1.5">Description</label>
              <textarea
                value={editingProject.description || ''}
                onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                placeholder="Describe your project..."
                rows={4}
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-vertical focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 text-sm mb-1.5">Category</label>
                <select
                  value={editingProject.category || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="feature">Feature</option>
                  <option value="bugfix">Bugfix</option>
                  <option value="refactor">Refactor</option>
                  <option value="research">Research</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-500 text-sm mb-1.5">Priority</label>
                <select
                  value={editingProject.priority || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, priority: e.target.value })}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-gray-500 text-sm mb-1.5">Due Date</label>
              <input
                type="date"
                value={editingProject.dueDate ? editingProject.dueDate.split('T')[0] : ''}
                onChange={(e) => setEditingProject({ ...editingProject, dueDate: e.target.value })}
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-sm mb-1.5">Tags</label>
              <input
                type="text"
                value={Array.isArray(editingProject.tags) ? editingProject.tags.join(', ') : editingProject.tags || ''}
                onChange={(e) => setEditingProject({ ...editingProject, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-[#1a1a1c] rounded-xl p-6 w-[40%]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white text-lg font-semibold mb-3">Delete Project?</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete this project? This action cannot be undone and all associated tasks will be affected.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 bg-white/5 border-none rounded-lg text-white cursor-pointer text-sm hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutateAsync(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-5 py-2.5 bg-red-500 border-none rounded-lg text-white cursor-pointer text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectsPage;

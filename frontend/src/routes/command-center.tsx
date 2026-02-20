import { createRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  getTasks,
  moveTask,
  getAgents,
  getActivities,
  Task
} from '../lib/api';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { CalendarView } from '../components/CalendarView';
import { TaskListView } from '../components/TaskListView';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { EnhancedActivityFeed } from '../components/CollapsibleActivityFeed';
import {
  BoardToolbar,
  BoardStatsCard,
  KanbanColumnPro,
  TaskCardPro
} from '../components/CommandCenter';
import { useProjects } from '../contexts/ProjectContext';

export const commandCenterRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'command-center',
  component: CommandCenterPage,
});

type FilterStatus = 'all' | Task['status'] | 'todo';
type ViewMode = 'kanban' | 'calendar' | 'list';

function CommandCenterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: commandCenterRoute.id }) as any;
  const queryClient = useQueryClient();
  const { currentWorkspace, currentWorkspaceId } = useWorkspace();
  const { projects } = useProjects();
  const wsPrefix = currentWorkspace?.slug ? `/${currentWorkspace.slug}` : '';

  // State
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterProject, setFilterProject] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [feedOpen, setFeedOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day; // Start on Sunday
    return new Date(now.setDate(diff));
  });

  // Data Fetching
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', currentWorkspaceId],
    queryFn: () => getTasks(currentWorkspaceId ?? undefined).catch(() => []),
  });

  const { data: agents = [], isLoading: isAgentsLoading } = useQuery({
    queryKey: ['agents', currentWorkspaceId],
    queryFn: () => getAgents(currentWorkspaceId ?? undefined).catch(() => []),
  });

  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => getActivities({ limit: 50, offset: 0 }).catch(() => []),
    refetchInterval: 10000,
  });

  const isLoading = isTasksLoading || isAgentsLoading || isActivitiesLoading;

  // Initialize and Sync local tasks
  useEffect(() => {
    if (Array.isArray(tasks)) {
      setLocalTasks(tasks);
    }
  }, [tasks]);

  // Keep selected task in sync with query data
  useEffect(() => {
    if (selectedTask && tasks.length > 0) {
      const updated = tasks.find((t: Task) => t.id === selectedTask.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTask)) {
        setSelectedTask(updated);
      }
    }
  }, [tasks, selectedTask]);

  // URL State Management
  const updateUrlParams = useCallback((mode: 'create' | 'edit' | 'view' | null, taskId?: string) => {
    if (mode === null) {
      navigate({ to: `${wsPrefix}/command-center`, search: {} });
      setIsDrawerOpen(false);
    } else if (mode === 'create') {
      navigate({ to: `${wsPrefix}/command-center`, search: { task: 'add' } });
      setSelectedTask(null);
      setIsDrawerOpen(true);
    } else if (taskId) {
      navigate({ to: `${wsPrefix}/command-center`, search: { task: mode, id: taskId } });
      setIsDrawerOpen(true);
    }
  }, [navigate, wsPrefix]);

  useEffect(() => {
    if (searchParams.task && tasks.length > 0) {
      const { task: taskAction, id } = searchParams;
      if (taskAction === 'add') {
        setSelectedTask(null);
        setIsDrawerOpen(true);
      } else if ((taskAction === 'edit' || taskAction === 'view') && id) {
        const task = tasks.find((t: Task) => t.id === id);
        if (task) {
          setSelectedTask(task);
          setIsDrawerOpen(true);
        }
      }
    }
  }, [searchParams, tasks]);

  // Mutations
  const moveTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task['status'] }) => moveTask(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (user?.isDemo) {
        toast.success(`Demo Note: Moved to ${variables.status}. Saved for this session.`);
      } else {
        toast.success(`Task moved to ${variables.status}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to move task: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLocalTasks(tasks); // Rollback on error
    },
  });

  // DnD Setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredTasks = useMemo(() => {
    return localTasks.filter((task) => {
      const matchesSearch = task.title?.toLowerCase().includes(search.toLowerCase()) ?? false;
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = !filterPriority || task.priority === filterPriority;
      const matchesProject = !filterProject || task.projectId === filterProject;
      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });
  }, [localTasks, search, filterStatus, filterPriority, filterProject]);

  const allColumns = useMemo(() => [
    { id: 'inbox', title: 'Inbox', icon: '📥', color: '#8b5cf6', wip: 0 },
    { id: 'todo', title: 'To Do', icon: '�', color: '#3b82f6', wip: 10 },
    { id: 'in_progress', title: 'In Progress', icon: '⚡', color: '#f59e0b', wip: 5 },
    { id: 'done', title: 'Done', icon: '✅', color: '#22c55e', wip: 0 },
  ], []);

  const columnsToRender = useMemo(() => {
    if (filterStatus === 'all') return allColumns;
    return allColumns.filter(c => c.id === filterStatus);
  }, [allColumns, filterStatus]);

  // Handlers
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const activeIdVal = active.id as string;
    const overIdVal = over.id as string;

    const source = localTasks.find(t => t.id === activeIdVal);
    if (!source) return;

    let destinationStatus: string | null = null;
    if (allColumns.some(c => c.id === overIdVal)) {
      destinationStatus = overIdVal;
    } else {
      const overTask = localTasks.find(t => t.id === overIdVal);
      if (overTask) {
        // Map overTask status back to display column ID
        if (['assigned', 'waiting', 'todo'].includes(overTask.status)) destinationStatus = 'todo';
        else if (['in_progress', 'review'].includes(overTask.status)) destinationStatus = 'in_progress';
        else destinationStatus = overTask.status;
      }
    }

    if (destinationStatus && source.status !== destinationStatus) {
      // For local state, we can use the simplified status temporarily
      setLocalTasks(prev => prev.map(t => t.id === activeIdVal ? { ...t, status: destinationStatus! as any } : t));
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeIdVal = active.id as string;
    const overIdVal = over.id as string;

    const sourceOriginal = tasks.find(t => t.id === activeIdVal);
    if (!sourceOriginal) return;

    let newStatus: string = sourceOriginal.status;
    if (allColumns.some(c => c.id === overIdVal)) {
      newStatus = overIdVal;
    } else {
      const overTask = localTasks.find(t => t.id === overIdVal);
      if (overTask) {
        if (['assigned', 'waiting', 'todo'].includes(overTask.status)) newStatus = 'todo';
        else if (['in_progress', 'review'].includes(overTask.status)) newStatus = 'in_progress';
        else newStatus = overTask.status;
      }
    }

    // Map simplified status back to valid API status if needed
    let apiStatus = newStatus as Task['status'];
    if (newStatus === 'todo') apiStatus = 'waiting';
    // if in_progress, it stays in_progress.

    if (sourceOriginal.status !== apiStatus) {
      moveTaskMutation.mutate({ id: activeIdVal, status: apiStatus });
    } else {
      // Reorder within column logic (local)
      const colTasks = localTasks.filter(t => {
        const s = t.status;
        if (newStatus === 'todo') return ['assigned', 'waiting', 'todo'].includes(s);
        if (newStatus === 'in_progress') return ['in_progress', 'review'].includes(s);
        return s === newStatus;
      });
      const oldIdx = colTasks.findIndex(t => t.id === activeIdVal);
      const newIdx = colTasks.findIndex(t => t.id === overIdVal);
      if (oldIdx !== newIdx && newIdx !== -1) {
        setLocalTasks(prev => {
          const updated = [...prev];
          const colIndices = updated.map((t, i) => ({ ...t, original: i })).filter(t => {
            const s = t.status;
            if (newStatus === 'todo') return ['assigned', 'waiting', 'todo'].includes(s);
            if (newStatus === 'in_progress') return ['in_progress', 'review'].includes(s);
            return s === newStatus;
          });
          const from = colIndices[oldIdx]?.original;
          const to = colIndices[newIdx]?.original;
          if (from !== undefined && to !== undefined) {
            const [moved] = updated.splice(from, 1);
            updated.splice(to, 0, moved);
          }
          return updated;
        });
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    updateUrlParams('view', task.id);
  };

  const handleCloseDetail = () => {
    setIsDrawerOpen(false);
    // Delay clearing selectedTask slightly to allow drawer animation to finish nicely?
    // Not strictly necessary if drawer handles it.
    updateUrlParams(null);
  };

  const activeTask = useMemo(() => localTasks.find(t => t.id === activeId), [localTasks, activeId]);

  return (
    <div className="cc-page">
      <main className="cc-main">
        {/* Navigation & Stats Section */}
        <BoardStatsCard tasks={tasks} agents={agents} />

        {/* Toolbar Section: Consolidated Command Bar & Tabs */}
        <BoardToolbar
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          tasks={tasks}
          search={search}
          onSearchChange={setSearch}
          filterProject={filterProject}
          onFilterProjectChange={setFilterProject}
          filterPriority={filterPriority}
          onFilterPriorityChange={setFilterPriority}
          onAddTask={() => updateUrlParams('create')}
          projects={projects}
        />

        {/* Primary View Area */}
        {viewMode === 'kanban' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="cc-board">
              {isLoading ? (
                allColumns.map(c => <div key={c.id} className="cc-skeleton" />)
              ) : (
                columnsToRender.map(col => (
                  <KanbanColumnPro
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    icon={col.icon}
                    color={col.color}
                    tasks={filteredTasks.filter(t => {
                      const s = t.status as any;
                      if (col.id === 'todo') return s === 'todo' || s === 'assigned' || s === 'waiting';
                      if (col.id === 'in_progress') return s === 'in_progress' || s === 'review';
                      return s === col.id;
                    })}
                    agents={agents}
                    wipLimit={col.wip || undefined}
                    onTaskClick={handleTaskClick}
                  />
                ))
              )}
            </div>

            <DragOverlay>
              {activeId && activeTask ? (
                <TaskCardPro task={activeTask} agents={agents} isOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : viewMode === 'calendar' ? (
          <CalendarView
            onTaskClick={handleTaskClick}
            currentWeekStart={currentWeekStart}
            onWeekChange={(dir) => setCurrentWeekStart(prev => {
              const d = new Date(prev);
              d.setDate(prev.getDate() + (dir === 'next' ? 7 : -7));
              return d;
            })}
          />
        ) : (
          <TaskListView
            tasks={filteredTasks}
            agents={agents}
            onTaskClick={handleTaskClick}
          />
        )}
      </main>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={handleCloseDetail}
      />

      {/* Collapsible Activity Feed */}
      <EnhancedActivityFeed
        activities={activities}
        agents={agents}
        isOpen={feedOpen}
        onToggle={() => setFeedOpen(!feedOpen)}
      />
    </div>
  );
}

export default CommandCenterPage;

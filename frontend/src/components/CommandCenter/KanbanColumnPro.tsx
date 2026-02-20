import { useState, useCallback, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, Plus, AlertTriangle } from 'lucide-react';
import { Task, Agent, createTask } from '../../lib/api';
import { useProjects } from '../../contexts/ProjectContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TaskCardPro } from './TaskCardPro';

interface KanbanColumnProProps {
    readonly id: string;
    readonly title: string;
    readonly icon: string;
    readonly color: string;
    readonly tasks: Task[];
    readonly agents: Agent[];
    readonly wipLimit?: number;
    readonly onTaskClick: (task: Task) => void;
}

// Wrapper for sortable card
function SortableCard({ task, agents, onClick }: { task: Task; agents: Agent[]; onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick} className="touch-none">
            <TaskCardPro task={task} agents={agents} />
        </div>
    );
}

export function KanbanColumnPro({
    id,
    title,
    icon,
    color,
    tasks,
    agents,
    wipLimit,
    onTaskClick,
}: KanbanColumnProProps) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const isInitiallyCollapsed = !['inbox', 'todo', 'in_progress'].includes(id);
    const [collapsed, setCollapsed] = useState(isInitiallyCollapsed);
    const [quickAddMode, setQuickAddMode] = useState(false);
    const [quickAddValue, setQuickAddValue] = useState('');
    const quickAddRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();
    const { projects } = useProjects();

    const isOverWip = wipLimit ? tasks.length > wipLimit : false;

    const quickAddMutation = useMutation({
        mutationFn: (data: Partial<Task>) => createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            setQuickAddValue('');
            setQuickAddMode(false);
            toast.success('Task created');
        },
        onError: () => {
            toast.error('Failed to create task');
        },
    });

    const handleQuickAdd = useCallback(() => {
        let trimmed = quickAddValue.trim();
        if (!trimmed) {
            setQuickAddMode(false);
            return;
        }

        const assigneeIds: string[] = [];
        let finalTitle = trimmed;
        let projectId: string | undefined;
        let match;

        // Extract #project (one word names or slugs)
        const projectRegex = /#(\w+)/g;
        while ((match = projectRegex.exec(trimmed)) !== null) {
            const mention = match[1].toLowerCase();
            const foundProject = projects.find(p =>
                p.slug?.toLowerCase().includes(mention) ||
                p.name.toLowerCase().includes(mention)
            );
            if (foundProject) {
                projectId = foundProject.id;
                finalTitle = finalTitle.replace(match[0], '').trim();
            }
        }

        // Extract @agentMentions (one word names)
        const agentRegex = /@(\w+)/g;
        while ((match = agentRegex.exec(trimmed)) !== null) {
            const mention = match[1].toLowerCase();
            const foundAgent = agents.find(a => a.name.toLowerCase().includes(mention));
            if (foundAgent) {
                if (!assigneeIds.includes(foundAgent.id)) {
                    assigneeIds.push(foundAgent.id);
                }
                // Remove mention from title
                finalTitle = finalTitle.replace(match[0], '').replace(/\s+/g, ' ').trim();
            }
        }

        quickAddMutation.mutate({
            title: finalTitle || trimmed, // Fallback to original if title becomes empty
            status: (id === 'todo' ? 'waiting' : id) as Task['status'],
            priority: 'medium',
            assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
            projectId,
        });
    }, [quickAddValue, quickAddMutation, id, agents, projects]);

    useEffect(() => {
        if (quickAddMode && quickAddRef.current) {
            quickAddRef.current.focus();
        }
    }, [quickAddMode]);

    const columnClass = [
        'cc-column',
        isOver && !collapsed && 'cc-column--over',
        collapsed && 'cc-column--collapsed',
    ].filter(Boolean).join(' ');

    // Collapsed view
    if (collapsed) {
        return (
            <div ref={setNodeRef} className={columnClass} onClick={() => setCollapsed(false)}>
                <div className="cc-column__collapsed-content">
                    <div className="cc-column__dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <span className="cc-column__icon">{icon}</span>
                    <span className="cc-column__collapsed-title">{title}</span>
                    <span className="cc-column__count">{tasks.length}</span>
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} className={columnClass}>
            {/* Header */}
            <div className="cc-column__header cursor-pointer" onClick={() => setCollapsed(true)}>
                <div className="cc-column__title-group">
                    <div className="cc-column__dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <span className="cc-column__icon">{icon}</span>
                    <h3 className="cc-column__title">{title}</h3>
                </div>
                <div className="cc-column__header-right">
                    {isOverWip && wipLimit && (
                        <span className="cc-column__wip-warning">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {tasks.length}/{wipLimit}
                        </span>
                    )}
                    <span className="cc-column__count">{tasks.length}</span>
                    <button
                        className="cc-column__collapse-btn"
                        onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
                        title="Collapse column"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="cc-column__body">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <SortableCard
                            key={task.id}
                            task={task}
                            agents={agents}
                            onClick={() => onTaskClick(task)}
                        />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="cc-column__empty">
                        <span className="cc-column__empty-icon">{icon}</span>
                        <p className="cc-column__empty-text">No tasks {title.toLowerCase()}</p>
                        <p className="cc-column__empty-hint">Drop tasks here</p>
                    </div>
                )}
            </div>

            {/* Quick Add */}
            <div className="cc-column__quick-add">
                {quickAddMode ? (
                    <input
                        ref={quickAddRef}
                        className="cc-quick-add-input"
                        placeholder="Task title... (@agent, #project)"
                        value={quickAddValue}
                        onChange={(e) => setQuickAddValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuickAdd();
                            if (e.key === 'Escape') { setQuickAddMode(false); setQuickAddValue(''); }
                        }}
                        onBlur={handleQuickAdd}
                        disabled={quickAddMutation.isPending}
                    />
                ) : (
                    <button className="cc-quick-add-btn" onClick={() => setQuickAddMode(true)}>
                        <Plus className="w-3.5 h-3.5" />
                        Add task
                    </button>
                )}
            </div>
        </div>
    );
}

export default KanbanColumnPro;

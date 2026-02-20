import { Task, Agent } from '../../lib/api';
import { Calendar, GripVertical, User, Briefcase } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectContext';

interface TaskCardProProps {
    readonly task: Task;
    readonly agents: Agent[];
    readonly isOverlay?: boolean;
}

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
    urgent: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    high: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    medium: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' },
    low: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
};

function getAgentName(agentId: string, agents: Agent[]): string {
    return agents.find(a => a.id === agentId)?.name ?? agentId;
}

function getAgentAvatar(agentId: string, agents: Agent[]): string {
    return agents.find(a => a.id === agentId)?.avatar ?? '👤';
}

function formatRelativeTime(dateString: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInSeconds = Math.round(diffInMs / 1000);
    const diffInMinutes = Math.round(diffInSeconds / 60);
    const diffInHours = Math.round(diffInMinutes / 60);
    const diffInDays = Math.round(diffInHours / 24);

    const absSeconds = Math.abs(diffInSeconds);
    const absMinutes = Math.abs(diffInMinutes);
    const absHours = Math.abs(diffInHours);
    const absDays = Math.abs(diffInDays);

    const term = diffInSeconds > 0 ? 'in ' : '';
    const suffix = diffInSeconds > 0 ? '' : ' ago';

    if (absSeconds < 60) return term + (absSeconds < 10 ? 'just now' : `${absSeconds}s${suffix}`);
    if (absMinutes < 60) return `${term}${absMinutes}m${suffix}`;
    if (absHours < 24) return `${term}${absHours}h${suffix}`;
    if (absDays < 7) return `${term}${absDays}d${suffix}`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function TaskCardPro({ task, agents, isOverlay = false }: TaskCardProProps) {
    const { projects } = useProjects();
    const priority = PRIORITY_COLORS[task.priority] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
    const overdue = task.status !== 'done' && task.dueDate ? (new Date(task.dueDate) < new Date()) : false;

    const project = projects.find(p => p.id === task.projectId);

    const cardClass = [
        'cc-card',
        `cc-card--${task.priority}`,
        isOverlay && 'cc-card--overlay',
    ].filter(Boolean).join(' ');

    return (
        <div className={cardClass}>
            {/* Top row: priority + category + drag handle */}
            <div className="cc-card__top-row">
                <div className="cc-card__badges">
                    <span
                        className="cc-card__priority-badge border border-opacity-30"
                        style={{ color: priority.color, background: priority.bg, borderColor: `${priority.color}4d` }}
                    >
                        {task.priority}
                    </span>
                    {task.category && (
                        <span className="cc-card__category-badge">{task.category}</span>
                    )}
                    {project && (
                        <span className="cc-card__project-badge" title={project.name}>
                            <Briefcase className="w-2.5 h-2.5" />
                            {project.name}
                        </span>
                    )}
                </div>
                <GripVertical className="cc-card__drag-handle w-4 h-4" />
            </div>

            {/* Title */}
            <h4 className="cc-card__title">{task.title}</h4>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
                <div className="cc-card__tags">
                    {task.tags.slice(0, 2).map((tag, i) => (
                        <span key={`${tag}-${i}`} className="cc-card__tag">{tag}</span>
                    ))}
                    {task.tags.length > 2 && (
                        <span className="cc-card__tag">+{task.tags.length - 2}</span>
                    )}
                </div>
            )}

            {/* Footer: avatars + meta */}
            <div className="cc-card__footer">
                <div className="cc-card__avatars">
                    {task.assigneeIds && task.assigneeIds.length > 0 ? (
                        <>
                            {task.assigneeIds.slice(0, 3).map((id) => (
                                <div key={id} className="cc-card__avatar" title={getAgentName(id, agents)}>
                                    {getAgentAvatar(id, agents)}
                                </div>
                            ))}
                            {task.assigneeIds.length > 3 && (
                                <div className="cc-card__avatar cc-card__avatar--overflow">
                                    +{task.assigneeIds.length - 3}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="cc-card__avatar cc-card__avatar--empty">
                            <User className="w-3 h-3" />
                        </div>
                    )}
                </div>

                <div className="cc-card__meta">
                    {task.dueDate && (
                        <span className={`cc-card__meta-item ${overdue ? 'cc-card__meta-item--overdue' : ''}`} title={new Date(task.dueDate).toLocaleString()}>
                            <Calendar className="w-3 h-3" />
                            {formatRelativeTime(task.dueDate)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TaskCardPro;

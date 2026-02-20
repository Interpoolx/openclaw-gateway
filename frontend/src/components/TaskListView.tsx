import { Task, Agent } from '../lib/api';
import { MessageSquare, Calendar, Edit2 } from 'lucide-react';
import { useMemo } from 'react';

interface TaskListViewProps {
    tasks: Task[];
    agents: Agent[];
    onTaskClick: (task: Task) => void;
}

export function TaskListView({ tasks, agents, onTaskClick }: TaskListViewProps) {
    const getAgent = (id: string) => agents.find(a => a.id === id);

    // Sort tasks by due date (nearest first, null dates at the end)
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    }, [tasks]);

    const formatDueDate = (dueDate: string | null) => {
        if (!dueDate) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No due date</span>;
        const date = new Date(dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateNormalized = new Date(dueDate);
        dueDateNormalized.setHours(0, 0, 0, 0);

        const isOverdue = dueDateNormalized < today;
        const isToday = dueDateNormalized.getTime() === today.getTime();

        return (
            <span style={{
                color: isOverdue ? '#ef4444' : isToday ? '#22c55e' : 'var(--color-text-tertiary)',
                fontWeight: isToday || isOverdue ? 600 : 400,
                fontSize: '11px'
            }}>
                {isToday ? 'Today' : date.toLocaleDateString()}
            </span>
        );
    };

    return (
        <div style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
        }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-tertiary)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignee</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={10} />
                                Due Date
                            </div>
                        </th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTasks.map((task) => {
                        const assignee = task.assigneeIds.length > 0 ? getAgent(task.assigneeIds[0]) : null;
                        return (
                            <tr
                                key={task.id}
                                onClick={() => onTaskClick(task)}
                                style={{
                                    borderBottom: '1px solid var(--color-border-tertiary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover-bg)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>{task.title}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
                                        <MessageSquare className="w-2.5 h-2.5" />
                                        {task.description.substring(0, 50)}{task.description.length > 50 ? '...' : ''}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '1px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(96, 165, 250, 0.1)',
                                        color: 'var(--color-accent-secondary)',
                                        textTransform: 'uppercase',
                                        fontWeight: 700,
                                        letterSpacing: '0.02em'
                                    }}>
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#f59e0b' : '#3b82f6'
                                        }} />
                                        <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>{task.priority}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {assignee ? (
                                            <>
                                                <span style={{ fontSize: '16px' }}>{assignee.avatar}</span>
                                                <span style={{ fontSize: '13px' }}>{assignee.name}</span>
                                            </>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Unassigned</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                                    {formatDueDate(task.dueDate)}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                    <button
                                        className="cc-action-btn"
                                        onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                                        title="Edit task"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--color-border-primary)',
                                            borderRadius: '6px',
                                            padding: '6px',
                                            color: 'var(--color-text-tertiary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {tasks.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No tasks found matching your filters.
                </div>
            )}
        </div>
    );
}

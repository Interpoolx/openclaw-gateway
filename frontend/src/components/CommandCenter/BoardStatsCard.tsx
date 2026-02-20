import { Task, Agent } from '../../lib/api';

interface BoardStatsCardProps {
    readonly tasks: Task[];
    readonly agents: Agent[];
}

const COLUMN_COLORS: Record<string, string> = {
    inbox: '#8b5cf6',
    todo: '#3b82f6',
    in_progress: '#f59e0b',
    done: '#22c55e',
};

export function BoardStatsCard({ tasks, agents }: BoardStatsCardProps) {
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
    const activeAgents = agents.filter(a => a.status === 'active').length;

    // Distribution for mini bar
    const distribution = [
        { status: 'inbox', count: tasks.filter(t => t.status === 'inbox').length },
        { status: 'todo', count: tasks.filter(t => ['assigned', 'waiting', 'todo'].includes(t.status)).length },
        { status: 'in_progress', count: tasks.filter(t => ['in_progress', 'review'].includes(t.status)).length },
        { status: 'done', count: tasks.filter(t => t.status === 'done').length },
    ];

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="cc-stats-card">
            <div className="cc-stats-card__item">
                <span className="cc-stats-card__value">{total}</span>
                <span className="cc-stats-card__label">Total Tasks</span>
            </div>
            <div className="cc-stats-card__divider" />
            <div className="cc-stats-card__item">
                <span className="cc-stats-card__value" style={{ color: '#f59e0b' }}>{inProgress}</span>
                <span className="cc-stats-card__label">In Progress</span>
            </div>
            <div className="cc-stats-card__divider" />
            <div className="cc-stats-card__item">
                <span className="cc-stats-card__value" style={{ color: '#22c55e' }}>{completionRate}%</span>
                <span className="cc-stats-card__label">Completed</span>
            </div>
            <div className="cc-stats-card__divider" />
            <div className="cc-stats-card__item">
                <span className="cc-stats-card__value" style={{ color: overdue > 0 ? '#ef4444' : 'inherit' }}>{overdue}</span>
                <span className="cc-stats-card__label">Overdue</span>
            </div>
            <div className="cc-stats-card__divider" />
            <div className="cc-stats-card__item">
                <span className="cc-stats-card__value" style={{ color: '#3b82f6' }}>{activeAgents}<span style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 400 }}>/{agents.length}</span></span>
                <span className="cc-stats-card__label">Agents Active</span>
            </div>

            <div className="cc-stats-card__spacer" />

            {/* Distribution mini bar */}
            {total > 0 && (
                <div className="cc-distribution-bar" title="Task distribution across columns">
                    {distribution.map(d => d.count > 0 ? (
                        <div
                            key={d.status}
                            className="cc-distribution-bar__segment"
                            style={{
                                width: `${(d.count / total) * 100}%`,
                                background: COLUMN_COLORS[d.status],
                            }}
                            title={`${d.status}: ${d.count}`}
                        />
                    ) : null)}
                </div>
            )}
        </div>
    );
}

export default BoardStatsCard;

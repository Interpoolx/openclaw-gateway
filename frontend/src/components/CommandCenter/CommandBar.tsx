import { Search, Plus, Zap } from 'lucide-react';
import { Task, Agent } from '../../lib/api';

interface CommandBarProps {
    readonly tasks: Task[];
    readonly agents: Agent[];
    readonly search: string;
    readonly onSearchChange: (search: string) => void;
    readonly filterPriority: string;
    readonly onFilterPriorityChange: (priority: string) => void;
    readonly onAddTask: () => void;
}

export function CommandBar({
    tasks,
    agents,
    search,
    onSearchChange,
    filterPriority,
    onFilterPriorityChange,
    onAddTask,
}: CommandBarProps) {
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const inQueue = tasks.filter(t => t.status !== 'done').length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const activeAgents = agents.filter(a => a.status === 'active').length;

    return (
        <div className="cc-command-bar">
            {/* Mini stats */}
            <div className="cc-command-bar__stats">
                <div className="cc-stat-chip" title="Active agents">
                    <span className="cc-stat-chip__dot" style={{ background: '#3b82f6' }} />
                    <span>Agents</span>
                    <span className="cc-stat-chip__value" style={{ color: '#3b82f6' }}>
                        {activeAgents}<span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>/{agents.length}</span>
                    </span>
                </div>
                <div className="cc-stat-chip" title="Tasks in progress">
                    <span className="cc-stat-chip__dot" style={{ background: '#f59e0b' }} />
                    <Zap style={{ width: 12, height: 12, color: '#f59e0b' }} />
                    <span className="cc-stat-chip__value" style={{ color: '#f59e0b' }}>{inProgress}</span>
                </div>
                <div className="cc-stat-chip" title="In queue">
                    <span>Queue</span>
                    <span className="cc-stat-chip__value">{inQueue}</span>
                </div>
                <div className="cc-stat-chip" title="Completed">
                    <span>Done</span>
                    <span className="cc-stat-chip__value" style={{ color: '#22c55e' }}>{completed}</span>
                </div>
            </div>

            {/* Search */}
            <div className="cc-command-bar__search">
                <Search className="cc-command-bar__search-icon" style={{ width: 16, height: 16 }} />
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {/* Actions */}
            <div className="cc-command-bar__actions">
                <select
                    className="cc-filter-select"
                    value={filterPriority}
                    onChange={(e) => onFilterPriorityChange(e.target.value)}
                >
                    <option value="">All Priorities</option>
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                </select>

                <button className="cc-btn-primary" onClick={onAddTask}>
                    <Plus style={{ width: 16, height: 16 }} />
                    New Task
                </button>
            </div>
        </div>
    );
}

export default CommandBar;

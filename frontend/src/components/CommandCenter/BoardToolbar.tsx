import { LayoutGrid, Calendar, FileText, Search, Plus, ListFilter, Folders } from 'lucide-react';
import { Task } from '../../lib/api';
import { Project } from '../../contexts/ProjectContext';

type FilterStatus = 'all' | Task['status'] | 'todo';
type ViewMode = 'kanban' | 'calendar' | 'list';

interface BoardToolbarProps {
    readonly filterStatus: FilterStatus;
    readonly onFilterStatusChange: (status: FilterStatus) => void;
    readonly viewMode: ViewMode;
    readonly onViewModeChange: (mode: ViewMode) => void;
    readonly tasks: Task[];
    readonly search: string;
    readonly onSearchChange: (search: string) => void;
    readonly filterProject: string;
    readonly onFilterProjectChange: (projectId: string) => void;
    readonly filterPriority: string;
    readonly onFilterPriorityChange: (priority: string) => void;
    readonly onAddTask: () => void;
    readonly projects?: Project[];
}

const STATUS_TABS: Array<{ value: FilterStatus; label: string; icon: string }> = [
    { value: 'all', label: 'All', icon: '' },
    { value: 'inbox', label: 'Inbox', icon: '📥' },
    { value: 'todo', label: 'To Do', icon: '📋' },
    { value: 'in_progress', label: 'Active', icon: '⚡' },
    { value: 'done', label: 'Done', icon: '✅' },
];

function getCountForStatus(tasks: Task[], status: string): number {
    if (status === 'all') return tasks.length;
    if (status === 'todo') return tasks.filter(t => ['assigned', 'waiting', 'todo'].includes(t.status)).length;
    if (status === 'in_progress') return tasks.filter(t => ['in_progress', 'review'].includes(t.status)).length;
    return tasks.filter(t => t.status === status).length;
}

export function BoardToolbar({
    filterStatus,
    onFilterStatusChange,
    viewMode,
    onViewModeChange,
    tasks,
    search,
    onSearchChange,
    filterProject,
    onFilterProjectChange,
    filterPriority,
    onFilterPriorityChange,
    onAddTask,
    projects = [],
}: BoardToolbarProps) {
    return (
        <div className="cc-toolbar">
            <div className="cc-toolbar__left">
                {/* Status tabs */}
                <div className="cc-toolbar__tabs">
                    {STATUS_TABS.map(({ value, label, icon }) => {
                        const count = getCountForStatus(tasks, value);
                        const isActive = filterStatus === value;
                        return (
                            <button
                                key={value}
                                className={`cc-tab ${isActive ? 'cc-tab--active' : ''}`}
                                onClick={() => onFilterStatusChange(value)}
                            >
                                {icon && <span>{icon}</span>}
                                {label}
                                <span className="cc-tab__count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="cc-toolbar__divider" />

                {/* View toggle */}
                <div className="cc-toolbar__group">
                    <button
                        className={`cc-view-btn ${viewMode === 'kanban' ? 'cc-view-btn--active' : ''}`}
                        onClick={() => onViewModeChange('kanban')}
                        title="Board view"
                    >
                        <LayoutGrid style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                        className={`cc-view-btn ${viewMode === 'calendar' ? 'cc-view-btn--active' : ''}`}
                        onClick={() => onViewModeChange('calendar')}
                        title="Calendar view"
                    >
                        <Calendar style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                        className={`cc-view-btn ${viewMode === 'list' ? 'cc-view-btn--active' : ''}`}
                        onClick={() => onViewModeChange('list')}
                        title="List view"
                    >
                        <FileText style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            <div className="cc-toolbar__right">
                {/* Search */}
                <div className="cc-toolbar__search">
                    <Search className="cc-toolbar__search-icon" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Project Filter */}
                <div className="cc-toolbar__filter">
                    <Folders className="cc-toolbar__filter-icon" />
                    <select
                        className="cc-toolbar__select"
                        value={filterProject}
                        onChange={(e) => onFilterProjectChange(e.target.value)}
                    >
                        <option value="">All Projects</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Priority Filter */}
                <div className="cc-toolbar__filter">
                    <ListFilter className="cc-toolbar__filter-icon" />
                    <select
                        className="cc-toolbar__select"
                        value={filterPriority}
                        onChange={(e) => onFilterPriorityChange(e.target.value)}
                    >
                        <option value="">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                <button className="cc-btn-primary cc-btn-primary--small" onClick={onAddTask}>
                    <Plus style={{ width: 14, height: 14 }} />
                    New Task
                </button>
            </div>
        </div>
    );
}

export default BoardToolbar;

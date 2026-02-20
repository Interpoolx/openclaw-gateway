import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCalendarTasks, Task } from '../lib/api';
import { ChevronLeft, ChevronRight, Zap, Clock, RefreshCcw } from 'lucide-react';

interface CalendarViewProps {
    readonly onTaskClick: (task: Task) => void;
    readonly currentWeekStart: Date;
    readonly onWeekChange: (direction: 'prev' | 'next') => void;
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function CalendarView({ onTaskClick, currentWeekStart, onWeekChange }: CalendarViewProps) {
    const weekEnd = useMemo(() => addDays(currentWeekStart, 6), [currentWeekStart]);

    const { data, isLoading } = useQuery({
        queryKey: ['calendar-tasks', formatDate(currentWeekStart), formatDate(weekEnd)],
        queryFn: () => getCalendarTasks(formatDate(currentWeekStart), formatDate(weekEnd)),
    });

    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = addDays(currentWeekStart, i);
            const dateKey = formatDate(date);
            const dayTasks = data?.tasksByDate[dateKey] || [];
            days.push({
                date,
                dateKey,
                tasks: dayTasks,
            });
        }
        return days;
    }, [currentWeekStart, data]);

    const today = formatDate(new Date());

    return (
        <div style={{ padding: '32px', flex: 1, overflow: 'auto', background: '#0a0a0f', color: '#fff' }}>
            {/* Header section from Screenshot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, marginBottom: '2px', letterSpacing: '-0.02em' }}>Scheduled Tasks</h1>
                    <p style={{ color: 'var(--color-text-tertiary)', margin: 0, fontSize: '12px', opacity: 0.8 }}>Henry's automated routines</p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', border: '1px solid var(--color-border-primary)' }}>
                        <button style={{ padding: '6px 12px', color: 'var(--color-accent-secondary)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Week</button>
                    </div>
                    <button style={{ padding: '6px 12px', color: 'var(--color-text-primary)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '12px' }}>Today</button>
                    <button style={{ padding: '6px', color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                        <RefreshCcw size={14} />
                    </button>
                </div>
            </div>

            {/* Always Running Section */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Zap size={14} style={{ color: 'var(--color-accent-secondary)' }} />
                    Always Running
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{
                        background: 'rgba(96, 165, 250, 0.08)',
                        border: '1px solid rgba(96, 165, 250, 0.15)',
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        color: 'var(--color-accent-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <div style={{ width: '6px', height: '6px', background: 'var(--color-accent-secondary)', borderRadius: '50%' }} />
                        mission control check • Every 30 min
                    </div>
                </div>
            </div>

            {/* Navigation (Original but styled) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => onWeekChange('prev')} style={{ background: '#1a1a24', border: '1px solid #2e2e3e', color: '#fff', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                    <button onClick={() => onWeekChange('next')} style={{ background: '#1a1a24', border: '1px solid #2e2e3e', color: '#fff', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><ChevronRight size={20} /></button>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 600 }}>
                    {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                    Loading calendar...
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '0',
                        border: '1px solid var(--color-border-primary)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        background: 'var(--color-bg-secondary)'
                    }}
                >
                    {weekDays.map((day) => {
                        const isToday = day.dateKey === today;
                        return (
                            <div
                                key={day.dateKey}
                                style={{
                                    borderRight: '1px solid var(--color-border-tertiary)',
                                    padding: '8px 4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: '320px',
                                    background: isToday ? 'rgba(96, 165, 250, 0.03)' : 'transparent',
                                    position: 'relative',
                                }}
                            >
                                {isToday && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        border: '1px solid var(--color-accent-secondary)',
                                        pointerEvents: 'none',
                                        zIndex: 5
                                    }} />
                                )}
                                {/* Day Header */}
                                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                                        {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto',
                                        borderRadius: '50%',
                                        background: isToday ? 'var(--color-accent-secondary)' : 'transparent',
                                        color: isToday ? '#fff' : 'var(--color-text-primary)'
                                    }}>
                                        {day.date.getDate()}
                                    </div>
                                </div>

                                {/* Tasks Grid Cells */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {day.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => onTaskClick(task)}
                                            style={{
                                                padding: '8px',
                                                background: task.category === 'development' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(124, 108, 251, 0.2)',
                                                borderLeft: `3px solid ${task.category === 'development' ? '#3b82f6' : '#7c6cfb'}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {task.title}
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                                                {new Date((task as any).scheduledDate || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Next Up Section */}
            <div style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}>
                    <Clock size={18} style={{ color: '#7c6cfb' }} />
                    NEXT UP
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data?.tasksByDate[today]?.slice(0, 3).map((task, i) => (
                        <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1a1a24', borderRadius: '12px', border: '1px solid #2e2e3e' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: i === 0 ? '#3b82f6' : i === 1 ? '#7c6cfb' : '#f59e0b' }} />
                                <span style={{ fontWeight: 500 }}>{task.title}</span>
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                                {i === 0 ? 'In 30 min' : i === 1 ? 'In 1.5 hours' : 'In 4 hours'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

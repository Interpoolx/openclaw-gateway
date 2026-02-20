import { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Agent } from '../lib/api';
import {
    Activity as ActivityIcon,
    ChevronRight,
    Clock,
    CheckCircle,
    Edit3,
    Trash2,
    Play,
    AlertCircle,
    MessageSquare,
    Zap,
    Users,
    ArrowRight,
    Filter,
    ChevronDown,
    Check
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface EnhancedActivityFeedProps {
    activities: Activity[];
    agents?: Agent[];
    isOpen: boolean;
    onToggle: () => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
}

type ActivityType = 'all' | 'task' | 'agent' | 'system' | 'error';

interface FilterTab {
    id: ActivityType;
    label: string;
    icon: React.ReactNode;
    color: string;
}

const filterTabs: FilterTab[] = [
    { id: 'all', label: 'All', icon: <ActivityIcon className="w-3 h-3" />, color: '#6b7280' },
    { id: 'task', label: 'Tasks', icon: <CheckCircle className="w-3 h-3" />, color: '#3b82f6' },
    { id: 'agent', label: 'Agents', icon: <Users className="w-3 h-3" />, color: '#22c55e' },
    { id: 'system', label: 'System', icon: <Zap className="w-3 h-3" />, color: '#f59e0b' },
    { id: 'error', label: 'Errors', icon: <AlertCircle className="w-3 h-3" />, color: '#ef4444' },
];

function getActivityIcon(type: string): React.ReactNode {
    switch (type) {
        case 'task_created':
            return <CheckCircle className="w-4 h-4" />;
        case 'task_updated':
        case 'task_moved':
            return <Edit3 className="w-4 h-4" />;
        case 'task_deleted':
            return <Trash2 className="w-4 h-4" />;
        case 'task_completed':
            return <CheckCircle className="w-4 h-4" />;
        case 'agent_created':
        case 'agent_updated':
            return <Users className="w-4 h-4" />;
        case 'agent_status':
            return <ActivityIcon className="w-4 h-4" />;
        case 'openclaw_task_started':
            return <Play className="w-4 h-4" />;
        case 'openclaw_task_completed':
            return <CheckCircle className="w-4 h-4" />;
        case 'openclaw_task_error':
            return <AlertCircle className="w-4 h-4" />;
        case 'message':
            return <MessageSquare className="w-4 h-4" />;
        default:
            return <ActivityIcon className="w-4 h-4" />;
    }
}

function getActivityColor(type: string): string {
    const colors: Record<string, string> = {
        task_created: '#3b82f6',
        task_updated: '#8b5cf6',
        task_moved: '#f59e0b',
        task_deleted: '#ef4444',
        task_completed: '#22c55e',
        agent_created: '#22c55e',
        agent_updated: '#3b82f6',
        agent_status: '#8b5cf6',
        openclaw_task_started: '#f59e0b',
        openclaw_task_completed: '#22c55e',
        openclaw_task_error: '#ef4444',
        message: '#3b82f6',
        system: '#6b7280',
    };
    return colors[type] || '#6b7280';
}

function formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export function EnhancedActivityFeed({
    activities,
    agents = [],
    isOpen,
    onToggle,
    onLoadMore,
    hasMore = false,
    isLoading = false
}: EnhancedActivityFeedProps) {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState<ActivityType>('all');
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
    const feedRef = useRef<HTMLDivElement>(null);
    const wasAtBottomRef = useRef(true);

    // Filter activities
    const filteredActivities = useMemo(() => {
        let filtered = activities;

        // Filter by type
        if (activeFilter !== 'all') {
            filtered = filtered.filter(a => {
                if (activeFilter === 'task') return a.type.includes('task');
                if (activeFilter === 'agent') return a.type.includes('agent');
                if (activeFilter === 'system') return a.type === 'system';
                if (activeFilter === 'error') return a.type.includes('error');
                return true;
            });
        }

        // Filter by agent
        if (selectedAgentId) {
            filtered = filtered.filter(a => a.agentId === selectedAgentId);
        }

        return filtered;
    }, [activities, activeFilter, selectedAgentId]);

    // Auto-scroll to bottom when new activities arrive
    useEffect(() => {
        if (autoScroll && feedRef.current && wasAtBottomRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [filteredActivities, autoScroll]);

    // Detect manual scroll to disable auto-scroll
    const handleScroll = () => {
        if (!feedRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        wasAtBottomRef.current = isAtBottom;
        setAutoScroll(isAtBottom);
    };

    const handleActivityClick = (activity: Activity) => {
        // Navigate based on activity type
        if (activity.taskId) {
            navigate({ to: '/command-center', search: { taskId: activity.taskId } });
        } else if (activity.agentId) {
            navigate({ to: '/agents/$agentId', params: { agentId: activity.agentId } });
        }
    };

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-filter-menu]') && !target.closest('[data-agent-menu]')) {
                setIsFilterMenuOpen(false);
                setIsAgentMenuOpen(false);
            }
        };

        if (isOpen && (isFilterMenuOpen || isAgentMenuOpen)) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [isOpen, isFilterMenuOpen, isAgentMenuOpen]);

    return (
        <>
            {/* Toggle Button - Fixed on the right edge */}
            <button
                onClick={onToggle}
                style={{
                    position: 'fixed',
                    right: isOpen ? '380px' : '0',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '120px',
                    background: '#1a1a1f',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRight: isOpen ? 'none' : undefined,
                    borderRadius: isOpen ? '10px 0 0 10px' : '10px 0 0 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1101,
                    boxShadow: isOpen
                        ? 'none'
                        : '-8px 0 32px rgba(0,0,0,0.6), inset -2px 0 4px rgba(255,255,255,0.05)',
                    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
                }}
                title={isOpen ? 'Hide Live Feed' : 'Show Live Feed'}
            >
                {isOpen ? (
                    <ChevronRight className="w-5 h-5" style={{ color: '#9ca3af' }} />
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 0',
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <ActivityIcon className="w-4 h-4" style={{ color: '#3b82f6' }} />
                        </div>
                        <span style={{
                            fontSize: '10px',
                            writingMode: 'vertical-rl',
                            color: '#9ca3af',
                            fontWeight: 600,
                            letterSpacing: '1px'
                        }}>
                            LIVE FEED
                        </span>
                        {activities.length > 0 && (
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#22c55e',
                                boxShadow: '0 0 8px #22c55e',
                                animation: 'pulse 2s infinite'
                            }} />
                        )}
                    </div>
                )}
            </button>

            {/* Activity Feed Panel */}
            <div
                style={{
                    position: 'fixed',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '380px',
                    background: '#0a0a0c',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 1100,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isOpen ? '-8px 0 48px rgba(0,0,0,0.5)' : 'none',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '20px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: 'linear-gradient(180deg, rgba(59,130,246,0.05) 0%, transparent 100%)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(59, 130, 246, 0.15)',
                            }}>
                                <ActivityIcon className="w-5 h-5" style={{ color: '#3b82f6' }} />
                                <div style={{
                                    position: 'absolute',
                                    width: '8px',
                                    height: '8px',
                                    background: '#22c55e',
                                    borderRadius: '50%',
                                    top: '-2px',
                                    right: '-2px',
                                    boxShadow: '0 0 8px #22c55e',
                                    animation: 'pulse 2s infinite'
                                }} />
                            </div>
                            <div>
                                <h3 style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    margin: 0,
                                    color: '#f3f4f6',
                                    letterSpacing: '0.5px'
                                }}>
                                    LIVE FEED
                                </h3>
                                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                    {filteredActivities.length} events
                                </span>
                            </div>
                        </div>

                        {/* Filter Dropdown */}
                        <div style={{ position: 'relative' }} data-filter-menu>
                            <button
                                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                style={{
                                    padding: '6px 10px',
                                    background: isFilterMenuOpen ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    color: isFilterMenuOpen ? '#3b82f6' : '#6b7280',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Filter className="w-3 h-3" />
                                <ChevronDown className="w-3 h-3" style={{
                                    transform: isFilterMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }} />
                            </button>

                            {isFilterMenuOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        background: '#1a1a1f',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '10px',
                                        padding: '12px',
                                        minWidth: '180px',
                                        zIndex: 1200,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    <div style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        marginBottom: '12px',
                                        letterSpacing: '0.5px',
                                    }}>
                                        Activity Type
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {filterTabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    setActiveFilter(tab.id);
                                                    setIsFilterMenuOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    background: activeFilter === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                    border: `1px solid ${activeFilter === tab.id ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                                                    borderRadius: '6px',
                                                    color: activeFilter === tab.id ? tab.color : '#9ca3af',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = activeFilter === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent';
                                                }}
                                            >
                                                {activeFilter === tab.id && (
                                                    <Check className="w-4 h-4" style={{ color: tab.color, flexShrink: 0 }} />
                                                )}
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                                    {tab.icon}
                                                    {tab.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agent Filter Dropdown */}
                    {agents.length > 0 && (
                        <div style={{ position: 'relative', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }} data-agent-menu>
                            <button
                                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                                style={{
                                    padding: '6px 10px',
                                    background: isAgentMenuOpen ? 'rgba(59, 130, 246, 0.15)' : (selectedAgentId ? 'rgba(34, 197, 94, 0.15)' : 'transparent'),
                                    border: `1px solid ${isAgentMenuOpen ? '#3b82f6' : (selectedAgentId ? '#22c55e' : 'rgba(255,255,255,0.1)')}`,
                                    borderRadius: '6px',
                                    color: isAgentMenuOpen ? '#3b82f6' : (selectedAgentId ? '#22c55e' : '#6b7280'),
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                    fontWeight: 500,
                                }}
                            >
                                <Users className="w-3 h-3" />
                                {selectedAgentId ? agents.find(a => a.id === selectedAgentId)?.name : 'All Agents'}
                                <ChevronDown className="w-3 h-3" style={{
                                    marginLeft: 'auto',
                                    transform: isAgentMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }} />
                            </button>

                            {isAgentMenuOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        marginTop: '8px',
                                        background: '#1a1a1f',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '10px',
                                        padding: '12px',
                                        minWidth: '220px',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        zIndex: 1200,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    <div style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        marginBottom: '12px',
                                        letterSpacing: '0.5px',
                                    }}>
                                        Agent Filter
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <button
                                            onClick={() => {
                                                setSelectedAgentId(null);
                                                setIsAgentMenuOpen(false);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                background: selectedAgentId === null ? 'rgba(255,255,255,0.1)' : 'transparent',
                                                border: `1px solid ${selectedAgentId === null ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                                                borderRadius: '6px',
                                                color: selectedAgentId === null ? '#f3f4f6' : '#9ca3af',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                textAlign: 'left',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = selectedAgentId === null ? 'rgba(255,255,255,0.1)' : 'transparent';
                                            }}
                                        >
                                            {selectedAgentId === null && (
                                                <Check className="w-4 h-4" style={{ color: '#f3f4f6', flexShrink: 0 }} />
                                            )}
                                            <span>All Agents</span>
                                        </button>
                                        {agents.map((agent) => (
                                            <button
                                                key={agent.id}
                                                onClick={() => {
                                                    setSelectedAgentId(agent.id);
                                                    setIsAgentMenuOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    background: selectedAgentId === agent.id ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                                                    border: `1px solid ${selectedAgentId === agent.id ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
                                                    borderRadius: '6px',
                                                    color: selectedAgentId === agent.id ? '#22c55e' : '#9ca3af',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    textAlign: 'left',
                                                    flex: 1,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = selectedAgentId === agent.id ? 'rgba(34, 197, 94, 0.15)' : 'transparent';
                                                }}
                                            >
                                                {selectedAgentId === agent.id && (
                                                    <Check className="w-4 h-4" style={{ color: '#22c55e', flexShrink: 0 }} />
                                                )}
                                                <span style={{ fontSize: '16px' }}>{agent.avatar || '🤖'}</span>
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Activity List */}
                <div
                    ref={feedRef}
                    onScroll={handleScroll}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                    }}
                >
                    {filteredActivities.length === 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '200px',
                                color: '#6b7280',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '12px',
                            }}>
                                <Clock className="w-6 h-6" style={{ opacity: 0.5 }} />
                            </div>
                            <p style={{ fontSize: '13px', fontWeight: 500 }}>No activity yet</p>
                            <p style={{ fontSize: '11px', marginTop: '4px', color: '#4b5563' }}>
                                Events will appear here
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filteredActivities.map((activity) => (
                                <ActivityItem
                                    key={activity.id}
                                    activity={activity}
                                    agent={agents.find(a => a.id === activity.agentId)}
                                    onClick={() => handleActivityClick(activity)}
                                />
                            ))}

                            {/* Load More */}
                            {hasMore && (
                                <button
                                    onClick={onLoadMore}
                                    disabled={isLoading}
                                    style={{
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1px dashed rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#6b7280',
                                        fontSize: '12px',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        marginTop: '8px',
                                    }}
                                >
                                    {isLoading ? 'Loading...' : 'Load more'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* New Events Indicator */}
                {!autoScroll && filteredActivities.length > 0 && (
                    <button
                        onClick={() => {
                            setAutoScroll(true);
                            if (feedRef.current) {
                                feedRef.current.scrollTop = feedRef.current.scrollHeight;
                            }
                        }}
                        style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '8px 16px',
                            background: 'rgba(59, 130, 246, 0.9)',
                            border: 'none',
                            borderRadius: '20px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                            animation: 'slideUp 0.3s ease',
                        }}
                    >
                        <ArrowRight className="w-4 h-4" style={{ transform: 'rotate(90deg)' }} />
                        New events
                    </button>
                )}
            </div>

            {/* Spacer div when feed is open */}
            {isOpen && (
                <div style={{ width: '380px', flexShrink: 0, transition: 'width 0.3s ease' }} />
            )}

            <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.9);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
        </>
    );
}

interface ActivityItemProps {
    activity: Activity;
    agent?: Agent;
    onClick?: () => void;
}

function ActivityItem({ activity, agent, onClick }: ActivityItemProps) {
    const color = getActivityColor(activity.type);
    const icon = getActivityIcon(activity.type);

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderLeft: `3px solid ${color}`,
                borderRadius: '8px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            }}
        >
            {/* Icon */}
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                flexShrink: 0,
            }}>
                {icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                }}>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: color,
                        textTransform: 'uppercase',
                    }}>
                        {activity.type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                    <span style={{
                        fontSize: '11px',
                        color: '#6b7280',
                    }}>
                        {formatTimeAgo(activity.timestamp)}
                    </span>
                </div>

                <p style={{
                    fontSize: '12px',
                    color: '#e5e7eb',
                    lineHeight: '1.5',
                    margin: 0,
                }}>
                    {activity.content}
                </p>

                {agent && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '6px',
                    }}>
                        <span style={{ fontSize: '12px' }}>{agent.avatar || '🤖'}</span>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>{agent.name}</span>
                    </div>
                )}

                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginTop: '8px',
                        flexWrap: 'wrap',
                    }}>
                        {Object.entries(activity.metadata).slice(0, 3).map(([key, value]) => (
                            <span
                                key={key}
                                style={{
                                    padding: '2px 6px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    color: '#6b7280',
                                }}
                            >
                                {key}: {String(value)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default EnhancedActivityFeed;

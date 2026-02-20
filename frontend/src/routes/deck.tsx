import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgents, getTasks, createTask, Agent, Task } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useProjects } from '../contexts/ProjectContext';
import { TaskChatHistory } from '../components/chat/TaskChatHistory';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Settings, Maximize2, Minimize2, X, Plus, Activity, GripVertical, Send, ChevronDown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const deckRoute = createRoute({
    getParentRoute: () => workspaceLayoutRoute,
    path: 'deck',
    component: DeckPage,
});

/* ─── Inline Select (Claude-style pill dropdown) ─── */
interface InlineSelectOption {
    value: string;
    label: string;
    description?: string;
}

function InlineSelect({
    options,
    value,
    onChange,
    placeholder,
}: {
    options: InlineSelectOption[];
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selected = options.find((o) => o.value === value);

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#a1a1aa',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d8';
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa';
                }}
            >
                {selected?.label || placeholder}
                <ChevronDown style={{ width: 14, height: 14, opacity: 0.5 }} />
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        minWidth: '200px',
                        background: '#1c1c20',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        padding: '4px',
                        animation: 'fadeInDropdown 0.12s ease-out',
                        maxHeight: '260px',
                        overflowY: 'auto',
                    }}
                >
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                padding: '8px 12px',
                                background: opt.value === value ? 'rgba(255,255,255,0.06)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background =
                                    opt.value === value ? 'rgba(255,255,255,0.06)' : 'transparent';
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>
                                    {opt.label}
                                </span>
                                {opt.value === value && (
                                    <span style={{ color: '#3b82f6', fontSize: '14px' }}>✓</span>
                                )}
                            </div>
                            {opt.description && (
                                <span style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                                    {opt.description}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Main Deck Page ─── */
function DeckPage() {
    const { currentWorkspaceId } = useWorkspace();
    const { projects = [] } = useProjects();
    const queryClient = useQueryClient();

    const { data: agents = [], isLoading: agentsLoading, error: agentsError } = useQuery({
        queryKey: ['agents', currentWorkspaceId],
        queryFn: () => getAgents(currentWorkspaceId ?? undefined),
        staleTime: 30000, // Cache for 30 seconds
    });

    const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
        queryKey: ['tasks', currentWorkspaceId],
        queryFn: () => getTasks(currentWorkspaceId ?? undefined),
        staleTime: 30000, // Cache for 30 seconds
    });

    // Show error toast if agents or tasks fail to load
    useEffect(() => {
        if (agentsError) {
            toast.error('Failed to load agents', {
                description: agentsError.message || 'Please try again later'
            });
        }
        if (tasksError) {
            toast.error('Failed to load tasks', {
                description: tasksError.message || 'Please try again later'
            });
        }
    }, [agentsError, tasksError]);

    // Show welcome toast on first load (disabled - now showing selector UI instead)
    // useEffect(() => {
    //     if (!agentsLoading && !tasksLoading && tasks.length === 0) {
    //         toast.info('Welcome to Agent Swarm Monitoring', {
    //             description: 'Create tasks in Command Center to monitor them here',
    //             duration: 5000
    //         });
    //     }
    // }, [agentsLoading, tasksLoading, tasks.length]);

    // State for dynamic stream IDs with persistence
    const [streamIds, setStreamIdsState] = useState<string[]>(() => {
        const saved = localStorage.getItem('deck_stream_ids');
        try {
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed.filter(id => !!id) : [];
        } catch (e) {
            return [];
        }
    });

    const setStreamIds = useCallback((update: string[] | ((prev: string[]) => string[])) => {
        setStreamIdsState(prev => {
            const next = typeof update === 'function' ? update(prev) : update;
            return Array.isArray(next) ? next.filter(id => !!id) : [];
        });
    }, []);
    const [maximizedId, setMaximizedId] = useState<string | null>(null);
    const [isAddingStream, setIsAddingStream] = useState(false);

    // Selector states — default to first available option
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedAgent, setSelectedAgent] = useState<string>('');

    // Auto-default to first available project when loaded
    useEffect(() => {
        if (projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects, selectedProject]);

    // Auto-default to first available agent when loaded
    useEffect(() => {
        if (agents.length > 0 && !selectedAgent) {
            setSelectedAgent(agents[0].id);
        }
    }, [agents, selectedAgent]);

    // Chat input state
    const [chatInput, setChatInput] = useState('');
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Persist stream changes
    useEffect(() => {
        localStorage.setItem('deck_stream_ids', JSON.stringify(streamIds));
    }, [streamIds]);

    // Auto-sync: only show in_progress/assigned tasks in the deck
    useEffect(() => {
        if (tasks.length === 0) return;

        const activeStatuses = ['in_progress', 'assigned'];
        const activeTaskIds = tasks
            .filter(t => activeStatuses.includes(t.status))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map(t => t.id);

        setStreamIds(prev => {
            // Only keep existing streams that are still active (not inbox/done/etc)
            const validExisting = prev.filter(id => activeTaskIds.includes(id));
            const newIds = activeTaskIds.filter(id => !prev.includes(id));

            if (newIds.length === 0 && validExisting.length === prev.length) {
                return prev;
            }

            return [...validExisting, ...newIds].slice(0, 5);
        });
    }, [tasks]);

    const activeTasks = useMemo(() => {
        return streamIds
            .filter(id => !!id)
            .map(id => tasks.find(t => t && t.id === id))
            .filter((t): t is Task => !!t && !!t.id);
    }, [streamIds, tasks]);

    // Filtered tasks based on selectors (status defaults to active tasks)
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (selectedProject && (task as any).projectId !== selectedProject && (task as any).trackId !== selectedProject) return false;
            // Default: show active tasks (inbox, assigned, in_progress, review)
            const activeStatuses = ['inbox', 'assigned', 'in_progress', 'review'];
            if (!activeStatuses.includes(task.status)) return false;
            if (selectedAgent && !task.assigneeIds?.includes(selectedAgent)) return false;
            return true;
        });
    }, [tasks, selectedProject, selectedAgent]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setStreamIds((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }, []);

    // Create task mutation
    const createTaskMutation = useMutation({
        mutationFn: (title: string) =>
            createTask({
                title,
                status: selectedAgent ? 'assigned' : 'in_progress',
                priority: 'medium',
                assigneeIds: selectedAgent ? [selectedAgent] : [],
                workspaceId: currentWorkspaceId ?? undefined,
                trackId: selectedProject ?? undefined,
                description: '',
                tags: [],
                category: null,
            }),
        onSuccess: (newTask: Task) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', currentWorkspaceId] });
            // Add the new task to the stream
            setStreamIds((prev) => {
                const id = newTask.id;
                if (!id) return prev;
                if (prev.length >= 5) {
                    toast.warning('Maximum 5 streams — replacing oldest');
                    return [...prev.slice(1), id];
                }
                return [...prev, id];
            });
            setChatInput('');
            setIsAddingStream(false);
            toast.success('Task created', {
                description: `Task: "${newTask.title}" has been created and added to your deck`,
            });
        },
        onError: (err: Error) => {
            toast.error('Failed to create task', {
                description: err.message || 'Please try again',
            });
        },
    });

    const handleAddStream = useCallback(() => {
        setIsAddingStream(true);
    }, []);

    const handleRemoveStream = useCallback((id: string) => {
        const task = tasks.find(t => t.id === id);
        setStreamIds(prev => prev.filter(sid => sid !== id));
        if (task) {
            toast.info('Stream removed', {
                description: `"${task.title}" has been removed from your deck`
            });
        }
    }, [tasks]);

    const handleSubmitChat = useCallback(() => {
        const trimmed = chatInput.trim();
        if (!trimmed) return;
        setIsCreatingTask(true);
        createTaskMutation.mutate(trimmed, {
            onSettled: () => setIsCreatingTask(false),
        });
    }, [chatInput, createTaskMutation]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitChat();
            }
        },
        [handleSubmitChat]
    );

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
        }
    }, [chatInput]);

    // Status is handled internally — always show active tasks

    const agentOptions: InlineSelectOption[] = [
        { value: '', label: 'All Agents', description: 'Show tasks from any agent' },
        ...agents.map((a) => ({
            value: a.id,
            label: a.name,
            description: a.role || a.model || undefined,
        })),
    ];

    const projectOptions: InlineSelectOption[] = [
        { value: '', label: 'All Projects', description: 'Show tasks from any project' },
        ...projects.map((p) => ({
            value: p.id,
            label: p.name,
            description: p.category || undefined,
        })),
    ];

    // Determine if we show the welcome / chat-first view or multi-column view
    const showWelcome = streamIds.length === 0 && !agentsLoading && !tasksLoading;

    const chatInterface = (isFullPage = false) => (
        <div
            style={{
                width: '100%',
                maxHeight: '100%',
                maxWidth: isFullPage ? '620px' : '380px',
                background: '#111114',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                overflow: 'visible',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.4s ease-out',
                height: isFullPage ? 'auto' : '100%',
            }}
        >
            {/* Textarea */}
            <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe a task to get started…"
                disabled={isCreatingTask}
                rows={3}
                style={{
                    width: '100%',
                    minHeight: isFullPage ? '100px' : '60px',
                    maxHeight: isFullPage ? '160px' : 'none',
                    flex: isFullPage ? '0 0 auto' : '1',
                    padding: '16px 18px 8px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e4e4e7',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    resize: 'none',
                    fontFamily: 'inherit',
                }}
            />

            {/* Bottom bar with selectors & submit */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: isFullPage ? 'row' : 'column',
                    alignItems: isFullPage ? 'center' : 'stretch',
                    justifyContent: 'space-between',
                    padding: '8px',
                    gap: isFullPage ? '8px' : '12px',
                    borderTop: isFullPage ? 'none' : '1px solid rgba(255,255,255,0.04)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
                    <InlineSelect
                        options={projectOptions}
                        value={selectedProject}
                        onChange={setSelectedProject}
                        placeholder="Project"
                    />
                    <InlineSelect
                        options={agentOptions}
                        value={selectedAgent}
                        onChange={setSelectedAgent}
                        placeholder="Agent"
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {isAddingStream && streamIds.length > 0 && (
                        <button
                            onClick={() => setIsAddingStream(false)}
                            style={{
                                padding: '6px 12px',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#71717a',
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSubmitChat}
                        disabled={!chatInput.trim() || isCreatingTask}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '7px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: !chatInput.trim() || isCreatingTask ? '#52525b' : '#fff',
                            background:
                                !chatInput.trim() || isCreatingTask
                                    ? 'rgba(255,255,255,0.04)'
                                    : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: !chatInput.trim() || isCreatingTask ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {isCreatingTask ? (
                            <div
                                style={{
                                    width: 14,
                                    height: 14,
                                    border: '2px solid #52525b',
                                    borderTop: '2px solid #a1a1aa',
                                    borderRadius: '50%',
                                    animation: 'spin 0.6s linear infinite',
                                }}
                            />
                        ) : (
                            <Send style={{ width: 14, height: 14 }} />
                        )}
                        Add
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#050507',
            overflow: 'hidden',
        }}>
            {/* Inject keyframe animation */}
            <style>{`
                @keyframes fadeInDropdown {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                    50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* ─── Always-Visible Header ─── */}
            <div style={{
                padding: '8px 16px',
                background: 'rgba(15, 15, 20, 0.8)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                zIndex: 50,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity style={{ width: 18, height: 18, color: '#3b82f6' }} />
                    <h1 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5' }}>
                        Agent Swarm Deck
                    </h1>
                    <div style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        borderRadius: '10px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {activeTasks.length} Active Streams
                    </div>

                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={handleAddStream}
                        disabled={streamIds.length >= 5}
                        style={{
                            padding: '6px 12px',
                            background: streamIds.length >= 5 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            color: streamIds.length >= 5 ? '#3f3f46' : '#a1a1aa',
                            fontSize: '12px',
                            cursor: streamIds.length >= 5 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Plus style={{ width: 14, height: 14 }} />
                        Add Stream
                    </button>
                    <button style={{
                        padding: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer'
                    }}>
                        <Settings style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>

            {showWelcome ? (
                /* ─── Welcome / Chat-First View (like Claude.ai) ─── */
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                    }}
                >
                    {/* Greeting */}
                    <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '52px',
                            height: '52px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            marginBottom: '20px',
                            fontSize: '26px',
                        }}>
                            <Sparkles style={{ width: 26, height: 26, color: '#fff' }} />
                        </div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 600,
                            color: '#f4f4f5',
                            marginBottom: '8px',
                            letterSpacing: '-0.5px',
                        }}>
                            Agent Swarm Deck
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#71717a',
                            maxWidth: '400px',
                            lineHeight: 1.5,
                        }}>
                            Describe a task to get started. Your first message creates a new task, and follow-up messages continue the conversation.
                        </p>
                    </div>

                    {chatInterface(true)}

                    {/* Quick-add from existing tasks */}
                    {filteredTasks.length > 0 && (
                        <div style={{
                            marginTop: '32px',
                            width: '100%',
                            maxWidth: '620px',
                            animation: 'slideUp 0.5s ease-out 0.1s both',
                        }}>
                            <p style={{
                                fontSize: '11px',
                                color: '#52525b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                fontWeight: 600,
                                marginBottom: '10px',
                            }}>
                                or add existing tasks ({filteredTasks.length})
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                flexWrap: 'wrap',
                            }}>
                                {filteredTasks.slice(0, 8).map((task) => (
                                    <button
                                        key={task.id}
                                        onClick={() => {
                                            if (!streamIds.includes(task.id)) {
                                                setStreamIds((prev) => [...prev, task.id]);
                                                toast.success(`"${task.title}" added to deck`);
                                            }
                                        }}
                                        disabled={streamIds.includes(task.id)}
                                        style={{
                                            padding: '6px 14px',
                                            background: streamIds.includes(task.id)
                                                ? 'rgba(255,255,255,0.03)'
                                                : 'rgba(59, 130, 246, 0.08)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '20px',
                                            color: streamIds.includes(task.id) ? '#52525b' : '#a1a1aa',
                                            cursor: streamIds.includes(task.id) ? 'not-allowed' : 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            opacity: streamIds.includes(task.id) ? 0.5 : 1,
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!streamIds.includes(task.id)) {
                                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59, 130, 246, 0.15)';
                                                (e.currentTarget as HTMLButtonElement).style.color = '#d4d4d8';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!streamIds.includes(task.id)) {
                                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59, 130, 246, 0.08)';
                                                (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa';
                                            }
                                        }}
                                    >
                                        {streamIds.includes(task.id) ? '✓ ' : ''}{task.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* No tasks message */}
                    {filteredTasks.length === 0 && tasks.length > 0 && (
                        <p style={{ fontSize: '13px', color: '#52525b', marginTop: '24px' }}>
                            No tasks match your filters. Try adjusting the selectors.
                        </p>
                    )}
                </div>
            ) : (
                /* ─── TweetDeck Multi-Column View ─── */
                <div style={{
                    flex: 1,
                    display: 'flex',
                    overflowX: 'auto',
                    padding: '12px',
                    gap: '12px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                }}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={streamIds}
                            strategy={horizontalListSortingStrategy}
                        >
                            {/* Loading State */}
                            {(agentsLoading || tasksLoading) ? (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#52525b',
                                    gap: '12px',
                                }}>
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <p>Loading tasks and agents...</p>
                                </div>
                            ) : (
                                activeTasks.map((task) => (
                                    <DeckColumn
                                        key={task.id}
                                        task={task}
                                        agents={agents}
                                        onRemove={() => handleRemoveStream(task.id)}
                                        onMaximize={() => setMaximizedId(maximizedId === task.id ? null : task.id)}
                                        isMaximized={maximizedId === task.id}
                                    />
                                ))
                            )}

                            {/* Add Stream Inline Column */}
                            {isAddingStream && streamIds.length > 0 && !agentsLoading && !tasksLoading && (
                                <div style={{
                                    flex: '0 0 380px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    padding: '0 4px',
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#52525b',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.8px',
                                        fontWeight: 600,
                                        padding: '4px 8px',
                                    }}>
                                        New Stream
                                    </div>
                                    {chatInterface(false)}
                                </div>
                            )}
                        </SortableContext>
                    </DndContext>
                </div>
            )
            }

            {/* Maximized Overlay */}
            {
                maximizedId && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 2000,
                        background: '#050507',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <DeckColumn
                            task={tasks.find(t => t.id === maximizedId)!}
                            agents={agents}
                            onRemove={() => { setMaximizedId(null); handleRemoveStream(maximizedId ?? ''); }}
                            onMaximize={() => setMaximizedId(null)}
                            isMaximized={true}
                        />
                    </div>
                )
            }
        </div >
    );
}

interface DeckColumnProps {
    task: Task;
    agents: Agent[];
    onRemove: () => void;
    onMaximize: () => void;
    isMaximized?: boolean;
}

function DeckColumn({ task, agents, onRemove, onMaximize, isMaximized }: DeckColumnProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const assignee = agents.find(a => task.assigneeIds.includes(a.id));

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                flex: isMaximized ? '1' : '0 0 380px',
                display: 'flex',
                flexDirection: 'column',
                background: '#0f0f13',
                borderRadius: isMaximized ? '0' : '12px',
                border: isMaximized ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                overflow: 'hidden',
                boxShadow: isMaximized ? 'none' : '0 4px 24px rgba(0,0,0,0.4)',
            }}
        >
            {/* Column Header */}
            <div
                style={{
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.2)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div
                        {...attributes}
                        {...listeners}
                        style={{ cursor: 'grab', color: '#3f3f46', marginRight: '4px' }}
                    >
                        <GripVertical style={{ width: 16, height: 16 }} />
                    </div>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0
                    }}>
                        {assignee?.avatar || '👤'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#f4f4f5',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {assignee?.name || 'Unassigned'}
                        </div>
                        <div style={{
                            fontSize: '11px',
                            color: '#71717a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {task.title}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={onMaximize}
                        title={isMaximized ? "Restore" : "Full screen"}
                        style={{ padding: '4px', color: '#52525b', cursor: 'pointer', background: 'transparent', border: 'none' }}
                    >
                        {isMaximized ? <Minimize2 style={{ width: 14, height: 14 }} /> : <Maximize2 style={{ width: 14, height: 14 }} />}
                    </button>
                    <button
                        onClick={onRemove}
                        title="Remove stream"
                        style={{ padding: '4px', color: '#52525b', cursor: 'pointer', background: 'transparent', border: 'none' }}
                    >
                        <X style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            {/* Column Content - Chat */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <TaskChatHistory
                    taskId={task.id}
                    isExecuting={task.status === 'in_progress'}
                    agentName={assignee?.name}
                    agentAvatar={assignee?.avatar}
                />
            </div>

            {/* Quick Actions Footer */}
            <div style={{
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.1)',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                    }}>
                        {task.status}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Add quick action buttons here if needed */}
                </div>
            </div>
        </div>
    );
}

export default DeckPage;

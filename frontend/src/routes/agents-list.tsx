import { createRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { getAgents, createAgent, updateAgent, deleteAgent, Agent } from '../lib/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Search, Edit2, X, Bot, Download, Upload, Users, Menu } from 'lucide-react';
import { Button, Input, Select, TextArea } from '../components/ui';

interface AgentsSearchParams {
    agent?: 'add' | 'edit';
    id?: string;
    view?: 'grid' | 'templates' | 'marketplace';
}

export const agentsListRoute = createRoute({
    getParentRoute: () => workspaceLayoutRoute,
    path: 'agents',
    component: AgentsPage,
    validateSearch: (search: Record<string, unknown>): AgentsSearchParams => {
        return {
            agent: (search.agent === 'add' || search.agent === 'edit') ? search.agent as 'add' | 'edit' : undefined,
            id: typeof search.id === 'string' ? search.id : undefined,
            view: ['grid', 'templates', 'marketplace'].includes(search.view as string)
                ? search.view as 'grid' | 'templates' | 'marketplace'
                : 'grid',
        };
    },
});

function AgentsPage() {
    const search = useSearch({ from: agentsListRoute.fullPath }) as AgentsSearchParams;
    const navigate = useNavigate();
    const { currentWorkspaceId } = useWorkspace();
    const [localSearch, setLocalSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
    const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const currentView = search.view || 'grid';

    // Close filter dropdown on outside click
    useEffect(() => {
        if (!showFilterDropdown) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFilterDropdown]);

    const { data: agents = [], isLoading } = useQuery({
        queryKey: ['agents', currentWorkspaceId],
        queryFn: () => getAgents(currentWorkspaceId ?? undefined).catch(() => []),
    });

    useEffect(() => {
        if (search.agent === 'add') {
            setDrawerMode('create');
            setEditingAgentId(null);
            setDrawerOpen(true);
        } else if (search.agent === 'edit' && search.id) {
            const agent = (agents as Agent[]).find(a => a.id === search.id);
            if (agent) {
                setDrawerMode('edit');
                setEditingAgentId(search.id);
                setDrawerOpen(true);
            }
        } else if (search.id) {
            // Detail view - select agent but don't open drawer
            setSelectedAgentId(search.id);
            setDrawerOpen(false);
        } else {
            setSelectedAgentId(null);
        }
    }, [search, agents]);

    const updateUrlParams = (mode: 'create' | 'edit' | null, agentId?: string, view?: string) => {
        if (mode === null) {
            navigate({ to: agentsListRoute.fullPath, search: { view: view ?? currentView } });
        } else if (mode === 'create') {
            navigate({ to: agentsListRoute.fullPath, search: { agent: 'add', view: currentView } });
        } else if (mode === 'edit' && agentId) {
            navigate({ to: agentsListRoute.fullPath, search: { agent: 'edit', id: agentId, view: currentView } });
        }
    };

    const handleSelectAgent = (agentId: string | null) => {
        if (agentId) {
            navigate({ to: agentsListRoute.fullPath, search: { id: agentId, view: currentView } });
        } else {
            navigate({ to: agentsListRoute.fullPath, search: { view: currentView } });
        }
    };

    const handleOpenCreate = () => {
        updateUrlParams('create');
    };

    const handleOpenEdit = (agentId: string) => {
        updateUrlParams('edit', agentId);
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        updateUrlParams(null);
    };

    const handleViewChange = (view: 'grid' | 'templates' | 'marketplace') => {
        navigate({ to: agentsListRoute.fullPath, search: { view } });
    };

    const editingAgent = editingAgentId
        ? (agents as Agent[]).find(a => a.id === editingAgentId)
        : null;

    const filteredAgents = (agents as Agent[]).filter((agent) => {
        const matchesSearch = agent.name.toLowerCase().includes(localSearch.toLowerCase());
        const matchesStatus = !filterStatus || agent.status === filterStatus;
        const matchesLevel = !filterLevel || agent.level === filterLevel;
        return matchesSearch && matchesStatus && matchesLevel;
    });

    const statusCounts = {
        idle: (agents as Agent[]).filter(a => a.status === 'idle').length,
        active: (agents as Agent[]).filter(a => a.status === 'active').length,
        busy: (agents as Agent[]).filter(a => a.status === 'busy').length,
        offline: (agents as Agent[]).filter(a => a.status === 'offline').length,
    };

    return (
        <>
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
                {/* Main Content Area */}
                <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flex: 1 }}>
                    {/* Left Sidebar */}
                    <div style={{
                        width: '280px',
                        background: 'rgba(10, 10, 10, 0.6)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}>

                        {/* Sidebar Top Bar - Tabs + Filter */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {([{ label: 'My Agents', view: 'grid' as const }, { label: 'Templates', view: 'templates' as const }] as const).map((tab) => (
                                    <button
                                        key={tab.label}
                                        onClick={() => handleViewChange(tab.view)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: currentView === tab.view ? '#fff' : '#666',
                                            fontSize: '11px',
                                            fontWeight: currentView === tab.view ? 600 : 400,
                                            cursor: 'pointer',
                                            padding: '2px 0',
                                            borderBottom: currentView === tab.view ? '2px solid #fff' : '2px solid transparent',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                                {/* Marketplace tab */}
                                <button
                                    onClick={() => handleViewChange('marketplace')}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: currentView === 'marketplace' ? '#fff' : '#666',
                                        fontSize: '11px',
                                        fontWeight: currentView === 'marketplace' ? 600 : 400,
                                        cursor: 'pointer',
                                        padding: '2px 0',
                                        borderBottom: currentView === 'marketplace' ? '2px solid #fff' : '2px solid transparent',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Marketplace
                                </button>
                            </div>

                            {/* Filter Icon */}
                            <div ref={filterDropdownRef} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                    style={{
                                        background: (filterStatus || filterLevel) ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                        border: 'none',
                                        color: (filterStatus || filterLevel) ? '#3b82f6' : '#666',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: '4px',
                                    }}
                                    title="Filters"
                                >
                                    <Menu size={14} />
                                </button>

                                {showFilterDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        background: 'rgba(20, 20, 25, 0.98)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                                        zIndex: 1000,
                                        minWidth: '200px',
                                        padding: '6px',
                                    }}>
                                        {/* Status Section */}
                                        <div style={{ padding: '6px 10px 4px', fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                                            Status
                                        </div>
                                        {[
                                            { value: '', label: 'All', color: '#888' },
                                            { value: 'idle', label: 'Idle', color: '#22c55e' },
                                            { value: 'active', label: 'Active', color: '#3b82f6' },
                                            { value: 'busy', label: 'Busy', color: '#f59e0b' },
                                            { value: 'offline', label: 'Offline', color: '#666' },
                                        ].map((item) => (
                                            <button
                                                key={`status-${item.value}`}
                                                onClick={() => setFilterStatus(item.value)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    width: '100%',
                                                    padding: '7px 10px',
                                                    background: filterStatus === item.value ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: filterStatus === item.value ? '#fff' : '#aaa',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'background 0.15s',
                                                }}
                                            >
                                                {item.value && (
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                                                )}
                                                {item.label}
                                                {filterStatus === item.value && (
                                                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#3b82f6' }}>✓</span>
                                                )}
                                            </button>
                                        ))}

                                        {/* Divider */}
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />

                                        {/* Level Section */}
                                        <div style={{ padding: '6px 10px 4px', fontSize: '9px', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                                            Level
                                        </div>
                                        {[
                                            { value: '', label: 'All' },
                                            { value: 'lead', label: 'Lead' },
                                            { value: 'senior', label: 'Senior' },
                                            { value: 'mid', label: 'Mid' },
                                            { value: 'junior', label: 'Junior' },
                                        ].map((item) => (
                                            <button
                                                key={`level-${item.value}`}
                                                onClick={() => setFilterLevel(item.value)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    width: '100%',
                                                    padding: '7px 10px',
                                                    background: filterLevel === item.value ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: filterLevel === item.value ? '#fff' : '#aaa',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'background 0.15s',
                                                }}
                                            >
                                                {item.label}
                                                {filterLevel === item.value && (
                                                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#3b82f6' }}>✓</span>
                                                )}
                                            </button>
                                        ))}

                                        {/* Clear All */}
                                        {(filterStatus || filterLevel) && (
                                            <>
                                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
                                                <button
                                                    onClick={() => { setFilterStatus(''); setFilterLevel(''); }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '7px 10px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        color: '#ef4444',
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    Clear all filters
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Content - Agent List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
                            {isLoading ? (
                                <div style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#666', borderRadius: '50%', margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
                                    <span style={{ fontSize: '11px', color: '#555' }}>Loading...</span>
                                </div>
                            ) : filteredAgents.length === 0 ? (
                                <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                                    <Bot size={28} style={{ color: '#333', marginBottom: '8px' }} />
                                    <p style={{ fontSize: '12px', color: '#555', margin: '0 0 4px' }}>No agents yet</p>
                                    <p style={{ fontSize: '10px', color: '#444', margin: 0 }}>Create your first agent to get started</p>
                                </div>
                            ) : (
                                <>
                                    {/* All Agents item */}
                                    <button
                                        onClick={() => handleSelectAgent(null)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '6px 10px',
                                            background: !selectedAgentId ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: !selectedAgentId ? '#a855f7' : '#ccc',
                                            fontSize: '12px',
                                            fontWeight: !selectedAgentId ? 600 : 400,
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                            marginBottom: '4px',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <Users size={14} style={{ flexShrink: 0 }} />
                                        <span>All Agents</span>
                                        <span style={{
                                            marginLeft: 'auto',
                                            background: 'rgba(255,255,255,0.08)',
                                            padding: '1px 6px',
                                            borderRadius: '8px',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                        }}>{filteredAgents.length}</span>
                                    </button>

                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '4px 8px' }} />

                                    {/* Individual agents */}
                                    {filteredAgents.map((agent) => (
                                        <button
                                            key={agent.id}
                                            onClick={() => handleSelectAgent(agent.id)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '6px 10px',
                                                background: selectedAgentId === agent.id ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: selectedAgentId === agent.id ? '#a855f7' : '#ccc',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s',
                                                marginBottom: '1px',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <span style={{ fontSize: '16px', flexShrink: 0 }}>{agent.avatar ?? '🤖'}</span>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</span>
                                            <span style={{
                                                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                                                background: agent.status === 'active' ? '#3b82f6' : agent.status === 'idle' ? '#22c55e' : agent.status === 'busy' ? '#f59e0b' : '#555',
                                            }} />
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                        {/* Agent Detail View */}
                        {currentView === 'grid' && selectedAgentId && (() => {
                            const selectedAgent = (agents as Agent[]).find(a => a.id === selectedAgentId);
                            if (!selectedAgent) return null;
                            return <AgentDetailPanel agent={selectedAgent} onEdit={() => handleOpenEdit(selectedAgent.id)} onBack={() => handleSelectAgent(null)} />;
                        })()}

                        {/* All Agents Grid View */}
                        {currentView === 'grid' && !selectedAgentId && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                                <div>
                                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                    <input
                                        type="text"
                                        placeholder="Search agents..."
                                        value={localSearch}
                                        onChange={(e) => setLocalSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px 12px 44px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px',
                                            color: '#fff',
                                            fontSize: '13px',
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '8px 14px',
                                        color: '#888',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <Upload size={14} />
                                        Import
                                    </button>
                                    <button style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '8px 14px',
                                        color: '#888',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <Download size={14} />
                                        Export
                                    </button>
                                    <Button style={{
                                        background: 'rgba(240, 231, 231, 0.89)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '8px 14px',
                                        color: '#1b1818f4',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                    }} onClick={handleOpenCreate} leftIcon={<span style={{ fontSize: '18px' }}>+</span>}>
                                        Add Agent
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentView === 'grid' && !selectedAgentId && !isLoading && (agents as Agent[]).length === 0 && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '80px 32px',
                                textAlign: 'center',
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '20px',
                                    background: 'rgba(168, 85, 247, 0.08)',
                                    border: '1px solid rgba(168, 85, 247, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '24px',
                                }}>
                                    <Bot size={36} style={{ color: '#a855f7' }} />
                                </div>
                                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>No agents in this workspace</h3>
                                <p style={{ color: '#666', fontSize: '14px', margin: '0 0 24px', maxWidth: '360px' }}>
                                    Get started by creating your first AI agent or importing an existing configuration.
                                </p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <Button variant="primary" onClick={handleOpenCreate} leftIcon={<span style={{ fontSize: '16px' }}>+</span>}>
                                        Create Agent
                                    </Button>
                                    <button style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        color: '#888',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <Upload size={14} />
                                        Import
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentView === 'grid' && !selectedAgentId && (isLoading || (agents as Agent[]).length > 0) && (
                            <>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: '16px',
                                    marginBottom: '32px'
                                }}>
                                    <StatCard
                                        value={(agents as Agent[]).length}
                                        label="Total Agents"
                                        color="rgba(34, 197, 94, 0.1)"
                                        borderColor="rgba(34, 197, 94, 0.2)"
                                        textColor="#fff"
                                    />
                                    <StatCard
                                        value={statusCounts.idle}
                                        label="Idle"
                                        color="rgba(34, 197, 94, 0.1)"
                                        borderColor="rgba(34, 197, 94, 0.2)"
                                        textColor="#22c55e"
                                    />
                                    <StatCard
                                        value={statusCounts.active}
                                        label="Active"
                                        color="rgba(59, 130, 246, 0.1)"
                                        borderColor="rgba(59, 130, 246, 0.2)"
                                        textColor="#3b82f6"
                                    />
                                    <StatCard
                                        value={statusCounts.busy}
                                        label="Busy"
                                        color="rgba(245, 158, 11, 0.1)"
                                        borderColor="rgba(245, 158, 11, 0.2)"
                                        textColor="#f59e0b"
                                    />
                                </div>



                                {isLoading ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div key={i} style={{ height: '220px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }} />
                                        ))}
                                    </div>
                                ) : filteredAgents.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '64px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <Bot size={48} style={{ color: '#444', marginBottom: '16px' }} />
                                        <p style={{ color: '#666', fontSize: '16px' }}>No agents found</p>
                                        <p style={{ color: '#555', fontSize: '14px', marginTop: '8px' }}>Create your first agent to get started</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                        {filteredAgents.map((agent) => (
                                            <EnhancedAgentCard
                                                key={agent.id}
                                                agent={agent}
                                                onEdit={() => handleOpenEdit(agent.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {currentView === 'templates' && (
                            <TemplatesView onInstallTemplate={() => { }} />
                        )}

                        {currentView === 'marketplace' && (
                            <MarketplaceView onInstallAgent={() => { }} />
                        )}
                    </div>
                </div>
            </div>

            <RightDrawer
                isOpen={drawerOpen}
                onClose={handleCloseDrawer}
                mode={drawerMode}
                agent={editingAgent || null}
                workspaceId={currentWorkspaceId ?? null}
            />
        </>
    );
}

// Helper Components

interface StatCardProps {
    value: number;
    label: string;
    color: string;
    borderColor: string;
    textColor: string;
}

function StatCard({ value, label, color, borderColor, textColor }: StatCardProps) {
    return (
        <div style={{ background: color, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: textColor }}>{value}</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{label}</div>
        </div>
    );
}

// Agent Detail Panel - shown in main content when agent is selected
interface AgentDetailPanelProps {
    readonly agent: Agent;
    readonly onEdit: () => void;
    readonly onBack: () => void;
}

function AgentDetailPanel({ agent, onEdit, onBack }: AgentDetailPanelProps) {
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const statusColors: Record<string, string> = {
        idle: '#22c55e', active: '#3b82f6', busy: '#f59e0b', offline: '#6b7280',
    };
    const levelColors: Record<string, string> = {
        lead: 'rgba(168, 85, 247, 0.2)', senior: 'rgba(34, 197, 94, 0.2)', mid: 'rgba(59, 130, 246, 0.2)', junior: 'rgba(107, 114, 128, 0.2)',
    };
    const levelTextColors: Record<string, string> = {
        lead: '#c084fc', senior: '#4ade80', mid: '#60a5fa', junior: '#9ca3af',
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteAgent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            setShowDeleteConfirm(false);
            onBack();
        },
    });

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                >
                    ← Back
                </button>
                <div style={{ flex: 1 }} />
                <Button variant="secondary" size="sm" onClick={onEdit}>
                    <Edit2 size={14} style={{ marginRight: '6px' }} /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} style={{ color: '#ef4444' }}>
                    <X size={14} style={{ marginRight: '6px' }} /> Delete
                </Button>
            </div>

            {/* Agent Info */}
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '32px',
                marginBottom: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '48px' }}>{agent.avatar ?? '🤖'}</span>
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{agent.name}</h2>
                        <p style={{ fontSize: '14px', color: '#888', margin: 0, textTransform: 'capitalize' }}>{agent.role || agent.level || 'Agent'}</p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColors[agent.status] ?? '#6b7280' }} />
                        <span style={{ fontSize: '14px', color: '#ccc', textTransform: 'capitalize' }}>{agent.status ?? 'idle'}</span>
                    </div>
                </div>

                <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6, marginBottom: '24px' }}>
                    {agent.description || 'No description provided'}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <span style={{
                        background: levelColors[agent.level] ?? 'rgba(107, 114, 128, 0.2)',
                        color: levelTextColors[agent.level] ?? '#9ca3af',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize',
                    }}>
                        {agent.level ?? 'intern'}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#888', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        🔧 {agent.tools?.enabled?.length ?? 0} tools
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#888', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        🧠 {agent.model ?? 'default'}
                    </span>
                </div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <DetailItem label="Model" value={agent.model ?? 'Not set'} />
                    <DetailItem label="Session Key" value={agent.sessionKey ?? 'Not set'} />
                    <DetailItem label="Level" value={agent.level ?? 'intern'} />
                    <DetailItem label="Tools Preset" value={(agent.tools as any)?.quick_preset ?? 'custom'} />
                    <DetailItem label="Wakeup Method" value={agent.wakeupConfig?.method ?? 'poll'} />
                    <DetailItem label="Last Updated" value={new Date(agent.updatedAt).toLocaleDateString()} />
                </div>
            </div>

            {/* Tools Section */}
            {agent.tools?.enabled && agent.tools.enabled.length > 0 && (
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '24px',
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>Enabled Tools</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {agent.tools.enabled.map((tool) => (
                            <span key={tool} style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                color: '#60a5fa',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                            }}>
                                {tool}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
                    <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '400px', textAlign: 'center', margin: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#fff' }}>Delete Agent?</h3>
                        <p style={{ color: '#888', marginBottom: '20px' }}>
                            Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                            <Button variant="danger" onClick={() => deleteMutation.mutate(agent.id)} isLoading={deleteMutation.isPending}>
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailItem({ label, value }: { readonly label: string; readonly value: string }) {
    return (
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: '13px', color: '#ccc', textTransform: 'capitalize' }}>{value}</div>
        </div>
    );
}

// Enhanced Agent Card with File Status
interface EnhancedAgentCardProps {
    readonly agent: Agent;
    readonly onEdit: () => void;
}

function EnhancedAgentCard({ agent, onEdit }: EnhancedAgentCardProps) {
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const statusColors: Record<string, string> = {
        idle: '#22c55e',
        active: '#3b82f6',
        busy: '#f59e0b',
        offline: '#6b7280',
    };

    const levelColors: Record<string, string> = {
        lead: 'rgba(168, 85, 247, 0.2)',
        senior: 'rgba(34, 197, 94, 0.2)',
        mid: 'rgba(59, 130, 246, 0.2)',
        junior: 'rgba(107, 114, 128, 0.2)',
    };

    const levelTextColors: Record<string, string> = {
        lead: '#c084fc',
        senior: '#4ade80',
        mid: '#60a5fa',
        junior: '#9ca3af',
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteAgent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            setShowDeleteConfirm(false);
        },
    });

    // Mock file status - in real implementation, this would come from agent data
    const fileStatus = {
        total: 8,
        completed: 6,
        files: {
            soul: true,
            identity: true,
            tools: true,
            agents: true,
            memory: false,
            heartbeat: false,
        }
    };

    const fileProgress = (fileStatus.completed / fileStatus.total) * 100;

    return (
        <>
            <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.2s',
            }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '32px' }}>{agent.avatar}</span>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{agent.name}</h3>
                            <p style={{ fontSize: '12px', color: '#888', textTransform: 'capitalize' }}>{agent.role || agent.level || 'Agent'}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[agent.status] || '#6b7280' }} />
                        <span style={{ fontSize: '12px', color: '#888', textTransform: 'capitalize' }}>{agent.status || 'idle'}</span>
                    </div>
                </div>

                <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px', lineHeight: 1.5, minHeight: '40px' }}>
                    {agent.description || 'No description provided'}
                </p>

                {/* File Status Progress Bar */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#666' }}>
                            📁 Files: {fileStatus.completed}/{fileStatus.total}
                        </span>
                        <span style={{ fontSize: '11px', color: '#666' }}>
                            {Math.round(fileProgress)}%
                        </span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${fileProgress}%`,
                            height: '100%',
                            background: fileProgress === 100
                                ? 'linear-gradient(90deg, #22c55e, #10b981)'
                                : 'linear-gradient(90deg, #f59e0b, #f97316)',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{
                        background: levelColors[agent.level] || 'rgba(107, 114, 128, 0.2)',
                        color: levelTextColors[agent.level] || '#9ca3af',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        textTransform: 'capitalize'
                    }}>
                        {agent.level || 'Level 1'}
                    </span>
                    <span style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#888',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px'
                    }}>
                        🔧 {agent.tools?.enabled?.length || 0} tools
                    </span>
                    <span style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#888',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px'
                    }}>
                        🧠 2.3 MB
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                    <span style={{ fontSize: '11px', color: '#666' }}>
                        {new Date(agent.updatedAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <Button variant="secondary" size="sm" onClick={onEdit}>
                            <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} style={{ color: '#ef4444' }}>
                            <X size={14} />
                        </Button>
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001,
                }}>
                    <div style={{
                        background: '#0a0a0a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '400px',
                        textAlign: 'center',
                        margin: '20px',
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#fff' }}>Delete Agent?</h3>
                        <p style={{ color: '#888', marginBottom: '20px' }}>
                            Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => deleteMutation.mutate(agent.id)}
                                isLoading={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Templates View Component
interface TemplatesViewProps {
    onInstallTemplate: (templateId: string) => void;
}

function TemplatesView({ onInstallTemplate }: TemplatesViewProps) {
    const templates = [
        {
            id: 'marketing-crew',
            name: 'Marketing Crew',
            icon: '💼',
            description: 'Complete marketing automation team with content, social, SEO, and analytics agents.',
            agents: ['Content Strategist', 'SEO Specialist', 'Social Media Manager', 'Analytics Reporter', 'Copywriter'],
            agentCount: 5,
            category: 'Marketing',
            pattern: 'Hierarchical',
        },
        {
            id: 'dev-squad',
            name: 'Developer Squad',
            icon: '🛠️',
            description: 'Full-stack development team with backend, frontend, DevOps, and QA specialists.',
            agents: ['Tech Lead', 'Backend Developer', 'Frontend Developer', 'DevOps Engineer'],
            agentCount: 4,
            category: 'Development',
            pattern: 'Collaborative',
        },
        {
            id: 'research-team',
            name: 'Research Team',
            icon: '🔬',
            description: 'Comprehensive research squad for data gathering, analysis, and synthesis.',
            agents: ['Research Lead', 'Data Analyst', 'Report Writer'],
            agentCount: 3,
            category: 'Research',
            pattern: 'Sequential',
        },
        {
            id: 'content-creators',
            name: 'Content Creators',
            icon: '🎨',
            description: 'Creative team for generating engaging content across multiple formats.',
            agents: ['Creative Director', 'Writer', 'Editor', 'Designer'],
            agentCount: 4,
            category: 'Creative',
            pattern: 'Collaborative',
        },
        {
            id: 'customer-support',
            name: 'Customer Support',
            icon: '💬',
            description: 'Multi-tier support team handling inquiries, escalations, and documentation.',
            agents: ['Support Manager', 'Level 1 Support', 'Level 2 Support', 'Documentation Specialist'],
            agentCount: 4,
            category: 'Support',
            pattern: 'Hierarchical',
        },
        {
            id: 'data-science',
            name: 'Data Science Team',
            icon: '📊',
            description: 'End-to-end data pipeline from collection to insights and visualization.',
            agents: ['Data Engineer', 'ML Specialist', 'Analyst', 'Visualization Expert'],
            agentCount: 4,
            category: 'Data',
            pattern: 'Pipeline',
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                    By Vertical
                </h2>
                <p style={{ fontSize: '13px', color: '#666' }}>
                    Pre-configured agent teams for common business functions
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                {templates.map((template) => (
                    <TemplateCard key={template.id} template={template} onInstall={onInstallTemplate} />
                ))}
            </div>
        </div>
    );
}

interface TemplateCardProps {
    template: {
        id: string;
        name: string;
        icon: string;
        description: string;
        agents: string[];
        agentCount: number;
        category: string;
        pattern: string;
    };
    onInstall: (templateId: string) => void;
}

function TemplateCard({ template, onInstall }: TemplateCardProps) {
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '24px',
            transition: 'all 0.2s',
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>{template.icon}</span>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                        {template.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <span style={{
                            fontSize: '11px',
                            color: '#a855f7',
                            background: 'rgba(168, 85, 247, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                        }}>
                            {template.category}
                        </span>
                        <span style={{
                            fontSize: '11px',
                            color: '#888',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                        }}>
                            {template.pattern}
                        </span>
                    </div>
                </div>
            </div>

            <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '16px' }}>
                {template.description}
            </p>

            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: 500 }}>
                    Includes {template.agentCount} agents:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {template.agents.slice(0, 3).map((agent, idx) => (
                        <div key={idx} style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Users size={12} style={{ color: '#666' }} />
                            {agent}
                        </div>
                    ))}
                    {template.agents.length > 3 && (
                        <div style={{ fontSize: '12px', color: '#666', marginLeft: '18px' }}>
                            +{template.agents.length - 3} more
                        </div>
                    )}
                </div>
            </div>

            <Button
                variant="primary"
                onClick={() => onInstall(template.id)}
                style={{ width: '100%' }}
            >
                Install Template
            </Button>
        </div>
    );
}

// Marketplace View Component
interface MarketplaceViewProps {
    onInstallAgent: (agentId: string) => void;
}

function MarketplaceView({ onInstallAgent }: MarketplaceViewProps) {
    const marketplaceAgents = [
        {
            id: 'research-agent-pro',
            name: 'Research Agent Pro',
            author: '@researcher_labs',
            icon: '🧠',
            description: 'Advanced research agent with citation support, multi-source synthesis, and academic formatting.',
            version: 'v2.4.0',
            rating: 4.9,
            installs: 15234,
            category: 'Research',
            tags: ['research', 'citations', 'academic'],
            featured: true,
        },
        {
            id: 'code-reviewer',
            name: 'Code Review Specialist',
            author: '@devtools',
            icon: '👨‍💻',
            description: 'Comprehensive code review agent focusing on best practices, security, and performance.',
            version: 'v1.8.2',
            rating: 4.8,
            installs: 12456,
            category: 'Development',
            tags: ['code', 'review', 'security'],
            featured: true,
        },
        {
            id: 'seo-optimizer',
            name: 'SEO Optimization Agent',
            author: '@marketing_ai',
            icon: '🎯',
            description: 'Comprehensive SEO analysis and optimization with keyword research and competitor analysis.',
            version: 'v3.1.0',
            rating: 4.7,
            installs: 9821,
            category: 'Marketing',
            tags: ['seo', 'marketing', 'optimization'],
            featured: false,
        },
        {
            id: 'data-viz',
            name: 'Data Visualization Expert',
            author: '@datascience',
            icon: '📊',
            description: 'Create beautiful, insightful visualizations from any dataset with automatic chart selection.',
            version: 'v2.0.3',
            rating: 4.9,
            installs: 8234,
            category: 'Data',
            tags: ['data', 'visualization', 'charts'],
            featured: false,
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ position: 'relative', maxWidth: '500px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    <input
                        type="text"
                        placeholder="Search marketplace..."
                        style={{
                            width: '100%',
                            padding: '12px 14px 12px 44px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '14px',
                        }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
                    ⭐ Featured Agents
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                    {marketplaceAgents.filter(a => a.featured).map((agent) => (
                        <MarketplaceCard key={agent.id} agent={agent} onInstall={onInstallAgent} />
                    ))}
                </div>
            </div>

            <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
                    All Agents
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                    {marketplaceAgents.filter(a => !a.featured).map((agent) => (
                        <MarketplaceCard key={agent.id} agent={agent} onInstall={onInstallAgent} />
                    ))}
                </div>
            </div>
        </div>
    );
}

interface MarketplaceCardProps {
    agent: {
        id: string;
        name: string;
        author: string;
        icon: string;
        description: string;
        version: string;
        rating: number;
        installs: number;
        category: string;
        tags: string[];
    };
    onInstall: (agentId: string) => void;
}

function MarketplaceCard({ agent, onInstall }: MarketplaceCardProps) {
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '24px',
            transition: 'all 0.2s',
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                <span style={{ fontSize: '40px' }}>{agent.icon}</span>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                        {agent.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        by {agent.author}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#888' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ⭐ {agent.rating}
                        </span>
                        <span>•</span>
                        <span>{(agent.installs / 1000).toFixed(1)}k installs</span>
                        <span>•</span>
                        <span>{agent.version}</span>
                    </div>
                </div>
            </div>

            <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, marginBottom: '16px' }}>
                {agent.description}
            </p>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{
                    fontSize: '11px',
                    color: '#a855f7',
                    background: 'rgba(168, 85, 247, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                }}>
                    {agent.category}
                </span>
                {agent.tags.slice(0, 2).map((tag) => (
                    <span key={tag} style={{
                        fontSize: '11px',
                        color: '#888',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                    }}>
                        {tag}
                    </span>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                    variant="primary"
                    onClick={() => onInstall(agent.id)}
                    style={{ flex: 1 }}
                >
                    Install
                </Button>
                <Button variant="secondary">
                    Preview
                </Button>
            </div>
        </div>
    );
}

// Enhanced Right Drawer with File Management
interface RightDrawerProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly mode: 'create' | 'edit';
    readonly agent: Agent | null;
    readonly workspaceId: string | null;
}

function RightDrawer({ isOpen, onClose, mode, agent, workspaceId }: RightDrawerProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'memory' | 'activity'>('overview');
    const [formData, setFormData] = useState({
        name: '',
        avatar: '🤖',
        description: '',
        role: 'Agent',
        level: 'junior',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [mounted, setMounted] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mode === 'edit' && agent) {
            setFormData({
                name: agent.name || '',
                avatar: agent.avatar || '🤖',
                description: agent.description || '',
                role: agent.role || 'Agent',
                level: agent.level || 'junior',
            });
        } else {
            setFormData({
                name: '',
                avatar: '🤖',
                description: '',
                role: 'Agent',
                level: 'junior',
            });
        }
        setErrors({});
        setActiveTab('overview');
    }, [mode, agent, isOpen]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Agent name is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            if (mode === 'create') {
                await createAgent({ ...formData, workspaceId: workspaceId ?? undefined, syncToGateway: true });
            } else if (agent) {
                await updateAgent(agent.id, formData);
            }
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            onClose();
        } catch (error) {
            console.error('Failed to save agent:', error);
        }
    };

    if (!mounted) return null;

    const avatarOptions = ['🤖', '👨‍💻', '🧠', '⚡', '🎯', '🔮', '💡', '🛠️', '📊', '🎨'];

    const colors = {
        bgCard: 'rgba(20, 20, 25, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        textPrimary: '#f4f4f5',
        textSecondary: '#a1a1aa',
    };

    const tabs = [
        { id: 'overview', label: 'Overview', show: true },
        { id: 'files', label: 'Files', show: mode === 'edit' },
        { id: 'memory', label: 'Memory', show: mode === 'edit' },
        { id: 'activity', label: 'Activity', show: mode === 'edit' },
    ] as const;

    return (
        <>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    zIndex: 998,
                    backdropFilter: 'blur(4px)',
                }} onClick={onClose} />
            )}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '520px',
                maxWidth: '100%',
                background: colors.bgCard,
                borderLeft: `1px solid ${colors.borderColor}`,
                boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
                zIndex: 999,
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: `1px solid ${colors.borderColor}`,
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.textPrimary }}>
                        {mode === 'create' ? 'Create New Agent' : `Edit ${agent?.name}`}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: colors.textSecondary,
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '12px 24px',
                    borderBottom: `1px solid ${colors.borderColor}`,
                    background: 'rgba(0, 0, 0, 0.2)',
                }}>
                    {tabs.filter(t => t.show).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                padding: '8px 16px',
                                background: activeTab === tab.id ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: activeTab === tab.id ? '#a855f7' : '#888',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {activeTab === 'overview' && (
                        <OverviewTab
                            formData={formData}
                            setFormData={setFormData}
                            errors={errors}
                            avatarOptions={avatarOptions}
                        />
                    )}
                    {activeTab === 'files' && mode === 'edit' && (
                        <FilesTab />
                    )}
                    {activeTab === 'memory' && mode === 'edit' && (
                        <MemoryTab />
                    )}
                    {activeTab === 'activity' && mode === 'edit' && (
                        <ActivityTab />
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '20px 24px',
                    borderTop: `1px solid ${colors.borderColor}`,
                    background: colors.bgCard,
                }}>
                    {mode === 'edit' && (
                        <Button variant="ghost" style={{ color: '#888' }}>
                            <Download size={16} />
                            Export
                        </Button>
                    )}
                    <div style={{ flex: 1 }} />
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                    >
                        {mode === 'create' ? 'Create Agent' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </>
    );
}

// Tab Components
interface OverviewTabProps {
    formData: any;
    setFormData: (data: any) => void;
    errors: Record<string, string>;
    avatarOptions: string[];
}

function OverviewTab({ formData, setFormData, errors, avatarOptions }: OverviewTabProps) {
    return (
        <>
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '13px', marginBottom: '8px' }}>
                    Avatar
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {avatarOptions.map((avatar) => (
                        <button
                            key={avatar}
                            onClick={() => setFormData({ ...formData, avatar })}
                            style={{
                                width: '44px',
                                height: '44px',
                                fontSize: '24px',
                                background: formData.avatar === avatar ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${formData.avatar === avatar ? '#3b82f6' : 'transparent'}`,
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {avatar}
                        </button>
                    ))}
                </div>
            </div>

            <Input
                id="agent-name"
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Agent name"
                error={errors.name}
                required
            />

            <TextArea
                id="agent-description"
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your agent..."
                rows={3}
                error={errors.description}
            />

            <Select
                id="agent-role"
                label="Role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                options={[
                    { value: 'Agent', label: 'Agent' },
                    { value: 'Assistant', label: 'Assistant' },
                    { value: 'Developer', label: 'Developer' },
                    { value: 'Analyst', label: 'Analyst' },
                    { value: 'Coordinator', label: 'Coordinator' },
                ]}
            />

            <Select
                id="agent-level"
                label="Level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                options={[
                    { value: 'junior', label: 'Junior' },
                    { value: 'mid', label: 'Mid' },
                    { value: 'senior', label: 'Senior' },
                    { value: 'lead', label: 'Lead' },
                ]}
            />
        </>
    );
}

function FilesTab() {
    const agentFiles = [
        { name: 'SOUL.md', status: 'complete', description: 'Personality, values, and boundaries' },
        { name: 'IDENTITY.md', status: 'complete', description: 'Name, emoji, and presentation layer' },
        { name: 'TOOLS.md', status: 'complete', description: 'Available capabilities and conventions' },
        { name: 'AGENTS.md', status: 'complete', description: 'Operating instructions and workflows' },
        { name: 'USER.md', status: 'partial', description: 'User context and preferences' },
        { name: 'MEMORY.md', status: 'empty', description: 'Long-term persistent memory' },
        { name: 'HEARTBEAT.md', status: 'missing', description: 'Autonomous task checklist' },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complete': return '#22c55e';
            case 'partial': return '#f59e0b';
            case 'empty': return '#6b7280';
            case 'missing': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'complete': return '✅';
            case 'partial': return '⚠️';
            case 'empty': return '📝';
            case 'missing': return '❌';
            default: return '📄';
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                    Agent configuration files define personality, capabilities, and memory.
                </div>
                <div style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                    color: '#c084fc',
                }}>
                    💡 Tip: Complete all files for optimal agent performance
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {agentFiles.map((file) => (
                    <div key={file.name} style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '8px',
                        padding: '16px',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>{getStatusIcon(file.status)}</span>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>{file.name}</span>
                            </div>
                            <span style={{
                                fontSize: '11px',
                                color: getStatusColor(file.status),
                                textTransform: 'capitalize',
                            }}>
                                {file.status}
                            </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                            {file.description}
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="secondary" size="sm" style={{ flex: 1 }}>
                                Edit
                            </Button>
                            <Button variant="ghost" size="sm">
                                View
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MemoryTab() {
    return (
        <div>
            <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
            }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>
                    2.3 MB
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                    Total memory size
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                    847 entries • Last updated 2 hours ago
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>
                    Recent Entries
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                        { date: '2024-02-12', content: 'User prefers concise technical documentation', type: 'preference' },
                        { date: '2024-02-12', content: 'Completed research on AI agent architectures', type: 'task' },
                        { date: '2024-02-11', content: 'User timezone: EST', type: 'context' },
                    ].map((entry, idx) => (
                        <div key={idx} style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            padding: '12px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', color: '#666' }}>{entry.date}</span>
                                <span style={{
                                    fontSize: '10px',
                                    color: '#a855f7',
                                    background: 'rgba(168, 85, 247, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                }}>
                                    {entry.type}
                                </span>
                            </div>
                            <p style={{ fontSize: '13px', color: '#888' }}>{entry.content}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" style={{ flex: 1 }}>
                    View All
                </Button>
                <Button variant="ghost" style={{ color: '#ef4444' }}>
                    Clear Memory
                </Button>
            </div>
        </div>
    );
}

function ActivityTab() {
    const activities = [
        { time: '2 hours ago', action: 'Completed research task', type: 'success' },
        { time: '5 hours ago', action: 'Generated report document', type: 'success' },
        { time: '1 day ago', action: 'Updated knowledge base', type: 'info' },
        { time: '2 days ago', action: 'Failed to connect to API', type: 'error' },
    ];

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return '#22c55e';
            case 'info': return '#3b82f6';
            case 'error': return '#ef4444';
            default: return '#888';
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>
                    Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activities.map((activity, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                        }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: getTypeColor(activity.type),
                                marginTop: '6px',
                                flexShrink: 0,
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', color: '#fff', marginBottom: '2px' }}>
                                    {activity.action}
                                </div>
                                <div style={{ fontSize: '11px', color: '#666' }}>
                                    {activity.time}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '16px',
            }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>
                    Performance Stats
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>87%</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Success Rate</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>142</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Tasks Completed</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>2.3s</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Avg Response</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#a855f7' }}>24/7</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Uptime</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AgentsPage;
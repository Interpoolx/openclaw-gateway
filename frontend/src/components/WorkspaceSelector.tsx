import { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ChevronDown, Search, Check, Plus } from 'lucide-react';

interface WorkspaceSelectorProps {
    isCollapsed?: boolean;
}

export function WorkspaceSelector({ isCollapsed = false }: WorkspaceSelectorProps): JSX.Element {
    const { currentWorkspace, workspaces, setCurrentWorkspace, isLoading, createWorkspace } = useWorkspace();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [newWorkspaceSlug, setNewWorkspaceSlug] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleWorkspaceChange = async (workspace: typeof currentWorkspace) => {
        if (!workspace || workspace.id === currentWorkspace?.id) {
            setIsOpen(false);
            setSearchQuery('');
            return;
        }
        // setCurrentWorkspace already handles navigation to the new workspace
        await setCurrentWorkspace(workspace);
        setIsOpen(false);
        setSearchQuery('');
        // Navigation happens automatically through WorkspaceContext, no reload needed
    };

    const filteredWorkspaces = searchQuery
        ? workspaces.filter(w =>
            (w.name?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
            (w.slug?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
        )
        : workspaces;

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 50);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setNewWorkspaceName(name);
        // Auto-generate slug from name
        setNewWorkspaceSlug(generateSlug(name));
    };

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim() || !newWorkspaceSlug.trim()) {
            return;
        }

        setIsCreating(true);
        try {
            const newWorkspace = await createWorkspace({
                name: newWorkspaceName,
                slug: newWorkspaceSlug,
                color: '#3b82f6',
            });

            // Set as current and close modals
            await setCurrentWorkspace(newWorkspace);
            setShowNewWorkspaceModal(false);
            setIsOpen(false);
            setNewWorkspaceName('');
            setNewWorkspaceSlug('');
        } catch (err) {
            console.error('Failed to create workspace:', err);
        } finally {
            setIsCreating(false);
        }
    };

    // Debug logging
    useEffect(() => {
        if (!isLoading && workspaces.length > 0) {
            console.debug('[WorkspaceSelector] Workspaces loaded:', {
                count: workspaces.length,
                current: currentWorkspace?.id,
                workspaces: workspaces.map(w => ({
                    id: w.id,
                    name: w.name,
                    slug: w.slug,
                    color: w.color,
                })),
            });
        }
    }, [isLoading, workspaces, currentWorkspace]);

    if (isLoading || !currentWorkspace) {
        return (
            <div style={{
                width: isCollapsed ? '36px' : '200px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {isLoading ? (
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        borderTop: '2px solid rgba(255, 255, 255, 0.8)',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                ) : null}
            </div>
        );
    }

    // Add spinner animation
    const spinnerStyle = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;

    // Collapsed state - show only icon
    if (isCollapsed) {
        return (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
                <style>{spinnerStyle}</style>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={isLoading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        padding: 0,
                    }}
                    title={currentWorkspace.name}
                >
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        background: currentWorkspace.color || '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        overflow: 'hidden',
                        flexShrink: 0,
                    }}>
                        {currentWorkspace.avatar && currentWorkspace.avatar.startsWith('data:') ? (
                            <img src={currentWorkspace.avatar} alt={currentWorkspace.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>
                                {currentWorkspace.avatar || currentWorkspace.name?.[0]?.toUpperCase() || 'W'}
                            </span>
                        )}
                    </div>
                </button>

                {isOpen && (
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        minWidth: '240px',
                        background: '#141418',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                        zIndex: 1000,
                        overflow: 'hidden',
                    }}>
                        <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{
                                    position: 'absolute',
                                    left: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#666',
                                }} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px 8px 32px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '6px' }}>
                            {filteredWorkspaces.map((workspace) => (
                                <button
                                    key={workspace.id}
                                    onClick={() => handleWorkspaceChange(workspace)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        background: workspace.id === currentWorkspace.id
                                            ? 'rgba(59, 130, 246, 0.15)'
                                            : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '4px',
                                        background: workspace.color || '#3b82f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                    }}>
                                        {workspace.avatar && workspace.avatar.startsWith('data:') ? (
                                            <img src={workspace.avatar} alt={workspace.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ color: '#fff', fontWeight: 'bold' }}>
                                                {workspace.avatar || workspace.name?.[0]?.toUpperCase() || 'W'}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{
                                        flex: 1,
                                        fontSize: '13px',
                                        color: workspace.id === currentWorkspace.id ? '#60a5fa' : '#e5e7eb',
                                        fontWeight: workspace.id === currentWorkspace.id ? 500 : 400,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {workspace.name ?? 'Unnamed Workspace'}
                                    </span>
                                    {workspace.id === currentWorkspace.id && (
                                        <Check size={14} style={{ color: '#3b82f6' }} />
                                    )}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    setShowNewWorkspaceModal(true);
                                    setIsOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    marginTop: '4px',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                    paddingTop: '10px',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <Plus size={16} style={{ color: '#3b82f6' }} />
                                <span style={{ fontSize: '13px', color: '#3b82f6' }}>
                                    New Workspace
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <style>{spinnerStyle}</style>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    color: '#e5e7eb',
                    fontSize: '13px',
                    width: '100%',
                    maxWidth: '240px',
                    justifyContent: 'flex-start',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: currentWorkspace.color || '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}>
                    {currentWorkspace.avatar && currentWorkspace.avatar.startsWith('data:') ? (
                        <img src={currentWorkspace.avatar} alt={currentWorkspace.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ color: '#fff', fontWeight: 'bold' }}>
                            {currentWorkspace.avatar || currentWorkspace.name?.[0]?.toUpperCase() || 'W'}
                        </span>
                    )}
                </div>
                <span style={{
                    flex: 1,
                    textAlign: 'left',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                }}>
                    {currentWorkspace.name ?? 'Unnamed Workspace'}
                </span>
                <ChevronDown size={14} style={{ color: '#888' }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    minWidth: '240px',
                    background: '#141418',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    overflow: 'hidden',
                }}>
                    <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#666',
                            }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px 8px 32px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '6px' }}>
                        {filteredWorkspaces.map((workspace) => (
                            <button
                                key={workspace.id}
                                onClick={() => handleWorkspaceChange(workspace)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    background: workspace.id === currentWorkspace.id
                                        ? 'rgba(59, 130, 246, 0.15)'
                                        : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    background: workspace.color || '#3b82f6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                }}>
                                    {workspace.avatar && workspace.avatar.startsWith('data:') ? (
                                        <img src={workspace.avatar} alt={workspace.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ color: '#fff', fontWeight: 'bold' }}>
                                            {workspace.avatar || workspace.name?.[0]?.toUpperCase() || 'W'}
                                        </span>
                                    )}
                                </div>
                                <span style={{
                                    flex: 1,
                                    fontSize: '13px',
                                    color: workspace.id === currentWorkspace.id ? '#60a5fa' : '#e5e7eb',
                                    fontWeight: workspace.id === currentWorkspace.id ? 500 : 400,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {workspace.name ?? 'Unnamed Workspace'}
                                </span>
                                {workspace.id === currentWorkspace.id && (
                                    <Check size={14} style={{ color: '#3b82f6' }} />
                                )}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setShowNewWorkspaceModal(true);
                                setIsOpen(false);
                            }}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                marginTop: '4px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                paddingTop: '10px',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <Plus size={16} style={{ color: '#3b82f6' }} />
                            <span style={{ fontSize: '13px', color: '#3b82f6' }}>
                                New Workspace
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* New Workspace Modal */}
            {showNewWorkspaceModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                    }}
                    onClick={() => setShowNewWorkspaceModal(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        style={{
                            background: '#141418',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '28px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2
                            style={{
                                margin: '0 0 24px 0',
                                fontSize: '18px',
                                fontWeight: 600,
                                color: '#fff',
                                textAlign: 'center',
                            }}
                        >
                            Create New Workspace
                        </h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label
                                htmlFor="workspace-name"
                                style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#ddd',
                                    marginBottom: '8px',
                                }}
                            >
                                Workspace Name
                            </label>
                            <input
                                id="workspace-name"
                                type="text"
                                value={newWorkspaceName}
                                onChange={handleNameChange}
                                placeholder="My Awesome Workspace"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label
                                htmlFor="workspace-slug"
                                style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#ddd',
                                    marginBottom: '8px',
                                }}
                            >
                                Workspace Slug
                            </label>
                            <input
                                id="workspace-slug"
                                type="text"
                                value={newWorkspaceSlug}
                                onChange={(e) => setNewWorkspaceSlug(e.target.value)}
                                placeholder="my-awesome-workspace"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '6px',
                                    color: '#999',
                                    fontSize: '13px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                }}
                            />
                            <p
                                style={{
                                    fontSize: '12px',
                                    color: '#666',
                                    margin: '6px 0 0 0',
                                }}
                            >
                                Auto-generated from workspace name
                            </p>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                gap: '12px',
                            }}
                        >
                            <button
                                onClick={() => {
                                    setShowNewWorkspaceModal(false);
                                    setNewWorkspaceName('');
                                    setNewWorkspaceSlug('');
                                }}
                                disabled={isCreating}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '6px',
                                    color: '#ddd',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isCreating) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateWorkspace}
                                disabled={isCreating || !newWorkspaceName.trim()}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    background: newWorkspaceName.trim() ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: newWorkspaceName.trim() && !isCreating ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (newWorkspaceName.trim() && !isCreating) {
                                        e.currentTarget.style.background = '#2563eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (newWorkspaceName.trim() && !isCreating) {
                                        e.currentTarget.style.background = '#3b82f6';
                                    }
                                }}
                            >
                                {isCreating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

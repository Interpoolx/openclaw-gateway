import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { SettingsModal } from './SettingsModal';
import {
    LayoutDashboard,
    Settings,
    PanelLeft,
    ChevronRight,
    Bot,
    Target,
    Zap,
    Palette,
    Calendar,
    FileText,
    Folder,
    LogOut,
    MoreVertical,
    LayoutGrid,
    Wrench,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { WorkspaceSelector } from './WorkspaceSelector';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

interface NavSection {
    title?: string;
    items: NavItem[];
}

interface CollapsibleSidebarProps {
    onClose?: () => void;
}

export function CollapsibleSidebar({ onClose }: CollapsibleSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const userMenuRef = useRef<HTMLDivElement>(null);
    const userButtonRef = useRef<HTMLButtonElement>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { currentWorkspace } = useWorkspace();

    const workspacePrefix = currentWorkspace?.slug ? `/${currentWorkspace.slug}` : '';

    const mainNav: NavSection = useMemo(() => ({
        items: [
            { path: `${workspacePrefix}/dashboard`, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { path: `${workspacePrefix}/projects`, label: 'Projects', icon: <Target size={18} /> },
            { path: `${workspacePrefix}/command-center`, label: 'Command Center', icon: <Folder size={18} /> },
            { path: `${workspacePrefix}/deck`, label: 'ChatDeck', icon: <LayoutGrid size={18} /> },
            { path: '/config-builder', label: 'Config Builder', icon: <Wrench size={18} /> },
        ]
    }), [workspacePrefix]);

    const operationsNav: NavSection = useMemo(() => ({
        title: 'Operations',
        items: [
            { path: `${workspacePrefix}/agents`, label: 'Agents', icon: <Bot size={18} /> },
            { path: `${workspacePrefix}/skills`, label: 'Skills', icon: <Palette size={18} /> },
            { path: `${workspacePrefix}/cron`, label: 'Scheduler', icon: <Calendar size={18} /> },
            { path: `${workspacePrefix}/sessions`, label: 'Sessions', icon: <Zap size={18} /> },
            { path: `${workspacePrefix}/devlogs`, label: 'Devlogs', icon: <FileText size={18} /> },
        ]
    }), [workspacePrefix]);

    const automationNav: NavSection = useMemo(() => ({
        title: 'Automation',
        items: [
            // Channels removed - covered in Settings modal
        ]
    }), [workspacePrefix]);

    const bottomNav: NavSection = useMemo(() => ({
        items: [
            { path: `${workspacePrefix}/settings`, label: 'Settings', icon: <Settings size={18} /> },
        ]
    }), [workspacePrefix]);

    const isActive = (path: string) => {
        if (path === `${workspacePrefix}/dashboard`) {
            return location.pathname === `${workspacePrefix}/dashboard`;
        }
        return location.pathname.startsWith(path);
    };

    // Close user menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node) &&
                userButtonRef.current && !userButtonRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update menu position when showing
    useEffect(() => {
        if (showUserMenu && userButtonRef.current) {
            const rect = userButtonRef.current.getBoundingClientRect();
            const menuHeight = 110; // approximate height of menu with 2 items
            
            // Position above the button with minimal gap
            let top = rect.top - menuHeight - 4; // 4px gap above button

            // Check if menu would go off top of screen
            if (top < 20) {
                top = rect.bottom + 4; // Position below if too high
            }

            setMenuPosition({
                top: Math.max(20, top),
                left: Math.max(20, rect.right + 12),
            });
        }
    }, [showUserMenu]);

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        navigate({ to: '/' });
    };

    const handleSettings = () => {
        setShowUserMenu(false);
        setShowSettingsModal(true);
        // Settings modal will handle slug-based navigation on save
    };

    return (
        <>
            <style>{`
                @keyframes fadeInMenu {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
            <aside
                className="sidebar"
                style={{
                    width: isCollapsed ? '64px' : '240px',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    transition: 'width 200ms ease',
                    position: 'relative',
                }}
            >
                {/* Logo / Brand */}
                <div
                    style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--color-border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'space-between',
                        height: '64px',
                    }}
                >
                    <Link
                        to="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textDecoration: 'none',
                            color: 'var(--color-text-primary)',
                            fontWeight: 600,
                            fontSize: '1rem',
                            overflow: 'hidden',
                        }}
                    >
                        <span style={{ fontSize: '1.25rem' }}>🦀</span>
                        {!isCollapsed && <span>Clawpute</span>}
                    </Link>

                    {!isCollapsed && (
                        <button
                            onClick={() => setIsCollapsed(true)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-tertiary)',
                                cursor: 'pointer',
                                padding: '0.375rem',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--color-hover-bg)';
                                e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--color-text-tertiary)';
                            }}
                            aria-label="Collapse sidebar"
                        >
                            <PanelLeft size={18} />
                        </button>
                    )}
                </div>

                {/* Workspace Selector */}
                <div style={{ padding: isCollapsed ? '0.5rem' : '0.75rem 1rem', borderBottom: '1px solid var(--color-border-primary)', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                    <WorkspaceSelector isCollapsed={isCollapsed} />
                </div>

                {/* Current Workspace Name */}
                {/* {!isCollapsed && currentWorkspace && (
                <div style={{
                    padding: '0.5rem 1rem',
                    borderBottom: '1px solid var(--color-border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: currentWorkspace.color || '#3b82f6',
                    }} />
                    <span style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {currentWorkspace.name}
                    </span>
                </div>
            )} */}

                {/* Collapsed toggle button */}
                {isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        style={{
                            position: 'absolute',
                            right: '-6px',
                            top: '20px',
                            width: '28px',
                            height: '28px',
                            background: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border-primary)',
                            borderRadius: '50%',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                            zIndex: 100,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-hover-bg)';
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        aria-label="Expand sidebar"
                        title="Expand sidebar"
                    >
                        <ChevronRight size={16} />
                    </button>
                )}

                {/* Main Navigation */}
                <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
                    {/* Primary Nav */}
                    <div style={{ marginBottom: '1rem' }}>
                        {mainNav.items.map((item) => (
                            <NavLink
                                key={item.path}
                                item={item}
                                isActive={isActive(item.path)}
                                isCollapsed={isCollapsed}
                                onClose={onClose}
                            />
                        ))}
                    </div>

                    {/* Operations Section */}
                    {!isCollapsed && (
                        <div style={{ marginBottom: '1rem' }}>
                            <div
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: 'var(--color-text-tertiary)',
                                }}
                            >
                                {operationsNav.title}
                            </div>
                            {operationsNav.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    item={item}
                                    isActive={isActive(item.path)}
                                    isCollapsed={isCollapsed}
                                    onClose={onClose}
                                />
                            ))}
                        </div>
                    )}

                    {isCollapsed && (
                        <div style={{ marginBottom: '1rem' }}>
                            {operationsNav.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    item={item}
                                    isActive={isActive(item.path)}
                                    isCollapsed={isCollapsed}
                                    onClose={onClose}
                                />
                            ))}
                        </div>
                    )}

                    {/* Automation Section */}
                    {!isCollapsed && (
                        <div style={{ display:'none', marginBottom: '1rem' }}>
                            <div
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: 'var(--color-text-tertiary)',
                                }}
                            >
                                {automationNav.title}
                            </div>
                            {automationNav.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    item={item}
                                    isActive={isActive(item.path)}
                                    isCollapsed={isCollapsed}
                                    onClose={onClose}
                                />
                            ))}
                        </div>
                    )}

                    {isCollapsed && (
                        <div style={{ marginBottom: '1rem' }}>
                            {automationNav.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    item={item}
                                    isActive={isActive(item.path)}
                                    isCollapsed={isCollapsed}
                                    onClose={onClose}
                                />
                            ))}
                        </div>
                    )}
                </nav>

                {/* Bottom Navigation */}
                <div
                    style={{
                        borderTop: '1px solid var(--color-border-primary)',
                    }}
                >
                    {bottomNav.items.map((item) => (
                        <button
                            key={item.path}
                            onClick={handleSettings}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: isCollapsed ? '0.625rem' : '0.625rem 0.875rem',
                                margin: '0.125rem 0.5rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'none',
                                transition: 'all var(--transition-fast)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                justifyContent: isCollapsed ? 'center' : 'flex-start',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--color-hover-bg)';
                                e.currentTarget.style.color = 'var(--color-text-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--color-text-secondary)';
                            }}
                        >
                            <span style={{ flexShrink: 0 }}>{item.icon}</span>
                            {!isCollapsed && <span>{item.label}</span>}
                        </button>
                    ))}

                    {/* User Profile */}
                    {user && (
                        <div ref={userMenuRef}>
                            <button
                                ref={userButtonRef}
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                style={{
                                    width: 'calc(100% - 1rem)',
                                    margin: '0.5rem',
                                    marginBottom: 0,
                                    padding: isCollapsed ? '0.5rem' : '0.625rem',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'inherit',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--color-hover-bg)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!showUserMenu) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <img
                                    src={
                                        user.avatar ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`
                                    }
                                    alt={user.name}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        flexShrink: 0,
                                    }}
                                />
                                {!isCollapsed && (
                                    <>
                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textAlign: 'left' }}>
                                            <div
                                                style={{
                                                    fontSize: 'var(--font-size-sm)',
                                                    fontWeight: 500,
                                                    color: 'var(--color-text-primary)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {user.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-text-tertiary)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {user.email}
                                            </div>
                                        </div>
                                        <MoreVertical size={16} style={{ flexShrink: 0, color: 'var(--color-text-tertiary)' }} />
                                    </>
                                )}
                            </button>

                            {/* User Dropdown Menu */}
                            {showUserMenu && !isCollapsed && (
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: `${menuPosition.top}px`,
                                        left: `${menuPosition.left}px`,
                                        background: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                                        zIndex: 10000,
                                        minWidth: '200px',
                                        overflow: 'hidden',
                                        maxWidth: 'calc(100vw - 40px)',
                                        animation: 'fadeInMenu 0.15s ease-out',
                                    }}
                                >
                                    <button
                                        onClick={handleSettings}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-secondary)',
                                            transition: 'all var(--transition-fast)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            borderBottom: '1px solid var(--color-border-primary)',
                                            whiteSpace: 'nowrap',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--color-hover-bg)';
                                            e.currentTarget.style.color = 'var(--color-text-primary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                                        }}
                                    >
                                        <Settings size={16} />
                                        Settings
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-secondary)',
                                            transition: 'all var(--transition-fast)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            whiteSpace: 'nowrap',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--color-hover-bg)';
                                            e.currentTarget.style.color = '#ff4444';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                                        }}
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
            />
        </>
    );
}

interface NavLinkProps {
    item: NavItem;
    isActive: boolean;
    isCollapsed: boolean;
    onClose?: () => void;
}

function NavLink({ item, isActive, isCollapsed, onClose }: NavLinkProps) {
    return (
        <Link
            to={item.path}
            onClick={onClose}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: isCollapsed ? '0.625rem' : '0.625rem 0.875rem',
                margin: '0.125rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'var(--color-active-bg)' : 'transparent',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-hover-bg)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
            }}
        >
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
        </Link>
    );
}

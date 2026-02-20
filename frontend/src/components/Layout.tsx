import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
// import { checkOpenClawConnection } from '../lib/api';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { CommandPalette } from './CommandPalette';
import { useNavigationShortcuts } from '../hooks/useKeyboardShortcuts';

export function Header() {
    return (
        <></>
    );
}

interface LayoutProps {
    readonly children: React.ReactNode;
    readonly hideSidebar?: boolean;
}

export function Layout({ children, hideSidebar = false }: LayoutProps) {
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
    const navigate = useNavigate();

    useNavigationShortcuts(
        () => setIsCommandPaletteOpen(true),
        () => navigate({ to: '/command-center', search: { action: 'create-task' } }),
        () => navigate({ to: '/projects', search: { action: 'create' } }),
        () => navigate({ to: '/agents', search: { action: 'create' } })
    );

    return (
        <div className="flex flex-col h-screen bg-[var(--color-bg-primary)]">
            <div className="flex flex-1 overflow-hidden relative">
                {!hideSidebar && (
                    <>
                        {/* Desktop Sidebar - visible on md and above */}
                        <div className="desktop-sidebar-wrapper flex-shrink-0">
                            <CollapsibleSidebar />
                        </div>

                        {/* Mobile Sidebar - visible on mobile only */}
                        <>
                            {/* Overlay */}
                            <div
                                className={`mobile-sidebar-overlay ${isMobileSidebarOpen ? 'block' : 'none'}`}
                                onClick={() => setIsMobileSidebarOpen(false)}
                            />
                            {/* Sidebar Drawer */}
                            <div
                                className={`mobile-sidebar-drawer transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                            >
                                <CollapsibleSidebar onClose={() => setIsMobileSidebarOpen(false)} />
                            </div>
                        </>

                        {/* Hamburger Button - visible on mobile only */}
                        <button
                            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                            className="hamburger-menu-btn"
                            aria-label={isMobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                        >
                            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </>
                )}
                <div className="flex-1 flex flex-col overflow-hidden w-full">
                    <Header />
                    <main className="flex-1 overflow-y-auto bg-[var(--color-bg-primary)]">
                        {children}
                    </main>
                </div>
            </div>

            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                agents={[]}
            />
        </div>
    );
}

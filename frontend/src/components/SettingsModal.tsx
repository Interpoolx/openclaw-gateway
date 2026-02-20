import { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, Building2, Zap, Palette, Save, Upload, Copy, Users, Link as LinkIcon, AlertTriangle, Trash2, Server, Moon, Sun, Cpu, Shield } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useTheme } from '../contexts/ThemeContext';
import { OpenClawSettingsPanel } from './OpenClawSettingsPanel';
import { CommunicationChannels } from './CommunicationChannels';

// Config-driven workspace settings
const WORKSPACE_CONFIG = {
    maxMembers: 5,
    avatarMaxSize: 5 * 1024 * 1024, // 5MB
    allowedAvatarFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
} as const;

type SettingTab = 'about-me' | 'model-access' | 'workspace' | 'openclaw-gateway' | 'connected-apps' | 'billing' | 'security' | 'appearance';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const settingsTabs = [
    { id: 'about-me' as SettingTab, label: 'Account & Plan', icon: User },
    { id: 'model-access' as SettingTab, label: 'Model Access', icon: Cpu },
    { id: 'connected-apps' as SettingTab, label: 'Integrations', icon: Zap },
    { id: 'openclaw-gateway' as SettingTab, label: 'OpenClaw', icon: Server },
    { id: 'security' as SettingTab, label: 'Security', icon: Shield },
    { id: 'workspace' as SettingTab, label: 'Workspace', icon: Building2 },
    { id: 'billing' as SettingTab, label: 'Billing & Usage', icon: Zap },
    { id: 'appearance' as SettingTab, label: 'Appearance', icon: Palette },
];

interface ConnectionConfig {
    mode: 'local' | 'cloudflare' | 'docker' | 'vps';
    serverUrl: string;
    apiKey: string;
    gatewayToken: string;
    password: string;
    defaultSessionKey: string;
    workerEnabled: boolean;
    workerName: string;
    workerAccountId: string;
    dockerSocket: string;
    vpsHost: string;
    vpsPort: number;
    role: 'operator' | 'node';
    heartbeatIntervalMinutes: number;
}

const defaultConnectionConfig: ConnectionConfig = {
    mode: 'local',
    serverUrl: localStorage.getItem('openclaw_server_url') ?? 'http://localhost:18789',
    apiKey: '',
    gatewayToken: localStorage.getItem('openclaw_gateway_token') ?? '728a7307166292b0d62b2a8232f55e4cfa3daacb2991e4f2',
    password: '',
    defaultSessionKey: 'agent:main:main',
    workerEnabled: false,
    workerName: 'openclaw-worker',
    workerAccountId: '',
    dockerSocket: '/var/run/docker.sock',
    vpsHost: '',
    vpsPort: 18789,
    role: 'operator',
    heartbeatIntervalMinutes: Number(localStorage.getItem('openclaw_heartbeat_minutes')) || 30,
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingTab>('about-me');
    const [isSaving, setIsSaving] = useState(false);
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceSlug, setWorkspaceSlug] = useState('');
    const [workspaceAvatar, setWorkspaceAvatar] = useState('');
    const [members, setMembers] = useState<any[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>(defaultConnectionConfig);
    const [openClawStats] = useState<any>(null);
    const [connectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [triggerOpenClawSave, setTriggerOpenClawSave] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [securityLevel, setSecurityLevel] = useState<'maximum' | 'balanced' | 'full-access' | 'custom'>(() => {
        const stored = localStorage.getItem('openclaw_security_level');
        if (stored === 'maximum' || stored === 'balanced' || stored === 'full-access' || stored === 'custom') return stored;
        return 'balanced';
    });
    const [toolProfile, setToolProfile] = useState(() => localStorage.getItem('openclaw_tool_profile') || 'coding');
    const [shellPolicy, setShellPolicy] = useState(() => localStorage.getItem('openclaw_shell_policy') || 'deny');
    const [openCodeZenEnabled, setOpenCodeZenEnabled] = useState(() => (localStorage.getItem('openclaw_opencode_zen') ?? 'true') === 'true');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentWorkspace, currentWorkspaceId, getWorkspaceMembers, deleteWorkspace, updateWorkspace } = useWorkspace();
    const { theme, setTheme } = useTheme();


    // Initialize form values when modal opens (only on open, not on workspace updates)
    const loadMembers = useCallback(async (workspaceId: string) => {
        setIsLoadingMembers(true);
        try {
            const workspaceMembers = await getWorkspaceMembers(workspaceId);
            setMembers(workspaceMembers);
        } catch (err) {
            console.error('Failed to load members:', err);
        } finally {
            setIsLoadingMembers(false);
        }
    }, [getWorkspaceMembers]);

    useEffect(() => {
        if (isOpen && currentWorkspace) {
            setWorkspaceName(currentWorkspace.name);
            setWorkspaceSlug(currentWorkspace.slug);
            setWorkspaceAvatar(currentWorkspace.avatar ?? '');
            loadMembers(currentWorkspace.id);
        }
    }, [isOpen, currentWorkspace?.id]); // Only depend on isOpen and workspace ID, not whole object

    useEffect(() => {
        if (isOpen) {
            setAccountName(user?.name ?? '');
        }
    }, [isOpen, user?.name]);

    useEffect(() => {
        localStorage.setItem('openclaw_security_level', securityLevel);
        localStorage.setItem('openclaw_tool_profile', toolProfile);
        localStorage.setItem('openclaw_shell_policy', shellPolicy);
        localStorage.setItem('openclaw_opencode_zen', String(openCodeZenEnabled));
    }, [securityLevel, toolProfile, shellPolicy, openCodeZenEnabled]);

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError('');

        // Validate file type
        if (!WORKSPACE_CONFIG.allowedAvatarFormats.includes(file.type as any)) {
            setUploadError('Invalid file format. Allowed: JPG, PNG, GIF, WebP');
            return;
        }

        // Validate file size
        if (file.size > WORKSPACE_CONFIG.avatarMaxSize) {
            setUploadError(`File too large. Max size: ${WORKSPACE_CONFIG.avatarMaxSize / 1024 / 1024}MB`);
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setWorkspaceAvatar(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveWorkspace = async () => {
        if (!currentWorkspaceId) return;

        setIsSaving(true);
        try {
            console.debug('[SettingsModal] Saving workspace:', {
                workspaceName,
                workspaceSlug,
                currentSlug: currentWorkspace?.slug,
                hasAvatarChange: workspaceAvatar !== currentWorkspace?.avatar,
            });

            await updateWorkspace(currentWorkspaceId, {
                name: workspaceName,
                slug: workspaceSlug,
                avatar: workspaceAvatar,
            });

            toast.success('Workspace settings saved!');

            // If slug changed, navigate to new URL
            if (workspaceSlug !== currentWorkspace?.slug) {
                console.debug('[SettingsModal] Slug changed, navigating:', workspaceSlug);
                navigate({
                    to: '/$workspaceSlug/settings',
                    params: { workspaceSlug: workspaceSlug },
                    replace: true,
                });
            } else {
                console.debug('[SettingsModal] Slug unchanged, staying on page');
            }
        } catch (error) {
            console.error('Error saving workspace:', error);
            toast.error('Failed to save workspace settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteWorkspace = async () => {
        if (deleteConfirmText !== currentWorkspace?.name) return;

        setIsDeleting(true);
        try {
            await deleteWorkspace(currentWorkspace?.id ?? '');
            onClose();
            toast.success('Workspace deleted successfully');
        } catch (err) {
            console.error('Failed to delete workspace:', err);
            toast.error('Failed to delete workspace');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveAccount = async () => {
        setIsSaving(true);
        try {
            localStorage.setItem('profile_display_name', accountName.trim() || (user?.name ?? ''));
            toast.success('Account settings saved');
        } catch (error) {
            console.error('Error saving account settings:', error);
            toast.error('Failed to save account settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="fixed inset-0 bg-black/85 z-[9998] backdrop-blur-[4px]"
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-bg-primary)] rounded-[var(--radius-lg)] shadow-[0_20px_60px_rgba(0,0,0,0.3)] z-[9999] w-[90vw] max-w-[1000px] max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-8 pb-6 border-b border-zinc-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-zinc-500 text-sm">
                        <span>Settings</span>
                        <span>›</span>
                        <span className="text-zinc-100 font-medium">
                            {settingsTabs.find(t => t.id === activeTab)?.label}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-transparent border-none cursor-pointer text-zinc-400 p-1 flex items-center justify-center transition-colors duration-200 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>
                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-52 border-r border-zinc-800/50 py-4 overflow-y-auto">
                        {settingsTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full px-5 py-3.5 border-none cursor-pointer text-left text-sm flex items-center gap-3 transition-all duration-200 border-l-[3px] ${isActive
                                        ? 'bg-zinc-800/40 text-white border-blue-500 font-medium'
                                        : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/20'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-8 pb-12 [scrollbar-gutter:stable]">
                                                {activeTab === 'about-me' && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-base font-semibold text-zinc-100">Account Information</h3>
                                    <p className="text-xs text-zinc-500 mt-1">Manage your identity details.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Name</p>
                                        <input
                                            type="text"
                                            value={accountName}
                                            onChange={(e) => setAccountName(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                    </div>
                                    <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Email</p>
                                        <input
                                            type="email"
                                            value={user?.email || 'responsecenter247@gmail.com'}
                                            readOnly
                                            className="w-full px-3 py-2 bg-zinc-800/40 border border-zinc-800 rounded-md text-zinc-400 text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Account Plan</p>
                                    <p className="text-sm text-zinc-300">Plan and upgrade options are under Billing & Usage.</p>
                                </div>
                            </div>
                        )}
                        {activeTab === 'model-access' && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">Model Access</h3>
                                    <p className="text-sm text-zinc-500 mt-1">
                                        Configure community models and choose your model credential path.
                                    </p>
                                </div>

                                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
                                    <p className="text-base font-semibold text-amber-300">Your Free plan includes community models.</p>
                                    <p className="text-sm text-amber-200 mt-1">
                                        Upgrade to Pro to unlock provider keys and Codex connection.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4">
                                        <p className="text-sm font-semibold text-zinc-100 mb-2">Community Models</p>
                                        <p className="text-xs text-zinc-500 mb-4">No personal API key required. Available on every plan.</p>
                                        <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-3">
                                            <p className="text-zinc-100 font-semibold">OpenCode Zen {openCodeZenEnabled ? 'enabled' : 'disabled'}</p>
                                            <p className="text-xs text-orange-200 mt-1">Conversations may be used for training.</p>
                                            <button
                                                onClick={() => setOpenCodeZenEnabled((prev) => !prev)}
                                                className="text-sm mt-2 font-semibold text-orange-300 hover:text-orange-200 transition-colors"
                                            >
                                                {openCodeZenEnabled ? 'Disable' : 'Enable'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Option A</p>
                                        <p className="text-xl font-semibold text-zinc-100 mb-2">Model Provider Keys (BYOK)</p>
                                        <p className="text-sm text-zinc-500 mb-4">Add Anthropic, OpenAI, or Google keys for paid models.</p>
                                        <div className="rounded-md border border-zinc-700 bg-zinc-800/70 p-3">
                                            <p className="text-zinc-200 mb-3">Model provider keys are locked on the Free plan.</p>
                                            <button className="px-3 py-2 rounded-md bg-emerald-400 text-black text-sm font-semibold hover:bg-emerald-300 transition-colors">
                                                Upgrade to Pro
                                            </button>
                                        </div>
                                    </div>
                                    <div className="rounded-md border border-zinc-800 bg-zinc-900/70 p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Option B</p>
                                        <p className="text-xl font-semibold text-zinc-100 mb-2">Codex Connection</p>
                                        <p className="text-sm text-zinc-500 mb-4">Alternative to BYOK: use your ChatGPT account for model access.</p>
                                        <div className="rounded-md border border-zinc-700 bg-zinc-800/70 p-3">
                                            <p className="text-zinc-200 mb-3">Codex connection is locked on the Free plan.</p>
                                            <button className="px-3 py-2 rounded-md bg-emerald-400 text-black text-sm font-semibold hover:bg-emerald-300 transition-colors">
                                                Upgrade to Pro
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-3">Saved Model Provider Keys</p>
                                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 py-6 text-center text-zinc-500">
                                        No model provider keys added yet.
                                    </div>
                                </div>

                                <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-lg font-semibold text-zinc-100">Default Model</p>
                                        <span className="px-2 py-0.5 text-[11px] rounded bg-emerald-500/20 text-emerald-300 font-semibold">Auto-selected</span>
                                    </div>
                                    <p className="text-sm text-zinc-500 mb-3">
                                        The system automatically picks the best model based on your selected path.
                                    </p>
                                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                                        <p className="text-zinc-200">Anthropic -&gt; Claude Sonnet 4.5</p>
                                        <p className="text-zinc-200">OpenAI -&gt; GPT-5.1 Codex Mini</p>
                                        <p className="text-zinc-200">Google -&gt; Gemini 3 Flash Preview</p>
                                        <p className="text-zinc-200">Free -&gt; Kimi K2.5 Free</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'workspace' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-6 text-zinc-100">
                                    Workspace Settings
                                </h3>

                                {/* Workspace Logo */}
                                <div className="mb-8">
                                    <h4 className="text-sm font-semibold mb-4 text-zinc-100">
                                        Workspace Logo
                                    </h4>
                                    <div className="flex items-start gap-6">
                                        <div
                                            className="w-20 h-20 rounded-lg flex items-center justify-center text-[32px] text-white overflow-hidden flex-shrink-0"
                                            style={{ background: currentWorkspace?.color || '#3b82f6' }}
                                        >
                                            {workspaceAvatar ? (
                                                <img
                                                    src={workspaceAvatar}
                                                    alt="workspace"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                currentWorkspace?.avatar || workspaceSlug[0]?.toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex gap-2 mb-2">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-4 py-3 bg-blue-600 rounded-md cursor-pointer text-white text-sm font-medium transition-colors hover:bg-blue-500"
                                                >
                                                    <Upload size={16} />
                                                    Upload Logo
                                                </button>
                                                {workspaceAvatar && (
                                                    <button
                                                        onClick={() => setWorkspaceAvatar('')}
                                                        className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-md cursor-pointer text-red-500 text-sm font-medium transition-colors hover:bg-red-500/20"
                                                    >
                                                        <Trash2 size={16} />
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                className="hidden"
                                            />
                                            <p className="text-xs text-zinc-500 m-0">
                                                JPG, PNG, GIF, or WebP. Max 5MB.
                                            </p>
                                            {uploadError && (
                                                <p className="text-xs text-red-500 mt-1 mb-0">
                                                    {uploadError}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Workspace Name */}
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold mb-2 text-zinc-100">
                                        Workspace Name
                                    </label>
                                    <input
                                        type="text"
                                        value={workspaceName}
                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                        className="w-full max-w-[400px] p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>

                                {/* Workspace Slug */}
                                <div className="mb-8">
                                    <label className="block text-sm font-semibold mb-2 text-zinc-100">
                                        Workspace Slug
                                    </label>
                                    <div className="flex items-center gap-2 max-w-[400px]">
                                        <span className="text-zinc-500 text-sm">/</span>
                                        <input
                                            type="text"
                                            value={workspaceSlug}
                                            onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="workspace-name"
                                            className="flex-1 p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                        <span className="text-zinc-500 text-sm">/dashboard</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2">
                                        URL-friendly name. Only lowercase letters, numbers, and hyphens.
                                    </p>
                                </div>

                                {/* Invite Link */}
                                <div className="mb-8">
                                    <h4 className="text-sm font-semibold mb-3 text-zinc-100 flex items-center gap-2">
                                        <LinkIcon size={16} />
                                        Invite Link
                                    </h4>
                                    <div className="flex gap-2 max-w-[400px]">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${window.location.origin}/invite/${workspaceSlug}`}
                                            className="flex-1 p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-500 text-sm cursor-default"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/invite/${workspaceSlug}`);
                                                toast.success('Invite link copied!');
                                            }}
                                            className="px-4 py-3 bg-blue-600 rounded-md cursor-pointer text-white flex items-center justify-center gap-2 transition-colors hover:bg-blue-500"
                                            title="Copy invite link"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Members */}
                                <div className="mb-8">
                                    <h4 className="text-sm font-semibold mb-4 text-zinc-100 flex items-center gap-2">
                                        <Users size={16} />
                                        Members ({Array.isArray(members) ? members.length : 0} / {WORKSPACE_CONFIG.maxMembers})
                                    </h4>
                                    <p className="text-xs text-zinc-500 mb-4">
                                        Collaborate with up to {WORKSPACE_CONFIG.maxMembers} team members
                                    </p>
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="email"
                                            placeholder="Enter email to invite..."
                                            className="flex-1 max-w-[400px] p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-sm outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                        <button className="px-4 py-3 bg-blue-600 rounded-md text-white cursor-pointer text-sm font-medium transition-colors hover:bg-blue-500">
                                            Invite
                                        </button>
                                    </div>
                                    {isLoadingMembers ? (
                                        <p className="text-xs text-zinc-500">
                                            Loading members...
                                        </p>
                                    ) : !Array.isArray(members) || members.length === 0 ? (
                                        <p className="text-xs text-zinc-500">
                                            No members yet. Invite team members to collaborate.
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {members.map((m) => (
                                                <div
                                                    key={m?.member?.userId || Math.random()}
                                                    className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-md text-xs"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                                        {m?.user?.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-zinc-100">
                                                            {m?.user?.name || 'Unknown User'}
                                                        </div>
                                                        <div className="text-zinc-500">
                                                            {m?.member?.role || 'Member'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Danger Zone */}
                                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-[var(--radius-md)]">
                                    <h4 className="text-[var(--font-size-sm)] font-semibold mb-4 text-[#ff4444] flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        Danger Zone
                                    </h4>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="flex items-center gap-2 px-4 py-3 bg-[#ff4444] border-none rounded-[var(--radius-md)] cursor-pointer text-white text-[var(--font-size-sm)] font-medium transition-opacity hover:opacity-90"
                                    >
                                        <Trash2 size={16} />
                                        Delete Workspace
                                    </button>

                                    {/* Delete Confirmation */}
                                    {showDeleteConfirm && (
                                        <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] border border-[var(--color-border-primary)]">
                                            <p className="text-[var(--font-size-xs)] mb-3 text-[var(--color-text-secondary)]">
                                                This action cannot be undone. Type <strong>{currentWorkspace?.name}</strong> to confirm.
                                            </p>
                                            <input
                                                type="text"
                                                value={deleteConfirmText}
                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                placeholder="Type workspace name"
                                                className="w-full max-w-[400px] p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] text-[var(--font-size-sm)] mb-3 outline-none focus:border-red-500 block"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setShowDeleteConfirm(false);
                                                        setDeleteConfirmText('');
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        maxWidth: '200px',
                                                        padding: '0.75rem 1rem',
                                                        background: 'var(--color-bg-primary)',
                                                        border: '1px solid var(--color-border-primary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        fontSize: 'var(--font-size-sm)',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleDeleteWorkspace}
                                                    disabled={deleteConfirmText !== currentWorkspace?.name || isDeleting}
                                                    style={{
                                                        flex: 1,
                                                        maxWidth: '200px',
                                                        padding: '0.75rem 1rem',
                                                        background: deleteConfirmText === currentWorkspace?.name ? '#ff4444' : 'rgba(255, 68, 68, 0.3)',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: deleteConfirmText === currentWorkspace?.name ? 'pointer' : 'not-allowed',
                                                        color: 'white',
                                                        fontSize: 'var(--font-size-sm)',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'openclaw-gateway' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-6 text-zinc-100">
                                    OpenClaw Gateway
                                </h3>
                                <OpenClawSettingsPanel
                                    connectionConfig={connectionConfig}
                                    onConnectionConfigChange={(config) => {
                                        setConnectionConfig(prev => ({ ...prev, ...config }));
                                        if (config.gatewayToken) {
                                            localStorage.setItem('openclaw_gateway_token', config.gatewayToken);
                                        }
                                        if (config.serverUrl) {
                                            localStorage.setItem('openclaw_server_url', config.serverUrl);
                                        }
                                    }}
                                    openClawStats={openClawStats}
                                    connectionTestResult={connectionTestResult}
                                    triggerSave={triggerOpenClawSave}
                                    onSaveTriggered={() => setTriggerOpenClawSave(false)}
                                />
                            </div>
                        )}

                        {activeTab === 'connected-apps' && (
                            <CommunicationChannels />
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-base font-semibold text-zinc-100">Billing & Usage</h3>
                                    <p className="text-xs text-zinc-500 mt-1">Track usage and manage your subscription.</p>
                                </div>

                                <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                                    <p className="text-sm font-semibold text-zinc-100 mb-3">Current Plan</p>
                                    <div className="inline-flex items-center rounded-md px-2 py-1 bg-emerald-500/15 text-emerald-300 text-xs font-semibold">Free</div>
                                    <p className="text-xs text-zinc-400 mt-3">OpenCode Zen free models. No API key needed.</p>
                                </div>

                                <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                                    <p className="text-sm font-semibold text-zinc-100 mb-3">Today's Usage</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Messages</p>
                                            <p className="text-sm font-medium text-zinc-200 mt-1">0</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Resources</p>
                                            <p className="text-sm font-medium text-zinc-200 mt-1">1 vCPU / 1 GB RAM</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Storage</p>
                                            <p className="text-sm font-medium text-zinc-200 mt-1">2 GB</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-zinc-100 mb-3">Plans</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-semibold text-zinc-100">Free</p>
                                                <p className="text-sm font-semibold text-zinc-200">$0<span className="text-zinc-500 text-xs">/forever</span></p>
                                            </div>
                                            <p className="text-xs text-zinc-400 mb-3">OpenCode Zen free models. No API key needed.</p>
                                            <ul className="text-xs text-zinc-200 space-y-1 mb-3">
                                                <li>+ 1 vCPU, 1 GB RAM</li>
                                                <li>+ 2 GB storage</li>
                                                <li>+ 30-min idle hibernation</li>
                                                <li>+ OpenCode Zen models only</li>
                                            </ul>
                                            <button className="w-full rounded-md py-2 bg-emerald-500/20 text-emerald-300 text-xs font-semibold cursor-default">
                                                Current Plan
                                            </button>
                                        </div>

                                        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-semibold text-zinc-100">Pro</p>
                                                <p className="text-sm font-semibold text-zinc-200">$25<span className="text-zinc-500 text-xs">/month</span></p>
                                            </div>
                                            <p className="text-xs text-zinc-400 mb-3">More power for serious builders. BYOK optional.</p>
                                            <ul className="text-xs text-zinc-200 space-y-1 mb-3">
                                                <li>+ 4 vCPU, 8 GB RAM</li>
                                                <li>+ 10 GB storage</li>
                                                <li>+ No hibernation</li>
                                                <li>+ All models (BYOK + community)</li>
                                            </ul>
                                            <button className="w-full rounded-md py-2 bg-emerald-400 text-black text-xs font-semibold hover:bg-emerald-300 transition-colors">
                                                Upgrade to Pro
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">Security Level</h3>
                                    <p className="text-sm text-zinc-500 mt-1">
                                        Control sandbox isolation, network access, and tool permissions for your OpenClaw instance.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { id: 'maximum', title: 'Maximum', desc: 'Full sandbox isolation. No network access, no elevated tools.', badge: 'Untrusted code review' },
                                        { id: 'balanced', title: 'Balanced', desc: 'Sandbox isolation with workspace and web access.', badge: 'Recommended' },
                                        { id: 'full-access', title: 'Full Access', desc: 'Full network and workspace access. All tools can reach network.', badge: 'Trusted development' },
                                        { id: 'custom', title: 'Custom', desc: 'Choose which tools get elevated permissions.', badge: 'Advanced' },
                                    ].map((level) => {
                                        const selected = securityLevel === level.id;
                                        return (
                                            <button
                                                key={level.id}
                                                onClick={() => setSecurityLevel(level.id as 'maximum' | 'balanced' | 'full-access' | 'custom')}
                                                className={`text-left rounded-md border p-4 transition-colors ${selected
                                                    ? 'border-emerald-500/50 bg-emerald-500/10'
                                                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <p className="text-xl font-semibold text-zinc-100">{level.title}</p>
                                                    {selected && <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">Active</span>}
                                                </div>
                                                <p className="text-sm text-zinc-400 mb-3">{level.desc}</p>
                                                <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">{level.badge}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
                                    <div>
                                        <h4 className="text-xl font-semibold text-zinc-100">OpenClaw Core Security</h4>
                                        <p className="text-sm text-zinc-500 mt-1">Configure which tools are available and whether shell commands are allowed.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-zinc-100">Tool Profile</label>
                                        <select
                                            value={toolProfile}
                                            onChange={(e) => setToolProfile(e.target.value)}
                                            className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-zinc-100 text-sm outline-none focus:border-emerald-500/50 transition-colors"
                                        >
                                            <option value="coding">Coding - File system, runtime, memory (recommended)</option>
                                            <option value="messaging">Messaging - Sessions and communication only</option>
                                            <option value="potato">Potato - Session status only</option>
                                            <option value="full">Full - All tools enabled</option>
                                        </select>
                                        <p className="text-xs text-zinc-500 mt-1">Balanced: file system access with controlled runtime tools.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-zinc-100">Shell Command Execution</label>
                                        <select
                                            value={shellPolicy}
                                            onChange={(e) => setShellPolicy(e.target.value)}
                                            className="w-full p-3 bg-zinc-900 border border-violet-500/50 rounded-md text-zinc-100 text-sm outline-none focus:border-violet-400 transition-colors"
                                        >
                                            <option value="deny">Deny - Block all shell commands (recommended)</option>
                                            <option value="prompt">Prompt - Ask before each command</option>
                                            <option value="allow">Allow - Permit shell commands</option>
                                        </select>
                                        <p className="text-xs text-zinc-500 mt-1">Most secure: shell command execution blocked.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-6 text-zinc-100">
                                    Appearance
                                </h3>

                                {/* Theme Selection */}
                                <div className="flex flex-col gap-4">
                                    <h4 className="text-sm font-semibold text-zinc-100">
                                        Theme
                                    </h4>
                                    <div className="flex gap-4">
                                        {/* Dark Theme */}
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={`flex-1 p-4 rounded-md border-2 cursor-pointer text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 text-sm ${theme === 'dark'
                                                ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 font-medium hover:border-blue-500/50 hover:text-zinc-100'
                                                }`}
                                        >
                                            <Moon size={20} />
                                            Dark
                                        </button>

                                        {/* Light Theme */}
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={`flex-1 p-4 rounded-md border-2 cursor-pointer text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 text-sm ${theme === 'light'
                                                ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 font-medium hover:border-blue-500/50 hover:text-zinc-100'
                                                }`}
                                        >
                                            <Sun size={20} />
                                            Light
                                        </button>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        Choose your preferred theme. Changes are applied immediately.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer with Save Button */}
                <div className="p-6 border-t border-zinc-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-transparent border border-zinc-800 rounded-md text-zinc-400 cursor-pointer text-sm font-medium transition-all duration-200 hover:border-zinc-600 hover:text-zinc-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (activeTab === 'about-me') {
                                handleSaveAccount();
                            } else if (activeTab === 'workspace') {
                                handleSaveWorkspace();
                            } else if (activeTab === 'openclaw-gateway') {
                                setTriggerOpenClawSave(true);
                            } else if (activeTab === 'security' || activeTab === 'model-access') {
                                toast.success('Settings saved locally');
                            }
                        }}
                        disabled={isSaving || (activeTab !== 'about-me' && activeTab !== 'workspace' && activeTab !== 'openclaw-gateway' && activeTab !== 'security' && activeTab !== 'model-access')}
                        className={`px-6 py-3 border-none rounded-md text-white cursor-pointer text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${(activeTab === 'about-me' || activeTab === 'workspace' || activeTab === 'openclaw-gateway' || activeTab === 'security' || activeTab === 'model-access') && !isSaving
                            ? 'bg-blue-600 hover:bg-blue-500 opacity-100'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                    >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </>
    );
}

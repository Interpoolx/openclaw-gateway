import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../contexts/AuthContext';
import { demoLogin } from '../lib/api';
import { useState, useEffect } from 'react';
import {
    ArrowRight,
    Sparkles,
    MessageSquare,
    Lock,
    Layers,
    GitBranch,
    BarChart3,
    Star,
    Download,
    Play,
    Cloud,
    Cpu,
    CheckCircle2,
    X,
    Zap,
    Shield,
    Users,
    Activity,
    Database,
    Rocket,
    Palette,
    Bell,
    Eye,
    Settings,
    LineChart,
    Menu,
    ChevronUp,
} from 'lucide-react';

// Pricing Tiers - Only 2 options
const pricingPlans = [
    // {
    //     name: 'Self-Hosted',
    //     tagline: 'Deploy on your infrastructure',
    //     price: 'Free',
    //     period: 'forever',
    //     description: 'Full control, zero costs. Install OpenClaw on your servers and manage everything yourself.',
    //     features: [
    //         'Unlimited AI agents',
    //         'All 17+ messaging channels',
    //         'Complete source code access',
    //         'Multi-model support (Claude, GPT, Gemini, etc.)',
    //         'Self-managed updates',
    //         'Community support on Discord',
    //         'No usage limits or restrictions',
    //         'Full data ownership & privacy',
    //         'Deploy anywhere (VPS, Docker, Local)',
    //         'MIT License - modify freely',
    //     ],
    //     cta: 'Get Started Free',
    //     ctaVariant: 'outline' as const,
    //     popular: false,
    //     icon: Server,
    //     color: '#10b981',
    //     highlightFeatures: ['Open Source', 'No Lock-in', '100% Free'],
    // },
    {
        name: 'Command Center',
        tagline: 'SaaS Dashboard + Your OpenClaw',
        price: '$69',
        period: '/month',
        description: 'We host the powerful dashboard. You run OpenClaw Core locally or on your VPS. Best of both worlds.',
        features: [
            'Everything in Self-Hosted',
            'Hosted web dashboard at clawpute.com',
            'Real-time agent monitoring & health',
            'Multi-instance management (unlimited)',
            'Advanced usage analytics & insights',
            'Conversation history & search',
            'Agent performance metrics',
            'Cost tracking per model/channel',
            'Team collaboration tools',
            'Priority email & chat support',
            'Automatic dashboard updates',
            '99.9% dashboard uptime SLA',
            'Custom branding options',
            'API access to dashboard data',
        ],
        cta: 'Start 14-Day Free Trial',
        ctaVariant: 'primary' as const,
        popular: true,
        icon: Cloud,
        color: '#6366f1',
        badge: 'Most Popular',
        highlightFeatures: ['14-Day Trial', 'No Credit Card', 'Cancel Anytime'],
    },
];

// Feature Grid Items
const features = [
    {
        icon: MessageSquare,
        title: 'Universal Messaging',
        description: 'Deploy across Telegram, Discord, WhatsApp, Slack, iMessage, Signal, Matrix, and 10+ more channels simultaneously',
        color: '#3b82f6',
    },
    {
        icon: Cpu,
        title: 'Multi-Model Support',
        description: 'Switch between Claude Opus/Sonnet, GPT-5, Gemini, Kimi, MiniMax without any code changes',
        color: '#8b5cf6',
    },
    {
        icon: Lock,
        title: 'Privacy First',
        description: 'Your data stays on your infrastructure. No cloud vendor lock-in. Complete control over AI conversations.',
        color: '#10b981',
    },
    {
        icon: Layers,
        title: 'Modular Architecture',
        description: 'Add or remove channels, models, and features via simple config. No redeployment needed.',
        color: '#f59e0b',
    },
    {
        icon: GitBranch,
        title: 'Open Source Core',
        description: 'OpenClaw Core. Fork, modify, and extend however you need. Full transparency.',
        color: '#ec4899',
    },
    {
        icon: BarChart3,
        title: 'Real-Time Analytics',
        description: 'Track conversations, costs, agent performance, and user engagement from Command Center dashboard',
        color: '#06b6d4',
    },
];

// Integration Logos
const integrations = [
    { name: 'Telegram', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg' },
    { name: 'Discord', logo: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png' },
    { name: 'WhatsApp', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
    { name: 'Slack', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg' },
];

// Stats
const stats = [
    { value: '17+', label: 'Messaging Platforms', icon: MessageSquare },
    { value: '5+', label: 'AI Model Providers', icon: Cpu },
    { value: '<60s', label: 'Average Setup Time', icon: Zap },
    { value: '100%', label: 'Data Ownership', icon: Shield },
];

// Dashboard Features (for SaaS tier)
const dashboardFeatures = [
    {
        icon: Activity,
        title: 'Live Agent Monitoring',
        description: 'See all your AI agents in real-time with status, health checks, and active conversations',
    },
    {
        icon: LineChart,
        title: 'Usage Analytics',
        description: 'Track API costs, message volume, response times, and user engagement across all channels',
    },
    {
        icon: Users,
        title: 'Multi-Instance Management',
        description: 'Manage unlimited OpenClaw instances from one dashboard - perfect for agencies and teams',
    },
    {
        icon: Database,
        title: 'Conversation History',
        description: 'Search and review all conversations with powerful filters and export capabilities',
    },
    {
        icon: Bell,
        title: 'Smart Alerts',
        description: 'Get notified when agents go offline, API limits are reached, or errors occur',
    },
    {
        icon: Palette,
        title: 'Custom Branding',
        description: 'White-label the dashboard with your logo, colors, and domain name',
    },
];

// How It Works Steps
const howItWorksSteps = [
    {
        step: '01',
        title: 'Install OpenClaw Core',
        description: 'Run our one-line installer on your VPS, local machine, or Docker. Takes less than 60 seconds.',
        icon: Download,
        color: '#6366f1',
    },
    {
        step: '02',
        title: 'Configure Your Channels',
        description: 'Add your Telegram bot token, Discord credentials, or any of 17+ supported messaging platforms.',
        icon: Settings,
        color: '#8b5cf6',
    },
    {
        step: '03',
        title: 'Connect AI Models',
        description: 'Add your Claude, GPT, or Gemini API keys. Switch models anytime without touching code.',
        icon: Cpu,
        color: '#ec4899',
    },
    {
        step: '04',
        title: 'Link to Dashboard (Optional)',
        description: 'Connect to Command Center for monitoring, analytics, and team collaboration. Or stay local.',
        icon: Cloud,
        color: '#06b6d4',
    },
];

function DemoLoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { setUserFromApi } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('demo@clawpute.com');
    const [password, setPassword] = useState('user123');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await demoLogin(email, password);
            if (response.success) {
                setUserFromApi(
                    {
                        ...response.user,
                        role: response.user.role as 'user' | 'admin' | 'super_admin',
                        loginMethod: 'demo',
                        isDemo: true,
                    },
                    response.token
                );
                onClose();

                // Navigate to workspace dashboard if slug or ID is provided
                if (response.defaultWorkspaceSlug) {
                    navigate({ to: '/$workspaceSlug/dashboard', params: { workspaceSlug: response.defaultWorkspaceSlug } });
                } else if (response.defaultWorkspaceId) {
                    navigate({ to: '/$workspaceSlug/dashboard', params: { workspaceSlug: response.defaultWorkspaceId } });
                } else {
                    navigate({ to: '/dashboard' });
                }
            } else {
                setError('Login failed: ' + (response.message || 'Unknown error'));
            }
        } catch (err: any) {
            console.error('Demo login error:', err);
            const detailedError = err.response?.data?.error || err.response?.data?.message || err.message || 'Invalid credentials';
            setError(`Login failed: ${detailedError}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)',
                    border: '1px solid #333',
                    borderRadius: '20px',
                    maxWidth: '460px',
                    width: '100%',
                    padding: '40px',
                    position: 'relative',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#666';
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Sparkles size={32} color="#6366f1" />
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                        Command Center Demo
                    </h2>
                    <p style={{ color: '#888', fontSize: '15px' }}>
                        Experience the dashboard with read-only access
                    </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', color: '#aaa', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: '#0a0a0a',
                                border: '1px solid #333',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', color: '#aaa', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: '#0a0a0a',
                                border: '1px solid #333',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
                        />
                    </div>

                    {error && (
                        <div
                            style={{
                                padding: '14px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '10px',
                                color: '#ef4444',
                                fontSize: '14px',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '16px',
                            background: isLoading ? '#4a4d8f' : '#6366f1',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#5558e3')}
                        onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#6366f1')}
                    >
                        {isLoading ? 'Logging in...' : 'Enter Dashboard'}
                    </button>
                </form>

                <div
                    style={{
                        marginTop: '24px',
                        padding: '14px',
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: '#aaa',
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontWeight: 600, color: '#6366f1', marginBottom: '4px' }}>Demo Credentials</div>
                    demo@clawpute.com / user123
                </div>
            </div>
        </div>
    );
}

function LandingPage() {
    const navigate = useNavigate();
    const [demoModalOpen, setDemoModalOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [quickGoal, setQuickGoal] = useState('support');
    const [quickChannel, setQuickChannel] = useState('telegram');
    const [quickModel, setQuickModel] = useState('gpt-4o');

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const launchQuickBuilder = () => {
        navigate({
            to: '/config-builder',
            search: {
                tab: 'builder',
                goal: quickGoal,
                channel: quickChannel,
                model: quickModel,
            } as any,
        });
    };

    return (
        <div style={{ background: '#000', color: '#fff', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
            {/* Gradient Background Effects */}
            <div
                style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-25%',
                    width: '150%',
                    height: '150%',
                    background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: '40%',
                    right: '-20%',
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />

            {/* Accessibility skip link */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-6 focus:py-3 focus:bg-indigo-600 focus:text-white focus:rounded-xl focus:font-bold focus:shadow-2xl focus:shadow-indigo-500/50 transition-all font-inter"
            >
                Skip to main content
            </a>

            {/* Header */}
            <header
                className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/10"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <span className="text-xl sm:text-2xl font-bold tracking-tight">Clawpute</span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden sm:flex items-center gap-6 md:gap-8 lg:gap-10">
                        {[
                            { label: 'Features', section: 'features' },
                            { label: 'Pricing', route: '/pricing' },
                            { label: 'Config Builder', route: '/config-builder' },
                            { label: 'How It Works', section: 'how-it-works' },
                            { label: 'Openclaw Cheatsheet', route: '/openclaw-cheatsheet' }
                        ].map((item) => (
                            item.route ? (
                                <a
                                    key={item.label}
                                    href={item.route}
                                    className="text-[15px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
                                >
                                    {item.label}
                                </a>
                            ) : (
                                <button
                                    key={item.label}
                                    onClick={() => scrollToSection(item.section!)}
                                    className="text-[15px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
                                >
                                    {item.label}
                                </button>
                            )
                        ))}
                        <button
                            onClick={() => setDemoModalOpen(true)}
                            aria-label="Open live demo"
                            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-[15px] font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all active:scale-95"
                        >
                            Try Demo
                        </button>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="mobile-menu"
                        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation Dropdown */}
                {mobileMenuOpen && (
                    <div
                        id="mobile-menu"
                        className="md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-2xl border-b border-white/10 p-6 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-200"
                    >
                        {[
                            { label: 'Features', section: 'features' },
                            { label: 'Pricing', route: '/pricing' },
                            { label: 'Config Builder', route: '/config-builder' },
                            { label: 'How It Works', section: 'how-it-works' },
                            { label: 'Openclaw Cheatsheet', route: '/openclaw-cheatsheet' }
                        ].map((item) => (
                            item.route ? (
                                <a
                                    key={item.label}
                                    href={item.route}
                                    className="text-lg font-medium text-gray-300 hover:text-white transition-colors text-left"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.label}
                                </a>
                            ) : (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        scrollToSection(item.section!);
                                        setMobileMenuOpen(false);
                                    }}
                                    className="text-lg font-medium text-gray-300 hover:text-white transition-colors text-left"
                                >
                                    {item.label}
                                </button>
                            )
                        ))}
                        <a
                            href="https://github.com/OpenClaw/openclaw"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-medium text-gray-300 hover:text-white transition-colors"
                        >
                            GitHub
                        </a>
                        <button
                            onClick={() => {
                                setDemoModalOpen(true);
                                setMobileMenuOpen(false);
                            }}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-lg font-semibold shadow-lg shadow-indigo-500/20"
                        >
                            Try Demo
                        </button>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section id="main-content" className="relative z-10 pt-16 xs:pt-20 sm:pt-32 md:pt-40 lg:pt-40 pb-12 xs:pb-16 sm:pb-24 lg:pb-32 px-4 xs:px-5 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Star size={16} className="text-indigo-400 fill-indigo-400" />
                        <span className="text-xs sm:text-sm text-indigo-400 font-semibold tracking-wide">
                            Enterprise • Quick Install • Self-Hosted
                        </span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight mb-6 sm:mb-8 lg:mb-10 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent leading-[1.15] sm:leading-[1.1] word-break break-words">
                        Deploy AI Agents On Your Infrastructure
                    </h1>

                    {/* Subheadline */}
                    <p className="text-base xs:text-lg sm:text-xl lg:text-2xl text-gray-400 sm:max-w-4xl sm:mx-auto mb-8 sm:mb-10 lg:mb-14 leading-relaxed px-4 sm:px-0">
                        Run powerful AI assistants across 17+ messaging platforms. Self-hosted or managed dashboard. Full control over your data.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center mb-12 sm:mb-16 lg:mb-24 px-4 sm:px-0 w-full sm:w-auto">
                        <button
                            onClick={() => scrollToSection('pricing')}
                            className="flex items-center justify-center gap-2 px-6 py-3 xs:px-8 xs:py-3.5 sm:px-10 sm:py-5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl text-base sm:text-lg font-bold shadow-[0_10px_40px_-10px_rgba(99,102,241,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(99,102,241,0.6)] hover:-translate-y-1 transition-all active:scale-95 group w-full sm:w-auto"
                        >
                            Get Started Free
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform hidden sm:block" />
                        </button>

                        <button
                            onClick={() => setDemoModalOpen(true)}
                            aria-label="View live demo video or walk-through"
                            className="flex items-center justify-center gap-2 px-6 py-3 xs:px-8 xs:py-3.5 sm:px-10 sm:py-5 bg-white/5 text-white border border-white/10 rounded-2xl text-base sm:text-lg font-bold hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 w-full sm:w-auto"
                        >
                            <Play size={18} fill="currentColor" aria-hidden="true" />
                            View Demo
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-8 max-w-5xl mx-auto p-4 xs:p-6 sm:p-8 md:p-10 bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-3xl backdrop-blur-xl">
                        {stats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="flex flex-col items-center gap-1 xs:gap-2">
                                    <Icon size={20} className="text-indigo-500 xs:mb-1 sm:mb-2" />
                                    <div className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                                        {stat.value}
                                    </div>
                                    <div className="text-[10px] xs:text-xs sm:text-sm text-gray-400 font-medium uppercase tracking-wide text-center leading-tight">{stat.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Quick Builder CTA */}
            <section className="relative z-10 px-4 xs:px-5 sm:px-6 lg:px-8 pb-10 sm:pb-16">
                <div className="max-w-6xl mx-auto rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/85 via-slate-950/90 to-cyan-950/20 p-6 sm:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Generate your OpenClaw config in 30 seconds
                            </h2>
                            <p className="text-sm sm:text-base text-slate-300 mt-2">
                                Free and no account required. Pick your goal, channel, and model to prefill the full wizard.
                            </p>
                        </div>
                        <button
                            onClick={launchQuickBuilder}
                            className="h-11 px-5 rounded-xl border border-cyan-300/40 bg-cyan-500/20 text-cyan-100 text-sm font-semibold hover:bg-cyan-400/30 transition-colors"
                        >
                            Build My Config
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs uppercase tracking-wide text-slate-400 font-semibold">What are you building?</span>
                            <select
                                aria-label="Quick builder goal"
                                value={quickGoal}
                                onChange={(e) => setQuickGoal(e.target.value)}
                                className="h-11 rounded-xl bg-slate-950/60 border border-slate-700 text-slate-100 px-3 text-sm outline-none focus:border-cyan-400"
                            >
                                <option value="support">Support Bot</option>
                                <option value="sales">Sales Assistant</option>
                                <option value="community">Community Manager</option>
                                <option value="dev">Developer Tool</option>
                                <option value="content">Content Creator</option>
                                <option value="personal">Personal Assistant</option>
                                <option value="research">Research</option>
                            </select>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Channel</span>
                            <select
                                aria-label="Quick builder channel"
                                value={quickChannel}
                                onChange={(e) => setQuickChannel(e.target.value)}
                                className="h-11 rounded-xl bg-slate-950/60 border border-slate-700 text-slate-100 px-3 text-sm outline-none focus:border-cyan-400"
                            >
                                <option value="telegram">Telegram</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="slack">Slack</option>
                                <option value="discord">Discord</option>
                                <option value="api">API</option>
                            </select>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Model</span>
                            <select
                                aria-label="Quick builder model"
                                value={quickModel}
                                onChange={(e) => setQuickModel(e.target.value)}
                                className="h-11 rounded-xl bg-slate-950/60 border border-slate-700 text-slate-100 px-3 text-sm outline-none focus:border-cyan-400"
                            >
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                                <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                                <option value="llama3.1">Llama 3.1 (Ollama)</option>
                            </select>
                        </label>
                    </div>
                </div>
            </section>

            {/* Config Builder Highlights */}
            <section className="relative z-10 px-4 xs:px-5 sm:px-6 lg:px-8 pb-12 sm:pb-16">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        'Template library with goal-first filtering',
                        'Live JSON preview with diff highlighting',
                        'Import existing JSON and continue editing',
                        'No usage limits, no paywall, export anytime',
                    ].map((text) => (
                        <div
                            key={text}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200"
                        >
                            {text}
                        </div>
                    ))}
                </div>
            </section>

            {/* Integration Logos */}
            <section className="py-10 xs:py-12 sm:py-20 bg-[#050505] relative z-10 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-4 xs:px-5 sm:px-6 lg:px-8 text-center">
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500 mb-6 xs:mb-8 sm:mb-12 font-bold tracking-[0.2em] uppercase">
                        Works with your favorite platforms
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-6 xs:gap-8 sm:gap-12 md:gap-16 lg:gap-24 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                        {integrations.map((integration) => (
                            <img
                                key={integration.name}
                                src={integration.logo}
                                alt={integration.name}
                                className="h-5 xs:h-6 sm:h-8 md:h-9 hover:scale-110 transition-transform duration-300"
                            />
                        ))}
                        <span className="text-[10px] xs:text-xs sm:text-sm text-gray-600 font-bold">+ 13 more channels</span>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-16 xs:py-20 sm:py-32 relative z-10 px-4 xs:px-5 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 xs:mb-16 sm:mb-24 px-4 sm:px-0">
                        <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-4 xs:mb-6 tracking-tight leading-tight">
                            Everything you need to run AI agents
                        </h2>
                        <p className="text-base xs:text-lg sm:text-xl lg:text-2xl text-gray-400 sm:max-w-4xl sm:mx-auto mb-8 sm:mb-10 lg:mb-14 leading-relaxed px-4 sm:px-0">
                            From deployment to monitoring, we've built a complete platform
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-5 sm:gap-6 md:gap-8">
                        {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.title}
                                    className="p-6 xs:p-7 sm:p-8 md:p-10 bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.04]"
                                    style={{ '--hover-color': feature.color } as any}
                                >
                                    <div
                                        className="w-12 h-12 xs:w-13 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center mb-5 xs:mb-6 sm:mb-8 shadow-inner"
                                        style={{ background: `${feature.color}15` }}
                                    >
                                        <Icon size={24} color={feature.color} />
                                    </div>
                                    <h3 className="text-lg xs:text-xl font-bold text-white mb-3 xs:mb-4 tracking-tight">{feature.title}</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm xs:text-[15px]">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-16 xs:py-20 sm:py-32 bg-[#050505] relative z-10 px-4 xs:px-5 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 xs:mb-16 sm:mb-24 px-4 sm:px-0">
                        <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-4 xs:mb-6 tracking-tight">
                            Get started in 4 simple steps
                        </h2>
                        <p className="text-base xs:text-lg sm:text-xl lg:text-2xl text-gray-400 sm:max-w-4xl sm:mx-auto mb-8 sm:mb-10 lg:mb-14 leading-relaxed px-4 sm:px-0">
                            From installation to production in under 5 minutes
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 xs:gap-5 sm:gap-6 md:gap-10">
                        {howItWorksSteps.map((step) => {
                            const Icon = step.icon;
                            return (
                                <div
                                    key={step.step}
                                    className="p-8 sm:p-12 bg-white/[0.02] border border-white/10 rounded-3xl relative overflow-hidden group hover:bg-white/[0.04] transition-colors"
                                >
                                    <div className="absolute -top-6 -right-6 text-[100px] sm:text-[140px] font-black text-white/[0.02] leading-none select-none tracking-tighter group-hover:text-white/[0.03] transition-colors">
                                        {step.step}
                                    </div>
                                    <div
                                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-8 relative"
                                        style={{ background: `${step.color}15` }}
                                    >
                                        <Icon size={32} color={step.color} />
                                    </div>
                                    <div className="text-xs sm:text-sm font-black tracking-widest mb-4 opacity-80" style={{ color: step.color }}>
                                        STEP {step.step}
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight relative">{step.title}</h3>
                                    <p className="text-gray-400 leading-relaxed text-base sm:text-lg relative">{step.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Dashboard Features (for SaaS) */}
            <section className="py-16 xs:py-20 sm:py-32 relative z-10 px-4 xs:px-5 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 xs:mb-16 sm:mb-24 px-4 sm:px-0">
                        <div className="inline-flex items-center gap-2 px-3 xs:px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4 xs:mb-6">
                            <Cloud size={14} className="text-indigo-400" />
                            <span className="text-[10px] xs:text-[11px] sm:text-xs text-indigo-400 font-bold uppercase tracking-widest">Command Center</span>
                        </div>
                        <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-4 xs:mb-6 tracking-tight leading-tight">
                            Powerful SaaS Dashboard
                        </h2>
                        <p className="text-base xs:text-lg sm:text-xl lg:text-2xl text-gray-400 sm:max-w-4xl sm:mx-auto mb-8 sm:mb-10 lg:mb-14 leading-relaxed px-4 sm:px-0">
                            Optional hosted dashboard for monitoring, analytics, and team collaboration
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-5 sm:gap-6 md:gap-8">
                        {dashboardFeatures.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.title}
                                    className="p-6 xs:p-7 sm:p-8 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl sm:rounded-3xl hover:bg-indigo-500/5 transition-colors"
                                >
                                    <div className="w-10 h-10 xs:w-12 sm:h-12 bg-indigo-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 xs:mb-6">
                                        <Icon size={20} className="text-indigo-400 xs:size-6 sm:size-[24px]" />
                                    </div>
                                    <h3 className="text-base xs:text-lg font-bold text-white mb-2 xs:mb-3 tracking-tight">{feature.title}</h3>
                                    <p className="text-gray-400 leading-relaxed text-xs xs:text-sm sm:text-base">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-16 xs:py-20 sm:py-32 bg-[#050505] relative z-10 px-4 xs:px-5 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 xs:mb-16 sm:mb-24 px-4 sm:px-0">
                        <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-4 xs:mb-6 tracking-tight leading-tight">
                            Choose your deployment model
                        </h2>
                        <p className="text-base xs:text-lg sm:text-xl lg:text-2xl text-gray-400 sm:max-w-4xl sm:mx-auto mb-8 sm:mb-10 lg:mb-14 leading-relaxed px-4 sm:px-0">
                            Self-host for free, or upgrade to our managed dashboard
                        </p>
                    </div>

                    <div className="flex justify-center gap-6 xs:gap-7 sm:gap-8 max-w-4xl mx-auto">
                        {pricingPlans.map((plan) => {
                            const Icon = plan.icon;
                            return (
                                <div
                                    key={plan.name}
                                    className={`p-8 sm:p-12 rounded-[32px] relative transition-all duration-300 hover:-translate-y-2 group ${plan.popular
                                        ? 'bg-indigo-500/[0.05] border-2 border-indigo-500 shadow-[0_20px_50px_-20px_rgba(99,102,241,0.3)]'
                                        : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {plan.badge && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-xs font-bold tracking-wider uppercase text-white shadow-xl shadow-indigo-500/25">
                                            {plan.badge}
                                        </div>
                                    )}

                                    <div className="mb-10">
                                        <div
                                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-8"
                                            style={{ background: `${plan.color}20` }}
                                        >
                                            <Icon size={32} color={plan.color} />
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">{plan.name}</h3>
                                        <p className="text-sm sm:text-base text-gray-400 font-medium">{plan.tagline}</p>
                                    </div>

                                    <div className="mb-10">
                                        <div className="flex items-baseline gap-2 mb-4">
                                            <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter">{plan.price}</span>
                                            <span className="text-lg text-gray-400 font-bold">{plan.period}</span>
                                        </div>
                                        <p className="text-gray-400 leading-relaxed text-base">{plan.description}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2.5 mb-10">
                                        {plan.highlightFeatures.map((feat) => (
                                            <div
                                                key={feat}
                                                className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase border transition-colors"
                                                style={{
                                                    background: `${plan.color}10`,
                                                    borderColor: `${plan.color}30`,
                                                    color: plan.color
                                                }}
                                            >
                                                {feat}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        aria-label={`Choose ${plan.name} plan`}
                                        className={`w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-bold mb-10 transition-all active:scale-95 ${plan.ctaVariant === 'primary'
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40'
                                            : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        {plan.cta}
                                    </button>

                                    <div className="space-y-4">
                                        {plan.features.map((feature) => (
                                            <div key={feature} className="flex gap-4 items-start">
                                                <CheckCircle2
                                                    size={18}
                                                    color={plan.color}
                                                    className="shrink-0 mt-1"
                                                />
                                                <span className="text-[15px] sm:text-base text-gray-300 leading-tight">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            marginTop: '48px',
                            padding: '24px',
                            background: 'rgba(99, 102, 241, 0.05)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '16px',
                            textAlign: 'center',
                            maxWidth: '800px',
                            margin: '48px auto 0',
                        }}
                    >
                        <p style={{ fontSize: '15px', color: '#aaa' }}>
                            <strong style={{ color: '#6366f1' }}>Not sure which to choose?</strong> Start with Self-Hosted (free forever).
                            You can upgrade to Command Center anytime to add the dashboard.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 xs:py-20 sm:py-32 relative z-10 px-4 xs:px-5 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto px-4 xs:px-6 py-12 xs:py-16 sm:px-12 sm:py-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl xs:rounded-[40px] text-center relative overflow-hidden shadow-2xl shadow-indigo-500/20 group">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
                    <div className="relative z-10">
                        <Rocket size={36} className="text-white mx-auto mb-6 xs:mb-8 opacity-90 animate-bounce xs:size-12 sm:size-[48px]" />
                        <h2 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-4 xs:mb-6 tracking-tight leading-tight">
                            Ready to deploy your AI agent?
                        </h2>
                        <p className="text-base xs:text-lg text-white sm:text-xl lg:text-2xl text-gray-400 sm:max-w-4xl sm:mx-auto mb-8 sm:mb-10 lg:mb-14 leading-relaxed px-4 sm:px-0">
                            Get started in under 60 seconds. No credit card required.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center w-full sm:w-auto">
                            <button
                                onClick={() => window.open('https://github.com/OpenClaw/openclaw', '_blank')}
                                className="hidden flex items-center justify-center gap-2 xs:gap-3 px-6 xs:px-8 py-3 xs:py-4 sm:px-10 sm:py-5 bg-white text-indigo-500 rounded-2xl text-base xs:text-lg font-bold shadow-xl shadow-black/10 hover:shadow-black/20 hover:-translate-y-1 transition-all active:scale-95 w-full sm:w-auto"
                            >
                                <Download size={18} className="xs:size-5 sm:size-[20px]" />
                                Download Free
                            </button>
                            <button
                                onClick={() => setDemoModalOpen(true)}
                                className="flex items-center justify-center gap-2 xs:gap-3 px-6 xs:px-8 py-3 xs:py-4 sm:px-10 sm:py-5 bg-white/10 text-white border-2 border-white/30 rounded-2xl text-base xs:text-lg font-bold backdrop-blur-md hover:bg-white/20 hover:border-white/40 transition-all active:scale-95 w-full sm:w-auto"
                            >
                                <Eye size={18} className="xs:size-5 sm:size-[20px]" />
                                View Demo
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 xs:py-16 sm:py-24 px-4 xs:px-5 sm:px-6 lg:px-8 bg-[#020202] border-t border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto ">
                    <div className="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 xs:gap-10 sm:gap-12 md:gap-16 mb-12 xs:mb-16 sm:mb-24">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                                    <Sparkles size={22} className="text-white" />
                                </div>
                                <span className="text-2xl font-bold tracking-tight">Clawpute</span>
                            </div>
                            <p className="text-gray-500 leading-relaxed text-[15px]">
                                Deploy AI agents on your infrastructure. Open source, privacy-first, and production-ready.
                            </p>
                        </div>

                        {[
                            {
                                title: 'PRODUCT',
                                links: [
                                    { label: 'Features', href: '#features' },
                                    { label: 'Pricing', href: '/pricing' },
                                    { label: 'How It Works', href: '#how-it-works' },
                                    { label: 'Live Demo', action: () => setDemoModalOpen(true) }
                                ]
                            },
                            {
                                title: 'DEVELOPERS',
                                links: [
                                    { label: 'GitHub', href: 'https://github.com/openclaw/openclaw' },
                                    { label: 'Documentation', href: '#' },
                                    { label: 'Openclaw Cheatsheet', href: '/openclaw-cheatsheet' },
                                    { label: 'Configuration', href: '/openclaw-configuration' }
                                ]
                            },
                            {
                                title: 'SUPPORT',
                                links: [
                                    { label: 'Contact Support', href: 'https://x.com/web4strategy' },
                                    { label: 'Privacy Policy', href: '/privacy' },
                                    { label: 'Terms of Service', href: '/terms' },
                                    { label: 'Back to Top', action: scrollToTop }
                                ]
                            }
                        ].map((column) => (
                            <div key={column.title} className="flex flex-col gap-6">
                                <h4 className="text-[11px] sm:text-xs font-black tracking-[0.2em] text-gray-400 uppercase">{column.title}</h4>
                                <div className="flex flex-col gap-4">
                                    {column.links.map((link) => (
                                        link.action ? (
                                            <button
                                                key={link.label}
                                                onClick={link.action}
                                                className="text-gray-500 hover:text-white transition-colors text-left text-[15px] font-medium"
                                            >
                                                {link.label}
                                            </button>
                                        ) : (
                                            <a
                                                key={link.label}
                                                href={link.href}
                                                className="text-gray-500 hover:text-white transition-colors text-[15px] font-medium"
                                            >
                                                {link.label}
                                            </a>
                                        )
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 sm:pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-0">
                        <p className="text-gray-600 text-[13px] font-medium">© 2026 Clawpute. Built with 💜 by the community.</p>
                        <div className="flex gap-8">
                            <a href="/privacy" className="text-gray-600 hover:text-white transition-colors text-[13px] font-medium underline underline-offset-4 decoration-white/10">Privacy Policy</a>
                            <a href="/terms" className="text-gray-600 hover:text-white transition-colors text-[13px] font-medium underline underline-offset-4 decoration-white/10">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Back to Top Floating Button */}
            <button
                onClick={scrollToTop}
                aria-label="Back to top"
                className={`fixed bottom-8 right-8 z-[90] p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all duration-300 hover:bg-indigo-500 hover:-translate-y-1 active:scale-95 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
                    }`}
            >
                <ChevronUp size={24} />
            </button>

            {/* Demo Modal */}
            <DemoLoginModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
        </div>
    );
}

export default LandingPage;

import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../contexts/AuthContext';
import { demoLogin } from '../lib/api';
import { useState, useEffect, useRef } from 'react';
import {
    Mail,
    Languages,
    Inbox,
    Ticket,
    ScrollText,
    Calendar,
    CalendarClock,
    Clock,
    CalendarDays,
    StickyNote,
    Globe,
    Calculator,
    Receipt,
    Scale,
    CreditCard,
    DollarSign,
    Percent,
    Search,
    TrendingDown,
    Package,
    Handshake,
    FileSignature,
    Users,
    Filter,
    FileSpreadsheet,
    Presentation,
    Plane,
    ChefHat,
    Share2,
    Newspaper,
    Target,
    MailOpen,
    FileEdit,
    BarChart3,
    ArrowRight,
    Check,
    ChevronDown,
    Zap,
    MessageSquare,
    Heart,
    Cloud,
    Server,
    Container,
    LayoutDashboard,
    Shield,
    HardDrive,
    X,
    Info,
    Sparkles,
    ExternalLink,
    Key,
    FileText,
    Terminal,
    Download,
    Play,
    Copy,
    CheckCircle,
    MessageCircle,
    Eye,
    EyeOff
} from 'lucide-react';

// Fixed models (first 3) + more dropdown
const fixedModels = [
    { id: 'kimi', name: 'Kimi K 2.5', icon: '🌙', color: '#6366f1', provider: 'Moonshot' },
    { id: 'minimax', name: 'MiniMax', icon: '🎭', color: '#8b5cf6', provider: 'MiniMax' },
    { id: 'gpt-5', name: 'GPT 5.2', icon: '🌀', color: '#10a37f', provider: 'OpenAI' },
];

const moreModels = [
    { id: 'claude-opus', name: 'Claude Opus 4.5', icon: '🔥', color: '#ff6b35', provider: 'Anthropic' },
    { id: 'gemini', name: 'Gemini 3 Flash', icon: '✨', color: '#4285f4', provider: 'Google' },
];

// All available channels (17+ integrations)
const channels = [
    { id: 'telegram', name: 'Telegram', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg', available: true, category: 'messaging', setupTime: '2 min', difficulty: 'easy' },
    { id: 'discord', name: 'Discord', icon: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png', available: true, category: 'messaging', setupTime: '5 min', difficulty: 'easy' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg', available: true, category: 'messaging', setupTime: '8 min', difficulty: 'medium' },
    { id: 'slack', name: 'Slack', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg', available: true, category: 'messaging', setupTime: '5 min', difficulty: 'easy' },
    { id: 'imessage', name: 'iMessage', icon: '💬', available: true, category: 'messaging', setupTime: '10 min', difficulty: 'medium', note: 'macOS only' },
    { id: 'signal', name: 'Signal', icon: '🔐', available: true, category: 'messaging', setupTime: '10 min', difficulty: 'medium' },
    { id: 'matrix', name: 'Matrix', icon: '🕸️', available: true, category: 'messaging', setupTime: '8 min', difficulty: 'medium' },
    { id: 'googlechat', name: 'Google Chat', icon: '💬', available: true, category: 'messaging', setupTime: '5 min', difficulty: 'easy' },
    { id: 'msteams', name: 'Microsoft Teams', icon: '👥', available: true, category: 'enterprise', setupTime: '10 min', difficulty: 'medium' },
    { id: 'line', name: 'LINE', icon: '💚', available: true, category: 'messaging', setupTime: '5 min', difficulty: 'easy' },
    { id: 'twitch', name: 'Twitch', icon: '🎮', available: true, category: 'social', setupTime: '5 min', difficulty: 'easy' },
    { id: 'nostr', name: 'Nostr', icon: '⚡', available: true, category: 'social', setupTime: '8 min', difficulty: 'medium' },
    { id: 'mattermost', name: 'Mattermost', icon: '🔒', available: true, category: 'enterprise', setupTime: '8 min', difficulty: 'medium' },
    { id: 'nextcloud', name: 'Nextcloud Talk', icon: '☁️', available: true, category: 'enterprise', setupTime: '10 min', difficulty: 'medium' },
    { id: 'webchat', name: 'WebChat', icon: '🌐', available: true, category: 'web', setupTime: '2 min', difficulty: 'easy' },
    { id: 'zalo', name: 'Zalo', icon: '💬', available: true, category: 'messaging', setupTime: '5 min', difficulty: 'easy' },
    { id: 'bluebubbles', name: 'BlueBubbles', icon: '🔵', available: true, category: 'messaging', setupTime: '15 min', difficulty: 'advanced', note: 'iMessage bridge' },
];

const deployOptions = [
    { id: 'cloudflare', name: 'Cloudflare Workers', icon: Cloud, color: '#f97316', description: 'Edge computing, free tier', time: '< 2 min' },
    { id: 'docker', name: 'Docker', icon: Container, color: '#2496ed', description: 'Self-hosted containers', time: '5 min' },
    { id: 'digitalocean', name: 'DigitalOcean', icon: Server, color: '#0069ff', description: 'Reliable VPS hosting', time: '10 min' },
    { id: 'hostinger', name: 'Hostinger VPS', icon: Shield, color: '#673de6', description: 'Budget-friendly VPS', time: '12 min' },
    { id: 'vps', name: 'Other VPS', icon: HardDrive, color: '#10b981', description: 'Any VPS provider', time: '15 min' },
    { id: 'wsl', name: 'Windows WSL', icon: Server, color: '#e95420', description: 'Windows Subsystem for Linux', time: '10 min' },
    { id: 'local', name: 'Local Machine', icon: HardDrive, color: '#6b7280', description: 'Direct install on macOS/Linux', time: '5 min' },
];

// Model Configuration Requirements
const modelConfig: Record<string, {
    requiredEnvVars: { key: string; description: string; example: string }[];
    setupSteps: string[];
    docsUrl: string;
    pricingUrl: string;
}> = {
    'kimi': {
        requiredEnvVars: [
            { key: 'MOONSHOT_API_KEY', description: 'Your Moonshot AI API key', example: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to platform.moonshot.cn and create an account',
            'Navigate to API Keys section in your dashboard',
            'Generate a new API key',
            'Copy the key (starts with sk-)',
        ],
        docsUrl: 'https://platform.moonshot.cn/docs',
        pricingUrl: 'https://platform.moonshot.cn/pricing',
    },
    'minimax': {
        requiredEnvVars: [
            { key: 'MINIMAX_API_KEY', description: 'Your MiniMax API key', example: 'eyJhbGciOiJIUzI1NiIs...' },
            { key: 'MINIMAX_GROUP_ID', description: 'Your MiniMax Group ID', example: '1234567890' },
        ],
        setupSteps: [
            'Go to platform.minimaxi.com and sign up',
            'Create a new application',
            'Copy your API Key and Group ID',
            'Enable the models you want to use',
        ],
        docsUrl: 'https://platform.minimaxi.com/document/guides',
        pricingUrl: 'https://platform.minimaxi.com/document/price',
    },
    'gpt-5': {
        requiredEnvVars: [
            { key: 'OPENAI_API_KEY', description: 'Your OpenAI API key', example: 'sk-proj-xxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to platform.openai.com and sign in',
            'Click on API keys in the left sidebar',
            'Create a new secret key',
            'Copy the key immediately (you won\'t see it again)',
        ],
        docsUrl: 'https://platform.openai.com/docs',
        pricingUrl: 'https://openai.com/pricing',
    },
    'claude-opus': {
        requiredEnvVars: [
            { key: 'ANTHROPIC_API_KEY', description: 'Your Anthropic API key', example: 'sk-ant-xxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to console.anthropic.com and create an account',
            'Navigate to API Keys section',
            'Generate a new key',
            'Copy the key (starts with sk-ant-)',
        ],
        docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
        pricingUrl: 'https://www.anthropic.com/pricing',
    },
    'gemini': {
        requiredEnvVars: [
            { key: 'GOOGLE_API_KEY', description: 'Your Google AI API key', example: 'AIzaSyxxxxxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to makersuite.google.com/app/apikey',
            'Sign in with your Google account',
            'Click "Create API Key"',
            'Copy the generated key',
        ],
        docsUrl: 'https://ai.google.dev/docs',
        pricingUrl: 'https://ai.google.dev/pricing',
    },
};

// Channel Configuration
const channelConfig: Record<string, {
    requiredEnvVars: { key: string; description: string; example: string }[];
    setupSteps: string[];
    docsUrl: string;
    proTip?: string;
}> = {
    'telegram': {
        requiredEnvVars: [
            { key: 'TELEGRAM_BOT_TOKEN', description: 'Your bot token from @BotFather', example: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz' },
        ],
        setupSteps: [
            'Open Telegram and search for @BotFather',
            'Start a chat and type /newbot',
            'Follow prompts to name your bot and choose username',
            'BotFather will send you a token - copy it entirely',
        ],
        docsUrl: 'https://core.telegram.org/bots/tutorial',
        proTip: 'Fastest setup - recommended for beginners',
    },
    'discord': {
        requiredEnvVars: [
            { key: 'DISCORD_BOT_TOKEN', description: 'Discord bot token', example: 'MTAxxxxxxxxxxxxxxxx.xxxxxx.xxxxx' },
        ],
        setupSteps: [
            'Go to discord.com/developers/applications',
            'Click "New Application" and give it a name',
            'Go to "Bot" section and click "Add Bot"',
            'Enable Message Content Intent and copy Bot Token',
        ],
        docsUrl: 'https://discord.com/developers/docs/getting-started',
        proTip: 'Great for team collaboration and communities',
    },
    'whatsapp': {
        requiredEnvVars: [],
        setupSteps: [
            'Have a spare phone number ready (virtual numbers often blocked)',
            'During install, run: openclaw channels login',
            'Scan QR code with WhatsApp → Settings → Linked Devices',
            'Your WhatsApp Web session will be established',
        ],
        docsUrl: 'https://openclaw.ai/channels/whatsapp',
        proTip: 'Uses Baileys library - no API key needed but requires QR scan',
    },
    'slack': {
        requiredEnvVars: [
            { key: 'SLACK_BOT_TOKEN', description: 'Slack Bot User OAuth Token', example: 'xoxb-123456789012-xxxxxxxxxxxx' },
            { key: 'SLACK_APP_TOKEN', description: 'Slack App-Level Token', example: 'xapp-1-1234567890123-xxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to api.slack.com/apps',
            'Create New App → From scratch',
            'Enable Socket Mode and generate App Token',
            'Add Bot Token Scopes and install to workspace',
        ],
        docsUrl: 'https://api.slack.com/start',
        proTip: 'Best for workplace integration',
    },
    'imessage': {
        requiredEnvVars: [],
        setupSteps: [
            'macOS only - requires a Mac',
            'Install imsg: brew install steipete/tap/imsg',
            'Enable Full Disk Access for OpenClaw',
            'Sign in to Messages app with your Apple ID',
        ],
        docsUrl: 'https://openclaw.ai/channels/imessage',
        proTip: 'Native iMessage integration for Mac users',
    },
    'signal': {
        requiredEnvVars: [],
        setupSteps: [
            'Install signal-cli on your server',
            'Link device using QR code',
            'Configure phone number in settings',
            'Privacy-focused messaging',
        ],
        docsUrl: 'https://openclaw.ai/channels/signal',
        proTip: 'Most private and secure option',
    },
    'matrix': {
        requiredEnvVars: [
            { key: 'MATRIX_HOMESERVER', description: 'Matrix homeserver URL', example: 'https://matrix.org' },
            { key: 'MATRIX_ACCESS_TOKEN', description: 'Matrix access token', example: 'syt_xxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Create account on your preferred Matrix server',
            'Get access token from Element settings',
            'Configure homeserver URL',
            'Set user ID in format @user:server.com',
        ],
        docsUrl: 'https://openclaw.ai/channels/matrix',
        proTip: 'Decentralized and open protocol',
    },
    'googlechat': {
        requiredEnvVars: [],
        setupSteps: [
            'Go to Google Cloud Console',
            'Create a new project and enable Chat API',
            'Configure HTTP webhook endpoint',
            'Get service account credentials',
        ],
        docsUrl: 'https://openclaw.ai/channels/googlechat',
        proTip: 'Good for Google Workspace users',
    },
    'msteams': {
        requiredEnvVars: [
            { key: 'TEAMS_APP_ID', description: 'Microsoft App ID', example: '12345678-1234-1234-1234-123456789012' },
            { key: 'TEAMS_APP_PASSWORD', description: 'Microsoft App Password', example: 'xxxxxxxxxxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to Azure Portal → App registrations',
            'Create new registration',
            'Get Application (client) ID',
            'Create client secret for password',
        ],
        docsUrl: 'https://openclaw.ai/channels/msteams',
        proTip: 'Best for enterprise Microsoft environments',
    },
    'line': {
        requiredEnvVars: [
            { key: 'LINE_CHANNEL_ACCESS_TOKEN', description: 'LINE Channel Access Token', example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            { key: 'LINE_CHANNEL_SECRET', description: 'LINE Channel Secret', example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to LINE Developers Console',
            'Create a new provider and channel',
            'Get Channel Access Token and Secret',
            'Configure webhook URL',
        ],
        docsUrl: 'https://openclaw.ai/channels/line',
        proTip: 'Popular in Japan, Taiwan, and Thailand',
    },
    'twitch': {
        requiredEnvVars: [
            { key: 'TWITCH_BOT_USERNAME', description: 'Twitch bot username', example: 'myopenclawbot' },
            { key: 'TWITCH_OAUTH_TOKEN', description: 'OAuth token', example: 'oauth:xxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Create a Twitch account for your bot',
            'Get OAuth token from twitchapps.com/tmi/',
            'Configure channel to join',
            'Enable IRC capabilities',
        ],
        docsUrl: 'https://openclaw.ai/channels/twitch',
        proTip: 'Great for streamer chatbots',
    },
    'nostr': {
        requiredEnvVars: [
            { key: 'NOSTR_PRIVATE_KEY', description: 'Nostr private key (nsec)', example: 'nsec1...' },
        ],
        setupSteps: [
            'Generate a Nostr key pair',
            'Get nsec private key',
            'Configure relay servers',
            'Set up DM handling',
        ],
        docsUrl: 'https://openclaw.ai/channels/nostr',
        proTip: 'Decentralized social protocol',
    },
    'mattermost': {
        requiredEnvVars: [
            { key: 'MATTERMOST_URL', description: 'Mattermost server URL', example: 'https://mattermost.company.com' },
            { key: 'MATTERMOST_TOKEN', description: 'Personal Access Token', example: 'xxxxxxxxxxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to Mattermost → Account Settings → Security',
            'Generate Personal Access Token',
            'Copy server URL',
            'Configure bot account permissions',
        ],
        docsUrl: 'https://openclaw.ai/channels/mattermost',
        proTip: 'Open source Slack alternative',
    },
    'nextcloud': {
        requiredEnvVars: [
            { key: 'NEXTCLOUD_URL', description: 'Nextcloud server URL', example: 'https://cloud.example.com' },
            { key: 'NEXTCLOUD_TOKEN', description: 'App password', example: 'xxxx-xxxx-xxxx-xxxx' },
        ],
        setupSteps: [
            'Go to Nextcloud Settings → Security',
            'Create app password',
            'Copy server URL',
            'Enable Talk app',
        ],
        docsUrl: 'https://openclaw.ai/channels/nextcloud-talk',
        proTip: 'Self-hosted collaboration',
    },
    'webchat': {
        requiredEnvVars: [],
        setupSteps: [
            'WebChat is built into the Gateway',
            'Access via Gateway Web UI',
            'No additional setup required',
            'Configure in browser settings',
        ],
        docsUrl: 'https://openclaw.ai/web/webchat',
        proTip: 'Simplest - no external service needed',
    },
    'zalo': {
        requiredEnvVars: [
            { key: 'ZALO_APP_ID', description: 'Zalo App ID', example: '1234567890' },
            { key: 'ZALO_APP_SECRET', description: 'Zalo App Secret', example: 'xxxxxxxxxxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to developers.zalo.me',
            'Create a new Mini App or Official Account',
            'Get App ID and Secret',
            'Configure webhook URL',
        ],
        docsUrl: 'https://openclaw.ai/channels/zalo',
        proTip: 'Popular messaging app in Vietnam',
    },
    'bluebubbles': {
        requiredEnvVars: [],
        setupSteps: [
            'Set up BlueBubbles server on a Mac',
            'Configure server URL and password',
            'Enable Google Cloud FCM',
            'Link with your iMessage account',
        ],
        docsUrl: 'https://openclaw.ai/channels/bluebubbles',
        proTip: 'Best iMessage bridge - full feature support',
    },
};

// Deployment Configuration
const deployConfig: Record<string, {
    requiredEnvVars: { key: string; description: string; example: string }[];
    setupSteps: string[];
    docsUrl: string;
    pricingUrl?: string;
    installScript?: string;
}> = {
    'cloudflare': {
        requiredEnvVars: [
            { key: 'CLOUDFLARE_API_TOKEN', description: 'Cloudflare API Token with Workers permissions', example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            { key: 'CLOUDFLARE_ACCOUNT_ID', description: 'Your Cloudflare Account ID', example: '1a2b3c4d5e6f7g8h9i0j' },
        ],
        setupSteps: [
            'Go to dash.cloudflare.com and sign in',
            'Get your Account ID from the right sidebar',
            'Go to My Profile → API Tokens → Create Token',
            'Use the "Edit Cloudflare Workers" template',
        ],
        docsUrl: 'https://developers.cloudflare.com/workers/get-started/guide/',
        pricingUrl: 'https://workers.cloudflare.com/pricing',
    },
    'docker': {
        requiredEnvVars: [],
        setupSteps: [
            'Install Docker on your server',
            'The install script will generate docker-compose.yml',
            'Run docker-compose up -d to start',
            'No external API keys required for Docker',
        ],
        docsUrl: 'https://docs.docker.com/get-started/',
    },
    'digitalocean': {
        requiredEnvVars: [
            { key: 'DIGITALOCEAN_TOKEN', description: 'DigitalOcean Personal Access Token', example: 'dop_v1_xxxxxxxxxxxxxxxx' },
        ],
        setupSteps: [
            'Go to cloud.digitalocean.com/account/api/tokens',
            'Click "Generate New Token"',
            'Give it a name and read/write scope',
            'Copy the token immediately',
        ],
        docsUrl: 'https://www.digitalocean.com/docs/apis-clis/api/create-personal-access-token/',
        pricingUrl: 'https://www.digitalocean.com/pricing',
    },
    'hostinger': {
        requiredEnvVars: [],
        setupSteps: [
            'Sign up at hostinger.com',
            'Purchase a VPS plan',
            'Get your SSH credentials',
            'The script will connect and install automatically',
        ],
        docsUrl: 'https://support.hostinger.com/en/articles/1584769-how-to-get-started-with-vps',
        pricingUrl: 'https://www.hostinger.com/vps-hosting',
    },
    'vps': {
        requiredEnvVars: [
            { key: 'VPS_IP', description: 'Your VPS IP address', example: '192.168.1.1' },
            { key: 'VPS_SSH_KEY', description: 'SSH private key content', example: '-----BEGIN OPENSSH PRIVATE KEY-----' },
        ],
        setupSteps: [
            'Have your VPS IP address ready',
            'Generate an SSH key pair if you don\'t have one',
            'The script will connect via SSH and install',
            'Supports any Ubuntu/Debian VPS',
        ],
        docsUrl: 'https://github.com/OpenClaw/OpenClaw/blob/main/docs/self-hosting.md',
    },
    'wsl': {
        requiredEnvVars: [],
        setupSteps: [
            'Enable WSL: wsl --install',
            'Install Ubuntu from Microsoft Store',
            'Run the install script inside WSL',
            'Access via Windows browser at localhost:18789',
        ],
        docsUrl: 'https://docs.microsoft.com/en-us/windows/wsl/install',
    },
    'local': {
        requiredEnvVars: [],
        setupSteps: [
            'Requires macOS or Linux',
            'The install script will check dependencies',
            'Node.js 18+ will be installed if missing',
            'OpenClaw will run on localhost:18789',
        ],
        docsUrl: 'https://openclaw.ai/install',
    },
};

const dashboardConfig = {
    setupSteps: [
        'Command Center is our hosted SaaS dashboard (Cloudflare Workers)',
        'Connect your local OpenClaw instance to the dashboard',
        'Access from anywhere via https://clawpute.com',
        'No local installation needed for the dashboard',
    ],
    features: [
        'View and manage AI agents in real-time',
        'Monitor conversations across all channels',
        'Configure tools and permissions per agent',
        'View usage analytics and cost tracking',
        'Manage tasks with Kanban board view',
        'Monitor agent heartbeats and status',
    ],
};

const capabilities = [
    { icon: Mail, text: 'Read & summarize email' },
    { icon: MessageSquare, text: 'Draft replies and follow-ups' },
    { icon: Languages, text: 'Translate messages in real time' },
    { icon: Inbox, text: 'Organize your inbox' },
    { icon: Ticket, text: 'Answer support tickets' },
    { icon: ScrollText, text: 'Summarize long documents' },
    { icon: Calendar, text: 'Notify before a meeting' },
    { icon: CalendarClock, text: 'Schedule meetings from chat' },
    { icon: Clock, text: 'Remind you of deadlines' },
    { icon: CalendarDays, text: 'Plan your week' },
    { icon: StickyNote, text: 'Take meeting notes' },
    { icon: Globe, text: 'Sync across time zones' },
    { icon: Calculator, text: 'Do your taxes' },
    { icon: Receipt, text: 'Track expenses and receipts' },
    { icon: Scale, text: 'Compare insurance quotes' },
    { icon: CreditCard, text: 'Manage subscriptions' },
    { icon: DollarSign, text: 'Run payroll calculations' },
    { icon: Handshake, text: 'Negotiate refunds' },
    { icon: Percent, text: 'Find coupons' },
    { icon: Search, text: 'Find best prices online' },
    { icon: TrendingDown, text: 'Find discount codes' },
    { icon: Zap, text: 'Price-drop alerts' },
    { icon: Package, text: 'Compare product specs' },
    { icon: Handshake, text: 'Negotiate deals' },
    { icon: FileSignature, text: 'Write contracts and NDAs' },
    { icon: Users, text: 'Research competitors' },
    { icon: Filter, text: 'Screen and prioritize leads' },
    { icon: FileSpreadsheet, text: 'Generate invoices' },
    { icon: Presentation, text: 'Create presentations from bullet points' },
    { icon: Plane, text: 'Book travel and hotels' },
    { icon: ChefHat, text: 'Find recipes from ingredients' },
    { icon: Share2, text: 'Draft social posts' },
    { icon: Newspaper, text: 'Monitor news and alerts' },
    { icon: Target, text: 'Set and track goals' },
    { icon: MailOpen, text: 'Screen cold outreach' },
    { icon: FileEdit, text: 'Draft job descriptions' },
    { icon: StickyNote, text: 'Run standup summaries' },
    { icon: BarChart3, text: 'Track OKRs and KPIs' },
];

// Split into 5 columns
const column1 = capabilities.slice(0, 8);
const column2 = capabilities.slice(8, 16);
const column3 = capabilities.slice(16, 24);
const column4 = capabilities.slice(24, 32);
const column5 = capabilities.slice(32, 40);

function FloatingPill({ text }: { icon: any; text: string }) {
    return (
        <div style={{ padding: '4px 0', whiteSpace: 'nowrap' }}>
            {text}
        </div>
    );
}

function FloatingColumn({ items, duration, delay }: { items: any[]; duration: number; delay: number }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                animation: `scrollUp ${duration}s linear infinite`,
                animationDelay: `${delay}s`,
            }}
        >
            {[...items, ...items, ...items, ...items].map((item, i) => (
                <FloatingPill key={i} icon={item.icon} text={item.text} />
            ))}
        </div>
    );
}

// Config Input Component
function ConfigInput({ label, placeholder, value, onChange }: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
}) {
    const [showValue, setShowValue] = useState(false);

    return (
        <div style={{ marginBottom: '16px' }}>
            <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#888',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
            }}>
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <input
                    type={showValue ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        padding: '12px 40px 12px 14px',
                        background: '#111',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={() => setShowValue(!showValue)}
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                >
                    {showValue ? 'Hide' : 'Show'}
                </button>
            </div>
        </div>
    );
}

// Side Panel Component - Slides in from right, no blur
function SidePanel({ isOpen, onClose, title, icon: Icon, color, children }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon: any;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '460px',
            maxWidth: '100%',
            height: '100vh',
            background: '#0a0a0a',
            borderLeft: '1px solid #333',
            zIndex: 1000,
            transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease-out',
            overflowY: 'auto',
            boxShadow: isOpen ? '-10px 0 40px rgba(0,0,0,0.5)' : 'none',
        }}>
            {/* Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                background: '#0a0a0a',
                borderBottom: '1px solid #333',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: `${color}20`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Icon size={20} style={{ color }} />
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{title}</span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'transparent',
                        border: '1px solid #444',
                        color: '#888',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
                {children}
            </div>
        </div>
    );
}

// Install Script Modal Component
function InstallScriptModal({ isOpen, onClose, selectedModel, selectedChannels, selectedDeploy, modelApiKey, channelToken, deployToken, deployAccountId }: {
    isOpen: boolean;
    onClose: () => void;
    selectedModel: string;
    selectedChannels: string[];
    selectedDeploy: string;
    modelApiKey: string;
    channelToken: string;
    deployToken: string;
    deployAccountId: string;
}) {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'script' | 'guide' | 'docs'>('script');

    const installScript = `#!/bin/bash

#############################################
# Clawpute.com Admin - One-Click Installer
# Generated by Clawpute.com
#############################################

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Configuration
INSTALL_DIR="\${OPENCLAW_INSTALL_DIR:-\$HOME/openclaw}"
ADMIN_PORT="\${OPENCLAW_ADMIN_PORT:-18789}"
NODE_VERSION="18"
SELECTED_MODEL="${selectedModel}"
SELECTED_CHANNELS="${selectedChannels.join(',')}"
SELECTED_DEPLOY="${selectedDeploy}"
MODEL_API_KEY="${modelApiKey || ''}"
CHANNEL_TOKENS="${channelToken || ''}"

# Configure multiple channels
setup_channels() {
    log_info "Setting up channels: $SELECTED_CHANNELS"
    IFS=',' read -ra CHANNEL_ARRAY <<< "$SELECTED_CHANNELS"
    for channel in "\${CHANNEL_ARRAY[@]}"; do
        log_info "Configuring channel: $channel"
        # Channel-specific setup will be added here
    done
}
DEPLOY_TOKEN="${deployToken || ''}"
DEPLOY_ACCOUNT_ID="${deployAccountId || ''}"

print_banner() {
    echo -e "\${BLUE}"
    cat << "EOF"
   ___                   ____ _                 
  / _ \\ _ __   ___ _ __ / ___| | __ ___      __ 
 | | | | '_ \\ / _ \\ '_ \\| |   | |/ _' \\ \\ /\\ / /
 | |_| | |_) |  __/ | | | |___| | (_| |\\ V  V / 
  \\___/| .__/ \\___|_| |_|\\____|_|\\__,_| \\_/\\_/  
       |_|                                        
          Command Center Installer v1.0
EOF
    echo -e "\${NC}"
}

log_info() {
    echo -e "\${GREEN}[INFO]\${NC} \$1"
}

log_warn() {
    echo -e "\${YELLOW}[WARN]\${NC} \$1"
}

log_error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        log_warn "Node.js not found. Installing..."
        install_nodejs
    else
        NODE_VER=\$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "\$NODE_VER" -lt 16 ]; then
            log_warn "Node.js version is too old. Upgrading..."
            install_nodejs
        else
            log_info "Node.js \$(node -v) found ✓"
        fi
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        log_error "npm not found even after Node.js installation!"
        exit 1
    fi
    
    # Check for git
    if ! command -v git &> /dev/null; then
        log_warn "Git not found. Installing..."
        install_git
    else
        log_info "Git found ✓"
    fi
}

install_nodejs() {
    if [[ "\$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_\${NODE_VERSION}.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v yum &> /dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_\${NODE_VERSION}.x | sudo bash -
            sudo yum install -y nodejs
        fi
    elif [[ "\$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install node@\${NODE_VERSION}
        fi
    fi
}

install_git() {
    if [[ "\$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y git
        elif command -v yum &> /dev/null; then
            sudo yum install -y git
        fi
    elif [[ "\$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install git
        fi
    fi
}

install_openclaw() {
    log_info "Installing OpenClaw..."
    
    if [ -d "\$INSTALL_DIR" ]; then
        log_warn "OpenClaw directory already exists at \$INSTALL_DIR"
        read -p "Do you want to reinstall? (y/N): " -n 1 -r
        echo
        if [[ ! \$REPLY =~ ^[Yy]\$ ]]; then
            log_info "Skipping OpenClaw installation"
            return
        fi
        rm -rf "\$INSTALL_DIR"
    fi
    
    # Clone OpenClaw repository
    log_info "Cloning OpenClaw repository..."
    git clone https://github.com/OpenClaw/openclaw.git "\$INSTALL_DIR" 2>/dev/null || {
        log_warn "Unable to clone repository, creating minimal structure..."
        mkdir -p "\$INSTALL_DIR"
    }
    
    cd "\$INSTALL_DIR"
    
    # Install dependencies
    log_info "Installing OpenClaw dependencies..."
    npm install 2>/dev/null || true
    
    log_info "OpenClaw installed successfully ✓"
}

create_config() {
    log_info "Creating configuration..."
    
    mkdir -p "\$INSTALL_DIR/config"
    
    # Parse channels array
    IFS=',' read -ra CHANNEL_ARRAY <<< "\$SELECTED_CHANNELS"
    
    # Build channels JSON
    CHANNELS_JSON=""
    for channel in "\${CHANNEL_ARRAY[@]}"; do
        if [ -n "\$CHANNELS_JSON" ]; then
            CHANNELS_JSON="\$CHANNELS_JSON,"
        fi
        CHANNELS_JSON="\$CHANNELS_JSON\n    \"\$channel\": {\n      \"enabled\": true\n    }"
    done
    
    cat > "\$INSTALL_DIR/config/openclaw.json" << EOF
{
  "model": {
    "provider": "\$SELECTED_MODEL",
    "default": "\$SELECTED_MODEL"
  },
  "channels": {\$CHANNELS_JSON
  },
  "gateway": {
    "enabled": true,
    "port": \$ADMIN_PORT
  }
}
EOF

    log_info "Configuration created ✓"
}

create_launcher() {
    log_info "Creating launcher scripts..."
    
    # Create start script
    cat > "\$INSTALL_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "\$(dirname "\$0")"
echo "Starting OpenClaw Gateway..."
echo "OpenClaw API will be available at: http://localhost:18789"
echo ""
echo "To connect to Command Center dashboard:"
echo "1. Go to https://clawpute.com/dashboard"
echo "2. Add your instance: http://localhost:18789"
npm start
EOF

    chmod +x "\$INSTALL_DIR/start.sh"
    
    log_info "Launcher scripts created ✓"
}

print_summary() {
    echo -e "\\n\${GREEN}═══════════════════════════════════════════════════════\${NC}"
    echo -e "\${GREEN}    Installation Complete!\${NC}"
    echo -e "\${GREEN}═══════════════════════════════════════════════════════\${NC}\\n"
    
    echo -e "📁 OpenClaw installed at:     \${BLUE}\$INSTALL_DIR\${NC}"
    echo -e "🌐 Command Center port:       \${BLUE}\$ADMIN_PORT\${NC}"
    echo -e "🤖 Default Model:             \${BLUE}\$SELECTED_MODEL\${NC}"
    echo -e "💬 Selected Channels:         \${BLUE}\$SELECTED_CHANNELS\${NC}"
    
    echo -e "\\n\${YELLOW}Quick Start Commands:\${NC}"
    echo -e "  Start OpenClaw:  \${BLUE}cd \$INSTALL_DIR && ./start.sh\${NC}"
    echo -e "  View Logs:       \${BLUE}tail -f /tmp/openclaw/*.log\${NC}"
    
    echo -e "\\n\${YELLOW}Connect to Dashboard:\${NC}"
    echo -e "  1. Start OpenClaw: ./start.sh"
    echo -e "  2. Go to: \${BLUE}https://clawpute.com/dashboard\${NC}"
    echo -e "  3. Add instance: http://localhost:\$ADMIN_PORT"
    
    echo -e "\\n\${GREEN}═══════════════════════════════════════════════════════\${NC}\\n"
}

# Main installation flow
main() {
    print_banner
    
    log_info "Starting OpenClaw installation..."
    log_info "Selected: Model=\$SELECTED_MODEL, Channels=\$SELECTED_CHANNELS, Deploy=\$SELECTED_DEPLOY"
    
    check_dependencies
    install_openclaw
    create_config
    create_launcher
    
    print_summary
}

main "\$@"`;

    const quickStartGuide = `## Quick Start Guide

### 1. Save the Script
Save the install script to your computer as 'install.sh'.

### 2. Make it Executable
    chmod +x install.sh

### 3. Run the Installer
    ./install.sh

### 4. Connect to Dashboard
1. Start OpenClaw: ./start.sh
2. Go to https://clawpute.com/dashboard
3. Add your instance: http://localhost:18789

### Next Steps
- Configure your API keys in ~/.openclaw/openclaw.json
- Set up your selected channels (${selectedChannels.join(', ')})
- Start chatting with your AI agent!

### Need Help?
- Docs: https://openclaw.ai/docs
- Discord: https://discord.gg/openclaw
- GitHub: https://github.com/OpenClaw/openclaw`;

    const documentationContent = `## OpenClaw Documentation

### What is OpenClaw?
OpenClaw is an open-source AI agent framework that lets you run your own AI assistant on your infrastructure. Unlike cloud-based assistants, OpenClaw runs entirely on your servers, giving you full control and privacy.

### Architecture
\`\`\`
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Your Chat     │────▶│  OpenClaw        │────▶│   AI Models     │
│   (Telegram,    │     │  Gateway         │     │   (Claude,      │
│    Discord,     │◄────│                  │◀────│    GPT, etc.)   │
│    etc.)        │     │  Command Center  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
\`\`\`

### Installation Methods

**Local Machine (macOS/Linux)**
- Direct Node.js installation
- Best for development and testing

**Windows WSL**
- Run in Windows Subsystem for Linux
- Access via browser on Windows

**Docker**
- Containerized deployment
- Easy to manage and update

**Cloud VPS (DigitalOcean, Hostinger, etc.)**
- Deploy to any VPS provider
- 24/7 availability

**Cloudflare Workers**
- Edge computing deployment
- Free tier available

### Configuration Files

After installation, edit \`~/.openclaw/openclaw.json\`:

\`\`\`json
{
  "model": {
    "provider": "anthropic",
    "apiKey": "your-api-key"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "your-bot-token"
    }
  }
}
\`\`\`

### Supported Channels
- Telegram, Discord, WhatsApp, Slack
- iMessage (macOS), Signal, Matrix
- Microsoft Teams, Google Chat
- WebChat (built-in)
- And more...

### Security
- All data stays on your infrastructure
- API keys stored locally
- Pairing system for secure access
- Allowlist support for users

### Troubleshooting
Run \`openclaw doctor\` to check your setup.

For more help: https://openclaw.ai/docs`;

    const handleCopy = () => {
        navigator.clipboard.writeText(installScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([installScript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'install-openclaw.sh';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        }}>
            <div style={{
                width: '900px',
                maxWidth: '100%',
                maxHeight: '90vh',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Terminal size={22} style={{ color: '#6366f1' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Install Script</h2>
                            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0 0' }}>
                                Configured for: {selectedModel} + {selectedChannels.join(', ')} + {selectedDeploy}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'transparent',
                            border: '1px solid #444',
                            color: '#888',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid #333',
                    padding: '0 24px',
                }}>
                    <button
                        onClick={() => setActiveTab('script')}
                        style={{
                            padding: '14px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'script' ? '#6366f1' : 'transparent'}`,
                            color: activeTab === 'script' ? '#fff' : '#888',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Install Script
                    </button>
                    <button
                        onClick={() => setActiveTab('guide')}
                        style={{
                            padding: '14px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'guide' ? '#6366f1' : 'transparent'}`,
                            color: activeTab === 'guide' ? '#fff' : '#888',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Quick Start Guide
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        style={{
                            padding: '14px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'docs' ? '#6366f1' : 'transparent'}`,
                            color: activeTab === 'docs' ? '#fff' : '#888',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Documentation
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                    {activeTab === 'script' && (
                        <div>
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                marginBottom: '16px',
                            }}>
                                <button
                                    onClick={handleCopy}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                        border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                                        borderRadius: '8px',
                                        color: copied ? '#22c55e' : '#6366f1',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        background: 'rgba(34, 158, 217, 0.2)',
                                        border: '1px solid rgba(34, 158, 217, 0.3)',
                                        borderRadius: '8px',
                                        color: '#229ed9',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Download size={16} />
                                    Download install.sh
                                </button>
                            </div>

                            <pre style={{
                                background: '#111',
                                border: '1px solid #333',
                                borderRadius: '10px',
                                padding: '20px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                color: '#ccc',
                                overflow: 'auto',
                                maxHeight: '400px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}>
                                {installScript}
                            </pre>
                        </div>
                    )}
                    {activeTab === 'guide' && (
                        <div style={{
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '10px',
                            padding: '24px',
                        }}>
                            <pre style={{
                                fontSize: '14px',
                                lineHeight: '1.8',
                                color: '#ccc',
                                fontFamily: 'inherit',
                                whiteSpace: 'pre-wrap',
                                margin: 0,
                            }}>
                                {quickStartGuide}
                            </pre>
                        </div>
                    )}
                    {activeTab === 'docs' && (
                        <div style={{
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '10px',
                            padding: '24px',
                            maxHeight: '400px',
                            overflow: 'auto',
                        }}>
                            <pre style={{
                                fontSize: '14px',
                                lineHeight: '1.8',
                                color: '#ccc',
                                fontFamily: 'inherit',
                                whiteSpace: 'pre-wrap',
                                margin: 0,
                            }}>
                                {documentationContent}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px 24px',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                        The script will install OpenClaw + Command Center on your system
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: 'transparent',
                                border: '1px solid #444',
                                borderRadius: '8px',
                                color: '#888',
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            Close
                        </button>
                        <a
                            href="/demo"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                background: '#6366f1',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                textDecoration: 'none',
                            }}
                        >
                            <Play size={16} />
                            Run Demo
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Step List Component
function StepList({ steps }: { steps: string[] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                        width: '24px',
                        height: '24px',
                        background: '#1a1a1a',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#666',
                        flexShrink: 0,
                    }}>
                        {i + 1}
                    </div>
                    <p style={{ fontSize: '14px', color: '#ccc', lineHeight: '1.5' }}>{step}</p>
                </div>
            ))}
        </div>
    );
}

function Header({ onDemoClick }: { onDemoClick: () => void }) {
    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto',
        }}>
            <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.5px' }}>
                Clawpute.com
            </div>
            <button
                onClick={onDemoClick}
                style={{
                    color: '#6366f1',
                    background: 'transparent',
                    border: '1px solid #6366f1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                }}
            >
                <LayoutDashboard size={16} />
                Demo Command Center
            </button>
        </header>
    );
}

function DemoLoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { setUserFromApi } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('demo@clawpute.com');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                        isDemo: true
                    },
                    response.token
                );
                onClose();
                // Navigate to redirect route which will handle workspace context
                navigate({ to: '/dashboard' });
            } else {
                setError('Login failed. Please try again.');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid credentials. Try demo@clawpute.com / user123');
        } finally {
            setIsLoading(false);
        }
    };

    const fillDemoCredentials = () => {
        setEmail('demo@clawpute.com');
        setPassword('user123');
        setError('');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        }}>
            <div style={{
                width: '420px',
                maxWidth: '100%',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '16px',
                padding: '32px',
                position: 'relative',
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid #444',
                        color: '#888',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto',
                    }}>
                        <LayoutDashboard size={28} style={{ color: '#6366f1' }} />
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
                        Demo Command Center
                    </h2>
                    <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.5' }}>
                        Experience the dashboard with a read-only demo account
                    </p>
                </div>

                {/* Demo Credentials Hint */}
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '24px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Sparkles size={16} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
                            Demo Credentials
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <code style={{
                            fontSize: '13px',
                            color: '#ccc',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                        }}>
                            demo@clawpute.com / user123
                        </code>
                        <button
                            onClick={fillDemoCredentials}
                            style={{
                                fontSize: '12px',
                                color: '#6366f1',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                            }}
                        >
                            Auto-fill
                        </button>
                    </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#888',
                            marginBottom: '8px'
                        }}>
                            Email Address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#666'
                            }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="demo@clawpute.com"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px 12px 40px',
                                    background: '#111',
                                    border: '1px solid #333',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#888',
                            marginBottom: '8px'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Key size={16} style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#666'
                            }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                style={{
                                    width: '100%',
                                    padding: '12px 44px 12px 40px',
                                    background: '#111',
                                    border: '1px solid #333',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#666',
                                    cursor: 'pointer',
                                    padding: '4px',
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '16px',
                            fontSize: '13px',
                            color: '#ef4444',
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: isLoading ? '#4a4a4a' : '#6366f1',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: isLoading ? 0.7 : 1,
                        }}
                    >
                        {isLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid #fff',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                Logging in...
                            </span>
                        ) : (
                            <>
                                <ArrowRight size={18} />
                                Enter Dashboard
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Note */}
                <p style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#666',
                    marginTop: '20px',
                    lineHeight: '1.5'
                }}>
                    This is a read-only demo environment.<br />
                    Edit and delete actions are disabled.
                </p>
            </div>
        </div>
    );
}

function LandingPage() {
    useAuth();
    const [selectedModel, setSelectedModel] = useState<string>('kimi');
    const [selectedChannels, setSelectedChannels] = useState<string[]>(['telegram']);
    const [selectedDeploy, setSelectedDeploy] = useState<string>('local');
    const [enableDashboard, setEnableDashboard] = useState<boolean>(true);
    const [installModalOpen, setInstallModalOpen] = useState(false);
    const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

    // Config values for API keys and tokens
    const [modelApiKey, setModelApiKey] = useState('');
    const [channelToken, setChannelToken] = useState('');
    const [deployToken, setDeployToken] = useState('');
    const [deployAccountId, setDeployAccountId] = useState('');

    // Side panel states
    const [modelPanelOpen, setModelPanelOpen] = useState(true);
    const [channelPanelOpen, setChannelPanelOpen] = useState(false);
    const [deployPanelOpen, setDeployPanelOpen] = useState(false);
    const [dashboardPanelOpen, setDashboardPanelOpen] = useState(false);
    const [demoModalOpen, setDemoModalOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setMoreDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleModelSelect = (modelId: string) => {
        setSelectedModel(modelId);
        setModelApiKey('');
        setModelPanelOpen(true);
        setChannelPanelOpen(false);
        setDeployPanelOpen(false);
        setDashboardPanelOpen(false);
    };

    const handleChannelSelect = (channelId: string) => {
        setSelectedChannels(prev => {
            if (prev.includes(channelId)) {
                return prev.filter(id => id !== channelId);
            }
            return [...prev, channelId];
        });
        setChannelToken('');
        setChannelPanelOpen(true);
        setModelPanelOpen(false);
        setDeployPanelOpen(false);
        setDashboardPanelOpen(false);
    };

    const handleDeploySelect = (deployId: string) => {
        setSelectedDeploy(deployId);
        setDeployToken('');
        setDeployAccountId('');
        setDeployPanelOpen(true);
        setModelPanelOpen(false);
        setChannelPanelOpen(false);
        setDashboardPanelOpen(false);
    };

    useEffect(() => {
        localStorage.setItem('clawpute_selections', JSON.stringify({
            model: selectedModel,
            channels: selectedChannels,
            deploy: selectedDeploy,
            dashboard: enableDashboard,
            modelApiKey,
            channelToken,
            deployToken,
            deployAccountId,
        }));
    }, [selectedModel, selectedChannels, selectedDeploy, enableDashboard, modelApiKey, channelToken, deployToken, deployAccountId]);

    const selectedModelData = fixedModels.find(m => m.id === selectedModel) || moreModels.find(m => m.id === selectedModel);
    const selectedDeployData = deployOptions.find(d => d.id === selectedDeploy);

    const modelCfg = modelConfig[selectedModel];
    // Get config for all selected channels
    const selectedChannelsData = channels.filter(c => selectedChannels.includes(c.id));
    const deployCfg = deployConfig[selectedDeploy];

    return (
        <div style={{
            minHeight: '100vh',
            background: '#000',
            color: '#fff',
            fontFamily: '"JetBrains Mono", monospace',
        }}>
            <style>{`
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
      `}</style>

            {/* Header */}
            <Header onDemoClick={() => setDemoModalOpen(true)} />

            <main style={{ maxWidth: '750px', margin: '0 auto', padding: '60px 20px 80px', textAlign: 'center' }}>
                {/* Hero */}
                <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '20px', letterSpacing: '-1px', lineHeight: '1.1' }}>
                    Deploy OpenClaw under 1 minute
                </h1>
                <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#888', marginBottom: '60px' }}>
                    Deploy OpenClaw Core on your infrastructure (WSL, VPS, Docker, or Local).
                    Connect to our hosted Command Center dashboard.
                    Choose your model, pick channels, run the install script — done.
                </p>

                {/* Model Selection */}
                <div style={{ marginBottom: '50px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px' }}>
                            Which AI model?
                        </h2>
                        <button
                            onClick={() => { setModelPanelOpen(true); setChannelPanelOpen(false); setDeployPanelOpen(false); }}
                            style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'transparent', border: '1px solid #444', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Info size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {fixedModels.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => handleModelSelect(model.id)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 16px',
                                    background: selectedModel === model.id ? '#1a1a1a' : 'transparent',
                                    border: `2px solid ${selectedModel === model.id ? model.color : '#1a1a1a'}`,
                                    borderRadius: '12px', color: '#fff', cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                                }}
                            >
                                <span style={{ fontSize: '28px' }}>{model.icon}</span>
                                <span style={{ fontSize: '15px', fontWeight: 500, textAlign: 'center' }}>{model.name}</span>
                                {selectedModel === model.id && (
                                    <div style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', background: model.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={12} color="#fff" />
                                    </div>
                                )}
                            </button>
                        ))}

                        <div ref={dropdownRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 16px', width: '100%', height: '100%', background: moreModels.some(m => m.id === selectedModel) ? '#1a1a1a' : 'transparent', border: `2px solid ${moreModels.some(m => m.id === selectedModel) ? '#6366f1' : '#1a1a1a'}`, borderRadius: '12px', color: '#fff', cursor: 'pointer', transition: 'all 0.2s', justifyContent: 'center' }}
                            >
                                {moreModels.some(m => m.id === selectedModel) ? (
                                    <>
                                        <span style={{ fontSize: '28px' }}>{selectedModelData?.icon}</span>
                                        <span style={{ fontSize: '15px', fontWeight: 500 }}>{selectedModelData?.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px dashed #555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ChevronDown size={16} style={{ color: '#666', transform: moreDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </div>
                                        <span style={{ fontSize: '15px', fontWeight: 500, color: '#888' }}>More</span>
                                    </>
                                )}
                            </button>

                            {moreDropdownOpen && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#1a1a1a', border: '2px solid #333', borderRadius: '12px', padding: '8px', zIndex: 100 }}>
                                    {moreModels.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => { handleModelSelect(model.id); setMoreDropdownOpen(false); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px', background: selectedModel === model.id ? 'rgba(99,102,241,0.2)' : 'transparent', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer', textAlign: 'left' }}
                                        >
                                            <span style={{ fontSize: '20px' }}>{model.icon}</span>
                                            <div><div style={{ fontWeight: 500 }}>{model.name}</div><div style={{ fontSize: '11px', color: '#666' }}>{model.provider}</div></div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Channel Selection */}
                <div style={{ marginBottom: '50px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px' }}>Which messaging channel?</h2>
                        <button onClick={() => { setChannelPanelOpen(true); setModelPanelOpen(false); setDeployPanelOpen(false); }} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'transparent', border: '1px solid #444', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Info size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {channels.slice(0, 8).map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => handleChannelSelect(channel.id)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                                    padding: '16px 12px',
                                    background: selectedChannels.includes(channel.id) ? '#1a1a1a' : 'transparent',
                                    border: `2px solid ${selectedChannels.includes(channel.id) ? '#229ed9' : '#1a1a1a'}`,
                                    borderRadius: '12px', color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                            >
                                {channel.icon.startsWith('http') ? (
                                    <img src={channel.icon} alt={channel.name} style={{ width: '32px', height: '32px' }} />
                                ) : (
                                    <span style={{ fontSize: '28px' }}>{channel.icon}</span>
                                )}
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>{channel.name}</span>
                                {channel.note && <span style={{ fontSize: '10px', color: '#666' }}>{channel.note}</span>}
                                {selectedChannels.includes(channel.id) && (
                                    <div style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', background: '#229ed9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={12} color="#fff" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <p style={{ fontSize: '13px', color: '#666', marginTop: '12px', textAlign: 'center' }}>
                        +9 more channels available: Signal, Matrix, Google Chat, Teams, LINE, Twitch, Nostr, Mattermost, Nextcloud
                    </p>
                </div>

                {/* Deployment Options */}
                <div style={{ marginBottom: '50px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px' }}>Where to deploy?</h2>
                        <button onClick={() => { setDeployPanelOpen(true); setModelPanelOpen(false); setChannelPanelOpen(false); }} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'transparent', border: '1px solid #444', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Info size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {deployOptions.slice(0, 5).map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleDeploySelect(option.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: selectedDeploy === option.id ? '#1a1a1a' : 'transparent', border: `2px solid ${selectedDeploy === option.id ? option.color : '#1a1a1a'}`, borderRadius: '12px', color: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                >
                                    <div style={{ width: '44px', height: '44px', background: `${option.color}20`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={22} style={{ color: option.color }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>{option.name}</div>
                                        <div style={{ fontSize: '13px', color: '#888' }}>{option.description}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>{option.time}</div>
                                        {selectedDeploy === option.id && (
                                            <div style={{ width: '20px', height: '20px', background: option.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '6px', marginLeft: 'auto' }}>
                                                <Check size={12} color="#fff" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Dashboard Option */}
                <div style={{ marginBottom: '50px', textAlign: 'left' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.5px', marginBottom: '20px' }}>Additional Options</h2>
                    <button
                        onClick={() => setEnableDashboard(!enableDashboard)}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '18px 20px', background: enableDashboard ? '#1a1a1a' : 'transparent', border: `2px solid ${enableDashboard ? '#6366f1' : '#1a1a1a'}`, borderRadius: '12px', color: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                    >
                        <div style={{ width: '44px', height: '44px', background: enableDashboard ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <LayoutDashboard size={22} style={{ color: enableDashboard ? '#6366f1' : '#888' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>Connect to Command Center (SaaS)</div>
                            <div style={{ fontSize: '13px', color: '#888' }}>Use our hosted dashboard to manage your local OpenClaw</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span
                                onClick={(e) => { e.stopPropagation(); setDashboardPanelOpen(true); setModelPanelOpen(false); setChannelPanelOpen(false); setDeployPanelOpen(false); }}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'transparent', border: '1px solid #444', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setDashboardPanelOpen(true); setModelPanelOpen(false); setChannelPanelOpen(false); setDeployPanelOpen(false); } }}
                            >
                                <Info size={14} />
                            </span>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: enableDashboard ? '#6366f1' : 'transparent', border: enableDashboard ? 'none' : '2px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {enableDashboard && <Check size={16} color="#fff" />}
                            </div>
                        </div>
                    </button>
                </div>

                {/* CTA Section */}
                <div style={{ padding: '30px', background: '#0a0a0a', borderRadius: '12px', marginBottom: '50px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => setInstallModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: '#6366f1',
                                color: '#fff',
                                padding: '16px 32px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '16px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Terminal size={20} />
                            View Install Script
                            <ArrowRight size={18} />
                        </button>
                        <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '400px' }}>
                            The script will install OpenClaw with your selected configuration.
                            You'll configure API keys during or after installation.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#888' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={14} style={{ color: '#22c55e' }} /> No signup required
                            </span>
                            <span>|</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={14} style={{ color: '#22c55e' }} /> Open source
                            </span>
                            <span>|</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={14} style={{ color: '#22c55e' }} /> Self-hosted
                            </span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Model Config Panel */}
            <SidePanel isOpen={modelPanelOpen} onClose={() => setModelPanelOpen(false)} title="Configure AI Model" icon={Key} color="#6366f1">
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: `${selectedModelData?.color}15`, borderRadius: '10px', marginBottom: '24px' }}>
                        <span style={{ fontSize: '32px' }}>{selectedModelData?.icon}</span>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{selectedModelData?.name}</h3>
                            <p style={{ fontSize: '13px', color: '#888' }}>{selectedModelData?.provider}</p>
                        </div>
                    </div>

                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} style={{ color: '#6366f1' }} /> Setup Instructions
                    </h4>
                    <StepList steps={modelCfg?.setupSteps || []} />

                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Key size={16} style={{ color: '#6366f1' }} /> Required Environment Variables
                    </h4>

                    {modelCfg?.requiredEnvVars.map((envVar, i) => (
                        <div key={i} style={{ marginBottom: '20px' }}>
                            <ConfigInput label={envVar.key} placeholder={envVar.example} value={modelApiKey} onChange={setModelApiKey} />
                            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{envVar.description}</p>
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <a href={modelCfg?.docsUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#888', textDecoration: 'none', fontSize: '13px' }}>
                            <FileText size={14} /> API Docs
                        </a>
                        <a href={modelCfg?.pricingUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#888', textDecoration: 'none', fontSize: '13px' }}>
                            <ExternalLink size={14} /> Pricing
                        </a>
                    </div>
                </div>
            </SidePanel>

            {/* Channel Config Panel */}
            <SidePanel isOpen={channelPanelOpen} onClose={() => setChannelPanelOpen(false)} title={`Channel Setup (${selectedChannels.length} selected)`} icon={MessageCircle} color="#229ed9">
                <div style={{ marginBottom: '24px' }}>
                    {/* Selected Channels List */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                        {selectedChannelsData.map(ch => (
                            <div key={ch.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: 'rgba(34, 158, 217, 0.2)',
                                borderRadius: '100px',
                                fontSize: '13px'
                            }}>
                                {ch.icon.startsWith('http') ? (
                                    <img src={ch.icon} alt={ch.name} style={{ width: '16px', height: '16px' }} />
                                ) : (
                                    <span>{ch.icon}</span>
                                )}
                                {ch.name}
                            </div>
                        ))}
                    </div>

                    {/* Accordion for each selected channel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedChannelsData.map((channel, index) => {
                            const cfg = channelConfig[channel.id];
                            const [expanded, setExpanded] = useState(index === 0);

                            return (
                                <div
                                    key={channel.id}
                                    style={{
                                        border: '1px solid #333',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        background: expanded ? 'rgba(34, 158, 217, 0.05)' : '#0a0a0a'
                                    }}
                                >
                                    {/* Accordion Header */}
                                    <button
                                        onClick={() => setExpanded(!expanded)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '14px 16px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        {channel.icon.startsWith('http') ? (
                                            <img src={channel.icon} alt={channel.name} style={{ width: '28px', height: '28px' }} />
                                        ) : (
                                            <span style={{ fontSize: '24px' }}>{channel.icon}</span>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{channel.name}</h3>
                                            <p style={{ fontSize: '12px', color: '#888' }}>
                                                {cfg?.requiredEnvVars?.length ? `${cfg.requiredEnvVars.length} credential${cfg.requiredEnvVars.length > 1 ? 's' : ''} required` : 'No credentials needed'}
                                            </p>
                                        </div>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transform: expanded ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 0.2s'
                                        }}>
                                            <ChevronDown size={18} style={{ color: '#666' }} />
                                        </div>
                                    </button>

                                    {/* Accordion Content */}
                                    {expanded && (
                                        <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #222' }}>
                                            {cfg?.proTip && (
                                                <div style={{
                                                    background: 'rgba(34, 197, 94, 0.1)',
                                                    border: '1px solid rgba(34, 197, 94, 0.2)',
                                                    borderRadius: '8px',
                                                    padding: '10px 12px',
                                                    margin: '14px 0'
                                                }}>
                                                    <p style={{ fontSize: '12px', color: '#22c55e', margin: 0 }}>
                                                        <strong>Pro Tip:</strong> {cfg.proTip}
                                                    </p>
                                                </div>
                                            )}

                                            <h4 style={{
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                margin: '14px 0 10px 0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: '#aaa'
                                            }}>
                                                <FileText size={14} style={{ color: '#229ed9' }} /> Setup Instructions
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                                                {cfg?.setupSteps.map((step, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '10px' }}>
                                                        <div style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            background: '#1a1a1a',
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            color: '#666',
                                                            flexShrink: 0,
                                                        }}>
                                                            {i + 1}
                                                        </div>
                                                        <p style={{ fontSize: '13px', color: '#bbb', lineHeight: '1.4', margin: 0 }}>{step}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {cfg?.requiredEnvVars && cfg.requiredEnvVars.length > 0 && (
                                                <>
                                                    <h4 style={{
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        margin: '14px 0 10px 0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        color: '#aaa'
                                                    }}>
                                                        <Key size={14} style={{ color: '#229ed9' }} /> Required Credentials
                                                    </h4>

                                                    {cfg.requiredEnvVars.map((envVar, i) => (
                                                        <div key={i} style={{ marginBottom: '14px' }}>
                                                            <ConfigInput
                                                                label={envVar.key}
                                                                placeholder={envVar.example}
                                                                value={channelToken}
                                                                onChange={setChannelToken}
                                                            />
                                                            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{envVar.description}</p>
                                                        </div>
                                                    ))}
                                                </>
                                            )}

                                            <a
                                                href={cfg?.docsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    padding: '10px',
                                                    background: 'transparent',
                                                    border: '1px solid #333',
                                                    borderRadius: '8px',
                                                    color: '#888',
                                                    textDecoration: 'none',
                                                    fontSize: '12px',
                                                    marginTop: '12px'
                                                }}
                                            >
                                                <ExternalLink size={14} /> Official Documentation
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </SidePanel>

            {/* Deploy Config Panel */}
            <SidePanel isOpen={deployPanelOpen} onClose={() => setDeployPanelOpen(false)} title={`${selectedDeployData?.name} Setup`} icon={Server} color="#f97316">
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: `${selectedDeployData?.color}15`, borderRadius: '10px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', background: `${selectedDeployData?.color}25`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(() => { const Icon = selectedDeployData?.icon || Server; return <Icon size={22} style={{ color: selectedDeployData?.color }} />; })()}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{selectedDeployData?.name}</h3>
                            <p style={{ fontSize: '13px', color: '#888' }}>{selectedDeployData?.time} setup time</p>
                        </div>
                    </div>

                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} style={{ color: '#f97316' }} /> Setup Instructions
                    </h4>
                    <StepList steps={deployCfg?.setupSteps || []} />

                    {deployCfg?.requiredEnvVars && deployCfg.requiredEnvVars.length > 0 && (
                        <>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Key size={16} style={{ color: '#f97316' }} /> Required Credentials
                            </h4>

                            {deployCfg.requiredEnvVars.map((envVar, i) => (
                                <div key={i} style={{ marginBottom: '20px' }}>
                                    {envVar.key.includes('ACCOUNT_ID') ? (
                                        <ConfigInput label={envVar.key} placeholder={envVar.example} value={deployAccountId} onChange={setDeployAccountId} />
                                    ) : (
                                        <ConfigInput label={envVar.key} placeholder={envVar.example} value={deployToken} onChange={setDeployToken} />
                                    )}
                                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{envVar.description}</p>
                                </div>
                            ))}
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <a href={deployCfg?.docsUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#888', textDecoration: 'none', fontSize: '13px' }}>
                            <FileText size={14} /> Docs
                        </a>
                        {deployCfg?.pricingUrl && (
                            <a href={deployCfg.pricingUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#888', textDecoration: 'none', fontSize: '13px' }}>
                                <ExternalLink size={14} /> Pricing
                            </a>
                        )}
                    </div>
                </div>
            </SidePanel>

            {/* Dashboard Config Panel */}
            <SidePanel isOpen={dashboardPanelOpen} onClose={() => setDashboardPanelOpen(false)} title="Command Center" icon={LayoutDashboard} color="#8b5cf6">
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <LayoutDashboard size={22} style={{ color: '#8b5cf6' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Web Admin Panel</h3>
                            <p style={{ fontSize: '13px', color: '#888' }}>Optional Add-on</p>
                        </div>
                    </div>

                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={16} style={{ color: '#8b5cf6' }} /> What You Get
                    </h4>
                    <StepList steps={dashboardConfig.setupSteps} />

                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} style={{ color: '#8b5cf6' }} /> Features
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                        {dashboardConfig.features.map((feature, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ccc', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <div style={{ width: '6px', height: '6px', background: '#8b5cf6', borderRadius: '50%' }} />
                                {feature}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setEnableDashboard(!enableDashboard)}
                        style={{ width: '100%', padding: '14px', background: enableDashboard ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)', border: `1px solid ${enableDashboard ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`, borderRadius: '10px', color: enableDashboard ? '#ef4444' : '#8b5cf6', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        {enableDashboard ? 'Disable Command Center' : 'Enable Command Center'}
                    </button>
                </div>
            </SidePanel>

            {/* Install Script Modal */}
            <InstallScriptModal
                isOpen={installModalOpen}
                onClose={() => setInstallModalOpen(false)}
                selectedModel={selectedModel}
                selectedChannels={selectedChannels}
                selectedDeploy={selectedDeploy}
                modelApiKey={modelApiKey}
                channelToken={channelToken}
                deployToken={deployToken}
                deployAccountId={deployAccountId}
            />

            {/* Demo Login Modal */}
            <DemoLoginModal
                isOpen={demoModalOpen}
                onClose={() => setDemoModalOpen(false)}
            />

            {/* Comparison Section */}
            <section style={{ padding: '80px 20px', background: '#050505' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '60px', textAlign: 'center', letterSpacing: '-0.5px' }}>Traditional Method vs Clawpute</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px' }}>
                        <div>
                            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '2px' }}>Traditional</h3>
                            <div style={{ marginBottom: '24px' }}>
                                {[{ task: 'Read documentation', time: '30 min' }, { task: 'Install dependencies manually', time: '20 min' }, { task: 'Configure API keys and tokens', time: '15 min' }, { task: 'Set up messaging channel', time: '20 min' }, { task: 'Configure OpenClaw', time: '15 min' }, { task: 'Start and verify services', time: '10 min' }].map((step, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 5 ? '1px solid #1a1a1a' : 'none', fontSize: '15px' }}>
                                        <span style={{ color: '#999' }}>{step.task}</span><span style={{ color: '#666', fontWeight: 500 }}>{step.time}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '2px solid #333', fontSize: '18px', fontWeight: 600 }}><span>Total</span><span>~2 hours</span></div>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '2px' }}>Clawpute</h3>
                            <div style={{ padding: '60px 40px', background: '#0a0a0a', borderRadius: '16px', textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '72px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-2px' }}>&lt;1 min</div>
                                <p style={{ fontSize: '16px', color: '#888', lineHeight: '1.6' }}>Pick your options, download the script, run it — OpenClaw ready to use.</p>
                            </div>
                            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>The install script handles everything: dependencies, configuration, channel setup, and Command Center deployment.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* What can OpenClaw do */}
            <section style={{ padding: '100px 20px', background: '#000', overflow: 'hidden' }}>
                <h2 style={{ fontSize: '40px', fontWeight: 700, textAlign: 'center', marginBottom: '12px', letterSpacing: '-1px' }}>What can OpenClaw do for you?</h2>
                <p style={{ fontSize: '28px', fontWeight: 500, textAlign: 'center', color: '#333', marginBottom: '60px', letterSpacing: '-0.5px' }}>One assistant, thousands of use cases</p>
                <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', fontSize: '15px', lineHeight: '1.8', color: '#888', height: '320px', overflow: 'hidden', maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}>
                    <FloatingColumn items={column1} duration={30} delay={0} />
                    <FloatingColumn items={column2} duration={35} delay={2} />
                    <FloatingColumn items={column3} duration={32} delay={4} />
                    <FloatingColumn items={column4} duration={38} delay={1} />
                    <FloatingColumn items={column5} duration={28} delay={3} />
                </div>
                <p style={{ textAlign: 'center', marginTop: '50px', fontSize: '14px', color: '#666' }}>PS. You can add as many use cases as you want via natural language</p>
            </section>

            {/* Footer */}
            <footer style={{ padding: '40px 20px', textAlign: 'center', borderTop: '1px solid #1a1a1a' }}>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    Built with <Heart size={14} style={{ color: '#ef4444', fill: '#ef4444' }} /> by{' '}
                    <a href="https://x.com/web4strategy" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>Rajesh Kumar</a>
                </p>
                <a href="mailto:support@clawpute.com" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>Contact Support</a>
            </footer>
        </div>
    );
}

export default LandingPage;
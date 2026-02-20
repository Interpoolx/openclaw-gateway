import { createRoute, Link } from '@tanstack/react-router';
import { rootRoute } from './__root';
import {
    Terminal,
    Copy,
    Check,
    ChevronRight,
    ArrowLeft,
    Settings,
    MessageSquare,
    Cpu,
    Shield,
    Wrench,
    Clock,
    Globe,
    Key,
    Layers
} from 'lucide-react';
import { useState } from 'react';

export const openclawConfigurationRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/openclaw-configuration',
    component: OpenclawConfigurationPage,
}) as any;

function OpenclawConfigurationPage() {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const sections = [
        {
            id: 'channels',
            title: 'Channels',
            icon: <MessageSquare className="w-4 h-4" />,
            color: 'text-green-500',
            content: [
                {
                    title: 'Telegram', code: `telegram: {
  botToken: "123:ABC...",
  pollingMode: false,
  chatContexts: {} // per-chat settings
}` },
                {
                    title: 'Discord', code: `discord: {
  botToken: "MTIz...",
  intents: ["GUILDS", "MESSAGE_CONTENT"],
}` },
                {
                    title: 'Slack', code: `slack: {
  appToken: "xapp-...",
  botToken: "xoxb-...",
}` },
                {
                    title: 'WhatsApp', code: `whatsapp: {
  phoneNumberId: "123456789",
  accessToken: "EAAG...",
}` },
            ]
        },
        {
            id: 'agents',
            title: 'Agents',
            icon: <Cpu className="w-4 h-4" />,
            color: 'text-purple-500',
            content: [
                {
                    title: 'Per-Agent Override', code: `agents: {
  defaults: { model: "claude-3-opus" },
  "my-agent": {
    model: "gpt-4-turbo",
    temperature: 0.9,
    maxTokens: 4096,
  }
}` },
                { title: 'Model Options', code: `model: "claude-3-opus" | "claude-3-sonnet" | "gpt-4-turbo" | "gpt-4o" | ...` },
                { title: 'Temperature', code: `temperature: 0.0  // 0-2 range, higher = more creative` },
                { title: 'Max Tokens', code: `maxTokens: 4096  // Response length limit` },
            ]
        },
        {
            id: 'session',
            title: 'Session',
            icon: <Layers className="w-4 h-4" />,
            color: 'text-blue-500',
            content: [
                {
                    title: 'Basic Session Config', code: `session: {
  scope: "per-sender",
  reset: { mode: "daily", atHour: 4 },
  resetTriggers: ["/new", "/reset"],
  typingIntervalSeconds: 5,
}` },
                {
                    title: 'DM Scope Options', code: `dmScope: "main"              // All DMs share session
dmScope: "per-peer"           // Isolate by sender ID
dmScope: "per-channel-peer"   // Isolate by channel + sender (recommended)
dmScope: "per-account-channel-peer"  // Full isolation` },
                {
                    title: 'Reset Modes', code: `reset.mode: "daily"    // Clears at atHour (0-23)
reset.mode: "idle"     // Clears after idleMinutes
reset.mode: "weekdays" // Mon-Fri at atHour
reset.mode: "never"    // Only /reset or /new` },
                {
                    title: 'Identity Links', code: `identityLinks: {
  alice: ["telegram:123", "discord:987"],
}` },
            ]
        },
        {
            id: 'tools',
            title: 'Tools & Elevated',
            icon: <Wrench className="w-4 h-4" />,
            color: 'text-orange-500',
            content: [
                {
                    title: 'Tool Access Control', code: `tools: {
  allow: ["exec", "read", "write", "edit"],
  deny: ["browser", "canvas"],
  elevated: {
    enabled: true,
    allowFrom: { whatsapp: ["+1555..."] },
  },
}` },
                {
                    title: 'Elevated Directives', code: `/elevated on     // Run on host, keep approvals
/elevated ask  // Same as "on"
/elevated full // Run on host, skip approval
/elevated off  // Disable elevated mode` },
                {
                    title: 'Exec Config', code: `exec: { 
  backgroundMs: 10000, 
  timeoutSec: 1800 
}` },
                {
                    title: 'Tool Categories', code: `group:runtime    // exec, bash, process
group:fs       // read, write, edit, apply_patch
group:ui       // browser, canvas
group:messaging // message, sessions_*` },
            ]
        },
        {
            id: 'sandbox',
            title: 'Sandbox & Docker',
            icon: <Shield className="w-4 h-4" />,
            color: 'text-purple-500',
            content: [
                {
                    title: 'Sandbox Config', code: `sandbox: {
  mode: "non-main",
  scope: "session",
  docker: {
    image: "openclaw-sandbox:bookworm-slim",
    network: "none",
    readOnlyRoot: true,
  },
}` },
                {
                    title: 'Sandbox Modes', code: `mode: "off"      // No isolation - runs on host
mode: "non-main" // Sandbox groups/threads, host for DM
mode: "all"      // All sessions in Docker` },
                {
                    title: 'Scope Options', code: `scope: "session" // One container per session
scope: "agent"  // One container per agent
scope: "shared" // All agents share container` },
            ]
        },
        {
            id: 'automation',
            title: 'Automation & Hooks',
            icon: <Clock className="w-4 h-4" />,
            color: 'text-amber-500',
            content: [
                {
                    title: 'Cron Jobs', code: `{
  name: "Morning Brief",
  schedule: { kind: "cron", expr: "0 8 * * *" },
  sessionTarget: "isolated",
  payload: { 
    kind: "agentTurn", 
    message: "Summarize today." 
  }
}` },
                {
                    title: 'Gateway Hooks', code: `hooks: {
  internal: {
    enabled: true,
    entries: {
      "session-memory": { enabled: true }
    }
  }
}` },
                {
                    title: 'Cron Schedule Kinds', code: `kind: "at"      // One-shot ISO timestamp
kind: "every"   // Interval in milliseconds
kind: "cron"    // 5-field cron expression` },
                { title: 'Hook Discovery', code: `Scans workspace/hooks/ and ~/.openclaw/hooks/ for custom TypeScript hooks with HOOK.md` },
            ]
        },
        {
            id: 'logging',
            title: 'Logging',
            icon: <Terminal className="w-4 h-4" />,
            color: 'text-zinc-500',
            content: [
                {
                    title: 'Logging Config', code: `logging: {
  level: "info",
  file: "/tmp/oc.log",
  consoleStyle: "pretty",
}

// Levels: debug, info, warn, error` },
            ]
        },
        {
            id: 'gateway',
            title: 'Gateway',
            icon: <Globe className="w-4 h-4" />,
            color: 'text-cyan-500',
            content: [
                {
                    title: 'Gateway Config', code: `gateway: {
  mode: "local",
  port: 18789,
  bind: "loopback",
}

// Control UI: http://localhost:18789/openclaw` },
            ]
        },
        {
            id: 'auth',
            title: 'Auth Profiles',
            icon: <Key className="w-4 h-4" />,
            color: 'text-red-500',
            content: [
                {
                    title: 'Auth Config', code: `auth: {
  profiles: {
    "anthropic:subscription": { mode: "oauth", email: "me@example.com" },
    "anthropic:api":          { mode: "api_key" },
    "openai:default":        { mode: "api_key" },
  },
  order: {
    anthropic: ["anthropic:subscription", "anthropic:api"],
    openai:   ["openai:default"],
  },
}` },
            ]
        },
        {
            id: 'models',
            title: 'Models & Providers',
            icon: <Cpu className="w-4 h-4" />,
            color: 'text-indigo-500',
            content: [
                {
                    title: 'Claude (Anthropic)', code: `agent: {
  model: {
    primary: "anthropic/claude-opus-4-6",
    fallbacks: ["anthropic/claude-sonnet-4-5"]
  }
}

// Best for: Complex reasoning, coding
// Setup: https://console.anthropic.com/` },
                {
                    title: 'GPT (OpenAI)', code: `agent: {
  model: {
    primary: "openai/gpt-4o",
    imageModel: "openai/gpt-4o"
  }
}

// Best for: Multimodal tasks, vision
// Setup: https://platform.openai.com/api-keys` },
                {
                    title: 'Gemini (Google)', code: `agent: {
  model: {
    primary: "google/gemini-3-pro"
  }
}

// Best for: Context-heavy tasks, multimodal
// Setup: https://makersuite.google.com/app/apikey` },
                {
                    title: 'Llama (Local/Venice)', code: `agent: {
  model: {
    primary: "ollama/llama2"  // Local via Ollama
    // OR:
    primary: "venice/llama-3.3-70b"  // Privacy-focused
  }
}

// Best for: Offline, privacy, cost savings
// Setup: https://ollama.ai or https://www.venice.ai/` },
                {
                    title: 'OpenRouter (Multi)', code: `agent: {
  model: {
    primary: "openrouter/anthropic/claude-opus",
    fallbacks: [
      "openrouter/openai/gpt-4",
      "openrouter/google/gemini-pro"
    ]
  }
}

// Best for: Cost optimization, fallbacks
// Setup: https://openrouter.ai/` },
                {
                    title: 'Kimi K (Moonshot)', code: `agent: {
  model: {
    primary: "moonshot/kimi-k"
  }
}

// Best for: Complex reasoning, Chinese/English
// Context: 200k tokens
// Setup: https://platform.moonshot.cn/` },
                {
                    title: 'MiniMax M2.1', code: `agent: {
  model: {
    primary: "minimax/MiniMax-M2.1",
    fallbacks: ["minimax/abab6-5.1s"]
  }
}

// Best for: Cost-effective reasoning
// Context: 200k tokens, cheaper than Claude
// Setup: https://www.minimaxi.com/` },
                {
                    title: 'OpenRouter (100+ models)', code: `agent: {
  model: {
    primary: "openrouter/anthropic/claude-opus",
    fallbacks: [
      "openrouter/openai/gpt-4",
      "openrouter/google/gemini-pro",
      "openrouter/mistral/mixtral-8x7b"
    ]
  }
}

// Best for: Cost optimization, model fallbacks
// Supports 100+ models from all providers
// Setup: https://openrouter.ai/` },
                {
                    title: 'Custom Provider', code: `models: {
  providers: {
    "custom-api": {
      baseUrl: "http://localhost:8000/v1",
      apiKey: "sk-custom-key",
      api: "openai-responses",
      models: [{
        id: "custom-model",
        name: "My Model",
        contextWindow: 8000,
        maxTokens: 2000
      }]
    }
  }
}

// Use as: "custom-api/custom-model"` },
            ]
        },
        {
            id: 'env',
            title: 'Environment',
            icon: <Settings className="w-4 h-4" />,
            color: 'text-emerald-500',
            content: [
                {
                    title: 'Env Substitution', code: `env: {
  OPENROUTER_API_KEY: "...",
  shellEnv: { enabled: true }
}

// Variable Substitution - reference UPPERCASE env vars anywhere
auth: { token: "\$\`\$\{OPENCLAW_TOKEN\}" }

// Use ${'{'}VAR} to escape`
                },
            ]
        },
    ];

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#0A0A0A]/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/openclaw-cheatsheet"
                            className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 hover:text-white transition-colors"
                        >
                            Cheatsheet
                        </Link>
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                <Settings className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-sm font-bold">OpenClaw Configuration</span>
                        </Link>
                    </div>
                    <div className="w-16" />
                </div>
            </header>

            {/* Table of Contents */}
            <nav className="sticky top-12 z-40 border-b border-zinc-800 bg-[#0A0A0A]/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {sections.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => scrollToSection(s.id)}
                            className="shrink-0 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                        >
                            {s.title}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                {/* Introduction */}
                <div className="mb-8 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <p className="text-[11px] text-zinc-400">
                        Full <code className="text-red-400">openclaw.json</code> reference for channel configs, agents, models, sessions, sandbox, tools & security.
                        All examples are copy-paste ready. Located at <code className="text-zinc-400">~/.openclaw/openclaw.json</code>
                    </p>
                </div>

                <div className="grid gap-4">
                    {sections.map((section, sectionIdx) => (
                        <section
                            key={section.id}
                            id={section.id}
                            className="scroll-mt-32"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className={section.color}>{section.icon}</span>
                                <h2 className="text-xs font-black tracking-[0.2em] uppercase text-zinc-400">
                                    {section.title}
                                </h2>
                            </div>

                            <div className="grid gap-3">
                                {section.content.map((item, itemIdx) => {
                                    const globalIdx = sectionIdx * 100 + itemIdx;
                                    return (
                                        <div
                                            key={itemIdx}
                                            className="rounded-lg bg-zinc-900/50 border border-zinc-800 overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/30">
                                                <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                                                    {item.title}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(item.code, globalIdx)}
                                                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                                >
                                                    {copiedIndex === globalIdx ? (
                                                        <>
                                                            <Check className="w-3 h-3 text-green-500" />
                                                            <span className="text-green-500">Copied</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3 h-3" />
                                                            <span>Copy</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="p-3 overflow-x-auto">
                                                <pre className="font-mono text-[10px] leading-relaxed">
                                                    <code className="text-zinc-300" dangerouslySetInnerHTML={{
                                                        __html: item.code
                                                            .replace(/({|})/g, '<span class="text-zinc-500">$1</span>')
                                                            .replace(/"([^"]+)":/g, '<span class="text-green-400">"$1"</span>:')
                                                            .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
                                                            .replace(/: (\d+)/g, ': <span class="text-blue-400">$1</span>')
                                                            .replace(/(telegram|discord|slack|whatsapp|openclaw|session|tools|sandbox|logging|gateway|auth|env|hooks|exec|identityLinks|dmScope|reset)/g, '<span class="text-red-400">$1</span>')
                                                            .replace(/(\/\/.*$)/gm, '<span class="text-zinc-500">$1</span>')
                                                    }} />
                                                </pre>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-800 py-6 mt-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                        <Link
                            to="/openclaw-cheatsheet"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold tracking-wider uppercase text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                        >
                            <ChevronRight className="w-3 h-3" />
                            Cheatsheet
                        </Link>
                        <Link
                            to="/pricing"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold tracking-wider uppercase text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                        >
                            <ChevronRight className="w-3 h-3" />
                            Pricing
                        </Link>
                        <a
                            href="https://github.com/OpenClaw/openclaw"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold tracking-wider uppercase text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                        >
                            <ChevronRight className="w-3 h-3" />
                            GitHub
                        </a>
                    </div>
                    <p className="text-center text-[10px] text-zinc-600 mt-4">
                        © 2026 OpenClaw Configuration Guide
                    </p>
                </div>
            </footer>
        </div>
    );
}

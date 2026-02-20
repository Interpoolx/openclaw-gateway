import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useState, useRef, useMemo, useEffect } from 'react';
import { Layout } from '../components/Layout';
import {
    Power, Terminal,
    Users, Hash, MessageSquare, RefreshCw, Layers, Shield,
    Activity, Cpu, Info, Send, CheckCircle, XCircle, Clock
} from 'lucide-react';

export const directTestV2Route = createRoute({
    getParentRoute: () => rootRoute,
    path: 'direct-test-v2',
    component: DirectTestPage,
}) as any;

interface Session {
    id: string;
    name: string;
    gatewayId?: string;
    agentName?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

// Unused Agent interface
/*
interface Agent {
    name: string;
    sessions: Session[];
}
*/

interface HealthData {
    uptime?: number;
    memory?: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
    };
    cpu?: number;
}

function DirectTestPage() {
    const [url, setUrl] = useState('ws://localhost:18789');
    const [token, setToken] = useState('728a7307166292b0d62b2a8232f55e4cfa3daacb2991e4f2');
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [logs, setLogs] = useState<{ msg: string; type: 'info' | 'success' | 'error' | 'warn'; timestamp: number }[]>([]);
    const [activeTab, setActiveTab] = useState<'sessions' | 'agents' | 'logs' | 'stats'>('logs');

    // Data State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [health, setHealth] = useState<HealthData | null>(null);
    const [version, setVersion] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [protocolVersion, setProtocolVersion] = useState<number | null>(null);
    const [sending, setSending] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const pendingRequests = useRef<Map<string, (res: any) => void>>(new Map());
    const requestTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const logsEndRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Auto-scroll messages to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
        setLogs(prev => [...prev, { msg, type, timestamp: Date.now() }]);
    };

    const sendRequest = (method: string, params: any = {}, timeoutMs = 10000) => {
        const id = Math.random().toString(36).substring(2, 11);
        const req = { type: 'req', id, method, params };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(req));
            addLog(`↗ Request: ${method} [${id}]`, 'info');

            return new Promise((resolve, reject) => {
                pendingRequests.current.set(id, resolve);

                // Set timeout for request
                const timeout = setTimeout(() => {
                    if (pendingRequests.current.has(id)) {
                        pendingRequests.current.delete(id);
                        addLog(`⏱ Timeout: ${method} [${id}]`, 'error');
                        reject(new Error(`Request timeout: ${method}`));
                    }
                }, timeoutMs);

                requestTimeouts.current.set(id, timeout);
            });
        }
        return Promise.reject(new Error('WebSocket not connected'));
    };

    const connect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setStatus('connecting');
        setActiveTab('logs');
        setLogs([]);
        addLog(`🔌 Initiating connection to ${url}...`, 'info');

        const cleanedToken = token.trim();
        const fullUrl = `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(cleanedToken)}`;

        try {
            const ws = new WebSocket(fullUrl);
            wsRef.current = ws;

            const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    addLog('⏱ Connection timeout (10s)', 'error');
                    setStatus('error');
                    ws.close();
                }
            }, 10000);

            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                addLog('✓ WebSocket connection established', 'success');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle Response messages
                    if (data.type === 'res') {
                        const resolve = pendingRequests.current.get(data.id);
                        const timeout = requestTimeouts.current.get(data.id);

                        if (timeout) {
                            clearTimeout(timeout);
                            requestTimeouts.current.delete(data.id);
                        }

                        if (resolve) {
                            pendingRequests.current.delete(data.id);

                            if (data.ok) {
                                addLog(`✓ Response: ${data.id}`, 'success');
                                resolve(data);
                            } else {
                                const errorMsg = data.error?.message || data.error || 'Unknown error';
                                addLog(`✗ Error: ${errorMsg} [${data.id}]`, 'error');
                                resolve(data);
                            }
                        }
                        return;
                    }

                    // Handle Event messages
                    if (data.type === 'event') {
                        addLog(`📥 Event: ${data.event}`, 'info');

                        if (data.event === 'connect.challenge') {
                            addLog('🔐 Challenge received, sending handshake...', 'info');
                            sendRequest('connect', {
                                minProtocol: 3,
                                maxProtocol: 3,
                                client: {
                                    id: 'webchat',
                                    version: '0.5.0',
                                    platform: 'web',
                                    mode: 'webchat'
                                },
                                role: 'operator',
                                scopes: ['operator.read', 'operator.write'],
                                caps: [],
                                commands: [],
                                permissions: {},
                                auth: { token: cleanedToken },
                                locale: 'en-US',
                                userAgent: 'ClawTabs/0.2.0'
                            }).then((res: any) => {
                                if (res.ok) {
                                    addLog('🎉 Handshake successful!', 'success');
                                    setStatus('connected');

                                    // Extract version from payload
                                    if (res.payload?.version) {
                                        setVersion(res.payload.version);
                                        addLog(`📦 OpenClaw Version: ${res.payload.version}`, 'success');
                                    }
                                    if (res.payload?.protocol) {
                                        setProtocolVersion(res.payload.protocol);
                                        addLog(`🔌 Protocol Version: ${res.payload.protocol}`, 'info');
                                    }

                                    setActiveTab('sessions');
                                    refreshAll();
                                }
                            }).catch(err => {
                                addLog(`✗ Handshake failed: ${err.message}`, 'error');
                                setStatus('error');
                            });
                        } else if (data.event === 'connect.ready') {
                            addLog('🎉 Connection ready!', 'success');
                            setStatus('connected');
                            setActiveTab('sessions');
                            refreshAll();
                        } else if (data.event === 'health') {
                            setHealth(data.payload);
                        } else if (data.event === 'chat') {
                            // Handle chat streaming events
                            if (data.payload?.sessionKey === selectedSessionId) {
                                if (data.payload.delta) {
                                    // Append delta to last assistant message
                                    setMessages(prev => {
                                        const lastMsg = prev[prev.length - 1];
                                        if (lastMsg && lastMsg.role === 'assistant') {
                                            return [
                                                ...prev.slice(0, -1),
                                                { ...lastMsg, content: lastMsg.content + data.payload.delta }
                                            ];
                                        } else {
                                            // Create new assistant message
                                            return [...prev, {
                                                id: `a-${Date.now()}`,
                                                role: 'assistant',
                                                content: data.payload.delta,
                                                timestamp: Date.now()
                                            }];
                                        }
                                    });
                                } else if (data.payload.content) {
                                    // Complete message
                                    const msg: Message = {
                                        id: data.payload.id || `a-${Date.now()}`,
                                        role: 'assistant',
                                        content: data.payload.content,
                                        timestamp: data.payload.timestamp || Date.now()
                                    };
                                    setMessages(prev => [...prev, msg]);
                                }
                            }
                        } else if (data.event === 'agent') {
                            addLog(`🤖 Agent event: ${JSON.stringify(data.payload)}`, 'info');
                        } else if (data.event === 'session.created' || data.event === 'session.updated' || data.event === 'session.deleted') {
                            addLog(`📋 Session event: ${data.event}`, 'info');
                            refreshSessions();
                        }
                    }
                } catch (e) {
                    addLog(`✗ Failed to parse message: ${e instanceof Error ? e.message : 'Unknown'}`, 'error');
                }
            };

            ws.onerror = () => {
                addLog('✗ WebSocket error occurred', 'error');
                setStatus('error');
            };

            ws.onclose = (event) => {
                addLog(`⚠ Connection closed (Code: ${event.code}, Reason: ${event.reason || 'None'})`, 'warn');

                // Clear all pending requests
                for (const [, timeout] of requestTimeouts.current) {
                    clearTimeout(timeout);
                }
                requestTimeouts.current.clear();
                pendingRequests.current.clear();

                if (status !== 'disconnected') {
                    setStatus('error');
                }
            };

        } catch (e) {
            addLog(`✗ Exception: ${e instanceof Error ? e.message : 'Unknown'}`, 'error');
            setStatus('error');
        }
    };

    const refreshSessions = async () => {
        try {
            const sessionsRes: any = await sendRequest('sessions.list');
            if (sessionsRes.ok) {
                const rawSessions = sessionsRes.payload?.sessions || sessionsRes.payload || [];
                const sessList: Session[] = rawSessions.map((s: any) => {
                    const key = s.key || s.id || s.sessionKey;
                    const parts = key.split(':');
                    const agentName = parts.length >= 2 ? parts[1] : 'Unknown Agent';

                    return {
                        id: key,
                        name: s.displayName || s.name || key,
                        gatewayId: s.gatewayId,
                        agentName
                    };
                });
                setSessions(sessList);
                addLog(`📋 Loaded ${sessList.length} session(s)`, 'success');
            } else {
                addLog('✗ Failed to load sessions', 'error');
            }
        } catch (err) {
            addLog(`✗ Error loading sessions: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
        }
    };

    const refreshHealth = async () => {
        try {
            const healthRes: any = await sendRequest('health');
            if (healthRes.ok) {
                setHealth(healthRes.payload);
                addLog('💓 Health data updated', 'success');
            }
        } catch (err) {
            addLog(`⚠ Could not fetch health data`, 'warn');
        }
    };

    const refreshAll = async () => {
        await Promise.all([
            refreshSessions(),
            refreshHealth()
        ]);
    };

    const loadHistory = async (sessionKey: string) => {
        setSelectedSessionId(sessionKey);
        setMessages([]);

        try {
            const historyRes: any = await sendRequest('chat.history', { sessionKey });
            if (historyRes.ok) {
                const rawMessages = historyRes.payload?.messages || historyRes.payload || [];
                const hist: Message[] = rawMessages.map((m: any) => ({
                    id: m.id || `msg-${Math.random()}`,
                    role: m.role || 'assistant',
                    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                    timestamp: m.timestamp || Date.now()
                }));
                setMessages(hist);
                addLog(`💬 Loaded ${hist.length} message(s)`, 'success');
            } else {
                addLog('✗ Failed to load chat history', 'error');
            }
        } catch (err) {
            addLog(`✗ Error loading history: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !selectedSessionId || sending) return;

        const text = inputText.trim();
        setInputText('');
        setSending(true);

        // Add user message to UI immediately
        const userMsg: Message = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            const res: any = await sendRequest('chat.send', {
                sessionKey: selectedSessionId,
                message: text,
                idempotencyKey: `dt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });

            if (!res.ok) {
                addLog(`✗ Failed to send message: ${res.error?.message || res.error || 'Unknown error'}`, 'error');
            } else {
                addLog('✓ Message sent successfully', 'success');
            }
        } catch (err) {
            addLog(`✗ Error sending message: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
        } finally {
            setSending(false);
        }
    };

    const disconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Clear all pending requests
        for (const timeout of requestTimeouts.current.values()) {
            clearTimeout(timeout);
        }
        requestTimeouts.current.clear();
        pendingRequests.current.clear();

        setStatus('disconnected');
        addLog('🔌 Disconnected by user', 'info');
    };

    // Group sessions by agent
    const agents = useMemo(() => {
        const map = new Map<string, Session[]>();
        sessions.forEach(s => {
            const agentName = s.agentName || 'Unknown Agent';
            const existing = map.get(agentName) || [];
            map.set(agentName, [...existing, s]);
        });
        return Array.from(map.entries()).map(([name, sessions]) => ({ name, sessions }));
    }, [sessions]);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'connected':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'connecting':
                return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <XCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <Layout>
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="text-blue-400 w-8 h-8" />
                        <div>
                            <h1 className="text-2xl font-bold">OpenClaw Direct Connection</h1>
                            <p className="text-gray-400 text-sm">Protocol v3 Debug Interface</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {version && (
                            <div className="bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700 flex items-center gap-2 text-xs">
                                <Layers className="w-3 h-3 text-blue-500" />
                                <span className="text-gray-400">Version:</span>
                                <span className="text-white font-mono">{version}</span>
                            </div>
                        )}
                        {health?.memory && (
                            <div className="bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700 flex items-center gap-2 text-xs">
                                <Activity className="w-3 h-3 text-green-500" />
                                <span className="text-gray-400">RAM:</span>
                                <span className="text-white">{(health.memory.rss / 1024 / 1024).toFixed(0)} MB</span>
                            </div>
                        )}
                        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${status === 'connected' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                status === 'connecting' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                    status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            }`}>
                            {getStatusIcon()}
                            {status.toUpperCase()}
                        </div>
                    </div>
                </header>

                {status === 'connected' || status === 'connecting' ? (
                    <div className="flex gap-4 bg-gray-950/20 border border-gray-800 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
                        {/* Sidebar Navigation */}
                        <div className="w-48 bg-gray-900/50 border-r border-gray-800 flex flex-col py-4 shrink-0">
                            <div className="space-y-1.5 px-3 flex-1">
                                <button
                                    onClick={() => setActiveTab('sessions')}
                                    className={`w-full py-2.5 px-4 text-xs font-bold transition-all flex items-center gap-3 rounded-xl ${activeTab === 'sessions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' :
                                            'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                                        }`}
                                >
                                    <Hash className="w-4 h-4" /> SESSIONS
                                </button>
                                <button
                                    onClick={() => setActiveTab('agents')}
                                    className={`w-full py-2.5 px-4 text-xs font-bold transition-all flex items-center gap-3 rounded-xl ${activeTab === 'agents' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' :
                                            'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                                        }`}
                                >
                                    <Users className="w-4 h-4" /> AGENTS
                                </button>
                                <button
                                    onClick={() => setActiveTab('stats')}
                                    className={`w-full py-2.5 px-4 text-xs font-bold transition-all flex items-center gap-3 rounded-xl ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' :
                                            'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                                        }`}
                                >
                                    <Info className="w-4 h-4" /> STATS
                                </button>
                                <div className="pt-4 border-t border-gray-800/50 mt-4">
                                    <button
                                        onClick={() => setActiveTab('logs')}
                                        className={`w-full py-2.5 px-4 text-xs font-bold transition-all flex items-center gap-3 rounded-xl ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' :
                                                'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                                            }`}
                                    >
                                        <Terminal className="w-4 h-4" /> LOGS
                                    </button>
                                </div>
                            </div>
                            <div className="px-3 pt-4 border-t border-gray-800/50 space-y-2">
                                <button
                                    onClick={refreshAll}
                                    disabled={status !== 'connected'}
                                    className="w-full bg-gray-800/40 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 text-[10px] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-wider border border-gray-800/50"
                                >
                                    <RefreshCw className="w-3 h-3" /> Refresh
                                </button>
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-950/40 shrink-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #1f2937' }}>
                                {activeTab === 'sessions' && (
                                    <div className="space-y-1.5">
                                        {sessions.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => loadHistory(s.id)}
                                                className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center gap-3 ${selectedSessionId === s.id ?
                                                        'bg-blue-600 text-white shadow-lg shadow-blue-500/10' :
                                                        'text-gray-400 hover:bg-gray-800/50'
                                                    }`}
                                            >
                                                <MessageSquare className={`w-4 h-4 shrink-0 ${selectedSessionId === s.id ? 'text-blue-200' : 'text-gray-600'
                                                    }`} />
                                                <span className="truncate">{s.name}</span>
                                            </button>
                                        ))}
                                        {sessions.length === 0 && (
                                            <div className="p-12 text-center text-gray-700 text-xs italic">
                                                No active sessions
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'agents' && (
                                    <div className="space-y-5">
                                        {agents.map((agent) => (
                                            <div key={agent.name} className="space-y-2">
                                                <div className="flex items-center gap-2 px-2 py-1">
                                                    <Cpu className="w-3 h-3 text-blue-500/50 shrink-0" />
                                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest truncate">
                                                        {agent.name}
                                                    </span>
                                                    <span className="ml-auto bg-gray-900 border border-gray-800 text-gray-500 text-[9px] px-1.5 py-0.5 rounded-lg shrink-0">
                                                        {agent.sessions.length}
                                                    </span>
                                                </div>
                                                {agent.sessions.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => loadHistory(s.id)}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all truncate ${selectedSessionId === s.id ?
                                                                'bg-gray-800 text-blue-400' :
                                                                'text-gray-500 hover:text-gray-400 hover:bg-gray-900/50'
                                                            }`}
                                                    >
                                                        • {s.name}
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                        {agents.length === 0 && (
                                            <div className="p-12 text-center text-gray-700 text-xs italic">
                                                No agents found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 bg-black/40 flex flex-col overflow-hidden min-w-0">
                            {activeTab === 'logs' ? (
                                <>
                                    <div className="bg-gray-900/80 px-5 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tight flex items-center gap-2">
                                            <Terminal className="w-3.5 h-3.5" /> CONNECTION_LOGS
                                        </span>
                                        <button
                                            onClick={disconnect}
                                            className="text-xs text-red-500 hover:text-red-400 font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <Power className="w-3.5 h-3.5" /> DISCONNECT
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-5 font-mono text-[13px] bg-black/20" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #1f2937' }}>
                                        <div className="space-y-1.5">
                                            {logs.map((log, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex gap-3 leading-relaxed ${log.type === 'success' ? 'text-green-400' :
                                                            log.type === 'error' ? 'text-red-400' :
                                                                log.type === 'warn' ? 'text-yellow-400' :
                                                                    'text-gray-500'
                                                        }`}
                                                >
                                                    <span className="text-gray-800 shrink-0 select-none font-bold">
                                                        [{formatTime(log.timestamp)}]
                                                    </span>
                                                    <span className="break-all">{log.msg}</span>
                                                </div>
                                            ))}
                                            <div ref={logsEndRef} />
                                        </div>
                                    </div>
                                </>
                            ) : activeTab === 'stats' ? (
                                <div className="flex-1 overflow-y-auto p-8 space-y-8" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #1f2937' }}>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-2">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                <Layers className="w-3 h-3" /> OpenClaw Version
                                            </div>
                                            <div className="text-2xl font-bold text-white font-mono">{version || 'N/A'}</div>
                                            <div className="text-[10px] text-gray-600 font-mono">
                                                Protocol v{protocolVersion || 3}
                                            </div>
                                        </div>
                                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-2 text-center">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 justify-center">
                                                <Users className="w-3 h-3" /> Agents
                                            </div>
                                            <div className="text-2xl font-bold text-white">{agents.length}</div>
                                        </div>
                                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-2 text-center">
                                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 justify-center">
                                                <MessageSquare className="w-3 h-3" /> Sessions
                                            </div>
                                            <div className="text-2xl font-bold text-white">{sessions.length}</div>
                                        </div>
                                    </div>

                                    {health && (
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-bold text-gray-400">System Health</h3>
                                            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-gray-800/40 text-gray-500 font-bold uppercase">
                                                        <tr>
                                                            <th className="px-6 py-4">Metric</th>
                                                            <th className="px-6 py-4">Value</th>
                                                            <th className="px-6 py-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-800 text-gray-400">
                                                        {health.uptime !== undefined && (
                                                            <tr>
                                                                <td className="px-6 py-4 font-mono">process.uptime</td>
                                                                <td className="px-6 py-4 text-gray-300">
                                                                    {(health.uptime / 3600).toFixed(2)} hrs
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded text-[10px]">
                                                                        RUNNING
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {health.memory?.rss && (
                                                            <tr>
                                                                <td className="px-6 py-4 font-mono">memory.rss</td>
                                                                <td className="px-6 py-4 text-gray-300">
                                                                    {(health.memory.rss / 1024 / 1024).toFixed(2)} MB
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded text-[10px]">
                                                                        STABLE
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {health.memory?.heapUsed && (
                                                            <tr>
                                                                <td className="px-6 py-4 font-mono">memory.heapUsed</td>
                                                                <td className="px-6 py-4 text-gray-300">
                                                                    {(health.memory.heapUsed / 1024 / 1024).toFixed(2)} MB
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded text-[10px]">
                                                                        NORMAL
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {health.memory?.heapTotal && (
                                                            <tr>
                                                                <td className="px-6 py-4 font-mono">memory.heapTotal</td>
                                                                <td className="px-6 py-4 text-gray-300">
                                                                    {(health.memory.heapTotal / 1024 / 1024).toFixed(2)} MB
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded text-[10px]">
                                                                        ALLOCATED
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : selectedSessionId ? (
                                <>
                                    <div className="bg-gray-900/80 px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 bg-blue-600/20 rounded-xl border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0">
                                                <MessageSquare className="text-blue-500 w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-lg font-bold text-white truncate">
                                                    {sessions.find(s => s.id === selectedSessionId)?.name}
                                                </h2>
                                                <div className="text-[9px] font-mono text-gray-600 tracking-wider truncate">
                                                    {selectedSessionId}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-black/20 to-black/40" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #1f2937' }}>
                                        {messages.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-gray-600 text-sm italic">
                                                No messages yet. Start a conversation below.
                                            </div>
                                        ) : (
                                            <>
                                                {messages.map((m, i) => (
                                                    <div
                                                        key={i}
                                                        className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                                                    >
                                                        <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user'
                                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                                : 'bg-gray-800/80 text-gray-200 border border-gray-700/50 rounded-tl-none backdrop-blur-md'
                                                            }`}>
                                                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                                                        </div>
                                                        <div className="mt-2 px-1 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                                                            {m.role} • {new Date(m.timestamp).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={messagesEndRef} />
                                            </>
                                        )}
                                    </div>
                                    <div className="p-5 bg-gray-950/20 border-t border-gray-800/50 backdrop-blur-md shrink-0">
                                        <form
                                            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                                            className="bg-black/40 border border-gray-800 rounded-2xl p-2.5 flex items-center gap-3 group focus-within:border-blue-500/50 transition-all"
                                        >
                                            <input
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                disabled={sending || status !== 'connected'}
                                                className="flex-1 bg-transparent border-none outline-none text-sm px-3 text-white placeholder:text-gray-700 disabled:opacity-50"
                                                placeholder={sending ? "Sending..." : "Type your message..."}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!inputText.trim() || sending || status !== 'connected'}
                                                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-500/20 shrink-0"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-700 space-y-6">
                                    <MessageSquare className="w-12 h-12 opacity-10" />
                                    <p className="text-sm italic font-medium">Select a session to view messages</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 space-y-6 max-w-2xl mx-auto shadow-2xl">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    Gateway WebSocket URL
                                </label>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 font-mono text-sm"
                                    placeholder="ws://localhost:18789"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    Authentication Token
                                </label>
                                <input
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 font-mono text-sm"
                                    placeholder="Enter your token"
                                />
                            </div>
                        </div>
                        <button
                            onClick={connect}
                            disabled={!url || !token}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                        >
                            <Power className="w-5 h-5" />
                            Initialize Connection
                        </button>

                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                                Connection failed. Check the URL, token, and ensure the OpenClaw gateway is running.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                /* Custom scrollbar styles */
                div::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                
                div::-webkit-scrollbar-track {
                    background: #1f2937;
                    border-radius: 4px;
                }
                
                div::-webkit-scrollbar-thumb {
                    background: #374151;
                    border-radius: 4px;
                }
                
                div::-webkit-scrollbar-thumb:hover {
                    background: #4b5563;
                }
            `}</style>
        </Layout>
    );
}

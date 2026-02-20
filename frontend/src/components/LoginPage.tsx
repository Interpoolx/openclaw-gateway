import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Mail, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { login } from '../lib/api';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setUserFromApi } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        try {
            const data = await login(email, password);

            if (!data.success) {
                // The API actually returns `{ error: string }` on failure, even if the type doesn't say so
                const errorData = data as any;
                throw new Error(errorData.error || errorData.message || 'Login failed');
            }

            // Store in AuthContext
            // Ensure loginMethod is set
            setUserFromApi({
                ...data.user,
                loginMethod: 'password', // Explicitly set login method
            } as any, data.token);

            toast.success('Welcome back, ' + data.user.name);

            // If we got a default workspace slug or ID from login, navigate directly
            if (data.defaultWorkspaceSlug) {
                navigate({ to: '/$workspaceSlug/dashboard', params: { workspaceSlug: data.defaultWorkspaceSlug } });
            } else if (data.defaultWorkspaceId) {
                navigate({ to: '/$workspaceSlug/dashboard', params: { workspaceSlug: data.defaultWorkspaceId } });
            } else {
                // Otherwise fetch workspaces - the redirect route will handle it
                navigate({ to: '/dashboard' });
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const detailedError = error.response?.data?.error || error.response?.data?.message || error.message || 'Invalid email or password';
            toast.error(`Login failed: ${detailedError}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Background Glow */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '400px',
                height: '400px',
                background: 'rgba(59, 130, 246, 0.05)',
                filter: 'blur(100px)',
                borderRadius: '50%',
                zIndex: 0
            }} />

            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '40px',
                background: 'rgba(20, 20, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '24px',
                backdropFilter: 'blur(20px)',
                zIndex: 1,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '32px'
                    }}>
                        🦀
                    </div>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#fff',
                        marginBottom: '8px',
                        background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: '#666', fontSize: '14px' }}>Sign in to manage your agent swarm</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: '#a1a1aa' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 48px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', fontWeight: 500, color: '#a1a1aa' }}>Password</label>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 48px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: isLoading ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#2563eb'; }}
                        onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = '#3b82f6'; }}
                    >
                        {isLoading ? (
                            <div style={{
                                width: '18px',
                                height: '18px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#fff',
                                borderRadius: '50%',
                                animation: 'spin 0.6s linear infinite'
                            }} />
                        ) : (
                            <>
                                <LogIn size={18} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '24px' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#444',
                            textDecoration: 'none',
                            fontSize: '12px',
                            marginTop: '8px',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#666'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#444'}
                    >
                        <ArrowLeft size={12} />
                        Back to landing
                    </Link>
                </div>
            </div>

            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

import { createRoute, Link } from '@tanstack/react-router';
import { rootRoute } from './__root';
import {
    Cloud,
    CheckCircle2,
    Sparkles,
    ArrowRight,
    Shield,
    Zap,
    Clock,
    ArrowLeft
} from 'lucide-react';
import { useState } from 'react';

export const pricingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pricing',
    component: PricingPage,
}) as any;

function PricingPage() {
    const [hovered, setHovered] = useState(false);

    const plan = {
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
        badge: 'Most Popular',
        highlightFeatures: ['14-Day Trial', 'No Credit Card', 'Cancel Anytime'],
    };

    return (
        <div style={{
            background: '#000',
            color: '#fff',
            minHeight: '100vh',
            fontFamily: 'Inter, system-ui, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Gradients */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                height: '60%',
                background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-20%',
                right: '-10%',
                width: '50%',
                height: '50%',
                background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            {/* Header */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '20px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: '#fff' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Sparkles size={22} color="#fff" />
                        </div>
                        <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>Clawpute</span>
                    </Link>

                    <Link to="/" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '15px',
                        color: '#aaa',
                        textDecoration: 'none',
                        fontWeight: 500,
                        transition: 'color 0.2s'
                    }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#aaa')}
                    >
                        <ArrowLeft size={18} />
                        Back to Home
                    </Link>
                </div>
            </header>

            <main style={{ position: 'relative', zIndex: 1, padding: '100px 32px 140px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {/* Headline */}
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <h1 style={{
                            fontSize: '56px',
                            fontWeight: 800,
                            marginBottom: '24px',
                            background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-2px'
                        }}>
                            Simple, Transparent Pricing
                        </h1>
                        <p style={{ color: '#aaa', fontSize: '20px', maxWidth: '600px', margin: '0 auto' }}>
                            Scale your AI agent operations with the professional Command Center dashboard.
                        </p>
                    </div>

                    {/* Pricing Card Section */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div
                            onMouseEnter={() => setHovered(true)}
                            onMouseLeave={() => setHovered(false)}
                            style={{
                                maxWidth: '600px',
                                width: '100%',
                                background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.9) 0%, rgba(10, 10, 15, 0.95) 100%)',
                                border: hovered ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '24px',
                                padding: '48px',
                                position: 'relative',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: hovered ? 'translateY(-10px)' : 'translateY(0)',
                                boxShadow: hovered ? '0 30px 60px rgba(99, 102, 241, 0.15)' : '0 20px 40px rgba(0, 0, 0, 0.3)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            {/* Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '24px',
                                right: '24px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                padding: '6px 16px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#fff',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            }}>
                                {plan.badge}
                            </div>

                            {/* Plan Info */}
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Cloud color="#6366f1" size={28} />
                                    </div>
                                    <h2 style={{ fontSize: '32px', fontWeight: 800 }}>{plan.name}</h2>
                                </div>
                                <p style={{ color: '#aaa', fontSize: '18px', lineHeight: '1.6', marginBottom: '32px' }}>
                                    {plan.description}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontSize: '64px', fontWeight: 800, color: '#fff' }}>{plan.price}</span>
                                    <span style={{ fontSize: '20px', color: '#666' }}>{plan.period}</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <Link to="/" style={{ textDecoration: 'none' }}>
                                <button style={{
                                    width: '100%',
                                    padding: '20px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '16px',
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    marginBottom: '32px',
                                    transition: 'transform 0.2s',
                                    boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)',
                                }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    {plan.cta}
                                    <ArrowRight size={22} />
                                </button>
                            </Link>

                            {/* Highlight Features */}
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'center',
                                marginBottom: '40px',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '12px',
                                fontSize: '13px',
                                color: '#888',
                                fontWeight: 600
                            }}>
                                {plan.highlightFeatures.map(hf => (
                                    <span key={hf} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '4px', height: '4px', background: '#6366f1', borderRadius: '50%' }} />
                                        {hf}
                                    </span>
                                ))}
                            </div>

                            {/* Features List */}
                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '40px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>
                                    What's Included
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(1, 1fr)',
                                    gap: '16px'
                                }}>
                                    {plan.features.map(feature => (
                                        <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <CheckCircle2 size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                                            <span style={{ fontSize: '15px', color: '#ccc' }}>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reinsurance Section */}
                    <div style={{
                        marginTop: '100px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '40px'
                    }}>
                        {[
                            { icon: Shield, title: 'Data Privacy', desc: 'Your agent data never leaves your infrastructure.' },
                            { icon: Zap, title: 'Instant Setup', desc: 'Connect your OpenClaw instances in seconds.' },
                            { icon: Clock, title: '99.9% Uptime', desc: 'Reliable cloud dashboard for real-time monitoring.' }
                        ].map(item => (
                            <div key={item.title} style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px'
                                }}>
                                    <item.icon size={20} color="#6366f1" />
                                </div>
                                <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>{item.title}</h4>
                                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '60px 32px',
                textAlign: 'center',
                background: '#050505'
            }}>
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '24px' }}>
                    <Link to="/terms" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Terms</Link>
                    <Link to="/privacy" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Privacy</Link>
                    <Link to="/refunds" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Refunds</Link>
                </div>
                <p style={{ color: '#444', fontSize: '14px' }}>
                    © {new Date().getFullYear()} Clawpute. All rights reserved.
                </p>
            </footer>
        </div>
    );
}

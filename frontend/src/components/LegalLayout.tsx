import React from 'react';
import { Link } from '@tanstack/react-router';
import { Sparkles, ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
    children: React.ReactNode;
    title: string;
    lastUpdated: string;
}

export function LegalLayout({ children, title, lastUpdated }: LegalLayoutProps) {
    return (
        <div style={{
            background: '#000',
            color: '#fff',
            minHeight: '100vh',
            fontFamily: 'Inter, system-ui, sans-serif',
            position: 'relative',
            overflowX: 'hidden'
        }}>
            {/* Background Gradients */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                height: '40%',
                background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
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
                    maxWidth: '1000px',
                    margin: '0 auto',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Sparkles size={18} color="#fff" />
                        </div>
                        <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>Clawpute</span>
                    </Link>

                    <Link to="/" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#aaa',
                        textDecoration: 'none',
                        transition: 'color 0.2s'
                    }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#aaa')}
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: '800px',
                margin: '0 auto',
                padding: '80px 24px 120px'
            }}>
                <div style={{ marginBottom: '60px' }}>
                    <h1 style={{
                        fontSize: '48px',
                        fontWeight: 800,
                        marginBottom: '16px',
                        background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1px'
                    }}>
                        {title}
                    </h1>
                    <p style={{ color: '#666', fontSize: '15px' }}>
                        Last Updated: {lastUpdated}
                    </p>
                </div>

                <div style={{
                    color: '#ccc',
                    lineHeight: '1.7',
                    fontSize: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '32px'
                }}>
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '60px 24px',
                textAlign: 'center',
                background: '#050505'
            }}>
                <p style={{ color: '#444', fontSize: '14px' }}>
                    © {new Date().getFullYear()} Clawpute. All rights reserved.
                </p>
            </footer>

            <style>{`
        h2 { 
          color: #fff; 
          font-size: 24px; 
          font-weight: 700; 
          margin-bottom: 12px;
          margin-top: 20px;
        }
        p { margin-bottom: 0px; }
        ul { 
          padding-left: 20px; 
          margin-bottom: 0px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        li { margin-bottom: 4px; }
        strong { color: #fff; }
      `}</style>
        </div>
    );
}

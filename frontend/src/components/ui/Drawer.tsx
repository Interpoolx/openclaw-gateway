import { useState, useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  width?: string | number;
  position?: 'left' | 'right';
  showBackdrop?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
}

/**
 * Reusable Drawer Component
 * Features:
 * - Smooth slide-in animation from left or right
 * - Configurable width and position
 * - Backdrop with blur effect
 * - Escape key to close
 * - Accessible close button
 * - Header, content, actions, and footer sections
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 500,
  position = 'right',
  showBackdrop = true,
  actions,
  footer,
}: DrawerProps) {
  const [showContent, setShowContent] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Opening - show content immediately, start animation
      setShowContent(true);
      // Small delay to ensure transition works
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      // Closing - stop animation, then hide content
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShowContent(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Don't render anything if never opened
  if (!showContent && !isOpen) return null;

  const isRight = position === 'right';
  const transform = isAnimating 
    ? 'translateX(0)' 
    : (isRight ? 'translateX(100%)' : 'translateX(-100%)');

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            opacity: isAnimating ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: isAnimating ? 'auto' : 'none',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          [isRight ? 'right' : 'left']: 0,
          bottom: 0,
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '100vw',
          background: '#000',
          borderLeft: isRight ? '1px solid #262627' : 'none',
          borderRight: !isRight ? '1px solid #262627' : 'none',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          transform,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isRight 
            ? '-4px 0 24px rgba(0,0,0,0.15)' 
            : '4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        {(title || subtitle || actions) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexDirection: 'column',
              padding: '20px 24px',
              borderBottom: '1px solid #000',
              background: '#000',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div>
                {title && (
                  <h2 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#77787a',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    margin: '4px 0 0 0',
                  }}>
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Actions */}
            {actions && (
              <div style={{ marginTop: '16px', width: '100%' }}>
                {actions}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '24px',
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #000',
              background: '#000',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

export default Drawer;

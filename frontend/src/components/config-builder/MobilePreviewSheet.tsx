import { ReactNode } from 'react';

interface MobilePreviewSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobilePreviewSheet({ open, onClose, children }: MobilePreviewSheetProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.7)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '78vh',
          overflow: 'auto',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          background: '#020617',
          padding: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p style={{ margin: 0, color: '#f8fafc', fontSize: '13px', fontWeight: 700 }}>
            Preview Config
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'transparent',
              color: '#e2e8f0',
              borderRadius: '8px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}


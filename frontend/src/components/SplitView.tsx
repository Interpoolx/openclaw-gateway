import { useState, useRef, useCallback, useEffect } from 'react';
import { X, GripVertical, Maximize2, Columns } from 'lucide-react';

interface SplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftTitle?: string;
  rightTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  defaultSplitRatio?: number;
  minWidth?: number;
}

export function SplitView({
  leftPanel,
  rightPanel,
  leftTitle = 'Panel 1',
  rightTitle = 'Panel 2',
  isOpen,
  onClose,
  defaultSplitRatio = 0.5,
  minWidth = 300,
}: SplitViewProps) {
  const [splitRatio, setSplitRatio] = useState(defaultSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newRatio = Math.max(0.2, Math.min(0.8, x / rect.width));
      
      // Ensure minimum widths
      const containerWidth = rect.width;
      const leftWidth = containerWidth * newRatio;
      const rightWidth = containerWidth * (1 - newRatio);
      
      if (leftWidth >= minWidth && rightWidth >= minWidth) {
        setSplitRatio(newRatio);
      }
    },
    [isDragging, minWidth]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcut to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15, 15, 18, 0.8)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Columns style={{ width: 18, height: 18, color: '#3b82f6' }} />
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#f3f4f6',
          }}>
            Split View
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <button
            onClick={() => setSplitRatio(0.5)}
            style={{
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: '#6b7280',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Reset to 50/50"
          >
            <Maximize2 style={{ width: 14, height: 14 }} />
            Reset
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              color: '#ef4444',
              cursor: 'pointer',
            }}
            title="Close split view (Esc)"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      {/* Panels */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Left Panel */}
        <div style={{
          width: `${splitRatio * 100}%`,
          minWidth: `${minWidth}px`,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {leftTitle}
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
          }}>
            {leftPanel}
          </div>
        </div>

        {/* Divider */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '12px',
            cursor: 'col-resize',
            background: isDragging ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <GripVertical style={{
            width: 16,
            height: 16,
            color: isDragging ? '#3b82f6' : '#4b5563',
          }} />
        </div>

        {/* Right Panel */}
        <div style={{
          flex: 1,
          minWidth: `${minWidth}px`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {rightTitle}
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
          }}>
            {rightPanel}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Hook to manage split view state
export function useSplitView() {
  const [isOpen, setIsOpen] = useState(false);
  const [leftPanel, setLeftPanel] = useState<React.ReactNode>(null);
  const [rightPanel, setRightPanel] = useState<React.ReactNode>(null);
  const [leftTitle, setLeftTitle] = useState('Panel 1');
  const [rightTitle, setRightTitle] = useState('Panel 2');

  const openSplitView = useCallback((
    left: React.ReactNode,
    right: React.ReactNode,
    titles?: { left?: string; right?: string }
  ) => {
    setLeftPanel(left);
    setRightPanel(right);
    if (titles?.left) setLeftTitle(titles.left);
    if (titles?.right) setRightTitle(titles.right);
    setIsOpen(true);
  }, []);

  const closeSplitView = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleSplitView = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    openSplitView,
    closeSplitView,
    toggleSplitView,
    SplitViewComponent: isOpen ? (
      <SplitView
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        leftTitle={leftTitle}
        rightTitle={rightTitle}
        isOpen={isOpen}
        onClose={closeSplitView}
      />
    ) : null,
  };
}

export default SplitView;

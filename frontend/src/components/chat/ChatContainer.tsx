import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

interface ChatContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ChatContainer({ children, className }: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevScrollHeight = useRef(0);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // Auto-scroll when children change
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      const { scrollHeight } = containerRef.current;
      // Only scroll if content actually grew
      if (scrollHeight > prevScrollHeight.current) {
        scrollToBottom();
        prevScrollHeight.current = scrollHeight;
      }
    }
  }, [children, autoScroll, scrollToBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 100;

    setShowScrollButton(!isNearBottom);
    setAutoScroll(isNearBottom);
    prevScrollHeight.current = scrollHeight;
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`${className} flex-1 overflow-y-auto scroll-smooth`}
      >
        <div className="p-4 flex flex-col gap-1">
          {children}
        </div>
        {/* Scroll anchor */}
        <div id="chat-scroll-anchor" className="h-[1px]" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => {
            scrollToBottom();
            setAutoScroll(true);
          }}
          className="absolute bottom-5 right-5 w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all z-10 hover:scale-110 hover:border-[var(--accent-primary)]"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <ChevronDown className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
      )}
    </div>
  );
}

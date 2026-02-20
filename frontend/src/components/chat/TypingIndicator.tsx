export function TypingIndicator({ agentName = 'Assistant' }: { agentName?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        alignItems: 'center',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--accent-green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '16px',
        }}
      >
        🤖
      </div>

      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {agentName} is thinking
        </span>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                animation: `typingBounce 1.4s infinite ease-in-out ${i * 0.16}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

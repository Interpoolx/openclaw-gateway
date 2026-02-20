interface TypingIndicatorProps {
  agentName?: string;
  agentAvatar?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function TypingIndicator({ 
  agentName, 
  agentAvatar,
  size = 'md',
  showText = true 
}: TypingIndicatorProps) {
  const sizeMap = {
    sm: { dot: 4, gap: 3, height: 16 },
    md: { dot: 6, gap: 4, height: 24 },
    lg: { dot: 8, gap: 5, height: 32 }
  };

  const { dot, gap, height } = sizeMap[size];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Agent Avatar */}
      {(agentAvatar || agentName) && (
        <div style={{
          width: height,
          height: height,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === 'sm' ? '12px' : size === 'md' ? '14px' : '16px',
        }}>
          {agentAvatar || '🤖'}
        </div>
      )}

      {/* Animated Dots */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${gap}px`,
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: dot,
              height: dot,
              borderRadius: '50%',
              background: '#3b82f6',
              animation: `typingBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Text */}
      {showText && (
        <span style={{
          fontSize: size === 'sm' ? '11px' : size === 'md' ? '12px' : '14px',
          color: '#6b7280',
          fontWeight: 500,
        }}>
          {agentName ? `${agentName} is typing` : 'Typing...'}
        </span>
      )}

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Multi-agent typing indicator
interface MultiAgentTypingProps {
  agents: Array<{ id: string; name: string; avatar?: string }>;
  maxDisplay?: number;
}

export function MultiAgentTyping({ agents, maxDisplay = 3 }: MultiAgentTypingProps) {
  if (agents.length === 0) return null;

  const displayAgents = agents.slice(0, maxDisplay);
  const remainingCount = agents.length - maxDisplay;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 14px',
      background: 'rgba(59, 130, 246, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(59, 130, 246, 0.1)',
    }}>
      {/* Agent Avatars Stack */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
      }}>
        {displayAgents.map((agent, index) => (
          <div
            key={agent.id}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              marginLeft: index > 0 ? '-8px' : '0',
              border: '2px solid #0a0a0c',
              zIndex: displayAgents.length - index,
            }}
          >
            {agent.avatar || '🤖'}
          </div>
        ))}
        {remainingCount > 0 && (
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            marginLeft: '-8px',
            border: '2px solid #0a0a0c',
            color: '#6b7280',
          }}>
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Animated Dots */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#3b82f6',
              animation: `typingBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Text */}
      <span style={{
        fontSize: '12px',
        color: '#6b7280',
        fontWeight: 500,
      }}>
        {agents.length === 1 
          ? `${agents[0].name} is typing`
          : `${agents.length} agents are typing`
        }
      </span>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Typing indicator for task cards
interface TaskTypingIndicatorProps {
  assigneeCount?: number;
}

export function TaskTypingIndicator({ assigneeCount = 1 }: TaskTypingIndicatorProps) {
  // Use assigneeCount to determine text
  const text = assigneeCount === 1 ? 'Working' : `${assigneeCount} working`;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      background: 'rgba(59, 130, 246, 0.1)',
      borderRadius: '6px',
      fontSize: '10px',
      color: '#3b82f6',
      fontWeight: 600,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: '#3b82f6',
              animation: `typingBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </div>
      <span>{text}</span>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-2px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default TypingIndicator;

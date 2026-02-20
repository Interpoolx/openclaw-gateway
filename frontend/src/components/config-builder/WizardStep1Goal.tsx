import { CHANNEL_OPTIONS, GOAL_OPTIONS } from './constants';
import { BuilderState } from './types';
import { Headphones, MessageCircle, Users, Code, PenTool, User, Search, Sparkles, Check } from 'lucide-react';

const GOAL_ICONS: Record<string, React.ReactNode> = {
  support: <Headphones size={18} />,
  sales: <MessageCircle size={18} />,
  community: <Users size={18} />,
  dev: <Code size={18} />,
  content: <PenTool size={18} />,
  personal: <User size={18} />,
  research: <Search size={18} />,
  custom: <Sparkles size={18} />,
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  telegram: <MessageCircle size={16} />,
  whatsapp: <MessageCircle size={16} />,
  slack: <Users size={16} />,
  discord: <MessageCircle size={16} />,
  api: <Code size={16} />,
  custom: <Sparkles size={16} />,
};

interface WizardStep1GoalProps {
  state: BuilderState;
  setState: (partial: Partial<BuilderState>) => void;
}

export function WizardStep1Goal({ state, setState }: WizardStep1GoalProps) {
  const toggleChannel = (channel: string) => {
    const exists = state.channels.includes(channel);
    const channels = exists
      ? state.channels.filter((entry) => entry !== channel)
      : [...state.channels, channel];
    setState({ channels });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(6, 95, 136, 0.2) 100%)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>Step 1</span>
          What is your agent's main goal?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              onClick={() => setState({ goal: goal.value })}
              style={{
                border: state.goal === goal.value ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(148, 163, 184, 0.2)',
                background: state.goal === goal.value 
                  ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.35) 0%, rgba(6, 95, 136, 0.25) 100%)' 
                  : 'rgba(2, 6, 23, 0.5)',
                color: state.goal === goal.value ? '#bae6fd' : '#cbd5e1',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
                boxShadow: state.goal === goal.value ? '0 2px 10px rgba(56, 189, 248, 0.15)' : 'none',
              }}
            >
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: state.goal === goal.value ? '#38bdf8' : '#64748b'
              }}>
                {GOAL_ICONS[goal.value]}
              </span>
              <span style={{ flex: 1 }}>{goal.label}</span>
              {state.goal === goal.value && <Check size={16} style={{ color: '#38bdf8' }} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 101, 52, 0.2) 100%)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>Step 2</span>
          Which channel(s) should your agent support?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          {CHANNEL_OPTIONS.map((channel) => (
            <button
              key={channel.value}
              type="button"
              onClick={() => toggleChannel(channel.value)}
              style={{
                border: state.channels.includes(channel.value) ? '1px solid rgba(34, 197, 94, 0.6)' : '1px solid rgba(148, 163, 184, 0.2)',
                background: state.channels.includes(channel.value) 
                  ? 'linear-gradient(135deg, rgba(22, 163, 74, 0.3) 0%, rgba(15, 101, 46, 0.2) 100%)' 
                  : 'rgba(2, 6, 23, 0.5)',
                color: state.channels.includes(channel.value) ? '#dcfce7' : '#cbd5e1',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
                boxShadow: state.channels.includes(channel.value) ? '0 2px 10px rgba(34, 197, 94, 0.15)' : 'none',
              }}
            >
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: state.channels.includes(channel.value) ? '#22c55e' : '#64748b'
              }}>
                {CHANNEL_ICONS[channel.value]}
              </span>
              <span style={{ flex: 1 }}>{channel.label}</span>
              {state.channels.includes(channel.value) && <Check size={16} style={{ color: '#22c55e' }} />}
            </button>
          ))}
        </div>
      </div>

      {state.channels.includes('whatsapp') && (
        <div
          style={{
            border: '1px solid rgba(245, 158, 11, 0.5)',
            background: 'linear-gradient(135deg, rgba(146, 64, 14, 0.35) 0%, rgba(120, 53, 15, 0.25) 100%)',
            color: '#fde68a',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <span style={{ color: '#f59e0b', marginTop: '2px' }}>⚠️</span>
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>WhatsApp requires Meta Business API approval</strong>
            WhatsApp fields will include setup instructions after configuration.
          </div>
        </div>
      )}
    </div>
  );
}


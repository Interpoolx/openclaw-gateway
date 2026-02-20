import { SAFETY_FLAGS } from './constants';
import { BuilderState } from './types';
import { Brain, Shield } from 'lucide-react';

interface WizardStep3OptionsProps {
  state: BuilderState;
  setState: (partial: Partial<BuilderState>) => void;
  readyWarnings: string[];
}

export function WizardStep3Options({ state, setState, readyWarnings }: WizardStep3OptionsProps) {
  const toggleSafetyFlag = (flag: string) => {
    const exists = state.safetyFlags.includes(flag);
    const next = exists
      ? state.safetyFlags.filter((entry) => entry !== flag)
      : [...state.safetyFlags, flag];
    setState({ safetyFlags: next });
  };

  const setCredential = (key: string, value: string) => {
    setState({
      credentials: {
        ...state.credentials,
        [key]: value,
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Memory Toggle */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '14px 16px',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '12px',
        background: state.memory 
          ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(126, 34, 158, 0.15) 100%)' 
          : 'rgba(2, 6, 23, 0.4)',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer' }}>
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: state.memory ? '#c084fc' : '#64748b',
          }}>
            <Brain size={20} />
          </span>
          <span style={{ fontWeight: 500 }}>Enable memory</span>
        </label>
        <input
          aria-label="Enable memory"
          type="checkbox"
          checked={state.memory}
          onChange={(event) => setState({ memory: event.target.checked })}
          style={{
            width: '44px',
            height: '24px',
            accentColor: '#8b5cf6',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Logging Level */}
      <div>
        <p style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(29, 78, 216, 0.2) 100%)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>Logging</span>
          Select logging verbosity
        </p>
        <select
          aria-label="Select logging level"
          value={state.loggingLevel}
          onChange={(event) => setState({ loggingLevel: event.target.value as BuilderState['loggingLevel'] })}
          style={{
            width: '100%',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            background: 'rgba(2, 6, 23, 0.7)',
            color: '#e2e8f0',
            padding: '14px 12px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <option value="none">None - No logging</option>
          <option value="errors">Errors - Log only errors</option>
          <option value="verbose">Verbose - Log everything</option>
        </select>
      </div>

      {/* Safety Flags */}
      <div>
        <p style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(185, 28, 28, 0.2) 100%)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>Security</span>
          Configure safety flags
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          {SAFETY_FLAGS.map((flag) => (
            <label 
              key={flag.value} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                color: '#cbd5e1', 
                fontSize: '13px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: state.safetyFlags.includes(flag.value) 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : 'rgba(2, 6, 23, 0.4)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                aria-label={`Toggle ${flag.label}`}
                type="checkbox"
                checked={state.safetyFlags.includes(flag.value)}
                onChange={() => toggleSafetyFlag(flag.value)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#ef4444',
                  cursor: 'pointer',
                }}
              />
              <Shield size={14} style={{ color: state.safetyFlags.includes(flag.value) ? '#fca5a5' : '#64748b' }} />
              {flag.label}
            </label>
          ))}
        </div>
      </div>

      {/* Channel Credentials */}
      {state.channels.length > 0 && (
        <div>
          <p style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 101, 52, 0.2) 100%)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px'
            }}>Credentials</span>
            Add your API tokens
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            {state.channels.map((channel) => (
              <label key={channel} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>{channel} token</span>
                <input
                  aria-label={`${channel} token`}
                  value={state.credentials[channel] ?? ''}
                  onChange={(event) => setCredential(channel, event.target.value)}
                  placeholder="YOUR_TOKEN"
                  style={{
                    borderRadius: '10px',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'rgba(2, 6, 23, 0.7)',
                    color: '#e2e8f0',
                    padding: '12px 10px',
                    fontSize: '13px',
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Config Name */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>Config name (optional)</span>
        <input
          aria-label="Config name"
          value={state.configName}
          onChange={(event) => setState({ configName: event.target.value })}
          placeholder="Support Setup - Feb 2026"
          style={{
            borderRadius: '8px',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            background: '#020617',
            color: '#e2e8f0',
            padding: '8px',
            fontSize: '12px',
          }}
        />
      </label>

      {readyWarnings.length > 0 && (
        <div
          style={{
            border: '1px solid rgba(245, 158, 11, 0.35)',
            background: 'rgba(146, 64, 14, 0.25)',
            color: '#fde68a',
            borderRadius: '10px',
            padding: '10px',
            fontSize: '12px',
          }}
        >
          {readyWarnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      )}
    </div>
  );
}


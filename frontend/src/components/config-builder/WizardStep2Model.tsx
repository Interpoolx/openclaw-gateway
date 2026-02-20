import { Plus, X, Cpu, Globe, Server, Sparkles } from 'lucide-react';
import { PROVIDER_MODELS, PROVIDER_OPTIONS } from './constants';
import { BuilderState } from './types';

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  anthropic: <Cpu size={18} />,
  openai: <Globe size={18} />,
  ollama: <Server size={18} />,
  mistralai: <Sparkles size={18} />,
  other: <Cpu size={18} />,
};

interface WizardStep2ModelProps {
  state: BuilderState;
  setState: (partial: Partial<BuilderState>) => void;
  onProviderSwitchToOllama?: () => void;
}

export function WizardStep2Model({ state, setState, onProviderSwitchToOllama }: WizardStep2ModelProps) {
  const provider = state.provider ?? '';
  const modelOptions = PROVIDER_MODELS[provider] ?? [];

  const onProviderChange = (nextProvider: string) => {
    const previousProvider = state.provider;
    setState({
      provider: nextProvider,
      model: PROVIDER_MODELS[nextProvider]?.[0] ?? null,
      fallbackChain: [],
      fallbackEnabled: false,
    });
    if (nextProvider === 'ollama' && previousProvider && previousProvider !== 'ollama') {
      onProviderSwitchToOllama?.();
    }
  };

  const addFallback = () => {
    const selectedModel = modelOptions[0];
    if (!selectedModel) return;
    if (state.fallbackChain.includes(selectedModel)) return;
    setState({ fallbackChain: [...state.fallbackChain, selectedModel] });
  };

  const updateFallback = (index: number, model: string) => {
    const next = [...state.fallbackChain];
    next[index] = model;
    setState({ fallbackChain: next });
  };

  const removeFallback = (index: number) => {
    const next = state.fallbackChain.filter((_, itemIndex) => itemIndex !== index);
    setState({ fallbackChain: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(126, 34, 158, 0.2) 100%)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>AI Provider</span>
          Select your LLM provider
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
          {PROVIDER_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onProviderChange(item.value)}
              style={{
                border: provider === item.value ? '1px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(148, 163, 184, 0.2)',
                background: provider === item.value 
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.35) 0%, rgba(126, 34, 158, 0.25) 100%)' 
                  : 'rgba(2, 6, 23, 0.5)',
                color: provider === item.value ? '#e9d5ff' : '#cbd5e1',
                borderRadius: '12px',
                padding: '14px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: provider === item.value ? '0 2px 10px rgba(168, 85, 247, 0.2)' : 'none',
              }}
            >
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: provider === item.value ? '#c084fc' : '#64748b'
              }}>
                {PROVIDER_ICONS[item.value]}
              </span>
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={{ margin: '0 0 12px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(29, 78, 216, 0.2) 100%)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>Model</span>
          Choose your AI model
        </p>
        <select
          aria-label="Select model"
          value={state.model ?? ''}
          onChange={(event) => setState({ model: event.target.value })}
          disabled={!provider}
          style={{
            width: '100%',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            background: 'rgba(2, 6, 23, 0.7)',
            color: '#e2e8f0',
            padding: '14px 12px',
            fontSize: '13px',
            opacity: provider ? 1 : 0.5,
            cursor: provider ? 'pointer' : 'not-allowed',
          }}
        >
          <option value="">Select model</option>
          {modelOptions.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {provider === 'ollama' && (
        <div
          style={{
            border: '1px solid rgba(59, 130, 246, 0.5)',
            background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.35) 0%, rgba(29, 78, 216, 0.25) 100%)',
            color: '#bfdbfe',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <span style={{ color: '#60a5fa', marginTop: '2px' }}>💡</span>
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Local-only mode</strong>
            Ollama must be running at <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>http://127.0.0.1:11434</code>
          </div>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '12px 14px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '12px',
        background: 'rgba(2, 6, 23, 0.4)',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer' }}>
          <input
            aria-label="Enable fallback chain"
            type="checkbox"
            checked={state.fallbackEnabled}
            onChange={(event) => setState({ fallbackEnabled: event.target.checked })}
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#8b5cf6',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontWeight: 500 }}>Enable fallback chain</span>
        </label>
        {state.fallbackEnabled && (
          <button
            type="button"
            onClick={addFallback}
            style={{
              border: '1px solid rgba(34, 197, 94, 0.4)',
              background: 'rgba(22, 163, 74, 0.25)',
              color: '#86efac',
              borderRadius: '8px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={14} /> Add fallback
          </button>
        )}
      </div>

      {state.fallbackEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {state.fallbackChain.map((fallbackModel, index) => (
            <div key={`fallback-${index}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                aria-label={`Fallback model ${index + 1}`}
                value={fallbackModel}
                onChange={(event) => updateFallback(index, event.target.value)}
                style={{
                  flex: 1,
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: '#020617',
                  color: '#e2e8f0',
                  padding: '8px',
                  fontSize: '12px',
                }}
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeFallback(index)}
                style={{
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  background: 'rgba(127, 29, 29, 0.35)',
                  color: '#fecaca',
                  borderRadius: '8px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { BuilderState } from './types';
import { SUMMARY_FIELD_STEP_MAP } from './constants';

interface ConfigSummaryBlockProps {
  state: BuilderState;
  status: 'INVALID' | 'VALID' | 'READY';
  warningCount: number;
  errorCount: number;
  onJumpToStep: (step: 1 | 2 | 3) => void;
}

interface SummaryItem {
  key: keyof typeof SUMMARY_FIELD_STEP_MAP;
  label: string;
  value: string;
  tone: 'good' | 'warning' | 'error';
}

function SummaryIcon({ tone }: { tone: SummaryItem['tone'] }) {
  if (tone === 'good') return <CheckCircle2 size={14} color="#22c55e" />;
  if (tone === 'warning') return <AlertCircle size={14} color="#f59e0b" />;
  return <XCircle size={14} color="#ef4444" />;
}

export function ConfigSummaryBlock({
  state,
  status,
  warningCount,
  errorCount,
  onJumpToStep,
}: ConfigSummaryBlockProps) {
  const items: SummaryItem[] = [
    {
      key: 'model',
      label: 'Primary model',
      value: `${state.model ?? 'Missing model'} via ${state.provider ?? 'Missing provider'}`,
      tone: state.model && state.provider ? 'good' : 'error',
    },
    {
      key: 'fallback',
      label: 'Fallback chain',
      value: state.fallbackEnabled ? state.fallbackChain.join(' -> ') || 'Missing fallback models' : 'Disabled',
      tone: state.fallbackEnabled && state.fallbackChain.length === 0 ? 'error' : 'good',
    },
    {
      key: 'channels',
      label: 'Channels',
      value: state.channels.length > 0 ? state.channels.join(', ') : 'No channels selected',
      tone: state.channels.length > 0 ? 'good' : 'error',
    },
    {
      key: 'memory',
      label: 'Memory',
      value: state.memory ? 'Enabled' : 'Disabled',
      tone: state.memory ? 'warning' : 'good',
    },
    {
      key: 'logging',
      label: 'Logging',
      value: state.loggingLevel,
      tone: 'good',
    },
    {
      key: 'credentials',
      label: 'Credential warnings',
      value: warningCount > 0 ? `${warningCount} warning(s)` : 'No warnings',
      tone: warningCount > 0 ? 'warning' : 'good',
    },
  ];

  return (
    <div
      style={{
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.45)',
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <p style={{ margin: 0, color: '#f8fafc', fontSize: '13px', fontWeight: 700 }}>Config Summary</p>
        <span
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            borderRadius: '999px',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            color: status === 'READY' ? '#86efac' : status === 'VALID' ? '#fde68a' : '#fca5a5',
            background: status === 'READY' ? 'rgba(22, 163, 74, 0.2)' : status === 'VALID' ? 'rgba(146, 64, 14, 0.25)' : 'rgba(127, 29, 29, 0.35)',
          }}
        >
          {status}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {items.map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => onJumpToStep(SUMMARY_FIELD_STEP_MAP[item.key])}
            style={{
              border: 'none',
              background: 'rgba(2, 6, 23, 0.6)',
              borderRadius: '8px',
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 8px',
              cursor: 'pointer',
              fontSize: '12px',
              textAlign: 'left',
            }}
          >
            <SummaryIcon tone={item.tone} />
            <span style={{ fontWeight: 600, minWidth: '120px' }}>{item.label}</span>
            <span style={{ color: '#cbd5e1' }}>{item.value}</span>
          </button>
        ))}
      </div>

      {errorCount > 0 && (
        <p style={{ margin: '10px 0 0', color: '#fca5a5', fontSize: '12px' }}>
          Blocking issues: {errorCount}
        </p>
      )}
    </div>
  );
}


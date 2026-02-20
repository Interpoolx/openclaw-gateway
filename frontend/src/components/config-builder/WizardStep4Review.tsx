import { AlertCircle, AlertTriangle, CheckCircle, Save } from 'lucide-react';

interface WizardStep4ReviewProps {
  status: 'INVALID' | 'VALID' | 'READY';
  warningCount: number;
  errorCount: number;
  onSave?: () => void;
  canSave?: boolean;
}

export function WizardStep4Review({
  status,
  warningCount,
  errorCount,
  onSave,
  canSave,
}: WizardStep4ReviewProps) {
  const statusConfig = {
    READY: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.4)', icon: <CheckCircle size={18} /> },
    VALID: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', icon: <AlertCircle size={18} /> },
    INVALID: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)', icon: <AlertTriangle size={18} /> },
  };
  const config = statusConfig[status];

  return (
    <div
      style={{
        border: '1px solid rgba(148, 163, 184, 0.25)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <p style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
        Review and Export
      </p>
      <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>
        The JSON preview is final output. Click any summary item to jump back and edit.
      </p>

      {/* Status Banner */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '14px 16px',
          borderRadius: '12px',
          background: config.bg,
          border: `1px solid ${config.border}`,
          marginBottom: '16px',
        }}
      >
        <span style={{ color: config.color }}>{config.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ color: config.color, fontWeight: 600, fontSize: '14px' }}>Status: {status}</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ color: '#f59e0b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⚠️ Warnings: {warningCount}
          </span>
          <span style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ✖ Errors: {errorCount}
          </span>
        </div>
      </div>

      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          style={{
            marginTop: '16px',
            width: '100%',
            border: '1px solid rgba(34, 197, 94, 0.45)',
            background: canSave 
              ? 'linear-gradient(135deg, rgba(22, 163, 74, 0.5) 0%, rgba(15, 101, 46, 0.4) 100%)' 
              : 'rgba(51, 65, 85, 0.5)',
            color: canSave ? '#dcfce7' : '#94a3b8',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: canSave ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: canSave ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none',
          }}
        >
          <Save size={18} />
          Save Setup
        </button>
      )}
    </div>
  );
}


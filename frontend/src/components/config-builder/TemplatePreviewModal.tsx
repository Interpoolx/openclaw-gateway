import { ConfigTemplate } from '../../lib/api';

interface TemplatePreviewModalProps {
  template: ConfigTemplate | null;
  onClose: () => void;
  onUseTemplate: (template: ConfigTemplate) => void;
}

export function TemplatePreviewModal({ template, onClose, onUseTemplate }: TemplatePreviewModalProps) {
  if (!template) return null;
  const previewJson = (() => {
    try {
      return JSON.stringify(JSON.parse(template.baseConfigJson), null, 2);
    } catch {
      return template.baseConfigJson;
    }
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(860px, 100%)',
          maxHeight: '85vh',
          overflow: 'auto',
          background: '#0f172a',
          borderRadius: '14px',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          padding: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '14px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>{template.name}</h3>
            <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: '13px' }}>{template.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'transparent',
              color: '#e2e8f0',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {template.channels.map((channel) => (
            <span
              key={`channel-${channel}`}
              style={{
                padding: '4px 8px',
                borderRadius: '999px',
                background: 'rgba(59, 130, 246, 0.18)',
                color: '#bfdbfe',
                fontSize: '11px',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              {channel}
            </span>
          ))}
          {template.providers.map((provider) => (
            <span
              key={`provider-${provider}`}
              style={{
                padding: '4px 8px',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#bbf7d0',
                fontSize: '11px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              {provider}
            </span>
          ))}
        </div>

        <pre
          style={{
            marginTop: '14px',
            background: '#020617',
            border: '1px solid rgba(30, 41, 59, 1)',
            borderRadius: '10px',
            padding: '12px',
            color: '#cbd5e1',
            fontSize: '12px',
            overflowX: 'auto',
            lineHeight: 1.5,
          }}
        >
          {previewJson}
        </pre>

        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onUseTemplate(template)}
            style={{
              border: '1px solid rgba(34, 197, 94, 0.35)',
              background: 'rgba(21, 128, 61, 0.35)',
              color: '#dcfce7',
              borderRadius: '8px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Customize in Builder
          </button>
        </div>
      </div>
    </div>
  );
}

interface DraftBannerProps {
  timestamp: string | null;
  onResume: () => void;
  onDiscard: () => void;
}

export function DraftBanner({ timestamp, onResume, onDiscard }: DraftBannerProps) {
  if (!timestamp) return null;

  const formatted = new Date(timestamp).toLocaleString();

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        background: 'rgba(245, 158, 11, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '16px',
      }}
    >
      <p style={{ margin: 0, fontSize: '13px', color: '#fbbf24' }}>
        You have an unsaved draft from {formatted}.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onResume}
          style={{
            border: '1px solid rgba(148, 163, 184, 0.4)',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#e2e8f0',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Resume
        </button>
        <button
          type="button"
          onClick={onDiscard}
          style={{
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(127, 29, 29, 0.45)',
            color: '#fecaca',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}


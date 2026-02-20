import { Download, FolderOpen, Wand2 } from 'lucide-react';
import { ComponentType } from 'react';

interface EntrySelectorProps {
  onTemplates: () => void;
  onBuilder: () => void;
  onImport: () => void;
}

function EntryCard(props: {
  title: string;
  description: string;
  icon: ComponentType<{ size?: string | number }>;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        textAlign: 'left',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        background: 'rgba(15, 23, 42, 0.45)',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} />
        </div>
        <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '14px' }}>{props.title}</span>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
        {props.description}
      </p>
    </button>
  );
}

export function EntrySelector({ onTemplates, onBuilder, onImport }: EntrySelectorProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
      <EntryCard
        title="Templates"
        description="Start from curated templates and customize before export."
        icon={FolderOpen}
        onClick={onTemplates}
      />
      <EntryCard
        title="Build From Scratch"
        description="Use the 4-step wizard from an empty baseline."
        icon={Wand2}
        onClick={onBuilder}
      />
      <EntryCard
        title="Import JSON"
        description="Paste or upload existing config JSON and continue editing."
        icon={Download}
        onClick={onImport}
      />
    </div>
  );
}

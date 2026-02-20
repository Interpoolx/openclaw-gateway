import { ConfigTemplate } from '../../lib/api';
import { getTemplateCopy, readStringList } from './templateCopy';

interface TemplateCardProps {
  template: ConfigTemplate;
  onUseTemplate: (template: ConfigTemplate) => void;
  onOpenDetails: (template: ConfigTemplate) => void;
}

export function TemplateCard({ template, onUseTemplate, onOpenDetails }: TemplateCardProps) {
  const channels = readStringList((template as unknown as Record<string, unknown>).channels);
  const providers = readStringList((template as unknown as Record<string, unknown>).providers);
  const tags = readStringList((template as unknown as Record<string, unknown>).tags);
  const highlights = [...channels, ...providers, ...tags]
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 4);
  const copy = getTemplateCopy(template);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(template)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetails(template);
        }
      }}
      style={{
        border: '1px solid rgba(148, 163, 184, 0.22)',
        background: 'rgba(15, 23, 42, 0.45)',
        borderRadius: '12px',
        padding: '14px',
        minHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '15px' }}>{template.name}</h3>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '12px', textTransform: 'capitalize' }}>
            {template.goal}
          </p>
        </div>
        <span
          style={{
            border: '1px solid rgba(148, 163, 184, 0.25)',
            background: 'rgba(15, 23, 42, 0.65)',
            color: '#cbd5e1',
            borderRadius: '999px',
            padding: '4px 9px',
            fontSize: '11px',
            textTransform: 'capitalize',
          }}
        >
          {template.category}
        </span>
      </div>

      <p
        style={{
          margin: '10px 0 0',
          fontSize: '12px',
          color: '#cbd5e1',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {copy.short}
      </p>

      <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '5px' }}>
        {highlights.map((highlight) => (
          <li
            key={`${template.id}-${highlight}`}
            style={{ fontSize: '11px', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ color: '#34d399', fontWeight: 700 }}>v</span>
            <span style={{ textTransform: 'capitalize' }}>{highlight}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetails(template);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#93c5fd',
            padding: '0',
            cursor: 'pointer',
            fontSize: '12px',
            textDecoration: 'underline',
          }}
        >
          Details
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onUseTemplate(template);
          }}
          style={{
            border: '1px solid rgba(34, 197, 94, 0.45)',
            background: 'rgba(21, 128, 61, 0.4)',
            color: '#dcfce7',
            borderRadius: '8px',
            padding: '7px 10px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '12px',
            marginLeft: 'auto',
          }}
        >
          Use
        </button>
      </div>
    </div>
  );
}

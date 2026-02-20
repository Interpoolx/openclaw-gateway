import { Copy, Download } from 'lucide-react';
import { useMemo, useState } from 'react';

interface JsonPreviewPanelProps {
  configJson: Record<string, unknown> | null;
  status: 'INVALID' | 'VALID' | 'READY';
  schemaTooltips: Record<string, string>;
  changedKeys: Set<string>;
  newKeys: Set<string>;
  removedKeys: Set<string>;
  rawText?: string;
  parseError?: string | null;
  onCopy?: () => void;
  onDownload?: () => void;
}

function keyMatchesPath(key: string, paths: Set<string>): boolean {
  for (const path of paths) {
    if (path === key) return true;
    if (path.endsWith(`.${key}`)) return true;
    if (path.includes(`[${key}]`)) return true;
  }
  return false;
}

export function JsonPreviewPanel({
  configJson,
  status,
  schemaTooltips,
  changedKeys,
  newKeys,
  removedKeys,
  rawText,
  parseError,
  onCopy,
  onDownload,
}: JsonPreviewPanelProps) {
  const [copied, setCopied] = useState(false);
  const renderedJson = rawText ?? JSON.stringify(configJson ?? {}, null, 2);
  const lines = renderedJson.split('\n');
  const lineCount = lines.length;
  const fileSizeBytes = new TextEncoder().encode(renderedJson).length;
  const fileSizeKb = fileSizeBytes / 1024;

  const headerColor = status === 'READY'
    ? '#22c55e'
    : status === 'VALID'
      ? '#f59e0b'
      : '#ef4444';

  const highlightedLines = useMemo(() => {
    return lines.map((line) => {
      const keyMatch = line.match(/^\s*"([^"]+)":/);
      const keyName = keyMatch?.[1];
      if (!keyName) return { line, key: null, tone: null as null | 'changed' | 'new' };
      if (keyMatchesPath(keyName, newKeys)) return { line, key: keyName, tone: 'new' as const };
      if (keyMatchesPath(keyName, changedKeys)) return { line, key: keyName, tone: 'changed' as const };
      return { line, key: keyName, tone: null };
    });
  }, [lines, changedKeys, newKeys]);

  const copyJson = async () => {
    await navigator.clipboard.writeText(renderedJson);
    setCopied(true);
    onCopy?.();
    window.setTimeout(() => setCopied(false), 900);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
          copyJson().catch(() => undefined);
        }
      }}
      style={{
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '12px',
        background: '#020617',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              border: `1px solid ${headerColor}55`,
              background: `${headerColor}22`,
              color: headerColor,
              borderRadius: '999px',
              fontSize: '11px',
              padding: '3px 8px',
              fontWeight: 700,
            }}
          >
            {status}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
            {lineCount} lines • {fileSizeKb.toFixed(1)} KB
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => copyJson().catch(() => undefined)}
            style={{
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'rgba(15, 23, 42, 0.7)',
              color: '#e2e8f0',
              borderRadius: '8px',
              fontSize: '11px',
              padding: '5px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Copy size={13} />
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onDownload}
            style={{
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'rgba(15, 23, 42, 0.7)',
              color: '#e2e8f0',
              borderRadius: '8px',
              fontSize: '11px',
              padding: '5px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Download size={13} />
            Download
          </button>
        </div>
      </div>

      {removedKeys.size > 0 && (
        <div
          style={{
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '6px 10px',
            color: '#fca5a5',
            fontSize: '11px',
            background: 'rgba(127, 29, 29, 0.2)',
          }}
        >
          Removed keys:{' '}
          {Array.from(removedKeys).map((key) => (
            <span key={key} style={{ textDecoration: 'line-through', marginRight: '6px' }}>
              {key}
            </span>
          ))}
        </div>
      )}

      {parseError && (
        <div
          style={{
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '8px 10px',
            color: '#fca5a5',
            fontSize: '11px',
            background: 'rgba(127, 29, 29, 0.25)',
          }}
        >
          {parseError}
        </div>
      )}

      <div style={{ maxHeight: '460px', overflow: 'auto' }}>
        <pre
          style={{
            margin: 0,
            padding: '10px 12px',
            fontSize: '12px',
            color: '#cbd5e1',
            lineHeight: 1.55,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {highlightedLines.map((entry, index) => {
            const keyMatch = entry.line.match(/^(\s*)"([^"]+)"(.*)$/);
            const tooltip = entry.key ? schemaTooltips[entry.key] : undefined;
            const toneStyle = entry.tone === 'new'
              ? { background: 'rgba(22, 163, 74, 0.18)' }
              : entry.tone === 'changed'
                ? { background: 'rgba(245, 158, 11, 0.2)' }
                : {};

            if (!keyMatch) {
              return (
                <div key={`line-${index}`} style={toneStyle}>
                  {entry.line}
                </div>
              );
            }

            return (
              <div key={`line-${index}`} style={toneStyle}>
                {keyMatch[1]}
                <span title={tooltip || ''} style={{ color: '#93c5fd', cursor: tooltip ? 'help' : 'default' }}>
                  "{keyMatch[2]}"
                </span>
                <span style={{ color: '#cbd5e1' }}>{keyMatch[3]}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}


import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { mapImportedConfigToBuilderState } from './configMapper';
import { BuilderState } from './types';

interface ImportJsonPanelProps {
  onImportMapped: (mapped: Partial<BuilderState>) => void;
}

function parseJsonErrorPosition(text: string, errorMessage: string): { line: number; column: number } | null {
  const positionMatch = errorMessage.match(/position\s+(\d+)/i);
  if (!positionMatch) return null;
  const position = Number.parseInt(positionMatch[1], 10);
  if (!Number.isFinite(position)) return null;
  const truncated = text.slice(0, position);
  const line = truncated.split('\n').length;
  const column = position - truncated.lastIndexOf('\n');
  return { line, column };
}

export function ImportJsonPanel({ onImportMapped }: ImportJsonPanelProps) {
  const [inputText, setInputText] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const handleParse = (sourceText: string) => {
    if (!sourceText.trim()) {
      setErrorText(null);
      setSuccessText(null);
      return;
    }

    try {
      const parsed = JSON.parse(sourceText) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setErrorText('JSON root must be an object.');
        setSuccessText(null);
        return;
      }

      const mapped = mapImportedConfigToBuilderState(parsed as Record<string, unknown>);
      onImportMapped(mapped);
      setErrorText(null);
      setSuccessText('Config imported. Review settings below before exporting.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parse error';
      const position = parseJsonErrorPosition(sourceText, message);
      if (position) {
        setErrorText(`Unexpected JSON token at line ${position.line}, column ${position.column}.`);
      } else {
        setErrorText(message);
      }
      setSuccessText(null);
    }
  };

  useEffect(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      handleParse(inputText);
    }, 350);

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [inputText]);

  const onUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setErrorText('Only .json files are supported.');
      return;
    }
    const text = await file.text();
    setInputText(text);
  };

  return (
    <div
      style={{
        border: '1px solid rgba(148, 163, 184, 0.25)',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '12px',
        padding: '14px',
      }}
    >
      <p style={{ margin: 0, color: '#f8fafc', fontWeight: 600, fontSize: '14px' }}>
        Import Existing JSON
      </p>
      <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '12px' }}>
        Paste JSON or upload a file. Parsed values are mapped directly into the builder state.
      </p>

      <textarea
        aria-label="Paste config JSON"
        value={inputText}
        onChange={(event) => setInputText(event.target.value)}
        placeholder='{"version":"1.0.0","agent":{"provider":"openai","model":"gpt-4o"},"channels":[{"type":"telegram","token":"..."}]}'
        style={{
          marginTop: '10px',
          width: '100%',
          minHeight: '220px',
          borderRadius: '10px',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          background: '#020617',
          color: '#cbd5e1',
          padding: '12px',
          fontSize: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineHeight: 1.4,
          resize: 'vertical',
        }}
      />

      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <input
          aria-label="Upload JSON file"
          type="file"
          accept=".json"
          onChange={onUploadFile}
          style={{ color: '#cbd5e1', fontSize: '12px' }}
        />
      </div>

      {errorText && (
        <div
          style={{
            marginTop: '10px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(127, 29, 29, 0.35)',
            color: '#fecaca',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '12px',
          }}
        >
          {errorText}
        </div>
      )}

      {successText && (
        <div
          style={{
            marginTop: '10px',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            background: 'rgba(22, 101, 52, 0.35)',
            color: '#dcfce7',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '12px',
          }}
        >
          {successText}
        </div>
      )}
    </div>
  );
}


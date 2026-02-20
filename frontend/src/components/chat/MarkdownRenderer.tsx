import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {

  const components = {
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : 'text';
      
      if (inline) {
        return (
          <code
            style={{
              background: 'var(--bg-tertiary)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.9em',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div style={{ position: 'relative', margin: '12px 0' }}>
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {lang}
          </div>
          <pre
            style={{
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              overflow: 'auto',
              fontSize: '13px',
              lineHeight: '1.5',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            <code>{children}</code>
          </pre>
        </div>
      );
    },
    p({ children }: any) {
      return <p style={{ margin: '8px 0', lineHeight: '1.6' }}>{children}</p>;
    },
    ul({ children }: any) {
      return <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>;
    },
    ol({ children }: any) {
      return <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ol>;
    },
    li({ children }: any) {
      return <li style={{ margin: '4px 0' }}>{children}</li>;
    },
    h1({ children }: any) {
      return <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '16px 0 8px' }}>{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '14px 0 8px' }}>{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '12px 0 8px' }}>{children}</h3>;
    },
    blockquote({ children }: any) {
      return (
        <blockquote
          style={{
            borderLeft: '3px solid var(--accent-primary)',
            margin: '12px 0',
            paddingLeft: '16px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {children}
        </blockquote>
      );
    },
    a({ children, href }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
        >
          {children}
        </a>
      );
    },
    table({ children }: any) {
      return (
        <div style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead style={{ background: 'var(--bg-tertiary)' }}>{children}</thead>;
    },
    th({ children }: any) {
      return (
        <th
          style={{
            padding: '10px 12px',
            textAlign: 'left',
            fontWeight: 600,
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return (
        <td
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {children}
        </td>
      );
    },
  };

  return (
    <div className={className} style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

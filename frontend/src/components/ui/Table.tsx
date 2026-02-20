import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  style?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  style?: React.CSSProperties;
}

export function Table<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
  style,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          color: '#6b7280',
          ...style,
        }}
      >
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          color: '#6b7280',
          ...style,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', ...style }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#6b7280',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  ...column.headerStyle,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor =
                    'rgba(255, 255, 255, 0.03)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: '14px 16px',
                    fontSize: '14px',
                    color: '#f3f4f6',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    ...column.style,
                  }}
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

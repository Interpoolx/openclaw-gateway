import React from 'react';

interface DataListItem {
  id: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  status?: {
    type: 'success' | 'warning' | 'error' | 'info' | 'default';
    label: string;
  };
  badges?: Array<{ label: string; color: string; bgColor: string }>;
  metadata?: Array<{ icon?: React.ReactNode; label: string; value: string }>;
  onClick?: () => void;
}

export interface DataListProps {
  items: DataListItem[];
  onItemClick?: (item: DataListItem) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataList({ items, onItemClick, emptyMessage = 'No items found', loading = false }: DataListProps) {
  const statusColors = {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    default: '#6b7280',
  };

  if (loading) {
    return (
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.02)', 
        border: '1px solid rgba(255, 255, 255, 0.06)', 
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ color: '#666', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.02)', 
        border: '1px solid rgba(255, 255, 255, 0.06)', 
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📋</div>
        <div style={{ color: '#888', fontSize: '14px' }}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.02)', 
      border: '1px solid rgba(255, 255, 255, 0.06)', 
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {items.map((item, idx) => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            borderBottom: idx < items.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
            cursor: onItemClick ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            if (onItemClick) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {item.icon && (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}>
              {item.icon}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h4 style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {item.title}
              </h4>
              {item.status && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  background: `${statusColors[item.status.type]}15`,
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: statusColors[item.status.type],
                  flexShrink: 0,
                }}>
                  <span style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: statusColors[item.status.type],
                  }} />
                  {item.status.label}
                </span>
              )}
            </div>
            {item.subtitle && (
              <p style={{ 
                fontSize: '13px', 
                color: '#888',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {item.subtitle}
              </p>
            )}
          </div>

          {item.badges && item.badges.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {item.badges.map((badge, badgeIdx) => (
                <span
                  key={badgeIdx}
                  style={{
                    padding: '3px 8px',
                    background: badge.bgColor,
                    color: badge.color,
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {item.metadata && item.metadata.length > 0 && (
            <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
              {item.metadata.map((meta, metaIdx) => (
                <div key={metaIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {meta.icon}
                  <div>
                    <div style={{ fontSize: '12px', color: '#fff' }}>{meta.value}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{meta.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

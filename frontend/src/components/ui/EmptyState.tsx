import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  style,
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '64px 24px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '16px',
        border: '1px dashed rgba(255, 255, 255, 0.1)',
        ...style,
      }}
    >
      {Icon && (
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'center',
            color: '#52525b',
          }}
        >
          <Icon size={48} />
        </div>
      )}
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#f3f4f6',
          marginBottom: '8px',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: '#6b7280',
          fontSize: '14px',
          marginBottom: action ? '24px' : '0',
          margin: '0 0 24px',
        }}
      >
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

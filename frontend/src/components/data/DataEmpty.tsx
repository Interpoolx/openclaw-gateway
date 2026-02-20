import React from 'react';
import { Plus } from 'lucide-react';

export interface DataEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function DataEmpty({ icon, title, description, action }: DataEmptyProps) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 40px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '16px',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
    }}>
      <div style={{ 
        fontSize: '48px', 
        marginBottom: '16px',
        opacity: 0.6,
      }}>
        {icon ?? '📭'}
      </div>
      <h3 style={{ 
        fontSize: '16px', 
        fontWeight: 600, 
        color: '#fff',
        marginBottom: '8px',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ 
          fontSize: '14px', 
          color: '#666',
          marginBottom: '20px',
          maxWidth: '300px',
          margin: '0 auto 20px',
        }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            color: '#60a5fa',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
          }}
        >
          <Plus size={18} />
          {action.label}
        </button>
      )}
    </div>
  );
}

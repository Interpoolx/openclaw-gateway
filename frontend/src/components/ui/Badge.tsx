import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#9ca3af',
  },
  primary: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
  },
  success: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#4ade80',
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
  },
  info: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    color: '#c084fc',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 500,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    idle: { variant: 'success', label: 'Idle' },
    active: { variant: 'primary', label: 'Active' },
    busy: { variant: 'warning', label: 'Busy' },
    offline: { variant: 'default', label: 'Offline' },
    online: { variant: 'success', label: 'Online' },
    paused: { variant: 'warning', label: 'Paused' },
    completed: { variant: 'success', label: 'Completed' },
    error: { variant: 'danger', label: 'Error' },
  };

  const config = statusConfig[status.toLowerCase()] ?? {
    variant: 'default' as BadgeVariant,
    label: status,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

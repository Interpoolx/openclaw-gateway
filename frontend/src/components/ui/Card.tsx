import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  style,
  hoverable = false,
  onClick,
}) => {
  const baseStyles: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.2s ease',
    cursor: onClick || hoverable ? 'pointer' : 'default',
    ...style,
  };

  const Component = onClick ? 'div' : 'div';

  return (
    <Component
      className={className}
      style={baseStyles}
      onClick={onClick}
    >
      {children}
    </Component>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  return (
    <div
      style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return (
    <div style={{ padding: '16px 20px', ...style }}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

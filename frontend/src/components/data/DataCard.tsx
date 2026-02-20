import React from 'react';

export interface Badge {
  label: string;
  color: string;
  bgColor: string;
}

export interface DataCardProps {
  avatar?: React.ReactNode;
  title: string;
  description?: string;
  badges?: Badge[];
  metadata?: Array<{ label: string; value: React.ReactNode }>;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  }>;
  status?: {
    type: 'success' | 'warning' | 'error' | 'info' | 'default';
    label: string;
  };
  onClick?: () => void;
  timestamp?: string;
}

export function DataCard({
  avatar,
  title,
  description,
  badges = [],
  metadata = [],
  actions = [],
  status,
  onClick,
  timestamp,
}: DataCardProps) {
  const statusColors = {
    success: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
    default: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.3)' },
  };

  const currentStatus = statusColors[status?.type ?? 'default'];

  return (
    <div
      onClick={onClick}
      className={`bg-white/[0.02] border border-white/5 rounded-xl p-5 transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-white/[0.04] hover:border-white/10' : 'cursor-default'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          {avatar && (
            <span className="text-[32px]">{avatar}</span>
          )}
          <div>
            <h3 className="text-[15px] font-semibold text-white mb-0.5">
              {title}
            </h3>
            {description && (
              <p className="text-[13px] text-[#888] leading-normal">
                {description.length > 100 ? description.slice(0, 100) + '...' : description}
              </p>
            )}
          </div>
        </div>
        {status && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
            style={{
              background: currentStatus.bg,
              borderColor: currentStatus.border
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: currentStatus.color }}
            />
            <span
              className="text-[12px] capitalize"
              style={{ color: currentStatus.color }}
            >
              {status.label}
            </span>
          </div>
        )}
      </div>

      {badges.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {badges.map((badge, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded text-[11px] font-medium"
              style={{
                background: badge.bgColor,
                color: badge.color,
              }}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {metadata.length > 0 && (
        <div className="flex gap-5 p-3 bg-white/[0.02] rounded-lg mb-3">
          {metadata.map((meta, idx) => (
            <div key={idx}>
              <div className="text-[13px] text-white font-semibold">{meta.value}</div>
              <div className="text-[11px] text-[#666]">{meta.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <span className="text-[11px] text-[#666]">
          {timestamp ? new Date(timestamp).toLocaleDateString() : ''}
        </span>
        {actions.length > 0 && (
          <div className="flex gap-1.5">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${action.variant === 'danger'
                    ? 'bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20'
                    : action.variant === 'primary'
                      ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                      : 'bg-transparent border-none text-[#888] hover:text-[#bbb] hover:bg-white/5'
                  }`}
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useState, useMemo, useContext } from 'react';
import { LucideIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { ThemeContext } from '../../contexts/ThemeContext';

// ==========================================
// Form Field Colors - Theme-aware
// ==========================================
const DARK_COLORS = {
  bgColor: '#0a0a0b',   // Dark gray
  textColor: '#777778', // Light gray
  borderColor: '#1a1a1c'
};

const LIGHT_COLORS = {
  bgColor: '#f9fafb',   // Light gray
  textColor: '#111827', // Dark gray
  borderColor: '#e5e7eb'
};

// Hook to get current field colors based on theme
function useFieldColors() {
  const context = useContext(ThemeContext);
  const theme = context?.theme ?? 'dark';
  return theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}

// Component-friendly version that returns the colors (defaults to dark for static usage)
export const FIELD_COLORS = {
  get bgColor() { return DARK_COLORS.bgColor; },
  get textColor() { return DARK_COLORS.textColor; },
  get borderColor() { return DARK_COLORS.borderColor; },
};

// ==========================================
// Empty State Component
// ==========================================

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title = 'No items found', description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      data-name="empty-state"
      className="text-center p-16 bg-[#1a1a1c] rounded-xl border border-dashed border-gray-700"
    >
      {Icon && (
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white/5 mb-5">
          <Icon size={28} className="text-gray-400" />
        </div>
      )}
      <h3 className="text-gray-400 text-lg font-semibold mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 text-sm mb-6 mx-auto">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// ==========================================
// Skeleton Loading Component
// ==========================================

export interface SkeletonProps {
  count?: number;
  height?: number;
  variant?: 'text' | 'rect' | 'circle';
  width?: number | string;
}

export function Skeleton({ count = 1, height = 60, variant = 'rect', width = '100%' }: SkeletonProps) {
  return (
    <div data-name="skeleton" className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-name="skeleton-item"
          className={`${variant === 'text' ? 'h-5' : ''} ${variant === 'circle' ? 'rounded-full' : 'rounded-lg'} bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-pulse`}
          style={{
            height: variant === 'text' ? '20px' : height,
            width: variant === 'circle' ? height : width,
          }}
        />
      ))}
    </div>
  );
}

// ==========================================
// Stats Skeleton Component
// ==========================================

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div data-name="stats-skeleton" className="grid gap-4" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-name="stats-skeleton-card"
          className="bg-[#1a1a1c] border border-white/5 rounded-xl p-5"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div data-name="skeleton-icon" className="w-5 h-5 rounded bg-white/10 animate-pulse" />
            <div data-name="skeleton-label" className="w-20 h-3.5 rounded bg-white/10 animate-pulse" />
          </div>
          <div data-name="skeleton-value" className="w-24 h-7 rounded bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ==========================================
// Unified Page Configuration Types
// ==========================================

export type DataDisplayType = 'table' | 'datagrid' | 'datatable';
export type ViewMode = 'grid' | 'table' | 'list';
export type AddEditViewType = 'drawer' | 'modal';

export interface StatCardConfig {
  id: string;
  label: string;
  valueKey: string;
  icon: LucideIcon;
  color: string;
  format?: 'number' | 'currency' | 'percent' | 'tokens';
}

export interface FilterOption {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'tags';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableAction {
  label: string;
  icon?: LucideIcon;
  onClick: (row: any) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  show?: (row: any) => boolean;
}

export interface PageConfig {
  // UI Features
  stats?: boolean;
  search?: boolean;
  filter?: boolean;
  dataDisplay?: 'table' | 'datagrid' | 'datatable';
  defaultView?: string,
  showMultiView?: boolean;
  multiViewOptions?: ViewMode[];
  importExport?: boolean;
  addEditView?: AddEditViewType;

  // Custom Grid View
  renderCustomGridView?: (items: any[], handlers: { handleEdit: (item: any) => void; handleDelete: (item: any) => void; handleView: (item: any) => void }) => React.ReactNode;

  // Custom Detail View
  renderDetailView?: (item: any) => React.ReactNode;

  // Pagination
  pagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];

  // Sorting
  sortable?: boolean;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';

  // Table Columns
  columns?: TableColumn[];

  // Actions
  showActions?: boolean;
  actions?: TableAction[];

  // Labels
  labels?: {
    title?: string;
    subtitle?: string;
    addButton?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    helpText?: string;
    paginationInfo?: (start: number, end: number, total: number) => string;
  };

  // Icon
  icon?: LucideIcon;

  // Stats Cards
  statsConfig?: {
    cards: StatCardConfig[];
    dataKey?: string;
  };

  // Filters
  filterOptions?: FilterOption[];

  // Form
  formConfig?: {
    fields: FormField[];
  };
}

// ==========================================
// Default Colors
// ==========================================

export const defaultStatColors: Record<string, { bg: string; color: string; border: string }> = {
  blue: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
  green: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.2)' },
  purple: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.2)' },
  amber: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  red: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  cyan: { bg: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: 'rgba(6, 182, 212, 0.2)' },
};

export const defaultCategoryColors: Record<string, { bg: string; text: string }> = {
  feature: { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc' },
  bugfix: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5' },
  refactor: { bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd' },
  research: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d' },
  documentation: { bg: 'rgba(107, 114, 128, 0.2)', text: '#d1d5db' },
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#86efac' },
  paused: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d' },
  completed: { bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd' },
  archived: { bg: 'rgba(107, 114, 128, 0.2)', text: '#d1d5db' },
};

// ==========================================
// Grid View Renderer Component
// ==========================================

interface GridViewRendererProps<T> {
  items: T[];
  handlers: { handleEdit: (item: T) => void; handleDelete: (item: T) => void; handleView: (item: T) => void };
  renderCard: (items: T[], handlers: { handleEdit: (item: T) => void; handleDelete: (item: T) => void; handleView: (item: T) => void }) => React.ReactNode;
}

export function GridViewRenderer<T>({ items, handlers, renderCard }: GridViewRendererProps<T>) {
  return <>{renderCard(items, handlers)}</>;
}

// ==========================================
// Page Layout Component
// ==========================================

export interface PageLayoutProps<T = any> {
  config: PageConfig;
  data: T[];
  stats: Record<string, any>;
  loading?: boolean;
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  onCreate?: (data: Record<string, any>) => Promise<void>;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onUpdate?: (id: string, data: Record<string, any>) => Promise<void>;
  onDelete?: (row: T) => Promise<void>;
  onRowClick?: (row: T) => void;
  transformData?: (data: T[]) => T[];
  transformStats?: (stats: any) => any;
  renderCustomStats?: (stats: any) => React.ReactNode;
  renderCustomFilters?: () => React.ReactNode;
  renderCustomActions?: () => React.ReactNode;
  renderDetailView?: (row: T) => React.ReactNode;
  renderCustomGridView?: (items: T[], handlers: { handleEdit: (item: T) => void; handleDelete: (item: T) => void; handleView: (item: T) => void }) => React.ReactNode;
}

// ==========================================
// Human-friendly date formatting
// ==========================================
function formatTimeAgo(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}

function formatDueDate(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)} day${Math.abs(diffInDays) > 1 ? 's' : ''} overdue`;
  } else if (diffInDays === 0) {
    return 'Due today';
  } else if (diffInDays === 1) {
    return 'Due tomorrow';
  } else if (diffInDays < 7) {
    return `Due in ${diffInDays} days`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `Due in ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    const months = Math.floor(diffInDays / 30);
    return `Due in ${months} month${months > 1 ? 's' : ''}`;
  }
}

/**
 * Unified Page Layout Component
 * Config-driven page layout with stats, search, filters, multi-view, pagination, sorting, and drawer
 */
export function PageLayout<T extends Record<string, any>>({
  config,
  data,
  stats,
  loading,
  icon: HeaderIcon,
  title = 'Page',
  subtitle,
  onCreate,
  onView,
  onEdit,
  onUpdate,
  onDelete,
  onRowClick,
  transformData,
  transformStats,
  renderCustomStats,
  renderCustomFilters,
  renderCustomActions,
  renderDetailView,
  renderCustomGridView,
}: PageLayoutProps<T>) {
  // Theme-aware colors
  const colors = useFieldColors();

  // Resolve renderers from props or config
  const customGridViewRenderer = renderCustomGridView ?? config.renderCustomGridView;
  const detailViewRenderer = renderDetailView ?? config.renderDetailView;
  // Get default view from config or use 'table' as default
  const defaultView = config.defaultView ?? 'table';

  const [viewMode, setViewMode] = useState<ViewMode>(defaultView as ViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.defaultPageSize ?? 10);

  // Sorting state
  const [sortBy, setSortBy] = useState(config.defaultSortBy ?? '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(config.defaultSortOrder ?? 'asc');

  // Synchronize selectedItem with latest data from props
  useMemo(() => {
    if (selectedItem && data) {
      const latest = data.find((item: any) => item.id === selectedItem.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(selectedItem)) {
        setSelectedItem(latest);
        if (isEdit) {
          // If we are editing, we usually don't want to overwrite formData 
          // from external props unless we just opened it, but for Toggle 
          // in detail view it's important.
        }
      }
    }
  }, [data, selectedItem, isEdit]);

  // Filter, sort, and paginate data
  const processedData = useMemo(() => {
    let result = transformData?.(data) ?? [...data];

    // Apply search filter
    if (config.search && searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const matchesName = (item.name || '').toLowerCase().includes(searchLower);
        const matchesDesc = (item.description || '').toLowerCase().includes(searchLower);
        return matchesName || matchesDesc;
      });
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter((item) => item[key] === value);
      }
    });

    // Apply sorting
    if (config.sortable && sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy] ?? '';
        const bVal = b[sortBy] ?? '';
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, transformData, config.search, config.sortable, searchQuery, filters, sortBy, sortOrder]);

  // Pagination
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = config.pagination
    ? processedData.slice((page - 1) * pageSize, page * pageSize)
    : processedData;

  // Handle sort click
  const handleSort = (columnKey: string) => {
    if (!config.sortable) return;
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      if (isEdit && selectedItem?.id && onUpdate) {
        await onUpdate(selectedItem.id, formData);
      } else if (onCreate) {
        await onCreate(formData);
      }
      setDrawerOpen(false);
      setFormData({});
      setIsEdit(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle view action
  const handleView = (item: T) => {
    if (onView) {
      onView(item);
    } else {
      setSelectedItem(item);
      setViewDrawerOpen(true);
    }
  };

  // Handle edit action
  const handleEdit = (item: T) => {
    if (onEdit) {
      onEdit(item);
    } else if (onUpdate) {
      setSelectedItem(item);
      setFormData({ ...item });
      setIsEdit(true);
      setDrawerOpen(true);
    }
  };

  // Handle delete action
  const handleDelete = async (item: T) => {
    if (onDelete) {
      await onDelete(item);
    }
  };

  // Format stat value
  const formatValue = (value: any, format?: string): string => {
    if (value === null || value === undefined) return '0';
    switch (format) {
      case 'currency': return `$${Number(value).toFixed(2)}`;
      case 'percent': return `${value}%`;
      case 'tokens':
        if (Number(value) >= 1000000) return `${(Number(value) / 1000000).toFixed(1)}M`;
        if (Number(value) >= 1000) return `${(Number(value) / 1000).toFixed(1)}k`;
        return String(value);
      default: return String(value);
    }
  };

  // Get icon component
  const renderIcon = (IconComponent: LucideIcon | undefined, size: number, style: React.CSSProperties) => {
    if (!IconComponent) return null;
    return <IconComponent size={size} style={style} />;
  };

  // Default table columns
  const defaultColumns: TableColumn[] = [
    {
      key: 'name', label: 'Name', sortable: true, render: (_, row) => (
        <div>
          <div className="text-white font-medium">{row.name}</div>
          {row.description && (
            <div className="text-gray-500 text-xs mt-1">
              {row.description.length > 50 ? row.description.slice(0, 50) + '...' : row.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status', label: 'Status', sortable: true, render: (value) => value ? (
        <span className="px-2.5 py-1 rounded-full text-xs capitalize bg-blue-500/20 text-blue-400">
          {value}
        </span>
      ) : null
    },
    {
      key: 'category', label: 'Category', sortable: true, render: (value) => value ? (
        <span className="px-2.5 py-1 rounded-full text-xs capitalize bg-purple-500/20 text-purple-400">
          {value}
        </span>
      ) : null
    },
    {
      key: 'progress', label: 'Progress', sortable: false, render: (_, row) => row.totalTasks > 0 ? (
        <div className="flex items-center gap-2">
          <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.round((row.completedTasks / row.totalTasks) * 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
          </div>
          <span className="text-white text-xs">
            {Math.round((row.completedTasks / row.totalTasks) * 100)}%
          </span>
        </div>
      ) : <span className="text-gray-500 text-xs">-</span>
    },
    {
      key: 'tasks', label: 'Tasks', sortable: false, align: 'right', render: (_, row) => (
        <span className="text-white text-sm">
          {row.completedTasks || 0}/{row.totalTasks || 0}
        </span>
      )
    },
  ];

  const columns = config.columns ?? defaultColumns;

  return (
    <div data-name="page-layout" style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
      <div data-name="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* =========================================
             HEADER SECTION
             Contains title, subtitle, and actions
        ========================================= */}
        <header data-name="header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div data-name="header-left" className="flex-1">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <h1 data-name="page-title" style={{
                fontSize: '28px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                {renderIcon(config.icon || HeaderIcon, 28, { color: '#3b82f6', WebkitTextFillColor: '#3b82f6' })}
                {config.labels?.title || title}
              </h1>
              {/* Help Icon with Tooltip */}
              {config.labels?.helpText && (
                <span
                  data-name="help-icon"
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'rgb(44, 44, 47)',
                    color: 'rgb(107, 114, 128)',
                    fontSize: '13px',
                    fontWeight: 700,
                    marginLeft: '12px',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.querySelector('[data-name="tooltip"]') as HTMLElement;
                    if (tooltip) {
                      tooltip.style.opacity = '1';
                      tooltip.style.visibility = 'visible';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('[data-name="tooltip"]') as HTMLElement;
                    if (tooltip) {
                      tooltip.style.opacity = '0';
                      tooltip.style.visibility = 'hidden';
                    }
                  }}
                >
                  ?
                  <div
                    data-name="tooltip"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      marginTop: '10px',
                      padding: '12px 16px',
                      background: 'rgb(26, 26, 28)',
                      color: 'rgb(107, 114, 128)',
                      fontSize: '13px',
                      fontWeight: 400,
                      lineHeight: 1.5,
                      borderRadius: '8px',
                      whiteSpace: 'normal',
                      maxWidth: '320px',
                      width: 'max-content',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      opacity: 0,
                      visibility: 'hidden',
                      transition: 'opacity 0.2s ease, visibility 0.2s ease',
                      pointerEvents: 'none',
                      zIndex: 1000,
                    }}
                  >
                    {config.labels?.helpText}
                  </div>
                </span>
              )}
            </div>
            {(config.labels?.subtitle || subtitle) && (
              <p data-name="page-subtitle" style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
                {config.labels?.subtitle || subtitle}
              </p>
            )}
          </div>

          <div data-name="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {config.importExport && (
              <Button data-name="import-export-btn" variant="secondary" size="sm">
                Import/Export
              </Button>
            )}

            {config.addEditView && (onCreate || onUpdate) && (
              <Button
                data-name="add-button"
                variant="primary"
                onClick={() => {
                  setFormData({});
                  setIsEdit(false);
                  setDrawerOpen(true);
                }}
              >
                {config.labels?.addButton || '+ New'}
              </Button>
            )}
          </div>
        </header>

        {/* =========================================
             STATS SECTION
             Displays stat cards
        ========================================= */}
        {(config.stats || renderCustomStats) && (
          <section data-name="stats-section" className="mb-6">
            {loading ? (
              <StatsSkeleton count={config.statsConfig?.cards.length ?? 4} />
            ) : renderCustomStats ? (
              renderCustomStats(transformStats ? transformStats(stats) : stats)
            ) : config.statsConfig?.cards ? (
              <div data-name="stats-grid" className="grid" style={{ gridTemplateColumns: `repeat(${config.statsConfig.cards.length}, 1fr)`, gap: '16px' }}>
                {config.statsConfig.cards.map((card) => {
                  const colors = defaultStatColors[card.color] || defaultStatColors.blue;
                  const Icon = card.icon;
                  const value = stats ? formatValue(stats[card.valueKey], card.format) : '-';

                  return (
                    <div
                      key={card.id}
                      data-name={`stat-card-${card.id}`}
                      className="p-5"
                      style={{
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '12px',
                      }}
                    >
                      <div data-name="stat-card-header" className="flex items-center gap-2.5 mb-2">
                        {renderIcon(Icon, 20, { color: colors.color })}
                        <div data-name="stat-card-label" className="text-gray-500 text-sm">{card.label}</div>
                      </div>
                      <div data-name="stat-card-value" className="text-3xl font-bold text-white pl-8">
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        )}

        {/* =========================================
             SEARCH & FILTERS SECTION
        ========================================= */}
        {(config.search || config.filter || config.showMultiView) && (
          <section data-name="filters-section" className="mb-6">
            <div data-name="filters-container" className="flex flex-wrap gap-4 items-center">

              {/* Search Bar */}
              {config.search && (
                <div data-name="search-bar" style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <input
                    data-name="search-input"
                    type="text"
                    placeholder={config.labels?.searchPlaceholder || 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 44px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}

              {/* Filter Dropdowns */}
              {config.filter && (renderCustomFilters || config.filterOptions) && (
                <>
                  {renderCustomFilters ? (
                    renderCustomFilters()
                  ) : config.filterOptions?.map((filter) => (
                    <div key={filter.key} data-name={`filter-${filter.key}`}>
                      <select
                        data-name={`filter-select-${filter.key}`}
                        value={filters[filter.key] || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, [filter.key]: e.target.value }))}
                        className="px-5 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm cursor-pointer"
                      >
                        <option value="">{filter.label}</option>
                        {filter.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </>
              )}

              {/* View Toggle */}
              {config.showMultiView && config.multiViewOptions && config.multiViewOptions.length > 1 && (
                <div data-name="view-toggle" className="flex bg-white/5 rounded-lg p-1 ml-auto">
                  {config.multiViewOptions.map((mode) => (
                    <button
                      key={mode}
                      data-name={`view-mode-${mode}`}
                      onClick={() => setViewMode(mode)}
                      className="px-3 py-1.5 rounded-md bg-transparent border-none text-sm capitalize cursor-pointer"
                      style={{
                        background: viewMode === mode ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: viewMode === mode ? '#fff' : '#888',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =========================================
             CUSTOM ACTIONS SECTION
        ========================================= */}
        {renderCustomActions && (
          <section data-name="custom-actions-section" className="mb-6">
            {renderCustomActions()}
          </section>
        )}

        {/* =========================================
             DATA DISPLAY SECTION
        ========================================= */}
        <section data-name="data-section" className="min-h-[400px]">
          {loading ? (
            <div data-name="data-loading" className="flex flex-col gap-3">
              <Skeleton count={3} height={100} />
            </div>
          ) : processedData.length === 0 ? (
            <EmptyState
              icon={config.icon}
              title={config.labels?.emptyMessage || 'No items found'}
              description="Get started by creating your first item"
              actionLabel={config.labels?.addButton || '+ New Item'}
              onAction={() => setDrawerOpen(true)}
            />
          ) : (
            <>
              {viewMode === 'grid' && (
                <div data-name="data-grid" className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                  {customGridViewRenderer ? (
                    <GridViewRenderer items={paginatedData} handlers={{ handleEdit, handleDelete, handleView }} renderCard={customGridViewRenderer} />
                  ) : paginatedData.map((item) => (
                    <div
                      key={item.id}
                      data-name={`data-card-${item.id}`}
                      onClick={() => onRowClick?.(item)}
                      className="p-5 cursor-pointer rounded-xl border border-white/5 bg-white/5 transition-all hover:bg-white/10"
                    >
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(item);
                            }}
                            className="text-white text-base font-semibold mb-1.5 cursor-pointer hover:text-blue-400 transition-colors"
                          >
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-gray-500 text-sm leading-relaxed">
                              {item.description.length > 80 ? item.description.slice(0, 80) + '...' : item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.status && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#93c5fd',
                            textTransform: 'capitalize',
                          }}>
                            {item.status}
                          </span>
                        )}
                        {item.category && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            background: 'rgba(168, 85, 247, 0.2)',
                            color: '#c084fc',
                            textTransform: 'capitalize',
                          }}>
                            {item.category}
                          </span>
                        )}
                        {/* Tasks count badge */}
                        {item.totalTasks > 0 && (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                            {item.totalTasks} task{item.totalTasks > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      {item.totalTasks > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between mb-1.5">
                            <span className="text-gray-500 text-xs">Progress</span>
                            <span className="text-white text-xs">
                              {Math.round((item.completedTasks / item.totalTasks) * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.round((item.completedTasks / item.totalTasks) * 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                          </div>
                        </div>
                      )}

                      {/* Footer with date/owner */}
                      <div className="flex justify-between items-center pt-3 border-t border-white/5">
                        {item.dueDate && (
                          <span className="text-gray-500 text-xs">
                            {formatDueDate(item.dueDate)}
                          </span>
                        )}
                        <div className="flex gap-2">
                          {config.actions?.filter(a => a.show?.(item) ?? true).map((action, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (action.label === 'View') {
                                  handleView(item);
                                } else if (action.label === 'Edit') {
                                  handleEdit(item);
                                } else if (action.label === 'Delete') {
                                  handleDelete(item);
                                } else {
                                  action.onClick(item);
                                }
                              }}
                              title={action.label}
                              className="p-2 bg-white/5 border-none rounded-lg text-gray-500 text-sm flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                              {action.icon && <action.icon size={16} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <div data-name="data-table" className="bg-white/5 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        {columns.map((column) => (
                          <th
                            key={column.key}
                            data-name={`table-header-${column.key}`}
                            onClick={() => handleSort(column.key)}
                            className="p-4 text-left text-xs font-medium text-gray-500"
                            style={{
                              cursor: column.sortable ? 'pointer' : 'default',
                              width: column.width,
                              userSelect: 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {column.label}
                              {config.sortable && column.sortable && sortBy === column.key && (
                                sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                              )}
                            </div>
                          </th>
                        ))}
                        {/* Actions column */}
                        {config.showActions && config.actions && (
                          <th className="p-4 text-right text-xs font-medium text-gray-500">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item) => (
                        <tr
                          key={item.id}
                          data-name={`table-row-${item.id}`}
                          onClick={() => {
                            if (onRowClick) {
                              onRowClick(item);
                            } else {
                              handleView(item);
                            }
                          }}
                          className="border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                          {columns.map((column) => (
                            <td
                              key={column.key}
                              data-name={`table-cell-${column.key}`}
                              style={{
                                padding: '16px',
                                textAlign: column.align ?? 'left',
                              }}
                            >
                              {column.render ? column.render(item[column.key], item) : item[column.key]}
                            </td>
                          ))}
                          {config.showActions && config.actions && (
                            <td className="p-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {config.actions.filter(a => a.show?.(item) ?? true).map((action, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (action.label === 'View') {
                                        handleView(item);
                                      } else if (action.label === 'Edit') {
                                        handleEdit(item);
                                      } else if (action.label === 'Delete') {
                                        handleDelete(item);
                                      } else {
                                        action.onClick(item);
                                      }
                                    }}
                                    title={action.label}
                                    className="p-2 bg-white/5 border-none rounded-lg text-gray-500 text-sm flex items-center justify-center hover:bg-white/10 transition-colors"
                                  >
                                    {action.icon && <action.icon size={16} />}
                                  </button>
                                ))}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        {/* =========================================
             PAGINATION SECTION
        ========================================= */}
        {config.pagination && totalItems > 0 && (
          <div data-name="pagination" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
          }}>
            {/* Page size selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>Show</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {(config.pageSizeOptions ?? [10, 25, 50]).map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-gray-500 text-sm">entries</span>
            </div>

            {/* Pagination info */}
            <div className="text-gray-500 text-sm">
              {config.labels?.paginationInfo
                ? config.labels.paginationInfo((page - 1) * pageSize + 1, Math.min(page * pageSize, totalItems), totalItems)
                : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalItems)} of ${totalItems} entries`
              }
            </div>

            {/* Page controls */}
            <div className="flex gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: page === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: page === 1 ? '#555' : '#fff',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                First
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: page === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: page === 1 ? '#555' : '#fff',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span className="px-3 py-2 text-white text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: page === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: page === totalPages ? '#555' : '#fff',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: page === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: page === totalPages ? '#555' : '#fff',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Last
              </button>
            </div>
          </div>
        )}

        {/* =========================================
             DRAWER SECTION
        ========================================= */}
        {config.addEditView === 'drawer' && (
          <Drawer
            data-name="form-drawer"
            isOpen={drawerOpen}
            onClose={() => {
              setDrawerOpen(false);
              setIsEdit(false);
            }}
            title={isEdit ? `Edit ${config.labels?.title || 'Item'}` : (config.labels?.addButton || 'New Item')}
            width={500}
            footer={
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button data-name="cancel-button" variant="secondary" onClick={() => setDrawerOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button data-name="submit-button" variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            }
          >
            <form data-name="create-form" onSubmit={handleSubmit}>
              <div data-name="form-fields" className="flex flex-col gap-5">
                {config.formConfig?.fields.map((field) => (
                  <div key={field.id} data-name={`form-field-${field.id}`}>
                    <label data-name={`form-label-${field.id}`} className="block text-sm font-medium mb-1.5" style={{ color: colors.textColor }}>
                      {field.label}{field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        data-name={`form-input-${field.id}`}
                        value={formData[field.id] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={4}
                        className="w-full p-3 rounded-lg text-sm resize-none"
                        style={{
                          background: field.bgColor ?? colors.bgColor,
                          border: `1px solid ${field.borderColor ?? colors.borderColor}`,
                          color: field.textColor ?? colors.textColor,
                        }}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        data-name={`form-select-${field.id}`}
                        value={formData[field.id] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full p-3 rounded-lg text-sm"
                        style={{
                          background: field.bgColor ?? colors.bgColor,
                          border: `1px solid ${field.borderColor ?? colors.borderColor}`,
                          color: field.textColor ?? colors.textColor,
                        }}
                      >
                        <option value="">{field.placeholder || `Select ${field.label}`}</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'tags' ? (
                      <input
                        data-name={`form-input-${field.id}`}
                        type="text"
                        value={formData[field.id] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full p-3 rounded-lg text-sm"
                        style={{
                          background: field.bgColor ?? colors.bgColor,
                          border: `1px solid ${field.borderColor ?? colors.borderColor}`,
                          color: field.textColor ?? colors.textColor,
                        }}
                      />
                    ) : field.type === 'date' ? (
                      <input
                        data-name={`form-input-${field.id}`}
                        type="date"
                        value={formData[field.id] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full p-3 rounded-lg text-sm"
                        style={{
                          background: field.bgColor ?? colors.bgColor,
                          border: `1px solid ${field.borderColor ?? colors.borderColor}`,
                          color: field.textColor ?? colors.textColor,
                        }}
                      />
                    ) : (
                      <input
                        data-name={`form-input-${field.id}`}
                        type={field.type}
                        value={formData[field.id] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full p-3 rounded-lg text-sm"
                        style={{
                          background: field.bgColor ?? colors.bgColor,
                          border: `1px solid ${field.borderColor ?? colors.borderColor}`,
                          color: field.textColor ?? colors.textColor,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </form>
          </Drawer>
        )}

        {/* =========================================
             VIEW DRAWER SECTION
             Shows item details
        ========================================= */}
        {selectedItem && (
          <Drawer
            data-name="view-drawer"
            isOpen={viewDrawerOpen}
            onClose={() => setViewDrawerOpen(false)}
            title={selectedItem.name || 'Details'}
            width={550}
            footer={
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button data-name="view-close-button" variant="secondary" onClick={() => setViewDrawerOpen(false)}>
                  Close
                </Button>
                {(onEdit || onUpdate) && (
                  <Button data-name="view-edit-button" variant="primary" onClick={() => {
                    handleEdit(selectedItem);
                    setViewDrawerOpen(false);
                  }}>
                    Edit
                  </Button>
                )}
              </div>
            }
          >
            {detailViewRenderer ? (
              detailViewRenderer(selectedItem)
            ) : (
              <div data-name="view-details" className="flex flex-col gap-5">
                {/* Description */}
                {selectedItem.description && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-2 font-medium">Description</h4>
                    <p className="text-gray-900 text-sm leading-relaxed">{selectedItem.description}</p>
                  </div>
                )}

                {/* Status & Category */}
                <div className="flex gap-3">
                  {selectedItem.status && (
                    <div>
                      <h4 className="text-gray-500 text-sm mb-1.5 font-medium">Status</h4>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#3b82f6',
                        textTransform: 'capitalize',
                      }}>
                        {selectedItem.status}
                      </span>
                    </div>
                  )}
                  {selectedItem.category && (
                    <div>
                      <h4 className="text-gray-500 text-sm mb-1.5 font-medium">Category</h4>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        background: 'rgba(168, 85, 247, 0.2)',
                        color: '#a855f7',
                        textTransform: 'capitalize',
                      }}>
                        {selectedItem.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tasks Progress */}
                {selectedItem.totalTasks > 0 && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-3 font-medium">Progress</h4>
                    <div className="flex items-center gap-4 mb-2">
                      <div style={{
                        width: '100%',
                        height: '10px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '5px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.round((selectedItem.completedTasks / selectedItem.totalTasks) * 100)}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                          borderRadius: '5px',
                        }} />
                      </div>
                      <span className="text-gray-900 text-sm font-semibold min-w-[50px]">
                        {Math.round((selectedItem.completedTasks / selectedItem.totalTasks) * 100)}%
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {selectedItem.completedTasks} of {selectedItem.totalTasks} tasks completed
                    </p>
                  </div>
                )}

                {/* Due Date */}
                {selectedItem.dueDate && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-1.5 font-medium">Due Date</h4>
                    <p style={{ color: '#111', fontSize: '14px' }}>
                      {formatDueDate(selectedItem.dueDate)}
                      <span className="text-gray-400 text-sm ml-2">
                        ({new Date(selectedItem.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
                      </span>
                    </p>
                  </div>
                )}

                {/* Priority */}
                {selectedItem.priority && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-1.5 font-medium">Priority</h4>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      background: selectedItem.priority === 'urgent' ? 'rgba(239, 68, 68, 0.2)' :
                        selectedItem.priority === 'high' ? 'rgba(245, 158, 11, 0.2)' :
                          selectedItem.priority === 'medium' ? 'rgba(59, 130, 246, 0.2)' :
                            'rgba(107, 114, 128, 0.2)',
                      color: selectedItem.priority === 'urgent' ? '#ef4444' :
                        selectedItem.priority === 'high' ? '#f59e0b' :
                          selectedItem.priority === 'medium' ? '#3b82f6' :
                            '#6b7280',
                      textTransform: 'capitalize',
                    }}>
                      {selectedItem.priority}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-2 font-medium">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            background: 'rgba(107, 114, 128, 0.2)',
                            color: '#4b5563',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estimated Tokens */}
                {selectedItem.estimatedTokens > 0 && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-1.5 font-medium">Estimated Tokens</h4>
                    <p className="text-gray-900 text-sm">{selectedItem.estimatedTokens.toLocaleString()}</p>
                  </div>
                )}

                {/* Created At */}
                {selectedItem.createdAt && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-1.5 font-medium">Created</h4>
                    <p style={{ color: '#111', fontSize: '14px' }}>
                      {formatTimeAgo(selectedItem.createdAt)}
                    </p>
                  </div>
                )}

                {/* Updated At */}
                {selectedItem.updatedAt && selectedItem.updatedAt !== selectedItem.createdAt && (
                  <div>
                    <h4 className="text-gray-500 text-sm mb-1.5 font-medium">Last Updated</h4>
                    <p style={{ color: '#111', fontSize: '14px' }}>
                      {formatTimeAgo(selectedItem.updatedAt)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Drawer>
        )}
      </div>
    </div>
  );
}

export default PageLayout;

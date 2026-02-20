import { useState } from 'react';
import { Layout } from './Layout';
import { Search, Plus } from 'lucide-react';

interface StatItem {
  label: string;
  value: number;
  color: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface PageConfig {
  title: string;
  icon: React.ReactNode;
  addButton?: {
    label: string;
    action: () => void;
  };
  stats?: StatItem[];
  search?: {
    placeholder: string;
    onSearch: (query: string) => void;
  };
  filters?: Array<{
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (val: string) => void;
  }>;
  dataType: 'table' | 'cards' | 'list';
  children: React.ReactNode;
}

export function InnerLayout({
   title,
   icon,
   addButton,
   stats = [],
   search,
   filters = [],
   children,
 }: PageConfig) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    search?.onSearch(query);
  };

  return (
    <Layout>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <h1 style={{ 
                  fontSize: '28px', 
                  fontWeight: 700, 
                  color: '#fff',
                  margin: 0,
                }}>
                  {title}
                </h1>
              </div>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                Manage and monitor your {title.toLowerCase()}
              </p>
            </div>
            {addButton && (
              <button
                onClick={addButton.action}
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
                }}
              >
                <Plus size={18} />
                {addButton.label}
              </button>
            )}
          </div>

          {stats.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px', 
              marginBottom: '24px' 
            }}>
              {stats.map((stat, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid rgba(255, 255, 255, 0.06)', 
                    borderRadius: '12px', 
                    padding: '20px' 
                  }}
                >
                  <div style={{ fontSize: '28px', fontWeight: 700, color: stat.color, marginBottom: '4px' }}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {search && (
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#666' 
                }} 
              />
              <input
                type="text"
                placeholder={search.placeholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 44px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {filters.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {filters.map((filter, idx) => (
                <div key={idx}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '6px',
                    marginLeft: '4px',
                  }}>
                    {filter.label}
                  </label>
                  <select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    style={{
                      padding: '10px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      minWidth: '150px',
                    }}
                  >
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div style={{ minHeight: '200px' }}>
            {children}
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface KanbanColumnConfig {
  id: string;
  title: string;
  icon: string;
  color: string;
}

interface KanbanBoardProps {
  columns: KanbanColumnConfig[];
  items: Record<string, unknown[]>;
  onItemClick: (item: unknown) => void;
  renderItem: (item: unknown) => React.ReactNode;
  emptyMessage?: string;
}

export function KanbanBoard({ columns, items, onItemClick, renderItem, emptyMessage = 'No items' }: KanbanBoardProps) {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '20px', 
      overflowX: 'auto', 
      paddingBottom: '16px',
      minHeight: '400px',
    }}>
      {columns.map((col) => {
        const columnItems = items[col.id] ?? [];
        return (
          <div
            key={col.id}
            style={{
              flex: '0 0 320px',
              background: 'rgba(15, 15, 18, 0.6)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 300px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: col.color,
                  boxShadow: `0 0 10px ${col.color}`,
                }} />
                <span style={{ fontSize: '11px', marginRight: '6px' }}>{col.icon}</span>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#f3f4f6',
                  letterSpacing: '0.01em',
                  textTransform: 'uppercase',
                  opacity: 0.9,
                  margin: 0,
                }}>
                  {col.title}
                </h3>
              </div>
              <div style={{
                fontSize: '11px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '2px 8px',
                borderRadius: '20px',
                fontWeight: 700,
              }}>
                {columnItems.length}
              </div>
            </div>

            <div style={{
              padding: '12px',
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {columnItems.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  textAlign: 'center',
                  opacity: 0.4,
                  border: '1px dashed rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  margin: '8px',
                }}>
                  <p style={{ fontSize: '12px', fontWeight: 500, margin: 0 }}>
                    {emptyMessage}
                  </p>
                </div>
              ) : (
                columnItems.map((item) => (
                  <div 
                    key={(item as { id: string }).id}
                    onClick={() => onItemClick(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    {renderItem(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

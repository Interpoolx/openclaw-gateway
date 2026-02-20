import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalSearch, Task, Agent } from '../lib/api';
import { 
  Search, 
  X, 
  FileText, 
  CheckSquare, 
  Activity as ActivityIcon,
  Users,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

// Fuzzy match algorithm for local filtering
function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  
  if (lowerText === lowerQuery) return { match: true, score: 100 };
  if (lowerText.startsWith(lowerQuery)) return { match: true, score: 90 };
  if (lowerText.includes(lowerQuery)) return { match: true, score: 70 };
  
  let queryIdx = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -1;
  
  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      if (lastMatchIdx === i - 1) consecutiveBonus += 5;
      lastMatchIdx = i;
      queryIdx++;
    }
  }
  
  if (queryIdx === lowerQuery.length) {
    const score = 50 + consecutiveBonus - (lastMatchIdx - lowerQuery.length);
    return { match: true, score: Math.max(10, Math.min(score, 69)) };
  }
  
  return { match: false, score: 0 };
}

interface GlobalSearchProps {
  readonly onTaskClick?: (task: Task) => void;
  readonly onClose: () => void;
  readonly agents?: Agent[];
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

export function GlobalSearch({ onTaskClick, onClose, agents = [] }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'task' | 'agent' | 'activity'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('clawpute_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [
        { query: searchQuery, timestamp: Date.now() },
        ...prev.filter(s => s.query !== searchQuery)
      ].slice(0, 10);
      
      localStorage.setItem('clawpute_recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => globalSearch(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  // Filter and combine results with fuzzy matching
  const allResults = useMemo(() => {
    if (!data && !query.trim()) return [];
    
    let results: Array<any> = [];
    
    if (data) {
      results = [
        ...data.tasks.map(t => ({ ...t, type: 'task', score: 100 })),
        ...data.documents.map(d => ({ ...d, type: 'document', score: 100 })),
        ...data.activities.map(a => ({ ...a, type: 'activity', score: 100 })),
      ];
    }
    
    // Add agent matches from local fuzzy search
    if (query.trim()) {
      agents.forEach(agent => {
        const nameMatch = fuzzyMatch(query, agent.name);
        const roleMatch = agent.role ? fuzzyMatch(query, agent.role) : { match: false, score: 0 };
        
        if (nameMatch.match || roleMatch.match) {
          const score = Math.max(nameMatch.score, roleMatch.score * 0.8);
          results.push({ ...agent, type: 'agent', score });
        }
      });
    }
    
    // Filter by type
    if (selectedType !== 'all') {
      results = results.filter(r => r.type === selectedType);
    }
    
    // Sort by score
    return results.sort((a, b) => b.score - a.score);
  }, [data, query, agents, selectedType]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery, selectedType]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (allResults.length || 1)) % (allResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected) {
        saveRecentSearch(query);
        handleSelect(selected);
      }
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (allResults.length || 1)) % (allResults.length || 1));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allResults.length || 1));
    }
  };

  const handleSelect = (item: any) => {
    if (item.type === 'task' && onTaskClick) {
      onTaskClick(item);
    } else if (item.type === 'agent') {
      navigate({ to: '/agents/$agentId', params: { agentId: item.id } });
    } else if (item.type === 'task') {
      navigate({ to: '/command-center', search: { taskId: item.id } });
    }
    onClose();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('clawpute_recent_searches');
  };

  const typeFilters = [
    { id: 'all', label: 'All', icon: <Search className="w-3 h-3" /> },
    { id: 'task', label: 'Tasks', icon: <CheckSquare className="w-3 h-3" /> },
    { id: 'agent', label: 'Agents', icon: <Users className="w-3 h-3" /> },
    { id: 'activity', label: 'Activity', icon: <ActivityIcon className="w-3 h-3" /> },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '100px 20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#0f0f12',
          borderRadius: '16px',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          animation: 'slideDown 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <Search style={{ width: 20, height: 20, color: '#71717a' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, agents, documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#f3f4f6',
              fontSize: '16px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                padding: '4px',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#71717a',
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          )}
          <span style={{
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#71717a',
            fontFamily: 'monospace',
          }}>
            ESC
          </span>
        </div>

        {/* Type Filters */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '12px 20px',
          borderBottom: query.trim() ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
        }}>
          {typeFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedType(filter.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: selectedType === filter.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: `1px solid ${selectedType === filter.id ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '6px',
                color: selectedType === filter.id ? '#3b82f6' : '#6b7280',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: allResults.length > 0 || recentSearches.length > 0 ? '12px' : '0',
          }}
        >
          {query.trim() && allResults.length === 0 && !isLoading && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280',
            }}>
              <Search style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px' }}>No results found</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Try a different search term</p>
            </div>
          )}

          {isLoading && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{ fontSize: '14px' }}>Searching...</p>
            </div>
          )}

          {/* Recent Searches */}
          {!query.trim() && recentSearches.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px 8px',
              }}>
                <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase' }}>
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  style={{
                    fontSize: '11px',
                    color: '#ef4444',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search.query)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Clock style={{ width: 14, height: 14 }} />
                  {search.query}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {allResults.map((item, index) => (
            <button
              key={`${item.type}-${item.id}`}
              data-selected={index === selectedIndex}
              onClick={() => {
                saveRecentSearch(query);
                handleSelect(item);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                background: index === selectedIndex ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Icon */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: getItemBg(item.type),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getItemColor(item.type),
                flexShrink: 0,
              }}>
                {getItemIcon(item.type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#f3f4f6',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.title || item.name || item.content}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    padding: '2px 6px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}>
                    {item.type}
                  </span>
                  {item.description && (
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.description.substring(0, 60)}
                      {item.description.length > 60 ? '...' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              {index === selectedIndex && (
                <ArrowRight style={{ width: 16, height: 16, color: '#3b82f6' }} />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '11px',
          color: '#6b7280',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ padding: '2px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', fontFamily: 'monospace' }}>↑↓</span>
            navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ padding: '2px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', fontFamily: 'monospace' }}>↵</span>
            select
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ padding: '2px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', fontFamily: 'monospace' }}>esc</span>
            close
          </span>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function getItemIcon(type: string) {
  switch (type) {
    case 'task':
      return <CheckSquare className="w-4 h-4" />;
    case 'agent':
      return <Users className="w-4 h-4" />;
    case 'document':
      return <FileText className="w-4 h-4" />;
    case 'activity':
      return <ActivityIcon className="w-4 h-4" />;
    default:
      return <Search className="w-4 h-4" />;
  }
}

function getItemColor(type: string): string {
  switch (type) {
    case 'task':
      return '#3b82f6';
    case 'agent':
      return '#22c55e';
    case 'document':
      return '#8b5cf6';
    case 'activity':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}

function getItemBg(type: string): string {
  switch (type) {
    case 'task':
      return 'rgba(59, 130, 246, 0.1)';
    case 'agent':
      return 'rgba(34, 197, 94, 0.1)';
    case 'document':
      return 'rgba(139, 92, 246, 0.1)';
    case 'activity':
      return 'rgba(245, 158, 11, 0.1)';
    default:
      return 'rgba(255, 255, 255, 0.05)';
  }
}

export default GlobalSearch;

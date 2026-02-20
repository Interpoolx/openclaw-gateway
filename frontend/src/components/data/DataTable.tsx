import React, { useState, useCallback, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  searchableFields?: string[];
  pagination?: {
    pageSize: number;
    onPageChange?: (page: number) => void;
  };
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (item: T) => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }[];
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  searchPlaceholder = 'Search...',
  onSearch,
  searchableFields,
  pagination,
  actions,
  emptyMessage = 'No data available',
  loading = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
    setCurrentPage(1);
  }, [onSearch]);

  const handleSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchQuery && searchableFields && searchableFields.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        searchableFields.some(field => {
          const value = (item as Record<string, unknown>)[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query);
          }
          if (typeof value === 'number') {
            return value.toString().includes(query);
          }
          return false;
        })
      );
    }

    if (sortColumn) {
      const sortableColumn = columns.find(col => col.key === sortColumn);
      if (sortableColumn?.sortable !== false) {
        result.sort((a, b) => {
          const aVal = (a as Record<string, unknown>)[sortColumn];
          const bVal = (b as Record<string, unknown>)[sortColumn];

          if (aVal === bVal) return 0;
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;

          const comparison = typeof aVal === 'string'
            ? aVal.localeCompare(bVal as string)
            : typeof aVal === 'number'
              ? (aVal as number) - (bVal as number)
              : String(aVal).localeCompare(String(bVal));

          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [data, searchQuery, searchableFields, sortColumn, sortDirection, columns]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;

    const pageSize = pagination.pageSize;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pagination, currentPage]);

  const totalPages = useMemo(() => {
    if (!pagination) return 1;
    return Math.ceil(filteredData.length / pagination.pageSize);
  }, [filteredData, pagination]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    pagination?.onPageChange?.(page);
  }, [pagination]);

  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-10 text-center">
        <div className="text-[#666]">Loading...</div>
      </div>
    );
  }

  if (filteredData.length === 0 && !searchQuery) {
    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-[60px] text-center">
        <div className="text-[48px] mb-4 opacity-50">📭</div>
        <div className="text-[#888] text-[16px]">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div>
      {onSearch && (
        <div className="mb-4 relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-11 pr-3.5 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-[14px]"
          />
        </div>
      )}

      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                    className={`px-4 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-[#888] bg-white/[0.02] whitespace-nowrap ${column.sortable !== false ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center gap-1.5">
                      {column.header}
                      {sortColumn === column.key && (
                        sortDirection === 'asc'
                          ? <ChevronUp size={14} />
                          : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                ))}
                {actions && actions.length > 0 && (
                  <th className="px-4 py-3.5 text-right w-[120px]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`border-b border-white/[0.04] transition-colors ${onRowClick ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-default'}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3.5 text-[#d1d5db] text-[14px]"
                    >
                      {column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key] ?? '')
                      }
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex gap-2 justify-end">
                        {actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(item);
                            }}
                            className={`px-3 py-1.5 rounded-md text-[13px] cursor-pointer flex items-center gap-1 transition-colors ${action.variant === 'danger'
                                ? 'bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20'
                                : action.variant === 'primary'
                                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                                  : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                              }`}
                          >
                            {action.icon}
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

        {pagination && totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-white/5 bg-white/[0.02]">
            <div className="text-[13px] text-[#666]">
              Showing {((currentPage - 1) * pagination.pageSize) + 1} to {Math.min(currentPage * pagination.pageSize, filteredData.length)} of {filteredData.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 bg-white/5 border border-white/10 rounded-md transition-colors flex items-center ${currentPage === 1 ? 'cursor-not-allowed text-[#666]' : 'cursor-pointer text-[#d1d5db] hover:bg-white/10'}`}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded-md text-[13px] transition-colors cursor-pointer ${currentPage === pageNum ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' : 'bg-white/5 border border-white/10 text-[#d1d5db] hover:bg-white/10'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 bg-white/5 border border-white/10 rounded-md transition-colors flex items-center ${currentPage === totalPages ? 'cursor-not-allowed text-[#666]' : 'cursor-pointer text-[#d1d5db] hover:bg-white/10'}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

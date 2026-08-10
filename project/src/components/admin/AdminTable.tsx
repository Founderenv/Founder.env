import { type ReactNode, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/utils/format';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  filters?: { id: string; label: string }[];
  onFilterChange?: (id: string) => void;
  activeFilter?: string;
  emptyMessage?: string;
}

export function AdminTable<T extends Record<string, unknown>>({
  columns, data, searchable, searchPlaceholder = 'Search...', filters, onFilterChange, activeFilter, emptyMessage = 'No data found'
}: AdminTableProps<T>) {
  const [search, setSearch] = useState('');

  const filtered = searchable
    ? data.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
      )
    : data;

  return (
    <div className="card overflow-hidden">
      {(searchable || filters) && (
        <div className="flex flex-col sm:flex-row gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          {searchable && (
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="input pl-10"
              />
            </div>
          )}
          {filters && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onFilterChange?.(f.id)}
                  className={cn(
                    'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    activeFilter === f.id || (!activeFilter && f.id === 'all')
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">{emptyMessage}</td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

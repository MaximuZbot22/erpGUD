import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowIdKey: keyof T;
  // Selection
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  // Sorting
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  // Actions
  rowActions?: (row: T) => { label: string; onClick: () => void; danger?: boolean }[];
  // Pagination
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
  };
}

export function Table<T>({
  columns,
  data,
  loading = false,
  rowIdKey,
  selectedIds = [],
  onSelectionChange,
  onSort,
  rowActions,
  pagination
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeActionMenuIdx, setActiveActionMenuIdx] = useState<number | null>(null);

  const handleSort = (key: string) => {
    if (!onSort) return;
    
    let nextDir: 'asc' | 'desc' = 'asc';
    if (sortKey === key) {
      nextDir = sortDir === 'asc' ? 'desc' : 'asc';
    }

    setSortKey(key);
    setSortDir(nextDir);
    onSort(key, nextDir);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const allIds = data.map((d) => String(d[rowIdKey]));
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    }
  };

  // Pagination calculations
  const totalPages = pagination ? Math.ceil(pagination.totalCount / pagination.pageSize) : 0;
  const startRange = pagination ? (pagination.currentPage - 1) * pagination.pageSize + 1 : 0;
  const endRange = pagination 
    ? Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount) 
    : 0;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="w-full space-y-4">
      {/* Table Card Wrapper with Drag-to-Scroll */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className={`overflow-x-auto border border-slate-800/80 rounded-2xl shadow-xl shadow-black/40 bg-slate-900/80 backdrop-blur-md select-none ${isMouseDown ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-950/60 border-b border-slate-800/80 text-slate-400 uppercase font-semibold tracking-wider font-heading">
            <tr>
              {/* Checkbox Column */}
              {onSelectionChange && (
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
              )}

              {/* Data Headers */}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 ${col.sortable ? 'cursor-pointer select-none hover:bg-slate-800/50 hover:text-white transition-colors' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </th>
              ))}

              {/* Action Column Header */}
              {rowActions && <th className="px-4 py-3.5 w-14 text-center">Actions</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0) + (rowActions ? 1 : 0)} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading database records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0) + (rowActions ? 1 : 0)} className="py-12 text-center text-slate-400 dark:text-slate-550">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const rowId = String(row[rowIdKey]);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <tr 
                    key={rowId}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-all ${isSelected ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}`}
                  >
                    {/* Checkbox Column */}
                    {onSelectionChange && (
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}

                    {/* Data Cells */}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-3.5 font-medium ${col.className || ''}`}>
                        {col.render ? col.render(row, idx) : String(row[col.key as keyof T] || '')}
                      </td>
                    ))}

                    {/* Action Column Cells */}
                    {rowActions && (
                      <td className="px-4 py-3.5 text-center relative">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setActiveActionMenuIdx(activeActionMenuIdx === idx ? null : idx)}
                          className="rounded-full !p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <MoreHorizontal className="w-4 h-4 text-slate-500" />
                        </Button>
                        
                        {activeActionMenuIdx === idx && (
                          <>
                            {/* Actions Dropdown Clickaway Backdrop */}
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveActionMenuIdx(null)} 
                            />
                            
                            {/* Dropdown Menu */}
                            <div className="absolute right-6 mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-md shadow-lg py-1.5 z-20 text-left">
                              {rowActions(row).map((action, actionIdx) => (
                                <button
                                  key={actionIdx}
                                  onClick={() => {
                                    action.onClick();
                                    setActiveActionMenuIdx(null);
                                  }}
                                  className={`w-full px-4 py-1.5 text-left text-xs ${
                                    action.danger 
                                      ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20' 
                                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-850'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 text-slate-500 dark:text-slate-400">
          <div className="text-xs">
            Showing <span className="font-semibold text-slate-800 dark:text-white">{startRange}</span> to{' '}
            <span className="font-semibold text-slate-800 dark:text-white">{endRange}</span> of{' '}
            <span className="font-semibold text-slate-800 dark:text-white">{pagination.totalCount}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="!p-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = pageNum === pagination.currentPage;
              
              return (
                <Button
                  key={pageNum}
                  variant={isCurrent ? 'primary' : 'outline'}
                  size="xs"
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={`w-7.5 h-7.5 !p-0 ${
                    isCurrent 
                      ? 'bg-emerald-700 hover:bg-emerald-800' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="xs"
              disabled={pagination.currentPage === totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="!p-1.5"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

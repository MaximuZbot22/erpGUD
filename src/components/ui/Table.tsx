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
        className={`overflow-x-auto border border-[#2e2e2e] rounded-2xl shadow-xl shadow-black/40 bg-[#1f1f1f] select-none ${isMouseDown ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-[#181818] border-b border-[#282828] text-[#aaaaaa] uppercase font-semibold tracking-wider font-heading">
            <tr>
              {/* Checkbox Column */}
              {onSelectionChange && (
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-[#383838] bg-[#121212] text-white focus:ring-white/20 cursor-pointer"
                  />
                </th>
              )}

              {/* Data Headers */}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 ${col.sortable ? 'cursor-pointer select-none hover:bg-[#272727] hover:text-white transition-colors' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-white" /> : <ChevronDown className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </th>
              ))}

              {/* Action Column Header */}
              {rowActions && <th className="px-4 py-3.5 w-14 text-center">Actions</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#282828] text-neutral-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0) + (rowActions ? 1 : 0)} className="py-12 text-center text-[#aaaaaa]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading database records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0) + (rowActions ? 1 : 0)} className="py-12 text-center text-[#aaaaaa]">
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
                    className={`hover:bg-[#272727]/50 transition-all ${isSelected ? 'bg-[#272727]' : ''}`}
                  >
                    {/* Checkbox Column */}
                    {onSelectionChange && (
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                          className="rounded border-[#383838] bg-[#121212] text-white focus:ring-white/20"
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
                          className="rounded-full !p-1.5 hover:bg-[#272727]"
                        >
                          <MoreHorizontal className="w-4 h-4 text-[#aaaaaa]" />
                        </Button>
                        
                        {activeActionMenuIdx === idx && (
                          <>
                            {/* Actions Dropdown Clickaway Backdrop */}
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveActionMenuIdx(null)} 
                            />
                            
                            {/* Dropdown Menu */}
                            <div className="absolute right-6 mt-1 w-36 bg-[#1f1f1f] border border-[#2e2e2e] rounded-xl shadow-lg py-1.5 z-20 text-left">
                              {rowActions(row).map((action, actionIdx) => (
                                <button
                                  key={actionIdx}
                                  onClick={() => {
                                    action.onClick();
                                    setActiveActionMenuIdx(null);
                                  }}
                                  className={`w-full px-4 py-1.5 text-left text-xs transition-colors ${
                                    action.danger 
                                      ? 'text-rose-400 hover:bg-rose-950/30' 
                                      : 'text-neutral-200 hover:bg-[#272727]'
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 text-[#aaaaaa]">
          <div className="text-xs">
            Showing <span className="font-semibold text-white">{startRange}</span> to{' '}
            <span className="font-semibold text-white">{endRange}</span> of{' '}
            <span className="font-semibold text-white">{pagination.totalCount}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="!p-1.5 border-[#383838] bg-[#272727] text-neutral-200 hover:bg-[#383838]"
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
                      ? 'bg-[#f1f1f1] text-[#0f0f0f] font-bold' 
                      : 'border-[#383838] bg-[#272727] text-neutral-200 hover:bg-[#383838]'
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
              className="!p-1.5 border-[#383838] bg-[#272727] text-neutral-200 hover:bg-[#383838]"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

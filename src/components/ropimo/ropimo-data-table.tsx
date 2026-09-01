"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyPlaceholder } from "@/components/app/empty-placeholder";

export interface RopimoColumn<TData> {
  key: string;
  header: React.ReactNode;
  render?: (item: TData, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
  align?: "left" | "center" | "right";
}

export interface RopimoDataTableProps<TData> {
  data: TData[];
  columns: RopimoColumn<TData>[];
  keyExtractor: (item: TData, index: number) => string;
  searchKey?: keyof TData | ((item: TData) => string);
  searchPlaceholder?: string;
  pageSize?: number;
  isLoading?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onRowClick?: (item: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  headerSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  className?: string;
}

export function RopimoDataTable<TData>({
  data,
  columns,
  keyExtractor,
  searchKey,
  searchPlaceholder = "Filter items...",
  pageSize = 10,
  isLoading = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyActionLabel,
  onEmptyAction,
  headerSlot,
  actionsSlot,
  className,
}: RopimoDataTableProps<TData>) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Filter
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim() || !searchKey) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((item) => {
      let val = "";
      if (typeof searchKey === "function") {
        val = searchKey(item);
      } else {
        val = String(item[searchKey] ?? "");
      }
      return val.toLowerCase().includes(q);
    });
  }, [data, searchQuery, searchKey]);

  // Sort
  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item, idx) =>
      selectedIds.includes(keyExtractor(item, idx))
    );

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    const pageKeys = paginatedData.map((item, idx) => keyExtractor(item, idx));
    if (isAllSelected) {
      onSelectionChange(selectedIds.filter((id) => !pageKeys.includes(id)));
    } else {
      const next = Array.from(new Set([...selectedIds, ...pageKeys]));
      onSelectionChange(next);
    }
  };

  const handleSelectRow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Top Bar: Search, Filters & Actions */}
      {(searchKey || headerSlot || actionsSlot) && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-1">
            {searchKey && (
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#65706A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white py-1.5 pl-8 pr-3 text-xs text-[#18221E] placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none focus:ring-1 focus:ring-[#10251F] transition-colors"
                />
              </div>
            )}
            {headerSlot}
          </div>
          {actionsSlot && (
            <div className="flex items-center gap-2 shrink-0">{actionsSlot}</div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#18221E] border-collapse">
            <thead>
              <tr className="border-b border-[#D8DDD4] bg-[#FAF9F5] text-[11px] font-bold uppercase tracking-wider text-[#65706A]">
                {selectable && (
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded border-[#D8DDD4] accent-[#10251F] cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const alignClass =
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left";
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={cn("px-4 py-3", alignClass, col.className)}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className="inline-flex items-center gap-1.5 font-bold uppercase hover:text-[#18221E] transition-colors"
                        >
                          <span>{col.header}</span>
                          {sortKey === col.key ? (
                            sortDirection === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5 text-[#10251F]" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-[#10251F]" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 text-[#8A958F] opacity-70" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EADF]">
              {isLoading ? (
                Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, rIdx) => (
                  <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                    {selectable && <td className="p-4"><div className="h-4 w-4 bg-[#E7EADF] rounded" /></td>}
                    {columns.map((c, cIdx) => (
                      <td key={`skel-col-${cIdx}`} className="p-4">
                        <div className="h-3.5 bg-[#E7EADF] rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12">
                    <EmptyPlaceholder
                      icon={<SlidersHorizontal className="h-5 w-5 text-[#65706A]" />}
                      title={emptyTitle}
                      description={emptyDescription}
                      actionLabel={emptyActionLabel}
                      onAction={onEmptyAction}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const rowId = keyExtractor(item, idx);
                  const isSelected = selectedIds.includes(rowId);
                  return (
                    <tr
                      key={rowId}
                      onClick={() => onRowClick && onRowClick(item)}
                      className={cn(
                        "transition-colors duration-150",
                        onRowClick ? "cursor-pointer hover:bg-[#FAF9F5]" : "hover:bg-[#FAF9F5]/70",
                        isSelected && "bg-[#EAF4E2]/40"
                      )}
                    >
                      {selectable && (
                        <td
                          className="w-10 px-4 py-3 text-center"
                          onClick={(e) => handleSelectRow(e, rowId)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-3.5 w-3.5 rounded border-[#D8DDD4] accent-[#10251F] cursor-pointer"
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const alignClass =
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                            ? "text-right"
                            : "text-left";
                        return (
                          <td
                            key={`${rowId}-${col.key}`}
                            className={cn("px-4 py-3 text-xs", alignClass, col.className)}
                          >
                            {col.render
                              ? col.render(item, idx)
                              : (item as any)[col.key] ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {!isLoading && sortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#D8DDD4] bg-[#FAF9F5] px-4 py-3 text-xs text-[#65706A]">
            <div className="flex items-center gap-1.5">
              <span>Showing</span>
              <span className="font-semibold text-[#18221E]">
                {(currentPage - 1) * pageSize + 1}
              </span>
              <span>to</span>
              <span className="font-semibold text-[#18221E]">
                {Math.min(currentPage * pageSize, sortedData.length)}
              </span>
              <span>of</span>
              <span className="font-semibold text-[#18221E]">{sortedData.length}</span>
              <span>results</span>
              {selectedIds.length > 0 && (
                <span className="ml-2 font-medium text-[#246244] bg-[#EAF4E2] px-2 py-0.5 rounded-full border border-[#D8DDD4]">
                  {selectedIds.length} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] disabled:opacity-40 disabled:pointer-events-none hover:bg-[#FAF9F5] transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <span className="px-2 font-medium text-[#18221E]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] disabled:opacity-40 disabled:pointer-events-none hover:bg-[#FAF9F5] transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

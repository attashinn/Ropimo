"use client";

import * as React from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  List,
  Columns3,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  selectedValue?: string | string[];
  isMulti?: boolean;
}

export interface ActiveFilter {
  groupId: string;
  groupLabel: string;
  value: string;
  label: string;
}

export type ViewMode = "list" | "grid" | "board" | "calendar";

export interface RopimoFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  searchShortcut?: string; // e.g. "/" or "⌘K"
  filterGroups?: FilterGroup[];
  onFilterChange?: (groupId: string, value: string | string[] | undefined) => void;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (groupId: string, value: string) => void;
  onClearAllFilters?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  allowedViewModes?: ViewMode[];
  resultCount?: number;
  actionsSlot?: React.ReactNode;
  className?: string;
}

export function RopimoFilterBar({
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search and filter...",
  searchShortcut = "/",
  filterGroups = [],
  onFilterChange,
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
  viewMode,
  onViewModeChange,
  allowedViewModes,
  resultCount,
  actionsSlot,
  className,
}: RopimoFilterBarProps) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);

  // Keyboard shortcut listener
  React.useEffect(() => {
    if (!searchShortcut) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") ||
        (e.key === "k" && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchShortcut]);

  // Click outside to close dropdown
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-ropimo-filter-dropdown]")) {
        setOpenDropdownId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleSelectOption = (group: FilterGroup, optVal: string) => {
    if (!onFilterChange) return;
    if (group.isMulti) {
      const current = Array.isArray(group.selectedValue) ? group.selectedValue : [];
      const exists = current.includes(optVal);
      const next = exists ? current.filter((v) => v !== optVal) : [...current, optVal];
      onFilterChange(group.id, next);
    } else {
      const next = group.selectedValue === optVal ? undefined : optVal;
      onFilterChange(group.id, next);
      setOpenDropdownId(null);
    }
  };

  const getViewIcon = (mode: ViewMode) => {
    switch (mode) {
      case "list":
        return <List className="h-4 w-4" />;
      case "grid":
        return <LayoutGrid className="h-4 w-4" />;
      case "board":
        return <Columns3 className="h-4 w-4" />;
      case "calendar":
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("w-full space-y-2.5", className)}>
      {/* Primary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Origin UI Search input with shortcut hint & clear button */}
          {onSearchChange && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#65706A]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-[10px] border border-[#D8DDD4] bg-white py-1.5 pl-8 pr-12 text-xs text-[#18221E] placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none focus:ring-1 focus:ring-[#10251F] shadow-2xs transition-colors"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="p-0.5 text-[#8A958F] hover:text-[#18221E] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  searchShortcut && (
                    <kbd className="hidden sm:inline-flex items-center rounded border border-[#D8DDD4] bg-[#F4F3EE] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#65706A]">
                      {searchShortcut}
                    </kbd>
                  )
                )}
              </div>
            </div>
          )}

          {/* Filter Dropdown Pills */}
          {filterGroups.map((group) => {
            const isOpen = openDropdownId === group.id;
            const hasSelected = Array.isArray(group.selectedValue)
              ? group.selectedValue.length > 0
              : Boolean(group.selectedValue);

            return (
              <div
                key={group.id}
                data-ropimo-filter-dropdown
                className="relative inline-block"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(isOpen ? null : group.id);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-medium shadow-2xs transition-colors",
                    hasSelected
                      ? "border-[#10251F] bg-[#EAF4E2] text-[#10251F]"
                      : "border-[#D8DDD4] bg-white text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                  )}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>{group.label}</span>
                  {hasSelected && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#10251F] px-1 text-[10px] font-bold text-white">
                      {Array.isArray(group.selectedValue)
                        ? group.selectedValue.length
                        : 1}
                    </span>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-30 min-w-[180px] rounded-[10px] border border-[#D8DDD4] bg-white p-1 shadow-elevated">
                    <div className="py-1">
                      {group.options.map((opt, idx) => {
                        const isSelected = Array.isArray(group.selectedValue)
                          ? group.selectedValue.includes(opt.value)
                          : group.selectedValue === opt.value;

                        return (
                          <button
                            key={`opt-${opt.value || "empty"}-${idx}`}
                            type="button"
                            onClick={() => handleSelectOption(group, opt.value)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-[6px] px-2.5 py-1.5 text-xs transition-colors text-left",
                              isSelected
                                ? "bg-[#EAF4E2] font-semibold text-[#10251F]"
                                : "text-[#18221E] hover:bg-[#FAF9F5]"
                            )}
                          >
                            <span>{opt.label}</span>
                            {opt.count !== undefined && (
                              <span className="text-[11px] text-[#65706A]">
                                {opt.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right side: View switcher, Result Count, Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {resultCount !== undefined && (
            <span className="text-xs text-[#65706A] font-medium hidden md:inline">
              {resultCount} {resultCount === 1 ? "result" : "results"}
            </span>
          )}

          {/* View Mode Toggle */}
          {allowedViewModes && allowedViewModes.length > 1 && onViewModeChange && (
            <div className="flex items-center rounded-[8px] border border-[#D8DDD4] bg-white p-0.5 shadow-2xs">
              {allowedViewModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(mode)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors",
                    viewMode === mode
                      ? "bg-[#10251F] text-white shadow-2xs"
                      : "text-[#65706A] hover:text-[#18221E]"
                  )}
                  aria-label={`${mode} view`}
                >
                  {getViewIcon(mode)}
                </button>
              ))}
            </div>
          )}

          {actionsSlot}
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A958F] mr-1">
            Active:
          </span>
          {activeFilters.map((f) => (
            <span
              key={`${f.groupId}-${f.value}`}
              className="inline-flex items-center gap-1 rounded-full border border-[#D8DDD4] bg-[#EAF4E2] px-2.5 py-0.5 text-xs font-medium text-[#10251F]"
            >
              <span className="text-[#65706A]">{f.groupLabel}:</span>
              <span>{f.label}</span>
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(f.groupId, f.value)}
                  className="hover:text-red-600 transition-colors ml-0.5"
                  aria-label={`Remove ${f.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}

          {onClearAllFilters && activeFilters.length > 1 && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="text-[11px] font-semibold text-[#65706A] hover:text-[#10251F] underline transition-colors ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

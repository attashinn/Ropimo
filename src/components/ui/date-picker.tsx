"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string | null; // ISO format: YYYY-MM-DD
  onChange?: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
  id?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type ViewMode = "days" | "months" | "years";

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  minDate,
  maxDate,
  disabled = false,
  required = false,
  className,
  name,
  id,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("days");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Parse initial selected date or default to today
  const selectedDate = React.useMemo(() => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length < 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m - 1, d);
  }, [value]);

  const [viewDate, setViewDate] = React.useState<Date>(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  // Keep viewDate in sync whenever value or isOpen changes
  React.useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        setViewDate(new Date(selectedDate));
      } else {
        setViewDate(new Date());
      }
      setViewMode("days");
    }
  }, [isOpen, selectedDate]);

  // Close popover when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Year range calculation for years view
  const yearRangeStart = Math.floor(viewYear / 12) * 12;
  const yearsList = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "days") {
      setViewDate(new Date(viewYear, viewMonth - 1, 1));
    } else if (viewMode === "months") {
      setViewDate(new Date(viewYear - 1, viewMonth, 1));
    } else if (viewMode === "years") {
      setViewDate(new Date(viewYear - 12, viewMonth, 1));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "days") {
      setViewDate(new Date(viewYear, viewMonth + 1, 1));
    } else if (viewMode === "months") {
      setViewDate(new Date(viewYear + 1, viewMonth, 1));
    } else if (viewMode === "years") {
      setViewDate(new Date(viewYear + 12, viewMonth, 1));
    }
  };

  const handleSelectDay = (day: number, monthOffset: number = 0) => {
    const target = new Date(viewYear, viewMonth + monthOffset, day);
    const yStr = target.getFullYear();
    const mStr = String(target.getMonth() + 1).padStart(2, "0");
    const dStr = String(target.getDate()).padStart(2, "0");
    const isoString = `${yStr}-${mStr}-${dStr}`;

    onChange?.(isoString);
    setIsOpen(false);
  };

  const handleSelectMonth = (monthIndex: number) => {
    setViewDate(new Date(viewYear, monthIndex, 1));
    setViewMode("days");
  };

  const handleSelectYear = (year: number) => {
    setViewDate(new Date(year, viewMonth, 1));
    setViewMode("months");
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const yStr = today.getFullYear();
    const mStr = String(today.getMonth() + 1).padStart(2, "0");
    const dStr = String(today.getDate()).padStart(2, "0");
    const isoString = `${yStr}-${mStr}-${dStr}`;

    onChange?.(isoString);
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
    setIsOpen(false);
  };

  // Generate calendar grid for days view
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Days from previous month
  const prevDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevDays.push(prevMonthDays - i);
  }

  // Days of current month
  const currentDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentDays.push(i);
  }

  // Days from next month
  const totalCells = prevDays.length + currentDays.length > 35 ? 42 : 35;
  const nextDaysCount = totalCells - (prevDays.length + currentDays.length);
  const nextDays = [];
  for (let i = 1; i <= nextDaysCount; i++) {
    nextDays.push(i);
  }

  const today = new Date();
  const isToday = (day: number, month: number, year: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isSelected = (day: number, month: number, year: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const formattedDisplay = React.useMemo(() => {
    if (!selectedDate) return null;
    return selectedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full text-xs", className)}>
      {/* Hidden input for native form submission */}
      <input
        type="hidden"
        name={name}
        id={id}
        value={value || ""}
        required={required}
      />

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-medium text-[#18221E] shadow-2xs transition-all hover:border-[#10251F] hover:bg-[#FAF9F5] focus:border-[#10251F] focus:outline-none cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed bg-[#FAF9F5]",
          isOpen && "border-[#10251F] ring-1 ring-[#10251F]/10 bg-[#FAF9F5]"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-3.5 w-3.5 text-[#65706A] shrink-0" />
          <span className={cn("truncate font-semibold", !formattedDisplay && "text-[#8A958F] font-normal")}>
            {formattedDisplay || placeholder}
          </span>
        </div>

        {value && !disabled && (
          <div
            onClick={handleClear}
            className="flex h-4 w-4 items-center justify-center rounded-full text-[#8A958F] hover:bg-[#EAE8DE] hover:text-[#18221E] transition-colors cursor-pointer"
            title="Clear date"
          >
            <X className="h-3 w-3" />
          </div>
        )}
      </button>

      {/* Popover Calendar Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-[14px] border border-[#D8DDD4] bg-white p-3.5 shadow-xl select-none"
          >
            {/* Header: Month / Year / Range Navigation */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7EADF]">
              <div className="flex items-center gap-1">
                {viewMode === "days" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewMode("months")}
                      className="flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-bold text-xs text-[#18221E] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                    >
                      <span>{MONTH_NAMES[viewMonth]}</span>
                      <ChevronDown className="h-3 w-3 text-[#65706A]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("years")}
                      className="flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-semibold text-xs text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors cursor-pointer"
                    >
                      <span>{viewYear}</span>
                      <ChevronDown className="h-3 w-3 text-[#65706A]" />
                    </button>
                  </>
                )}

                {viewMode === "months" && (
                  <button
                    type="button"
                    onClick={() => setViewMode("years")}
                    className="flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-bold text-xs text-[#18221E] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                  >
                    <span>{viewYear}</span>
                    <ChevronDown className="h-3 w-3 text-[#65706A]" />
                  </button>
                )}

                {viewMode === "years" && (
                  <span className="font-bold text-xs text-[#18221E] px-1.5 py-0.5">
                    {yearRangeStart} – {yearRangeStart + 11}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors cursor-pointer"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors cursor-pointer"
                  aria-label="Next"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 1. DAYS VIEW */}
            {viewMode === "days" && (
              <>
                <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center">
                  {DAYS_OF_WEEK.map((d) => (
                    <span
                      key={d}
                      className="text-[10px] font-bold text-[#8A958F] uppercase"
                    >
                      {d}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {prevDays.map((d, idx) => (
                    <button
                      key={`prev-${idx}-${d}`}
                      type="button"
                      onClick={() => handleSelectDay(d, -1)}
                      className="flex h-7 w-7 mx-auto items-center justify-center rounded-[7px] text-[11px] text-[#C4CAC0] hover:bg-[#FAF9F5] hover:text-[#65706A] transition-colors cursor-pointer"
                    >
                      {d}
                    </button>
                  ))}

                  {currentDays.map((d, idx) => {
                    const selected = isSelected(d, viewMonth, viewYear);
                    const todayCurrent = isToday(d, viewMonth, viewYear);

                    return (
                      <button
                        key={`cur-${idx}-${d}`}
                        type="button"
                        onClick={() => handleSelectDay(d, 0)}
                        className={cn(
                          "flex h-7 w-7 mx-auto items-center justify-center rounded-[7px] text-[11px] font-medium transition-all cursor-pointer",
                          selected
                            ? "bg-[#10251F] text-white font-bold shadow-2xs"
                            : todayCurrent
                            ? "border border-[#10251F] font-bold text-[#10251F] hover:bg-[#FAF9F5]"
                            : "text-[#18221E] hover:bg-[#FAF9F5]"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}

                  {nextDays.map((d, idx) => (
                    <button
                      key={`next-${idx}-${d}`}
                      type="button"
                      onClick={() => handleSelectDay(d, 1)}
                      className="flex h-7 w-7 mx-auto items-center justify-center rounded-[7px] text-[11px] text-[#C4CAC0] hover:bg-[#FAF9F5] hover:text-[#65706A] transition-colors cursor-pointer"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 2. MONTHS PICKER VIEW */}
            {viewMode === "months" && (
              <div className="grid grid-cols-3 gap-2 pt-3 pb-1">
                {MONTH_SHORT_NAMES.map((mName, idx) => {
                  const isCurrentMonth = idx === viewMonth;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={cn(
                        "rounded-[8px] py-2 text-xs font-semibold transition-colors cursor-pointer",
                        isCurrentMonth
                          ? "bg-[#10251F] text-white font-bold"
                          : "text-[#18221E] hover:bg-[#FAF9F5]"
                      )}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. YEARS PICKER VIEW */}
            {viewMode === "years" && (
              <div className="grid grid-cols-3 gap-2 pt-3 pb-1">
                {yearsList.map((y) => {
                  const isCurrentYear = y === viewYear;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => handleSelectYear(y)}
                      className={cn(
                        "rounded-[8px] py-2 text-xs font-semibold transition-colors cursor-pointer",
                        isCurrentYear
                          ? "bg-[#10251F] text-white font-bold"
                          : "text-[#18221E] hover:bg-[#FAF9F5]"
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer: Quick Actions */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#E7EADF] text-[11px]">
              <button
                type="button"
                onClick={handleClear}
                className="font-medium text-[#65706A] hover:text-[#18221E] hover:underline cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSelectToday}
                className="font-bold text-[#10251F] hover:underline cursor-pointer"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

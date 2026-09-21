"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  Repeat,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string | null; // ISO format: YYYY-MM-DD
  onChange?: (date: string) => void;
  startDate?: string | null;
  dueDate?: string | null;
  onDateRangeChange?: (start: string, due: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
  name?: string;
  id?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(iso?: string | null): Date | null {
  if (!iso) return null;
  const parts = iso.split("-");
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

export function DatePicker({
  value,
  onChange,
  startDate,
  dueDate,
  onDateRangeChange,
  placeholder,
  minDate,
  maxDate,
  disabled = false,
  required = false,
  className,
  buttonClassName,
  align = "left",
  name,
  id,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeInput, setActiveInput] = React.useState<"start" | "due">("due");
  const [showBanner, setShowBanner] = React.useState(true);
  const [isRecurringOpen, setIsRecurringOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Internal state for single vs range
  const internalDue = value !== undefined ? value : dueDate || null;
  const internalStart = startDate || null;

  const selectedDueDate = React.useMemo(() => parseISODate(internalDue), [internalDue]);
  const selectedStartDate = React.useMemo(() => parseISODate(internalStart), [internalStart]);

  const [viewDate, setViewDate] = React.useState<Date>(() => {
    return selectedDueDate ? new Date(selectedDueDate) : new Date();
  });

  // Sync view date on open
  React.useEffect(() => {
    if (isOpen) {
      if (activeInput === "start" && selectedStartDate) {
        setViewDate(new Date(selectedStartDate));
      } else if (selectedDueDate) {
        setViewDate(new Date(selectedDueDate));
      } else {
        setViewDate(new Date());
      }
    }
  }, [isOpen, activeInput, selectedStartDate, selectedDueDate]);

  // Click outside listener
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsRecurringOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setViewDate(today);
    applyDate(toISODate(today));
  };

  const applyDate = (isoStr: string) => {
    if (activeInput === "start") {
      if (onDateRangeChange) {
        onDateRangeChange(isoStr, internalDue || "");
      }
      // auto advance to due date
      setActiveInput("due");
    } else {
      if (onChange) {
        onChange(isoStr);
      }
      if (onDateRangeChange) {
        onDateRangeChange(internalStart || "", isoStr);
      }
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
    if (onDateRangeChange) {
      onDateRangeChange("", "");
    }
    setIsOpen(false);
  };

  // Calendar Grid calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const prevDays: number[] = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevDays.push(prevMonthDays - i);
  }

  const currentDays: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentDays.push(i);
  }

  const totalCells = prevDays.length + currentDays.length > 35 ? 42 : 35;
  const nextDaysCount = totalCells - (prevDays.length + currentDays.length);
  const nextDays: number[] = [];
  for (let i = 1; i <= nextDaysCount; i++) {
    nextDays.push(i);
  }

  const now = new Date();
  const isToday = (day: number, month: number, year: number) => {
    return (
      now.getDate() === day &&
      now.getMonth() === month &&
      now.getFullYear() === year
    );
  };

  const isSelectedDue = (day: number, month: number, year: number) => {
    if (!selectedDueDate) return false;
    return (
      selectedDueDate.getDate() === day &&
      selectedDueDate.getMonth() === month &&
      selectedDueDate.getFullYear() === year
    );
  };

  const isSelectedStart = (day: number, month: number, year: number) => {
    if (!selectedStartDate) return false;
    return (
      selectedStartDate.getDate() === day &&
      selectedStartDate.getMonth() === month &&
      selectedStartDate.getFullYear() === year
    );
  };

  // ClickUp dynamic presets
  const presets = React.useMemo(() => {
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const currentDay = now.getDay();
    const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
    const thisWeekend = new Date(now);
    thisWeekend.setDate(now.getDate() + daysUntilSaturday);

    const daysUntilNextMonday = (1 - currentDay + 7) % 7 || 7;
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + daysUntilNextMonday);

    const nextWeekend = new Date(thisWeekend);
    nextWeekend.setDate(thisWeekend.getDate() + 7);

    const twoWeeks = new Date(now);
    twoWeeks.setDate(now.getDate() + 14);

    const fourWeeks = new Date(now);
    fourWeeks.setDate(now.getDate() + 28);

    // Format relative times
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const formattedHours = hours % 12 || 12;
    const laterTimeStr = `${formattedHours}:${String(minutes).padStart(2, "0")} ${ampm}`;

    return [
      {
        label: "Today",
        date: toISODate(today),
        right: today.toLocaleDateString("en-US", { weekday: "short" }),
      },
      {
        label: "Later",
        date: toISODate(today),
        right: laterTimeStr,
      },
      {
        label: "Tomorrow",
        date: toISODate(tomorrow),
        right: tomorrow.toLocaleDateString("en-US", { weekday: "short" }),
      },
      {
        label: "This weekend",
        date: toISODate(thisWeekend),
        right: "Sat",
      },
      {
        label: "Next week",
        date: toISODate(nextWeek),
        right: "Mon",
      },
      {
        label: "Next weekend",
        date: toISODate(nextWeekend),
        right: nextWeekend.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      },
      {
        label: "2 weeks",
        date: toISODate(twoWeeks),
        right: twoWeeks.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      },
      {
        label: "4 weeks",
        date: toISODate(fourWeeks),
        right: fourWeeks.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      },
    ];
  }, []);

  // Format trigger label
  const formattedTriggerDisplay = React.useMemo(() => {
    if (internalStart && internalDue) {
      const s = parseISODate(internalStart);
      const d = parseISODate(internalDue);
      if (s && d) {
        return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
    }
    if (selectedDueDate) {
      return selectedDueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return null;
  }, [internalStart, internalDue, selectedDueDate]);

  return (
    <div ref={containerRef} className={cn("relative inline-block text-xs select-none", className)}>
      <input type="hidden" name={name} id={id} value={internalDue || ""} required={required} />

      {/* ── TRIGGER BUTTON (ClickUp Pill Style) ─────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D8DDD4] bg-[#FAF9F5]/70 hover:bg-[#FAF9F5] hover:border-[#10251F] text-xs font-medium text-[#18221E] shadow-2xs transition-all cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50",
          isOpen && "border-[#10251F] ring-2 ring-[#10251F]/10 bg-white",
          buttonClassName
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className={cn("truncate font-medium", !formattedTriggerDisplay && "text-slate-500 font-normal")}>
          {formattedTriggerDisplay || placeholder || "Start → Due"}
        </span>

        {internalDue && !disabled && (
          <div
            onClick={handleClear}
            className="ml-1 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </div>
        )}
      </button>

      {/* ── CLICKUP CALENDAR POPOVER ────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={cn(
              "absolute top-full mt-2 z-50 w-[94vw] max-w-[530px] rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xl font-sans text-[#18221E]",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {/* 1. TOP START / DUE DATE DUAL INPUTS */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Start Date Input Pill */}
              <button
                type="button"
                onClick={() => setActiveInput("start")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all cursor-pointer",
                  activeInput === "start"
                    ? "border-2 border-slate-900 bg-white font-semibold shadow-xs"
                    : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">
                  {selectedStartDate
                    ? selectedStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "Start date"}
                </span>
              </button>

              {/* Due Date Input Pill */}
              <button
                type="button"
                onClick={() => setActiveInput("due")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-all cursor-pointer",
                  activeInput === "due"
                    ? "border-2 border-slate-900 bg-white font-semibold shadow-xs"
                    : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">
                  {selectedDueDate
                    ? selectedDueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Due date"}
                </span>
              </button>
            </div>

            {/* 2. TWO-COLUMN LAYOUT: SHORTCUTS ON LEFT, MONTH CALENDAR ON RIGHT */}
            <div className="grid grid-cols-12 gap-3 pt-1">
              {/* ── LEFT COLUMN (Shortcuts / Presets) ────────────────── */}
              <div className="col-span-5 pr-2 border-r border-slate-100 space-y-0.5">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      applyDate(preset.date);
                      setViewDate(new Date(preset.date));
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#F1F5F9] transition-colors cursor-pointer group text-left"
                  >
                    <span className="font-medium text-slate-700 group-hover:text-slate-900">
                      {preset.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal group-hover:text-slate-600">
                      {preset.right}
                    </span>
                  </button>
                ))}

                <div className="pt-1.5 pb-0.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRecurringOpen(!isRecurringOpen)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#F1F5F9] text-slate-700 font-medium transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Repeat className="w-3 h-3 text-slate-400" />
                      <span>Set Recurring</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {isRecurringOpen && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                    <p className="font-bold text-slate-800">Repeat frequency</p>
                    {(["Daily", "Weekly", "Monthly", "Yearly"] as const).map((rec) => (
                      <button
                        key={rec}
                        type="button"
                        onClick={() => setIsRecurringOpen(false)}
                        className="w-full text-left px-2 py-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN (Month Calendar Grid) ───────────────── */}
              <div className="col-span-7 pl-1">
                {/* Header: Month Name + Today link + Up/Down Chevrons */}
                <div className="flex items-center justify-between pb-2 mb-1">
                  <span className="font-bold text-sm text-slate-900">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTodayClick}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer px-1 py-0.5 rounded"
                    >
                      Today
                    </button>

                    {/* Up / Down chevrons just like in ClickUp */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Previous Month"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Next Month"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Day of week labels */}
                <div className="grid grid-cols-7 text-center pb-1">
                  {DAYS_OF_WEEK.map((d) => (
                    <span key={d} className="text-[11px] font-semibold text-slate-400 py-1">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Calendar Days Matrix */}
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                  {/* Previous Month Days */}
                  {prevDays.map((d) => (
                    <button
                      key={`prev-${d}`}
                      type="button"
                      onClick={() => {
                        const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
                        const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
                        const dateObj = new Date(prevY, prevM, d);
                        applyDate(toISODate(dateObj));
                      }}
                      className="w-7 h-7 flex items-center justify-center mx-auto text-slate-300 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
                    >
                      {d}
                    </button>
                  ))}

                  {/* Current Month Days */}
                  {currentDays.map((d) => {
                    const isDue = isSelectedDue(d, viewMonth, viewYear);
                    const isStart = isSelectedStart(d, viewMonth, viewYear);
                    const currentIsToday = isToday(d, viewMonth, viewYear);

                    // ClickUp Coral-Red Highlight
                    const isHighlighted = isDue || isStart || (currentIsToday && !selectedDueDate);

                    return (
                      <button
                        key={`curr-${d}`}
                        type="button"
                        onClick={() => {
                          const dateObj = new Date(viewYear, viewMonth, d);
                          applyDate(toISODate(dateObj));
                        }}
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs transition-all font-medium cursor-pointer",
                          isHighlighted
                            ? "bg-[#EF4444] text-white font-bold shadow-xs scale-105"
                            : "text-slate-800 hover:bg-slate-100"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}

                  {/* Next Month Days */}
                  {nextDays.map((d) => (
                    <button
                      key={`next-${d}`}
                      type="button"
                      onClick={() => {
                        const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
                        const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
                        const dateObj = new Date(nextY, nextM, d);
                        applyDate(toISODate(dateObj));
                      }}
                      className="w-7 h-7 flex items-center justify-center mx-auto text-slate-300 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. SIGNATURE CLICKUP BOTTOM WORK SCHEDULE BANNER */}
            {showBanner && (
              <div className="mt-3 p-2.5 rounded-xl border border-[#E7EADF] bg-[#FAF9F5] flex items-center justify-between text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏖️</span>
                  <div>
                    <p className="font-bold text-[#0F172A] text-[11px] leading-snug">
                      Set up your work schedule
                    </p>
                    <p className="text-[10px] text-[#64748B]">
                      Set working days/hours and holidays for your workspace.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBanner(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

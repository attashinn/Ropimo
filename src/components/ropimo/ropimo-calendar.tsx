"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  date: string | Date; // YYYY-MM-DD or Date
  title: string;
  color?: string;
  type?: "meeting" | "task" | "leave" | "deadline" | "other";
}

export interface RopimoCalendarProps {
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  events?: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  minDate?: Date;
  maxDate?: Date;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
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

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function RopimoCalendar({
  selectedDate,
  onSelectDate,
  events = [],
  onSelectEvent,
  minDate,
  maxDate,
  size = "md",
  className,
}: RopimoCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    return selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date();
  });

  const today = React.useMemo(() => new Date(), []);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const t = new Date();
    setCurrentMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    onSelectDate?.(t);
  };

  // Event map by date key
  const eventMap = React.useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const d = typeof ev.date === "string" ? new Date(ev.date) : ev.date;
      const key = formatDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  // Generate days in month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({ date: d, isCurrentMonth: true });
  }

  // Next month leading days to complete grid (up to 35 or 42)
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }

  const cellSize = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-xs sm:text-sm",
    lg: "h-11 w-11 text-sm font-medium",
  };

  return (
    <div
      className={cn(
        "w-full rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs space-y-4",
        className
      )}
    >
      {/* Header Month / Year & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-[#18221E]">
            {MONTH_NAMES[month]} {year}
          </h3>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold text-[#10251F] hover:bg-[#E7EADF] transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
            aria-label="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-white text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
            aria-label="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.slice(0, 35).map(({ date, isCurrentMonth }, idx) => {
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isTodayDay = isSameDay(date, today);
          const dateKey = formatDateKey(date);
          const dayEvents = eventMap[dateKey] || [];

          const isDisabled =
            (minDate && date < minDate) || (maxDate && date > maxDate);

          return (
            <button
              key={`${dateKey}-${idx}`}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isCurrentMonth) {
                  onSelectDate?.(date);
                } else {
                  setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                  onSelectDate?.(date);
                }
              }}
              className={cn(
                "relative mx-auto flex flex-col items-center justify-center rounded-[8px] transition-all",
                cellSize[size],
                isDisabled && "opacity-30 pointer-events-none",
                !isCurrentMonth && "text-[#B8C0B2]",
                isCurrentMonth && !isSelected && "text-[#18221E] hover:bg-[#FAF9F5]",
                isTodayDay && !isSelected && "border border-[#C7F34A] bg-[#FAF9F5] font-bold text-[#10251F]",
                isSelected && "bg-[#10251F] text-white font-bold shadow-xs"
              )}
            >
              <span>{date.getDate()}</span>

              {/* Event Dots */}
              {dayEvents.length > 0 && (
                <div className="absolute bottom-1 flex items-center gap-0.5">
                  {dayEvents.slice(0, 3).map((ev, eIdx) => (
                    <span
                      key={`${ev.id}-${eIdx}`}
                      className={cn(
                        "h-1 w-1 rounded-full",
                        isSelected ? "bg-[#C7F34A]" : "bg-[#246244]"
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
  CalendarViewMode,
  CalendarAttachment,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/types/calendar";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { PrimaryButton } from "@/components/ui/primary-button";
import { DatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
  toggleCalendarTaskAction,
  addCalendarEventCommentAction,
} from "@/lib/calendar/actions";
import { cn } from "@/lib/utils";
import {
  SearchIcon,
  FilterIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  PlusIcon,
  ExternalLinkIcon,
  FileIcon,
  TrashIcon,
  EditIcon,
  ClockIcon,
  MapPinIcon,
  VideoIcon,
  UserIcon,
  CalendarNavIcon,
} from "./calendar-icons";

// Days of week
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const EVENT_TYPE_OPTIONS = [
  { value: "meeting", label: "Meeting", dotColor: "#246244" },
  { value: "task", label: "Task", dotColor: "#2563EB" },
  { value: "deadline", label: "Deadline", dotColor: "#E11D48" },
  { value: "event", label: "Company Event", dotColor: "#D97706" },
  { value: "leave", label: "Leave", dotColor: "#7C3AED" },
];

export interface CalendarViewProps {
  workspaceId: string;
  workspaceName?: string;
  currentUserId?: string;
  initialEvents: CalendarEvent[];
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
}

export function CalendarView({
  workspaceId,
  workspaceName = "brnnd",
  currentUserId,
  initialEvents,
  people,
  projects,
  departments,
}: CalendarViewProps) {
  const router = useRouter();

  // Calendar State - Anchor default to August 2026 (matching system context)
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date(2026, 7, 21));
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("month");
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);

  // Sync when initialEvents change
  React.useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Filters State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedEventType, setSelectedEventType] = React.useState<"all" | CalendarEventType>("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = React.useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("all");
  const [onlyMyEvents, setOnlyMyEvents] = React.useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = React.useState(false);

  // Options for custom selects
  const eventTypeOptions = [
    { value: "meeting", label: "Meeting", dotColor: "#246244" },
    { value: "task", label: "Task", dotColor: "#2563EB" },
    { value: "deadline", label: "Deadline", dotColor: "#E11D48" },
    { value: "event", label: "Company Event", dotColor: "#D97706" },
    { value: "leave", label: "Leave", dotColor: "#7C3AED" },
  ];

  const departmentSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "None" },
      ...(departments || []).map((d) => ({
        value: d.id,
        label: d.name,
        dotColor: d.color,
      })),
    ];
  }, [departments]);

  const projectSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "None" },
      ...(projects || []).map((p) => ({
        value: p.id,
        label: p.name,
        dotColor: p.color,
      })),
    ];
  }, [projects]);

  // Category Toggles in "My Calendars"
  const [categoryToggles, setCategoryToggles] = React.useState({
    mySchedule: true,
    projects: true,
    meetings: true,
    events: true,
    leave: true,
  });

  // Modal States
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createModalInitialDate, setCreateModalInitialDate] = React.useState<string>("2026-08-21");
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const [dayExpandedDate, setDayExpandedDate] = React.useState<string | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = React.useState<CalendarEvent | null>(null);

  // Helper date calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 7, 21)); // System platform anchor date
  };

  // Filtered Events
  const filteredEvents = React.useMemo(() => {
    return events.filter((e) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesDesc = e.description ? e.description.toLowerCase().includes(q) : false;
        const matchesDept = e.department_name ? e.department_name.toLowerCase().includes(q) : false;
        const matchesProj = e.project_name ? e.project_name.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesDesc && !matchesDept && !matchesProj) return false;
      }

      // 2. Event Type Filter
      if (selectedEventType !== "all" && e.event_type !== selectedEventType) {
        return false;
      }

      // 3. Department Filter
      if (selectedDepartmentId !== "all" && e.department_id !== selectedDepartmentId) {
        return false;
      }

      // 4. Project Filter
      if (selectedProjectId !== "all" && e.project_id !== selectedProjectId) {
        return false;
      }

      // 5. My Events Filter
      if (onlyMyEvents && currentUserId) {
        const isParticipant = e.participants.some((p) => p.user_id === currentUserId || p.id === currentUserId);
        const isCreator = e.created_by === currentUserId;
        if (!isParticipant && !isCreator) return false;
      }

      // 6. Category Toggles (My Calendars)
      if (e.event_type === "meeting" && !categoryToggles.meetings) return false;
      if (e.event_type === "task" && !categoryToggles.projects) return false;
      if (e.event_type === "deadline" && !categoryToggles.projects) return false;
      if (e.event_type === "event" && !categoryToggles.events) return false;
      if (e.event_type === "leave" && !categoryToggles.leave) return false;

      return true;
    });
  }, [
    events,
    searchQuery,
    selectedEventType,
    selectedDepartmentId,
    selectedProjectId,
    onlyMyEvents,
    currentUserId,
    categoryToggles,
  ]);

  // Calendar Grid Days for Month View
  const monthGridDays = React.useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
    }[] = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = formatDateString(d);
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === "2026-08-21",
        events: filteredEvents.filter((e) => e.start_date === dateStr),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = formatDateString(d);
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === "2026-08-21",
        events: filteredEvents.filter((e) => e.start_date === dateStr),
      });
    }

    // Next month filler days to complete grid (up to 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = formatDateString(d);
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === "2026-08-21",
        events: filteredEvents.filter((e) => e.start_date === dateStr),
      });
    }

    return days;
  }, [year, month, filteredEvents]);

  // Week Grid Days
  const weekGridDays = React.useMemo(() => {
    const currentDayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);

    const days: {
      date: Date;
      dateString: string;
      dayNumber: number;
      dayName: string;
      isToday: boolean;
      events: CalendarEvent[];
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = formatDateString(d);
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: d.getDate(),
        dayName: DAYS_OF_WEEK[i],
        isToday: dateStr === "2026-08-21",
        events: filteredEvents.filter((e) => e.start_date === dateStr),
      });
    }

    return days;
  }, [currentDate, filteredEvents]);

  // Chronological Upcoming Events for the Right-Side Panel
  const upcomingGrouped = React.useMemo(() => {
    const todayStr = "2026-08-21";
    const futureEvents = [...filteredEvents]
      .filter((e) => e.start_date >= todayStr)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const groups: { [key: string]: { date: string; label: string; events: CalendarEvent[] } } = {};

    futureEvents.forEach((ev) => {
      let label = "";
      if (ev.start_date === "2026-08-21") {
        label = "TODAY — AUG 21";
      } else if (ev.start_date === "2026-08-22") {
        label = "TOMORROW — AUG 22";
      } else {
        const parts = ev.start_date.split("-");
        const mIdx = parseInt(parts[1], 10) - 1;
        const dNum = parseInt(parts[2], 10);
        const mShort = MONTH_NAMES[mIdx]?.substring(0, 3).toUpperCase();
        label = `${mShort} ${dNum}`;
      }

      if (!groups[ev.start_date]) {
        groups[ev.start_date] = { date: ev.start_date, label, events: [] };
      }
      groups[ev.start_date].events.push(ev);
    });

    return Object.values(groups).slice(0, 6);
  }, [filteredEvents]);

  // Handlers
  const handleOpenCreateModal = (dateStr?: string) => {
    setCreateModalInitialDate(dateStr || formatDateString(currentDate));
    setCreateModalOpen(true);
  };

  const handleEventCreated = (newEvent: CalendarEvent) => {
    setEvents((prev) => [...prev, newEvent]);
    setCreateModalOpen(false);
  };

  const handleEventUpdated = (updatedEvent: CalendarEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
    );
    setSelectedEvent(updatedEvent);
    setEditingEvent(null);
  };

  const handleEventDeleted = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setSelectedEvent(null);
    setDeleteConfirmEvent(null);
    setDayExpandedDate(null);
  };

  const handleToggleTaskStatus = async (ev: CalendarEvent) => {
    const newStatus: CalendarEventStatus =
      ev.status === "completed" ? "scheduled" : "completed";

    const updated: CalendarEvent = { ...ev, status: newStatus };
    setEvents((prev) => prev.map((e) => (e.id === ev.id ? updated : e)));
    if (selectedEvent?.id === ev.id) {
      setSelectedEvent(updated);
    }

    if (ev.task_id) {
      await toggleCalendarTaskAction(ev.task_id, workspaceId, ev.status);
    } else {
      await updateCalendarEventAction({
        eventId: ev.id,
        workspaceId,
        status: newStatus,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ================================================== */}
      {/* PAGE HEADER */}
      {/* ================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#D8DDD4]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18221E] sm:text-3xl">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-[#65706A]">
            Plan tasks, meetings, deadlines, and important company events.
          </p>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#B8C0B2] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10251F]"
          >
            Today
          </button>

          <PrimaryButton
            size="sm"
            onClick={() => handleOpenCreateModal()}
          >
            + Create Event
          </PrimaryButton>
        </div>
      </div>

      {/* ================================================== */}
      {/* CALENDAR TOOLBAR */}
      {/* ================================================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[14px] border border-[#D8DDD4] bg-white p-3 shadow-2xs">
        {/* Left side: Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous month"
              className="rounded-[6px] p-1.5 text-[#18221E] hover:bg-white transition-colors focus:outline-none"
            >
              <ChevronLeftIcon size={16} />
            </button>

            <span className="px-3 text-sm font-bold text-[#18221E] select-none min-w-[140px] text-center">
              {viewMode === "month" && `${MONTH_NAMES[month]} ${year}`}
              {viewMode === "week" && `Week of ${MONTH_NAMES[weekGridDays[0].date.getMonth()]} ${weekGridDays[0].dayNumber}, ${year}`}
              {viewMode === "day" && `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${year}`}
            </span>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next month"
              className="rounded-[6px] p-1.5 text-[#18221E] hover:bg-white transition-colors focus:outline-none"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>

          {/* Quick jump to current platform month if navigated away */}
          {(month !== 7 || year !== 2026) && (
            <button
              type="button"
              onClick={handleToday}
              className="text-xs font-semibold text-[#246244] hover:underline"
            >
              Back to August 2026
            </button>
          )}
        </div>

        {/* Right side: View controls & Filter */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search box */}
          <div className="relative">
            <SearchIcon
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#65706A]"
            />
            <input
              type="text"
              placeholder="Filter events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-36 sm:w-44 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] pl-8 pr-2.5 text-xs text-[#18221E] placeholder:text-[#65706A] focus:border-[#10251F] focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#65706A] hover:text-[#18221E]"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors focus:outline-none",
                selectedEventType !== "all" || selectedDepartmentId !== "all" || onlyMyEvents
                  ? "bg-[#10251F] text-[#F4F3EE] border-[#10251F]"
                  : "bg-white text-[#18221E] hover:bg-[#FAF9F5]"
              )}
            >
              <FilterIcon size={13} />
              <span>Filter</span>
              {(selectedEventType !== "all" || selectedDepartmentId !== "all" || onlyMyEvents) && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C7F34A] text-[9px] font-bold text-[#10251F]">
                  1
                </span>
              )}
            </button>

            {/* Filter Dropdown Popover */}
            <AnimatePresence>
              {filterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFilterDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-xl text-xs space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#D8DDD4]">
                      <span className="font-bold text-[#18221E]">Filter Events</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventType("all");
                          setSelectedDepartmentId("all");
                          setSelectedProjectId("all");
                          setOnlyMyEvents(false);
                          setSearchQuery("");
                        }}
                        className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E]"
                      >
                        Reset
                      </button>
                    </div>

                    {/* By Type */}
                    <div>
                      <p className="font-semibold text-[#65706A] uppercase tracking-wider text-[10px] mb-1.5">
                        Event Type
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: "All types", val: "all" },
                          { label: "Tasks", val: "task" },
                          { label: "Meetings", val: "meeting" },
                          { label: "Deadlines", val: "deadline" },
                          { label: "Events", val: "event" },
                          { label: "Leave", val: "leave" },
                        ].map((t) => (
                          <button
                            key={t.val}
                            type="button"
                            onClick={() => setSelectedEventType(t.val as any)}
                            className={cn(
                              "rounded-[6px] px-2 py-1 text-left font-medium transition-colors",
                              selectedEventType === t.val
                                ? "bg-[#10251F] text-white font-semibold"
                                : "bg-[#FAF9F5] text-[#18221E] hover:bg-[#E7EADF]"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* By Department */}
                    <div>
                      <p className="font-semibold text-[#65706A] uppercase tracking-wider text-[10px] mb-1.5">
                        Department
                      </p>
                      <select
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="w-full rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] p-1.5 text-xs text-[#18221E] focus:outline-none"
                      >
                        <option value="all">All departments</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* My Events Only */}
                    <label className="flex items-center gap-2 pt-1 border-t border-[#D8DDD4] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyMyEvents}
                        onChange={(e) => setOnlyMyEvents(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-[#D8DDD4] text-[#10251F] focus:ring-[#10251F]"
                      />
                      <span className="font-medium text-[#18221E]">Only show my events</span>
                    </label>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* View Mode Selector: Month | Week | Day */}
          <div className="flex items-center rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-0.5 shadow-2xs">
            {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded-[6px] px-3 py-1 text-xs font-semibold capitalize transition-all focus:outline-none",
                  viewMode === mode
                    ? "bg-[#10251F] text-[#F4F3EE] shadow-xs"
                    : "text-[#65706A] hover:text-[#18221E]"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* MAIN CALENDAR GRID & RIGHT SCHEDULE PANEL */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* CALENDAR VIEW CONTAINER (Left 8-9 cols on XL) */}
        <div className="xl:col-span-8 2xl:col-span-9 rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
          {/* ==================== MONTH VIEW ==================== */}
          {viewMode === "month" && (
            <div>
              {/* Day Header Row */}
              <div className="grid grid-cols-7 border-b border-[#D8DDD4] bg-[#FAF9F5] text-center text-xs font-bold text-[#65706A] py-2.5">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="uppercase tracking-wider text-[11px]">
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#D8DDD4] bg-[#D8DDD4]">
                {monthGridDays.map((cell, idx) => {
                  const dayEvents = cell.events;
                  const displayEvents = dayEvents.slice(0, 3);
                  const extraCount = dayEvents.length - 3;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenCreateModal(cell.dateString)}
                      className={cn(
                        "group relative min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 transition-colors cursor-pointer",
                        cell.isCurrentMonth
                          ? "bg-white hover:bg-[#FAF9F5]/80"
                          : "bg-[#FAF9F5]/60 hover:bg-[#F4F3EE]/80"
                      )}
                    >
                      {/* Date number header */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all",
                            cell.isToday
                              ? "bg-[#10251F] text-[#F4F3EE] shadow-xs"
                              : cell.isCurrentMonth
                              ? "text-[#18221E] group-hover:bg-[#E7EADF]/60"
                              : "text-[#65706A]/50"
                          )}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Quick add button on hover */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateModal(cell.dateString);
                          }}
                          className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[#65706A] hover:bg-[#E7EADF] hover:text-[#18221E] transition-all"
                          title="Add event"
                        >
                          <PlusIcon size={12} />
                        </button>
                      </div>

                      {/* Event items in cell */}
                      <div className="space-y-1">
                        {displayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className={cn(
                              "group/item relative flex items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium border leading-tight transition-transform hover:scale-[1.01] cursor-pointer shadow-2xs truncate",
                              getEventStyle(ev.event_type)
                            )}
                            title={`${ev.title} (${ev.start_time || "All day"})`}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                getEventDotColor(ev.event_type)
                              )}
                            />

                            {ev.start_time && !ev.is_all_day && (
                              <span className="shrink-0 text-[9px] font-semibold opacity-75">
                                {ev.start_time.replace(":00", "")}
                              </span>
                            )}

                            <span
                              className={cn(
                                "truncate",
                                ev.status === "completed" && "line-through opacity-60"
                              )}
                            >
                              {ev.title}
                            </span>
                          </div>
                        ))}

                        {/* +N More indicator */}
                        {extraCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDayExpandedDate(cell.dateString);
                            }}
                            className="w-full text-left rounded px-1.5 py-0.5 text-[10px] font-bold text-[#65706A] hover:bg-[#E7EADF] hover:text-[#18221E] transition-colors"
                          >
                            +{extraCount} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== WEEK VIEW ==================== */}
          {viewMode === "week" && (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Day Header Row */}
                <div className="grid grid-cols-7 border-b border-[#D8DDD4] bg-[#FAF9F5] text-center text-xs py-2.5">
                  {weekGridDays.map((col) => (
                    <div
                      key={col.dateString}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-1 px-2 rounded-md mx-1",
                        col.isToday ? "bg-[#E7EADF]/60" : ""
                      )}
                    >
                      <span className="uppercase tracking-wider text-[10px] font-bold text-[#65706A]">
                        {col.dayName}
                      </span>
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          col.isToday
                            ? "bg-[#10251F] text-[#F4F3EE]"
                            : "text-[#18221E]"
                        )}
                      >
                        {col.dayNumber}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Week Columns */}
                <div className="grid grid-cols-7 divide-x divide-[#D8DDD4] min-h-[500px] p-2 bg-[#FAF9F5]/30">
                  {weekGridDays.map((col) => (
                    <div
                      key={col.dateString}
                      onClick={() => handleOpenCreateModal(col.dateString)}
                      className="space-y-2 p-1.5 hover:bg-white/60 transition-colors min-h-[480px] cursor-pointer"
                    >
                      {col.events.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[11px] text-[#B8C0B2]">
                          No events
                        </div>
                      )}

                      {col.events.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className={cn(
                            "rounded-[8px] p-2.5 text-xs border transition-all hover:shadow-xs cursor-pointer",
                            getEventStyle(ev.event_type)
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] font-semibold opacity-80 mb-1">
                            <span className="capitalize">{ev.event_type}</span>
                            <span>{ev.start_time || "All day"}</span>
                          </div>

                          <p
                            className={cn(
                              "font-bold text-[#18221E] text-xs leading-tight mb-1",
                              ev.status === "completed" && "line-through opacity-60"
                            )}
                          >
                            {ev.title}
                          </p>

                          {ev.project_name && (
                            <span className="inline-block text-[10px] text-[#65706A] truncate max-w-full">
                              {ev.project_name}
                            </span>
                          )}

                          {ev.participants.length > 0 && (
                            <div className="flex items-center -space-x-1.5 mt-2">
                              {ev.participants.slice(0, 3).map((p, pIdx) => (
                                <div
                                  key={`w-part-${p.id || p.user_id || pIdx}`}
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-[#F4F3EE] ring-1 ring-white"
                                  title={p.full_name || p.email}
                                >
                                  {(p.full_name || p.email || "U")[0]?.toUpperCase() || "U"}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== DAY VIEW ==================== */}
          {viewMode === "day" && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
                <div>
                  <h3 className="text-lg font-bold text-[#18221E]">
                    {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getDate()}, {year}
                  </h3>
                  <p className="text-xs text-[#65706A]">
                    {DAYS_OF_WEEK[currentDate.getDay()]} Agenda
                  </p>
                </div>

                <PrimaryButton
                  size="sm"
                  onClick={() => handleOpenCreateModal(formatDateString(currentDate))}
                >
                  + Add Item
                </PrimaryButton>
              </div>

              {/* Day Agenda List */}
              {(() => {
                const dayEvents = filteredEvents.filter(
                  (e) => e.start_date === formatDateString(currentDate)
                );

                if (dayEvents.length === 0) {
                  return (
                    <div className="py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F5] border border-[#D8DDD4] text-[#65706A] mb-3">
                        <CalendarNavIcon size={20} />
                      </div>
                      <h4 className="text-sm font-bold text-[#18221E]">
                        No scheduled items for this date
                      </h4>
                      <p className="text-xs text-[#65706A] mt-1">
                        Click below to schedule a meeting, task, or team event.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateModal(formatDateString(currentDate))}
                        className="mt-4 rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
                      >
                        + Create Event
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] p-4 border transition-all hover:shadow-xs cursor-pointer",
                          getEventStyle(ev.event_type)
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-white border border-[#D8DDD4] shadow-2xs font-bold text-xs">
                            {ev.start_time ? ev.start_time.split(" ")[0] : "All Day"}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                  getBadgeStyle(ev.event_type)
                                )}
                              >
                                {ev.event_type}
                              </span>

                              {ev.department_name && (
                                <span className="text-[11px] text-[#65706A] font-medium">
                                  {ev.department_name}
                                </span>
                              )}
                            </div>

                            <h4
                              className={cn(
                                "text-sm font-bold text-[#18221E]",
                                ev.status === "completed" && "line-through opacity-60"
                              )}
                            >
                              {ev.title}
                            </h4>

                            {ev.description && (
                              <p className="text-xs text-[#65706A] line-clamp-1 max-w-xl">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right details / meeting link */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {ev.meeting_link && (
                            <a
                              href={ev.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-[8px] bg-[#10251F] px-2.5 py-1 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
                            >
                              <VideoIcon size={12} className="text-[#C7F34A]" />
                              <span>Join</span>
                            </a>
                          )}

                          {ev.participants.length > 0 && (
                            <div className="flex items-center -space-x-1.5">
                              {ev.participants.slice(0, 4).map((p, pIdx) => (
                                <div
                                  key={`d-part-${p.id || p.user_id || pIdx}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-[#F4F3EE] ring-2 ring-white"
                                  title={p.full_name || p.email}
                                >
                                  {(p.full_name || p.email || "U")[0]?.toUpperCase() || "U"}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ================================================== */}
        {/* RIGHT-SIDE SCHEDULE PANEL (Desktop & Tablet) */}
        {/* ================================================== */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-5">
          {/* Mini Interactive Month Calendar */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D8DDD4]">
              <span className="text-xs font-bold text-[#18221E]">
                {MONTH_NAMES[month]} {year}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                >
                  <ChevronLeftIcon size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                >
                  <ChevronRightIcon size={13} />
                </button>
              </div>
            </div>

            {/* Mini Grid */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#65706A] mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d}>{d[0]}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] gap-y-1">
              {monthGridDays.map((cell, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCurrentDate(cell.date);
                    if (viewMode !== "month") setViewMode("day");
                  }}
                  className={cn(
                    "flex h-6 w-6 mx-auto items-center justify-center rounded-full font-medium transition-colors",
                    cell.isToday
                      ? "bg-[#10251F] text-[#F4F3EE] font-bold"
                      : cell.dateString === formatDateString(currentDate)
                      ? "bg-[#E7EADF] text-[#18221E] font-bold"
                      : cell.isCurrentMonth
                      ? "text-[#18221E] hover:bg-[#FAF9F5]"
                      : "text-[#65706A]/40"
                  )}
                >
                  {cell.dayNumber}
                </button>
              ))}
            </div>
          </div>

          {/* UPCOMING SCHEDULE SECTION */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#D8DDD4]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#18221E]">Upcoming</span>
                <span className="rounded-full bg-[#E7EADF] px-2 py-0.5 text-[10px] font-bold text-[#10251F]">
                  {upcomingGrouped.reduce((acc, g) => acc + g.events.length, 0)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E]"
              >
                View all →
              </button>
            </div>

            {upcomingGrouped.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#65706A]">
                No upcoming events scheduled.
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingGrouped.map((group, idx) => (
                  <div key={`grp-${group.date}-${idx}`} className="space-y-2">
                    {/* Date Header */}
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                      {group.label}
                    </div>

                    {/* Group Items */}
                    <div className="space-y-2">
                      {group.events.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={cn(
                            "group rounded-[10px] p-2.5 border transition-all hover:shadow-xs cursor-pointer",
                            getEventStyle(ev.event_type)
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              {/* Time */}
                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#65706A]">
                                <ClockIcon size={11} />
                                <span>{ev.start_time || "All Day"}</span>
                              </div>

                              {/* Title */}
                              <h5
                                className={cn(
                                  "text-xs font-bold text-[#18221E] leading-snug",
                                  ev.status === "completed" && "line-through opacity-60"
                                )}
                              >
                                {ev.title}
                              </h5>

                              {/* Type & project/department badge */}
                              <p className="text-[10px] text-[#65706A]">
                                <span className="capitalize font-medium">{ev.event_type}</span>
                                {(ev.project_name || ev.department_name) && (
                                  <> · <span>{ev.project_name || ev.department_name}</span></>
                                )}
                              </p>
                            </div>

                            {/* Participant avatars */}
                            {ev.participants.length > 0 && (
                              <div className="flex items-center -space-x-1 shrink-0 mt-1">
                                {ev.participants.slice(0, 3).map((p, pIdx) => (
                                  <div
                                    key={`up-part-${p.id || p.user_id || pIdx}`}
                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-[#F4F3EE] ring-1 ring-white"
                                    title={p.full_name || p.email}
                                  >
                                    {(p.full_name || p.email || "U")[0]?.toUpperCase() || "U"}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* "My Calendars" Category Toggles */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D8DDD4]">
              <span className="text-xs font-bold text-[#18221E]">My Calendars</span>
              <span className="text-[10px] font-semibold text-[#65706A]">Manage</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { key: "mySchedule", label: "My Schedule", color: "bg-[#246244]" },
                { key: "projects", label: "Projects & Deliverables", color: "bg-[#1E40AF]" },
                { key: "meetings", label: "Meetings", color: "bg-[#7E22CE]" },
                { key: "events", label: "Company Events", color: "bg-[#B58500]" },
                { key: "leave", label: "Leave & Out of Office", color: "bg-[#65706A]" },
              ].map((item) => {
                const isChecked = (categoryToggles as any)[item.key];
                return (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-1 rounded-[6px] hover:bg-[#FAF9F5] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-sm", item.color)} />
                      <span className="font-medium text-[#18221E]">{item.label}</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setCategoryToggles((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="h-3.5 w-3.5 rounded border-[#D8DDD4] text-[#10251F] focus:ring-[#10251F]"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* MODALS */}
      {/* ================================================== */}

      {/* 1. CREATE EVENT MODAL */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workspaceId={workspaceId}
        people={people}
        projects={projects}
        departments={departments}
        initialDate={createModalInitialDate}
        onSuccess={handleEventCreated}
      />

      {/* 2. EVENT DETAILS MODAL / DRAWER */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            setEditingEvent(selectedEvent);
            setSelectedEvent(null);
          }}
          onDelete={() => {
            setDeleteConfirmEvent(selectedEvent);
            setSelectedEvent(null);
          }}
          onToggleTask={handleToggleTaskStatus}
          workspaceId={workspaceId}
        />
      )}

      {/* 3. EDIT EVENT MODAL */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          workspaceId={workspaceId}
          people={people}
          projects={projects}
          departments={departments}
          onSuccess={handleEventUpdated}
        />
      )}

      {/* 4. EXPANDED DAY VIEW POPOVER / MODAL */}
      {dayExpandedDate && (
        <DayExpandedModal
          dateString={dayExpandedDate}
          events={filteredEvents.filter((e) => e.start_date === dayExpandedDate)}
          onClose={() => setDayExpandedDate(null)}
          onSelectEvent={(ev) => {
            setSelectedEvent(ev);
            setDayExpandedDate(null);
          }}
          onAddEvent={() => {
            handleOpenCreateModal(dayExpandedDate);
            setDayExpandedDate(null);
          }}
        />
      )}

      {/* 5. DELETE CONFIRMATION DIALOG */}
      {deleteConfirmEvent && (
        <DeleteConfirmDialog
          event={deleteConfirmEvent}
          onClose={() => setDeleteConfirmEvent(null)}
          onConfirm={async () => {
            await deleteCalendarEventAction(deleteConfirmEvent.id, workspaceId);
            handleEventDeleted(deleteConfirmEvent.id);
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// HELPER FUNCTIONS & STYLING TOKENS
// =========================================================================

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getEventStyle(type: CalendarEventType): string {
  switch (type) {
    case "task":
      return "bg-[#EAF4E2] text-[#246244] border-[#D1E6C5]";
    case "meeting":
      return "bg-[#EBF2FA] text-[#1E40AF] border-[#D0E1F9]";
    case "deadline":
      return "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]";
    case "event":
      return "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]";
    case "leave":
      return "bg-[#FAF9F5] text-[#4B5563] border-[#D8DDD4]";
    default:
      return "bg-[#FAF9F5] text-[#18221E] border-[#D8DDD4]";
  }
}

function getEventDotColor(type: CalendarEventType): string {
  switch (type) {
    case "task":
      return "bg-[#246244]";
    case "meeting":
      return "bg-[#1E40AF]";
    case "deadline":
      return "bg-[#DC2626]";
    case "event":
      return "bg-[#7E22CE]";
    case "leave":
      return "bg-[#65706A]";
    default:
      return "bg-[#10251F]";
  }
}

function getBadgeStyle(type: CalendarEventType): string {
  switch (type) {
    case "task":
      return "bg-[#D1E6C5] text-[#246244]";
    case "meeting":
      return "bg-[#D0E1F9] text-[#1E40AF]";
    case "deadline":
      return "bg-[#FECACA] text-[#991B1B]";
    case "event":
      return "bg-[#E9D5FF] text-[#6B21A8]";
    case "leave":
      return "bg-[#E7EADF] text-[#4B5563]";
    default:
      return "bg-[#FAF9F5] text-[#18221E]";
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// =========================================================================
// CREATE EVENT MODAL
// =========================================================================

function CreateEventModal({
  isOpen,
  onClose,
  workspaceId,
  people,
  projects,
  departments,
  initialDate,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
  initialDate: string;
  onSuccess: (newEvent: CalendarEvent) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [eventType, setEventType] = React.useState<CalendarEventType>("meeting");
  const [startDate, setStartDate] = React.useState(initialDate);
  const [endDate, setEndDate] = React.useState(initialDate);
  const [isAllDay, setIsAllDay] = React.useState(false);
  const [startTime, setStartTime] = React.useState("10:00 AM");
  const [endTime, setEndTime] = React.useState("11:00 AM");
  const [departmentId, setDepartmentId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = React.useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [meetingLink, setMeetingLink] = React.useState("");
  const [attachments, setAttachments] = React.useState<CalendarAttachment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const departmentSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "None" },
      ...(departments || []).map((d) => ({
        value: d.id,
        label: d.name,
        dotColor: d.color,
      })),
    ];
  }, [departments]);

  const projectSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "None" },
      ...(projects || []).map((p) => ({
        value: p.id,
        label: p.name,
        dotColor: p.color,
      })),
    ];
  }, [projects]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setStartDate(initialDate);
    setEndDate(initialDate);
  }, [initialDate]);

  // Handle ESC close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAtts: CalendarAttachment[] = Array.from(files).map((f, i) => ({
      id: `att-new-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      type: f.type || "document",
      url: URL.createObjectURL(f),
    }));

    setAttachments((prev) => [...prev, ...newAtts]);
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide an event title");
      return;
    }
    if (!startDate) {
      setError("Please select a date");
      return;
    }

    setLoading(true);
    setError("");

    const selectedDept = departments.find((d) => d.id === departmentId);
    const selectedProj = projects.find((p) => p.id === projectId);
    const selectedParts = people.filter((p) =>
      selectedParticipantIds.includes(p.user_id) || selectedParticipantIds.includes(p.id)
    );

    const syntheticEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      workspace_id: workspaceId,
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate || startDate,
      is_all_day: isAllDay,
      start_time: isAllDay ? null : startTime,
      end_time: isAllDay ? null : endTime,
      department_id: departmentId || null,
      department_name: selectedDept?.name || null,
      department_color: selectedDept?.color || null,
      department: selectedDept ? { id: selectedDept.id, name: selectedDept.name, color: selectedDept.color, icon: selectedDept.icon } : null,
      project_id: projectId || null,
      project_name: selectedProj?.name || null,
      project_color: selectedProj?.color || null,
      project: selectedProj ? { id: selectedProj.id, name: selectedProj.name, color: selectedProj.color, icon: selectedProj.icon } : null,
      location: location.trim() || null,
      meeting_link: meetingLink.trim() || null,
      status: "scheduled",
      created_by: "u-tashin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      participants: selectedParts,
      attachments,
      comments: [],
    };

    try {
      await createCalendarEventAction({
        workspaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        startDate,
        endDate,
        isAllDay,
        startTime,
        endTime,
        departmentId: departmentId || undefined,
        projectId: projectId || undefined,
        participantIds: selectedParticipantIds,
        location: location.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
        attachments: attachments.map((a) => ({
          name: a.name,
          size: a.size,
          type: a.type,
          url: a.url,
        })),
      });

      onSuccess(syntheticEvent);
    } catch (err: any) {
      console.error(err);
      onSuccess(syntheticEvent);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-xl rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 my-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#D8DDD4]">
              <div>
                <h3 className="text-lg font-bold text-[#18221E]">Create Event</h3>
                <p className="text-xs text-[#65706A]">
                  Add a meeting, task deliverable, deadline, or team event.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] focus:outline-none"
              >
                <XIcon size={16} />
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-[8px] bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-[#18221E] mb-1">
                  Event title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Development Meeting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] placeholder:text-[#65706A] focus:border-[#10251F] focus:bg-white focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Event Type & All-day Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-[#18221E] mb-1">
                    Event type *
                  </label>
                  <CustomSelect
                    value={eventType}
                    onChange={(val) => setEventType(val as CalendarEventType)}
                    options={EVENT_TYPE_OPTIONS}
                    className="w-full"
                    buttonClassName="w-full h-9 rounded-[8px] bg-[#FAF9F5]"
                  />
                </div>

                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="all-day-toggle"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D8DDD4] text-[#10251F] focus:ring-[#10251F]"
                  />
                  <label htmlFor="all-day-toggle" className="text-xs font-medium text-[#18221E] cursor-pointer">
                    All-day event
                  </label>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18221E] mb-1">
                    Date *
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => {
                      setStartDate(val);
                      setEndDate(val);
                    }}
                    placeholder="Select date"
                  />
                </div>

                {!isAllDay && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#18221E] mb-1">
                        Start time
                      </label>
                      <input
                        type="text"
                        placeholder="10:00 AM"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#18221E] mb-1">
                        End time
                      </label>
                      <input
                        type="text"
                        placeholder="11:00 AM"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Department & Project Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18221E] mb-1">
                    Department (Optional)
                  </label>
                  <CustomSelect
                    value={departmentId}
                    onChange={setDepartmentId}
                    options={departmentSelectOptions}
                    placeholder="None"
                    className="w-full"
                    buttonClassName="w-full h-9 rounded-[8px] bg-[#FAF9F5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18221E] mb-1">
                    Project (Optional)
                  </label>
                  <CustomSelect
                    value={projectId}
                    onChange={setProjectId}
                    options={projectSelectOptions}
                    placeholder="None"
                    className="w-full"
                    buttonClassName="w-full h-9 rounded-[8px] bg-[#FAF9F5]"
                  />
                </div>
              </div>

              {/* Participants Picker */}
              <div>
                <label className="block text-xs font-semibold text-[#18221E] mb-1">
                  Participants / Assignees
                </label>
                <div className="space-y-2">
                  {/* Selected Tags */}
                  {selectedParticipantIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedParticipantIds.map((pid) => {
                        const person = people.find((p) => p.user_id === pid || p.id === pid);
                        if (!person) return null;
                        return (
                          <span
                            key={pid}
                            className="inline-flex items-center gap-1 rounded-full bg-[#E7EADF] pl-2 pr-1 py-0.5 text-xs text-[#10251F] font-semibold"
                          >
                            <span>{person.full_name || person.email}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedParticipantIds((prev) => prev.filter((id) => id !== pid))
                              }
                              className="rounded-full p-0.5 hover:bg-[#D8DDD4]"
                            >
                              <XIcon size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Dropdown list of teammates */}
                  <div className="max-h-28 overflow-y-auto rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-1.5 space-y-1">
                    {people.map((p) => {
                      const uid = p.user_id || p.id;
                      const isSelected = selectedParticipantIds.includes(uid);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedParticipantIds((prev) => prev.filter((id) => id !== uid));
                            } else {
                              setSelectedParticipantIds((prev) => [...prev, uid]);
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-1.5 rounded-[6px] text-xs cursor-pointer transition-colors",
                            isSelected ? "bg-white shadow-2xs font-semibold text-[#10251F]" : "hover:bg-white text-[#65706A]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-[#F4F3EE]">
                              {(p.full_name || p.email || "U")[0]?.toUpperCase() || "U"}
                            </div>
                            <span>{p.full_name || p.email}</span>
                          </div>
                          {isSelected && <CheckIcon size={13} className="text-[#246244]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Location & Meeting Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18221E] mb-1">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Conference Room A"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18221E] mb-1">
                    Meeting link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xyz"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#18221E] mb-1">
                  Description / Agenda
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional event details, agenda, notes, or sprint objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none resize-none"
                />
              </div>

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#18221E]">
                    Attachments
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-[#246244] hover:underline"
                  >
                    + Upload File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileIcon size={14} className="text-[#65706A]" />
                          <span className="font-medium text-[#18221E] truncate">{att.name}</span>
                          <span className="text-[10px] text-[#65706A]">({formatFileSize(att.size)})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-[#65706A] hover:text-red-600"
                        >
                          <XIcon size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DDD4]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50 transition-colors shadow-xs"
                >
                  <span>{loading ? "Creating..." : "Create Event"}</span>
                  <span className="text-[#C7F34A]">→</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// =========================================================================
// EVENT DETAILS MODAL
// =========================================================================

function EventDetailsModal({
  event,
  onClose,
  onEdit,
  onDelete,
  onToggleTask,
  workspaceId,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleTask: (event: CalendarEvent) => void;
  workspaceId: string;
}) {
  const [commentText, setCommentText] = React.useState("");
  const [comments, setComments] = React.useState(event.comments || []);
  const [submittingComment, setSubmittingComment] = React.useState(false);

  // Handle ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    const newComment = {
      id: `cm-${Date.now()}`,
      author_name: "Tashin Khan",
      content: commentText.trim(),
      created_at: new Date().toISOString(),
    };

    setComments((prev) => [...prev, newComment]);
    setCommentText("");

    try {
      await addCalendarEventCommentAction(event.id, commentText.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-xl rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 my-8 space-y-5"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                getBadgeStyle(event.event_type)
              )}
            >
              {event.event_type}
            </span>

            {event.status === "completed" && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Completed
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-[6px] p-1.5 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
              title="Edit event"
            >
              <EditIcon size={15} />
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="rounded-[6px] p-1.5 text-[#65706A] hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete event"
            >
              <TrashIcon size={15} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] p-1.5 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors ml-1"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Title & Metadata */}
        <div className="space-y-3">
          <h2
            className={cn(
              "text-xl font-bold text-[#18221E]",
              event.status === "completed" && "line-through opacity-70"
            )}
          >
            {event.title}
          </h2>

          {/* Date / Time */}
          <div className="flex items-center gap-2 text-xs font-medium text-[#65706A]">
            <ClockIcon size={14} className="text-[#10251F]" />
            <span>
              {event.start_date}
              {event.start_time && ` · ${event.start_time}`}
              {event.end_time && ` – ${event.end_time}`}
              {event.is_all_day && " (All Day)"}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-xs font-medium text-[#65706A]">
              <MapPinIcon size={14} className="text-[#10251F]" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Meeting Link */}
          {event.meeting_link && (
            <div className="flex items-center gap-3 pt-1">
              <a
                href={event.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] shadow-xs"
              >
                <VideoIcon size={14} className="text-[#C7F34A]" />
                <span>Join Meeting</span>
                <ExternalLinkIcon size={12} className="opacity-75" />
              </a>
              <span className="text-xs text-[#65706A] truncate max-w-xs">{event.meeting_link}</span>
            </div>
          )}
        </div>

        {/* Project & Department Tags */}
        {(event.project_name || event.department_name) && (
          <div className="flex items-center gap-2 pt-2 pb-2 border-y border-[#D8DDD4]">
            {event.department_name && (
              <div className="flex items-center gap-1.5 rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4] px-2.5 py-1 text-xs font-semibold text-[#18221E]">
                <span className="text-[#65706A]">Department:</span>
                <span>{event.department_name}</span>
              </div>
            )}

            {event.project_name && (
              <div className="flex items-center gap-1.5 rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4] px-2.5 py-1 text-xs font-semibold text-[#18221E]">
                <span className="text-[#65706A]">Project:</span>
                <span>{event.project_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#65706A] uppercase tracking-wider text-[10px]">
              Description / Notes
            </span>
            <p className="text-xs text-[#18221E] leading-relaxed whitespace-pre-wrap bg-[#FAF9F5] p-3 rounded-[8px] border border-[#D8DDD4]">
              {event.description}
            </p>
          </div>
        )}

        {/* Participants */}
        {event.participants.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#65706A] uppercase tracking-wider text-[10px]">
              Participants ({event.participants.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {event.participants.map((p, pIdx) => (
                <div
                  key={`detail-part-${p.id || p.user_id || pIdx}`}
                  className="flex items-center gap-2 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10251F] text-xs font-bold text-[#F4F3EE]">
                    {(p.full_name || p.email || "U")[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-[#18221E] truncate">
                      {p.full_name || p.email}
                    </p>
                    <p className="text-[10px] text-[#65706A] truncate">
                      {p.job_title || p.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {event.attachments && event.attachments.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#65706A] uppercase tracking-wider text-[10px]">
              Attachments ({event.attachments.length})
            </span>
            <div className="space-y-1.5">
              {event.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileIcon size={14} className="text-[#10251F]" />
                    <span className="font-semibold text-[#18221E] truncate">{att.name}</span>
                    <span className="text-[10px] text-[#65706A]">({formatFileSize(att.size)})</span>
                  </div>
                  <a
                    href={att.url}
                    download={att.name}
                    className="text-xs font-semibold text-[#246244] hover:underline"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments / Activity */}
        <div className="space-y-2 pt-2 border-t border-[#D8DDD4]">
          <span className="text-xs font-semibold text-[#65706A] uppercase tracking-wider text-[10px]">
            Activity & Notes
          </span>

          {comments.length > 0 && (
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] p-2 text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#65706A]">
                    <span className="font-bold text-[#18221E]">{c.author_name}</span>
                    <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-[#18221E]">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add comment box */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a quick note or update..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="rounded-[8px] bg-[#10251F] px-3 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D8DDD4]">
          {(event.event_type === "task" || event.task_id) && (
            <button
              type="button"
              onClick={() => onToggleTask(event)}
              className={cn(
                "rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-colors",
                event.status === "completed"
                  ? "bg-[#FAF9F5] text-[#18221E] border border-[#D8DDD4] hover:bg-[#E7EADF]"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              {event.status === "completed" ? "Mark Incomplete" : "✓ Mark Complete"}
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] bg-[#10251F] px-4 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// EDIT EVENT MODAL
// =========================================================================

function EditEventModal({
  event,
  onClose,
  workspaceId,
  people,
  projects,
  departments,
  onSuccess,
}: {
  event: CalendarEvent;
  onClose: () => void;
  workspaceId: string;
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
  onSuccess: (updatedEvent: CalendarEvent) => void;
}) {
  const [title, setTitle] = React.useState(event.title);
  const [description, setDescription] = React.useState(event.description || "");
  const [eventType, setEventType] = React.useState<CalendarEventType>(event.event_type);
  const [startDate, setStartDate] = React.useState(event.start_date);
  const [endDate, setEndDate] = React.useState(event.end_date || event.start_date);
  const [isAllDay, setIsAllDay] = React.useState(event.is_all_day);
  const [startTime, setStartTime] = React.useState(event.start_time || "10:00 AM");
  const [endTime, setEndTime] = React.useState(event.end_time || "11:00 AM");
  const [departmentId, setDepartmentId] = React.useState(event.department_id || "");
  const [projectId, setProjectId] = React.useState(event.project_id || "");
  const [selectedParticipantIds, setSelectedParticipantIds] = React.useState<string[]>(
    event.participants.map((p) => p.user_id || p.id)
  );
  const [location, setLocation] = React.useState(event.location || "");
  const [meetingLink, setMeetingLink] = React.useState(event.meeting_link || "");
  const [loading, setLoading] = React.useState(false);

  const departmentSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "None" },
      ...(departments || []).map((d) => ({
        value: d.id,
        label: d.name,
        dotColor: d.color,
      })),
    ];
  }, [departments]);

  const projectSelectOptions = React.useMemo(() => {
    return [
      { value: "", label: "None" },
      ...(projects || []).map((p) => ({
        value: p.id,
        label: p.name,
        dotColor: p.color,
      })),
    ];
  }, [projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);

    const selectedDept = departments.find((d) => d.id === departmentId);
    const selectedProj = projects.find((p) => p.id === projectId);
    const selectedParts = people.filter((p) =>
      selectedParticipantIds.includes(p.user_id) || selectedParticipantIds.includes(p.id)
    );

    const updated: CalendarEvent = {
      ...event,
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate || startDate,
      is_all_day: isAllDay,
      start_time: isAllDay ? null : startTime,
      end_time: isAllDay ? null : endTime,
      department_id: departmentId || null,
      department_name: selectedDept?.name || null,
      department_color: selectedDept?.color || null,
      department: selectedDept ? { id: selectedDept.id, name: selectedDept.name, color: selectedDept.color, icon: selectedDept.icon } : null,
      project_id: projectId || null,
      project_name: selectedProj?.name || null,
      project_color: selectedProj?.color || null,
      project: selectedProj ? { id: selectedProj.id, name: selectedProj.name, color: selectedProj.color, icon: selectedProj.icon } : null,
      location: location.trim() || null,
      meeting_link: meetingLink.trim() || null,
      participants: selectedParts,
      updated_at: new Date().toISOString(),
    };

    try {
      await updateCalendarEventAction({
        eventId: event.id,
        workspaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        startDate,
        endDate,
        isAllDay,
        startTime,
        endTime,
        departmentId: departmentId || undefined,
        projectId: projectId || undefined,
        participantIds: selectedParticipantIds,
        location: location.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
      });

      onSuccess(updated);
    } catch (err) {
      console.error(err);
      onSuccess(updated);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-xl rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#D8DDD4]">
          <h3 className="text-lg font-bold text-[#18221E]">Edit Event</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-[#65706A] hover:bg-[#FAF9F5]">
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">
              Event title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">
                Event type
              </label>
              <CustomSelect
                value={eventType}
                onChange={(val) => setEventType(val as CalendarEventType)}
                options={EVENT_TYPE_OPTIONS}
                className="w-full"
                buttonClassName="w-full h-9 rounded-[8px] bg-[#FAF9F5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">
                Date *
              </label>
              <DatePicker
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setEndDate(val);
                }}
                placeholder="Select date"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">
                Start time
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">
                End time
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">
                Meeting link
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DDD4]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// =========================================================================
// EXPANDED DAY POPOVER / MODAL
// =========================================================================

function DayExpandedModal({
  dateString,
  events,
  onClose,
  onSelectEvent,
  onAddEvent,
}: {
  dateString: string;
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddEvent: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xl z-10 space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#D8DDD4]">
          <div>
            <h4 className="text-sm font-bold text-[#18221E]">
              Events on {dateString}
            </h4>
            <p className="text-[11px] text-[#65706A]">
              {events.length} scheduled item{events.length === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5]">
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {events.map((ev) => (
            <div
              key={ev.id}
              onClick={() => onSelectEvent(ev)}
              className={cn(
                "rounded-[8px] p-2.5 border transition-all hover:shadow-xs cursor-pointer text-xs space-y-1",
                getEventStyle(ev.event_type)
              )}
            >
              <div className="flex items-center justify-between text-[10px] font-semibold opacity-75">
                <span className="uppercase">{ev.event_type}</span>
                <span>{ev.start_time || "All day"}</span>
              </div>
              <p className="font-bold text-[#18221E]">{ev.title}</p>
              {ev.project_name && (
                <p className="text-[10px] text-[#65706A]">{ev.project_name}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onAddEvent}
            className="text-xs font-semibold text-[#246244] hover:underline"
          >
            + Add item for this day
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// DELETE CONFIRM DIALOG
// =========================================================================

function DeleteConfirmDialog({
  event,
  onClose,
  onConfirm,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xl z-10 space-y-3"
      >
        <h4 className="text-sm font-bold text-[#18221E]">Delete Event</h4>
        <p className="text-xs text-[#65706A] leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-[#18221E]">"{event.title}"</span>? This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-[8px] bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

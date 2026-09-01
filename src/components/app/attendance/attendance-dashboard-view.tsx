"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Clock3,
  CalendarDays,
  Calendar,
  Users,
  UserCheck,
  UserX,
  Timer,
  LogIn,
  LogOut,
  Search,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  ExternalLink,
  Shield,
  Building2,
  CalendarRange,
} from "lucide-react";
import {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceState,
  AttendanceStats,
  AttendanceStatus,
  MonthlyAttendanceSummary,
} from "@/types/attendance";
import { Department } from "@/types/department";
import { WorkspacePerson } from "@/types/people";
import { LeaveRequest } from "@/types/leave";
import {
  checkInAction,
  checkOutAction,
  updateAttendanceSettingsAction,
} from "@/lib/attendance/actions";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
import { RopimoSelect } from "@/components/ropimo/ropimo-select";
import { cn } from "@/lib/utils";

export interface AttendanceDashboardViewProps {
  workspaceId: string;
  userRole: string;
  currentUserId: string;
  todayState: {
    record: AttendanceRecord | null;
    state: AttendanceState;
    workedMinutes: number;
    approvedLeave: LeaveRequest | null;
  };
  monthlySummary: MonthlyAttendanceSummary;
  employeeHistory: AttendanceRecord[];
  allRecords: AttendanceRecord[];
  stats: AttendanceStats;
  departments: Department[];
  settings: AttendanceSettings;
}

export function AttendanceDashboardView({
  workspaceId,
  userRole,
  currentUserId,
  todayState,
  monthlySummary,
  employeeHistory = [],
  allRecords = [],
  stats,
  departments = [],
  settings,
}: AttendanceDashboardViewProps) {
  const router = useRouter();
  const canManage = ["owner", "admin", "manager"].includes(userRole);

  // Tabs
  const [activeTab, setActiveTab] = React.useState<"team" | "personal">(
    canManage ? "team" : "personal"
  );

  // Date Navigation State
  const [selectedDate, setSelectedDate] = React.useState(() => {
    return new Date();
  });

  // Action States
  const [loadingAction, setLoadingAction] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Live Working Hours Timer for Checked-In User
  const [liveSeconds, setLiveSeconds] = React.useState(() => {
    if (todayState.state === "Checked In" && todayState.record?.check_in_at) {
      const startMs = new Date(todayState.record.check_in_at).getTime();
      return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }
    return (todayState.workedMinutes || 0) * 60;
  });

  React.useEffect(() => {
    if (todayState.state !== "Checked In" || !todayState.record?.check_in_at) return;

    const startMs = new Date(todayState.record.check_in_at).getTime();
    const interval = setInterval(() => {
      setLiveSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [todayState.state, todayState.record?.check_in_at]);

  // Filters for HR table
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDeptId, setSelectedDeptId] = React.useState("all");
  const [selectedStatus, setSelectedStatus] = React.useState("all");

  // Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
  const [workStartTime, setWorkStartTime] = React.useState(settings.work_start_time || "09:00");
  const [workEndTime, setWorkEndTime] = React.useState(settings.work_end_time || "17:00");
  const [gracePeriod, setGracePeriod] = React.useState(settings.grace_period_minutes || 15);
  const [savingSettings, setSavingSettings] = React.useState(false);

  // Check In handler
  const handleCheckIn = async () => {
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await checkInAction({ workspaceId });
      if (!res.success) {
        setActionError(res.error || "Check-in failed.");
      } else {
        router.refresh();
      }
    } catch {
      setActionError("An unexpected error occurred during check-in.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Check Out handler
  const handleCheckOut = async () => {
    setLoadingAction(true);
    setActionError(null);
    try {
      const res = await checkOutAction({ workspaceId });
      if (!res.success) {
        setActionError(res.error || "Check-out failed.");
      } else {
        router.refresh();
      }
    } catch {
      setActionError("An unexpected error occurred during check-out.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Work Policy Save handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateAttendanceSettingsAction({
        workspaceId,
        workStartTime,
        workEndTime,
        gracePeriodMinutes: Number(gracePeriod),
        halfDayThresholdMinutes: 240,
        workDays: [1, 2, 3, 4, 5],
      });
      setSettingsModalOpen(false);
      router.refresh();
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered Records
  const filteredRecords = React.useMemo(() => {
    return allRecords.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.person?.full_name && r.person.full_name.toLowerCase().includes(q)) ||
        (r.person?.email && r.person.email.toLowerCase().includes(q)) ||
        (r.person?.job_title && r.person.job_title.toLowerCase().includes(q)) ||
        (r.department_name && r.department_name.toLowerCase().includes(q));

      const matchesDept =
        selectedDeptId === "all" ||
        r.person?.departments.some((d) => d.id === selectedDeptId || d.name === selectedDeptId);

      const matchesStatus =
        selectedStatus === "all" || r.status === selectedStatus;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [allRecords, searchQuery, selectedDeptId, selectedStatus]);

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ["Employee", "Email", "Department", "Date", "Status", "Check In", "Check Out", "Hours"];
    const rows = filteredRecords.map((r) => [
      r.person?.full_name || "Unknown",
      r.person?.email || "",
      r.department_name || "General",
      r.date,
      r.status,
      r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString() : "—",
      r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString() : "—",
      `${((r.total_minutes || 0) / 60).toFixed(1)}h`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return isoString;
    }
  };

  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
  };

  const formatDurationShort = (minutes?: number) => {
    if (!minutes || minutes <= 0) return "—";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${String(mins).padStart(2, "0")}m`;
  };

  const getStatusBadge = (status: AttendanceStatus | string) => {
    const s = status.toLowerCase();
    if (s === "present") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#EAF4E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#246244]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#246244]" />
          Present
        </span>
      );
    }
    if (s === "late") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F8E3B6] bg-[#FEF6E4] px-2.5 py-0.5 text-[11px] font-semibold text-[#B58500]">
          <Clock3 className="h-3 w-3" />
          Late
        </span>
      );
    }
    if (s === "on leave" || s === "on_leave") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
          <Calendar className="h-3 w-3" />
          On Leave
        </span>
      );
    }
    if (s === "absent") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
          Absent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#65706A]">
        Not checked in
      </span>
    );
  };

  // Date Navigation Helpers
  const isToday =
    selectedDate.toDateString() === new Date().toDateString();

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const formattedSelectedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate expected hours (default 8h = 28800s)
  const expectedSeconds = 8 * 3600;
  const remainingSeconds = Math.max(0, expectedSeconds - liveSeconds);
  const isOvertime = liveSeconds > expectedSeconds;

  return (
    <div className="mx-auto max-w-[1380px] space-y-6 pb-24 text-[#18221E] select-none">
      {/* 1. COMPACT PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#18221E]">
            Attendance
          </h1>
          <p className="text-xs sm:text-sm text-[#65706A] mt-0.5">
            Track team attendance, working hours, and daily presence.
          </p>
        </div>

        {/* Header Right: Date Selector + Work Policy Settings */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Selector */}
          <div className="flex items-center rounded-[10px] border border-[#D8DDD4] bg-white p-0.5 shadow-2xs h-9">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 rounded-[6px] text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleTodayClick}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer",
                isToday
                  ? "bg-[#10251F] text-[#F4F3EE] font-bold"
                  : "text-[#18221E] hover:bg-[#FAF9F5]"
              )}
            >
              {isToday ? "Today" : formattedSelectedDate}
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              disabled={isToday}
              className="p-1.5 rounded-[6px] text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Work Policy Settings Button */}
          {canManage && (
            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-semibold text-[#18221E] shadow-2xs hover:border-[#10251F] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5 text-[#65706A]" />
              <span>Work Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TODAY SUMMARY: COMPACT HORIZONTAL KPI BAR */}
      <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E7EADF]">
          {/* Present KPI */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF4E2] text-[#246244] border border-[#D8DDD4]">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                PRESENT
              </span>
              <p className="text-2xl font-bold text-[#18221E] mt-0.5">
                {stats.presentToday}
              </p>
              <p className="text-[11px] text-[#65706A]">
                of {stats.totalMembers || stats.presentToday + stats.lateToday + stats.absentToday + stats.onLeaveToday} employees
              </p>
            </div>
          </div>

          {/* Late KPI */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FEF6E4] text-[#B58500] border border-[#F8E3B6]">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                LATE
              </span>
              <p className="text-2xl font-bold text-[#18221E] mt-0.5">
                {stats.lateToday}
              </p>
              <p className="text-[11px] text-[#65706A]">
                after {settings.work_start_time || "09:00"} + {settings.grace_period_minutes || 15}m
              </p>
            </div>
          </div>

          {/* On Leave KPI */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-purple-50 text-purple-700 border border-purple-200">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                ON LEAVE
              </span>
              <p className="text-2xl font-bold text-[#18221E] mt-0.5">
                {stats.onLeaveToday}
              </p>
              <p className="text-[11px] text-[#65706A]">
                approved leave
              </p>
            </div>
          </div>

          {/* Absent KPI */}
          <div className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-rose-50 text-rose-700 border border-rose-200">
              <UserX className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                ABSENT
              </span>
              <p className="text-2xl font-bold text-[#18221E] mt-0.5">
                {stats.absentToday}
              </p>
              <p className="text-[11px] text-[#65706A]">
                not checked in
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LOGGED-IN EMPLOYEE "MY ATTENDANCE" PUNCH CARD */}
      <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7EADF] pb-3.5">
          <div className="flex items-center gap-2.5">
            <Timer className="h-4 w-4 text-[#246244]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#18221E]">
              My Attendance · Today
            </h2>
            <div className="ml-1">
              {todayState.state === "Checked In" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#EAF4E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#246244]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#246244] animate-pulse" />
                  Checked In
                </span>
              ) : todayState.state === "Checked Out" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  <Check className="h-3 w-3" />
                  Checked Out
                </span>
              ) : todayState.state === "On Leave" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                  <Calendar className="h-3 w-3" />
                  On Leave ({todayState.approvedLeave?.leave_type || "Approved"})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#65706A]">
                  Not Checked In
                </span>
              )}
            </div>
          </div>

          {/* Primary Punch Action Button */}
          <div>
            {todayState.state === "Not Checked In" && (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={loadingAction}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#10251F] px-4 text-xs font-semibold text-[#F4F3EE] shadow-xs hover:bg-[#18342C] transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 text-[#C7F34A]" />
                <span>{loadingAction ? "Checking In..." : "Check In"}</span>
              </button>
            )}

            {todayState.state === "Checked In" && (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={loadingAction}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-rose-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{loadingAction ? "Checking Out..." : "Check Out"}</span>
              </button>
            )}

            {todayState.state === "Checked Out" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#246244]">
                <CheckCircle2 className="h-4 w-4" />
                Shift completed for today
              </span>
            )}
          </div>
        </div>

        {/* Punch Card Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F] block">
              Checked In
            </span>
            <p className="text-sm font-bold text-[#18221E] mt-0.5">
              {formatTime(todayState.record?.check_in_at)}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F] block">
              Working Time
            </span>
            <p className="text-sm font-bold font-mono text-[#246244] mt-0.5">
              {todayState.state === "Checked In"
                ? formatDuration(liveSeconds)
                : formatDurationShort(todayState.workedMinutes)}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F] block">
              Expected Shift
            </span>
            <p className="text-sm font-bold text-[#18221E] mt-0.5">
              {settings.work_start_time}–{settings.work_end_time} (08h 00m)
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F] block">
              {isOvertime ? "Overtime" : "Remaining"}
            </span>
            <p className="text-sm font-bold font-mono text-[#18221E] mt-0.5">
              {isOvertime
                ? `+${formatDurationShort(Math.floor((liveSeconds - expectedSeconds) / 60))}`
                : formatDurationShort(Math.floor(remainingSeconds / 60))}
            </p>
          </div>
        </div>

        {actionError && (
          <div className="rounded-[8px] bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 4. MAIN ATTENDANCE SECTIONS / TABS */}
      {canManage && (
        <div className="flex items-center gap-1.5 rounded-[12px] border border-[#D8DDD4] bg-white p-1.5 shadow-2xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={cn(
              "flex items-center gap-2 rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "team"
                ? "bg-[#10251F] text-[#F4F3EE] shadow-2xs font-bold"
                : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
            )}
          >
            <Users className={cn("h-3.5 w-3.5", activeTab === "team" ? "text-[#C7F34A]" : "text-[#65706A]")} />
            <span>Team Overview</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors",
                activeTab === "team"
                  ? "bg-white/20 text-[#F4F3EE]"
                  : "bg-[#FAF9F5] border border-[#D8DDD4] text-[#65706A]"
              )}
            >
              {allRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={cn(
              "flex items-center gap-2 rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "personal"
                ? "bg-[#10251F] text-[#F4F3EE] shadow-2xs font-bold"
                : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
            )}
          >
            <CalendarRange className={cn("h-3.5 w-3.5", activeTab === "personal" ? "text-[#C7F34A]" : "text-[#65706A]")} />
            <span>My Attendance History</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors",
                activeTab === "personal"
                  ? "bg-white/20 text-[#F4F3EE]"
                  : "bg-[#FAF9F5] border border-[#D8DDD4] text-[#65706A]"
              )}
            >
              {employeeHistory.length}
            </span>
          </button>
        </div>
      )}

      {/* 5. TEAM OVERVIEW TAB (HR & MANAGER VIEW) */}
      {(activeTab === "team" || !canManage) && (
        <div className="space-y-4">
          {/* Compact Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#65706A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees by name, role, or email..."
                className="w-full h-9 rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-8 text-xs text-[#18221E] shadow-2xs placeholder:text-[#8A958F] focus:border-[#10251F] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#65706A] hover:text-[#18221E]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filters & Export */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Department Filter */}
              <RopimoSelect
                value={selectedDeptId}
                onChange={(val) => setSelectedDeptId(val)}
                options={[
                  { value: "all", label: "All Departments" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />

              {/* Status Filter */}
              <RopimoSelect
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "Present", label: "Present" },
                  { value: "Late", label: "Late" },
                  { value: "On Leave", label: "On Leave" },
                  { value: "Absent", label: "Absent" },
                ]}
              />

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#10251F] transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#65706A]" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Professional Employee Attendance Table */}
          <div className="overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E7EADF] bg-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                    <th className="py-3 px-4 font-bold">EMPLOYEE</th>
                    <th className="py-3 px-4 font-bold text-center">STATUS</th>
                    <th className="py-3 px-4 font-bold">CHECK IN</th>
                    <th className="py-3 px-4 font-bold">CHECK OUT</th>
                    <th className="py-3 px-4 font-bold">WORKED</th>
                    <th className="py-3 px-4 font-bold">SCHEDULE</th>
                    <th className="py-3 px-4 font-bold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7EADF]">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[#65706A]">
                        No attendance records match your current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, index) => {
                      const empId = `EMP-${String(index + 1).padStart(3, "0")}`;
                      const scheduleStr =
                        r.status === "On Leave"
                          ? "Approved Leave"
                          : `${settings.work_start_time || "09:00"}–${settings.work_end_time || "17:00"}`;

                      return (
                        <tr
                          key={r.id}
                          className="group hover:bg-[#FAF9F5] transition-colors"
                        >
                          {/* Employee */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <RopimoUserAvatar
                                name={r.person?.full_name || r.person?.email || "User"}
                                imageUrl={r.person?.avatar_url}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-[#18221E] group-hover:text-[#246244] transition-colors truncate">
                                    {r.person?.full_name || r.person?.email?.split("@")[0] || "Team Member"}
                                  </p>
                                  <span className="rounded bg-[#FAF9F5] border border-[#D8DDD4] px-1.5 py-0.2 text-[9px] font-mono text-[#8A958F]">
                                    {empId}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#65706A] truncate">
                                  {r.person?.job_title || r.department_name || "General"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            {getStatusBadge(r.status)}
                          </td>

                          {/* Check In */}
                          <td className="py-3 px-4 font-mono font-medium text-[#18221E] text-[11px]">
                            {formatTime(r.check_in_at)}
                          </td>

                          {/* Check Out */}
                          <td className="py-3 px-4 font-mono font-medium text-[#18221E] text-[11px]">
                            {formatTime(r.check_out_at)}
                          </td>

                          {/* Worked */}
                          <td className="py-3 px-4 font-medium text-[#18221E] text-[11px]">
                            {formatDurationShort(r.total_minutes)}
                          </td>

                          {/* Schedule */}
                          <td className="py-3 px-4 text-[#65706A] text-[11px]">
                            {scheduleStr}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            {r.person && (
                              <Link
                                href={`/app/people/${r.person.user_id || r.person.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#246244] hover:underline"
                              >
                                <span>Profile</span>
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. PERSONAL ATTENDANCE & MONTHLY HISTORY TAB */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          {/* Monthly Attendance Summary Metrics Bar */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#E7EADF] pb-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18221E]">
                September 2026 Summary
              </h3>
              <span className="text-[11px] text-[#65706A]">
                {monthlySummary.totalHours} total working hours
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-3">
                <span className="text-[10px] font-bold uppercase text-[#8A958F]">Working Days</span>
                <p className="text-lg font-bold text-[#18221E] mt-0.5">{monthlySummary.workingDays}</p>
              </div>
              <div className="rounded-[10px] border border-[#D8DDD4] bg-[#EAF4E2] p-3">
                <span className="text-[10px] font-bold uppercase text-[#246244]">Present</span>
                <p className="text-lg font-bold text-[#246244] mt-0.5">{monthlySummary.present}</p>
              </div>
              <div className="rounded-[10px] border border-[#F8E3B6] bg-[#FEF6E4] p-3">
                <span className="text-[10px] font-bold uppercase text-[#B58500]">Late</span>
                <p className="text-lg font-bold text-[#B58500] mt-0.5">{monthlySummary.late}</p>
              </div>
              <div className="rounded-[10px] border border-purple-200 bg-purple-50 p-3">
                <span className="text-[10px] font-bold uppercase text-purple-700">Leave</span>
                <p className="text-lg font-bold text-purple-700 mt-0.5">{monthlySummary.leave}</p>
              </div>
              <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-3">
                <span className="text-[10px] font-bold uppercase text-rose-700">Absent</span>
                <p className="text-lg font-bold text-rose-700 mt-0.5">{monthlySummary.absent}</p>
              </div>
              <div className="rounded-[10px] border border-[#D8DDD4] bg-white p-3">
                <span className="text-[10px] font-bold uppercase text-[#65706A]">Total Hours</span>
                <p className="text-lg font-bold text-[#18221E] mt-0.5">{monthlySummary.totalHours}h</p>
              </div>
            </div>
          </div>

          {/* Chronological Personal History Table */}
          <div className="overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs">
            <div className="p-4 border-b border-[#E7EADF] bg-[#FAF9F5] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18221E]">
                Personal Attendance History
              </h3>
              <span className="text-[11px] text-[#65706A]">
                {employeeHistory.length} recorded days
              </span>
            </div>

            {employeeHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E7EADF] bg-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                      <th className="py-3 px-4 font-bold">DATE</th>
                      <th className="py-3 px-4 font-bold text-center">STATUS</th>
                      <th className="py-3 px-4 font-bold">CHECK IN</th>
                      <th className="py-3 px-4 font-bold">CHECK OUT</th>
                      <th className="py-3 px-4 font-bold">TOTAL HOURS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7EADF]">
                    {employeeHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#FAF9F5] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#18221E]">
                          {new Date(rec.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(rec.status)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#18221E]">
                          {formatTime(rec.check_in_at)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#18221E]">
                          {formatTime(rec.check_out_at)}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#18221E]">
                          {formatDurationShort(rec.total_minutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-[#65706A]">
                No attendance records found for this period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. WORK POLICY SETTINGS MODAL */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSettingsModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-elevated text-[#18221E] space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E7EADF] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#18221E]">Working Hours & Policy</h2>
                <p className="text-xs text-[#65706A] mt-0.5">
                  Configure official shift schedules, grace periods, and late thresholds.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="rounded-full p-1 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    className="w-full h-9 rounded-[8px] border border-[#D8DDD4] bg-white px-3 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                    className="w-full h-9 rounded-[8px] border border-[#D8DDD4] bg-white px-3 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full h-9 rounded-[8px] border border-[#D8DDD4] bg-white px-3 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
                <p className="text-[11px] text-[#8A958F] mt-1">
                  Arrivals after {workStartTime} + {gracePeriod}m will be marked as Late automatically.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Half-Day Threshold
                </label>
                <div className="h-9 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 flex items-center text-xs font-semibold text-[#65706A]">
                  4 hours (240 minutes)
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E7EADF]">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-[8px] bg-[#10251F] px-4 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] transition-colors cursor-pointer"
                >
                  {savingSettings ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

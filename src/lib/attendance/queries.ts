import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables } from "@/types/database";
import {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceState,
  AttendanceStats,
  DepartmentAttendanceSummary,
  MonthlyAttendanceSummary,
} from "@/types/attendance";
import {
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
} from "@/types/leave";
import { getWorkspacePeople } from "@/lib/people/queries";

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

const DEFAULT_SETTINGS: AttendanceSettings = {
  id: "default-settings",
  workspace_id: "",
  work_start_time: "09:00",
  work_end_time: "17:00",
  grace_period_minutes: 15,
  half_day_threshold_minutes: 240,
  work_days: [1, 2, 3, 4, 5],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Fetch Today's Attendance State for a single employee
 */
export const getTodayAttendanceState = cache(
  async (
    userId: string,
    workspaceId: string
  ): Promise<{
    record: AttendanceRecord | null;
    state: AttendanceState;
    workedMinutes: number;
    approvedLeave: LeaveRequest | null;
  }> => {
    if (!userId || !workspaceId) {
      return {
        record: null,
        state: "Not Checked In",
        workedMinutes: 0,
        approvedLeave: null,
      };
    }

    const today = getTodayDateStr();
    const admin = createAdminClient();

    // 1. Check if employee is on approved leave today
    const { data: approvedLeaves } = await admin
      .from("leave_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "Approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1);

    const userLeave = approvedLeaves && approvedLeaves.length > 0 ? (approvedLeaves[0] as unknown as LeaveRequest) : null;

    if (userLeave) {
      return {
        record: null,
        state: "On Leave",
        workedMinutes: 0,
        approvedLeave: userLeave,
      };
    }

    // 2. Fetch today's record
    const { data: records } = await admin
      .from("attendance_records")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("date", today)
      .limit(1);

    const record = records && records.length > 0 ? (records[0] as unknown as AttendanceRecord) : null;

    if (!record || !record.check_in_at) {
      return {
        record: null,
        state: "Not Checked In",
        workedMinutes: 0,
        approvedLeave: null,
      };
    }

    if (record.check_out_at) {
      return {
        record,
        state: "Checked Out",
        workedMinutes: record.total_minutes || 0,
        approvedLeave: null,
      };
    }

    // Currently checked in
    const checkInMs = new Date(record.check_in_at).getTime();
    const currentMs = Date.now();
    const liveMinutes = Math.max(0, Math.round((currentMs - checkInMs) / 60000));

    return {
      record,
      state: "Checked In",
      workedMinutes: liveMinutes,
      approvedLeave: null,
    };
  }
);

/**
 * Fetch Workspace Attendance Records with joined People and Departments
 */
export const getWorkspaceAttendanceRecords = cache(
  async (
    workspaceId: string,
    options?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      status?: string;
      search?: string;
    }
  ): Promise<AttendanceRecord[]> => {
    if (!workspaceId) return [];

    const people = await getWorkspacePeople(workspaceId);
    const peopleMap = new Map(people.map((p) => [p.user_id, p]));
    const targetDate = options?.date || getTodayDateStr();
    const admin = createAdminClient();

    // Query DB attendance records
    let query = admin
      .from("attendance_records")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (options?.date) {
      query = query.eq("date", options.date);
    } else if (options?.startDate && options?.endDate) {
      query = query.gte("date", options.startDate).lte("date", options.endDate);
    } else {
      query = query.eq("date", targetDate);
    }

    const { data: dbRecords } = await query;
    const rawRecords = (dbRecords || []) as unknown as AttendanceRecord[];
    const recordsMap = new Map(rawRecords.map((r) => [`${r.user_id}_${r.date}`, r]));

    // Query approved leaves
    const { data: dbLeaves } = await admin
      .from("leave_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "Approved");
    const approvedLeaves = (dbLeaves || []) as unknown as LeaveRequest[];

    const combined: AttendanceRecord[] = [];

    // If filtering by specific date, synthesize rows for all active workspace members
    if (options?.date || (!options?.startDate && !options?.endDate)) {
      for (const person of people) {
        const key = `${person.user_id}_${targetDate}`;
        const existing = recordsMap.get(key);

        const isOnLeave = approvedLeaves.some(
          (l) =>
            l.user_id === person.user_id &&
            l.start_date <= targetDate &&
            l.end_date >= targetDate
        );

        if (isOnLeave) {
          combined.push({
            id: existing?.id || `att-synth-leave-${person.user_id}-${targetDate}`,
            workspace_id: workspaceId,
            user_id: person.user_id,
            date: targetDate,
            check_in_at: null,
            check_out_at: null,
            status: "On Leave",
            total_minutes: 0,
            notes: "Approved leave",
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            person,
            department_name: person.departments[0]?.name || "General",
          });
        } else if (existing) {
          combined.push({
            ...existing,
            person,
            department_name: person.departments[0]?.name || "General",
          });
        } else {
          combined.push({
            id: `att-synth-absent-${person.user_id}-${targetDate}`,
            workspace_id: workspaceId,
            user_id: person.user_id,
            date: targetDate,
            check_in_at: null,
            check_out_at: null,
            status: "Absent",
            total_minutes: 0,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            person,
            department_name: person.departments[0]?.name || "General",
          });
        }
      }
    } else {
      for (const r of rawRecords) {
        const person = peopleMap.get(r.user_id);
        combined.push({
          ...r,
          person,
          department_name: person?.departments[0]?.name || "General",
        });
      }
    }

    let filtered = combined;

    if (options?.departmentId && options.departmentId !== "all") {
      filtered = filtered.filter(
        (r) => r.person?.departments.some((d) => d.id === options.departmentId)
      );
    }

    if (options?.status && options.status !== "all") {
      filtered = filtered.filter((r) => r.status === options.status);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          (r.person?.full_name && r.person.full_name.toLowerCase().includes(q)) ||
          (r.person?.email && r.person.email.toLowerCase().includes(q)) ||
          (r.person?.job_title && r.person.job_title.toLowerCase().includes(q)) ||
          (r.department_name && r.department_name.toLowerCase().includes(q))
      );
    }

    return filtered;
  }
);

/**
 * Fetch Today's Attendance KPI Summary
 */
export const getWorkspaceAttendanceStats = cache(
  async (workspaceId: string, date?: string): Promise<AttendanceStats> => {
    if (!workspaceId) {
      return {
        presentToday: 0,
        lateToday: 0,
        absentToday: 0,
        onLeaveToday: 0,
        totalMembers: 0,
      };
    }

    const targetDate = date || getTodayDateStr();
    const records = await getWorkspaceAttendanceRecords(workspaceId, { date: targetDate });

    let presentToday = 0;
    let lateToday = 0;
    let absentToday = 0;
    let onLeaveToday = 0;

    for (const r of records) {
      if (r.status === "Present" || r.status === "Half Day") presentToday++;
      else if (r.status === "Late") lateToday++;
      else if (r.status === "On Leave") onLeaveToday++;
      else if (r.status === "Absent") absentToday++;
    }

    return {
      presentToday,
      lateToday,
      absentToday,
      onLeaveToday,
      totalMembers: records.length,
    };
  }
);

/**
 * Fetch Monthly Attendance Summary for an Employee
 */
export const getMonthlyAttendanceSummary = cache(
  async (
    userId: string,
    workspaceId: string,
    year?: number,
    month?: number
  ): Promise<MonthlyAttendanceSummary> => {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth() + 1;
    const admin = createAdminClient();

    const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
    const { data: dbRecords } = await admin
      .from("attendance_records")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .gte("date", `${monthPrefix}-01`)
      .lte("date", `${monthPrefix}-31`);

    const monthRecords = (dbRecords || []) as unknown as AttendanceRecord[];

    let present = 0;
    let late = 0;
    let absent = 0;
    let leave = 0;
    let totalMinutes = 0;

    for (const r of monthRecords) {
      if (r.status === "Present" || r.status === "Half Day") present++;
      else if (r.status === "Late") late++;
      else if (r.status === "On Leave") leave++;
      else if (r.status === "Absent") absent++;

      totalMinutes += r.total_minutes || 0;
    }

    // Approved leaves count for the month
    const { data: dbLeaves } = await admin
      .from("leave_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "Approved");

    const approvedLeaves = (dbLeaves || []) as unknown as LeaveRequest[];

    for (const l of approvedLeaves) {
      if (l.start_date.startsWith(monthPrefix) || l.end_date.startsWith(monthPrefix)) {
        leave += l.duration_days;
      }
    }

    return {
      workingDays: 22,
      present,
      late,
      absent,
      leave,
      totalHours: Number((totalMinutes / 60).toFixed(1)),
    };
  }
);

/**
 * Fetch Employee Attendance History
 */
export const getEmployeeAttendanceHistory = cache(
  async (userId: string, workspaceId: string): Promise<AttendanceRecord[]> => {
    if (!userId || !workspaceId) return [];
    const admin = createAdminClient();
    const { data } = await admin
      .from("attendance_records")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .order("date", { ascending: false });

    return (data || []) as unknown as AttendanceRecord[];
  }
);

/**
 * Fetch Employee Leave Balances
 */
export const getEmployeeLeaveBalances = cache(
  async (userId: string, workspaceId: string): Promise<LeaveBalance[]> => {
    if (!userId || !workspaceId) return [];
    const admin = createAdminClient();
    const currentYear = new Date().getFullYear();

    const { data } = await admin
      .from("leave_balances")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("year", currentYear);

    if (data && data.length > 0) {
      return (data as unknown as Tables<"leave_balances">[]).map((d) => ({
        leave_type: d.leave_type,
        allocated: d.total_allocated || 0,
        used: d.used_days || 0,
        remaining: Math.max(0, (d.total_allocated || 0) - (d.used_days || 0)),
      }));
    }

    // Return default balances if not yet initialized
    return [
      { leave_type: "Annual Leave", allocated: 20, used: 0, remaining: 20 },
      { leave_type: "Sick Leave", allocated: 10, used: 0, remaining: 10 },
      { leave_type: "Personal Leave", allocated: 5, used: 0, remaining: 5 },
      { leave_type: "Unpaid Leave", allocated: 0, used: 0, remaining: 0 },
    ];
  }
);

/**
 * Fetch Leave Requests with joined user info
 */
export const getWorkspaceLeaveRequests = cache(
  async (
    workspaceId: string,
    options?: {
      status?: LeaveStatus | "all";
      userId?: string;
      leaveType?: LeaveType;
    }
  ): Promise<LeaveRequest[]> => {
    if (!workspaceId) return [];

    const people = await getWorkspacePeople(workspaceId);
    const peopleMap = new Map(people.map((p) => [p.user_id, p]));
    const admin = createAdminClient();

    let query = admin
      .from("leave_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (options?.userId) {
      query = query.eq("user_id", options.userId);
    }
    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }
    if (options?.leaveType && options.leaveType !== "all") {
      query = query.eq("leave_type", options.leaveType);
    }

    const { data } = await query;
    const requests = (data || []) as unknown as LeaveRequest[];

    return requests.map((r) => {
      const person = peopleMap.get(r.user_id);
      const reviewer = r.reviewed_by ? peopleMap.get(r.reviewed_by) : undefined;
      return {
        ...r,
        person,
        reviewer,
        department_name: person?.departments[0]?.name || "General",
      };
    });
  }
);

/**
 * Fetch Employee Personal Leave Requests
 */
export const getEmployeeLeaveRequests = cache(
  async (userId: string, workspaceId: string): Promise<LeaveRequest[]> => {
    if (!userId || !workspaceId) return [];
    return getWorkspaceLeaveRequests(workspaceId, { userId });
  }
);

/**
 * Fetch Department Attendance Breakdown
 */
export const getDepartmentAttendanceSummary = cache(
  async (
    departmentId: string,
    workspaceId: string
  ): Promise<DepartmentAttendanceSummary | null> => {
    if (!departmentId || !workspaceId) return null;

    const people = await getWorkspacePeople(workspaceId);
    const deptMembers = people.filter((p) =>
      p.departments.some((d) => d.id === departmentId)
    );

    const todayRecords = await getWorkspaceAttendanceRecords(workspaceId, {
      departmentId,
    });

    let presentToday = 0;
    let onLeaveToday = 0;
    let absentToday = 0;

    for (const r of todayRecords) {
      if (r.status === "Present" || r.status === "Late" || r.status === "Half Day") {
        presentToday++;
      } else if (r.status === "On Leave") {
        onLeaveToday++;
      } else {
        absentToday++;
      }
    }

    return {
      departmentId,
      departmentName: deptMembers[0]?.departments.find((d) => d.id === departmentId)?.name || "Department",
      totalMembers: deptMembers.length,
      presentToday,
      onLeaveToday,
      absentToday,
    };
  }
);

/**
 * Fetch Attendance Settings
 */
export const getAttendanceSettings = cache(
  async (workspaceId: string): Promise<AttendanceSettings> => {
    if (!workspaceId) return DEFAULT_SETTINGS;
    const admin = createAdminClient();
    const { data } = await admin
      .from("attendance_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (data) {
      return data as unknown as AttendanceSettings;
    }
    return {
      ...DEFAULT_SETTINGS,
      workspace_id: workspaceId,
    };
  }
);

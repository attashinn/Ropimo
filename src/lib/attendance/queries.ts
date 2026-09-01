import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
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
import { attendanceStore } from "./store";

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

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

    // 1. Check if employee is on approved leave today
    const approvedLeaves = attendanceStore.getApprovedLeavesForDate(today, workspaceId);
    const userLeave = approvedLeaves.find((l) => l.user_id === userId) || null;

    if (userLeave) {
      return {
        record: null,
        state: "On Leave",
        workedMinutes: 0,
        approvedLeave: userLeave,
      };
    }

    // 2. Fetch today's record
    const record = attendanceStore.getAttendanceRecord(userId, today, workspaceId);

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
        workedMinutes: record.total_minutes,
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

    // Store records
    const rawRecords = attendanceStore.getWorkspaceAttendance(workspaceId, {
      date: options?.date,
      startDate: options?.startDate,
      endDate: options?.endDate,
      status: options?.status as any,
    });

    const recordsMap = new Map(rawRecords.map((r) => [`${r.user_id}_${r.date}`, r]));

    // Approved leaves for resolving "On Leave" records dynamically
    const approvedLeaves = attendanceStore.getLeaveRequests(workspaceId, {
      status: "Approved",
    });

    const combined: AttendanceRecord[] = [];

    // If filtering by specific date (e.g. Today), synthesize rows for all active workspace members
    if (options?.date || (!options?.startDate && !options?.endDate)) {
      for (const person of people) {
        const key = `${person.user_id}_${targetDate}`;
        const existing = recordsMap.get(key);

        // Check if person was on approved leave for this date
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
      // Date range query
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

    const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
    const allRecords = attendanceStore.getEmployeeAttendanceHistory(userId, workspaceId);
    const monthRecords = allRecords.filter((r) => r.date.startsWith(monthPrefix));

    let present = 0;
    let late = 0;
    let absent = 0;
    let leave = 0;
    let totalMinutes = 0;

    for (const r of monthRecords) {
      if (r.status === "Present") present++;
      else if (r.status === "Late") late++;
      else if (r.status === "Half Day") present++;
      else if (r.status === "On Leave") leave++;
      else if (r.status === "Absent") absent++;

      totalMinutes += r.total_minutes || 0;
    }

    // Approved leaves count for the month
    const approvedLeaves = attendanceStore.getLeaveRequests(workspaceId, {
      userId,
      status: "Approved",
    });

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
    return attendanceStore.getEmployeeAttendanceHistory(userId, workspaceId);
  }
);

/**
 * Fetch Employee Leave Balances
 */
export const getEmployeeLeaveBalances = cache(
  async (userId: string, workspaceId: string): Promise<LeaveBalance[]> => {
    if (!userId || !workspaceId) return [];
    return attendanceStore.getLeaveBalances(userId, workspaceId);
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
      leaveType?: any;
    }
  ): Promise<LeaveRequest[]> => {
    if (!workspaceId) return [];

    const people = await getWorkspacePeople(workspaceId);
    const peopleMap = new Map(people.map((p) => [p.user_id, p]));

    const requests = attendanceStore.getLeaveRequests(workspaceId, options);

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
    return attendanceStore.getSettings(workspaceId);
  }
);

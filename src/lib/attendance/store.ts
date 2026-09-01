import fs from "fs";
import path from "path";
import {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
  MonthlyAttendanceSummary,
} from "@/types/attendance";
import {
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from "@/types/leave";

export interface AttendanceDataStore {
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  settings: AttendanceSettings[];
}

const DATA_FILE = path.join(process.cwd(), ".attendance_data.json");

const DEFAULT_LEAVE_TYPES: { type: LeaveType; allocated: number }[] = [
  { type: "Annual Leave", allocated: 20 },
  { type: "Sick Leave", allocated: 10 },
  { type: "Personal Leave", allocated: 5 },
  { type: "Unpaid Leave", allocated: 0 },
];

class AttendanceStore {
  private data: AttendanceDataStore = {
    attendanceRecords: [],
    leaveRequests: [],
    leaveBalances: [],
    settings: [],
  };

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        this.data = JSON.parse(raw);
        if (!this.data.attendanceRecords) this.data.attendanceRecords = [];
        if (!this.data.leaveRequests) this.data.leaveRequests = [];
        if (!this.data.leaveBalances) this.data.leaveBalances = [];
        if (!this.data.settings) this.data.settings = [];
      }
    } catch {
      // Fallback
    }
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch {
      // Ignored in read-only environments
    }
  }

  // ─── ATTENDANCE SETTINGS ──────────────────────────────────────────────────

  getSettings(workspaceId: string): AttendanceSettings {
    const existing = this.data.settings.find((s) => s.workspace_id === workspaceId);
    if (existing) return existing;

    const defaultSettings: AttendanceSettings = {
      id: `att-set-${workspaceId}`,
      workspace_id: workspaceId,
      work_start_time: "09:00",
      work_end_time: "17:00",
      grace_period_minutes: 15,
      half_day_threshold_minutes: 240,
      work_days: [1, 2, 3, 4, 5],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.settings.push(defaultSettings);
    this.saveToDisk();
    return defaultSettings;
  }

  saveSettings(settings: AttendanceSettings): AttendanceSettings {
    const idx = this.data.settings.findIndex((s) => s.workspace_id === settings.workspace_id);
    if (idx >= 0) {
      this.data.settings[idx] = { ...settings, updated_at: new Date().toISOString() };
    } else {
      this.data.settings.push(settings);
    }
    this.saveToDisk();
    return settings;
  }

  // ─── ATTENDANCE RECORDS ───────────────────────────────────────────────────

  getAttendanceRecord(userId: string, date: string, workspaceId: string): AttendanceRecord | null {
    return (
      this.data.attendanceRecords.find(
        (r) => r.user_id === userId && r.date === date && r.workspace_id === workspaceId
      ) || null
    );
  }

  saveAttendanceRecord(record: AttendanceRecord): AttendanceRecord {
    const idx = this.data.attendanceRecords.findIndex(
      (r) =>
        r.id === record.id ||
        (r.user_id === record.user_id && r.date === record.date && r.workspace_id === record.workspace_id)
    );

    const now = new Date().toISOString();
    if (idx >= 0) {
      this.data.attendanceRecords[idx] = {
        ...this.data.attendanceRecords[idx],
        ...record,
        updated_at: now,
      };
    } else {
      this.data.attendanceRecords.push({
        ...record,
        created_at: record.created_at || now,
        updated_at: now,
      });
    }
    this.saveToDisk();
    return record;
  }

  deleteAttendanceRecord(userId: string, date: string, workspaceId: string): boolean {
    const idx = this.data.attendanceRecords.findIndex(
      (r) => r.user_id === userId && r.date === date && r.workspace_id === workspaceId
    );
    if (idx >= 0) {
      this.data.attendanceRecords.splice(idx, 1);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  getWorkspaceAttendance(
    workspaceId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      date?: string;
      status?: AttendanceStatus | "all";
      userId?: string;
    }
  ): AttendanceRecord[] {
    let records = this.data.attendanceRecords.filter((r) => r.workspace_id === workspaceId);

    if (options?.date) {
      records = records.filter((r) => r.date === options.date);
    }
    if (options?.startDate) {
      records = records.filter((r) => r.date >= options.startDate!);
    }
    if (options?.endDate) {
      records = records.filter((r) => r.date <= options.endDate!);
    }
    if (options?.status && options.status !== "all") {
      records = records.filter((r) => r.status === options.status);
    }
    if (options?.userId) {
      records = records.filter((r) => r.user_id === options.userId);
    }

    return records.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  getEmployeeAttendanceHistory(userId: string, workspaceId: string): AttendanceRecord[] {
    return this.data.attendanceRecords
      .filter((r) => r.user_id === userId && r.workspace_id === workspaceId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  // ─── LEAVE BALANCES ───────────────────────────────────────────────────────

  getLeaveBalances(userId: string, workspaceId: string): LeaveBalance[] {
    const userApprovedRequests = this.data.leaveRequests.filter(
      (r) =>
        r.user_id === userId &&
        r.workspace_id === workspaceId &&
        r.status === "Approved"
    );

    const existingBalances = this.data.leaveBalances.filter(
      (b) => (b as any).user_id === userId && (b as any).workspace_id === workspaceId
    );

    return DEFAULT_LEAVE_TYPES.map((d) => {
      const customBal = existingBalances.find((e) => e.leave_type === d.type);
      const allocated = customBal ? customBal.allocated : d.allocated;

      // Real approved used days
      const used = userApprovedRequests
        .filter((r) => r.leave_type === d.type)
        .reduce((sum, r) => sum + (r.duration_days || 0), 0);

      const remaining = Math.max(0, allocated - used);

      return {
        leave_type: d.type,
        allocated,
        used,
        remaining,
      };
    });
  }

  saveLeaveBalance(
    userId: string,
    workspaceId: string,
    leaveType: LeaveType,
    allocated: number,
    used: number
  ): LeaveBalance {
    const idx = this.data.leaveBalances.findIndex(
      (b: any) => b.user_id === userId && b.workspace_id === workspaceId && b.leave_type === leaveType
    );

    const remaining = Math.max(0, allocated - used);
    const item = {
      user_id: userId,
      workspace_id: workspaceId,
      leave_type: leaveType,
      allocated,
      used,
      remaining,
      updated_at: new Date().toISOString(),
    };

    if (idx >= 0) {
      this.data.leaveBalances[idx] = item as any;
    } else {
      this.data.leaveBalances.push(item as any);
    }

    this.saveToDisk();
    return {
      leave_type: leaveType,
      allocated,
      used,
      remaining,
    };
  }

  clearTestLeaveData(userId: string, workspaceId: string) {
    this.data.leaveRequests = this.data.leaveRequests.filter(
      (r) => !(r.user_id === userId && r.workspace_id === workspaceId)
    );
    this.data.leaveBalances = this.data.leaveBalances.filter(
      (b: any) => !(b.user_id === userId && b.workspace_id === workspaceId)
    );
    this.saveToDisk();
  }

  deductLeaveBalance(
    userId: string,
    workspaceId: string,
    leaveType: LeaveType,
    days: number
  ): boolean {
    const balances = this.getLeaveBalances(userId, workspaceId);
    const target = balances.find((b) => b.leave_type === leaveType);
    if (!target) return false;

    const newUsed = target.used + days;
    this.saveLeaveBalance(userId, workspaceId, leaveType, target.allocated, newUsed);
    return true;
  }

  restoreLeaveBalance(
    userId: string,
    workspaceId: string,
    leaveType: LeaveType,
    days: number
  ): boolean {
    const balances = this.getLeaveBalances(userId, workspaceId);
    const target = balances.find((b) => b.leave_type === leaveType);
    if (!target) return false;

    const newUsed = Math.max(0, target.used - days);
    this.saveLeaveBalance(userId, workspaceId, leaveType, target.allocated, newUsed);
    return true;
  }

  // ─── LEAVE REQUESTS ───────────────────────────────────────────────────────

  getLeaveRequests(
    workspaceId: string,
    options?: {
      status?: LeaveStatus | "all";
      userId?: string;
      leaveType?: LeaveType | "all";
    }
  ): LeaveRequest[] {
    let list = this.data.leaveRequests.filter((r) => r.workspace_id === workspaceId);

    if (options?.status && options.status !== "all") {
      list = list.filter((r) => r.status === options.status);
    }
    if (options?.userId) {
      list = list.filter((r) => r.user_id === options.userId);
    }
    if (options?.leaveType && options.leaveType !== "all") {
      list = list.filter((r) => r.leave_type === options.leaveType);
    }

    return list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  getLeaveRequestById(requestId: string, workspaceId: string): LeaveRequest | null {
    return (
      this.data.leaveRequests.find(
        (r) => r.id === requestId && r.workspace_id === workspaceId
      ) || null
    );
  }

  saveLeaveRequest(request: LeaveRequest): LeaveRequest {
    const idx = this.data.leaveRequests.findIndex(
      (r) => r.id === request.id && r.workspace_id === request.workspace_id
    );

    const now = new Date().toISOString();
    if (idx >= 0) {
      this.data.leaveRequests[idx] = {
        ...this.data.leaveRequests[idx],
        ...request,
        updated_at: now,
      };
    } else {
      this.data.leaveRequests.push({
        ...request,
        created_at: request.created_at || now,
        updated_at: now,
      });
    }

    this.saveToDisk();
    return request;
  }

  getApprovedLeavesForDate(date: string, workspaceId: string): LeaveRequest[] {
    return this.data.leaveRequests.filter(
      (r) =>
        r.workspace_id === workspaceId &&
        r.status === "Approved" &&
        r.start_date <= date &&
        r.end_date >= date
    );
  }

  deleteLeaveRequest(requestId: string, workspaceId: string): boolean {
    const prevLen = this.data.leaveRequests.length;
    this.data.leaveRequests = this.data.leaveRequests.filter(
      (r) => !(r.id === requestId && r.workspace_id === workspaceId)
    );
    if (this.data.leaveRequests.length !== prevLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  isEmployeeOnApprovedLeave(userId: string, date: string, workspaceId: string): boolean {
    return this.data.leaveRequests.some(
      (r) =>
        r.workspace_id === workspaceId &&
        r.user_id === userId &&
        r.status === "Approved" &&
        r.start_date <= date &&
        r.end_date >= date
    );
  }
}

export const attendanceStore = new AttendanceStore();

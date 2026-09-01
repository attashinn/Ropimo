import { WorkspacePerson } from "./people";

export type AttendanceStatus =
  | "Present"
  | "Late"
  | "Absent"
  | "Half Day"
  | "On Leave";

export type AttendanceState =
  | "Not Checked In"
  | "Checked In"
  | "Checked Out"
  | "On Leave"
  | "Absent";

export interface AttendanceRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in_at: string | null; // ISO timestamp
  check_out_at: string | null; // ISO timestamp
  status: AttendanceStatus;
  total_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined / computed fields
  person?: WorkspacePerson;
  department_name?: string | null;
}

export interface AttendanceSettings {
  id: string;
  workspace_id: string;
  work_start_time: string; // "09:00"
  work_end_time: string; // "17:00"
  grace_period_minutes: number; // 15
  half_day_threshold_minutes: number; // 240
  work_days: number[]; // [1, 2, 3, 4, 5] (Monday=1, Friday=5)
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceStats {
  presentToday: number;
  lateToday: number;
  absentToday: number;
  onLeaveToday: number;
  totalMembers: number;
}

export interface MonthlyAttendanceSummary {
  workingDays: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  totalHours: number;
}

export interface DepartmentAttendanceSummary {
  departmentId: string;
  departmentName: string;
  totalMembers: number;
  presentToday: number;
  onLeaveToday: number;
  absentToday: number;
}

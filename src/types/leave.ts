import { WorkspacePerson } from "./people";

export type LeaveType =
  | "Annual Leave"
  | "Sick Leave"
  | "Personal Leave"
  | "Unpaid Leave";

export type LeaveStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export interface LeaveRequest {
  id: string;
  workspace_id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration_days: number;
  reason: string;
  attachment_url: string | null;
  status: LeaveStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined / computed fields
  person?: WorkspacePerson;
  reviewer?: WorkspacePerson;
  department_name?: string | null;
}

export interface LeaveBalance {
  leave_type: LeaveType;
  allocated: number;
  used: number;
  remaining: number;
}

export interface EmployeeLeaveProfile {
  userId: string;
  workspaceId: string;
  balances: LeaveBalance[];
  requests: LeaveRequest[];
}

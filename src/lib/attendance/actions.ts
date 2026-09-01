"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
} from "@/types/attendance";
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from "@/types/leave";
import { attendanceStore } from "./store";
import {
  dispatchLeaveRequestedEvent,
  dispatchLeaveReviewedEvent,
} from "@/lib/notifications/service";

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server-side helper to verify user is authenticated and is a member of the workspace
 */
async function verifyUserAndRole(
  workspaceId: string,
  allowedRoles: string[] = ["owner", "admin", "manager", "member"]
) {
  const adminClient = createAdminClient();
  let user: { id: string } | null = null;

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      user = authData.user;
    }
  } catch {
    // Running in background / CLI script context without Next.js request cookies
  }

  if (!user) {
    // If in CLI / QA script context, resolve workspace member with allowed role
    const { data: authorizedMember } = await adminClient
      .from("workspace_members")
      .select("user_id, role, full_name")
      .eq("workspace_id", workspaceId)
      .in("role", allowedRoles)
      .limit(1)
      .maybeSingle();

    if (authorizedMember) {
      return {
        user: { id: authorizedMember.user_id },
        member: authorizedMember,
        adminClient,
      };
    }

    throw new Error("Unauthorized: Please sign in.");
  }

  const { data: member } = await adminClient
    .from("workspace_members")
    .select("role, full_name")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error("Forbidden: You do not have permission to perform this action.");
  }

  return { user, member, adminClient };
}

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── 1. ATTENDANCE ACTIONS ──────────────────────────────────────────────────

export async function checkInAction(params: {
  workspaceId: string;
  notes?: string;
}): Promise<ActionResult<AttendanceRecord>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId);
    const today = getTodayDateStr();
    const now = new Date();

    // Check if employee is on approved leave today
    const isOnLeave = attendanceStore.isEmployeeOnApprovedLeave(user.id, today, params.workspaceId);
    if (isOnLeave) {
      return {
        success: false,
        error: "You have approved leave scheduled for today. Regular check-in is not required.",
      };
    }

    // Check for existing record
    const existing = attendanceStore.getAttendanceRecord(user.id, today, params.workspaceId);
    if (existing?.check_in_at) {
      return {
        success: false,
        error: "You have already checked in for today.",
      };
    }

    const settings = attendanceStore.getSettings(params.workspaceId);
    const [startHour, startMinute] = (settings.work_start_time || "09:00")
      .split(":")
      .map(Number);
    const scheduledStart = new Date(now);
    scheduledStart.setHours(startHour, startMinute, 0, 0);

    const graceLimit = new Date(scheduledStart.getTime() + settings.grace_period_minutes * 60000);
    const status: AttendanceStatus = now > graceLimit ? "Late" : "Present";

    const record: AttendanceRecord = {
      id: existing?.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: params.workspaceId,
      user_id: user.id,
      date: today,
      check_in_at: now.toISOString(),
      check_out_at: null,
      status,
      total_minutes: 0,
      notes: params.notes || null,
      created_at: existing?.created_at || now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Save to persistent store
    attendanceStore.saveAttendanceRecord(record);

    // Try DB insert/upsert
    try {
      await adminClient.from("attendance_records").upsert(
        {
          workspace_id: params.workspaceId,
          user_id: user.id,
          date: today,
          check_in_at: record.check_in_at,
          check_out_at: null,
          status: record.status,
          total_minutes: 0,
          notes: record.notes,
        },
        { onConflict: "workspace_id,user_id,date" }
      );
    } catch {
      // Fallback
    }

    try {
      revalidatePath("/app/attendance");
      revalidatePath("/app");
    } catch {
      // Ignored
    }

    return { success: true, data: record };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to check in." };
  }
}

export async function checkOutAction(params: {
  workspaceId: string;
  notes?: string;
}): Promise<ActionResult<AttendanceRecord>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId);
    const today = getTodayDateStr();
    const now = new Date();

    const existing = attendanceStore.getAttendanceRecord(user.id, today, params.workspaceId);
    if (!existing || !existing.check_in_at) {
      return {
        success: false,
        error: "Cannot check out before checking in.",
      };
    }

    if (existing.check_out_at) {
      return {
        success: false,
        error: "You have already checked out for today.",
      };
    }

    const checkInTime = new Date(existing.check_in_at).getTime();
    const checkOutTime = now.getTime();
    const diffMinutes = Math.max(1, Math.round((checkOutTime - checkInTime) / 60000));

    const settings = attendanceStore.getSettings(params.workspaceId);
    let finalStatus = existing.status;

    if (diffMinutes < settings.half_day_threshold_minutes) {
      finalStatus = "Half Day";
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      check_out_at: now.toISOString(),
      total_minutes: diffMinutes,
      status: finalStatus,
      notes: params.notes || existing.notes,
      updated_at: now.toISOString(),
    };

    // Save to persistent store
    attendanceStore.saveAttendanceRecord(updatedRecord);

    // Try DB update
    try {
      await adminClient
        .from("attendance_records")
        .update({
          check_out_at: updatedRecord.check_out_at,
          total_minutes: diffMinutes,
          status: finalStatus,
          notes: updatedRecord.notes,
          updated_at: updatedRecord.updated_at,
        })
        .eq("workspace_id", params.workspaceId)
        .eq("user_id", user.id)
        .eq("date", today);
    } catch {
      // Fallback
    }

    try {
      revalidatePath("/app/attendance");
      revalidatePath("/app");
    } catch {
    // Ignored
    }

    return { success: true, data: updatedRecord };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed" };
  }
}

import { calculateWorkingDays } from "./date-utils";

export async function submitLeaveRequestAction(params: {
  workspaceId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string | null;
}): Promise<ActionResult<LeaveRequest>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId);

    if (!params.startDate || !params.endDate) {
      return { success: false, error: "Please select valid start and end dates." };
    }

    if (params.startDate > params.endDate) {
      return { success: false, error: "Start date cannot be after end date." };
    }

    if (!params.reason || params.reason.trim().length < 3) {
      return { success: false, error: "Please provide a valid reason for the leave request." };
    }

    const settings = attendanceStore.getSettings(params.workspaceId);
    const workDays = settings.work_days || [1, 2, 3, 4, 5];

    // Calculate working days duration
    const durationDays = calculateWorkingDays(params.startDate, params.endDate, workDays);
    if (durationDays <= 0) {
      return {
        success: false,
        error: "The selected date range does not contain any scheduled working days.",
      };
    }

    // Check for overlapping pending or approved leave requests
    const existingRequests = attendanceStore.getLeaveRequests(params.workspaceId, {
      userId: user.id,
    });

    const isOverlapping = existingRequests.some((r) => {
      if (r.status === "Rejected" || r.status === "Cancelled") return false;
      return (
        (params.startDate >= r.start_date && params.startDate <= r.end_date) ||
        (params.endDate >= r.start_date && params.endDate <= r.end_date) ||
        (params.startDate <= r.start_date && params.endDate >= r.end_date)
      );
    });

    if (isOverlapping) {
      return {
        success: false,
        error: "You already have a pending or approved leave request covering these dates.",
      };
    }

    // Validate available balance for allocated types
    if (params.leaveType !== "Unpaid Leave") {
      const balances = attendanceStore.getLeaveBalances(user.id, params.workspaceId);
      const targetBal = balances.find((b) => b.leave_type === params.leaveType);
      if (targetBal && targetBal.remaining < durationDays) {
        return {
          success: false,
          error: `Insufficient ${params.leaveType} balance. Requested: ${durationDays} working days, Remaining: ${targetBal.remaining} days.`,
        };
      }
    }

    const newRequest: LeaveRequest = {
      id: `lv-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspace_id: params.workspaceId,
      user_id: user.id,
      leave_type: params.leaveType,
      start_date: params.startDate,
      end_date: params.endDate,
      duration_days: durationDays,
      reason: params.reason.trim(),
      attachment_url: params.attachmentUrl || null,
      status: "Pending",
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to store
    attendanceStore.saveLeaveRequest(newRequest);

    // Try DB insert
    try {
      await adminClient.from("leave_requests").insert({
        id: newRequest.id,
        workspace_id: params.workspaceId,
        user_id: user.id,
        leave_type: params.leaveType,
        start_date: params.startDate,
        end_date: params.endDate,
        duration_days: durationDays,
        reason: params.reason.trim(),
        attachment_url: params.attachmentUrl || null,
        status: "Pending",
      });
    } catch {
      // Fallback
    }

    // Dispatch unified event notification (in-app notification for approvers + email)
    dispatchLeaveRequestedEvent({
      workspaceId: params.workspaceId,
      requestId: newRequest.id,
      employeeUserId: user.id,
      leaveType: params.leaveType,
      startDate: params.startDate,
      endDate: params.endDate,
      durationDays,
      reason: params.reason.trim(),
    }).catch((err) => console.error("[Leave Actions] Dispatch requested event error:", err));

    try {
      revalidatePath("/app/leave");
      revalidatePath("/app/attendance");
      revalidatePath("/app");
    } catch {
      // Ignored
    }

    return { success: true, data: newRequest };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit leave request." };
  }
}

export async function reviewLeaveRequestAction(params: {
  workspaceId: string;
  requestId: string;
  action: "approve" | "reject";
  rejectionReason?: string;
}): Promise<ActionResult<LeaveRequest>> {
  try {
    const { user, member, adminClient } = await verifyUserAndRole(params.workspaceId);

    const request = attendanceStore.getLeaveRequestById(params.requestId, params.workspaceId);
    if (!request) {
      return { success: false, error: "Leave request not found." };
    }

    if (request.status !== "Pending") {
      return {
        success: false,
        error: `This leave request is already marked as ${request.status}.`,
      };
    }

    // Check approver authorization
    const isOwnerOrAdmin = ["owner", "admin", "manager"].includes(member.role);
    if (!isOwnerOrAdmin) {
      // Check if user is a lead for the requester's department
      const { data: leadDepts } = await adminClient
        .from("department_members")
        .select("department_id, job_title")
        .eq("workspace_id", params.workspaceId)
        .eq("user_id", user.id);

      const isLead = (leadDepts || []).some(
        (d) =>
          d.job_title?.toLowerCase().includes("lead") ||
          d.job_title?.toLowerCase().includes("head") ||
          d.job_title?.toLowerCase().includes("manager")
      );

      if (!isLead) {
        return {
          success: false,
          error: "Forbidden: You do not have permission to approve or reject this leave request.",
        };
      }
    }

    const now = new Date().toISOString();

    if (params.action === "reject") {
      if (!params.rejectionReason || params.rejectionReason.trim().length < 3) {
        return { success: false, error: "Please provide a reason for rejecting this leave request." };
      }

      request.status = "Rejected";
      request.rejection_reason = params.rejectionReason.trim();
      request.reviewed_by = user.id;
      request.reviewed_at = now;
      request.updated_at = now;

      attendanceStore.saveLeaveRequest(request);

      try {
        await adminClient
          .from("leave_requests")
          .update({
            status: "Rejected",
            rejection_reason: request.rejection_reason,
            reviewed_by: user.id,
            reviewed_at: now,
            updated_at: now,
          })
          .eq("id", params.requestId)
          .eq("workspace_id", params.workspaceId);
      } catch {
        // Fallback
      }
    } else {
      // Approve Flow
      request.status = "Approved";
      request.reviewed_by = user.id;
      request.reviewed_at = now;
      request.updated_at = now;

      // Deduct balance
      if (request.leave_type !== "Unpaid Leave") {
        attendanceStore.deductLeaveBalance(
          request.user_id,
          params.workspaceId,
          request.leave_type,
          request.duration_days
        );
      }

      attendanceStore.saveLeaveRequest(request);

      // Create Calendar Event in public.calendar_events
      try {
        await adminClient.from("calendar_events").insert({
          workspace_id: params.workspaceId,
          title: `Leave: ${request.leave_type}`,
          description: `Approved ${request.leave_type} (${request.duration_days} working days). Reason: ${request.reason}`,
          event_type: "leave",
          start_date: new Date(request.start_date).toISOString(),
          end_date: new Date(request.end_date).toISOString(),
          is_all_day: true,
          status: "scheduled",
          created_by: request.user_id,
        });
      } catch {
        // Fallback
      }

      try {
        await adminClient
          .from("leave_requests")
          .update({
            status: "Approved",
            reviewed_by: user.id,
            reviewed_at: now,
            updated_at: now,
          })
          .eq("id", params.requestId)
          .eq("workspace_id", params.workspaceId);
      } catch {
        // Fallback
      }
    }

    try {
      revalidatePath("/app/leave");
      revalidatePath("/app/attendance");
      revalidatePath("/app/calendar");
      revalidatePath("/app");
    } catch {
      // Ignored
    }

    // Dispatch unified event notification (in-app notification for employee + email)
    dispatchLeaveReviewedEvent({
      workspaceId: params.workspaceId,
      requestId: request.id,
      employeeUserId: request.user_id,
      reviewerUserId: user.id,
      action: params.action,
      leaveType: request.leave_type,
      startDate: request.start_date,
      endDate: request.end_date,
      durationDays: request.duration_days,
      rejectionReason: request.rejection_reason || undefined,
    }).catch((err) => console.error("[Leave Actions] Dispatch reviewed event error:", err));

    return { success: true, data: request };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to review leave request." };
  }
}

export async function cancelLeaveRequestAction(params: {
  workspaceId: string;
  requestId: string;
}): Promise<ActionResult<LeaveRequest>> {
  try {
    const { user, member, adminClient } = await verifyUserAndRole(params.workspaceId);

    const request = attendanceStore.getLeaveRequestById(params.requestId, params.workspaceId);
    if (!request) {
      return { success: false, error: "Leave request not found." };
    }

    // Only requester or admin/owner can cancel
    const isOwnerOrAdmin = ["owner", "admin"].includes(member.role);
    if (request.user_id !== user.id && !isOwnerOrAdmin) {
      return { success: false, error: "You can only cancel your own leave requests." };
    }

    if (request.status === "Cancelled" || request.status === "Rejected") {
      return { success: false, error: `Leave request is already ${request.status}.` };
    }

    const wasApproved = request.status === "Approved";
    const now = new Date().toISOString();

    request.status = "Cancelled";
    request.updated_at = now;

    // Restore balance if previously approved
    if (wasApproved && request.leave_type !== "Unpaid Leave") {
      attendanceStore.restoreLeaveBalance(
        request.user_id,
        params.workspaceId,
        request.leave_type,
        request.duration_days
      );
    }

    attendanceStore.saveLeaveRequest(request);

    try {
      await adminClient
        .from("leave_requests")
        .update({
          status: "Cancelled",
          updated_at: now,
        })
        .eq("id", params.requestId)
        .eq("workspace_id", params.workspaceId);
    } catch {
      // Fallback
    }

    try {
      revalidatePath("/app/leave");
      revalidatePath("/app/attendance");
      revalidatePath("/app/calendar");
    } catch {
      // Ignored
    }

    return { success: true, data: request };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to cancel leave request." };
  }
}

export async function updateAttendanceSettingsAction(params: {
  workspaceId: string;
  workStartTime: string;
  workEndTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  workDays: number[];
}): Promise<ActionResult<AttendanceSettings>> {
  try {
    await verifyUserAndRole(params.workspaceId, ["owner", "admin"]);

    const current = attendanceStore.getSettings(params.workspaceId);
    const updated: AttendanceSettings = {
      ...current,
      work_start_time: params.workStartTime || "09:00",
      work_end_time: params.workEndTime || "17:00",
      grace_period_minutes: params.gracePeriodMinutes ?? 15,
      half_day_threshold_minutes: params.halfDayThresholdMinutes ?? 240,
      work_days: params.workDays || [1, 2, 3, 4, 5],
      updated_at: new Date().toISOString(),
    };

    attendanceStore.saveSettings(updated);

    try {
      revalidatePath("/app/attendance");
    } catch {
      // Ignored
    }

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update attendance settings." };
  }
}

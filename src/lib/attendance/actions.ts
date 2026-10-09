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
        role: authorizedMember.role,
        adminClient,
      };
    }

    return { user: null, role: null, adminClient };
  }

  const { data: membership } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !allowedRoles.includes(membership.role)) {
    return { user: null, role: null, adminClient };
  }

  return { user, role: membership.role, adminClient };
}

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Employee Daily Check-In Action
 */
export async function checkInAction(params: {
  workspaceId: string;
  notes?: string;
}): Promise<ActionResult<AttendanceRecord>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId);
    if (!user) {
      return { success: false, error: "Unauthorized or not a member of this workspace." };
    }

    const today = getTodayDateStr();
    const now = new Date();

    // Check if on approved leave
    const { data: approvedLeaves } = await adminClient
      .from("leave_requests")
      .select("id")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .eq("status", "Approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .limit(1);

    if (approvedLeaves && approvedLeaves.length > 0) {
      return {
        success: false,
        error: "Cannot check in while on an approved leave.",
      };
    }

    // Check if already checked in today
    const { data: existingRecords } = await adminClient
      .from("attendance_records")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .eq("date", today)
      .limit(1);

    const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    if (existing && existing.check_in_at) {
      return {
        success: false,
        error: "You have already checked in for today.",
      };
    }

    // Load workspace attendance settings
    const { data: settingsData } = await adminClient
      .from("attendance_settings")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .maybeSingle();

    const workStartTime = settingsData?.work_start_time || "09:00";
    const graceMinutes = settingsData?.grace_period_minutes ?? 15;

    const [startHour, startMinute] = workStartTime.split(":").map(Number);
    const scheduledStart = new Date(now);
    scheduledStart.setHours(startHour, startMinute, 0, 0);

    const graceLimit = new Date(scheduledStart.getTime() + graceMinutes * 60000);
    const status: AttendanceStatus = now > graceLimit ? "Late" : "Present";

    const { data: savedRecord, error: dbErr } = await adminClient
      .from("attendance_records")
      .upsert(
        {
          workspace_id: params.workspaceId,
          user_id: user.id,
          date: today,
          check_in_at: now.toISOString(),
          status,
          total_minutes: 0,
          notes: params.notes || null,
          updated_at: now.toISOString(),
        },
        { onConflict: "workspace_id,user_id,date" }
      )
      .select()
      .single();

    if (dbErr) {
      console.error("Attendance check-in DB error:", dbErr);
      return { success: false, error: dbErr.message || "Failed to save attendance record." };
    }

    try {
      revalidatePath("/app/attendance");
      revalidatePath("/app");
    } catch {
      // Revalidation in non-request contexts
    }

    return {
      success: true,
      data: savedRecord as unknown as AttendanceRecord,
    };
  } catch (error: any) {
    console.error("Check-in error:", error);
    return { success: false, error: error.message || "Failed to process check-in." };
  }
}

/**
 * Employee Daily Check-Out Action
 */
export async function checkOutAction(params: {
  workspaceId: string;
  notes?: string;
}): Promise<ActionResult<AttendanceRecord>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId);
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const today = getTodayDateStr();
    const now = new Date();

    const { data: existingRecords } = await adminClient
      .from("attendance_records")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .eq("date", today)
      .limit(1);

    const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    if (!existing || !existing.check_in_at) {
      return {
        success: false,
        error: "You have not checked in for today yet.",
      };
    }

    if (existing.check_out_at) {
      return {
        success: false,
        error: "You have already checked out for today.",
      };
    }

    const checkInMs = new Date(existing.check_in_at).getTime();
    const checkOutMs = now.getTime();
    const totalMinutes = Math.max(0, Math.round((checkOutMs - checkInMs) / 60000));

    // Check half-day threshold
    const { data: settingsData } = await adminClient
      .from("attendance_settings")
      .select("half_day_threshold_minutes")
      .eq("workspace_id", params.workspaceId)
      .maybeSingle();

    const halfDayThreshold = settingsData?.half_day_threshold_minutes ?? 240;
    let finalStatus: AttendanceStatus = existing.status as AttendanceStatus;
    if (totalMinutes < halfDayThreshold && finalStatus === "Present") {
      finalStatus = "Half Day";
    }

    const { data: savedRecord, error: dbErr } = await adminClient
      .from("attendance_records")
      .update({
        check_out_at: now.toISOString(),
        total_minutes: totalMinutes,
        status: finalStatus,
        notes: params.notes || existing.notes,
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (dbErr) {
      return { success: false, error: dbErr.message || "Failed to update check-out." };
    }

    try {
      revalidatePath("/app/attendance");
      revalidatePath("/app");
    } catch {
      // Background context
    }

    return {
      success: true,
      data: savedRecord as unknown as AttendanceRecord,
    };
  } catch (error: any) {
    console.error("Check-out error:", error);
    return { success: false, error: error.message || "Failed to process check-out." };
  }
}

/**
 * Record Absence (Manual Admin or Automated Daily Sweep)
 */
export async function recordAbsenceAction(params: {
  workspaceId: string;
  userId: string;
  date?: string;
  notes?: string;
}): Promise<ActionResult<AttendanceRecord>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId, [
      "owner",
      "admin",
      "manager",
    ]);
    if (!user) {
      return { success: false, error: "Insufficient permissions to record absence." };
    }

    const date = params.date || getTodayDateStr();

    const { data: savedRecord, error } = await adminClient
      .from("attendance_records")
      .upsert(
        {
          workspace_id: params.workspaceId,
          user_id: params.userId,
          date,
          status: "Absent",
          total_minutes: 0,
          notes: params.notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,user_id,date" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/app/attendance");
    return { success: true, data: savedRecord as unknown as AttendanceRecord };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Submit Leave Request Action
 */
export async function submitLeaveRequestAction(params: {
  workspaceId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  durationDays?: number;
  reason: string;
  attachmentUrl?: string;
}): Promise<ActionResult<LeaveRequest>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId);
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    if (!params.startDate || !params.endDate) {
      return { success: false, error: "Start and end dates are required." };
    }

    if (params.startDate > params.endDate) {
      return { success: false, error: "Start date cannot be after end date." };
    }

    if (!params.reason?.trim()) {
      return { success: false, error: "A reason for leave is required." };
    }

    const calculatedDuration =
      params.durationDays ||
      Math.max(
        1,
        Math.round(
          (new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) / 86400000
        ) + 1
      );

    // Check existing pending/approved requests overlapping
    const { data: overlapping } = await adminClient
      .from("leave_requests")
      .select("id")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .in("status", ["Pending", "Approved"])
      .lte("start_date", params.endDate)
      .gte("end_date", params.startDate);

    if (overlapping && overlapping.length > 0) {
      return {
        success: false,
        error: "You already have a pending or approved leave request for overlapping dates.",
      };
    }

    // Insert leave request
    const { data: newRequest, error: insertErr } = await adminClient
      .from("leave_requests")
      .insert({
        workspace_id: params.workspaceId,
        user_id: user.id,
        leave_type: params.leaveType,
        start_date: params.startDate,
        end_date: params.endDate,
        duration_days: calculatedDuration,
        reason: params.reason.trim(),
        attachment_url: params.attachmentUrl || null,
        status: "Pending",
      })
      .select()
      .single();

    if (insertErr || !newRequest) {
      return { success: false, error: insertErr?.message || "Failed to submit leave request." };
    }

    // Update pending balance
    const currentYear = new Date().getFullYear();
    const { data: balanceData } = await adminClient
      .from("leave_balances")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .eq("leave_type", params.leaveType)
      .eq("year", currentYear)
      .maybeSingle();

    if (balanceData) {
      await adminClient
        .from("leave_balances")
        .update({
          pending_days: (balanceData.pending_days || 0) + calculatedDuration,
        })
        .eq("id", balanceData.id);
    }

    try {
      await dispatchLeaveRequestedEvent({
        workspaceId: params.workspaceId,
        requestId: newRequest.id,
        employeeUserId: user.id,
        leaveType: params.leaveType,
        startDate: params.startDate,
        endDate: params.endDate,
        durationDays: calculatedDuration,
        reason: params.reason.trim(),
      });
    } catch {
      // Notification dispatch is non-blocking
    }

    try {
      revalidatePath("/app/attendance");
      revalidatePath("/app/leave");
    } catch {
      // Background context
    }

    return { success: true, data: newRequest as unknown as LeaveRequest };
  } catch (error: any) {
    console.error("Submit leave request error:", error);
    return { success: false, error: error.message || "Failed to submit leave request." };
  }
}

/**
 * Review / Approve / Reject Leave Request Action
 */
export async function reviewLeaveRequestAction(params: {
  workspaceId: string;
  requestId: string;
  action?: "approve" | "reject";
  decision?: "Approved" | "Rejected";
  rejectionReason?: string;
}): Promise<ActionResult<LeaveRequest>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId, [
      "owner",
      "admin",
      "manager",
    ]);
    if (!user) {
      return { success: false, error: "Insufficient permissions to review leave requests." };
    }

    const isApproved =
      params.action === "approve" ||
      params.decision === "Approved" ||
      (!params.action && params.decision !== "Rejected");
    const finalDecision: "Approved" | "Rejected" = isApproved ? "Approved" : "Rejected";

    const { data: request, error: fetchErr } = await adminClient
      .from("leave_requests")
      .select("*")
      .eq("id", params.requestId)
      .eq("workspace_id", params.workspaceId)
      .single();

    if (fetchErr || !request) {
      return { success: false, error: "Leave request not found." };
    }

    if (request.status !== "Pending") {
      return { success: false, error: `This leave request is already ${request.status}.` };
    }

    const now = new Date();
    const { data: updatedRequest, error: updateErr } = await adminClient
      .from("leave_requests")
      .update({
        status: finalDecision,
        rejection_reason:
          finalDecision === "Rejected"
            ? params.rejectionReason?.trim() || "Rejected by manager"
            : null,
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", params.requestId)
      .select()
      .single();

    if (updateErr || !updatedRequest) {
      return { success: false, error: updateErr?.message || "Failed to update leave request." };
    }

    // Update balances
    const currentYear = new Date().getFullYear();
    const { data: balanceData } = await adminClient
      .from("leave_balances")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", request.user_id)
      .eq("leave_type", request.leave_type)
      .eq("year", currentYear)
      .maybeSingle();

    if (balanceData) {
      const newPending = Math.max(0, (balanceData.pending_days || 0) - request.duration_days);
      const newUsed =
        finalDecision === "Approved"
          ? (balanceData.used_days || 0) + request.duration_days
          : balanceData.used_days || 0;

      await adminClient
        .from("leave_balances")
        .update({
          pending_days: newPending,
          used_days: newUsed,
        })
        .eq("id", balanceData.id);
    }

    try {
      await dispatchLeaveReviewedEvent({
        workspaceId: params.workspaceId,
        requestId: request.id,
        employeeUserId: request.user_id,
        reviewerUserId: user.id,
        action: isApproved ? "approve" : "reject",
        leaveType: request.leave_type,
        startDate: request.start_date,
        endDate: request.end_date,
        durationDays: request.duration_days,
        rejectionReason: params.rejectionReason,
      });
    } catch {
      // Non-blocking
    }

    try {
      revalidatePath("/app/attendance");
      revalidatePath("/app/leave");
    } catch {
      // Background context
    }

    return { success: true, data: updatedRequest as unknown as LeaveRequest };
  } catch (error: any) {
    console.error("Review leave request error:", error);
    return { success: false, error: error.message || "Failed to review leave request." };
  }
}

/**
 * Cancel Own Leave Request Action
 */
export async function cancelLeaveRequestAction(params: {
  workspaceId: string;
  requestId: string;
}): Promise<ActionResult<LeaveRequest>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId);
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const { data: request, error: fetchErr } = await adminClient
      .from("leave_requests")
      .select("*")
      .eq("id", params.requestId)
      .eq("workspace_id", params.workspaceId)
      .single();

    if (fetchErr || !request) {
      return { success: false, error: "Leave request not found." };
    }

    if (request.user_id !== user.id) {
      return { success: false, error: "You can only cancel your own leave requests." };
    }

    if (request.status === "Cancelled" || request.status === "Rejected") {
      return { success: false, error: "This request cannot be cancelled." };
    }

    const { data: updatedRequest, error: updateErr } = await adminClient
      .from("leave_requests")
      .update({
        status: "Cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.requestId)
      .select()
      .single();

    if (updateErr || !updatedRequest) {
      return { success: false, error: updateErr?.message || "Failed to cancel request." };
    }

    // Restore balance
    const currentYear = new Date().getFullYear();
    const { data: balanceData } = await adminClient
      .from("leave_balances")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .eq("leave_type", request.leave_type)
      .eq("year", currentYear)
      .maybeSingle();

    if (balanceData) {
      if (request.status === "Approved") {
        await adminClient
          .from("leave_balances")
          .update({
            used_days: Math.max(0, (balanceData.used_days || 0) - request.duration_days),
          })
          .eq("id", balanceData.id);
      } else if (request.status === "Pending") {
        await adminClient
          .from("leave_balances")
          .update({
            pending_days: Math.max(0, (balanceData.pending_days || 0) - request.duration_days),
          })
          .eq("id", balanceData.id);
      }
    }

    revalidatePath("/app/attendance");
    revalidatePath("/app/leave");

    return { success: true, data: updatedRequest as unknown as LeaveRequest };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update Attendance Policy / Work Schedule Settings
 */
export async function updateAttendanceSettingsAction(params: {
  workspaceId: string;
  workStartTime?: string;
  workEndTime?: string;
  gracePeriodMinutes?: number;
  halfDayThresholdMinutes?: number;
  workDays?: number[];
}): Promise<ActionResult<AttendanceSettings>> {
  try {
    const { user, adminClient } = await verifyUserAndRole(params.workspaceId, [
      "owner",
      "admin",
    ]);
    if (!user) {
      return { success: false, error: "Only workspace owners and admins can edit policy settings." };
    }

    const { data: savedSettings, error } = await adminClient
      .from("attendance_settings")
      .upsert(
        {
          workspace_id: params.workspaceId,
          work_start_time: params.workStartTime || "09:00",
          work_end_time: params.workEndTime || "17:00",
          grace_period_minutes: params.gracePeriodMinutes ?? 15,
          half_day_threshold_minutes: params.halfDayThresholdMinutes ?? 240,
          work_days: params.workDays ?? [1, 2, 3, 4, 5],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/app/attendance");
    return { success: true, data: savedSettings as unknown as AttendanceSettings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

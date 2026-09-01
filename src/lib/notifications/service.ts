/**
 * Ropimo Unified Event Notification Pipeline
 *
 * Coordinates:
 *   Event Trigger → 🔔 In-App Notification + 📧 Resend Email + 📋 Activity Log
 *
 * Non-blocking:
 *   Email or in-app failures are caught and logged; they never fail the primary business action.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationStore } from "./store";
import { CreateNotificationInput } from "@/types/notification";
import {
  sendTaskAssignedEmail,
  sendProjectInvitationEmail,
  sendLeaveRequestedEmail,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
  sendWelcomeEmail,
} from "@/lib/email/resend";

// ─────────────────────────────────────────────────────────────────────────────
// 1. IN-APP NOTIFICATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

export async function createInAppNotification(input: CreateNotificationInput): Promise<void> {
  // Always save in-memory store
  notificationStore.addNotification(input);

  // Persist to Supabase workspace_notifications table
  try {
    const adminClient = createAdminClient();
    await adminClient.from("workspace_notifications").insert({
      workspace_id: input.workspace_id,
      user_id: input.user_id,
      actor_id: input.actor_id || null,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle || null,
      action_url: input.action_url,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      read: false,
    });
  } catch (err) {
    console.warn("[Notification Pipeline] DB insert notice:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UNIFIED EVENT DISPATCHERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 2.1 Task Assigned Event
 */
export async function dispatchTaskAssignedEvent(params: {
  workspaceId: string;
  taskId: string;
  taskTitle: string;
  assignedByUserId: string;
  assigneeUserIds: string[];
  dueDate?: string | null;
  priority?: string | null;
  projectName?: string | null;
  departmentName?: string | null;
}): Promise<void> {
  const {
    workspaceId,
    taskId,
    taskTitle,
    assignedByUserId,
    assigneeUserIds,
    dueDate,
    priority,
    projectName,
    departmentName,
  } = params;

  if (!assigneeUserIds || assigneeUserIds.length === 0) return;

  const adminClient = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const taskUrl = `${appUrl}/app/tasks/${taskId}`;

  // Fetch actor profile & workspace name
  const [{ data: actorProfile }, { data: wsData }, { data: memberProfiles }] = await Promise.all([
    adminClient.from("workspace_members").select("full_name").eq("workspace_id", workspaceId).eq("user_id", assignedByUserId).maybeSingle(),
    adminClient.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
    adminClient.from("workspace_members").select("user_id, full_name, email").eq("workspace_id", workspaceId).in("user_id", assigneeUserIds),
  ]);

  const assignedByName = actorProfile?.full_name || "A team lead";
  const workspaceName = wsData?.name || "Ropimo";

  for (const profile of memberProfiles || []) {
    // Skip self-notification
    if (profile.user_id === assignedByUserId) continue;

    // 1. In-App Notification
    await createInAppNotification({
      workspace_id: workspaceId,
      user_id: profile.user_id,
      actor_id: assignedByUserId,
      actor_name: assignedByName,
      type: "task_assigned",
      title: `Task assigned: "${taskTitle}"`,
      subtitle: projectName ? `Project: ${projectName}` : departmentName ? `Department: ${departmentName}` : "New task assigned to you",
      action_url: `/app/tasks/${taskId}`,
      entity_type: "task",
      entity_id: taskId,
    });

    // 2. Email (Resend)
    if (profile.email) {
      sendTaskAssignedEmail({
        recipientEmail: profile.email,
        recipientName: profile.full_name || profile.email.split("@")[0],
        taskTitle,
        taskUrl,
        workspaceName,
        assignedByName,
        projectName,
        departmentName,
        dueDate,
        priority,
      }).catch((err) => console.error("[Pipeline] Task email error:", err));
    }
  }
}

/**
 * 2.2 Project Member Added Event
 */
export async function dispatchProjectMemberAddedEvent(params: {
  workspaceId: string;
  projectId: string;
  projectName: string;
  projectSlug?: string;
  addedByUserId: string;
  memberUserId: string;
  memberRole?: string;
  departmentName?: string | null;
  projectLeadName?: string | null;
}): Promise<void> {
  const {
    workspaceId,
    projectId,
    projectName,
    projectSlug,
    addedByUserId,
    memberUserId,
    memberRole = "member",
    departmentName,
    projectLeadName,
  } = params;

  if (memberUserId === addedByUserId) return;

  const adminClient = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const projectUrl = `${appUrl}/app/projects/${projectSlug || projectId}`;

  const [{ data: actorProfile }, { data: targetProfile }, { data: wsData }] = await Promise.all([
    adminClient.from("workspace_members").select("full_name").eq("workspace_id", workspaceId).eq("user_id", addedByUserId).maybeSingle(),
    adminClient.from("workspace_members").select("full_name, email").eq("workspace_id", workspaceId).eq("user_id", memberUserId).maybeSingle(),
    adminClient.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
  ]);

  const addedByName = actorProfile?.full_name || "A workspace admin";
  const workspaceName = wsData?.name || "Ropimo";

  // 1. In-App Notification
  await createInAppNotification({
    workspace_id: workspaceId,
    user_id: memberUserId,
    actor_id: addedByUserId,
    actor_name: addedByName,
    type: "project_member_added",
    title: `Added to project: "${projectName}"`,
    subtitle: departmentName ? `Department: ${departmentName}` : "You have been added to this project",
    action_url: `/app/projects/${projectSlug || projectId}`,
    entity_type: "project",
    entity_id: projectId,
  });

  // 2. Email (Resend)
  if (targetProfile?.email) {
    sendProjectInvitationEmail({
      recipientEmail: targetProfile.email,
      recipientName: targetProfile.full_name || targetProfile.email.split("@")[0],
      projectName,
      projectUrl,
      workspaceName,
      addedByName,
      departmentName,
      projectLeadName,
      memberRole,
    }).catch((err) => console.error("[Pipeline] Project email error:", err));
  }
}

/**
 * 2.3 Leave Requested Event (notify approvers)
 */
export async function dispatchLeaveRequestedEvent(params: {
  workspaceId: string;
  requestId: string;
  employeeUserId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string;
}): Promise<void> {
  const {
    workspaceId,
    requestId,
    employeeUserId,
    leaveType,
    startDate,
    endDate,
    durationDays,
    reason,
  } = params;

  const adminClient = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewUrl = `${appUrl}/app/leave`;

  const [{ data: employeeMember }, { data: wsData }, { data: approvers }] = await Promise.all([
    adminClient.from("workspace_members").select("full_name").eq("workspace_id", workspaceId).eq("user_id", employeeUserId).maybeSingle(),
    adminClient.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
    adminClient.from("workspace_members").select("user_id, full_name, email").eq("workspace_id", workspaceId).in("role", ["owner", "admin", "manager"]).limit(5),
  ]);

  const employeeName = employeeMember?.full_name || "An employee";
  const workspaceName = wsData?.name || "Ropimo";

  for (const approver of approvers || []) {
    if (approver.user_id === employeeUserId) continue;

    // 1. In-App Notification
    await createInAppNotification({
      workspace_id: workspaceId,
      user_id: approver.user_id,
      actor_id: employeeUserId,
      actor_name: employeeName,
      type: "leave_requested",
      title: `${employeeName} requested ${leaveType}`,
      subtitle: `${startDate} to ${endDate} (${durationDays} days) · Awaiting approval`,
      action_url: "/app/leave",
      entity_type: "leave",
      entity_id: requestId,
    });

    // 2. Email (Resend)
    if (approver.email) {
      sendLeaveRequestedEmail({
        approverEmail: approver.email,
        approverName: approver.full_name || approver.email.split("@")[0],
        employeeName,
        leaveType,
        startDate,
        endDate,
        durationDays,
        reason,
        reviewUrl,
        workspaceName,
      }).catch((err) => console.error("[Pipeline] Leave requested email error:", err));
    }
  }
}

/**
 * 2.4 Leave Reviewed Event (notify employee of approve/reject)
 */
export async function dispatchLeaveReviewedEvent(params: {
  workspaceId: string;
  requestId: string;
  employeeUserId: string;
  reviewerUserId: string;
  action: "approve" | "reject";
  leaveType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  rejectionReason?: string;
}): Promise<void> {
  const {
    workspaceId,
    requestId,
    employeeUserId,
    reviewerUserId,
    action,
    leaveType,
    startDate,
    endDate,
    durationDays,
    rejectionReason,
  } = params;

  const adminClient = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const dashboardUrl = `${appUrl}/app/leave`;

  const [{ data: reviewerMember }, { data: employeeMember }, { data: wsData }] = await Promise.all([
    adminClient.from("workspace_members").select("full_name").eq("workspace_id", workspaceId).eq("user_id", reviewerUserId).maybeSingle(),
    adminClient.from("workspace_members").select("full_name, email").eq("workspace_id", workspaceId).eq("user_id", employeeUserId).maybeSingle(),
    adminClient.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
  ]);

  const approvedByName = reviewerMember?.full_name || "Your manager";
  const workspaceName = wsData?.name || "Ropimo";
  const isApproved = action === "approve";

  // 1. In-App Notification
  await createInAppNotification({
    workspace_id: workspaceId,
    user_id: employeeUserId,
    actor_id: reviewerUserId,
    actor_name: approvedByName,
    type: isApproved ? "leave_approved" : "leave_rejected",
    title: isApproved ? `Leave approved: ${leaveType}` : `Leave request rejected: ${leaveType}`,
    subtitle: isApproved ? `${startDate} to ${endDate} (${durationDays} days) approved by ${approvedByName}` : rejectionReason || "Request was not approved",
    action_url: "/app/leave",
    entity_type: "leave",
    entity_id: requestId,
  });

  // 2. Email (Resend)
  if (employeeMember?.email) {
    if (isApproved) {
      sendLeaveApprovedEmail({
        recipientEmail: employeeMember.email,
        recipientName: employeeMember.full_name || employeeMember.email.split("@")[0],
        leaveType,
        startDate,
        endDate,
        durationDays,
        approvedByName,
        workspaceName,
        dashboardUrl,
      }).catch((err) => console.error("[Pipeline] Leave approved email error:", err));
    } else {
      sendLeaveRejectedEmail({
        recipientEmail: employeeMember.email,
        recipientName: employeeMember.full_name || employeeMember.email.split("@")[0],
        leaveType,
        startDate,
        endDate,
        rejectionReason: rejectionReason || "No reason provided.",
        rejectedByName: approvedByName,
        workspaceName,
        dashboardUrl,
      }).catch((err) => console.error("[Pipeline] Leave rejected email error:", err));
    }
  }
}

/**
 * 2.5 Invitation Accepted Event (notify admins & send welcome)
 */
export async function dispatchInvitationAcceptedEvent(params: {
  workspaceId: string;
  userId: string;
  email: string;
  fullName: string;
}): Promise<void> {
  const { workspaceId, userId, email, fullName } = params;

  const adminClient = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const [{ data: wsData }, { data: admins }] = await Promise.all([
    adminClient.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
    adminClient.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).in("role", ["owner", "admin"]),
  ]);

  const workspaceName = wsData?.name || "Ropimo";

  // 1. In-App Notification for admins
  for (const admin of admins || []) {
    if (admin.user_id === userId) continue;
    await createInAppNotification({
      workspace_id: workspaceId,
      user_id: admin.user_id,
      actor_id: userId,
      actor_name: fullName,
      type: "invitation_accepted",
      title: `${fullName} joined the workspace`,
      subtitle: `${email} accepted the invitation and joined ${workspaceName}`,
      action_url: "/app/people",
      entity_type: "invitation",
      entity_id: userId,
    });
  }

  // 2. Welcome Email to the new member
  sendWelcomeEmail({
    workspaceName,
    recipientEmail: email,
    recipientName: fullName,
    dashboardUrl: `${appUrl}/app`,
  }).catch((err) => console.error("[Pipeline] Welcome email error:", err));
}

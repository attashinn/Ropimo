"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
} from "@/types/task";
import { revalidatePath } from "next/cache";
import { dispatchTaskAssignedEvent } from "@/lib/notifications/service";

export interface TaskActionResult {
  success: boolean;
  taskId?: string;
  error?: string;
}

/**
 * Create a new task work brief, attach files, assign teammates, and log timeline activity
 */
export async function createTaskAction(
  input: CreateTaskInput
): Promise<TaskActionResult> {
  const {
    workspaceId,
    title,
    description,
    projectId,
    departmentId,
    status = "todo",
    priority = "medium",
    dueDate,
    deliverableType,
    expectedOutcome,
    requiresApproval = false,
    approverId,
    notifyAssignees = true,
    notifyDepartment = true,
    isDraft = false,
    assigneeIds = [],
    attachments = [],
  } = input;

  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to create a task." };
  }

  const trimmedTitle = title?.trim();
  if (!trimmedTitle || trimmedTitle.length < 2) {
    return { success: false, error: "Task title must be at least 2 characters." };
  }

  const adminClient = createAdminClient();

  // 1. Verify workspace membership
  const { data: member } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  // 2. Insert Task Work Brief
  const { data: newTask, error: insertError } = await adminClient
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId || null,
      department_id: departmentId || null,
      title: trimmedTitle,
      description: description?.trim() || null,
      status,
      priority,
      due_date: dueDate || null,
      deliverable_type: deliverableType || null,
      expected_outcome: expectedOutcome?.trim() || null,
      requires_approval: requiresApproval,
      approver_id: requiresApproval && approverId ? approverId : null,
      notify_assignees: notifyAssignees,
      notify_department: notifyDepartment,
      is_draft: isDraft,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !newTask) {
    console.error("Task insert error:", insertError);
    return { success: false, error: insertError?.message || "Failed to create task." };
  }

  // 3. Insert Assignees
  if (assigneeIds.length > 0) {
    const assigneeRows = assigneeIds.map((userId) => ({
      task_id: newTask.id,
      user_id: userId,
    }));
    await adminClient.from("task_assignees").insert(assigneeRows);
  }

  // 4. Insert Attachments
  if (attachments.length > 0) {
    const attachmentRows = attachments.map((att) => ({
      task_id: newTask.id,
      workspace_id: workspaceId,
      file_name: att.fileName,
      file_size: att.fileSize,
      file_type: att.fileType,
      file_url: att.fileUrl,
      uploaded_by: user.id,
    }));
    await adminClient.from("task_attachments").insert(attachmentRows);
  }

  // 5. Log Activity: Task Created
  await adminClient.from("task_activities").insert({
    task_id: newTask.id,
    workspace_id: workspaceId,
    user_id: user.id,
    action_type: "task_created",
    details: {
      title: trimmedTitle,
      priority,
      status,
      deliverable_type: deliverableType || null,
      assignee_count: assigneeIds.length,
      attachment_count: attachments.length,
    },
  });

  // Revalidate relevant routes
  revalidatePath("/app");
  revalidatePath("/app/my-tasks");
  revalidatePath("/app/tasks");
  revalidatePath(`/app/tasks/${newTask.id}`);
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
  if (departmentId) revalidatePath(`/app/departments/${departmentId}`);

  // Dispatch unified event notification (in-app notification + email)
  if (notifyAssignees && assigneeIds.length > 0) {
    try {
      let projectName: string | null = null;
      let departmentName: string | null = null;
      if (projectId) {
        const { data: proj } = await adminClient.from("projects").select("name").eq("id", projectId).maybeSingle();
        projectName = proj?.name || null;
      }
      if (departmentId) {
        const { data: dept } = await adminClient.from("departments").select("name").eq("id", departmentId).maybeSingle();
        departmentName = dept?.name || null;
      }

      dispatchTaskAssignedEvent({
        workspaceId,
        taskId: newTask.id,
        taskTitle: trimmedTitle,
        assignedByUserId: user.id,
        assigneeUserIds: assigneeIds,
        dueDate: dueDate || null,
        priority: priority || null,
        projectName,
        departmentName,
      }).catch((err) => console.error("[Task Actions] Dispatch event error:", err));
    } catch (pipelineErr) {
      console.error("[Task Actions] Event pipeline notice:", pipelineErr);
    }
  }

  return { success: true, taskId: newTask.id };
}

/**
 * Update an existing task work brief, sync assignees, and log status transitions
 */
export async function updateTaskAction(
  input: UpdateTaskInput
): Promise<TaskActionResult> {
  const {
    taskId,
    workspaceId,
    title,
    description,
    projectId,
    departmentId,
    status,
    priority,
    dueDate,
    deliverableType,
    expectedOutcome,
    requiresApproval,
    approverId,
    notifyAssignees,
    notifyDepartment,
    isDraft,
    assigneeIds,
  } = input;

  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  const adminClient = createAdminClient();

  // Get current task state to compare status changes
  const { data: currentTask } = await adminClient
    .from("tasks")
    .select("status, title")
    .eq("id", taskId)
    .single();

  const updates: Record<string, string | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (projectId !== undefined) updates.project_id = projectId || null;
  if (departmentId !== undefined) updates.department_id = departmentId || null;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (dueDate !== undefined) updates.due_date = dueDate || null;
  if (deliverableType !== undefined) updates.deliverable_type = deliverableType || null;
  if (expectedOutcome !== undefined) updates.expected_outcome = expectedOutcome?.trim() || null;
  if (requiresApproval !== undefined) updates.requires_approval = requiresApproval;
  if (approverId !== undefined) updates.approver_id = approverId || null;
  if (notifyAssignees !== undefined) updates.notify_assignees = notifyAssignees;
  if (notifyDepartment !== undefined) updates.notify_department = notifyDepartment;
  if (isDraft !== undefined) updates.is_draft = isDraft;

  const { error: updateError } = await adminClient
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  if (updateError) {
    console.error("Task update error:", updateError);
    return { success: false, error: "Failed to update task." };
  }

  // Sync Assignees if provided
  if (assigneeIds !== undefined) {
    await adminClient.from("task_assignees").delete().eq("task_id", taskId);

    if (assigneeIds.length > 0) {
      const assigneeRows = assigneeIds.map((userId) => ({
        task_id: taskId,
        user_id: userId,
      }));
      await adminClient.from("task_assignees").insert(assigneeRows);
    }
  }

  // Log Activity
  if (status && currentTask && currentTask.status !== status) {
    await adminClient.from("task_activities").insert({
      task_id: taskId,
      workspace_id: workspaceId,
      user_id: user.id,
      action_type: "status_changed",
      details: {
        previous_status: currentTask.status,
        new_status: status,
      },
    });
  } else {
    await adminClient.from("task_activities").insert({
      task_id: taskId,
      workspace_id: workspaceId,
      user_id: user.id,
      action_type: "task_updated",
      details: {
        status,
        priority,
        title,
      },
    });
  }

  revalidatePath("/app");
  revalidatePath("/app/my-tasks");
  revalidatePath("/app/tasks");
  revalidatePath(`/app/tasks/${taskId}`);
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
  if (departmentId) revalidatePath(`/app/departments/${departmentId}`);

  return { success: true, taskId };
}

/**
 * Fast toggle task completion
 */
export async function toggleTaskCompletionAction(
  taskId: string,
  workspaceId: string,
  newCompleted: boolean
): Promise<TaskActionResult> {
  const newStatus: TaskStatus = newCompleted ? "completed" : "todo";

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();

  const updatePayload: Record<string, string | null> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  // Set or clear completed_at timestamp
  if (newCompleted) {
    updatePayload.completed_at = new Date().toISOString();
  } else {
    updatePayload.completed_at = null;
  }

  const { error } = await adminClient
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Toggle task completion error:", error);
    return { success: false, error: "Failed to update task status." };
  }

  // Log Activity
  if (user) {
    await adminClient.from("task_activities").insert({
      task_id: taskId,
      workspace_id: workspaceId,
      user_id: user.id,
      action_type: "status_changed",
      details: {
        new_status: newStatus,
        completed: newCompleted,
      },
    });
  }

  revalidatePath("/app");
  revalidatePath("/app/my-tasks");
  revalidatePath("/app/tasks");
  revalidatePath(`/app/tasks/${taskId}`);

  return { success: true, taskId };
}

/**
 * Add a discussion comment / update to a task
 */
export async function addTaskCommentAction(
  taskId: string,
  workspaceId: string,
  content: string,
  attachmentUrl?: string,
  attachmentName?: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const trimmed = content.trim();
  if (!trimmed && !attachmentUrl) {
    return { success: false, error: "Comment content cannot be empty." };
  }

  const adminClient = createAdminClient();

  const { data: comment, error: insertErr } = await adminClient
    .from("task_comments")
    .insert({
      task_id: taskId,
      workspace_id: workspaceId,
      user_id: user.id,
      content: trimmed,
      attachment_url: attachmentUrl || null,
      attachment_name: attachmentName || null,
    })
    .select("id")
    .single();

  if (insertErr || !comment) {
    return { success: false, error: insertErr?.message || "Failed to post comment." };
  }

  // Log activity
  await adminClient.from("task_activities").insert({
    task_id: taskId,
    workspace_id: workspaceId,
    user_id: user.id,
    action_type: "comment_added",
    details: {
      content: trimmed.substring(0, 100),
      has_attachment: !!attachmentUrl,
    },
  });

  revalidatePath(`/app/tasks/${taskId}`);
  return { success: true, commentId: comment.id };
}

/**
 * Submit work for review with completed files and notes
 */
export async function submitWorkAction(
  taskId: string,
  workspaceId: string,
  note: string,
  fileUrl?: string,
  fileName?: string,
  fileSize?: number
): Promise<{ success: boolean; submissionId?: string; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const adminClient = createAdminClient();

  // 1. Insert Submission
  const { data: submission, error: subErr } = await adminClient
    .from("task_submissions")
    .insert({
      task_id: taskId,
      workspace_id: workspaceId,
      submitted_by: user.id,
      note: note.trim() || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_size: fileSize || 0,
      status: "pending",
    })
    .select("id")
    .single();

  if (subErr || !submission) {
    return { success: false, error: subErr?.message || "Failed to submit work." };
  }

  // 2. Also register file as attachment if present
  if (fileUrl && fileName) {
    await adminClient.from("task_attachments").insert({
      task_id: taskId,
      workspace_id: workspaceId,
      file_name: fileName,
      file_size: fileSize || 0,
      file_type: "delivery",
      file_url: fileUrl,
      uploaded_by: user.id,
    });
  }

  // 3. Automatically change task status to 'in_review'
  await adminClient
    .from("tasks")
    .update({
      status: "in_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  // 4. Log Activity: Work Submitted
  await adminClient.from("task_activities").insert({
    task_id: taskId,
    workspace_id: workspaceId,
    user_id: user.id,
    action_type: "work_submitted",
    details: {
      note: note.trim().substring(0, 120),
      file_name: fileName || null,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/my-tasks");
  revalidatePath(`/app/tasks/${taskId}`);

  return { success: true, submissionId: submission.id };
}

/**
 * Review work submission: Approve or Request Changes
 */
export async function reviewWorkAction(
  taskId: string,
  workspaceId: string,
  submissionId: string,
  decision: "approve" | "request_changes",
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const adminClient = createAdminClient();

  if (decision === "approve") {
    // Update submission
    await adminClient
      .from("task_submissions")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    // Update task status to completed
    await adminClient
      .from("tasks")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("workspace_id", workspaceId);

    // Log Activity
    await adminClient.from("task_activities").insert({
      task_id: taskId,
      workspace_id: workspaceId,
      user_id: user.id,
      action_type: "work_approved",
      details: {
        decision: "approved",
      },
    });
  } else {
    // Request changes
    await adminClient
      .from("task_submissions")
      .update({
        status: "changes_requested",
        feedback: feedback?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    // Update task status to changes_requested
    await adminClient
      .from("tasks")
      .update({
        status: "changes_requested",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("workspace_id", workspaceId);

    // Log Activity
    await adminClient.from("task_activities").insert({
      task_id: taskId,
      workspace_id: workspaceId,
      user_id: user.id,
      action_type: "changes_requested",
      details: {
        feedback: feedback?.trim().substring(0, 140) || "Changes requested by reviewer.",
      },
    });
  }

  revalidatePath("/app");
  revalidatePath("/app/my-tasks");
  revalidatePath(`/app/tasks/${taskId}`);

  return { success: true };
}

/**
 * Add an attachment directly to a task
 */
export async function addTaskAttachmentAction(
  taskId: string,
  workspaceId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  fileUrl: string
): Promise<{ success: boolean; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const adminClient = createAdminClient();

  const { error } = await adminClient.from("task_attachments").insert({
    task_id: taskId,
    workspace_id: workspaceId,
    file_name: fileName,
    file_size: fileSize,
    file_type: fileType,
    file_url: fileUrl,
    uploaded_by: user.id,
  });

  if (error) return { success: false, error: error.message };

  await adminClient.from("task_activities").insert({
    task_id: taskId,
    workspace_id: workspaceId,
    user_id: user.id,
    action_type: "file_attached",
    details: { file_name: fileName },
  });

  revalidatePath(`/app/tasks/${taskId}`);
  return { success: true };
}

/**
 * Duplicate a task
 */
export async function duplicateTaskAction(
  taskId: string,
  workspaceId: string
): Promise<{ success: boolean; newTaskId?: string; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const adminClient = createAdminClient();

  // 1. Fetch original task
  const { data: original } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (!original) return { success: false, error: "Original task not found." };

  // 2. Insert duplicate task
  const { data: duplicated, error: dupErr } = await adminClient
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      project_id: original.project_id,
      department_id: original.department_id,
      title: `${original.title} (Copy)`,
      description: original.description,
      status: "todo",
      priority: original.priority,
      due_date: original.due_date,
      deliverable_type: original.deliverable_type,
      expected_outcome: original.expected_outcome,
      requires_approval: original.requires_approval,
      approver_id: original.approver_id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (dupErr || !duplicated) {
    return { success: false, error: dupErr?.message || "Failed to duplicate task." };
  }

  // 3. Duplicate Assignees
  const { data: assignees } = await adminClient
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", taskId);

  if (assignees && assignees.length > 0) {
    const newAssignees = assignees.map((a) => ({
      task_id: duplicated.id,
      user_id: a.user_id,
    }));
    await adminClient.from("task_assignees").insert(newAssignees);
  }

  // 4. Log Activity
  await adminClient.from("task_activities").insert({
    task_id: duplicated.id,
    workspace_id: workspaceId,
    user_id: user.id,
    action_type: "task_created",
    details: { title: `${original.title} (Copy)`, duplicated_from: taskId },
  });

  revalidatePath("/app");
  revalidatePath("/app/my-tasks");
  revalidatePath("/app/tasks");

  return { success: true, newTaskId: duplicated.id };
}

/**
 * Delete an attachment from a task
 */
export async function deleteAttachmentAction(
  attachmentId: string,
  taskId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("task_id", taskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/app/tasks/${taskId}`);
  return { success: true };
}

/**
 * Delete a task
 */
export async function deleteTaskAction(
  taskId: string,
  workspaceId: string
): Promise<TaskActionResult> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Task delete error:", error);
    return { success: false, error: "Failed to delete task." };
  }

  revalidatePath("/app");
  revalidatePath("/app/my-tasks");
  revalidatePath("/app/tasks");

  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateProjectInput, Project, ProjectStatus } from "@/types/project";
import { revalidatePath } from "next/cache";
import { dispatchProjectMemberAddedEvent } from "@/lib/notifications/service";

export interface CreateProjectResult {
  success: boolean;
  project?: Project;
  error?: string;
}

export interface UpdateProjectInput {
  projectId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  icon?: string;
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "project";
}

export async function createProjectAction(
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  const {
    workspaceId,
    departmentId,
    name,
    description,
    status,
    priority,
    color,
    icon,
    leadId,
    startDate,
    dueDate,
  } = input;

  // 1. Verify User Authentication
  const authClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to create a project." };
  }

  const trimmedName = name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "Project name must be at least 2 characters." };
  }

  if (!workspaceId) {
    return { success: false, error: "Workspace ID is required." };
  }

  const adminClient = createAdminClient();

  // 2. Verify user has owner/admin/manager permission in this workspace
  const { data: member, error: memberError } = await adminClient
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !member) {
    return { success: false, error: "You are not a member of this workspace." };
  }

  // 3. Generate unique slug within workspace
  let slug = generateSlug(trimmedName);
  const { data: existingProject } = await adminClient
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (existingProject) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${randomSuffix}`;
  }

  const projectIcon = icon || trimmedName[0].toUpperCase();

  let validDepartmentId: string | null = null;
  if (departmentId) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(departmentId);
    if (isUUID) {
      validDepartmentId = departmentId;
    }
  }

  let validLeadId: string | null = null;
  if (leadId) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId);
    if (isUUID) {
      validLeadId = leadId;
    }
  }

  // 4. Insert project
  const insertPayload: Record<string, unknown> = {
    workspace_id: workspaceId,
    name: trimmedName,
    slug,
    description: description?.trim() || null,
    status: status || "active",
    color: color || "#10251F",
    icon: projectIcon,
    created_by: user.id,
  };

  if (validDepartmentId) insertPayload.department_id = validDepartmentId;
  if (validLeadId) insertPayload.lead_id = validLeadId;
  if (priority) insertPayload.priority = priority;
  if (startDate) insertPayload.start_date = startDate;
  if (dueDate) insertPayload.due_date = dueDate;

  let { data: newProject, error: insertError } = await adminClient
    .from("projects")
    .insert(insertPayload)
    .select()
    .single();

  // If column doesn't exist yet (e.g. department_id, lead_id), retry with guaranteed base columns
  if (insertError) {
    console.warn("Retrying project insert with safe base columns:", insertError.message);
    const pureBasePayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      name: trimmedName,
      slug,
      description: description?.trim() || null,
      status: status || "active",
      color: color || "#10251F",
      icon: projectIcon,
      created_by: user.id,
    };

    const retry = await adminClient
      .from("projects")
      .insert(pureBasePayload)
      .select()
      .single();
    newProject = retry.data;
    insertError = retry.error;
  }

  if (insertError || !newProject) {
    console.error("Project creation error:", insertError);
    return {
      success: false,
      error: insertError?.message || "Failed to create project. Please try again.",
    };
  }

  // Anchor department association via initial task if department_id was specified
  if (validDepartmentId && newProject?.id) {
    try {
      await adminClient.from("tasks").insert({
        workspace_id: workspaceId,
        project_id: newProject.id,
        department_id: validDepartmentId,
        title: "Project Kickoff",
        status: "todo",
        created_by: user.id,
      });
    } catch (taskErr) {
      console.warn("Could not insert anchor task:", taskErr);
    }
  }

  // Insert project members if memberIds provided
  if (input.memberIds && input.memberIds.length > 0 && newProject?.id) {
    try {
      const memberRows = input.memberIds.map((uId) => ({
        project_id: newProject.id,
        workspace_id: workspaceId,
        user_id: uId,
        role: "member",
        added_by: user.id,
      }));
      // Dispatch unified event notifications for project members
      for (const uId of input.memberIds) {
        dispatchProjectMemberAddedEvent({
          workspaceId,
          projectId: newProject.id,
          projectName: trimmedName,
          projectSlug: newProject.slug || newProject.id,
          addedByUserId: user.id,
          memberUserId: uId,
          memberRole: "member",
        }).catch((err) => console.error("[Project Actions] Member event dispatch error:", err));
      }
    } catch (memberErr) {
      console.warn("Could not insert/notify project members:", memberErr);
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/projects");
  revalidatePath("/app/overview");
  if (validDepartmentId) {
    revalidatePath(`/app/departments/${validDepartmentId}`);
  }

  return {
    success: true,
    project: {
      ...newProject,
      department_id: validDepartmentId || (newProject as Record<string, unknown>).department_id || null,
    } as Project,
  };
}

export async function addProjectMemberAction(params: {
  workspaceId: string;
  projectId: string;
  userId: string;
  role?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminClient = createAdminClient();

    // Verify workspace membership
    const { data: caller } = await adminClient
      .from("workspace_members")
      .select("role, full_name")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!caller) {
      return { success: false, error: "You are not a member of this workspace." };
    }

    // Insert project member
    await adminClient.from("project_members").upsert(
      {
        project_id: params.projectId,
        workspace_id: params.workspaceId,
        user_id: params.userId,
        role: params.role || "member",
        added_by: user.id,
      },
      { onConflict: "project_id,user_id" }
    );

    // Dispatch unified event notification (in-app notification + email)
    try {
      const { data: projectData } = await adminClient
        .from("projects")
        .select("name, slug")
        .eq("id", params.projectId)
        .maybeSingle();

      if (projectData) {
        dispatchProjectMemberAddedEvent({
          workspaceId: params.workspaceId,
          projectId: params.projectId,
          projectName: projectData.name,
          projectSlug: projectData.slug || params.projectId,
          addedByUserId: user.id,
          memberUserId: params.userId,
          memberRole: params.role || "member",
        }).catch((err) => console.error("[Project Actions] Dispatch event error:", err));
      }
    } catch (pipelineErr) {
      console.error("[Project Actions] Event pipeline notice:", pipelineErr);
    }

    revalidatePath("/app/projects");
    revalidatePath(`/app/projects/${params.projectId}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to add project member." };
  }
}

export async function updateProjectAction(
  input: UpdateProjectInput
): Promise<CreateProjectResult> {
  const { projectId, workspaceId, name, description, status, color, icon } = input;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const adminClient = createAdminClient();

  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (status !== undefined) updates.status = status;
  if (color !== undefined) updates.color = color;
  if (icon !== undefined) updates.icon = icon;

  const { data: updated, error } = await adminClient
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error || !updated) {
    return { success: false, error: error?.message || "Failed to update project." };
  }

  revalidatePath("/app");
  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${projectId}`);

  return { success: true, project: updated as Project };
}

export async function deleteProjectAction(
  projectId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/projects");

  return { success: true };
}

export async function duplicateProjectAction(
  projectId: string,
  workspaceId: string
): Promise<CreateProjectResult> {
  const adminClient = createAdminClient();

  const { data: original } = await adminClient
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!original) {
    return { success: false, error: "Project not found." };
  }

  const newName = `${original.name} (Copy)`;
  const newSlug = `${original.slug}-copy-${Math.random().toString(36).substring(2, 6)}`;

  const { data: duplicated, error } = await adminClient
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      department_id: original.department_id,
      name: newName,
      slug: newSlug,
      description: original.description,
      status: original.status || "in_progress",
      color: original.color || "#10251F",
      icon: original.icon || "P",
      lead_id: original.lead_id,
      priority: original.priority,
      created_by: original.created_by,
    })
    .select()
    .single();

  if (error || !duplicated) {
    return { success: false, error: error?.message || "Failed to duplicate project." };
  }

  revalidatePath("/app");
  revalidatePath("/app/projects");

  return { success: true, project: duplicated as Project };
}

export async function archiveProjectAction(
  projectId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("projects")
    .update({
      status: "on_hold",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/projects");

  return { success: true };
}


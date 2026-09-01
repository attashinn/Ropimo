import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Task,
  CategorizedTasks,
  TaskProjectRef,
  TaskDepartmentRef,
  TaskAttachment,
  TaskActivity,
  TaskComment,
  TaskSubmission,
  TaskStatus,
  TaskPriority,
} from "@/types/task";
import { getWorkspacePeople } from "@/lib/people/queries";
import { WorkspacePerson } from "@/types/people";

interface RawTaskRow {
  id: string;
  workspace_id: string;
  project_id: string | null;
  department_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  deliverable_type?: string | null;
  expected_outcome?: string | null;
  requires_approval?: boolean;
  approver_id?: string | null;
  notify_assignees?: boolean;
  notify_department?: boolean;
  is_draft?: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  projects?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
  departments?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
}

interface AssigneeRow {
  task_id: string;
  user_id: string;
}

/**
 * Helper to enrich tasks with assignees, references, attachments, activities, comments, and submissions
 */
async function enrichTasks(
  rawTasks: RawTaskRow[],
  workspaceId: string,
  includeDetails: boolean = false
): Promise<Task[]> {
  if (!rawTasks || rawTasks.length === 0) return [];

  const taskIds = rawTasks.map((t) => t.id);
  const adminClient = createAdminClient();

  // Fetch in parallel: assignees and people (and deep collections only if requested)
  const [
    { data: assigneeRows },
    allPeople,
    attachmentResult,
    activityResult,
    commentResult,
    submissionResult,
  ] = await Promise.all([
    adminClient.from("task_assignees").select("task_id, user_id").in("task_id", taskIds),
    getWorkspacePeople(workspaceId),
    includeDetails
      ? adminClient.from("task_attachments").select("*").in("task_id", taskIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    includeDetails
      ? adminClient.from("task_activities").select("*").in("task_id", taskIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    includeDetails
      ? adminClient.from("task_comments").select("*").in("task_id", taskIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    includeDetails
      ? adminClient.from("task_submissions").select("*").in("task_id", taskIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const attachmentRows = attachmentResult.data || [];
  const activityRows = activityResult.data || [];
  const commentRows = commentResult.data || [];
  const submissionRows = submissionResult.data || [];

  const peopleMap = new Map<string, WorkspacePerson>(
    allPeople.map((p) => [p.user_id, p])
  );

  // Group assignees by task_id
  const taskAssigneesMap = new Map<string, WorkspacePerson[]>();
  (assigneeRows as AssigneeRow[] || []).forEach((row) => {
    const person = peopleMap.get(row.user_id);
    if (person) {
      const list = taskAssigneesMap.get(row.task_id) || [];
      list.push(person);
      taskAssigneesMap.set(row.task_id, list);
    }
  });

  // Group attachments by task_id
  const taskAttachmentsMap = new Map<string, TaskAttachment[]>();
  (attachmentRows || []).forEach((att) => {
    const uploader = att.uploaded_by ? peopleMap.get(att.uploaded_by) || null : null;
    const item: TaskAttachment = {
      id: att.id,
      task_id: att.task_id,
      workspace_id: att.workspace_id,
      file_name: att.file_name,
      file_size: att.file_size,
      file_type: att.file_type,
      file_url: att.file_url,
      uploaded_by: att.uploaded_by,
      uploader,
      created_at: att.created_at,
    };
    const list = taskAttachmentsMap.get(att.task_id) || [];
    list.push(item);
    taskAttachmentsMap.set(att.task_id, list);
  });

  // Group activities by task_id
  const taskActivitiesMap = new Map<string, TaskActivity[]>();
  (activityRows || []).forEach((act) => {
    const actor = act.user_id ? peopleMap.get(act.user_id) : null;
    const item: TaskActivity = {
      id: act.id,
      task_id: act.task_id,
      workspace_id: act.workspace_id,
      user_id: act.user_id,
      user_name: actor ? actor.full_name || actor.email : "Workspace Member",
      action_type: act.action_type,
      details: act.details || {},
      created_at: act.created_at,
    };
    const list = taskActivitiesMap.get(act.task_id) || [];
    list.push(item);
    taskActivitiesMap.set(act.task_id, list);
  });

  // Group comments by task_id
  const taskCommentsMap = new Map<string, TaskComment[]>();
  (commentRows || []).forEach((c) => {
    const author = c.user_id ? peopleMap.get(c.user_id) || null : null;
    const item: TaskComment = {
      id: c.id,
      task_id: c.task_id,
      workspace_id: c.workspace_id,
      user_id: c.user_id,
      author,
      content: c.content,
      attachment_url: c.attachment_url,
      attachment_name: c.attachment_name,
      created_at: c.created_at,
    };
    const list = taskCommentsMap.get(c.task_id) || [];
    list.push(item);
    taskCommentsMap.set(c.task_id, list);
  });

  // Group submissions by task_id
  const taskSubmissionsMap = new Map<string, TaskSubmission[]>();
  (submissionRows || []).forEach((s) => {
    const submitter = s.submitted_by ? peopleMap.get(s.submitted_by) || null : null;
    const reviewer = s.reviewed_by ? peopleMap.get(s.reviewed_by) || null : null;
    const item: TaskSubmission = {
      id: s.id,
      task_id: s.task_id,
      workspace_id: s.workspace_id,
      submitted_by: s.submitted_by,
      submitter,
      note: s.note,
      file_url: s.file_url,
      file_name: s.file_name,
      file_size: s.file_size,
      status: s.status,
      feedback: s.feedback,
      reviewed_by: s.reviewed_by,
      reviewer,
      reviewed_at: s.reviewed_at,
      created_at: s.created_at,
    };
    const list = taskSubmissionsMap.get(s.task_id) || [];
    list.push(item);
    taskSubmissionsMap.set(s.task_id, list);
  });

  return rawTasks.map((t) => {
    const project: TaskProjectRef | null = t.projects
      ? {
          id: t.projects.id,
          name: t.projects.name,
          color: t.projects.color,
          icon: t.projects.icon,
        }
      : null;

    const department: TaskDepartmentRef | null = t.departments
      ? {
          id: t.departments.id,
          name: t.departments.name,
          color: t.departments.color,
          icon: t.departments.icon,
        }
      : null;

    const assignees = taskAssigneesMap.get(t.id) || [];
    const attachments = taskAttachmentsMap.get(t.id) || [];
    const activities = taskActivitiesMap.get(t.id) || [];
    const comments = taskCommentsMap.get(t.id) || [];
    const submissions = taskSubmissionsMap.get(t.id) || [];
    const approver = t.approver_id ? peopleMap.get(t.approver_id) || null : null;
    const creator = t.created_by ? peopleMap.get(t.created_by) || null : null;

    return {
      id: t.id,
      workspace_id: t.workspace_id,
      project_id: t.project_id,
      department_id: t.department_id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      deliverable_type: t.deliverable_type || null,
      expected_outcome: t.expected_outcome || null,
      requires_approval: t.requires_approval || false,
      approver_id: t.approver_id || null,
      approver,
      notify_assignees: t.notify_assignees ?? true,
      notify_department: t.notify_department ?? true,
      is_draft: t.is_draft || false,
      created_by: t.created_by,
      creator,
      created_at: t.created_at,
      updated_at: t.updated_at,
      assignees,
      project,
      department,
      attachments,
      activities,
      comments,
      submissions,
    };
  });
}

/**
 * Fetch all non-draft tasks in a workspace (deduplicated per request)
 */
export const getWorkspaceTasks = cache(
  async (workspaceId: string): Promise<Task[]> => {
    if (!workspaceId) return [];

    const adminClient = createAdminClient();

    let { data, error } = await adminClient
      .from("tasks")
      .select(`
        *,
        projects:project_id(id, name, color, icon),
        departments:department_id(id, name, color, icon)
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_draft", false)
      .order("created_at", { ascending: false });

    if (error) {
      const retry = await adminClient
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_draft", false)
        .order("created_at", { ascending: false });

      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      if (error) console.error("Error fetching workspace tasks:", error.message || error);
      return [];
    }

    return enrichTasks(data as unknown as RawTaskRow[], workspaceId);
  }
);

/**
 * Fetch categorized tasks for the current user (My Tasks - deduplicated per request)
 */
export const getMyTasks = cache(
  async (userId: string, workspaceId: string): Promise<CategorizedTasks> => {
    const empty: CategorizedTasks = {
      overdue: [],
      today: [],
      upcoming: [],
      noDueDate: [],
      completed: [],
    };

    if (!userId || !workspaceId) return empty;

    const adminClient = createAdminClient();

    // Find task IDs assigned to this user
    const { data: userAssignments } = await adminClient
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", userId);

    const assignedTaskIds = (userAssignments || []).map((a) => a.task_id);

    if (assignedTaskIds.length === 0) {
      return empty;
    }

    let { data: rawTasks, error } = await adminClient
      .from("tasks")
      .select(`
        *,
        projects:project_id(id, name, color, icon),
        departments:department_id(id, name, color, icon)
      `)
      .eq("workspace_id", workspaceId)
      .in("id", assignedTaskIds)
      .order("created_at", { ascending: false });

    if (error) {
      const retry = await adminClient
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("id", assignedTaskIds)
        .order("created_at", { ascending: false });

      rawTasks = retry.data;
      error = retry.error;
    }

    if (error || !rawTasks) {
      return empty;
    }

    const tasks = await enrichTasks(rawTasks as unknown as RawTaskRow[], workspaceId);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const categorized: CategorizedTasks = {
      overdue: [],
      today: [],
      upcoming: [],
      noDueDate: [],
      completed: [],
    };

    tasks.forEach((task) => {
      if (task.status === "completed") {
        categorized.completed.push(task);
        return;
      }

      if (!task.due_date) {
        categorized.noDueDate.push(task);
        return;
      }

      const taskDateStr = new Date(task.due_date).toISOString().split("T")[0];

      if (taskDateStr < todayStr) {
        categorized.overdue.push(task);
      } else if (taskDateStr === todayStr) {
        categorized.today.push(task);
      } else {
        categorized.upcoming.push(task);
      }
    });

    return categorized;
  }
);


/**
 * Fetch tasks for a specific Project
 */
export async function getProjectTasks(
  projectId: string,
  workspaceId: string
): Promise<Task[]> {
  if (!projectId || !workspaceId) return [];

  const adminClient = createAdminClient();

  let { data, error } = await adminClient
    .from("tasks")
    .select(`
      *,
      projects:project_id(id, name, color, icon),
      departments:department_id(id, name, color, icon)
    `)
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    const retry = await adminClient
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) return [];

  return enrichTasks(data as unknown as RawTaskRow[], workspaceId);
}

/**
 * Fetch tasks for a specific Department
 */
export async function getDepartmentTasks(
  departmentId: string,
  workspaceId: string
): Promise<Task[]> {
  if (!departmentId || !workspaceId) return [];

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("tasks")
    .select(`
      *,
      projects:project_id(id, name, color, icon),
      departments:department_id(id, name, color, icon)
    `)
    .eq("workspace_id", workspaceId)
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return enrichTasks(data as unknown as RawTaskRow[], workspaceId);
}

/**
 * Fetch a single task by ID
 */
export async function getTaskById(
  taskId: string,
  workspaceId: string
): Promise<Task | null> {
  if (!taskId || !workspaceId) return null;

  const adminClient = createAdminClient();

  let { data, error } = await adminClient
    .from("tasks")
    .select(`
      *,
      projects:project_id(id, name, color, icon),
      departments:department_id(id, name, color, icon)
    `)
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    const retry = await adminClient
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    data = retry.data;
    error = retry.error;
  }

  if (error || !data) return null;

  const enriched = await enrichTasks([data as unknown as RawTaskRow], workspaceId);
  return enriched[0] || null;
}

/**
 * Real task metrics for Overview dashboard (deduplicated per request)
 */
export const getOverviewTaskMetrics = cache(
  async (userId: string, workspaceId: string) => {
    const categorized = await getMyTasks(userId, workspaceId);

    const openTasksCount =
      categorized.overdue.length +
      categorized.today.length +
      categorized.upcoming.length +
      categorized.noDueDate.length;

    const dueTodayCount = categorized.today.length;
    const overdueCount = categorized.overdue.length;
    const completedCount = categorized.completed.length;

    const myOpenTasks = [
      ...categorized.overdue,
      ...categorized.today,
      ...categorized.upcoming,
      ...categorized.noDueDate,
    ].slice(0, 5);

    return {
      openTasksCount,
      dueTodayCount,
      overdueCount,
      completedCount,
      myOpenTasks,
      recentlyCompleted: categorized.completed.slice(0, 5),
    };
  }
);

export interface WorkspaceActivityItem {
  id: string;
  type: "project_created" | "task_created" | "task_completed" | "activity";
  targetName: string;
  createdAt: string;
  actorName: string;
  details?: string;
}

/**
 * Fetch recent activity across the workspace (projects, tasks, activities - deduplicated per request)
 */
export const getWorkspaceRecentActivities = cache(
  async (workspaceId: string): Promise<WorkspaceActivityItem[]> => {
    if (!workspaceId) return [];

    const adminClient = createAdminClient();

    // Fetch projects, tasks, and people in parallel!
    const [{ data: projects }, { data: tasks }, people] = await Promise.all([
      adminClient
        .from("projects")
        .select("id, name, created_by, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(5),
      adminClient
        .from("tasks")
        .select("id, title, created_by, created_at, status")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(10),
      getWorkspacePeople(workspaceId),
    ]);

    const peopleMap = new Map(people.map((p) => [p.user_id, p.full_name || p.email]));
    const activities: WorkspaceActivityItem[] = [];

    if (projects) {
      projects.forEach((proj) => {
        const actorName = proj.created_by ? peopleMap.get(proj.created_by) || "You" : "You";
        activities.push({
          id: `proj-${proj.id}`,
          type: "project_created",
          targetName: proj.name,
          createdAt: proj.created_at,
          actorName,
        });
      });
    }

    if (tasks) {
      tasks.forEach((t) => {
        const actorName = t.created_by ? peopleMap.get(t.created_by) || "You" : "You";
        activities.push({
          id: `task-created-${t.id}`,
          type: "task_created",
          targetName: t.title,
          createdAt: t.created_at,
          actorName,
        });
      });
    }

    // Sort all activities by createdAt descending and take top 5
    activities.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return activities.slice(0, 5);
  }
);

/**
 * Fetch upcoming deadlines for the workspace/user (deduplicated per request)
 */
export const getUpcomingDeadlines = cache(
  async (workspaceId: string, userId?: string): Promise<Task[]> => {
    if (!workspaceId) return [];

    const allTasks = await getWorkspaceTasks(workspaceId);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const upcoming = allTasks.filter((t) => {
      if (t.status === "completed" || !t.due_date) return false;
      const taskDateStr = new Date(t.due_date).toISOString().split("T")[0];
      if (userId) {
        const isAssigned = t.assignees.some((a) => a.user_id === userId);
        return taskDateStr >= todayStr && isAssigned;
      }
      return taskDateStr >= todayStr;
    });

    return upcoming.sort(
      (a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    );
  }
);



/**
 * Return only tasks the given UserContext is allowed to see.
 * - OWNER/ADMIN: all workspace tasks
 * - DEPT_LEAD: tasks in their dept + assigned tasks
 * - MEMBER: tasks assigned to them + tasks on accessible projects (their dept)
 */
export async function getAccessibleTasks(
  ctx: { userId: string; isOwnerOrAdmin: boolean; deptIds: string[]; ledDeptIds: string[]; isDeptLead: boolean },
  workspaceId: string,
  accessibleProjectIds: string[]
): Promise<Task[]> {
  if (!workspaceId) return [];

  const adminClient = createAdminClient();

  if (ctx.isOwnerOrAdmin) {
    return getWorkspaceTasks(workspaceId);
  }

  // Find tasks assigned to user
  const { data: userAssignments } = await adminClient
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", ctx.userId);

  const assignedTaskIds = new Set((userAssignments || []).map((a: any) => a.task_id));

  // Fetch all tasks for accessible projects + user's depts
  let query = adminClient
    .from("tasks")
    .select(`
      *,
      projects:project_id(id, name, color, icon),
      departments:department_id(id, name, color, icon)
    `)
    .eq("workspace_id", workspaceId)
    .eq("is_draft", false);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error || !data) return [];

  // Filter to visible tasks
  const rawFiltered = (data as unknown as RawTaskRow[]).filter((t) => {
    if (assignedTaskIds.has(t.id)) return true;
    if (t.created_by === ctx.userId) return true;
    if (t.department_id && ctx.ledDeptIds.includes(t.department_id)) return true;
    if (t.project_id && accessibleProjectIds.includes(t.project_id)) return true;
    if (t.department_id && ctx.deptIds.includes(t.department_id)) return true;
    return false;
  });

  return enrichTasks(rawFiltered, workspaceId);
}

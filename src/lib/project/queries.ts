import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Project } from "@/types/project";

/**
 * Default/fallback project data — used ONLY by the Projects directory page
 * for demonstration when no real workspace is connected.
 * DO NOT use inside getWorkspaceProjects.
 */
export const DEFAULT_PROJECTS_DATA: Project[] = [
  {
    id: "proj-ropimo",
    workspace_id: "ws-default",
    name: "Ropimo Platform",
    slug: "ropimo-platform",
    description: "Internal company operating system",
    status: "in_progress",
    priority: "high",
    color: "#10251F",
    icon: "R",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    manager_id: "u-tashin",
    manager_name: "Tashin Khan",
    client_name: "Internal Product",
    budget: "$45,000",
    start_date: "2026-08-01T00:00:00Z",
    due_date: "2026-08-30T00:00:00Z",
    deadline: "2026-08-30T00:00:00Z",
    progress: 75,
    completed_tasks: 18,
    total_tasks: 24,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "proj-muntajar",
    workspace_id: "ws-default",
    name: "Muntajar Website",
    slug: "muntajar-website",
    description: "Main marketing website",
    status: "in_progress",
    priority: "medium",
    color: "#EA580C",
    icon: "M",
    department_id: "dept-design",
    department_name: "Design",
    department_color: "#B58500",
    manager_id: "u-sarah",
    manager_name: "Sarah Ahmed",
    client_name: "Muntajar Inc",
    budget: "$18,500",
    start_date: "2026-08-05T00:00:00Z",
    due_date: "2026-08-25T00:00:00Z",
    deadline: "2026-08-25T00:00:00Z",
    progress: 60,
    completed_tasks: 12,
    total_tasks: 20,
    created_at: "2026-08-05T00:00:00Z",
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "proj-dashboard",
    workspace_id: "ws-default",
    name: "Client Dashboard",
    slug: "client-dashboard",
    description: "Client portal and dashboard",
    status: "in_progress",
    priority: "high",
    color: "#1E293B",
    icon: "C",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    manager_id: "u-arafath",
    manager_name: "Arafath Hossain",
    client_name: "Apex Global",
    budget: "$32,000",
    start_date: "2026-08-10T00:00:00Z",
    due_date: "2026-09-10T00:00:00Z",
    deadline: "2026-09-10T00:00:00Z",
    progress: 40,
    completed_tasks: 9,
    total_tasks: 22,
    created_at: "2026-08-10T00:00:00Z",
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "proj-video",
    workspace_id: "ws-default",
    name: "Video Production Studio",
    slug: "video-production-studio",
    description: "Internal video production projects",
    status: "on_hold",
    priority: "medium",
    color: "#7C3AED",
    icon: "V",
    department_id: "dept-video",
    department_name: "Video Production",
    department_color: "#C2410C",
    manager_id: "u-rahim",
    manager_name: "Rahim Hasan",
    client_name: "Creative Media",
    budget: "$22,000",
    start_date: "2026-08-01T00:00:00Z",
    due_date: "2026-08-28T00:00:00Z",
    deadline: "2026-08-28T00:00:00Z",
    progress: 80,
    completed_tasks: 16,
    total_tasks: 20,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "proj-brand",
    workspace_id: "ws-default",
    name: "Brand Identity",
    slug: "brand-identity",
    description: "Company branding and guidelines",
    status: "completed",
    priority: "low",
    color: "#DB2777",
    icon: "B",
    department_id: "dept-design",
    department_name: "Design",
    department_color: "#B58500",
    manager_id: "u-fatema",
    manager_name: "Fatema Islam",
    client_name: "Ropimo Inc",
    budget: "$12,000",
    start_date: "2026-07-15T00:00:00Z",
    due_date: "2026-08-12T00:00:00Z",
    deadline: "2026-08-12T00:00:00Z",
    progress: 100,
    completed_tasks: 14,
    total_tasks: 14,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "proj-avirohost",
    workspace_id: "ws-default",
    name: "Avirohost Platform",
    slug: "avirohost-platform",
    description: "Hosting platform development",
    status: "in_progress",
    priority: "urgent",
    color: "#0D9488",
    icon: "A",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    manager_id: "u-tashin",
    manager_name: "Tashin Khan",
    client_name: "Aviro Cloud",
    budget: "$60,000",
    start_date: "2026-08-12T00:00:00Z",
    due_date: "2026-09-20T00:00:00Z",
    deadline: "2026-09-20T00:00:00Z",
    progress: 30,
    completed_tasks: 7,
    total_tasks: 25,
    created_at: "2026-08-12T00:00:00Z",
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "proj-social",
    workspace_id: "ws-default",
    name: "Social Media Campaign",
    slug: "social-media-campaign",
    description: "Marketing campaign Q3",
    status: "in_progress",
    priority: "medium",
    color: "#78350F",
    icon: "S",
    department_id: "dept-marketing",
    department_name: "Marketing",
    department_color: "#7E22CE",
    manager_id: "u-sarah",
    manager_name: "Sarah Ahmed",
    client_name: "Growth Labs",
    budget: "$15,000",
    start_date: "2026-08-01T00:00:00Z",
    due_date: "2026-08-22T00:00:00Z",
    deadline: "2026-08-22T00:00:00Z",
    progress: 50,
    completed_tasks: 10,
    total_tasks: 20,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "proj-hr",
    workspace_id: "ws-default",
    name: "HR Management System",
    slug: "hr-management-system",
    description: "Employee management system",
    status: "in_progress",
    priority: "medium",
    color: "#2563EB",
    icon: "H",
    department_id: "dept-ops",
    department_name: "Operations",
    department_color: "#D97706",
    manager_id: "u-tanjir",
    manager_name: "Munshi Tanjir",
    client_name: "Internal HR",
    budget: "$25,000",
    start_date: "2026-08-15T00:00:00Z",
    due_date: "2026-10-05T00:00:00Z",
    deadline: "2026-10-05T00:00:00Z",
    progress: 20,
    completed_tasks: 5,
    total_tasks: 18,
    created_at: "2026-08-15T00:00:00Z",
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

interface DBProjectRow extends Record<string, unknown> {
  id: string;
  workspace_id: string;
  department_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  priority?: string;
  color: string;
  icon: string;
  lead_id?: string | null;
  manager_id?: string | null;
  client_name?: string | null;
  budget?: string | number | null;
  start_date?: string | null;
  due_date?: string | null;
  deadline?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  departments?: { id: string; name: string; color: string; icon: string } | null;
}

/**
 * Fetch all projects for a specific workspace (deduplicated per request).
 * Returns ONLY real Supabase data — no fake fallbacks.
 * Returns empty array when the workspace genuinely has no projects.
 * Returns empty array when the user is not authenticated.
 */
export const getWorkspaceProjects = cache(
  async (workspaceId: string): Promise<Project[]> => {
    if (!workspaceId) return [];

    let isAuthed = true;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) isAuthed = false;
    } catch {
      // CLI / background script context
    }

    if (!isAuthed) return [];

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching workspace projects:", error?.message || error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const rows = data as unknown as DBProjectRow[];

    // Fetch departments separately to map names and colors safely
    const deptMap = new Map<string, { id: string; name: string; color: string; icon: string }>();
    const projDeptFromTasksMap = new Map<string, string>();
    try {
      const [{ data: depts }, { data: tasksWithDept }] = await Promise.all([
        adminClient
          .from("departments")
          .select("id, name, color, icon")
          .eq("workspace_id", workspaceId),
        adminClient
          .from("tasks")
          .select("project_id, department_id")
          .eq("workspace_id", workspaceId)
          .not("department_id", "is", null)
          .not("project_id", "is", null),
      ]);

      if (depts) {
        depts.forEach((d) => deptMap.set(d.id, d));
      }
      (tasksWithDept || []).forEach((t) => {
        if (t.project_id && t.department_id) {
          projDeptFromTasksMap.set(t.project_id, t.department_id);
        }
      });
    } catch {
      // ignore
    }

    return rows.map((r) => {
      const resolvedDeptId = r.department_id || projDeptFromTasksMap.get(r.id) || null;
      const dept = resolvedDeptId ? deptMap.get(resolvedDeptId) : undefined;
      const deptName = r.departments?.name ?? dept?.name ?? null;
      const deptColor = r.departments?.color ?? dept?.color ?? null;
      // Normalize "active" → "in_progress" since the DB uses "active" but the type uses "in_progress"
      const status = (r.status === "active" ? "in_progress" : r.status) as Project["status"];

      return {
        id: r.id,
        workspace_id: r.workspace_id,
        department_id: resolvedDeptId,
        department_name: deptName,
        department_color: deptColor,
        name: r.name,
        slug: r.slug,
        description: r.description ?? null,
        status: status || "in_progress",
        priority: (r.priority || "medium") as Project["priority"],
        color: r.color || "#10251F",
        icon: r.icon || (r.name ? r.name[0].toUpperCase() : "P"),
        manager_id: r.lead_id || r.manager_id || null,
        manager_name: null,
        client_name: r.client_name ?? null,
        budget: r.budget ?? null,
        start_date: r.start_date ?? null,
        due_date: r.due_date ?? r.deadline ?? null,
        deadline: r.due_date ?? r.deadline ?? null,
        // task counts start at 0 — getOverviewData enriches them from real task data
        progress: 0,
        completed_tasks: 0,
        total_tasks: 0,
        // member_ids start empty — getOverviewData fills from task assignees
        member_ids: [],
        created_by: r.created_by ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });
  }
);

/**
 * Fetch a specific project by ID and verify it belongs to the workspace.
 * Resolves department and manager names accurately.
 */
export async function getProjectById(
  projectId: string,
  workspaceId: string
): Promise<Project | null> {
  if (!projectId || !workspaceId) return null;

  const adminClient = createAdminClient();

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

  let query = adminClient
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (isUUID) {
    query = query.eq("id", projectId);
  } else {
    query = query.eq("slug", projectId);
  }

  const { data, error } = await query.maybeSingle();

  if (!error && data) {
    const r = data as unknown as DBProjectRow;
    let deptName: string | null = null;
    let deptColor: string | null = null;

    if (r.department_id) {
      try {
        const { data: dept } = await adminClient
          .from("departments")
          .select("name, color")
          .eq("id", r.department_id)
          .maybeSingle();
        if (dept) {
          deptName = dept.name;
          deptColor = dept.color;
        }
      } catch {
        // ignore
      }
    }

    let managerName: string | null = null;
    const leadUserId = r.lead_id || r.created_by;
    if (leadUserId) {
      try {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("full_name, email")
          .eq("id", leadUserId)
          .maybeSingle();
        if (profile) {
          managerName = profile.full_name || profile.email;
        }
      } catch {
        // ignore
      }
    }

    const status = (r.status === "active" ? "in_progress" : r.status) as Project["status"];

    return {
      id: r.id,
      workspace_id: r.workspace_id,
      department_id: r.department_id ?? null,
      department_name: deptName,
      department_color: deptColor,
      name: r.name,
      slug: r.slug,
      description: r.description ?? null,
      status: status || "in_progress",
      priority: (r.priority || "medium") as Project["priority"],
      color: r.color || "#10251F",
      icon: r.icon || (r.name ? r.name[0].toUpperCase() : "P"),
      manager_id: r.lead_id || r.manager_id || null,
      manager_name: managerName,
      client_name: r.client_name ?? null,
      budget: r.budget ?? null,
      start_date: r.start_date ?? null,
      due_date: r.due_date ?? r.deadline ?? null,
      deadline: r.due_date ?? r.deadline ?? null,
      progress: 0,
      completed_tasks: 0,
      total_tasks: 0,
      member_ids: [],
      created_by: r.created_by ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  return null;
}

/**
 * Return only projects the given UserContext is allowed to see.
 * - OWNER/ADMIN: all workspace projects
 * - DEPT_LEAD: all workspace projects in their dept + projects they manage/created
 * - MEMBER: projects in their dept + projects they're assigned to (via task_assignees or project_members)
 */
export async function getAccessibleProjects(
  ctx: { userId: string; workspaceId: string; isOwnerOrAdmin: boolean; deptIds: string[]; ledDeptIds: string[] },
  workspaceId: string
): Promise<Project[]> {
  const allProjects = await getWorkspaceProjects(workspaceId);

  if (ctx.isOwnerOrAdmin) return allProjects;

  const adminClient = createAdminClient();

  // Fetch projects user is explicitly a member of
  const { data: projMemberRows } = await adminClient
    .from("project_members")
    .select("project_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", ctx.userId);

  const explicitProjectIds = new Set((projMemberRows || []).map((r: any) => r.project_id));

  return allProjects.filter((p) => {
    // Project in user's dept
    if (p.department_id && ctx.deptIds.includes(p.department_id)) return true;
    // User is project lead/manager
    if (p.manager_id === ctx.userId) return true;
    // User created it
    if (p.created_by === ctx.userId) return true;
    // User is explicit project member
    if (explicitProjectIds.has(p.id)) return true;
    // User is assigned tasks on this project
    if (p.member_ids?.includes(ctx.userId)) return true;
    return false;
  });
}

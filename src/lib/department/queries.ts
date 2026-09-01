import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Department, DepartmentWithStats, DepartmentRole } from "@/types/department";



const COLOR_SCHEME_MAP: Record<string, { bg: string; text: string }> = {
  code: { bg: "bg-[#EAF4E2]", text: "text-[#246244]" },
  design: { bg: "bg-[#EAF4E2]", text: "text-[#246244]" },
  video: { bg: "bg-[#FEF6E4]", text: "text-[#B58500]" },
  marketing: { bg: "bg-[#EEF2FF]", text: "text-[#4F46E5]" },
  hr: { bg: "bg-[#F0F9FF]", text: "text-[#0284C7]" },
  ops: { bg: "bg-[#FFF7ED]", text: "text-[#C2410C]" },
  sales: { bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
  finance: { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]" },
  building: { bg: "bg-[#FAF9F5]", text: "text-[#18221E]" },
};

const AVATAR_BG_COLORS = [
  "bg-[#10251F]",
  "bg-[#246244]",
  "bg-[#B58500]",
  "bg-[#4F46E5]",
  "bg-[#0284C7]",
  "bg-[#C2410C]",
  "bg-[#059669]",
  "bg-[#DC2626]",
];

/**
 * Fetch all departments for a given workspace (deduplicated per request)
 */
export const getWorkspaceDepartments = cache(
  async (workspaceId: string): Promise<Department[]> => {
    if (!workspaceId) return [];

    let client: any;
    try {
      client = await createClient();
    } catch {
      client = createAdminClient();
    }

    const { data, error } = await client
      .from("departments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching workspace departments:", error);
      return [];
    }

    return (data as Department[]) || [];
  }
);

/**
 * Fetch all departments with real stats from the database.
 * Member counts, project counts, task counts, lead names and member avatars
 * all come from live Supabase queries — no hardcoded fallback data is injected.
 */
export const getWorkspaceDepartmentsWithStats = cache(
  async (
    workspaceId: string
  ): Promise<{
    departments: DepartmentWithStats[];
    metrics: {
      totalDepartments: number;
      totalTeamMembers: number;
      totalActiveProjects: number;
    };
  }> => {
    if (!workspaceId) {
      return {
        departments: [],
        metrics: { totalDepartments: 0, totalTeamMembers: 0, totalActiveProjects: 0 },
      };
    }

    const dbDepartments = await getWorkspaceDepartments(workspaceId);

    if (dbDepartments.length === 0) {
      return {
        departments: [],
        metrics: { totalDepartments: 0, totalTeamMembers: 0, totalActiveProjects: 0 },
      };
    }

    const adminClient = createAdminClient();
    const deptIds = dbDepartments.map((d) => d.id);

    // Fetch real counts in parallel
    const [
      { data: memberRows },
      { data: projectRows },
      { data: taskRows },
      { data: wsMemberRows },
    ] = await Promise.all([
      adminClient
        .from("department_members")
        .select("id, department_id, user_id, job_title")
        .eq("workspace_id", workspaceId)
        .in("department_id", deptIds),
      adminClient
        .from("projects")
        .select("id, department_id, status")
        .eq("workspace_id", workspaceId)
        .in("department_id", deptIds),
      adminClient
        .from("tasks")
        .select("id, department_id, status")
        .eq("workspace_id", workspaceId)
        .in("department_id", deptIds),
      adminClient
        .from("workspace_members")
        .select("user_id, full_name, job_title, role, avatar_url")
        .eq("workspace_id", workspaceId),
    ]);

    // Fetch auth user display names
    const authUsersMap = new Map<string, { email: string; fullName: string | null }>();
    try {
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      (authUsers?.users || []).forEach((u) => {
        authUsersMap.set(u.id, {
          email: u.email || "",
          fullName: u.user_metadata?.full_name || u.user_metadata?.name || null,
        });
      });
    } catch {
      // Non-critical: continue without display names
    }

    // Build a map of workspace member metadata for quick lookup
    const wsMembersMap = new Map<
      string,
      { full_name: string | null; job_title: string | null; role: string; avatar_url: string | null }
    >();
    (wsMemberRows || []).forEach((m) => {
      wsMembersMap.set(m.user_id, {
        full_name: m.full_name,
        job_title: m.job_title,
        role: m.role || "member",
        avatar_url: m.avatar_url || null,
      });
    });

    // Group department_members rows by department_id
    type DeptMemberRow = { id?: string; department_id: string; user_id: string; job_title: string | null };
    const deptMembersMap = new Map<string, DeptMemberRow[]>();
    (memberRows || []).forEach((row) => {
      const list = deptMembersMap.get(row.department_id) || [];
      list.push(row as DeptMemberRow);
      deptMembersMap.set(row.department_id, list);
    });

    // Group project counts by department_id
    const deptProjectsMap = new Map<string, number>();
    (projectRows || []).forEach((row) => {
      if (row.department_id) {
        deptProjectsMap.set(row.department_id, (deptProjectsMap.get(row.department_id) || 0) + 1);
      }
    });

    // Group task counts by department_id
    const deptTasksMap = new Map<string, number>();
    (taskRows || []).forEach((row) => {
      if (row.department_id) {
        deptTasksMap.set(row.department_id, (deptTasksMap.get(row.department_id) || 0) + 1);
      }
    });

    let currentUserId: string | null = null;
    try {
      const authClient = await createClient();
      const { data: authData } = await authClient.auth.getUser();
      if (authData?.user) currentUserId = authData.user.id;
    } catch {}

    const finalDepartments: DepartmentWithStats[] = dbDepartments.map((dept) => {
      const deptMembers = deptMembersMap.get(dept.id) || [];
      const memberCount = deptMembers.length;
      const projectCount = deptProjectsMap.get(dept.id) || 0;
      const taskCount = deptTasksMap.get(dept.id) || 0;

      const myMembership = currentUserId
        ? deptMembers.find((m) => m.user_id === currentUserId)
        : null;
      const isMember = Boolean(myMembership);
      
      let userRoleInDept: DepartmentRole | null = null;
      if (myMembership) {
        const jt = (myMembership.job_title || "").toLowerCase();
        if ((dept as any).lead_id === myMembership.user_id || jt.includes("lead") || jt.includes("head") || jt.includes("director")) {
          userRoleInDept = "lead";
        } else if (jt.includes("manager")) {
          userRoleInDept = "manager";
        } else {
          userRoleInDept = "member";
        }
      }

      // Determine lead: prefer explicit lead_id on department row, then senior job titles
      const leadMember = deptMembers.find(
        (m) =>
          (dept as any).lead_id === m.user_id ||
          (m.job_title &&
            (m.job_title.toLowerCase().includes("lead") ||
              m.job_title.toLowerCase().includes("head") ||
              m.job_title.toLowerCase().includes("director")))
      );
      const leadWsMember = leadMember ? wsMembersMap.get(leadMember.user_id) : null;
      const leadAuth = leadMember ? authUsersMap.get(leadMember.user_id) : null;
      const leadName =
        leadWsMember?.full_name ||
        leadAuth?.fullName ||
        (leadAuth?.email ? leadAuth.email.split("@")[0] : null) ||
        null;
      const leadRole = leadMember?.job_title || leadWsMember?.job_title || (leadName ? "Department Lead" : null);

      // Build member avatars (up to 4)
      const memberAvatars = deptMembers.slice(0, 4).map((m, idx) => {
        const wm = wsMembersMap.get(m.user_id);
        const au = authUsersMap.get(m.user_id);
        const name =
          wm?.full_name ||
          au?.fullName ||
          (au?.email ? au.email.split("@")[0] : "Member") ||
          "Member";
        const initial = (name[0] || "M").toUpperCase();
        const memberJt = (m.job_title || wm?.job_title || "").toLowerCase();
        let memberRole: DepartmentRole = "member";
        if ((dept as any).lead_id === m.user_id || memberJt.includes("lead") || memberJt.includes("head") || memberJt.includes("director")) {
          memberRole = "lead";
        } else if (memberJt.includes("manager")) {
          memberRole = "manager";
        }
        return {
          id: m.user_id,
          name,
          initial,
          bg: AVATAR_BG_COLORS[idx % AVATAR_BG_COLORS.length],
          avatarUrl: wm?.avatar_url || null,
          role: memberRole,
        };
      });

      const colorScheme =
        COLOR_SCHEME_MAP[dept.icon] || { bg: "bg-[#FAF9F5]", text: "text-[#18221E]" };

      return {
        ...dept,
        leadName,
        leadRole,
        leadId: leadMember?.user_id || (dept as any).lead_id || null,
        memberCount,
        projectCount,
        taskCount,
        members: memberAvatars,
        isMember,
        userRoleInDept,
        colorScheme,
      };
    });

    const totalDepartments = finalDepartments.length;
    const uniqueMembers = new Set((memberRows || []).map((r) => r.user_id));
    const totalTeamMembers = uniqueMembers.size;
    const totalActiveProjects = (projectRows || []).filter(
      (p) => p.status !== "completed" && p.status !== "archived"
    ).length;

    return {
      departments: finalDepartments,
      metrics: {
        totalDepartments,
        totalTeamMembers,
        totalActiveProjects,
      },
    };
  }
);

/**
 * Fetch a specific department by ID or slug, scoped strictly to the active workspace.
 * Returns null if not found (never creates or returns mock fallback data).
 */
export async function getDepartmentById(
  departmentId: string,
  workspaceId: string
): Promise<Department | null> {
  if (!departmentId || !workspaceId) return null;

  const adminClient = createAdminClient();

  // Check if departmentId is a valid UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(departmentId);

  let query = adminClient
    .from("departments")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (isUUID) {
    query = query.eq("id", departmentId);
  } else {
    query = query.eq("slug", departmentId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Department;
}

/**
 * Fetch recent activity feed for a specific department from workspace_activities & task_activities
 */
export async function getDepartmentActivities(
  departmentId: string,
  workspaceId: string
): Promise<Array<{
  id: string;
  user: { name: string; initial: string; bg?: string };
  action: string;
  target: string;
  project: string;
  timeAgo: string;
}>> {
  if (!departmentId || !workspaceId) return [];

  const adminClient = createAdminClient();

  // 1. Fetch activities directly tagged with department_id in workspace_activities
  const { data: wsActs } = await adminClient
    .from("workspace_activities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false })
    .limit(20);

  // 2. Fetch tasks belonging to this department
  const { data: deptTasks } = await adminClient
    .from("tasks")
    .select("id, title, project_id")
    .eq("workspace_id", workspaceId)
    .eq("department_id", departmentId);

  const taskIds = (deptTasks || []).map((t) => t.id);
  const taskMap = new Map((deptTasks || []).map((t) => [t.id, t]));

  let taskActs: any[] = [];
  if (taskIds.length > 0) {
    const { data: tRows } = await adminClient
      .from("task_activities")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("task_id", taskIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (tRows) taskActs = tRows;
  }

  const allActs = [...(wsActs || []), ...taskActs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 20);

  if (allActs.length === 0) return [];

  const userIds = Array.from(new Set(allActs.map((r) => r.user_id).filter(Boolean))) as string[];

  // Fetch member display names
  const { data: wsMembers } = await adminClient
    .from("workspace_members")
    .select("user_id, full_name")
    .eq("workspace_id", workspaceId)
    .in("user_id", userIds);

  const nameMap = new Map<string, string>();
  (wsMembers || []).forEach((m) => {
    if (m.full_name) nameMap.set(m.user_id, m.full_name);
  });

  return allActs.map((r) => {
    const name = nameMap.get(r.user_id) || "Team Member";
    const initial = (name[0] || "T").toUpperCase();
    const createdTime = new Date(r.created_at);
    const diffMin = Math.round((Date.now() - createdTime.getTime()) / 60000);
    const timeAgo =
      diffMin < 1 ? "Just now" : diffMin < 60 ? `${diffMin}m ago` : `${Math.round(diffMin / 60)}h ago`;

    const task = r.task_id ? taskMap.get(r.task_id) : null;
    const actionLabel = r.message || (r.action_type || "updated").replace(/_/g, " ");

    return {
      id: r.id,
      user: { name, initial, bg: "bg-[#10251F]" },
      action: actionLabel,
      target: task ? `"${task.title}"` : "Department",
      project: "Department Workspace",
      timeAgo,
    };
  });
}

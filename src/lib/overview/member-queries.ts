/**
 * Member Dashboard Data Service
 *
 * Fetches only data the current user has access to based on their role.
 * Used by the personalized member/dept-lead dashboard.
 */
import { cache } from "react";
import { Task, CategorizedTasks } from "@/types/task";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { AttendanceState, AttendanceRecord } from "@/types/attendance";
import { LeaveBalance, LeaveRequest } from "@/types/leave";
import { CalendarEvent } from "@/types/calendar";
import { UserContext } from "@/types/permissions";
import { WorkspaceActivityItem } from "@/lib/task/queries";
import { getAccessibleProjects } from "@/lib/project/queries";
import { getAccessibleTasks, getMyTasks } from "@/lib/task/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { getTodayAttendanceState } from "@/lib/attendance/queries";
import { getEmployeeLeaveBalances, getEmployeeLeaveRequests } from "@/lib/attendance/queries";
import { getUpcomingCalendarEvents } from "@/lib/calendar/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MemberDashboardData {
  myTasks: CategorizedTasks;
  myProjects: Project[];
  myDepartments: MemberDeptSummary[];
  attendanceState: {
    state: AttendanceState;
    record: AttendanceRecord | null;
    workedMinutes: number;
  };
  leaveBalance: LeaveBalance[];
  recentLeaveRequests: LeaveRequest[];
  recentActivity: WorkspaceActivityItem[];
  upcomingEvents: CalendarEvent[];
}

export interface MemberDeptSummary {
  department: Department;
  role: string;
  openTaskCount: number;
  memberCount: number;
  activeProjectCount: number;
  leadName?: string | null;
}

/**
 * Build member-scoped recent activity feed.
 * Only includes activities relevant to the current user.
 */
async function getMemberRecentActivity(
  userId: string,
  workspaceId: string,
  accessibleProjectIds: string[]
): Promise<WorkspaceActivityItem[]> {
  if (!userId || !workspaceId) return [];

  const adminClient = createAdminClient();

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    adminClient
      .from("tasks")
      .select("id, title, created_by, created_at, status")
      .eq("workspace_id", workspaceId)
      .or(`created_by.eq.${userId}${accessibleProjectIds.length > 0 ? `,project_id.in.(${accessibleProjectIds.join(",")})` : ""}`)
      .order("created_at", { ascending: false })
      .limit(10),
    adminClient
      .from("projects")
      .select("id, name, created_by, created_at")
      .eq("workspace_id", workspaceId)
      .in("id", accessibleProjectIds.length > 0 ? accessibleProjectIds : ["_none"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const activities: WorkspaceActivityItem[] = [];

  (projects || []).forEach((proj: any) => {
    activities.push({
      id: `proj-${proj.id}`,
      type: "project_created",
      targetName: proj.name,
      createdAt: proj.created_at,
      actorName: proj.created_by === userId ? "You" : "A teammate",
    });
  });

  (tasks || []).forEach((t: any) => {
    activities.push({
      id: `task-${t.id}`,
      type: t.status === "completed" ? "task_completed" : "task_created",
      targetName: t.title,
      createdAt: t.created_at,
      actorName: t.created_by === userId ? "You" : "A teammate",
    });
  });

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return activities.slice(0, 8);
}

/**
 * Fetch all data needed for the member/dept-lead personalized dashboard.
 * Returns only data the user is authorized to see.
 */
export const getMemberDashboardData = cache(
  async (
    workspaceId: string,
    userId: string,
    userCtx: UserContext | null
  ): Promise<MemberDashboardData> => {
    const empty: MemberDashboardData = {
      myTasks: { overdue: [], today: [], upcoming: [], noDueDate: [], completed: [] },
      myProjects: [],
      myDepartments: [],
      attendanceState: { state: "Not Checked In", record: null, workedMinutes: 0 },
      leaveBalance: [],
      recentLeaveRequests: [],
      recentActivity: [],
      upcomingEvents: [],
    };

    if (!workspaceId || !userId) return empty;

    const ctx = userCtx ?? {
      userId,
      workspaceId,
      workspaceRole: "member" as const,
      isOwnerOrAdmin: false,
      deptMemberships: [],
      deptIds: [],
      isDeptLead: false,
      ledDeptIds: [],
    };

    // Fetch accessible projects first (needed for task scoping)
    const [myProjects, allDepartments] = await Promise.all([
      getAccessibleProjects(ctx, workspaceId),
      getWorkspaceDepartments(workspaceId),
    ]);

    const accessibleProjectIds = myProjects.map((p) => p.id);

    // Now fetch everything else in parallel
    const [
      myTasks,
      attendanceResult,
      leaveBalance,
      recentLeaveRequests,
      recentActivity,
      upcomingEvents,
    ] = await Promise.all([
      getMyTasks(userId, workspaceId),
      getTodayAttendanceState(userId, workspaceId),
      getEmployeeLeaveBalances(userId, workspaceId),
      getEmployeeLeaveRequests(userId, workspaceId),
      getMemberRecentActivity(userId, workspaceId, accessibleProjectIds),
      getUpcomingCalendarEvents(workspaceId, 8).catch(() => [] as CalendarEvent[]),
    ]);

    // Build department summaries for departments the user belongs to
    const adminClient = createAdminClient();
    const myDeptIds = ctx.deptIds;

    const myDepartments: MemberDeptSummary[] = await Promise.all(
      myDeptIds.map(async (deptId) => {
        const dept = allDepartments.find((d) => d.id === deptId);
        if (!dept) return null;

        const deptRole = ctx.deptMemberships.find((m) => m.deptId === deptId)?.role || "member";

        const [{ count: memberCount }, { count: openTaskCount }, { count: activeProjectCount }] =
          await Promise.all([
            adminClient
              .from("department_members")
              .select("id", { count: "exact", head: true })
              .eq("department_id", deptId),
            adminClient
              .from("tasks")
              .select("id", { count: "exact", head: true })
              .eq("department_id", deptId)
              .neq("status", "completed"),
            adminClient
              .from("projects")
              .select("id", { count: "exact", head: true })
              .eq("department_id", deptId)
              .in("status", ["active", "in_progress"]),
          ]);

        // Resolve lead name if lead_id is present
        let leadName: string | null = null;
        if (dept.lead_id) {
          try {
            const { data: profile } = await adminClient
              .from("workspace_members")
              .select("full_name")
              .eq("user_id", dept.lead_id)
              .eq("workspace_id", workspaceId)
              .maybeSingle();
            if (profile) leadName = (profile as any).full_name || null;
          } catch {
            // ignore
          }
        }

        return {
          department: dept,
          role: deptRole,
          openTaskCount: openTaskCount ?? 0,
          memberCount: memberCount ?? 0,
          activeProjectCount: activeProjectCount ?? 0,
          leadName,
        } satisfies MemberDeptSummary;
      })
    ).then((results) => results.filter(Boolean) as MemberDeptSummary[]);

    return {
      myTasks,
      myProjects,
      myDepartments,
      attendanceState: {
        state: attendanceResult.state,
        record: attendanceResult.record,
        workedMinutes: attendanceResult.workedMinutes,
      },
      leaveBalance,
      recentLeaveRequests: recentLeaveRequests.slice(0, 5),
      recentActivity,
      upcomingEvents,
    };
  }
);

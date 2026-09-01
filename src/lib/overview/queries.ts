import { cache } from "react";
import { Project } from "@/types/project";
import { Task } from "@/types/task";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { LeaveRequest } from "@/types/leave";
import { CalendarEvent } from "@/types/calendar";
import { JobOpening, Interview, Candidate } from "@/types/recruitment";
import { getWorkspaceProjects } from "@/lib/project/queries";
import {
  getOverviewTaskMetrics,
  getWorkspaceRecentActivities,
  getUpcomingDeadlines,
  WorkspaceActivityItem,
  getWorkspaceTasks,
} from "@/lib/task/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import {
  getWorkspaceJobOpenings,
  getWorkspaceCandidates,
  getWorkspaceInterviews,
} from "@/lib/recruitment/queries";
import { getWorkspaceLeaveRequests } from "@/lib/attendance/queries";
import { getUpcomingCalendarEvents } from "@/lib/calendar/queries";

export interface OverviewData {
  workspaceId: string;
  workspaceName: string;
  projects: Project[];
  myOpenTasks: Task[];
  allTasks: Task[];
  openTasksCount: number;
  dueTodayCount: number;
  overdueCount: number;
  completedCount: number;
  people: WorkspacePerson[];
  departments: Department[];
  recentActivities: WorkspaceActivityItem[];
  upcomingDeadlines: Task[];
  jobOpenings: JobOpening[];
  openJobsCount: number;
  pendingLeaves: LeaveRequest[];
  pendingLeavesCount: number;
  candidates: Candidate[];
  interviews: Interview[];
  upcomingEvents: CalendarEvent[];
}

/**
 * Clean data service for Overview Command Center.
 * Orchestrates projects, tasks, KPIs, team members, activities, and deadlines in parallel.
 * Returns ONLY real Supabase / store data — no mock data.
 */
export const getOverviewData = cache(
  async (
    workspaceId: string,
    workspaceName: string,
    userId: string
  ): Promise<OverviewData> => {
    if (!workspaceId) {
      return {
        workspaceId: "",
        workspaceName: workspaceName || "Workspace",
        projects: [],
        myOpenTasks: [],
        allTasks: [],
        openTasksCount: 0,
        dueTodayCount: 0,
        overdueCount: 0,
        completedCount: 0,
        people: [],
        departments: [],
        recentActivities: [],
        upcomingDeadlines: [],
        jobOpenings: [],
        openJobsCount: 0,
        pendingLeaves: [],
        pendingLeavesCount: 0,
        candidates: [],
        interviews: [],
        upcomingEvents: [],
      };
    }

    const [
      allProjects,
      allTasks,
      metrics,
      people,
      departments,
      recentActivities,
      upcomingDeadlines,
      jobOpenings,
      candidates,
      interviews,
      pendingLeaves,
      upcomingEvents,
    ] = await Promise.all([
      getWorkspaceProjects(workspaceId),
      getWorkspaceTasks(workspaceId),
      userId
        ? getOverviewTaskMetrics(userId, workspaceId)
        : Promise.resolve({
            openTasksCount: 0,
            dueTodayCount: 0,
            overdueCount: 0,
            completedCount: 0,
            myOpenTasks: [],
            recentlyCompleted: [],
          }),
      getWorkspacePeople(workspaceId),
      getWorkspaceDepartments(workspaceId),
      getWorkspaceRecentActivities(workspaceId),
      getUpcomingDeadlines(workspaceId, userId),
      getWorkspaceJobOpenings(workspaceId).catch(() => []),
      getWorkspaceCandidates(workspaceId).catch(() => []),
      getWorkspaceInterviews(workspaceId).catch(() => []),
      getWorkspaceLeaveRequests(workspaceId, { status: "Pending" }).catch(() => []),
      getUpcomingCalendarEvents(workspaceId, 10).catch(() => []),
    ]);

    // Build a people lookup map for avatar resolution
    const peopleMap = new Map<string, WorkspacePerson>(
      people.map((p) => [p.user_id, p])
    );

    // Single pass: calculate task counts AND unique assignee sets per project
    const projectTaskCounts = new Map<string, { total: number; completed: number }>();
    const projectAssigneeIds = new Map<string, Set<string>>();

    allTasks.forEach((t) => {
      if (t.project_id) {
        // Task counts
        const current = projectTaskCounts.get(t.project_id) || { total: 0, completed: 0 };
        current.total += 1;
        if (t.status === "completed") {
          current.completed += 1;
        }
        projectTaskCounts.set(t.project_id, current);

        // Collect unique assignee IDs for this project
        const assigneeSet = projectAssigneeIds.get(t.project_id) || new Set<string>();
        t.assignees.forEach((a) => {
          if (a.user_id) assigneeSet.add(a.user_id);
        });
        projectAssigneeIds.set(t.project_id, assigneeSet);
      }
    });

    const enrichedProjects = allProjects.map((p) => {
      const counts = projectTaskCounts.get(p.id);
      const assigneeSet = projectAssigneeIds.get(p.id);

      // Compute real progress from actual task data
      const totalTasks = counts?.total ?? 0;
      const completedTasks = counts?.completed ?? 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Real member IDs from task assignees; include lead/manager if present
      const memberIdSet = new Set<string>(assigneeSet ?? []);
      if (p.manager_id && peopleMap.has(p.manager_id)) {
        memberIdSet.add(p.manager_id);
      }

      return {
        ...p,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        progress,
        member_ids: Array.from(memberIdSet),
      };
    });

    const openJobs = jobOpenings.filter((j) => j.status === "Open" || !j.status);

    return {
      workspaceId,
      workspaceName,
      projects: enrichedProjects,
      myOpenTasks: metrics.myOpenTasks,
      allTasks,
      openTasksCount: allTasks.filter((t) => t.status !== "completed").length,
      dueTodayCount: metrics.dueTodayCount,
      overdueCount: metrics.overdueCount,
      completedCount: metrics.completedCount,
      people,
      departments,
      recentActivities,
      upcomingDeadlines,
      jobOpenings,
      openJobsCount: openJobs.length,
      pendingLeaves,
      pendingLeavesCount: pendingLeaves.length,
      candidates,
      interviews,
      upcomingEvents,
    };
  }
);

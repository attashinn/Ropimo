import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getUserContext } from "@/lib/auth/permissions";
import { getOverviewData } from "@/lib/overview/queries";
import { getMemberDashboardData } from "@/lib/overview/member-queries";
import { OverviewDashboard } from "@/components/app/overview-dashboard";
import { MemberDashboard } from "@/components/app/member-dashboard";

export const metadata = {
  title: "Overview — Ropimo",
  description: "Company command center for active projects and team deliverables",
};

export default async function OverviewPage() {
  const supabase = await createClient();

  const [{ data: authData }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getDefaultWorkspace(),
  ]);

  const user = authData?.user;
  const workspaceId = workspace?.id || "";
  const workspaceName = workspace?.name || "Workspace";
  const userId = user?.id || "";
  const userName =
    (user?.user_metadata?.full_name as string) ||
    (user?.email ? user.email.split("@")[0] : "there");
  const userEmail = user?.email || "";

  // Resolve user context (cached — same call as layout, no extra DB hit)
  const userCtx = await getUserContext(workspaceId);
  const isOwnerOrAdmin = userCtx?.isOwnerOrAdmin ?? false;

  // OWNER / ADMIN → Full workspace command center (existing dashboard, unchanged)
  if (isOwnerOrAdmin) {
    const overviewData = await getOverviewData(workspaceId, workspaceName, userId);

    return (
      <OverviewDashboard
        workspaceId={overviewData.workspaceId}
        workspaceName={overviewData.workspaceName}
        userId={userId}
        userName={userName}
        userEmail={userEmail}
        projects={overviewData.projects}
        myOpenTasks={overviewData.myOpenTasks}
        allTasks={overviewData.allTasks}
        openTasksCount={overviewData.openTasksCount}
        dueTodayCount={overviewData.dueTodayCount}
        overdueCount={overviewData.overdueCount}
        completedCount={overviewData.completedCount}
        people={overviewData.people}
        departments={overviewData.departments}
        recentActivities={overviewData.recentActivities}
        upcomingDeadlines={overviewData.upcomingDeadlines}
        jobOpenings={overviewData.jobOpenings}
        openJobsCount={overviewData.openJobsCount}
        pendingLeaves={overviewData.pendingLeaves}
        pendingLeavesCount={overviewData.pendingLeavesCount}
        candidates={overviewData.candidates}
        interviews={overviewData.interviews}
        upcomingEvents={overviewData.upcomingEvents}
      />
    );
  }

  // MEMBER / DEPT_LEAD → Personalized "My Work" dashboard
  const memberData = await getMemberDashboardData(workspaceId, userId, userCtx);

  return (
    <MemberDashboard
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      userId={userId}
      userName={userName}
      userEmail={userEmail}
      userContext={userCtx}
      myTasks={memberData.myTasks}
      myProjects={memberData.myProjects}
      myDepartments={memberData.myDepartments}
      attendanceState={memberData.attendanceState}
      leaveBalance={memberData.leaveBalance}
      recentLeaveRequests={memberData.recentLeaveRequests}
      recentActivity={memberData.recentActivity}
      upcomingEvents={memberData.upcomingEvents}
    />
  );
}

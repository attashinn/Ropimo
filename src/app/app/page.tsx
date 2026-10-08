import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getUserContext } from "@/lib/auth/permissions";
import { getOverviewData } from "@/lib/overview/queries";
import { OverviewDashboard } from "@/components/app/overview-dashboard";

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

import * as React from "react";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { createClient } from "@/lib/supabase/server";
import {
  getEmployeeLeaveBalances,
  getEmployeeLeaveRequests,
  getWorkspaceLeaveRequests,
} from "@/lib/attendance/queries";
import { LeaveDashboardView } from "@/components/app/leave/leave-dashboard-view";

export const metadata = {
  title: "Leave & Absence Management — Ropimo",
  description: "Request time off, monitor leave balances, and review workspace leave requests.",
};

export default async function LeavePage() {
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  if (!workspaceId) {
    return null;
  }

  let currentUserId = "";
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    currentUserId = authData.user?.id || "";
  } catch {
    // Background context
  }

  const [balances, myRequests, allRequests, departments] = await Promise.all([
    getEmployeeLeaveBalances(currentUserId, workspaceId),
    getEmployeeLeaveRequests(currentUserId, workspaceId),
    getWorkspaceLeaveRequests(workspaceId),
    getWorkspaceDepartments(workspaceId),
  ]);

  return (
    <LeaveDashboardView
      workspaceId={workspaceId}
      userRole={workspace?.role || "member"}
      currentUserId={currentUserId}
      balances={balances}
      myRequests={myRequests}
      allRequests={allRequests}
      departments={departments}
    />
  );
}

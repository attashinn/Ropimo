import * as React from "react";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { createClient } from "@/lib/supabase/server";
import {
  getAttendanceSettings,
  getEmployeeAttendanceHistory,
  getMonthlyAttendanceSummary,
  getTodayAttendanceState,
  getWorkspaceAttendanceRecords,
  getWorkspaceAttendanceStats,
} from "@/lib/attendance/queries";
import { AttendanceDashboardView } from "@/components/app/attendance/attendance-dashboard-view";

export const metadata = {
  title: "Attendance & Time Tracking — Ropimo",
  description: "Monitor employee attendance, check-in schedules, working hours, and grace period policies.",
};

export default async function AttendancePage() {
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

  const [
    todayState,
    monthlySummary,
    employeeHistory,
    allRecords,
    stats,
    departments,
    settings,
  ] = await Promise.all([
    getTodayAttendanceState(currentUserId, workspaceId),
    getMonthlyAttendanceSummary(currentUserId, workspaceId),
    getEmployeeAttendanceHistory(currentUserId, workspaceId),
    getWorkspaceAttendanceRecords(workspaceId),
    getWorkspaceAttendanceStats(workspaceId),
    getWorkspaceDepartments(workspaceId),
    getAttendanceSettings(workspaceId),
  ]);

  return (
    <AttendanceDashboardView
      workspaceId={workspaceId}
      userRole={workspace?.role || "member"}
      currentUserId={currentUserId}
      todayState={todayState}
      monthlySummary={monthlySummary}
      employeeHistory={employeeHistory}
      allRecords={allRecords}
      stats={stats}
      departments={departments}
      settings={settings}
    />
  );
}

import * as React from "react";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import {
  getWorkspacePersonById,
  getMemberActivities,
  getMemberProjects,
  getEmployeeOnboarding,
  getEmployeeRecruitmentHistory,
} from "@/lib/people/queries";
import { getEmployeeInvitation } from "@/lib/invitations/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { getWorkspaceTasks } from "@/lib/task/queries";
import { PersonDetailView } from "@/components/app/person-detail-view";

import {
  getEmployeeAttendanceHistory,
  getMonthlyAttendanceSummary,
  getEmployeeLeaveBalances,
  getEmployeeLeaveRequests,
} from "@/lib/attendance/queries";

export interface PersonDetailPageProps {
  params: Promise<{
    personId: string;
  }>;
}

export default async function PersonDetailPage({
  params,
}: PersonDetailPageProps) {
  const { personId } = await params;
  const workspace = await getDefaultWorkspace();

  if (!workspace) {
    notFound();
  }

  const [person, departments, tasks] = await Promise.all([
    getWorkspacePersonById(personId, workspace.id),
    getWorkspaceDepartments(workspace.id),
    getWorkspaceTasks(workspace.id),
  ]);

  if (!person) {
    notFound();
  }

  const [
    activities,
    projects,
    onboarding,
    recruitmentHistory,
    attendanceHistory,
    monthlySummary,
    leaveBalances,
    leaveRequests,
    invitation,
  ] = await Promise.all([
    getMemberActivities(person.user_id, workspace.id),
    getMemberProjects(person.user_id, workspace.id),
    getEmployeeOnboarding(person.user_id, workspace.id),
    getEmployeeRecruitmentHistory(person.user_id, workspace.id),
    getEmployeeAttendanceHistory(person.user_id, workspace.id),
    getMonthlyAttendanceSummary(person.user_id, workspace.id),
    getEmployeeLeaveBalances(person.user_id, workspace.id),
    getEmployeeLeaveRequests(person.user_id, workspace.id),
    getEmployeeInvitation(person.email || person.user_id, workspace.id),
  ]);

  const personTasks = tasks.filter(
    (t) => t.assignees?.some((a) => a.user_id === person.user_id) || t.created_by === person.user_id
  );

  return (
    <PersonDetailView
      person={person}
      workspace={workspace}
      userRole={workspace.role || "owner"}
      departments={departments}
      tasks={personTasks}
      activities={activities}
      projects={projects}
      onboarding={onboarding}
      invitation={invitation}
      recruitmentHistory={recruitmentHistory}
      attendanceHistory={attendanceHistory}
      attendanceMonthlySummary={monthlySummary}
      leaveBalances={leaveBalances}
      leaveRequests={leaveRequests}
    />
  );
}

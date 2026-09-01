import * as React from "react";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import {
  getDepartmentById,
  getWorkspaceDepartments,
  getDepartmentActivities,
} from "@/lib/department/queries";
import {
  getDepartmentMembers,
  getWorkspacePeople,
} from "@/lib/people/queries";
import { getDepartmentTasks } from "@/lib/task/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getDepartmentUserRoleAndPermissions } from "@/lib/department/permissions";
import { DepartmentDetailView } from "@/components/app/department-detail-view";
import { DepartmentAccessDeniedView } from "@/components/app/departments/department-access-denied-view";
import { getDepartmentAttendanceSummary } from "@/lib/attendance/queries";
import { createClient } from "@/lib/supabase/server";

export interface DepartmentDetailPageProps {
  params: Promise<{
    departmentId: string;
  }>;
}

export default async function DepartmentDetailPage({
  params,
}: DepartmentDetailPageProps) {
  const { departmentId } = await params;
  const workspace = await getDefaultWorkspace();

  if (!workspace) {
    notFound();
  }

  // Fetch department
  const department = await getDepartmentById(departmentId, workspace.id);
  if (!department) {
    notFound();
  }

  // Get current user id
  let currentUserId: string | null = null;
  try {
    const authClient = await createClient();
    const { data: authData } = await authClient.auth.getUser();
    if (authData?.user) currentUserId = authData.user.id;
  } catch {}

  // 1. SERVER-SIDE ACCESS CONTROL & PERMISSIONS
  const permissions = await getDepartmentUserRoleAndPermissions(
    department.id,
    workspace.id,
    currentUserId || undefined
  );

  // If user is not authorized to access this department, render 403 Access Denied
  if (!permissions.canAccessDepartment) {
    return (
      <DepartmentAccessDeniedView
        department={department}
        workspace={workspace}
        leadName={null}
      />
    );
  }

  // 2. Fetch department-scoped data in parallel
  const [
    members,
    allPeople,
    tasks,
    projects,
    departments,
    activities,
    attendanceSummary,
  ] = await Promise.all([
    getDepartmentMembers(department.id, workspace.id),
    getWorkspacePeople(workspace.id),
    getDepartmentTasks(department.id, workspace.id),
    getWorkspaceProjects(workspace.id),
    getWorkspaceDepartments(workspace.id),
    getDepartmentActivities(department.id, workspace.id),
    getDepartmentAttendanceSummary(department.id, workspace.id),
  ]);

  // Filter projects belonging to this department
  const departmentProjects = (projects || []).filter(
    (p) => p.department_id === department.id
  );

  return (
    <DepartmentDetailView
      department={department}
      workspace={workspace}
      userRole={permissions.departmentRole}
      permissions={permissions}
      members={members}
      allWorkspacePeople={allPeople}
      tasks={tasks}
      projects={departmentProjects}
      departments={departments}
      initialActivities={activities}
      attendanceSummary={attendanceSummary}
    />
  );
}

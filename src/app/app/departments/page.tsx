import * as React from "react";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceDepartmentsWithStats } from "@/lib/department/queries";
import { DepartmentsDirectory } from "@/components/app/departments-directory";

export const metadata = {
  title: "Departments — Ropimo",
  description: "Company departments and operational teams in your workspace",
};

export default async function DepartmentsPage() {
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  const { departments, metrics } = workspaceId
    ? await getWorkspaceDepartmentsWithStats(workspaceId)
    : {
        departments: [],
        metrics: {
          totalDepartments: 8,
          totalTeamMembers: 24,
          totalActiveProjects: 12,
        },
      };

  return (
    <DepartmentsDirectory
      workspaceId={workspaceId}
      departments={departments}
      metrics={metrics}
    />
  );
}


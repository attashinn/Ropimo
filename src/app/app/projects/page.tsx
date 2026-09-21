import * as React from "react";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceTasks } from "@/lib/task/queries";
import { ProjectsDirectory } from "@/components/app/projects-directory";

export const metadata = {
  title: "Projects — Ropimo",
  description: "Track and manage all company projects in one place.",
};

export default async function ProjectsPage() {
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  if (!workspaceId) {
    return (
      <ProjectsDirectory
        workspaceId=""
        workspaceName="brnnd"
        projects={[]}
        departments={[]}
        people={[]}
        tasks={[]}
        userRole="member"
      />
    );
  }

  const [projects, departments, people, tasks] = await Promise.all([
    getWorkspaceProjects(workspaceId),
    getWorkspaceDepartments(workspaceId),
    getWorkspacePeople(workspaceId),
    getWorkspaceTasks(workspaceId),
  ]);

  return (
    <ProjectsDirectory
      workspaceId={workspaceId}
      workspaceName={workspace?.name || "brnnd"}
      projects={projects}
      departments={departments}
      people={people}
      tasks={tasks}
      userRole={workspace?.role || "owner"}
    />
  );
}

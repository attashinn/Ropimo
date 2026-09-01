import * as React from "react";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getTaskById } from "@/lib/task/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { TaskDetailView } from "@/components/app/task-detail-view";

export interface TaskDetailPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { taskId } = await params;
  const workspace = await getDefaultWorkspace();

  if (!workspace) {
    notFound();
  }

  const task = await getTaskById(taskId, workspace.id);

  if (!task) {
    notFound();
  }

  const people = await getWorkspacePeople(workspace.id);
  const projects = await getWorkspaceProjects(workspace.id);
  const departments = await getWorkspaceDepartments(workspace.id);

  return (
    <TaskDetailView
      task={task}
      workspace={workspace}
      people={people}
      projects={projects}
      departments={departments}
    />
  );
}

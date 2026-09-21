import * as React from "react";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getProjectById, getWorkspaceProjects } from "@/lib/project/queries";
import { getProjectTasks } from "@/lib/task/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { ProjectDetailView } from "@/components/app/project-detail-view";

export interface ProjectDetailPageProps {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    phase?: string;
  }>;
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const phase = resolvedSearchParams?.phase;
  const workspace = await getDefaultWorkspace();

  if (!workspace) {
    notFound();
  }

  const project = await getProjectById(projectId, workspace.id);

  if (!project) {
    notFound();
  }

  const tasks = await getProjectTasks(projectId, workspace.id);
  const people = await getWorkspacePeople(workspace.id);
  const projects = await getWorkspaceProjects(workspace.id);
  const departments = await getWorkspaceDepartments(workspace.id);

  // Fetch project files/attachments from workspace_files
  const adminClient = (await import("@/lib/supabase/admin")).createAdminClient();
  const { data: dbFiles } = await adminClient
    .from("workspace_files")
    .select("*")
    .eq("project_id", project.id)
    .eq("is_trash", false)
    .order("created_at", { ascending: false });

  return (
    <ProjectDetailView
      project={project}
      workspace={workspace}
      tasks={tasks}
      people={people}
      projects={projects}
      departments={departments}
      initialPhase={phase}
      initialFiles={dbFiles || []}
    />
  );
}

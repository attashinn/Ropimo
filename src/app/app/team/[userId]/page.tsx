import * as React from "react";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspacePersonById } from "@/lib/people/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { PersonDetailView } from "@/components/app/person-detail-view";

export interface PersonDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function PersonDetailPage({
  params,
}: PersonDetailPageProps) {
  const { userId } = await params;
  const workspace = await getDefaultWorkspace();

  if (!workspace) {
    notFound();
  }

  const person = await getWorkspacePersonById(userId, workspace.id);

  if (!person) {
    notFound();
  }

  const departments = await getWorkspaceDepartments(workspace.id);

  return (
    <PersonDetailView
      person={person}
      workspace={workspace}
      userRole={workspace.role || "member"}
      departments={departments}
    />
  );
}

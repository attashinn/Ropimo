import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceDocuments, getDocumentStats } from "@/lib/documents/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { DocumentsView } from "@/components/app/documents-view";

export const metadata = {
  title: "Documents — Ropimo",
  description: "Create, manage and collaborate on company documents.",
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const [{ data: authData }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getDefaultWorkspace(),
  ]);

  const user = authData?.user;
  const workspaceId = workspace?.id || "ws-default";
  const userId = user?.id || "u-tashin";
  const workspaceName = workspace?.name || "brnnd";

  const [
    documents,
    documentStats,
    people,
    projects,
    departments,
  ] = await Promise.all([
    getWorkspaceDocuments(workspaceId),
    getDocumentStats(workspaceId),
    getWorkspacePeople(workspaceId),
    getWorkspaceProjects(workspaceId),
    getWorkspaceDepartments(workspaceId),
  ]);

  return (
    <DocumentsView
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      currentUserId={userId}
      initialDocuments={documents}
      documentStats={documentStats}
      people={people}
      projects={projects}
      departments={departments}
    />
  );
}

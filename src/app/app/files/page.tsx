import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceFiles, getStorageOverview, getWorkspaceFileActivities } from "@/lib/files/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { FilesView } from "@/components/app/files-view";

export const metadata = {
  title: "Files — Ropimo",
  description: "Store, organize and share files across your workspace.",
};

export default async function FilesPage() {
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
    { items, allItems },
    storageStats,
    activities,
    people,
    projects,
    departments,
  ] = await Promise.all([
    getWorkspaceFiles(workspaceId),
    getStorageOverview(workspaceId),
    getWorkspaceFileActivities(workspaceId),
    getWorkspacePeople(workspaceId),
    getWorkspaceProjects(workspaceId),
    getWorkspaceDepartments(workspaceId),
  ]);

  return (
    <FilesView
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      currentUserId={userId}
      initialItems={items}
      allInitialItems={allItems}
      storageStats={storageStats}
      initialActivities={activities}
      people={people}
      projects={projects}
      departments={departments}
    />
  );
}

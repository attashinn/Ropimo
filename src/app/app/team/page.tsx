import * as React from "react";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { PeopleDirectory } from "@/components/app/people-directory";

export const metadata = {
  title: "People — Ropimo",
  description: "Everyone working across your office",
};

export default async function TeamPage() {
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  if (!workspaceId) {
    return (
      <PeopleDirectory
        workspaceId=""
        userRole="member"
        people={[]}
        departments={[]}
      />
    );
  }

  const [people, departments] = await Promise.all([
    getWorkspacePeople(workspaceId),
    getWorkspaceDepartments(workspaceId),
  ]);


  return (
    <PeopleDirectory
      workspaceId={workspaceId}
      workspaceName={workspace?.name || "brnnd"}
      userRole={workspace?.role || "owner"}
      people={people}
      departments={departments}
    />
  );
}

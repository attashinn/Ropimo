import * as React from "react";
import { redirect } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { JobOpeningEditor } from "@/components/app/recruitment/job-opening-editor";

export const metadata = {
  title: "New Job Opening — Ropimo",
};

export default async function NewJobOpeningPage() {
  const workspace = await getDefaultWorkspace();
  if (!workspace?.id) {
    redirect("/app/people");
  }

  const [departments, people] = await Promise.all([
    getWorkspaceDepartments(workspace.id),
    getWorkspacePeople(workspace.id),
  ]);

  const memberOptions = (people || []).map((p) => ({
    id: p.id,
    name: p.full_name || p.email,
    role: p.role,
  }));

  return (
    <JobOpeningEditor
      workspaceId={workspace.id}
      workspaceSlug={workspace.slug || workspace.id}
      userRole={(workspace as any).userRole || "admin"}
      departments={departments || []}
      members={memberOptions}
      initialJob={null}
    />
  );
}

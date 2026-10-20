import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceJobOpenings } from "@/lib/recruitment/queries";
import { JobOpeningEditor } from "@/components/app/recruitment/job-opening-editor";

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export const metadata = {
  title: "Edit Job Opening — Zambic",
};

export default async function EditJobOpeningPage(props: PageProps) {
  const params = await props.params;
  const workspace = await getDefaultWorkspace();
  if (!workspace?.id) {
    redirect("/app/people");
  }

  const [departments, people, jobOpenings] = await Promise.all([
    getWorkspaceDepartments(workspace.id),
    getWorkspacePeople(workspace.id),
    getWorkspaceJobOpenings(workspace.id),
  ]);

  const job = (jobOpenings || []).find((j) => j.id === params.jobId);
  if (!job) {
    notFound();
  }

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
      initialJob={job}
    />
  );
}

import * as React from "react";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getCandidateById } from "@/lib/recruitment/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { CandidateDetailView } from "@/components/app/recruitment/candidate-detail-view";

export const metadata = {
  title: "Candidate Profile — Ropimo",
};

export default async function CandidateDetailPage(props: {
  params: Promise<{ candidateId: string }>;
}) {
  const params = await props.params;
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  if (!workspaceId) {
    notFound();
  }

  const [{ candidate, applications, interviews, offers, activities }, departments, teamMembers] =
    await Promise.all([
      getCandidateById(params.candidateId, workspaceId),
      getWorkspaceDepartments(workspaceId),
      getWorkspacePeople(workspaceId),
    ]);

  if (!candidate) {
    notFound();
  }

  return (
    <CandidateDetailView
      workspaceId={workspaceId}
      workspaceName={workspace?.name || "Workspace"}
      userRole={workspace?.role || "owner"}
      candidate={candidate}
      applications={applications}
      interviews={interviews}
      offers={offers}
      activities={activities}
      departments={departments}
      teamMembers={teamMembers}
    />
  );
}

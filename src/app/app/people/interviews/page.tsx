import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceInterviews } from "@/lib/recruitment/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { InterviewsView } from "@/components/app/recruitment/interviews-view";

export const metadata = {
  title: "Interviews — Ropimo",
};

export default async function InterviewsPage() {
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  if (!workspaceId) {
    notFound();
  }

  const [interviews, people] = await Promise.all([
    getWorkspaceInterviews(workspaceId),
    getWorkspacePeople(workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-24 text-[#18221E]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#65706A]">
        <Link href="/app" className="hover:text-[#18221E] transition-colors">
          {workspace?.name || "Workspace"}
        </Link>
        <span>/</span>
        <Link href="/app/people" className="hover:text-[#18221E] transition-colors">
          People & Recruitment
        </Link>
        <span>/</span>
        <span className="font-semibold text-[#18221E]">Interviews</span>
      </div>

      <InterviewsView
        workspaceId={workspaceId}
        userRole={workspace?.role || "owner"}
        interviews={interviews}
        teamMembers={people}
      />
    </div>
  );
}

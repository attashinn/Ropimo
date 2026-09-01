import * as React from "react";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import {
  getWorkspacePeople,
  getWorkspaceMemberProjectsAndActivitiesMaps,
  MemberActivitySummary,
  MemberProjectSummary,
} from "@/lib/people/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import {
  getWorkspaceJobOpenings,
  getWorkspaceCandidates,
  getWorkspaceInterviews,
  getRecruitmentStats,
} from "@/lib/recruitment/queries";
import { getWorkspaceInvitations } from "@/lib/invitations/queries";
import { PeopleDirectory } from "@/components/app/people-directory";

export const metadata = {
  title: "People & Recruitment — Ropimo",
  description: "Manage your team, employee information, recruitment pipeline, job openings, and interviews.",
};

export default async function PeoplePage() {
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  if (!workspaceId) {
    return (
      <PeopleDirectory
        workspaceId=""
        workspaceName="brnnd"
        userRole="member"
        people={[]}
        departments={[]}
        invitations={[]}
        jobOpenings={[]}
        candidates={[]}
        interviews={[]}
        recruitmentStats={{
          openJobsCount: 0,
          activeCandidatesCount: 0,
          interviewsScheduledCount: 0,
          offersPendingCount: 0,
          hiredThisQuarterCount: 0,
        }}
      />
    );
  }

  const [
    people,
    departments,
    invitations,
    jobOpenings,
    candidates,
    interviews,
    recruitmentStats,
    { memberActivitiesMap, memberProjectsMap },
  ] = await Promise.all([
    getWorkspacePeople(workspaceId),
    getWorkspaceDepartments(workspaceId),
    getWorkspaceInvitations(workspaceId),
    getWorkspaceJobOpenings(workspaceId),
    getWorkspaceCandidates(workspaceId),
    getWorkspaceInterviews(workspaceId),
    getRecruitmentStats(workspaceId),
    getWorkspaceMemberProjectsAndActivitiesMaps(workspaceId),
  ]);

  return (
    <PeopleDirectory
      workspaceId={workspaceId}
      workspaceName={workspace?.name || "brnnd"}
      userRole={workspace?.role || "owner"}
      people={people}
      departments={departments}
      invitations={invitations}
      memberActivitiesMap={memberActivitiesMap}
      memberProjectsMap={memberProjectsMap}
      jobOpenings={jobOpenings}
      candidates={candidates}
      interviews={interviews}
      recruitmentStats={recruitmentStats}
    />
  );
}

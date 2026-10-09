import * as React from "react";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import {
  getWorkspaceMeetings,
  getMeetingStats,
  getMeetingInsights,
} from "@/lib/meetings/queries";
import { MeetingsView } from "@/components/app/meetings-view";

export const metadata = {
  title: "Meetings — Ropimo",
  description: "Schedule, manage and track all company meetings in one place.",
};

export default async function MeetingsPage() {
  const workspace = await getDefaultWorkspace();
  const workspaceId = workspace?.id || "";

  const [initialMeetings, meetingStats, meetingInsights] = await Promise.all([
    getWorkspaceMeetings(workspaceId),
    getMeetingStats(workspaceId),
    getMeetingInsights(workspaceId),
  ]);

  return (
    <MeetingsView
      workspaceId={workspaceId}
      workspaceName={workspace?.name || "Workspace"}
      initialMeetings={initialMeetings}
      meetingStats={meetingStats}
      meetingInsights={meetingInsights}
    />
  );
}

import * as React from "react";
import { MeetingsView } from "@/components/app/meetings-view";
import {
  DEFAULT_MEETINGS_DATA,
  DEFAULT_MEETING_STATS,
  DEFAULT_MEETING_INSIGHTS,
} from "@/lib/meetings/queries";

export const metadata = {
  title: "Meetings — Ropimo",
  description: "Schedule, manage and track all company meetings in one place.",
};

export default async function MeetingsPage() {
  return (
    <MeetingsView
      workspaceId="ws-default"
      workspaceName="brnnd"
      initialMeetings={DEFAULT_MEETINGS_DATA}
      meetingStats={DEFAULT_MEETING_STATS}
      meetingInsights={DEFAULT_MEETING_INSIGHTS}
    />
  );
}

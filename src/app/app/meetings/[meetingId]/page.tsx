import * as React from "react";
import { notFound } from "next/navigation";
import { getMeetingById } from "@/lib/meetings/queries";
import { MeetingDetailView } from "@/components/app/meeting-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const meeting = getMeetingById(meetingId);
  return {
    title: meeting ? `${meeting.title} — Ropimo Meetings` : "Meeting — Ropimo",
    description: meeting?.description ?? "Meeting details",
  };
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const meeting = getMeetingById(meetingId);

  if (!meeting) {
    notFound();
  }

  return <MeetingDetailView meeting={meeting} workspaceName="brnnd" />;
}

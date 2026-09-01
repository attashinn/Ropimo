import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getWorkspaceCalendarEvents } from "@/lib/calendar/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { CalendarView } from "@/components/app/calendar-view";

export const metadata = {
  title: "Calendar — Ropimo",
  description: "Plan tasks, meetings, deadlines, and important company events.",
};

export default async function CalendarPage() {
  const supabase = await createClient();
  const [{ data: authData }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getDefaultWorkspace(),
  ]);

  const user = authData?.user;
  const workspaceId = workspace?.id || "ws-default";
  const userId = user?.id || "u-tashin";
  const workspaceName = workspace?.name || "brnnd";

  const [events, people, projects, departments] = await Promise.all([
    getWorkspaceCalendarEvents(workspaceId, userId),
    getWorkspacePeople(workspaceId),
    getWorkspaceProjects(workspaceId),
    getWorkspaceDepartments(workspaceId),
  ]);

  return (
    <CalendarView
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      currentUserId={userId}
      initialEvents={events}
      people={people}
      projects={projects}
      departments={departments}
    />
  );
}

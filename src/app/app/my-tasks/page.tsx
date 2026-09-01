import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getMyTasks } from "@/lib/task/queries";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";
import { MyTasksView } from "@/components/app/my-tasks-view";

export const metadata = {
  title: "My Tasks — Ropimo",
  description: "Tasks and sprint deliverables assigned to you across your office",
};

export default async function MyTasksPage() {
  const supabase = await createClient();
  const [{ data: authData }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getDefaultWorkspace(),
  ]);

  const user = authData?.user;
  const workspaceId = workspace?.id || "";
  const userId = user?.id || "";

  if (!workspaceId) {
    return (
      <MyTasksView
        workspaceId=""
        currentUserId=""
        categorized={{
          overdue: [],
          today: [],
          upcoming: [],
          noDueDate: [],
          completed: [],
        }}
        people={[]}
        projects={[]}
        departments={[]}
      />
    );
  }

  const [categorized, people, projects, departments] = await Promise.all([
    userId
      ? getMyTasks(userId, workspaceId)
      : {
          overdue: [],
          today: [],
          upcoming: [],
          noDueDate: [],
          completed: [],
        },
    getWorkspacePeople(workspaceId),
    getWorkspaceProjects(workspaceId),
    getWorkspaceDepartments(workspaceId),
  ]);

  return (
    <MyTasksView
      workspaceId={workspaceId}
      workspaceName={workspace?.name || "brnnd"}
      currentUserId={userId}
      categorized={categorized}
      people={people}
      projects={projects}
      departments={departments}
    />
  );
}


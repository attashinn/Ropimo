import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { queryAIGateway, WorkspaceContextData, AgentAction } from "@/lib/ai/gateway";
import { getWorkspacePeople } from "@/lib/people/queries";
import { createProjectAction } from "@/lib/project/actions";
import { createTaskAction } from "@/lib/task/actions";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, model, workspaceId, autoExecute } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required." },
        { status: 400 }
      );
    }

    // Gather workspace context
    let workspaceContext: WorkspaceContextData = {
      userName:
        (user.user_metadata?.full_name as string) ||
        (user.email ? user.email.split("@")[0] : "Team Member"),
    };

    let people: any[] = [];

    if (workspaceId) {
      const [wsRes, projRes, taskRes, deptRes, peopleRes] = await Promise.all([
        supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
        supabase
          .from("projects")
          .select("id, name, status, progress")
          .eq("workspace_id", workspaceId)
          .limit(8),
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date")
          .eq("workspace_id", workspaceId)
          .limit(10),
        supabase
          .from("departments")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .limit(8),
        getWorkspacePeople(workspaceId).catch(() => []),
      ]);

      people = peopleRes || [];

      workspaceContext = {
        ...workspaceContext,
        workspaceName: wsRes.data?.name || "Workspace",
        projects: projRes.data?.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          progress: p.progress,
        })) || [],
        tasks: taskRes.data?.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date,
        })) || [],
        departments: deptRes.data?.map((d) => ({
          id: d.id,
          name: d.name,
        })) || [],
        teamMembers: people.map((p) => ({
          id: p.user_id,
          name: p.full_name || (p.email ? p.email.split("@")[0] : "Member"),
          email: p.email,
          role: p.job_title || p.role || "Member",
        })),
      };
    }

    const gatewayResult = await queryAIGateway({
      messages,
      model,
      workspaceContext,
    });

    if (!gatewayResult.success) {
      return NextResponse.json(gatewayResult);
    }

    // Check if the user message indicates an explicit creation command
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const isExplicitCreate =
      Boolean(autoExecute) ||
      /\b(create|make|build|set\s*up|add\s+(a\s+)?(project|task)|u\s+create|assign)\b/i.test(lastUserMsg);

    // If explicit create command and actions were parsed, execute them autonomously
    if (workspaceId && isExplicitCreate && gatewayResult.actions && gatewayResult.actions.length > 0) {
      let createdProjectId: string | undefined;
      let createdProjectName: string | undefined;
      let createdTasksCount = 0;

      for (const action of gatewayResult.actions) {
        try {
          if (action.type === "create_project") {
            const projName = action.payload.title || action.payload.name || action.title;
            const projDesc = action.payload.description || action.description;
            const pRes = await createProjectAction({
              workspaceId,
              name: projName,
              description: projDesc,
              status: "active",
            });
            if (pRes.success && pRes.project) {
              createdProjectId = pRes.project.id;
              createdProjectName = pRes.project.name;
              action.executed = true;
              action.result = pRes.project;
            }
          } else if (action.type === "create_task") {
            const taskTitle = action.payload.title || action.title;
            const taskDesc = action.payload.description || action.description;
            const taskPriority = action.payload.priority || "medium";

            // Resolve assignees if mentioned
            const assigneeIds: string[] = [];
            const rawAssignee = (action.payload.assigneeName || action.payload.assignee || "").toLowerCase();

            if (rawAssignee) {
              if (rawAssignee === "me" || rawAssignee === "you") {
                assigneeIds.push(user.id);
              } else {
                const matched = people.find((p) => {
                  const pName = (p.full_name || "").toLowerCase();
                  const pEmail = (p.email || "").toLowerCase();
                  return pName.includes(rawAssignee) || pEmail.includes(rawAssignee);
                });
                if (matched?.user_id) {
                  assigneeIds.push(matched.user_id);
                }
              }
            }

            // Also check if prompt explicitly mentions Tashin
            if (assigneeIds.length === 0 && /\btashin\b/i.test(lastUserMsg)) {
              const tashin = people.find((p) =>
                (p.full_name || "").toLowerCase().includes("tashin") ||
                (p.email || "").toLowerCase().includes("tashin")
              );
              if (tashin?.user_id) {
                assigneeIds.push(tashin.user_id);
              }
            }

            const tRes = await createTaskAction({
              workspaceId,
              projectId: createdProjectId || action.payload.projectId,
              title: taskTitle,
              description: taskDesc,
              priority: (taskPriority as any) || "medium",
              status: "todo",
              assigneeIds,
            });

            if (tRes.success) {
              action.executed = true;
              action.result = tRes;
              createdTasksCount++;
            }
          }
        } catch (execErr) {
          console.error("Auto-execution error for action:", action.type, execErr);
        }
      }

      if (createdProjectName || createdTasksCount > 0) {
        try {
          revalidatePath("/app");
          revalidatePath("/app/projects");
          revalidatePath("/app/tasks");
        } catch {
          // Ignore revalidatePath in route context
        }

        const confirmationLines: string[] = [];
        if (createdProjectName) {
          confirmationLines.push(`✅ **Project Created:** **${createdProjectName}**`);
        }
        if (createdTasksCount > 0) {
          confirmationLines.push(`✅ **${createdTasksCount} Task${createdTasksCount > 1 ? "s" : ""} Created & Assigned** in workspace`);
        }

        gatewayResult.content = (gatewayResult.content ? gatewayResult.content + "\n\n---\n" : "") +
          `🚀 **Autonomous Execution Completed:**\n` +
          confirmationLines.join("\n");
      }
    }

    return NextResponse.json(gatewayResult);
  } catch (error: any) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

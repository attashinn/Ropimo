import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queryAIGateway, WorkspaceContextData } from "@/lib/ai/gateway";

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
    const { messages, model, workspaceId } = body;

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

    if (workspaceId) {
      const [wsRes, projRes, taskRes, deptRes] = await Promise.all([
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
      ]);

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
      };
    }

    const gatewayResult = await queryAIGateway({
      messages,
      model,
      workspaceContext,
    });

    return NextResponse.json(gatewayResult);
  } catch (error: any) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}

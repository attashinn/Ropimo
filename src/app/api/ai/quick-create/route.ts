import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacePeople } from "@/lib/people/queries";
import { createTaskAction } from "@/lib/task/actions";
import { createProjectAction } from "@/lib/project/actions";

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
    const { prompt, type, workspaceId, autoCreate = true, attachedFiles = [] } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }

    // Fetch team members to resolve @mentions
    const people = await getWorkspacePeople(workspaceId);
    const memberContext = people.map((p) => ({
      user_id: p.user_id,
      name: p.full_name || p.email.split("@")[0] || "Member",
      role: p.job_title || p.role || "Member",
      email: p.email,
    }));

    // Call Cloudflare Workers AI to parse prompt
    const token = process.env.CLOUDFLARE_AI_TOKEN || "";
    const accountId =
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
      "";

    const isProject = type === "project";

    const systemPrompt = `You are an expert project operations parser for Ropimo platform.
Given a user instruction and workspace team members, extract or generate the structured ${isProject ? "project" : "task"} details.

Available Team Members:
${memberContext.map((m) => `- "${m.name}" (Role: ${m.role}, user_id: "${m.user_id}")`).join("\n")}

${attachedFiles.length > 0 ? `Attached Documents/Files:\n${attachedFiles.map((f: any) => `- ${f.name}`).join("\n")}` : ""}

Today's date is ${new Date().toISOString().split("T")[0]}.

Return ONLY a raw JSON object (NO markdown backticks, NO markdown formatting, NO extra text):
${
  isProject
    ? `{
  "name": "Project Name (clean, concise)",
  "description": "Comprehensive project brief and goals",
  "priority": "urgent" | "high" | "normal" | "low",
  "dueDate": "YYYY-MM-DD" or null,
  "leadId": "user_id from team members matching @mention or null",
  "leadName": "Name of lead or null"
}`
    : `{
  "title": "Task title (clean, actionable)",
  "description": "Clear description and execution guidelines",
  "priority": "urgent" | "high" | "normal" | "low",
  "dueDate": "YYYY-MM-DD" or null,
  "assigneeIds": ["user_id from team members matching @mention"] or [],
  "assigneeName": "Name of assigned member or null",
  "acceptanceCriteria": ["Criterion 1", "Criterion 2", "Criterion 3"]
}`
}`;

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
    const cfResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const cfData = await cfResponse.json();
    let content = cfData?.choices?.[0]?.message?.content || "";

    // Clean JSON output
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();
    if (content.includes("</think>")) {
      content = content.split("</think>")[1].trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback manual parse
      parsed = isProject
        ? {
            name: prompt.slice(0, 50).trim(),
            description: prompt,
            priority: "normal",
            dueDate: null,
            leadId: null,
          }
        : {
            title: prompt.slice(0, 60).trim(),
            description: prompt,
            priority: "normal",
            dueDate: null,
            assigneeIds: [],
            acceptanceCriteria: [],
          };
    }

    // Auto-create in database if requested
    if (autoCreate) {
      if (isProject) {
        let dbPriority: any = "medium";
        if (parsed.priority === "urgent") dbPriority = "urgent";
        else if (parsed.priority === "high") dbPriority = "high";
        else if (parsed.priority === "low") dbPriority = "low";

        const projRes = await createProjectAction({
          workspaceId,
          name: parsed.name || "New AI Project",
          description: parsed.description || prompt,
          priority: dbPriority,
          leadId: parsed.leadId || undefined,
          dueDate: parsed.dueDate || undefined,
          status: "planning",
        });

        if (projRes.success && projRes.project && attachedFiles.length > 0) {
          try {
            const adminClient = (await import("@/lib/supabase/admin")).createAdminClient();
            const fileRows = attachedFiles.map((f: any) => ({
              workspace_id: workspaceId,
              project_id: projRes.project!.id,
              name: f.name || "Attached Asset",
              file_type: f.type?.includes("image") ? "image" : "document",
              extension: f.name?.includes(".") ? f.name.split(".").pop()?.toLowerCase() : "file",
              file_size: f.sizeInBytes || 1024,
              file_url: f.url || "/uploads/placeholder.png",
              uploaded_by: user.id,
            }));
            await adminClient.from("workspace_files").insert(fileRows);
          } catch (fileErr) {
            console.warn("Could not save project attached files:", fileErr);
          }
        }

        return NextResponse.json({
          success: projRes.success,
          createdItem: projRes.project,
          parsed,
          error: projRes.error,
        });
      } else {
        let dbPriority: any = "medium";
        if (parsed.priority === "urgent") dbPriority = "urgent";
        else if (parsed.priority === "high") dbPriority = "high";
        else if (parsed.priority === "low") dbPriority = "low";

        const taskRes = await createTaskAction({
          workspaceId,
          title: parsed.title || "New AI Task",
          description: parsed.description || prompt,
          priority: dbPriority,
          dueDate: parsed.dueDate || undefined,
          assigneeIds: parsed.assigneeIds && parsed.assigneeIds.length > 0 ? parsed.assigneeIds : undefined,
          status: "todo",
        });

        if (taskRes.success && taskRes.taskId && attachedFiles.length > 0) {
          try {
            const adminClient = (await import("@/lib/supabase/admin")).createAdminClient();
            const fileRows = attachedFiles.map((f: any) => ({
              workspace_id: workspaceId,
              task_id: taskRes.taskId,
              file_name: f.name || "Attached Asset",
              file_type: f.type || "document",
              file_size: f.sizeInBytes || 1024,
              file_url: f.url || "/uploads/placeholder.png",
              uploaded_by: user.id,
            }));
            await adminClient.from("task_attachments").insert(fileRows);
          } catch (fileErr) {
            console.warn("Could not save task attached files:", fileErr);
          }
        }

        return NextResponse.json({
          success: taskRes.success,
          taskId: taskRes.taskId,
          parsed,
          error: taskRes.error,
        });
      }
    }

    return NextResponse.json({ success: true, parsed });
  } catch (error: any) {
    console.error("AI quick-create error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate item with AI." },
      { status: 500 }
    );
  }
}

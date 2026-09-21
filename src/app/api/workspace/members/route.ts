import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getDefaultWorkspace } from "@/lib/workspace/queries";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      const defaultWs = await getDefaultWorkspace();
      workspaceId = defaultWs?.id || null;
    }

    if (!workspaceId) {
      return NextResponse.json({ members: [] });
    }

    const people = await getWorkspacePeople(workspaceId);

    const members = people.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      name: p.full_name || p.email.split("@")[0] || "Team Member",
      email: p.email,
      role: p.job_title || p.role || "Member",
      avatarUrl: p.avatar_url,
    }));

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Failed to fetch workspace members:", error);
    return NextResponse.json({ members: [] });
  }
}

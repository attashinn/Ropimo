import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getDefaultWorkspace } from "@/lib/workspace/queries";

const GetMembersQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

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
    const rawWorkspaceId = searchParams.get("workspaceId") || undefined;
    const parseResult = GetMembersQuerySchema.safeParse({ workspaceId: rawWorkspaceId });

    let workspaceId = parseResult.success ? parseResult.data.workspaceId : undefined;

    if (!workspaceId) {
      const defaultWs = await getDefaultWorkspace();
      workspaceId = defaultWs?.id || undefined;
    }

    if (!workspaceId) {
      return NextResponse.json({ members: [] });
    }

    const { getUserPermissionContext } = await import("@/lib/permissions-server");
    const userPerm = await getUserPermissionContext(workspaceId, user.id);
    if (!userPerm || userPerm.isDeactivated) {
      return NextResponse.json(
        { error: "Forbidden: You are not an active member of this workspace." },
        { status: 403 }
      );
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
  } catch (error: unknown) {
    console.error("Failed to fetch workspace members:", error);
    return NextResponse.json({ members: [] });
  }
}

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Workspace, WorkspaceRole } from "@/types/workspace";

/**
 * Fetch all workspaces for the currently authenticated user (deduplicated per request)
 */
export const getUserWorkspaces = cache(async (): Promise<Workspace[]> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Fetch workspace_members and join with workspaces table
  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      role,
      workspaces:workspace_id (
        id,
        name,
        slug,
        icon,
        logo_url,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", user.id);

  if (error || !data) {
    return [];
  }

  // Flatten the relation
  return data
    .filter((item) => item.workspaces !== null)
    .map((item) => {
      const ws = Array.isArray(item.workspaces)
        ? item.workspaces[0]
        : item.workspaces;
      return {
        ...ws,
        role: item.role as WorkspaceRole,
      };
    });
});

/**
 * Get the default or first active workspace for the user (deduplicated per request)
 */
export const getDefaultWorkspace = cache(async (): Promise<Workspace | null> => {
  const workspaces = await getUserWorkspaces();
  if (!workspaces || workspaces.length === 0) {
    return null;
  }
  return workspaces[0];
});


"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SearchTaskResult {
  id: string;
  title: string;
  status: string;
}

export interface SearchProjectResult {
  id: string;
  name: string;
  color?: string;
}

export interface SearchPersonResult {
  id: string;
  fullName: string;
  role?: string;
  jobTitle?: string;
}

export interface SearchFileResult {
  id: string;
  name: string;
  fileType?: string;
}

export interface WorkspaceSearchResults {
  tasks: SearchTaskResult[];
  projects: SearchProjectResult[];
  people: SearchPersonResult[];
  files: SearchFileResult[];
}

export async function searchWorkspaceAction(
  workspaceId: string,
  query: string
): Promise<WorkspaceSearchResults> {
  const empty: WorkspaceSearchResults = {
    tasks: [],
    projects: [],
    people: [],
    files: [],
  };

  const trimmed = query.trim();
  if (!workspaceId || !trimmed || trimmed.length < 1) {
    return empty;
  }

  const adminClient = createAdminClient();
  const searchPattern = `%${trimmed}%`;

  try {
    const [tasksRes, projectsRes, peopleRes, filesRes] = await Promise.all([
      // Tasks
      adminClient
        .from("tasks")
        .select("id, title, status")
        .eq("workspace_id", workspaceId)
        .ilike("title", searchPattern)
        .limit(6),

      // Projects
      adminClient
        .from("projects")
        .select("id, name, color")
        .eq("workspace_id", workspaceId)
        .ilike("name", searchPattern)
        .limit(6),

      // People
      adminClient
        .from("people")
        .select("id, full_name, role, job_title")
        .eq("workspace_id", workspaceId)
        .ilike("full_name", searchPattern)
        .limit(6),

      // Files / Documents
      adminClient
        .from("files")
        .select("id, name, file_type")
        .eq("workspace_id", workspaceId)
        .ilike("name", searchPattern)
        .limit(6),
    ]);

    return {
      tasks: (tasksRes.data || []).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
      })),
      projects: (projectsRes.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color || undefined,
      })),
      people: (peopleRes.data || []).map((m) => ({
        id: m.id,
        fullName: m.full_name,
        role: m.role || undefined,
        jobTitle: m.job_title || undefined,
      })),
      files: (filesRes.data || []).map((f) => ({
        id: f.id,
        name: f.name,
        fileType: f.file_type || undefined,
      })),
    };
  } catch (err) {
    console.error("Workspace search error:", err);
    return empty;
  }
}

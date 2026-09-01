import { createAdminClient } from "@/lib/supabase/admin";

async function inspectDepts() {
  const admin = createAdminClient();
  const { data: workspaces } = await admin.from("workspaces").select("id").limit(1);
  const workspaceId = workspaces?.[0]?.id || "";

  console.log("Workspace ID:", workspaceId);

  const { data: depts } = await admin.from("departments").select("*").eq("workspace_id", workspaceId);
  console.log("Departments:", depts);

  const { data: deptMembers } = await admin.from("department_members").select("*").eq("workspace_id", workspaceId);
  console.log("Department Members:", deptMembers);

  const { data: members } = await admin.from("workspace_members").select("*").eq("workspace_id", workspaceId);
  console.log("Workspace Members:", members);
}

inspectDepts();

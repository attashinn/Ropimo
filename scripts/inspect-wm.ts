import { createAdminClient } from "@/lib/supabase/admin";

async function inspectWorkspaceMembers() {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from("workspace_members").select("*").limit(1);
  console.log("workspace_members error:", error);
  console.log("workspace_members columns:", data ? Object.keys(data[0] || {}) : []);
  console.log("workspace_members sample row:", data);
}

inspectWorkspaceMembers().catch(console.error);

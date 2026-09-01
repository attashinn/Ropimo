import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspace_members")
    .select("user_id, role, full_name")
    .eq("workspace_id", "9de7814a-cd5d-483a-92cc-2de4f46738b3");

  console.log("workspace_members rows:", JSON.stringify(data, null, 2));
}

main();

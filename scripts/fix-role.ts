import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();

  const { error } = await admin
    .from("workspace_members")
    .update({ role: "owner" })
    .eq("workspace_id", "9de7814a-cd5d-483a-92cc-2de4f46738b3")
    .eq("user_id", "8462fdb0-a723-413a-8df6-c10c7c954003");

  console.log(error ? `ERROR: ${error.message}` : "OK: Role updated to owner");

  const { data } = await admin
    .from("workspace_members")
    .select("user_id, role, full_name")
    .eq("workspace_id", "9de7814a-cd5d-483a-92cc-2de4f46738b3");

  console.log("Verified:", JSON.stringify(data));
}

main();

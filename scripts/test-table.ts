import { createAdminClient } from "@/lib/supabase/admin";

async function test() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("workspace_meetings").select("id").limit(1);
  console.log("workspace_meetings select test:", { data, error });
}

test();

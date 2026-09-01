import { createAdminClient } from "@/lib/supabase/admin";

async function test() {
  const admin = createAdminClient();
  // Try inserting a test record to job_openings to see if it exists
  const { data, error } = await admin.from("job_openings").select("id").limit(1);
  console.log("job_openings select test:", { data, error });
}

test();

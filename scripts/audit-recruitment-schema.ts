import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  const tables = [
    "job_openings",
    "jobs",
    "candidates",
    "applications",
    "candidate_applications",
    "interviews",
    "interview_feedback",
    "offers",
    "job_offers",
    "application_stage_history",
    "candidate_activities",
    "notifications",
    "workspace_invitations",
    "departments",
    "department_members",
    "workspace_members",
    "task_activities",
    "documents",
    "attachments",
  ];

  console.log("=== SUPABASE SCHEMA AUDIT FOR RECRUITMENT ===");
  for (const t of tables) {
    const { error, count } = await admin.from(t).select("*", { count: "exact", head: true });
    if (!error) {
      console.log(`[EXISTS] ${t.padEnd(26)} (row count: ${count})`);
    } else {
      console.log(`[MISSING] ${t.padEnd(25)} error: ${error.message}`);
    }
  }
}

main().catch(console.error);

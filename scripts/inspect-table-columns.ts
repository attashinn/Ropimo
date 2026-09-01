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

  for (const t of tables) {
    const { data, error } = await admin.from(t).select("*").limit(1);
    if (error) {
      console.log(`[DOES NOT EXIST] ${t}: ${error.code} - ${error.message}`);
    } else {
      const sample = data?.[0];
      const cols = sample ? Object.keys(sample).join(", ") : "(empty table, exists)";
      console.log(`[EXISTS] ${t}: columns -> ${cols}`);
    }
  }
}

main().catch(console.error);

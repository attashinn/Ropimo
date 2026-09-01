import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  
  const tables = [
    "workspaces",
    "workspace_members",
    "departments",
    "department_members",
    "attendance_records",
    "attendance_settings",
    "attendance",
    "leave_requests",
    "leave_balances",
    "profiles",
  ];

  for (const table of tables) {
    try {
      const { data, error } = await admin.from(table).select("*").limit(2);
      if (error) {
        console.log(`Table '${table}': ERROR -> ${error.message} (code: ${error.code})`);
      } else {
        console.log(`Table '${table}': EXISTS (${data?.length || 0} sample rows). Columns:`, data && data[0] ? Object.keys(data[0]) : "No rows yet");
      }
    } catch (e: any) {
      console.log(`Table '${table}': EXCEPTION ->`, e.message);
    }
  }
}

main().catch(console.error);

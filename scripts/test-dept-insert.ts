import { createAdminClient } from "@/lib/supabase/admin";

async function testDeptInsert() {
  const admin = createAdminClient();
  const workspaceId = "9de7814a-cd5d-483a-92cc-2de4f46738b3";
  const devDeptId = "816f57dc-ec7c-465e-95ca-0ca906d523e7"; // Development
  const userId = "9544e2b2-92f1-4402-9d24-6b61319100bc"; // Jesmin Sikder

  // Delete existing department members for this user if any
  await admin.from("department_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);

  // Insert into Development
  const { data, error } = await admin.from("department_members").insert({
    workspace_id: workspaceId,
    department_id: devDeptId,
    user_id: userId,
    job_title: "Principal Fullstack Engineer 2099",
  }).select();

  console.log("Insert Development department result:", data, error);

  // Also assign Tashin khan to Development if needed or check
  const { data: allDeptMembers } = await admin.from("department_members").select(`
    *,
    departments:department_id (id, name)
  `).eq("workspace_id", workspaceId);

  console.log("All department members now:", JSON.stringify(allDeptMembers, null, 2));
}

testDeptInsert();

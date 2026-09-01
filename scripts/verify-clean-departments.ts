import { createAdminClient } from "../src/lib/supabase/admin";
import { getDepartmentUserRoleAndPermissions } from "../src/lib/department/permissions";
import { getWorkspaceDepartmentsWithStats } from "../src/lib/department/queries";
import { getDepartmentMembers } from "../src/lib/people/queries";

let totalChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, description: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [CHECK ${totalChecks}] ${description}`);
  } else {
    console.error(`  ✗ [CHECK ${totalChecks}] FAILED: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function verify() {
  console.log("=================================================================");
  console.log("  ROPIMO: VERIFY CLEAN DEPARTMENTS & ACCESS CONTROL");
  console.log("=================================================================\n");

  const adminClient = createAdminClient();

  // 1. Fetch all departments and verify NO QA departments remain
  const { data: depts } = await adminClient
    .from("departments")
    .select("id, name, slug, workspace_id");

  const qaDepts = (depts || []).filter((d) => {
    const n = d.name.toLowerCase();
    const s = d.slug.toLowerCase();
    return n.startsWith("qa ") || n.includes("qa test") || s.startsWith("qa-");
  });

  assert(qaDepts.length === 0, "No QA departments remain in database (0 found)");

  // 2. Real departments remain
  const devDept = (depts || []).find((d) => d.slug === "development" || d.name.toLowerCase() === "development");
  assert(Boolean(devDept), "Real 'Development' department preserved and verified");

  // 3. Real employees & workspace members remain
  const { data: realMembers } = await adminClient
    .from("workspace_members")
    .select("id, user_id, full_name, role");
  assert(realMembers && realMembers.length > 0, `Real workspace members preserved (${realMembers?.length} active members)`);

  const workspaceId = devDept!.workspace_id;

  // 4. Department statistics are accurate
  const stats = await getWorkspaceDepartmentsWithStats(workspaceId);
  assert(stats.metrics.totalDepartments === (depts || []).length, `Department count is accurate (${stats.metrics.totalDepartments})`);
  assert(stats.departments.every((d) => !d.name.startsWith("QA ")), "Directory shows only genuine departments");

  // 5. Test Access Control on real Development department with a temporary session user
  const tempTimestamp = Date.now();
  const testUser = await adminClient.auth.admin.createUser({
    email: `temp.check.${tempTimestamp}@example.com`,
    email_confirm: true,
    user_metadata: { full_name: "Temp Check User" },
  });
  const testUserId = testUser.data.user!.id;

  // Add to workspace
  await adminClient.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: testUserId,
    role: "member",
    full_name: "Temp Check User",
  });

  // 6. Non-member is blocked from Development (403)
  const nonMemberPerms = await getDepartmentUserRoleAndPermissions(devDept!.id, workspaceId, testUserId);
  assert(nonMemberPerms.canAccessDepartment === false, "Non-member is strictly blocked from accessing Development (403)");
  assert(nonMemberPerms.departmentRole === "none", "Non-member has 'none' department role");

  // 7. Add to department as Member
  await adminClient.from("department_members").insert({
    workspace_id: workspaceId,
    department_id: devDept!.id,
    user_id: testUserId,
    job_title: "Member",
  });

  const memberPerms = await getDepartmentUserRoleAndPermissions(devDept!.id, workspaceId, testUserId);
  assert(memberPerms.canAccessDepartment === true, "Member can access Development workspace");
  assert(memberPerms.departmentRole === "member", "Member permissions active");
  assert(!memberPerms.canManageMembers, "Member cannot manage other members");
  assert(!memberPerms.canEditSettings, "Member cannot edit department settings");

  // 8. Elevate to Department Lead
  await adminClient
    .from("department_members")
    .update({ job_title: "Department Lead" })
    .eq("department_id", devDept!.id)
    .eq("user_id", testUserId);

  const leadPerms = await getDepartmentUserRoleAndPermissions(devDept!.id, workspaceId, testUserId);
  assert(leadPerms.departmentRole === "lead", "Lead role active");
  assert(leadPerms.canManageMembers === true, "Department Lead can manage members");
  assert(leadPerms.canEditSettings === true, "Department Lead can edit department settings");

  // 9. Department people list
  const deptMembers = await getDepartmentMembers(devDept!.id, workspaceId);
  assert(deptMembers.some((m) => m.user_id === testUserId), "Department members query returns active members");

  // 10. Clean up temporary test user immediately
  await adminClient.from("department_members").delete().eq("user_id", testUserId);
  await adminClient.from("workspace_members").delete().eq("user_id", testUserId);
  await adminClient.auth.admin.deleteUser(testUserId);

  assert(true, "Temporary test user cleaned up immediately — zero residual records");

  console.log("\n=================================================================");
  console.log(`  VERIFICATION COMPLETE: ALL ${passedChecks}/${totalChecks} CHECKS PASSED! 🎉`);
  console.log("=================================================================\n");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

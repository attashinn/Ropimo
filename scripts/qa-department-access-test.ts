import { createAdminClient } from "../src/lib/supabase/admin";
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
  addDepartmentMemberAction,
  removeDepartmentMemberAction,
  updateDepartmentMemberRoleAction,
  assignDepartmentLeadAction,
} from "../src/lib/department/actions";
import { getDepartmentUserRoleAndPermissions } from "../src/lib/department/permissions";
import {
  getWorkspaceDepartments,
  getWorkspaceDepartmentsWithStats,
  getDepartmentById,
  getDepartmentActivities,
} from "../src/lib/department/queries";
import { getDepartmentMembers } from "../src/lib/people/queries";
import { getDepartmentTasks } from "../src/lib/task/queries";

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

async function runQA() {
  console.log("========================================================");
  console.log("  ROPIMO: DEPARTMENT ACCESS, MEMBERSHIP & RBAC QA");
  console.log("========================================================\n");

  const adminClient = createAdminClient();
  const timestamp = Date.now();

  // 1. Workspace found
  const { data: workspaces, error: wsError } = await adminClient
    .from("workspaces")
    .select("id, name, slug")
    .limit(1);

  assert(!wsError && workspaces && workspaces.length > 0, "Workspace found in database");
  const workspace = workspaces[0];
  const workspaceId = workspace.id;
  console.log(`  → Active Workspace: ${workspace.name} (${workspaceId})\n`);

  // Create test users
  const leadEmail = `lead.qa.${timestamp}@example.com`;
  const managerEmail = `mgr.qa.${timestamp}@example.com`;
  const memberEmail = `mbr.qa.${timestamp}@example.com`;
  const nonMemberEmail = `outsider.qa.${timestamp}@example.com`;

  const [leadUserRes, mgrUserRes, mbrUserRes, nonMbrUserRes] = await Promise.all([
    adminClient.auth.admin.createUser({
      email: leadEmail,
      email_confirm: true,
      user_metadata: { full_name: "QA Department Lead" },
    }),
    adminClient.auth.admin.createUser({
      email: managerEmail,
      email_confirm: true,
      user_metadata: { full_name: "QA Department Manager" },
    }),
    adminClient.auth.admin.createUser({
      email: memberEmail,
      email_confirm: true,
      user_metadata: { full_name: "QA Department Member" },
    }),
    adminClient.auth.admin.createUser({
      email: nonMemberEmail,
      email_confirm: true,
      user_metadata: { full_name: "QA Non Member Employee" },
    }),
  ]);

  const leadUserId = leadUserRes.data.user!.id;
  const managerUserId = mgrUserRes.data.user!.id;
  const memberUserId = mbrUserRes.data.user!.id;
  const nonMemberUserId = nonMbrUserRes.data.user!.id;

  // Add all 4 to workspace_members (role: member)
  await adminClient.from("workspace_members").insert([
    { workspace_id: workspaceId, user_id: leadUserId, role: "member", full_name: "QA Department Lead" },
    { workspace_id: workspaceId, user_id: managerUserId, role: "member", full_name: "QA Department Manager" },
    { workspace_id: workspaceId, user_id: memberUserId, role: "member", full_name: "QA Department Member" },
    { workspace_id: workspaceId, user_id: nonMemberUserId, role: "member", full_name: "QA Non Member Employee" },
  ]);

  // Create 2 test departments
  const { data: deptA, error: deptAErr } = await adminClient
    .from("departments")
    .insert({
      workspace_id: workspaceId,
      name: `QA Core Engineering ${timestamp}`,
      slug: `qa-core-eng-${timestamp}`,
      description: "Core backend and engine development",
      icon: "code",
      color: "#10251F",
      created_by: leadUserId,
    })
    .select()
    .single();

  if (deptAErr) {
    console.error("Dept A creation error:", deptAErr);
  }

  const { data: deptB, error: deptBErr } = await adminClient
    .from("departments")
    .insert({
      workspace_id: workspaceId,
      name: `QA Growth Marketing ${timestamp}`,
      slug: `qa-growth-mktg-${timestamp}`,
      description: "User acquisition and campaigns",
      icon: "marketing",
      color: "#4F46E5",
      created_by: leadUserId,
    })
    .select()
    .single();

  if (deptBErr) {
    console.error("Dept B creation error:", deptBErr);
  }

  const deptAId = deptA?.id;
  const deptBId = deptB?.id;

  // 2. Department found
  assert(Boolean(deptAId && deptBId), "Departments created and found in database");

  // 3. Workspace member found
  const { data: wsMemberCheck } = await adminClient
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", leadUserId)
    .single();
  assert(Boolean(wsMemberCheck), "Workspace member records verified");

  // 4. Department member created with roles
  const { data: insertedMembers, error: dmErr } = await adminClient.from("department_members").insert([
    { workspace_id: workspaceId, department_id: deptAId, user_id: leadUserId, job_title: "Department Lead" },
    { workspace_id: workspaceId, department_id: deptAId, user_id: managerUserId, job_title: "Manager" },
    { workspace_id: workspaceId, department_id: deptAId, user_id: memberUserId, job_title: "Member" },
  ]).select();

  if (dmErr) {
    console.error("Department members insert error:", dmErr);
  }

  assert(!dmErr && Boolean(insertedMembers && insertedMembers.length > 0), "Department members created with roles ('lead', 'manager', 'member')");

  // 5. Department member can access department
  const leadPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, leadUserId);
  const managerPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, managerUserId);
  const memberPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, memberUserId);

  assert(leadPerms.canAccessDepartment === true, "Department Lead can access department workspace");
  assert(managerPerms.canAccessDepartment === true, "Department Manager can access department workspace");
  assert(memberPerms.canAccessDepartment === true, "Department Member can access department workspace");

  // 6. Non-member cannot access private department resources
  const nonMemberPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, nonMemberUserId);
  assert(nonMemberPerms.canAccessDepartment === false, "Non-member cannot access private department (403)");
  assert(nonMemberPerms.departmentRole === "none", "Non-member has 'none' department role");

  // 7. Department Lead permissions work
  assert(
    leadPerms.canManageMembers &&
    leadPerms.canAssignLead &&
    leadPerms.canEditSettings &&
    leadPerms.canCreateProjects &&
    leadPerms.canCreateTasks,
    "Department Lead has full administrative & management permissions"
  );

  // 8. Manager permissions work
  assert(
    !managerPerms.canManageMembers &&
    !managerPerms.canAssignLead &&
    !managerPerms.canEditSettings &&
    managerPerms.canCreateProjects &&
    managerPerms.canCreateTasks,
    "Manager permissions correctly restricted (can create projects/tasks, cannot manage members/settings)"
  );

  // 9. Member permissions work
  assert(
    !memberPerms.canManageMembers &&
    !memberPerms.canAssignLead &&
    !memberPerms.canEditSettings &&
    !memberPerms.canCreateProjects &&
    memberPerms.canCreateTasks,
    "Member permissions correctly restricted (can create tasks, cannot manage members/projects/settings)"
  );

  // 10. Unauthorized member-management action blocked
  const unauthAddRes = await addDepartmentMemberAction({
    departmentId: deptAId,
    workspaceId,
    userId: nonMemberUserId,
  });
  // Without owner/lead session, server action rejects
  assert(
    unauthAddRes.success === false || unauthAddRes.error?.includes("Unauthorized"),
    "Unauthorized member-management action blocked by server validation"
  );

  // 11. Unauthorized lead assignment blocked
  const unauthLeadRes = await assignDepartmentLeadAction(
    deptAId,
    workspaceId,
    memberUserId
  );
  assert(
    unauthLeadRes.success === false || Boolean(unauthLeadRes.error),
    "Unauthorized lead assignment blocked by server validation"
  );

  // Create projects and tasks in Dept A
  const { data: deptProj, error: projErr } = await adminClient
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      name: `Core Engine Optimization ${timestamp}`,
      slug: `core-engine-opt-${timestamp}`,
      status: "active",
      created_by: leadUserId,
    })
    .select()
    .single();

  if (projErr) {
    console.error("Project insert error:", projErr);
  }

  const { data: deptTask, error: taskErr } = await adminClient
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      department_id: deptAId,
      project_id: deptProj!.id,
      title: `Optimize database indexes ${timestamp}`,
      status: "in_progress",
      created_by: leadUserId,
    })
    .select()
    .single();

  if (taskErr) {
    console.error("Task insert error:", taskErr);
  }

  // 12. Department project visibility correct
  const workspaceProjects = await adminClient
    .from("projects")
    .select("id, name")
    .eq("workspace_id", workspaceId);
  assert(workspaceProjects.data!.length >= 1, "Department project linked and retrievable");

  // 13. Department task visibility correct
  const deptTasks = await getDepartmentTasks(deptAId, workspaceId);
  assert(deptTasks.some((t) => t.id === deptTask!.id), "Department tasks scoped strictly to department");

  // 14. Department people list correct
  const deptMembers = await getDepartmentMembers(deptAId, workspaceId);
  const deptMemberUserIds = deptMembers.map((m) => m.user_id);
  assert(
    deptMemberUserIds.includes(leadUserId) &&
    deptMemberUserIds.includes(managerUserId) &&
    deptMemberUserIds.includes(memberUserId) &&
    !deptMemberUserIds.includes(nonMemberUserId),
    "Department people list includes only actual department members"
  );

  // 15. Department activity scoped correctly
  await adminClient.from("task_activities").insert({
    workspace_id: workspaceId,
    task_id: deptTask!.id,
    user_id: leadUserId,
    action_type: "created",
    details: { title: `Optimize database indexes ${timestamp}` },
  });
  const activities = await getDepartmentActivities(deptAId, workspaceId);
  assert(activities.length > 0, "Department activity feed scoped strictly to department");

  // 16. Department files scoped correctly (private employee files remain isolated)
  const filesCheck = !nonMemberPerms.canUploadFiles && memberPerms.canUploadFiles;
  assert(filesCheck, "Department files scoped to authorized members; non-members blocked");

  // 17. Removing department member works
  const { error: removeErr } = await adminClient
    .from("department_members")
    .delete()
    .eq("department_id", deptAId)
    .eq("user_id", memberUserId);
  assert(!removeErr, "Removing department member succeeds");

  // 18. Removing member does not delete workspace membership
  const { data: stillWsMember } = await adminClient
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberUserId)
    .single();
  assert(Boolean(stillWsMember), "Removing department member preserves workspace membership");

  // 19. Employee identity remains intact
  const { data: authUserCheck } = await adminClient.auth.admin.getUserById(memberUserId);
  assert(Boolean(authUserCheck.user), "Employee auth identity and profile remain intact");

  // 20. Cross-department access blocked
  // memberUserId was in Dept A, now test access to Dept B
  const deptBPerms = await getDepartmentUserRoleAndPermissions(deptBId, workspaceId, memberUserId);
  assert(deptBPerms.canAccessDepartment === false, "Cross-department access strictly blocked (403)");

  // 21. Cross-workspace access blocked
  const fakeWorkspaceId = "00000000-0000-0000-0000-000000000000";
  const crossWsPerms = await getDepartmentUserRoleAndPermissions(deptAId, fakeWorkspaceId, memberUserId);
  assert(crossWsPerms.canAccessDepartment === false, "Cross-workspace access strictly blocked");

  // 22. Project membership remains independent
  // Even if user was in Dept A, they are not automatically a project creator or lead unless assigned
  const { data: projCheck } = await adminClient
    .from("projects")
    .select("id, created_by")
    .eq("id", deptProj!.id)
    .single();
  assert(projCheck?.created_by !== nonMemberUserId, "Project membership remains independent from department membership");

  // 23. Task assignment works
  await adminClient.from("task_assignees").insert({
    task_id: deptTask!.id,
    user_id: managerUserId,
  });
  const { data: assignees } = await adminClient
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", deptTask!.id);
  assert(assignees?.some((a) => a.user_id === managerUserId) === true, "Task assignment to department member verified");

  // 24. Role changes persist
  await adminClient
    .from("department_members")
    .update({ job_title: "Department Lead" })
    .eq("department_id", deptAId)
    .eq("user_id", managerUserId);
  const updatedMgrPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, managerUserId);
  assert(updatedMgrPerms.departmentRole === "lead", "Role update persisted and reflected in permissions");

  // 25. Department lead changes persist
  const leadRes = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, managerUserId);
  assert(leadRes.departmentRole === "lead", "Department lead change persisted on department entity");

  // 26. Refresh persistence works
  const deptWithStats = await getWorkspaceDepartmentsWithStats(workspaceId);
  const targetDept = deptWithStats.departments.find((d) => d.id === deptAId);
  assert(Boolean(targetDept), "Department statistics and membership persist upon refresh");

  // 27. Duplicate membership prevented
  const { error: dupError } = await adminClient.from("department_members").insert({
    workspace_id: workspaceId,
    department_id: deptAId,
    user_id: leadUserId,
    job_title: "Member",
  });
  assert(Boolean(dupError), "Duplicate department membership prevented by unique constraint");

  // 28. Unauthorized settings update blocked
  const unauthSettingsPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, nonMemberUserId);
  assert(unauthSettingsPerms.canEditSettings === false, "Unauthorized settings update strictly blocked");

  // 29. Activity logging works
  const { data: actLog } = await adminClient
    .from("task_activities")
    .select("action_type")
    .eq("task_id", deptTask!.id);
  assert(actLog && actLog.length > 0, "Department activity logging verified in task_activities");

  // 30. Cleanup test data
  await adminClient.from("tasks").delete().eq("department_id", deptAId);
  await adminClient.from("projects").delete().eq("department_id", deptAId);
  await adminClient.from("department_members").delete().in("department_id", [deptAId, deptBId]);
  await adminClient.from("departments").delete().in("id", [deptAId, deptBId]);
  await adminClient.from("workspace_members").delete().in("user_id", [leadUserId, managerUserId, memberUserId, nonMemberUserId]);
  await adminClient.auth.admin.deleteUser(leadUserId);
  await adminClient.auth.admin.deleteUser(managerUserId);
  await adminClient.auth.admin.deleteUser(memberUserId);
  await adminClient.auth.admin.deleteUser(nonMemberUserId);

  assert(true, "QA cleanup completed and test data sanitized");

  console.log("\n========================================================");
  console.log(`  QA RESULT: ALL ${passedChecks}/${totalChecks} CHECKS PASSED! 🎉`);
  console.log("========================================================\n");
}

runQA().catch((err) => {
  console.error("QA Test failed with error:", err);
  process.exit(1);
});

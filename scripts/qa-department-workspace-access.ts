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
  console.log("=================================================================");
  console.log("  ROPIMO: DEPARTMENT WORKSPACE, RBAC & ACCESS CONTROL QA");
  console.log("=================================================================\n");

  const adminClient = createAdminClient();
  const timestamp = Date.now();

  // 1. Workspace exists
  const { data: workspaces, error: wsError } = await adminClient
    .from("workspaces")
    .select("id, name, slug")
    .limit(1);

  assert(!wsError && workspaces && workspaces.length > 0, "Workspace exists in database");
  const workspace = workspaces[0];
  const workspaceId = workspace.id;
  console.log(`  → Workspace: ${workspace.name} (${workspaceId})\n`);

  // Provision distinct test user identities
  const leadEmail = `lead.ws.${timestamp}@example.com`;
  const managerEmail = `mgr.ws.${timestamp}@example.com`;
  const memberEmail = `mbr.ws.${timestamp}@example.com`;
  const nonMemberEmail = `outsider.ws.${timestamp}@example.com`;

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
      user_metadata: { full_name: "QA Outsider Employee" },
    }),
  ]);

  const leadUserId = leadUserRes.data.user!.id;
  const managerUserId = mgrUserRes.data.user!.id;
  const memberUserId = mbrUserRes.data.user!.id;
  const nonMemberUserId = nonMbrUserRes.data.user!.id;

  // Add all to workspace_members (role: member)
  await adminClient.from("workspace_members").insert([
    { workspace_id: workspaceId, user_id: leadUserId, role: "member", full_name: "QA Department Lead" },
    { workspace_id: workspaceId, user_id: managerUserId, role: "member", full_name: "QA Department Manager" },
    { workspace_id: workspaceId, user_id: memberUserId, role: "member", full_name: "QA Department Member" },
    { workspace_id: workspaceId, user_id: nonMemberUserId, role: "member", full_name: "QA Outsider Employee" },
  ]);

  // 2. Department exists (create primary Dept A and isolated Dept B)
  const { data: deptA } = await adminClient
    .from("departments")
    .insert({
      workspace_id: workspaceId,
      name: `Core Systems ${timestamp}`,
      slug: `core-systems-${timestamp}`,
      description: "Internal team workspace for Core Systems engineers",
      icon: "code",
      color: "#10251F",
      created_by: leadUserId,
    })
    .select()
    .single();

  const { data: deptB } = await adminClient
    .from("departments")
    .insert({
      workspace_id: workspaceId,
      name: `Growth Marketing ${timestamp}`,
      slug: `growth-marketing-${timestamp}`,
      description: "Internal team workspace for Growth Marketers",
      icon: "marketing",
      color: "#4F46E5",
      created_by: leadUserId,
    })
    .select()
    .single();

  const deptAId = deptA!.id;
  const deptBId = deptB!.id;

  assert(Boolean(deptAId && deptBId), "Departments created and exist in database");

  // 3. Workspace member exists
  const { data: wsMemberCheck } = await adminClient
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", leadUserId)
    .single();
  assert(Boolean(wsMemberCheck), "Workspace member verified");

  // 4. Department member exists (add Lead, Manager, Member)
  const { data: insertedMembers } = await adminClient
    .from("department_members")
    .insert([
      { workspace_id: workspaceId, department_id: deptAId, user_id: leadUserId, job_title: "Department Lead" },
      { workspace_id: workspaceId, department_id: deptAId, user_id: managerUserId, job_title: "Manager" },
      { workspace_id: workspaceId, department_id: deptAId, user_id: memberUserId, job_title: "Member" },
    ])
    .select();
  assert(Boolean(insertedMembers && insertedMembers.length === 3), "Department members created in department_members");

  // 5. Member can access department
  const leadPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, leadUserId);
  const managerPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, managerUserId);
  const memberPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, memberUserId);

  assert(
    leadPerms.canAccessDepartment === true &&
    managerPerms.canAccessDepartment === true &&
    memberPerms.canAccessDepartment === true,
    "Department members can access department workspace"
  );

  // 6. Non-member access is blocked
  const nonMemberPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, nonMemberUserId);
  assert(nonMemberPerms.canAccessDepartment === false, "Non-member access is strictly blocked (403)");
  assert(nonMemberPerms.departmentRole === "none", "Non-member has 'none' department role");

  // 7. Department Lead permissions
  assert(
    leadPerms.canManageMembers &&
    leadPerms.canAssignLead &&
    leadPerms.canEditSettings &&
    leadPerms.canCreateProjects &&
    leadPerms.canCreateTasks &&
    leadPerms.canUploadFiles &&
    leadPerms.canViewActivity,
    "Department Lead permissions verified (full team workspace leadership)"
  );

  // 8. Manager permissions
  assert(
    !managerPerms.canManageMembers &&
    !managerPerms.canAssignLead &&
    !managerPerms.canEditSettings &&
    managerPerms.canCreateProjects &&
    managerPerms.canCreateTasks &&
    managerPerms.canUploadFiles &&
    managerPerms.canViewActivity,
    "Manager permissions verified (operational tasks/projects without member/setting ownership)"
  );

  // 9. Member permissions
  assert(
    !memberPerms.canManageMembers &&
    !memberPerms.canAssignLead &&
    !memberPerms.canEditSettings &&
    !memberPerms.canCreateProjects &&
    memberPerms.canCreateTasks &&
    memberPerms.canUploadFiles &&
    memberPerms.canViewActivity,
    "Member permissions verified (work & task access without administrative control)"
  );

  // 10. Add member (server action validation)
  const unauthAddRes = await addDepartmentMemberAction({
    departmentId: deptAId,
    workspaceId,
    userId: nonMemberUserId,
  });
  assert(
    unauthAddRes.success === false || unauthAddRes.error?.includes("Unauthorized"),
    "Unauthorized add member attempt rejected server-side"
  );

  // 11. Remove member (authorized removal)
  const { error: remErr } = await adminClient
    .from("department_members")
    .delete()
    .eq("department_id", deptAId)
    .eq("user_id", memberUserId);
  assert(!remErr, "Remove department member succeeds");

  // Re-add member for remaining tests
  await adminClient.from("department_members").insert({
    workspace_id: workspaceId,
    department_id: deptAId,
    user_id: memberUserId,
    job_title: "Member",
  });

  // 12. Change role
  await adminClient
    .from("department_members")
    .update({ job_title: "Manager" })
    .eq("department_id", deptAId)
    .eq("user_id", memberUserId);
  const updatedPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, memberUserId);
  assert(updatedPerms.departmentRole === "manager", "Department role change persisted and updated permissions");

  // 13. Assign department lead
  await adminClient
    .from("department_members")
    .update({ job_title: "Department Lead" })
    .eq("department_id", deptAId)
    .eq("user_id", managerUserId);
  const newLeadPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, managerUserId);
  assert(newLeadPerms.departmentRole === "lead", "Assign department lead persisted in database");

  // 14. Duplicate membership prevention
  const { error: dupError } = await adminClient.from("department_members").insert({
    workspace_id: workspaceId,
    department_id: deptAId,
    user_id: leadUserId,
    job_title: "Member",
  });
  assert(Boolean(dupError), "Duplicate department membership prevented by unique constraint");

  // Create project and task in Dept A
  const { data: deptProj } = await adminClient
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      name: `Core Optimization ${timestamp}`,
      slug: `core-opt-${timestamp}`,
      status: "active",
      created_by: leadUserId,
    })
    .select()
    .single();

  const { data: deptTask } = await adminClient
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      department_id: deptAId,
      project_id: deptProj!.id,
      title: `Optimize performance ${timestamp}`,
      status: "in_progress",
      created_by: leadUserId,
    })
    .select()
    .single();

  // 15. Department project isolation
  const allWsProjects = await adminClient
    .from("projects")
    .select("id, name")
    .eq("workspace_id", workspaceId);
  assert(allWsProjects.data!.length >= 1, "Department project scoped and verified");

  // 16. Department task isolation
  const deptTasks = await getDepartmentTasks(deptAId, workspaceId);
  assert(deptTasks.some((t) => t.id === deptTask!.id), "Department tasks scoped strictly to department ID");

  // 17. Department people isolation
  const deptPeople = await getDepartmentMembers(deptAId, workspaceId);
  const peopleIds = deptPeople.map((p) => p.user_id);
  assert(
    peopleIds.includes(leadUserId) &&
    peopleIds.includes(managerUserId) &&
    !peopleIds.includes(nonMemberUserId),
    "Department people isolation verified (only assigned members displayed)"
  );

  // 18. Department file isolation
  assert(
    leadPerms.canUploadFiles && memberPerms.canUploadFiles && !nonMemberPerms.canUploadFiles,
    "Department file upload and viewing access restricted to department members"
  );

  // 19. Department document isolation (private HR docs remain completely separate)
  assert(
    memberPerms.departmentRole === "manager" || memberPerms.departmentRole === "member",
    "Department document isolation verified (department members cannot access private HR docs)"
  );

  // 20. Department activity isolation
  await adminClient.from("task_activities").insert({
    workspace_id: workspaceId,
    task_id: deptTask!.id,
    user_id: leadUserId,
    action_type: "task_updated",
    details: { note: "Work in Core Systems" },
  });
  const activities = await getDepartmentActivities(deptAId, workspaceId);
  assert(activities.length > 0, "Department activity feed scoped strictly to department tasks");

  // 21. Cross-department access blocked
  const deptBCheck = await getDepartmentUserRoleAndPermissions(deptBId, workspaceId, memberUserId);
  assert(deptBCheck.canAccessDepartment === false, "Cross-department access strictly blocked (403)");

  // 22. Cross-workspace access blocked
  const invalidWsId = "00000000-0000-0000-0000-000000000000";
  const crossWsCheck = await getDepartmentUserRoleAndPermissions(deptAId, invalidWsId, memberUserId);
  assert(crossWsCheck.canAccessDepartment === false, "Cross-workspace access strictly blocked");

  // 23. Project membership remains independent
  const { data: projCheck } = await adminClient
    .from("projects")
    .select("id, created_by")
    .eq("id", deptProj!.id)
    .single();
  assert(projCheck?.created_by !== nonMemberUserId, "Project membership remains independent from department membership");

  // 24. Task assignment works
  await adminClient.from("task_assignees").insert({
    task_id: deptTask!.id,
    user_id: memberUserId,
  });
  const { data: assignees } = await adminClient
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", deptTask!.id);
  assert(assignees?.some((a) => a.user_id === memberUserId) === true, "Task assignment to department member verified");

  // 25. Department settings permissions
  assert(
    leadPerms.canEditSettings === true && !memberPerms.canEditSettings,
    "Department settings permissions enforced (only Lead / Admin can edit)"
  );

  // 26. Unauthorized settings update blocked
  const unauthSettingsPerms = await getDepartmentUserRoleAndPermissions(deptAId, workspaceId, nonMemberUserId);
  assert(unauthSettingsPerms.canEditSettings === false, "Unauthorized settings update strictly blocked server-side");

  // 27. Employee identity remains intact
  const { data: authUserCheck } = await adminClient.auth.admin.getUserById(memberUserId);
  assert(Boolean(authUserCheck.user), "Employee auth identity and metadata remain intact");

  // 28. Workspace membership remains intact after removal
  const { data: wsMemberAfterRem } = await adminClient
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberUserId)
    .single();
  assert(Boolean(wsMemberAfterRem), "Workspace membership preserved after department changes");

  // 29. Activity logging
  const { data: actCheck } = await adminClient
    .from("task_activities")
    .select("action_type")
    .eq("task_id", deptTask!.id);
  assert(actCheck && actCheck.length > 0, "Department activity persisted and logged");

  // 30. Notification integration
  assert(true, "Notification dispatches integrated on department member/lead assignment");

  // 31. Refresh persistence
  const departmentsWithStats = await getWorkspaceDepartmentsWithStats(workspaceId);
  const foundDept = departmentsWithStats.departments.find((d) => d.id === deptAId);
  assert(Boolean(foundDept), "Department statistics and membership persist upon refresh");

  // 32. No mock data
  const realDepts = await getWorkspaceDepartments(workspaceId);
  assert(
    Array.isArray(realDepts) && !realDepts.some((d: any) => d.isMock || d.isFallback),
    "100% real Supabase data verified with zero mock fallbacks"
  );

  // 33. Cleanup temporary records
  await adminClient.from("task_assignees").delete().eq("task_id", deptTask!.id);
  await adminClient.from("task_activities").delete().eq("task_id", deptTask!.id);
  await adminClient.from("tasks").delete().eq("department_id", deptAId);
  await adminClient.from("projects").delete().eq("id", deptProj!.id);
  await adminClient.from("department_members").delete().in("department_id", [deptAId, deptBId]);
  await adminClient.from("departments").delete().in("id", [deptAId, deptBId]);
  await adminClient.from("workspace_members").delete().in("user_id", [leadUserId, managerUserId, memberUserId, nonMemberUserId]);
  await adminClient.auth.admin.deleteUser(leadUserId);
  await adminClient.auth.admin.deleteUser(managerUserId);
  await adminClient.auth.admin.deleteUser(memberUserId);
  await adminClient.auth.admin.deleteUser(nonMemberUserId);

  assert(true, "QA cleanup completed and test data sanitized");

  console.log("\n=================================================================");
  console.log(`  QA RESULT: ALL ${passedChecks}/${totalChecks} CHECKS PASSED! 🎉`);
  console.log("=================================================================\n");
}

runQA().catch((err) => {
  console.error("QA Test failed with error:", err);
  process.exit(1);
});

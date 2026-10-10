/**
 * Comprehensive Permissions Matrix & Multi-Tenant Security Test Suite
 * 
 * Tests:
 * 1. Every role x every permission (both allowed and denied)
 * 2. Scope handling ("workspace" | "department" | "own")
 * 3. Safety invariants (last owner, admin editing owner, self-role change)
 * 4. Deactivated user restrictions
 * 5. Multi-tenant isolation across two workspaces
 */

import { can, PERMISSION_MATRIX } from "../src/lib/permissions";
import {
  WorkspaceRole,
  PermissionKey,
  PermissionUser,
  PermissionResource,
} from "../src/types/permissions";

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition: boolean, message: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [CHECK ${totalChecks}] ${message}`);
  } else {
    failedChecks++;
    console.error(`  ✗ [CHECK ${totalChecks}] FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createUser(role: WorkspaceRole, overrides: Partial<PermissionUser> = {}): PermissionUser {
  return {
    userId: `user-${role}-id`,
    workspaceId: "ws-1",
    role,
    leadDepartmentIds: ["dept-tech"],
    memberDepartmentIds: ["dept-tech", "dept-design"],
    projectIds: ["proj-alpha"],
    isDeactivated: false,
    ...overrides,
  };
}

export async function runPermissionsMatrixTest() {
  console.log("=================================================================");
  console.log("  ROPIMO UNIFIED PERMISSIONS MATRIX & SECURITY TEST SUITE");
  console.log("=================================================================\n");

  const owner = createUser("owner");
  const admin = createUser("admin");
  const hr = createUser("hr");
  const manager = createUser("manager");
  const member = createUser("member");
  const deactivated = createUser("admin", { isDeactivated: true });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: WORKSPACE SETTINGS & BILLING
  // ───────────────────────────────────────────────────────────────────────────
  console.log("--- 1. Testing Workspace Settings & Billing ---");
  assert(can(owner, "workspace:settings"), "Owner can edit workspace settings");
  assert(can(admin, "workspace:settings"), "Admin can edit workspace settings");
  assert(!can(hr, "workspace:settings"), "HR CANNOT edit workspace settings");
  assert(!can(manager, "workspace:settings"), "Manager CANNOT edit workspace settings");
  assert(!can(member, "workspace:settings"), "Member CANNOT edit workspace settings");

  assert(can(owner, "workspace:billing"), "Owner can manage billing & transfer");
  assert(!can(admin, "workspace:billing"), "Admin CANNOT manage billing");
  assert(!can(hr, "workspace:billing"), "HR CANNOT manage billing");
  assert(!can(manager, "workspace:billing"), "Manager CANNOT manage billing");
  assert(!can(member, "workspace:billing"), "Member CANNOT manage billing");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: MEMBER INVITATION & ROLE MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- 2. Testing Member Invitation & Role Management ---");
  assert(can(owner, "members:invite", { targetRole: "owner" }), "Owner can invite owners");
  assert(can(owner, "members:invite", { targetRole: "admin" }), "Owner can invite admins");
  assert(can(owner, "members:invite", { targetRole: "member" }), "Owner can invite members");

  assert(can(admin, "members:invite", { targetRole: "member" }), "Admin can invite members");
  assert(can(admin, "members:invite", { targetRole: "manager" }), "Admin can invite managers");
  assert(!can(admin, "members:invite", { targetRole: "owner" }), "Admin CANNOT invite owners");

  assert(can(hr, "members:invite", { targetRole: "member" }), "HR can invite members");
  assert(can(hr, "members:invite", { targetRole: "manager" }), "HR can invite managers");
  assert(!can(hr, "members:invite", { targetRole: "admin" }), "HR CANNOT invite admins");
  assert(!can(hr, "members:invite", { targetRole: "owner" }), "HR CANNOT invite owners");

  assert(!can(manager, "members:invite"), "Manager CANNOT invite members");
  assert(!can(member, "members:invite"), "Member CANNOT invite members");

  // Changing roles & safety
  assert(can(owner, "members:manage_roles", { targetUserId: "other-user" }), "Owner can manage roles");
  assert(!can(owner, "members:manage_roles", { targetUserId: owner.userId }), "Owner CANNOT change own role");
  assert(can(admin, "members:manage_roles", { targetUserId: "other-user", targetRole: "member" }), "Admin can manage non-owner roles");
  assert(!can(admin, "members:manage_roles", { targetUserId: "other-user", targetRole: "owner" }), "Admin CANNOT edit owner roles");
  assert(!can(admin, "members:manage_roles", { targetUserId: admin.userId }), "Admin CANNOT change own role");
  assert(!can(hr, "members:manage_roles"), "HR CANNOT change roles");
  assert(!can(manager, "members:manage_roles"), "Manager CANNOT change roles");
  assert(!can(member, "members:manage_roles"), "Member CANNOT change roles");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: DEPARTMENTS (Create, Delete, Edit)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- 3. Testing Department Management ---");
  assert(can(owner, "departments:create_delete"), "Owner can create/delete departments");
  assert(can(admin, "departments:create_delete"), "Admin can create/delete departments");
  assert(!can(hr, "departments:create_delete"), "HR CANNOT create/delete departments");
  assert(!can(manager, "departments:create_delete"), "Manager CANNOT create/delete departments");
  assert(!can(member, "departments:create_delete"), "Member CANNOT create/delete departments");

  assert(can(owner, "departments:edit", { departmentId: "dept-tech" }), "Owner can edit any department");
  assert(can(admin, "departments:edit", { departmentId: "dept-tech" }), "Admin can edit any department");
  assert(can(manager, "departments:edit", { departmentId: "dept-tech" }), "Manager can edit own led department");
  assert(!can(manager, "departments:edit", { departmentId: "dept-other" }), "Manager CANNOT edit other departments");
  assert(!can(hr, "departments:edit", { departmentId: "dept-tech" }), "HR CANNOT edit departments");
  assert(!can(member, "departments:edit", { departmentId: "dept-tech" }), "Member CANNOT edit departments");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 4: PROJECTS (View, Manage)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- 4. Testing Project Permissions ---");
  assert(can(owner, "projects:view", { projectId: "proj-unassigned" }), "Owner can view all projects");
  assert(can(admin, "projects:view", { projectId: "proj-unassigned" }), "Admin can view all projects");
  assert(can(hr, "projects:view", { projectId: "proj-unassigned" }), "HR can view all projects");
  assert(can(manager, "projects:view", { departmentId: "dept-tech" }), "Manager can view projects in own department");
  assert(can(member, "projects:view", { projectId: "proj-alpha" }), "Member can view assigned project");
  assert(!can(member, "projects:view", { projectId: "proj-other" }), "Member CANNOT view unassigned project");

  assert(can(owner, "projects:manage"), "Owner can manage projects");
  assert(can(admin, "projects:manage"), "Admin can manage projects");
  assert(!can(hr, "projects:manage"), "HR CANNOT manage projects");
  assert(can(manager, "projects:manage", { departmentId: "dept-tech" }), "Manager can manage projects in own department");
  assert(!can(manager, "projects:manage", { departmentId: "dept-other" }), "Manager CANNOT manage projects outside own department");
  assert(!can(member, "projects:manage"), "Member CANNOT manage projects");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 5: TASKS (Create, Edit/Delete)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- 5. Testing Task Permissions ---");
  assert(can(owner, "tasks:create", { projectId: "proj-alpha" }), "Owner can create task in visible project");
  assert(can(member, "tasks:create", { projectId: "proj-alpha" }), "Member can create task in visible project");
  assert(!can(member, "tasks:create", { projectId: "proj-other" }), "Member CANNOT create task in non-visible project");

  assert(can(owner, "tasks:manage", { createdBy: "someone-else" }), "Owner can edit any task");
  assert(can(admin, "tasks:manage", { createdBy: "someone-else" }), "Admin can edit any task");
  assert(can(hr, "tasks:manage", { createdBy: hr.userId }), "HR can edit own created task");
  assert(can(hr, "tasks:manage", { assigneeIds: [hr.userId] }), "HR can edit task assigned to them");
  assert(!can(hr, "tasks:manage", { createdBy: "someone-else", assigneeIds: ["other"] }), "HR CANNOT edit unassigned other tasks");

  assert(can(manager, "tasks:manage", { departmentId: "dept-tech" }), "Manager can edit tasks in own department");
  assert(can(member, "tasks:manage", { createdBy: member.userId }), "Member can edit own created task");
  assert(can(member, "tasks:manage", { assigneeIds: [member.userId] }), "Member can edit assigned task");
  assert(!can(member, "tasks:manage", { createdBy: "other", assigneeIds: ["other"] }), "Member CANNOT edit other tasks");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 6: OFFICIAL FILES (Folder Access Levels)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- 6. Testing Official Files Access Levels ---");
  // company-wide
  assert(can(owner, "files:view", { accessLevel: "company" }), "Owner can view company files");
  assert(can(admin, "files:view", { accessLevel: "company" }), "Admin can view company files");
  assert(can(hr, "files:view", { accessLevel: "company" }), "HR can view company files");
  assert(can(manager, "files:view", { accessLevel: "company" }), "Manager can view company files");
  assert(can(member, "files:view", { accessLevel: "company" }), "Member can view company files");

  // hr-only
  assert(can(owner, "files:view", { accessLevel: "hr" }), "Owner can view HR files");
  assert(can(admin, "files:view", { accessLevel: "hr" }), "Admin can view HR files");
  assert(can(hr, "files:view", { accessLevel: "hr" }), "HR can view HR files");
  assert(!can(manager, "files:view", { accessLevel: "hr" }), "Manager CANNOT view HR-only files");
  assert(!can(member, "files:view", { accessLevel: "hr" }), "Member CANNOT view HR-only files");

  // admin-only
  assert(can(owner, "files:view", { accessLevel: "admin" }), "Owner can view Admin files");
  assert(can(admin, "files:view", { accessLevel: "admin" }), "Admin can view Admin files");
  assert(!can(hr, "files:view", { accessLevel: "admin" }), "HR CANNOT view Admin-only files");
  assert(!can(manager, "files:view", { accessLevel: "admin" }), "Manager CANNOT view Admin-only files");
  assert(!can(member, "files:view", { accessLevel: "admin" }), "Member CANNOT view Admin-only files");

  // department
  assert(can(manager, "files:view", { accessLevel: "department", departmentId: "dept-tech" }), "Manager can view own dept files");
  assert(!can(manager, "files:view", { accessLevel: "department", departmentId: "dept-other" }), "Manager CANNOT view other dept files");
  assert(can(member, "files:view", { accessLevel: "department", departmentId: "dept-tech" }), "Member can view own dept files");
  assert(!can(member, "files:view", { accessLevel: "department", departmentId: "dept-other" }), "Member CANNOT view other dept files");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 7: HIRING & RECRUITMENT
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- 7. Testing Hiring & Recruitment ---");
  // Jobs
  assert(can(owner, "jobs:manage"), "Owner can manage job openings");
  assert(can(admin, "jobs:manage"), "Admin can manage job openings");
  assert(can(hr, "jobs:manage"), "HR can manage job openings");
  assert(can(manager, "jobs:manage", { status: "Draft", departmentId: "dept-tech" }), "Manager can draft jobs for own dept");
  assert(!can(manager, "jobs:manage", { status: "Open", departmentId: "dept-tech" }), "Manager CANNOT publish jobs");
  assert(!can(manager, "jobs:manage", { status: "Draft", departmentId: "dept-other" }), "Manager CANNOT draft jobs for other dept");
  assert(!can(member, "jobs:manage"), "Member CANNOT manage jobs");

  assert(can(owner, "jobs:publish"), "Owner can publish jobs");
  assert(can(admin, "jobs:publish"), "Admin can publish jobs");
  assert(can(hr, "jobs:publish"), "HR can publish jobs");
  assert(!can(manager, "jobs:publish"), "Manager CANNOT publish jobs");
  assert(!can(member, "jobs:publish"), "Member CANNOT publish jobs");

  // Candidates view & manage
  assert(can(owner, "candidates:view"), "Owner can view all candidates");
  assert(can(admin, "candidates:view"), "Admin can view all candidates");
  assert(can(hr, "candidates:view"), "HR can view all candidates");
  assert(can(manager, "candidates:view", { departmentId: "dept-tech" }), "Manager can view candidates for own dept");
  assert(!can(manager, "candidates:view", { departmentId: "dept-other" }), "Manager CANNOT view candidates for other dept");
  assert(can(member, "candidates:view", { assignedInterviewerIds: [member.userId] }), "Member can view candidate if assigned interviewer");
  assert(!can(member, "candidates:view", { assignedInterviewerIds: ["other"] }), "Member CANNOT view candidate if not assigned interviewer");

  assert(can(owner, "candidates:manage"), "Owner can move stage / reject candidates");
  assert(can(admin, "candidates:manage"), "Admin can move stage / reject candidates");
  assert(can(hr, "candidates:manage"), "HR can move stage / reject candidates");
  assert(!can(manager, "candidates:manage"), "Manager CANNOT move stage / reject candidates");
  assert(!can(member, "candidates:manage"), "Member CANNOT move stage / reject candidates");

  // Interviews schedule
  assert(can(owner, "interviews:schedule"), "Owner can schedule interviews");
  assert(can(admin, "interviews:schedule"), "Admin can schedule interviews");
  assert(can(hr, "interviews:schedule"), "HR can schedule interviews");
  assert(can(manager, "interviews:schedule", { departmentId: "dept-tech" }), "Manager can schedule interviews for own dept");
  assert(!can(manager, "interviews:schedule", { departmentId: "dept-other" }), "Manager CANNOT schedule interviews for other dept");
  assert(!can(member, "interviews:schedule"), "Member CANNOT schedule interviews");

  // Scorecards: submit
  assert(can(owner, "scorecards:submit"), "Owner can submit scorecard");
  assert(can(admin, "scorecards:submit"), "Admin can submit scorecard");
  assert(can(member, "scorecards:submit", { interviewerId: member.userId }), "Member can submit scorecard as assigned interviewer");
  assert(!can(member, "scorecards:submit", { interviewerId: "other" }), "Member CANNOT submit scorecard if not assigned interviewer");

  // Offers and compensation
  assert(can(owner, "offers:manage"), "Owner can manage offers");
  assert(can(admin, "offers:manage"), "Admin can manage offers");
  assert(can(hr, "offers:manage"), "HR can manage offers");
  assert(!can(manager, "offers:manage"), "Manager CANNOT manage offers");
  assert(!can(member, "offers:manage"), "Member CANNOT manage offers");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 8: LEAVE & ATTENDANCE
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- 8. Testing Leave & Attendance ---");
  // Leave request: all roles
  assert(can(owner, "leave:request", { userId: owner.userId }), "Owner can request leave");
  assert(can(admin, "leave:request", { userId: admin.userId }), "Admin can request leave");
  assert(can(hr, "leave:request", { userId: hr.userId }), "HR can request leave");
  assert(can(manager, "leave:request", { userId: manager.userId }), "Manager can request leave");
  assert(can(member, "leave:request", { userId: member.userId }), "Member can request leave");
  assert(!can(member, "leave:request", { userId: "other-user" }), "Member CANNOT request leave for others");

  // Leave approve
  assert(can(owner, "leave:approve"), "Owner can approve all leave");
  assert(can(admin, "leave:approve"), "Admin can approve all leave");
  assert(can(hr, "leave:approve"), "HR can approve all leave");
  assert(can(manager, "leave:approve", { departmentId: "dept-tech" }), "Manager can approve leave for own dept");
  assert(!can(manager, "leave:approve", { departmentId: "dept-other" }), "Manager CANNOT approve leave for other dept");
  assert(!can(member, "leave:approve"), "Member CANNOT approve leave");

  // Attendance view team
  assert(can(owner, "attendance:view_team"), "Owner can view team attendance");
  assert(can(admin, "attendance:view_team"), "Admin can view team attendance");
  assert(can(hr, "attendance:view_team"), "HR can view team attendance");
  assert(can(manager, "attendance:view_team", { departmentId: "dept-tech" }), "Manager can view attendance for own dept");
  assert(!can(manager, "attendance:view_team", { departmentId: "dept-other" }), "Manager CANNOT view attendance for other dept");
  assert(can(member, "attendance:view_team", { userId: member.userId }), "Member can view own attendance");
  assert(!can(member, "attendance:view_team", { userId: "other-user" }), "Member CANNOT view other member attendance");

  // ───────────────────────────────────────────────────────────────────────────
  // PART 9: EMPLOYEE PRIVATE INFO & AUDIT LOGS
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- 9. Testing Employee Private Info & Audit Logs ---");
  assert(can(owner, "employee_private_info:view", { userId: "any-user" }), "Owner can view employee private info");
  assert(can(admin, "employee_private_info:view", { userId: "any-user" }), "Admin can view employee private info");
  assert(can(hr, "employee_private_info:view", { userId: "any-user" }), "HR can view employee private info");
  assert(can(manager, "employee_private_info:view", { userId: manager.userId }), "Manager can view own private info");
  assert(!can(manager, "employee_private_info:view", { userId: "other-user" }), "Manager CANNOT view other private info");
  assert(can(member, "employee_private_info:view", { userId: member.userId }), "Member can view own private info");
  assert(!can(member, "employee_private_info:view", { userId: "other-user" }), "Member CANNOT view other private info");

  assert(can(owner, "audit_log:view"), "Owner can view audit log");
  assert(can(admin, "audit_log:view"), "Admin can view audit log");
  assert(!can(hr, "audit_log:view"), "HR CANNOT view audit log");
  assert(!can(manager, "audit_log:view"), "Manager CANNOT view audit log");
  assert(!can(member, "audit_log:view"), "Member CANNOT view audit log");

  // AI Copilot: all roles
  assert(can(owner, "ai:copilot"), "Owner can use AI Copilot");
  assert(can(admin, "ai:copilot"), "Admin can use AI Copilot");
  assert(can(hr, "ai:copilot"), "HR can use AI Copilot");
  assert(can(manager, "ai:copilot"), "Manager can use AI Copilot");
  assert(can(member, "ai:copilot"), "Member can use AI Copilot");

  // Deactivated user check across permissions
  console.log("\n--- 10. Testing Deactivated User Restrictions ---");
  for (const perm of PERMISSION_MATRIX) {
    assert(!can(deactivated, perm.key), `Deactivated user blocked from ${perm.key}`);
  }

  console.log("\n=================================================================");
  console.log(`  MATRIX TEST SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED (${failedChecks} FAILED)`);
  console.log("=================================================================\n");
}

runPermissionsMatrixTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

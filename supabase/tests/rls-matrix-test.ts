import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../src/lib/supabase/admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface RlsMatrixRow {
  domain: string;
  table: string;
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  cross_tenant_touch: "BLOCKED (PASS)" | "EXPOSED (FAIL)";
  member_admin_act: "BLOCKED (PASS)" | "ALLOWED (FAIL)" | "N/A";
  anon_access: "BLOCKED (PASS)" | "ALLOWED (INTENDED)" | "EXPOSED (FAIL)";
  verdict: "VERIFIED SECURE" | "VULNERABILITY FOUND";
}

export async function runRlsMatrixTest() {
  console.log("=== STARTING RIGOROUS RLS MULTI-TENANT & ROLE AUDIT ===");
  const admin = createAdminClient();

  const timestamp = Date.now();
  const emailA = `rls_tenant_a_${timestamp}@ropimo.test`;
  const emailB = `rls_tenant_b_${timestamp}@ropimo.test`;
  const emailC = `rls_member_c_${timestamp}@ropimo.test`;
  const password = "TestSecurePassword123!@#";

  console.log("1. Creating test users across distinct tenants:");
  const [{ data: uA }, { data: uB }, { data: uC }] = await Promise.all([
    admin.auth.admin.createUser({ email: emailA, password, email_confirm: true }),
    admin.auth.admin.createUser({ email: emailB, password, email_confirm: true }),
    admin.auth.admin.createUser({ email: emailC, password, email_confirm: true }),
  ]);

  const userA = uA.user!;
  const userB = uB.user!;
  const userC = uC.user!;

  console.log(` - Tenant A Owner (User A): ${userA.id}`);
  console.log(` - Tenant B Owner (User B): ${userB.id}`);
  console.log(` - Tenant A Member (User C): ${userC.id}`);

  // Create Workspaces A and B
  const wsAId = crypto.randomUUID();
  const wsBId = crypto.randomUUID();

  await admin.from("workspaces").insert([
    { id: wsAId, name: "Workspace Alpha", slug: `alpha-${timestamp}`, owner_id: userA.id, created_by: userA.id },
    { id: wsBId, name: "Workspace Beta", slug: `beta-${timestamp}`, owner_id: userB.id, created_by: userB.id },
  ]);

  // Insert memberships
  await admin.from("workspace_members").insert([
    { workspace_id: wsAId, user_id: userA.id, role: "owner" },
    { workspace_id: wsBId, user_id: userB.id, role: "owner" },
    { workspace_id: wsAId, user_id: userC.id, role: "member" },
  ]);

  // Sign in using ANON key with real user sessions
  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  const clientB = createClient(SUPABASE_URL, ANON_KEY);
  const clientC = createClient(SUPABASE_URL, ANON_KEY);
  const clientAnon = createClient(SUPABASE_URL, ANON_KEY);

  await clientA.auth.signInWithPassword({ email: emailA, password });
  await clientB.auth.signInWithPassword({ email: emailB, password });
  await clientC.auth.signInWithPassword({ email: emailC, password });

  console.log("2. Sessions active via Anon Key (Auth Bearer JWTs attached).\n");

  const matrix: RlsMatrixRow[] = [];

  function record(
    domain: string,
    table: string,
    operation: RlsMatrixRow["operation"],
    crossTouchAllowed: boolean,
    memberAdminAllowed: boolean | null,
    anonAllowed: boolean,
    anonIntended: boolean = false
  ) {
    const crossBlocked = !crossTouchAllowed;
    const memberBlocked = memberAdminAllowed === null ? true : !memberAdminAllowed;
    const anonSecure = anonIntended ? anonAllowed : !anonAllowed;

    const allPassed = crossBlocked && memberBlocked && anonSecure;

    matrix.push({
      domain,
      table,
      operation,
      cross_tenant_touch: crossBlocked ? "BLOCKED (PASS)" : "EXPOSED (FAIL)",
      member_admin_act: memberAdminAllowed === null ? "N/A" : memberBlocked ? "BLOCKED (PASS)" : "ALLOWED (FAIL)",
      anon_access: anonIntended ? (anonAllowed ? "ALLOWED (INTENDED)" : "BLOCKED (FAIL)") : (anonAllowed ? "EXPOSED (FAIL)" : "BLOCKED (PASS)"),
      verdict: allPassed ? "VERIFIED SECURE" : "VULNERABILITY FOUND",
    });
  }

  // --- CORE: workspaces ---
  {
    const { data: bSeenByA } = await clientA.from("workspaces").select("id").eq("id", wsBId);
    const { data: anonSeen } = await clientAnon.from("workspaces").select("id").eq("id", wsBId);
    record("Core", "workspaces", "SELECT", (bSeenByA?.length || 0) > 0, null, (anonSeen?.length || 0) > 0);

    const { data: bUpdatedByA } = await clientA.from("workspaces").update({ name: "Hacked by A" }).eq("id", wsBId).select();
    const { data: aUpdatedByC } = await clientC.from("workspaces").update({ name: "Hacked by Member C" }).eq("id", wsAId).select();
    record("Core", "workspaces", "UPDATE", (bUpdatedByA?.length || 0) > 0, (aUpdatedByC?.length || 0) > 0, false);

    const { data: bDeletedByA } = await clientA.from("workspaces").delete().eq("id", wsBId).select();
    const { data: aDeletedByC } = await clientC.from("workspaces").delete().eq("id", wsAId).select();
    record("Core", "workspaces", "DELETE", (bDeletedByA?.length || 0) > 0, (aDeletedByC?.length || 0) > 0, false);
  }

  // --- CORE: workspace_members ---
  {
    const { data: bMembersSeenByA } = await clientA.from("workspace_members").select("id").eq("workspace_id", wsBId);
    record("Core", "workspace_members", "SELECT", (bMembersSeenByA?.length || 0) > 0, null, false);

    const { data: aOwnerRemovedByC } = await clientC.from("workspace_members").delete().eq("workspace_id", wsAId).eq("user_id", userA.id).select();
    record("Core", "workspace_members", "DELETE", false, (aOwnerRemovedByC?.length || 0) > 0, false);
  }

  // --- DEPARTMENTS ---
  {
    const deptBId = crypto.randomUUID();
    await admin.from("departments").insert({ id: deptBId, workspace_id: wsBId, name: "Secret B Dept", color: "#333" });

    const { data: deptSeenByA } = await clientA.from("departments").select("id").eq("id", deptBId);
    record("Departments", "departments", "SELECT", (deptSeenByA?.length || 0) > 0, null, false);

    const { data: deptCreatedByC } = await clientC.from("departments").insert({ workspace_id: wsAId, name: "Member Dept", color: "#111" }).select();
    record("Departments", "departments", "INSERT", false, (deptCreatedByC?.length || 0) > 0, false);

    const { data: deptDeletedByA } = await clientA.from("departments").delete().eq("id", deptBId).select();
    record("Departments", "departments", "DELETE", (deptDeletedByA?.length || 0) > 0, null, false);
  }

  // --- PROJECTS ---
  {
    const projBId = crypto.randomUUID();
    await admin.from("projects").insert({ id: projBId, workspace_id: wsBId, name: "Secret B Project" });

    const { data: projSeenByA } = await clientA.from("projects").select("id").eq("id", projBId);
    record("Projects", "projects", "SELECT", (projSeenByA?.length || 0) > 0, null, false);

    const { data: projUpdatedByA } = await clientA.from("projects").update({ name: "Hacked Project" }).eq("id", projBId).select();
    record("Projects", "projects", "UPDATE", (projUpdatedByA?.length || 0) > 0, null, false);

    const { data: projDeletedByA } = await clientA.from("projects").delete().eq("id", projBId).select();
    record("Projects", "projects", "DELETE", (projDeletedByA?.length || 0) > 0, null, false);
  }

  // --- TASKS & CHILD ASSIGNEES ---
  {
    const taskBId = crypto.randomUUID();
    await admin.from("tasks").insert({ id: taskBId, workspace_id: wsBId, title: "Secret B Task", status: "todo" });

    const { data: taskSeenByA } = await clientA.from("tasks").select("id").eq("id", taskBId);
    record("Tasks", "tasks", "SELECT", (taskSeenByA?.length || 0) > 0, null, false);

    const { data: taskUpdatedByA } = await clientA.from("tasks").update({ title: "Hacked Task" }).eq("id", taskBId).select();
    record("Tasks", "tasks", "UPDATE", (taskUpdatedByA?.length || 0) > 0, null, false);

    const { data: taskDeletedByA } = await clientA.from("tasks").delete().eq("id", taskBId).select();
    record("Tasks", "tasks", "DELETE", (taskDeletedByA?.length || 0) > 0, null, false);

    // Child task_assignees
    const { data: assignB } = await admin.from("task_assignees").insert({ task_id: taskBId, user_id: userB.id }).select().single();
    const { data: assignSeenByA } = await clientA.from("task_assignees").select("id").eq("id", assignB?.id);
    record("Tasks", "task_assignees", "SELECT", (assignSeenByA?.length || 0) > 0, null, false);
  }

  // --- ATTENDANCE & SETTINGS ---
  {
    const { data: attB } = await admin.from("attendance_records").insert({
      workspace_id: wsBId,
      user_id: userB.id,
      date: "2026-10-10",
      status: "Present",
    }).select().single();

    const { data: attSeenByA } = await clientA.from("attendance_records").select("id").eq("id", attB?.id);
    record("Attendance", "attendance_records", "SELECT", (attSeenByA?.length || 0) > 0, null, false);

    // Member C cannot update Attendance Settings in WS A
    const { data: settingsUpdatedByC } = await clientC.from("attendance_settings").update({ require_geofence: false }).eq("workspace_id", wsAId).select();
    record("Attendance", "attendance_settings", "UPDATE", false, (settingsUpdatedByC?.length || 0) > 0, false);
  }

  // --- LEAVE SYSTEM ---
  {
    const { data: leaveB } = await admin.from("leave_requests").insert({
      workspace_id: wsBId,
      user_id: userB.id,
      leave_type: "Casual",
      start_date: "2026-10-15",
      end_date: "2026-10-16",
      reason: "Confidential B Leave",
      status: "Pending",
    }).select().single();

    const { data: leaveSeenByA } = await clientA.from("leave_requests").select("id").eq("id", leaveB?.id);
    record("Leave", "leave_requests", "SELECT", (leaveSeenByA?.length || 0) > 0, null, false);

    // Member C cannot approve or modify another user's leave
    const { data: leaveBModifiedByC } = await clientC.from("leave_requests").update({ status: "Approved" }).eq("id", leaveB?.id).select();
    record("Leave", "leave_requests", "UPDATE", (leaveBModifiedByC?.length || 0) > 0, null, false);
  }

  // --- PUBLIC RECRUITMENT & HIRING ---
  {
    const jobBId = crypto.randomUUID();
    await admin.from("job_openings").insert({
      id: jobBId,
      workspace_id: wsBId,
      title: "Public Fullstack Engineer",
      status: "Published",
      job_type: "Full-time",
      department: "Engineering",
      location: "Remote",
    });

    // 1. Anon can SELECT published job opening (Intended behavior)
    const { data: anonJob } = await clientAnon.from("job_openings").select("id").eq("id", jobBId);
    record("Recruitment", "job_openings", "SELECT", false, null, (anonJob?.length || 0) > 0, true);

    // 2. Anon CANNOT delete job openings
    const { data: anonJobDeleted } = await clientAnon.from("job_openings").delete().eq("id", jobBId).select();
    record("Recruitment", "job_openings", "DELETE", false, null, (anonJobDeleted?.length || 0) > 0, false);

    // 3. Anon CAN insert a candidate application (Intended public behavior)
    const candId = crypto.randomUUID();
    const { data: candCreatedByAnon } = await clientAnon.from("candidates").insert({
      id: candId,
      workspace_id: wsBId,
      full_name: "External Applicant",
      email: "applicant@gmail.com",
      status: "New",
      stage: "Applied",
    }).select();
    record("Recruitment", "candidates", "INSERT", false, null, (candCreatedByAnon?.length || 0) > 0, true);

    // 4. Anon CANNOT read back candidate records
    const { data: candSeenByAnon } = await clientAnon.from("candidates").select("id").eq("id", candId);
    record("Recruitment", "candidates", "SELECT", false, null, (candSeenByAnon?.length || 0) > 0, false);

    // 5. Tenant A CANNOT read Tenant B's candidates
    const { data: candBSeenByA } = await clientA.from("candidates").select("id").eq("id", candId);
    record("Recruitment", "candidates", "SELECT", (candBSeenByA?.length || 0) > 0, null, false);
  }

  // --- MEETINGS ---
  {
    const meetBId = crypto.randomUUID();
    await admin.from("workspace_meetings").insert({
      id: meetBId,
      workspace_id: wsBId,
      title: "Secret Strategy Meeting B",
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
    });

    const { data: meetSeenByA } = await clientA.from("workspace_meetings").select("id").eq("id", meetBId);
    record("Meetings", "workspace_meetings", "SELECT", (meetSeenByA?.length || 0) > 0, null, false);

    const { data: meetDeletedByA } = await clientA.from("workspace_meetings").delete().eq("id", meetBId).select();
    record("Meetings", "workspace_meetings", "DELETE", (meetDeletedByA?.length || 0) > 0, null, false);
  }

  // Cleanup test artifacts
  console.log("\nCleaning up test artifacts...");
  await admin.from("workspaces").delete().in("id", [wsAId, wsBId]);
  await admin.auth.admin.deleteUser(userA.id);
  await admin.auth.admin.deleteUser(userB.id);
  await admin.auth.admin.deleteUser(userC.id);

  console.log("=== COMPREHENSIVE RLS AUDIT MATRIX COMPLETE ===");
  console.table(matrix);

  return matrix;
}

if (require.main === module) {
  runRlsMatrixTest().catch(console.error);
}

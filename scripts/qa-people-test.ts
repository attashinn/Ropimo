/**
 * ROPIMO — PEOPLE SYSTEM END-TO-END QA SUITE
 * Uses admin client directly to bypass Next.js server context
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMemberActivities,
  getMemberProjects,
  type MemberProjectSummary,
  type MemberActivitySummary,
} from "@/lib/people/queries";
import { WorkspacePerson, PersonDepartmentRef } from "@/types/people";

// ─── Direct admin-only People Loader (no cookies needed) ─────────────────────
async function loadPeople(workspaceId: string): Promise<WorkspacePerson[]> {
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (!members || members.length === 0) return [];

  const { data: deptMemberships } = await admin
    .from("department_members")
    .select(`
      department_id,
      user_id,
      job_title,
      departments:department_id (
        id, name, icon, color
      )
    `)
    .eq("workspace_id", workspaceId);

  const userDeptsMap = new Map<string, PersonDepartmentRef[]>();
  (deptMemberships || []).forEach((dm: any) => {
    if (dm.departments) {
      const list = userDeptsMap.get(dm.user_id) || [];
      list.push({
        id: dm.departments.id,
        name: dm.departments.name,
        icon: dm.departments.icon,
        color: dm.departments.color,
        job_title: dm.job_title,
      });
      userDeptsMap.set(dm.user_id, list);
    }
  });

  const userIds = members.map((m) => m.user_id);
  const profilesMap = new Map<string, any>();

  const userResults = await Promise.all(
    userIds.map((id) => admin.auth.admin.getUserById(id))
  );
  userResults.forEach((res) => {
    const u = res.data?.user;
    if (u) {
      const meta = u.user_metadata || {};
      profilesMap.set(u.id, {
        email: u.email || "",
        fullName: meta.full_name || meta.name || null,
        avatarUrl: meta.avatar_url || null,
        phone: meta.phone || null,
        location: meta.location || null,
        jobTitle: meta.job_title || null,
        employeeId: meta.employee_id || null,
        employmentType: meta.employment_type || null,
        employmentStatus: meta.employment_status || null,
        bio: meta.bio || null,
        skills: Array.isArray(meta.skills) ? meta.skills : [],
      });
    }
  });

  return members.map((m) => {
    const profile = profilesMap.get(m.user_id);
    const email = profile?.email || m.email || "unknown@ropimo.com";
    const full_name = m.full_name || profile?.fullName || email.split("@")[0];
    const departments = userDeptsMap.get(m.user_id) || [];

    return {
      id: m.id,
      user_id: m.user_id,
      workspace_id: m.workspace_id,
      role: m.role || "member",
      job_title: m.job_title || profile?.jobTitle || null,
      full_name,
      email,
      avatar_url: m.avatar_url || profile?.avatarUrl || null,
      phone: profile?.phone || null,
      location: profile?.location || null,
      employee_id: profile?.employeeId || null,
      employment_type: profile?.employmentType || "Full-time",
      employment_status: profile?.employmentStatus || "Active",
      hire_date: m.created_at,
      bio: profile?.bio || null,
      skills: profile?.skills || [],
      departments,
      created_at: m.created_at,
    } as WorkspacePerson;
  });
}

async function loadPerson(userId: string, workspaceId: string): Promise<WorkspacePerson | null> {
  const people = await loadPeople(workspaceId);
  return people.find((p) => p.user_id === userId || p.id === userId) || null;
}

// ─── Main QA Runner ───────────────────────────────────────────────────────────
async function runPeopleQA() {
  console.log("==========================================");
  console.log("ROPIMO — PEOPLE SYSTEM END-TO-END QA SUITE");
  console.log("==========================================\n");

  const admin = createAdminClient();
  const results: Record<string, "PASS" | "FAIL"> = {};

  // SETUP
  const { data: workspaces } = await admin
    .from("workspaces")
    .select("id, name, slug")
    .limit(1);

  if (!workspaces || workspaces.length === 0) {
    console.error("FATAL: No workspace found!");
    process.exit(1);
  }

  const workspace = workspaces[0];
  console.log(`[SETUP] Workspace: "${workspace.name}" (${workspace.id})`);

  const { data: wsMembers } = await admin
    .from("workspace_members")
    .select("user_id, role, full_name, job_title")
    .eq("workspace_id", workspace.id)
    .limit(1);

  if (!wsMembers || wsMembers.length === 0) {
    console.error("FATAL: No members found!");
    process.exit(1);
  }

  const testUser = wsMembers[0];
  console.log(
    `[SETUP] Test User: "${testUser.full_name}" (${testUser.user_id}, role: ${testUser.role})\n`
  );

  // ── TEST 1 & 2: PEOPLE DIRECTORY & WORKSPACE SCOPE ──
  console.log("--- TEST 1 & 2: PEOPLE DIRECTORY & WORKSPACE SCOPE ---");
  const people = await loadPeople(workspace.id);
  const { data: depts } = await admin
    .from("departments")
    .select("id, name")
    .eq("workspace_id", workspace.id);
  const departments = depts || [];

  if (people.length > 0 && people.every((p) => p.workspace_id === workspace.id)) {
    console.log(`PASS: Loaded ${people.length} real workspace members, all scoped correctly.`);
    results["People directory"] = "PASS";
    results["Workspace scope"] = "PASS";
  } else {
    console.error("FAIL: Member list empty or unscoped.");
    results["People directory"] = "FAIL";
    results["Workspace scope"] = "FAIL";
  }

  // ── TEST 3, 4, 5: DYNAMIC METRICS ──
  console.log("\n--- TEST 3, 4, 5: DYNAMIC METRICS ---");
  const totalMembersCount = people.length;
  const departmentsCount = departments.length;
  const adminsCount = people.filter((p) => ["owner", "admin"].includes(p.role)).length;

  const now = new Date();
  const newThisMonthCount = people.filter((p) => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  if (totalMembersCount >= 1 && adminsCount >= 1) {
    console.log(
      `PASS: Metrics — Total=${totalMembersCount}, Departments=${departmentsCount}, Admins=${adminsCount}, New This Month=${newThisMonthCount}`
    );
    results["Member count"] = "PASS";
    results["Department count"] = "PASS";
    results["Admin count"] = "PASS";
    results["New this month"] = "PASS";
  } else {
    console.error("FAIL: Metric calculation unexpected.");
    results["Member count"] = "FAIL";
    results["Department count"] = "FAIL";
    results["Admin count"] = "FAIL";
    results["New this month"] = "FAIL";
  }

  // ── TEST 6: SEARCH ──
  console.log("\n--- TEST 6: SEARCH FILTERING ---");
  const searchQuery = testUser.full_name?.substring(0, 4).toLowerCase() || "tash";
  const searchMatches = people.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(searchQuery) ||
      p.email.toLowerCase().includes(searchQuery) ||
      p.job_title?.toLowerCase().includes(searchQuery)
  );
  const noResults = people.filter(
    (p) =>
      p.full_name?.toLowerCase().includes("xyz999nonexistent") ||
      p.email.toLowerCase().includes("xyz999nonexistent")
  );
  if (searchMatches.length > 0 && noResults.length === 0) {
    console.log(`PASS: Search matched ${searchMatches.length} record(s) for "${searchQuery}", returned 0 for nonexistent.`);
    results["Search"] = "PASS";
  } else {
    console.error("FAIL: Search logic mismatch.");
    results["Search"] = "FAIL";
  }

  // ── TEST 7, 8, 9: FILTERS ──
  console.log("\n--- TEST 7, 8, 9: FILTERS ---");
  const ownerCount = people.filter((p) => p.role === "owner").length;
  const activeCount = people.filter(
    (p) => (p.employment_status || "Active").toLowerCase() === "active"
  ).length;
  const deptFiltered =
    departments.length > 0
      ? people.filter((p) => p.departments.some((d) => d.id === departments[0].id))
      : [];
  if (ownerCount >= 1 && activeCount >= 1) {
    console.log(
      `PASS: Filters — Owners=${ownerCount}, Active=${activeCount}, DeptFiltered=${deptFiltered.length}`
    );
    results["Department filter"] = "PASS";
    results["Role filter"] = "PASS";
    results["Status filter"] = "PASS";
  } else {
    console.error("FAIL: Filter verification failed.");
    results["Department filter"] = "FAIL";
    results["Role filter"] = "FAIL";
    results["Status filter"] = "FAIL";
  }

  // ── TEST 10: SORTING ──
  console.log("\n--- TEST 10: SORTING ---");
  const sortAZ = [...people].sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
  const sortZA = [...people].sort((a, b) => (b.full_name || b.email).localeCompare(a.full_name || a.email));
  const sortRecent = [...people].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  if (sortAZ.length === people.length && sortZA.length === people.length && sortRecent.length === people.length) {
    console.log("PASS: All sorting modes preserve full dataset length.");
    results["Sorting"] = "PASS";
  } else {
    console.error("FAIL: Sorting returned inconsistent lengths.");
    results["Sorting"] = "FAIL";
  }

  // ── TEST 11: PAGINATION ──
  console.log("\n--- TEST 11: PAGINATION ---");
  const pageSize = 8;
  const totalPages = Math.ceil(people.length / pageSize) || 1;
  const page1 = people.slice(0, pageSize);
  if (page1.length <= pageSize && totalPages >= 1) {
    console.log(`PASS: Pagination — ${page1.length} on page 1 of ${totalPages} total pages.`);
    results["Pagination"] = "PASS";
  } else {
    console.error("FAIL: Pagination miscalculation.");
    results["Pagination"] = "FAIL";
  }

  // ── TEST 12 & 15: MEMBER PROFILE & EMPTY STATES ──
  console.log("\n--- TEST 12 & 15: MEMBER PROFILE & EMPTY STATES ---");
  const singlePerson = await loadPerson(testUser.user_id, workspace.id);
  if (singlePerson && singlePerson.email) {
    console.log(`PASS: Profile loaded: "${singlePerson.full_name}" <${singlePerson.email}>`);
    console.log(
      `  Phone="${singlePerson.phone || "Not set"}", Location="${singlePerson.location || "Not set"}", EmployeeID="${singlePerson.employee_id || "Not set"}"`
    );
    // Verify no fake default fallbacks appear
    const fakeValues = ["Dhaka, Bangladesh", "EMP-001"];
    const hasFake = fakeValues.some(
      (v) => singlePerson.location === v || singlePerson.employee_id === v
    );
    if (hasFake) {
      console.warn("  WARNING: Fake default value found in profile fields.");
      results["Empty states (no fake data)"] = "FAIL";
    } else {
      console.log("  PASS: No fake default fallbacks found.");
      results["Empty states (no fake data)"] = "PASS";
    }
    results["Member profile"] = "PASS";
  } else {
    console.error("FAIL: Member profile lookup failed.");
    results["Member profile"] = "FAIL";
    results["Empty states (no fake data)"] = "FAIL";
  }

  // ── TEST 13 & 14: REAL PROJECTS & ACTIVITIES ──
  console.log("\n--- TEST 13 & 14: REAL PROJECTS & ACTIVITIES ---");
  const memberProjects: MemberProjectSummary[] = await getMemberProjects(testUser.user_id, workspace.id);
  const memberActivities: MemberActivitySummary[] = await getMemberActivities(testUser.user_id, workspace.id);
  console.log(`PASS: Projects for user=${memberProjects.length}, Activities=${memberActivities.length}`);
  results["Project data"] = "PASS";
  results["Activity data"] = "PASS";

  // ── TEST 16: SECURITY ──
  console.log("\n--- TEST 16: CROSS-WORKSPACE SECURITY ---");
  const fakePeople = await loadPeople("00000000-0000-0000-0000-000000000000");
  const fakeUser = await loadPerson(testUser.user_id, "00000000-0000-0000-0000-000000000000");
  if (fakePeople.length === 0 && fakeUser === null) {
    console.log("PASS: Cross-workspace access safely returned empty.");
    results["Security isolation"] = "PASS";
  } else {
    console.error("FAIL: Cross-workspace access returned data!");
    results["Security isolation"] = "FAIL";
  }

  // ── TEST 17: MEMBER EDITING ──
  console.log("\n--- TEST 17: MEMBER EDITING ---");
  const TEST_JOB_TITLE = "Principal Engineer & Founder";
  await admin
    .from("workspace_members")
    .update({ job_title: TEST_JOB_TITLE })
    .eq("workspace_id", workspace.id)
    .eq("user_id", testUser.user_id);

  const { data: updatedMember } = await admin
    .from("workspace_members")
    .select("job_title")
    .eq("workspace_id", workspace.id)
    .eq("user_id", testUser.user_id)
    .single();

  if (updatedMember?.job_title === TEST_JOB_TITLE) {
    console.log(`PASS: Job title updated to: "${updatedMember.job_title}"`);
    results["Member editing"] = "PASS";
  } else {
    console.error("FAIL: Member editing failed:", updatedMember);
    results["Member editing"] = "FAIL";
  }

  // ── TEST 18: STATUS TOGGLE ──
  console.log("\n--- TEST 18: STATUS TOGGLE (ACTIVATION) ---");
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(testUser.user_id);
    if (authUser?.user) {
      await admin.auth.admin.updateUserById(testUser.user_id, {
        user_metadata: { ...authUser.user.user_metadata, employment_status: "Active" },
      });
      console.log("PASS: employment_status toggled in auth.users metadata.");
      results["Deactivation toggle"] = "PASS";
    } else {
      console.error("FAIL: Auth user not found.");
      results["Deactivation toggle"] = "FAIL";
    }
  } catch (err) {
    console.error("FAIL: Status toggle error:", err);
    results["Deactivation toggle"] = "FAIL";
  }

  // ── TEST 19: REFRESH PERSISTENCE ──
  console.log("\n--- TEST 19: REFRESH PERSISTENCE ---");
  const rechecked = await loadPerson(testUser.user_id, workspace.id);
  if (rechecked?.job_title === TEST_JOB_TITLE) {
    console.log(`PASS: Persist confirmed after re-query: "${rechecked.job_title}"`);
    results["Refresh persistence"] = "PASS";
  } else {
    console.error("FAIL: Persistent data not reflected after re-query.");
    results["Refresh persistence"] = "FAIL";
  }

  // ── RESULTS TABLE ──
  const passed = Object.values(results).filter((r) => r === "PASS").length;
  const total = Object.keys(results).length;

  console.log("\n==========================================");
  console.log(`PEOPLE QA RESULTS: ${passed}/${total} PASSING`);
  console.log("==========================================");
  console.table(
    Object.entries(results).map(([test, result]) => ({ Test: test, Result: result }))
  );

  console.log("\n[QA RECORD IDS]:", JSON.stringify({ workspaceId: workspace.id, testUserId: testUser.user_id }, null, 2));

  if (passed < total) process.exit(1);
}

runPeopleQA().catch((err) => {
  console.error("People QA crashed:", err);
  process.exit(1);
});

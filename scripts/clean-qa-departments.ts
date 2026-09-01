import { createAdminClient } from "../src/lib/supabase/admin";

async function inspectAndCleanQA() {
  const adminClient = createAdminClient();

  console.log("=== 1. FETCHING ALL DEPARTMENTS ===");
  const { data: allDepts, error: deptsError } = await adminClient
    .from("departments")
    .select("id, workspace_id, name, slug, created_at");

  if (deptsError) {
    console.error("Error fetching departments:", deptsError);
    return;
  }

  console.log(`Found ${allDepts.length} total departments in database:`);
  allDepts.forEach((d) => {
    console.log(`  - [${d.id}] "${d.name}" (slug: ${d.slug})`);
  });

  // Identify QA departments
  const qaDepts = allDepts.filter((d) => {
    const n = d.name.toLowerCase();
    const s = d.slug.toLowerCase();
    return (
      n.startsWith("qa ") ||
      n.startsWith("qa-") ||
      n.includes("qa test") ||
      n.includes("qa core") ||
      n.includes("qa growth") ||
      s.startsWith("qa-") ||
      s.startsWith("core-systems-") ||
      s.startsWith("growth-marketing-")
    );
  });

  const realDepts = allDepts.filter((d) => !qaDepts.some((qd) => qd.id === d.id));

  console.log("\n=== 2. IDENTIFIED QA DEPARTMENTS TO CLEAN ===");
  console.log(`QA Departments (${qaDepts.length}):`);
  qaDepts.forEach((d) => {
    console.log(`  DELETE -> [${d.id}] "${d.name}" (slug: ${d.slug})`);
  });

  console.log(`\nLegitimate Production Departments to PRESERVE (${realDepts.length}):`);
  realDepts.forEach((d) => {
    console.log(`  PRESERVE -> [${d.id}] "${d.name}" (slug: ${d.slug})`);
  });

  if (qaDepts.length === 0) {
    console.log("\nNo QA departments found to delete.");
    return;
  }

  const qaDeptIds = qaDepts.map((d) => d.id);

  console.log("\n=== 3. CLEANING ASSOCIATED QA RECORDS ===");

  // Find tasks linked to QA departments or QA names
  const { data: qaTasks } = await adminClient
    .from("tasks")
    .select("id, title, department_id")
    .in("department_id", qaDeptIds);

  console.log(`Found ${(qaTasks || []).length} tasks in QA departments.`);
  if (qaTasks && qaTasks.length > 0) {
    const taskIds = qaTasks.map((t) => t.id);
    await adminClient.from("task_assignees").delete().in("task_id", taskIds);
    await adminClient.from("task_activities").delete().in("task_id", taskIds);
    await adminClient.from("task_comments").delete().in("task_id", taskIds);
    await adminClient.from("task_submissions").delete().in("task_id", taskIds);
    await adminClient.from("tasks").delete().in("id", taskIds);
    console.log(`Deleted ${taskIds.length} QA tasks & related relations.`);
  }

  // Find projects named QA or core-opt
  const { data: qaProjects } = await adminClient
    .from("projects")
    .select("id, name, slug");

  const projectsToDelete = (qaProjects || []).filter((p) => {
    const n = p.name.toLowerCase();
    const s = p.slug?.toLowerCase() || "";
    return (
      n.startsWith("qa ") ||
      n.startsWith("core engine optimization") ||
      n.startsWith("core optimization") ||
      s.startsWith("core-opt-") ||
      s.startsWith("core-engine-opt-")
    );
  });

  console.log(`Found ${projectsToDelete.length} QA projects.`);
  if (projectsToDelete.length > 0) {
    const projIds = projectsToDelete.map((p) => p.id);
    await adminClient.from("tasks").delete().in("project_id", projIds);
    await adminClient.from("projects").delete().in("id", projIds);
    console.log(`Deleted ${projIds.length} QA projects.`);
  }

  // Clean department_members for QA departments
  const { error: dmDelError } = await adminClient
    .from("department_members")
    .delete()
    .in("department_id", qaDeptIds);
  if (dmDelError) console.error("Error deleting department_members:", dmDelError);
  else console.log(`Deleted department_members for QA departments.`);

  // Clean workspace_activities for QA departments
  await adminClient
    .from("workspace_activities")
    .delete()
    .in("department_id", qaDeptIds);
  console.log(`Deleted workspace_activities for QA departments.`);

  // Delete QA departments
  const { error: deptDelError } = await adminClient
    .from("departments")
    .delete()
    .in("id", qaDeptIds);
  if (deptDelError) console.error("Error deleting QA departments:", deptDelError);
  else console.log(`Successfully deleted ${qaDeptIds.length} QA departments.`);

  // Clean test auth users (e.g. lead.ws.*, mgr.ws.*, mbr.ws.*, outsider.ws.*, qa-*@example.com, test-*@example.com)
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  const qaUsers = (authUsers?.users || []).filter((u) => {
    const em = u.email?.toLowerCase() || "";
    return (
      em.includes("lead.ws.") ||
      em.includes("mgr.ws.") ||
      em.includes("mbr.ws.") ||
      em.includes("outsider.ws.") ||
      em.startsWith("qa-") ||
      em.startsWith("qa.") ||
      em.startsWith("test-qa-") ||
      (em.includes("@example.com") && (em.includes("qa") || em.includes("temp") || em.includes("test")))
    );
  });

  console.log(`\nFound ${qaUsers.length} QA auth users to clean.`);
  for (const qu of qaUsers) {
    await adminClient.from("department_members").delete().eq("user_id", qu.id);
    await adminClient.from("workspace_members").delete().eq("user_id", qu.id);
    await adminClient.auth.admin.deleteUser(qu.id);
    console.log(`  Cleaned QA user: ${qu.email} (${qu.id})`);
  }

  console.log("\n=== 4. POST-CLEANUP DEPARTMENTS STATUS ===");
  const { data: remainingDepts } = await adminClient
    .from("departments")
    .select("id, name, slug, created_at");

  console.log(`Remaining departments count: ${(remainingDepts || []).length}`);
  (remainingDepts || []).forEach((d) => {
    console.log(`  - [${d.id}] "${d.name}" (slug: ${d.slug})`);
  });

  console.log("\nCleanup successfully completed! 🎉");
}

inspectAndCleanQA().catch(console.error);

import { createAdminClient } from "../src/lib/supabase/admin";

async function runSeed() {
  console.log("🌱 Starting Neon DB demo data seeding...\n");

  const admin = createAdminClient();

  // 1. Resolve or Create Demo Users
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const existingUsers = authUsers?.users || [];

  let ownerUserId: string;

  if (existingUsers.length > 0) {
    ownerUserId = existingUsers[0].id;
  } else {
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: "demo.founder@zambic.com",
      password: "DemoPassword123!",
      email_confirm: true,
      user_metadata: { full_name: "Sarah Connor" },
    });
    if (createError || !createdUser?.user) {
      throw new Error(`Failed to create demo user: ${createError?.message}`);
    }
    ownerUserId = createdUser.user.id;
  }

  console.log(`Using owner user ID: ${ownerUserId}`);

  // 2. Workspace
  const demoWorkspaceId = "00000000-0000-4000-8000-000000000001";
  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .upsert(
      {
        id: demoWorkspaceId,
        name: "Acme Innovation Studio",
        slug: "acme-studio-demo",
        icon: "⚡",
        owner_id: ownerUserId,
        created_by: ownerUserId,
        team_size: "15-50",
        industry: "Design & Technology",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (wsErr) {
    throw new Error(`Workspace seed error: ${wsErr.message}`);
  }
  console.log("Workspace seeded successfully.");

  // 3. Workspace Member
  await admin.from("workspace_members").upsert(
    {
      workspace_id: demoWorkspaceId,
      user_id: ownerUserId,
      role: "owner",
      full_name: "Sarah Connor",
      job_title: "CEO & Founder",
      employment_status: "Active",
      employment_type: "Full-time",
    },
    { onConflict: "workspace_id, user_id" }
  );
  console.log("Workspace member seeded.");

  // 4. Departments
  const deptEngineeringId = "00000000-0000-4000-8000-000000000010";
  const deptDesignId = "00000000-0000-4000-8000-000000000011";

  await admin.from("departments").upsert(
    [
      {
        id: deptEngineeringId,
        workspace_id: demoWorkspaceId,
        name: "Engineering",
        slug: "engineering",
        description: "Software engineering and architecture",
        icon: "code",
        color: "#3B63F0",
        lead_id: ownerUserId,
      },
      {
        id: deptDesignId,
        workspace_id: demoWorkspaceId,
        name: "Product Design",
        slug: "product-design",
        description: "UI/UX, design systems, and user research",
        icon: "palette",
        color: "#FF6B3D",
        lead_id: ownerUserId,
      },
    ],
    { onConflict: "id" }
  );
  console.log("Departments seeded.");

  // 5. Projects
  const projWebsiteId = "00000000-0000-4000-8000-000000000020";
  await admin.from("projects").upsert(
    {
      id: projWebsiteId,
      workspace_id: demoWorkspaceId,
      name: "Q4 Platform Redesign",
      slug: "q4-platform-redesign",
      description: "Complete redesign of core user experience",
      status: "active",
      color: "#7ED08A",
      created_by: ownerUserId,
      department_id: deptDesignId,
    },
    { onConflict: "id" }
  );
  console.log("Projects seeded.");

  // 6. Tasks
  await admin.from("tasks").upsert(
    [
      {
        workspace_id: demoWorkspaceId,
        project_id: projWebsiteId,
        department_id: deptDesignId,
        title: "Design System Tokens Migration",
        description: "Align color palette with new neutral tokens",
        status: "in_progress",
        priority: "high",
        created_by: ownerUserId,
      },
      {
        workspace_id: demoWorkspaceId,
        project_id: projWebsiteId,
        department_id: deptEngineeringId,
        title: "Database Performance Tuning on Neon",
        description: "Validate query indexes and connection pooling",
        status: "completed",
        priority: "high",
        created_by: ownerUserId,
      },
    ],
    { onConflict: "id" }
  );
  console.log("Tasks seeded.");

  console.log("\n🎉 Demo data seeding on Neon DB completed successfully!");
}

runSeed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

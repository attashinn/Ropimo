/**
 * scripts/seed-demo.ts
 * Realistic demo seed script for Ropimo workspaces.
 * Populates all tables so that empty tables never hide bugs.
 * Strictly refuses to run in production environments.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// ─── 1. PRODUCTION GUARD ──────────────────────────────────────────────────────
const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase();

if (nodeEnv === "production" || vercelEnv === "production") {
  console.error("❌ CRITICAL: Seed script refused to execute in production environment!");
  process.exit(1);
}

// ─── 2. LOAD ENVIRONMENT VARIABLES ──────────────────────────────────────────
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && rest.length > 0) {
        const val = rest.join("=").replace(/^["']|["']$/g, "").trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── 3. SEED LOGIC ───────────────────────────────────────────────────────────
async function runSeed() {
  console.log("🌱 Starting demo data seeding for local/staging environment...\n");

  const counts: Record<string, number> = {};

  // 1. Resolve or Create Demo Users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const existingUsers = authUsers?.users || [];

  let ownerUserId: string;
  let memberUserIds: string[] = [];

  if (existingUsers.length > 0) {
    ownerUserId = existingUsers[0].id;
    memberUserIds = existingUsers.slice(1, 4).map((u) => u.id);
    if (memberUserIds.length === 0) {
      memberUserIds = [ownerUserId];
    }
  } else {
    // Create demo user
    const { data: createdUser } = await supabase.auth.admin.createUser({
      email: "demo.founder@acme.test",
      password: "DemoPassword123!",
      email_confirm: true,
      user_metadata: { full_name: "Sarah Connor", role: "CEO & Founder" },
    });
    ownerUserId = createdUser!.user!.id;
    memberUserIds = [ownerUserId];
  }

  // 2. Workspace
  const demoWorkspaceId = "00000000-0000-4000-8000-000000000001";
  const { data: ws, error: wsErr } = await supabase
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
    console.error("Workspace seed error:", wsErr.message);
    process.exit(1);
  }
  counts["workspaces"] = 1;

  // 3. Profiles
  await supabase.from("profiles").upsert(
    {
      id: ownerUserId,
      full_name: "Sarah Connor",
      email: existingUsers[0]?.email || "demo.founder@acme.test",
      role: "owner",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  counts["profiles"] = 1;

  // 4. Workspace Members
  await supabase.from("workspace_members").upsert(
    {
      workspace_id: demoWorkspaceId,
      user_id: ownerUserId,
      role: "owner",
      full_name: "Sarah Connor",
      job_title: "CEO & Product Lead",
    },
    { onConflict: "workspace_id,user_id" }
  );
  counts["workspace_members"] = 1;

  // 5. Departments
  const deptEngineeringId = "00000000-0000-4000-8000-000000000011";
  const deptDesignId = "00000000-0000-4000-8000-000000000012";
  const deptHrId = "00000000-0000-4000-8000-000000000013";

  await supabase.from("departments").upsert(
    [
      {
        id: deptEngineeringId,
        workspace_id: demoWorkspaceId,
        name: "Engineering & Cloud",
        slug: "eng-demo",
        description: "Core architecture, API platforms, and infrastructure systems.",
        icon: "code",
        color: "#1E40AF",
        created_by: ownerUserId,
      },
      {
        id: deptDesignId,
        workspace_id: demoWorkspaceId,
        name: "Product Experience",
        slug: "design-demo",
        description: "UI/UX design systems, user research, and branding.",
        icon: "palette",
        color: "#7C3AED",
        created_by: ownerUserId,
      },
      {
        id: deptHrId,
        workspace_id: demoWorkspaceId,
        name: "People & Operations",
        slug: "hr-demo",
        description: "Recruitment, team culture, payroll, and workspace management.",
        icon: "users",
        color: "#166534",
        created_by: ownerUserId,
      },
    ],
    { onConflict: "id" }
  );
  counts["departments"] = 3;

  // 6. Department Members
  await supabase.from("department_members").upsert(
    [
      {
        workspace_id: demoWorkspaceId,
        department_id: deptEngineeringId,
        user_id: ownerUserId,
        job_title: "Principal Architect",
      },
      {
        workspace_id: demoWorkspaceId,
        department_id: deptDesignId,
        user_id: ownerUserId,
        job_title: "Design Director",
      },
    ],
    { onConflict: "department_id,user_id" }
  );
  counts["department_members"] = 2;

  // 7. Projects
  const projectAlphaId = "00000000-0000-4000-8000-000000000021";
  const projectBetaId = "00000000-0000-4000-8000-000000000022";

  await supabase.from("projects").upsert(
    [
      {
        id: projectAlphaId,
        workspace_id: demoWorkspaceId,
        name: "Mobile Banking App V2",
        slug: "mobile-banking-v2",
        description: "Next-generation iOS & Android application with biometrics and instant transfers.",
        status: "active",
        priority: "high",
        color: "#10251F",
        department_id: deptEngineeringId,
        created_by: ownerUserId,
      },
      {
        id: projectBetaId,
        workspace_id: demoWorkspaceId,
        name: "Enterprise Design System",
        slug: "design-system-v1",
        description: "Comprehensive tokenized UI component library and documentation hub.",
        status: "active",
        priority: "urgent",
        color: "#246244",
        department_id: deptDesignId,
        created_by: ownerUserId,
      },
    ],
    { onConflict: "id" }
  );
  counts["projects"] = 2;

  // 8. Project Members
  const { error: pmErr } = await supabase.from("project_members").upsert(
    [
      { project_id: projectAlphaId, workspace_id: demoWorkspaceId, user_id: ownerUserId, role: "lead" },
      { project_id: projectBetaId, workspace_id: demoWorkspaceId, user_id: ownerUserId, role: "lead" },
    ],
    { onConflict: "project_id,user_id" }
  );
  if (pmErr) throw new Error("project_members: " + pmErr.message);
  counts["project_members"] = 2;

  // 9. Tasks
  const task1Id = "00000000-0000-4000-8000-000000000031";
  const task2Id = "00000000-0000-4000-8000-000000000032";
  const task3Id = "00000000-0000-4000-8000-000000000033";

  const { error: taskErr } = await supabase.from("tasks").upsert(
    [
      {
        id: task1Id,
        workspace_id: demoWorkspaceId,
        project_id: projectAlphaId,
        department_id: deptEngineeringId,
        title: "Implement biometric authentication & face-id unlock",
        description: "Integrate SecureEnclave and WebAuthn credentials for iOS/Android sessions.",
        status: "in_progress",
        priority: "high",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: ownerUserId,
      },
      {
        id: task2Id,
        workspace_id: demoWorkspaceId,
        project_id: projectBetaId,
        department_id: deptDesignId,
        title: "Design dark mode color tokens & accessibility guidelines",
        description: "Ensure WCAG AAA contrast ratio compliance for all core palette shades.",
        status: "in_review",
        priority: "urgent",
        due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: ownerUserId,
      },
      {
        id: task3Id,
        workspace_id: demoWorkspaceId,
        project_id: projectAlphaId,
        department_id: deptEngineeringId,
        title: "Configure Cloudflare Turnstile bot verification",
        description: "Protect sensitive endpoints from automated brute force attacks.",
        status: "completed",
        priority: "medium",
        due_date: new Date().toISOString(),
        created_by: ownerUserId,
      },
    ],
    { onConflict: "id" }
  );
  if (taskErr) throw new Error("tasks: " + taskErr.message);
  counts["tasks"] = 3;

  // 10. Task Assignees
  const { error: taErr } = await supabase.from("task_assignees").upsert(
    [
      { task_id: task1Id, user_id: ownerUserId },
      { task_id: task2Id, user_id: ownerUserId },
    ],
    { onConflict: "task_id,user_id" }
  );
  if (taErr) throw new Error("task_assignees: " + taErr.message);
  counts["task_assignees"] = 2;

  // 11. Workspace Meetings
  const meeting1Id = "00000000-0000-4000-8000-000000000041";
  const meeting2Id = "00000000-0000-4000-8000-000000000042";

  const { error: meetErr } = await supabase.from("workspace_meetings").upsert(
    [
      {
        id: meeting1Id,
        workspace_id: demoWorkspaceId,
        title: "Sprint 14 Backlog Refinement & Architecture Sync",
        description: "Review sprint deliverables, architectural blockers, and client feedback.",
        status: "scheduled",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        duration_minutes: 60,
        location: "Google Meet",
        meeting_url: "https://meet.ropimo.com/sprint-14-sync",
        created_by: ownerUserId,
        attendees: [
          { full_name: "Sarah Connor", email: "sarah@acme.test", role: "Organizer", rsvp: "Accepted" },
          { full_name: "Alex Mercer", email: "alex@acme.test", role: "Tech Lead", rsvp: "Accepted" },
        ],
        attendee_count: 2,
        agenda: [
          { id: "ag-1", order: 1, title: "Review high-priority tasks", duration_minutes: 20 },
          { id: "ag-2", order: 2, title: "Biometric auth security architecture", duration_minutes: 25 },
          { id: "ag-3", order: 3, title: "Next sprint milestone commitments", duration_minutes: 15 },
        ],
      },
      {
        id: meeting2Id,
        workspace_id: demoWorkspaceId,
        title: "Q3 Design System Milestone Retrospective",
        description: "Post-launch design review and component consumption audit.",
        status: "completed",
        start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2700000).toISOString(),
        duration_minutes: 45,
        location: "Meeting Room A",
        meeting_url: "https://meet.ropimo.com/design-retro",
        created_by: ownerUserId,
        attendees: [
          { full_name: "Sarah Connor", email: "sarah@acme.test", role: "Lead", rsvp: "Accepted" },
        ],
        attendee_count: 1,
        agenda: [
          { id: "ag-21", order: 1, title: "Token audit findings", duration_minutes: 25 },
        ],
        notes: "Approved merging token release v1.4.0.",
      },
    ],
    { onConflict: "id" }
  );
  if (meetErr) throw new Error("workspace_meetings: " + meetErr.message);
  counts["workspace_meetings"] = 2;

  // 12. Attendance Records
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { error: attErr } = await supabase.from("attendance_records").upsert(
    [
      {
        workspace_id: demoWorkspaceId,
        user_id: ownerUserId,
        date: todayStr,
        status: "Present",
        check_in_at: `${todayStr}T09:02:15Z`,
        total_minutes: 0,
        notes: "Office Headquarters - Morning check-in",
      },
      {
        workspace_id: demoWorkspaceId,
        user_id: ownerUserId,
        date: yesterdayStr,
        status: "Present",
        check_in_at: `${yesterdayStr}T08:58:10Z`,
        check_out_at: `${yesterdayStr}T17:35:00Z`,
        total_minutes: 517,
        notes: "Office Headquarters - Full day",
      },
    ],
    { onConflict: "workspace_id,user_id,date" }
  );
  if (attErr) throw new Error("attendance_records: " + attErr.message);
  counts["attendance_records"] = 2;

  // 13. Leave Requests
  const { error: lrErr } = await supabase.from("leave_requests").upsert(
    [
      {
        id: "00000000-0000-4000-8000-000000000051",
        workspace_id: demoWorkspaceId,
        user_id: ownerUserId,
        leave_type: "Annual Leave",
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        end_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        duration_days: 3,
        reason: "Family vacation and travel.",
        status: "Approved",
        reviewed_by: ownerUserId,
        reviewed_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-4000-8000-000000000052",
        workspace_id: demoWorkspaceId,
        user_id: ownerUserId,
        leave_type: "Personal Leave",
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        duration_days: 1,
        reason: "Personal appointment.",
        status: "Pending",
      },
    ],
    { onConflict: "id" }
  );
  if (lrErr) throw new Error("leave_requests: " + lrErr.message);
  counts["leave_requests"] = 2;

  // 14. Recruitment: Job Openings
  const jobOpeningId = "00000000-0000-4000-8000-000000000061";
  const { error: joErr } = await supabase.from("job_openings").upsert(
    {
      id: jobOpeningId,
      workspace_id: demoWorkspaceId,
      department_id: deptEngineeringId,
      title: "Senior Full-Stack Cloud Engineer",
      slug: "sr-fullstack-engineer",
      description: "Build robust distributed backend services and responsive frontend workflows with Next.js, Supabase, and Tailwind CSS.",
      employment_type: "Full-time",
      location: "Remote",
      status: "Open",
      created_by: ownerUserId,
    },
    { onConflict: "id" }
  );
  if (joErr) throw new Error("job_openings: " + joErr.message);
  counts["job_openings"] = 1;

  // 15. Candidate & Applications
  const candidateId = "00000000-0000-4000-8000-000000000071";
  const { error: candErr } = await supabase.from("candidates").upsert(
    {
      id: candidateId,
      workspace_id: demoWorkspaceId,
      full_name: "Elena Rostova",
      email: "elena.rostova@example.com",
      phone: "+1-415-555-0192",
      bio: "Full-stack engineer with 6 years experience in distributed cloud systems.",
      skills: ["TypeScript", "Next.js", "PostgreSQL", "Supabase", "Docker"],
    },
    { onConflict: "id" }
  );
  if (candErr) throw new Error("candidates: " + candErr.message);
  counts["candidates"] = 1;

  const { error: caErr } = await supabase.from("candidate_applications").upsert(
    {
      id: "00000000-0000-4000-8000-000000000072",
      workspace_id: demoWorkspaceId,
      candidate_id: candidateId,
      job_opening_id: jobOpeningId,
      stage: "Interview",
      cv_file_name: "elena_rostova_resume.pdf",
      cv_storage_key: `${demoWorkspaceId}/resumes/demo-resume.pdf`,
      cover_letter: "Excited to contribute to high-performance distributed systems at Acme Studio.",
    },
    { onConflict: "id" }
  );
  if (caErr) throw new Error("candidate_applications: " + caErr.message);
  counts["candidate_applications"] = 1;

  // 16. Workspace Invitations
  const rawInviteToken = crypto.randomBytes(32).toString("hex");
  const hashedInviteToken = crypto.createHash("sha256").update(rawInviteToken).digest("hex");

  const { error: invErr } = await supabase.from("workspace_invitations").upsert(
    {
      workspace_id: demoWorkspaceId,
      email: "dev.invitee@acme.test",
      role: "member",
      status: "pending",
      token: hashedInviteToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "workspace_id,email" }
  );
  if (invErr) throw new Error("workspace_invitations: " + invErr.message);
  counts["workspace_invitations"] = 1;

  console.log("✅ Seed completed successfully! Summary of populated tables:\n");
  console.table(counts);
}

runSeed().catch((err) => {
  console.error("❌ Seed failed with unexpected error:", err);
  process.exit(1);
});

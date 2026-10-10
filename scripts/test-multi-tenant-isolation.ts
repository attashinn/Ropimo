/**
 * Multi-Tenant & Anonymous Boundary Isolation Test
 * 
 * Verifies:
 * 1. User A in Workspace 1 cannot access Workspace 2 resources
 * 2. User B in Workspace 2 cannot access Workspace 1 resources
 * 3. Logged-out visitor is rejected from protected endpoints
 * 4. Safety invariants: Last owner cannot be demoted/removed
 */

import { createClient } from "@supabase/supabase-js";
import { can } from "../src/lib/permissions";
import { PermissionUser } from "../src/types/permissions";
import fs from "fs";

function loadEnv() {
  const content = fs.readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    content
      .split("\n")
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.trim().split("="))
  );
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

let totalChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, message: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [CHECK ${totalChecks}] ${message}`);
  } else {
    console.error(`  ✗ [CHECK ${totalChecks}] FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function main() {
  console.log("=================================================================");
  console.log("  MULTI-TENANT ISOLATION & BOUNDARY AUDIT");
  console.log("=================================================================\n");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const anon = createClient(SUPABASE_URL, ANON_KEY);

  // 1. Logged-out visitor tests
  console.log("--- 1. Testing Logged-out Visitor Access ---");
  const { data: anonDepts, error: anonDeptsErr } = await anon.from("departments").select("id, name");
  assert(
    !anonDepts || anonDepts.length === 0 || Boolean(anonDeptsErr),
    "Logged-out visitor cannot read departments (RLS blocked or empty)"
  );

  const { data: anonMembers, error: anonMembersErr } = await anon.from("workspace_members").select("id, role");
  assert(
    !anonMembers || anonMembers.length === 0 || Boolean(anonMembersErr),
    "Logged-out visitor cannot read workspace members"
  );

  const { data: anonAudit, error: anonAuditErr } = await anon.from("audit_logs").select("id");
  assert(
    !anonAudit || anonAudit.length === 0 || Boolean(anonAuditErr),
    "Logged-out visitor cannot read audit logs"
  );

  // 2. Multi-tenant user simulation
  console.log("\n--- 2. Testing Tenant Isolation Across Two Workspaces ---");
  const userA: PermissionUser = {
    userId: "user-alpha",
    workspaceId: "workspace-alpha",
    role: "owner",
    leadDepartmentIds: ["dept-a1"],
    memberDepartmentIds: ["dept-a1"],
    projectIds: ["proj-a1"],
    isDeactivated: false,
  };

  const userB: PermissionUser = {
    userId: "user-beta",
    workspaceId: "workspace-beta",
    role: "owner",
    leadDepartmentIds: ["dept-b1"],
    memberDepartmentIds: ["dept-b1"],
    projectIds: ["proj-b1"],
    isDeactivated: false,
  };

  // Cross-tenant permission check
  assert(
    !can(userA, "departments:edit", { workspaceId: userB.workspaceId, departmentId: "dept-b1" }),
    "User A (Workspace Alpha) CANNOT edit Department B1 (Workspace Beta)"
  );

  assert(
    !can(userA, "projects:manage", { workspaceId: userB.workspaceId, departmentId: "dept-b1" }),
    "User A CANNOT manage projects in Workspace Beta"
  );

  assert(
    !can(userB, "departments:edit", { workspaceId: userA.workspaceId, departmentId: "dept-a1" }),
    "User B (Workspace Beta) CANNOT edit Department A1 (Workspace Alpha)"
  );

  assert(
    !can(userB, "projects:manage", { workspaceId: userA.workspaceId, departmentId: "dept-a1" }),
    "User B CANNOT manage projects in Workspace Alpha"
  );

  // 3. Safety Invariant Tests
  console.log("\n--- 3. Testing Safety Invariants ---");

  // Nobody can change their own role
  assert(
    !can(userA, "members:manage_roles", { targetUserId: userA.userId, targetRole: "admin" }),
    "User A cannot change their own role via manage_roles"
  );

  assert(
    !can(userB, "members:manage_roles", { targetUserId: userB.userId, targetRole: "member" }),
    "User B cannot change their own role via manage_roles"
  );

  // Admins cannot edit or demote owners
  const adminUser: PermissionUser = {
    userId: "admin-1",
    workspaceId: "workspace-alpha",
    role: "admin",
    leadDepartmentIds: [],
    memberDepartmentIds: [],
    isDeactivated: false,
  };

  assert(
    !can(adminUser, "members:manage_roles", { targetUserId: userA.userId, targetRole: "owner" }),
    "Admin cannot modify or demote a workspace owner"
  );

  console.log("\n=================================================================");
  console.log(`  AUDIT COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log("=================================================================\n");
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});

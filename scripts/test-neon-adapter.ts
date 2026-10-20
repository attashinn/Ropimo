import { createAdminClient } from "../src/lib/supabase/admin";
import { hashPassword, comparePassword, signSessionToken, verifySessionToken } from "../src/lib/neon/auth";
import { query } from "../src/lib/neon/db";

async function runTests() {
  console.log("=== NEON DB ADAPTER VERIFICATION SUITE ===\n");

  const admin = createAdminClient();

  // Test 1: Password hashing and verification
  console.log("Test 1: Password hashing and comparison...");
  const rawPw = "TestP@ssw0rd123!";
  const hashed = await hashPassword(rawPw);
  const isMatch = await comparePassword(rawPw, hashed);
  const isWrong = await comparePassword("wrong", hashed);
  if (!isMatch || isWrong) throw new Error("Password hashing verification failed");
  console.log("✅ PASS: Password hashing & verification working.\n");

  // Test 2: Session token signing & verification
  console.log("Test 2: Session token signing and verification...");
  const sampleUser = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "adapter-test@zambic.com",
    user_metadata: { full_name: "Adapter Test User" },
  };
  const token = await signSessionToken(sampleUser);
  const decoded = await verifySessionToken(token);
  if (!decoded || decoded.id !== sampleUser.id || decoded.email !== sampleUser.email) {
    throw new Error("Session token verification failed");
  }
  console.log("✅ PASS: Session token signing & verification working.\n");

  // Test 3: Create User and verify automated Profile trigger
  console.log("Test 3: Create User & Profile Trigger in Neon DB...");
  const testEmail = `qa-test-${Date.now()}@zambic.com`;
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: testEmail,
    password: rawPw,
    user_metadata: { full_name: "Trigger Verified User" },
  });

  if (userError || !userData?.user) {
    throw new Error(`User creation failed: ${userError?.message}`);
  }
  const createdUserId = userData.user.id;
  console.log(`User created with ID: ${createdUserId}`);

  // Check if profile was auto-created by PostgreSQL trigger
  const { data: profileData, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", createdUserId)
    .single();

  if (profileError || !profileData) {
    throw new Error(`Profile trigger failed to create profile: ${profileError?.message}`);
  }
  console.log(`Profile found: full_name="${profileData.full_name}", email="${profileData.email}"`);
  console.log("✅ PASS: User creation and auto-profile trigger working.\n");

  // Test 4: Workspace insert and select via QueryBuilder
  console.log("Test 4: Workspace CRUD via QueryBuilder...");
  const wsSlug = `test-ws-${Date.now()}`;
  const { data: wsData, error: wsError } = await admin
    .from("workspaces")
    .insert({
      name: "Test Neon Workspace",
      slug: wsSlug,
      created_by: createdUserId,
    })
    .select()
    .single();

  if (wsError || !wsData) {
    throw new Error(`Workspace insert failed: ${wsError?.message}`);
  }
  const workspaceId = wsData.id;
  console.log(`Workspace inserted with ID: ${workspaceId}`);

  // Test 5: Relational join query (workspace_members -> workspaces)
  console.log("Test 5: Relational Join Query (workspace_members -> workspaces)...");
  const { error: memberInsertError } = await admin
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      user_id: createdUserId,
      role: "owner",
    });

  if (memberInsertError) {
    throw new Error(`Member insert failed: ${memberInsertError.message}`);
  }

  const { data: memberRelData, error: memberRelError } = await admin
    .from("workspace_members")
    .select(`
      role,
      workspaces:workspace_id (
        id,
        name,
        slug
      )
    `)
    .eq("user_id", createdUserId);

  if (memberRelError || !memberRelData || memberRelData.length === 0) {
    throw new Error(`Relational join failed: ${memberRelError?.message}`);
  }
  console.log("Relational query output:", JSON.stringify(memberRelData[0]));
  if (!memberRelData[0].workspaces || memberRelData[0].workspaces.id !== workspaceId) {
    throw new Error("Relational embedded workspaces object mismatch");
  }
  console.log("✅ PASS: Relational subquery join working.\n");

  // Test 6: Workspace update
  console.log("Test 6: Workspace Update...");
  const { data: updatedWs, error: updateError } = await admin
    .from("workspaces")
    .update({ name: "Updated Neon Workspace" })
    .eq("id", workspaceId)
    .select()
    .single();

  if (updateError || updatedWs.name !== "Updated Neon Workspace") {
    throw new Error(`Workspace update failed: ${updateError?.message}`);
  }
  console.log("✅ PASS: Update working.\n");

  // Test 7: Clean up test data
  console.log("Test 7: Cleanup...");
  await admin.from("workspaces").delete().eq("id", workspaceId);
  await admin.auth.admin.deleteUser(createdUserId);
  console.log("✅ PASS: Cleanup completed.\n");

  console.log("=========================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! Neon DB is fully operational.");
  console.log("=========================================");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});

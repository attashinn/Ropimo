import { createAdminClient } from "../src/lib/supabase/admin";
import { recruitmentStore } from "../src/lib/recruitment/store";
import {
  inviteEmployeeAction,
  resendEmployeeInvitationAction,
  revokeEmployeeInvitationAction,
  acceptInvitationAction,
} from "../src/lib/invitations/actions";
import {
  getInvitationByToken,
  getWorkspaceInvitations,
  getEmployeeInvitation,
} from "../src/lib/invitations/queries";
import {
  updateOnboardingChecklistItemAction,
  completeOnboardingAction,
} from "../src/lib/recruitment/actions";
import { getWorkspacePeople } from "../src/lib/people/queries";
import { getWorkspaceDepartments } from "../src/lib/department/queries";

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
  console.log("\n========================================================");
  console.log("  ROPIMO PART 6 / STEP 2: INVITATION + ONBOARDING QA");
  console.log("========================================================\n");

  const adminClient = createAdminClient();

  // 1. Workspace found
  const { data: workspaces, error: wsError } = await adminClient
    .from("workspaces")
    .select("id, name")
    .limit(1);

  assert(!wsError && workspaces && workspaces.length > 0, "Workspace found in database");
  const testWorkspace = workspaces![0];
  const workspaceId = testWorkspace.id;
  console.log(`  → Workspace: ${testWorkspace.name} (${workspaceId})\n`);

  const departments = await getWorkspaceDepartments(workspaceId);
  assert(departments.length > 0, `Workspace departments found (${departments.length} departments)`);
  const targetDept = departments[0];

  const uniqueId = Date.now();
  const testEmail = `qa.invitee.${uniqueId}@example.com`;
  const testName = `Oliver Queen (QA Invitee)`;
  const testJobTitle = "Lead Security Analyst";
  const testEmpId = `EMP-QA-${uniqueId.toString().slice(-4)}`;

  // 1. Employee without account identified
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = authUsers?.users?.find((u) => u.email?.toLowerCase() === testEmail.toLowerCase());
  assert(!existingUser, "Employee without existing auth account identified (Case B)");

  // 2. Invitation created
  const inviteRes = await inviteEmployeeAction({
    workspaceId,
    email: testEmail,
    fullName: testName,
    jobTitle: testJobTitle,
    departmentId: targetDept.id,
    employeeId: testEmpId,
    role: "member",
  });

  assert(inviteRes.success === true, `Invitation created successfully (${inviteRes.error || "ok"})`);
  const { token, expiresAt, inviteUrl } = inviteRes.data!;
  assert(Boolean(token && token.startsWith("inv_")), `Invitation token generated: ${token}`);

  // 3. Invitation stored & retrievable
  const { invitation: storedInv } = await getInvitationByToken(token);
  assert(Boolean(storedInv), "Invitation stored and retrievable by token");
  assert(storedInv?.email.toLowerCase() === testEmail.toLowerCase(), "Stored email matches invitee");
  assert(storedInv?.status?.toLowerCase() === "pending", "Initial invitation status is 'pending'");

  // 4. Invitation has valid expiration (7 days ahead)
  const expirationDate = new Date(expiresAt);
  const now = new Date();
  const diffDays = (expirationDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
  assert(diffDays >= 6.8 && diffDays <= 7.1, `Invitation has 7-day expiration (${diffDays.toFixed(1)} days)`);

  // 5. Invitation URL properly formatted
  assert(Boolean(inviteUrl && inviteUrl.includes(token)), `Invitation link formatted: ${inviteUrl}`);

  // 6. Duplicate Active Invitation Blocked
  const duplicateInviteRes = await inviteEmployeeAction({
    workspaceId,
    email: testEmail,
    fullName: testName,
  });
  assert(duplicateInviteRes.success === false, "Duplicate active invitation blocked");
  assert(
    duplicateInviteRes.error?.includes("already pending") === true,
    `Clear message returned: "${duplicateInviteRes.error}"`
  );

  // 7. Resend Invitation
  const resendRes = await resendEmployeeInvitationAction({
    workspaceId,
    email: testEmail,
  });
  assert(resendRes.success === true, "Invitation resent successfully");
  const newToken = resendRes.data!.token;
  assert(newToken !== token, "New fresh cryptographic token generated upon resend");

  // 8. Cross-Workspace Invitation Protection
  const otherWsId = "00000000-0000-0000-0000-000000000000";
  const crossWsRes = await resendEmployeeInvitationAction({
    workspaceId: otherWsId,
    email: testEmail,
  });
  assert(crossWsRes.success === false, "Cross-workspace invitation management blocked");

  // 9. Revoke & Revoked State Validation
  const revokeTestEmail = `qa.revoke.${uniqueId}@example.com`;
  const revokeInviteRes = await inviteEmployeeAction({
    workspaceId,
    email: revokeTestEmail,
    fullName: "Revoke Tester",
  });
  assert(revokeInviteRes.success === true, "Created invitation for revoke test");
  const revokeToken = revokeInviteRes.data!.token;

  const revokeRes = await revokeEmployeeInvitationAction({
    workspaceId,
    email: revokeTestEmail,
  });
  assert(revokeRes.success === true, "Invitation revoked successfully");

  const acceptRevokedRes = await acceptInvitationAction({
    token: revokeToken,
    fullName: "Revoke Tester",
  });
  assert(acceptRevokedRes.success === false, "Accepting revoked invitation blocked");
  assert(acceptRevokedRes.error?.includes("revoked") === true, `Clear revoked error: "${acceptRevokedRes.error}"`);

  // 10. Expired Invitation Blocked
  const expiredTestEmail = `qa.expired.${uniqueId}@example.com`;
  const expiredToken = `inv_exp_${Date.now()}`;
  const expiredInv = {
    id: `inv-exp-${Date.now()}`,
    workspace_id: workspaceId,
    email: expiredTestEmail,
    role: "member" as const,
    token: expiredToken,
    status: "Pending" as const,
    expires_at: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour in the past
    created_at: new Date().toISOString(),
  };
  (recruitmentStore as any).saveInvitation(expiredInv);

  try {
    await adminClient.from("workspace_invitations").insert({
      workspace_id: workspaceId,
      email: expiredTestEmail,
      role: "member",
      token: expiredToken,
      status: "pending",
      expires_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch {}

  const acceptExpiredRes = await acceptInvitationAction({
    token: expiredToken,
    fullName: "Expired Tester",
  });
  assert(acceptExpiredRes.success === false, "Accepting expired invitation blocked");
  assert(acceptExpiredRes.error?.includes("expired") === true, `Clear expired error: "${acceptExpiredRes.error}"`);

  // 11. Valid Invitation Acceptance Flow
  const acceptRes = await acceptInvitationAction({
    token: newToken,
    fullName: testName,
    password: "Password123!",
    phone: "+1 (555) 789-0123",
  });

  assert(acceptRes.success === true, `Invitation accepted successfully (${acceptRes.error || "ok"})`);
  const acceptedData = acceptRes.data!;
  assert(Boolean(acceptedData.userId), `User account linked with ID: ${acceptedData.userId}`);

  // 12. Invitation Status becomes 'Accepted' and accepted_at stored
  const { invitation: acceptedInv } = await getInvitationByToken(newToken);
  assert(acceptedInv?.status?.toLowerCase() === "accepted", "Invitation status updated to 'accepted'");
  assert(Boolean(acceptedInv?.accepted_at), `accepted_at timestamp stored: ${acceptedInv?.accepted_at}`);

  // 13. Re-accepting already accepted invitation blocked
  const reAcceptRes = await acceptInvitationAction({
    token: newToken,
    fullName: testName,
  });
  assert(reAcceptRes.success === false, "Re-accepting already accepted invitation blocked");
  assert(reAcceptRes.error?.includes("already been accepted") === true, "Clear duplicate acceptance error");

  // 14. Workspace Membership Linked
  const { data: memberRecord } = await adminClient
    .from("workspace_members")
    .select("user_id, role, full_name, job_title")
    .eq("workspace_id", workspaceId)
    .eq("user_id", acceptedData.userId)
    .maybeSingle();

  assert(Boolean(memberRecord), "Workspace member record linked to user");
  assert(memberRecord?.full_name === testName, "Member full name accurately stored");
  assert(memberRecord?.job_title === testJobTitle, "Member job title accurately stored");

  // 15. Department Membership Preserved
  const { data: deptRecord } = await adminClient
    .from("department_members")
    .select("department_id, user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", acceptedData.userId)
    .maybeSingle();

  assert(Boolean(deptRecord && deptRecord.department_id === targetDept.id), `Department member record linked to ${targetDept.name}`);

  // 16. Onboarding Created & Initialized
  const onboarding = recruitmentStore.getOnboardingByUserId(acceptedData.userId, workspaceId);
  assert(Boolean(onboarding), "Employee onboarding record created");
  assert(onboarding?.status === "In Progress", "Onboarding status is 'In Progress'");
  assert(Boolean(onboarding?.checklist && onboarding.checklist.length > 0), `Checklist initialized (${onboarding?.checklist.length} items)`);

  // 17. First checklist item (Accept invitation) marked completed
  const inviteCheckItem = onboarding?.checklist.find((c) => c.title.toLowerCase().includes("invitation"));
  assert(inviteCheckItem?.completed === true, "Checklist item 'Accept Workspace Invitation' marked completed");

  // 18. Interactive Checklist Item Completion & Progress Recalculation
  const uncompletedItem = onboarding?.checklist.find((c) => !c.completed);
  assert(Boolean(uncompletedItem), "Found uncompleted checklist item for progress test");

  const toggleRes = await updateOnboardingChecklistItemAction({
    workspaceId,
    userId: acceptedData.userId,
    itemId: uncompletedItem!.id,
    completed: true,
  });
  assert(toggleRes.success === true, "Checklist item toggled completed");

  const updatedOnboarding = recruitmentStore.getOnboardingByUserId(acceptedData.userId, workspaceId);
  const updatedItem = updatedOnboarding?.checklist.find((c) => c.id === uncompletedItem!.id);
  assert(updatedItem?.completed === true, "Checklist item completion persisted in store");
  assert(
    (updatedOnboarding?.progress_percentage || 0) > (onboarding?.progress_percentage || 0),
    `Progress recalculated upwards (${updatedOnboarding?.progress_percentage}%)`
  );

  // 19. Complete Onboarding Flow
  const completeRes = await completeOnboardingAction({
    workspaceId,
    userId: acceptedData.userId,
  });
  assert(completeRes.success === true, "Complete onboarding action executed successfully");

  const finalizedOnboarding = recruitmentStore.getOnboardingByUserId(acceptedData.userId, workspaceId);
  assert(finalizedOnboarding?.status === "Completed", "Onboarding status transitioned to 'Completed'");
  assert(finalizedOnboarding?.progress_percentage === 100, "Progress percentage is 100%");
  assert(Boolean(finalizedOnboarding?.completed_at), `completed_at timestamp persisted: ${finalizedOnboarding?.completed_at}`);

  // 20. Employee Appears in Team Directory with Real Data
  const teamPeople = await getWorkspacePeople(workspaceId);
  const foundPerson = teamPeople.find((p) => p.user_id === acceptedData.userId);
  assert(Boolean(foundPerson), "Employee appears in People Team Directory");
  assert(foundPerson?.full_name === testName, "Team Directory full name matches");
  assert(foundPerson?.job_title === testJobTitle, "Team Directory job title matches");
  assert(foundPerson?.employee_id === testEmpId, `Team Directory employee ID matches: ${foundPerson?.employee_id}`);
  assert(foundPerson?.employment_status === "Active", "Employee status is Active");

  // 21. Audit Activities Logged
  const activities = (recruitmentStore as any).getWorkspaceActivities(workspaceId);
  const invSentAct = activities.find((a: any) => a.action_type === "invitation_created");
  const invAcceptAct = activities.find((a: any) => a.action_type === "invitation_accepted");
  assert(Boolean(invSentAct), "Activity 'invitation_created' logged");
  assert(Boolean(invAcceptAct), "Activity 'invitation_accepted' logged");

  // 22. Clean up temporary test records
  try {
    await adminClient
      .from("workspace_invitations")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("email", [testEmail, revokeTestEmail, expiredTestEmail]);

    await adminClient
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", acceptedData.userId);

    await adminClient
      .from("department_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", acceptedData.userId);

    const store = (recruitmentStore as any).getStore();
    store.onboardings = (store.onboardings || []).filter(
      (o: any) => o.user_id !== acceptedData.userId
    );
    (recruitmentStore as any).saveStore?.(store);
  } catch (cleanErr) {
    console.error("Cleanup notice:", cleanErr);
  }

  console.log("\n========================================================");
  console.log(`  QA RESULT: ALL ${passedChecks}/${totalChecks} CHECKS PASSED! 🎉`);
  console.log("========================================================\n");
}

runQA().catch((err) => {
  console.error("\n❌ QA Test failed with error:", err);
  process.exit(1);
});

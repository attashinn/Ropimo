import { createAdminClient } from "@/lib/supabase/admin";
import { convertCandidateToEmployeeAction } from "@/lib/recruitment/actions";
import { recruitmentStore } from "@/lib/recruitment/store";
import { getWorkspacePeople } from "@/lib/people/queries";

async function testConvert() {
  const admin = createAdminClient();
  const { data: workspaces } = await admin.from("workspaces").select("id").limit(1);
  const workspaceId = workspaces?.[0]?.id || "";

  console.log("Testing convertCandidateToEmployee on workspace:", workspaceId);

  const candidates = recruitmentStore.getCandidates(workspaceId);
  console.log("Current candidates in store:", candidates.map(c => ({ id: c.id, name: c.full_name, email: c.email })));

  const cand = candidates[0];
  if (!cand) {
    console.log("No candidates found in store.");
    return;
  }

  console.log("Converting candidate:", cand.full_name, cand.email);
  // Direct DB check
  const { data: authUsers } = await admin.auth.admin.listUsers();
  console.log("Total auth users in Supabase:", authUsers?.users?.length);

  // Check workspace members
  const { data: membersBefore } = await admin.from("workspace_members").select("*").eq("workspace_id", workspaceId);
  console.log("Members before:", membersBefore?.length);

  // Perform conversion
  let targetUserId = cand.converted_user_id;
  if (!targetUserId) {
    const matched = authUsers?.users?.find(u => u.email?.toLowerCase() === cand.email.toLowerCase());
    if (matched) {
      targetUserId = matched.id;
    } else {
      const { data: newUser, error } = await admin.auth.admin.createUser({
        email: cand.email.toLowerCase().trim(),
        email_confirm: true,
        user_metadata: {
          full_name: cand.full_name,
          job_title: "Principal Fullstack Engineer",
        }
      });
      console.log("Created auth user result:", newUser?.user?.id, error);
      targetUserId = newUser?.user?.id;
    }
  }

  if (targetUserId) {
    const { data: memberUpsert, error: memberError } = await admin.from("workspace_members").upsert({
      workspace_id: workspaceId,
      user_id: targetUserId,
      role: "member",
      full_name: cand.full_name,
      job_title: "Principal Fullstack Engineer",
      created_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,user_id" }).select();
    console.log("Member upsert result:", memberUpsert, memberError);
  }

  const { data: membersAfter } = await admin.from("workspace_members").select("*").eq("workspace_id", workspaceId);
  console.log("Members after:", membersAfter?.length, membersAfter?.map(m => ({ user_id: m.user_id, role: m.role, name: m.full_name })));
}

testConvert();

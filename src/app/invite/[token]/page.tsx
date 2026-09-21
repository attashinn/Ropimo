import * as React from "react";
import { getInvitationByToken } from "@/lib/invitations/queries";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptInvitationView } from "@/components/app/invitations/accept-invitation-view";

export interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const { invitation, workspaceName, departmentName, inviterName, error } = await getInvitationByToken(token);

  // Check currently authenticated user
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Check if invitation target email already has an account & is already a member
  let hasExistingAccount = false;
  let existingUserName: string | null = null;
  let isAlreadyMember = false;
  const isAccepted = (invitation?.status || "").toLowerCase() === "accepted";

  if (invitation?.email) {
    try {
      const adminClient = createAdminClient();
      const { data: usersList } = await adminClient.auth.admin.listUsers();
      const found = usersList?.users?.find(
        (u) => u.email?.toLowerCase() === invitation.email.toLowerCase()
      );
      if (found) {
        hasExistingAccount = true;
        existingUserName =
          (found.user_metadata?.full_name as string) ||
          (found.email ? found.email.split("@")[0] : null);

        if (invitation.workspace_id) {
          const { data: member } = await adminClient
            .from("workspace_members")
            .select("id, role")
            .eq("workspace_id", invitation.workspace_id)
            .eq("user_id", found.id)
            .maybeSingle();
          if (member) {
            isAlreadyMember = true;
          }
        }
      }
    } catch (e) {
      console.warn("Could not check existing account/membership:", e);
    }
  }

  return (
    <AcceptInvitationView
      invitation={invitation}
      workspaceName={workspaceName}
      departmentName={departmentName}
      inviterName={inviterName}
      error={error}
      currentUser={currentUser ? { id: currentUser.id, email: currentUser.email || "" } : null}
      hasExistingAccount={hasExistingAccount}
      existingUserName={existingUserName}
      isAlreadyMember={isAlreadyMember}
      isAccepted={isAccepted}
    />
  );
}

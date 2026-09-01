import * as React from "react";
import { getInvitationByToken } from "@/lib/invitations/queries";
import { AcceptInvitationView } from "@/components/app/invitations/accept-invitation-view";

export interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const { invitation, workspaceName, departmentName, error } = await getInvitationByToken(token);

  return (
    <AcceptInvitationView
      invitation={invitation}
      workspaceName={workspaceName}
      departmentName={departmentName}
      error={error}
    />
  );
}

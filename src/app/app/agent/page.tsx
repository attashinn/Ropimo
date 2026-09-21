import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { AgentChatView } from "@/components/app/ai/agent-chat-view";

export const metadata = {
  title: "AI Agent Copilot — Ropimo",
  description: "Autonomous workspace intelligence and deliverable operations",
};

export default async function AIAgentPage() {
  const supabase = await createClient();
  const [{ data: authData }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getDefaultWorkspace(),
  ]);

  const user = authData?.user;
  if (!user) {
    redirect("/login");
  }

  if (!workspace) {
    redirect("/onboarding");
  }

  const userName =
    (user.user_metadata?.full_name as string) ||
    (user.email ? user.email.split("@")[0] : "there");

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <AgentChatView
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        userName={userName}
      />
    </div>
  );
}

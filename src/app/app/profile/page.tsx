import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { UserProfileView } from "@/components/app/user-profile-view";

export const metadata = {
  title: "Personal Profile — Zambic",
  description: "Personal account profile, identity, and preferences",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const [{ data: authData }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getDefaultWorkspace(),
  ]);

  const user = authData?.user;

  // Fetch profile record from public.profiles
  let dbProfile = null;
  if (user?.id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    dbProfile = prof;
  }

  const fullName =
    dbProfile?.full_name ||
    (user?.user_metadata?.full_name as string) ||
    (user?.email ? user.email.split("@")[0] : "User");
  const email = user?.email || "";
  const avatarUrl = dbProfile?.avatar_url || user?.user_metadata?.avatar_url || null;

  return (
    <UserProfileView
      user={{
        id: user?.id,
        email,
        fullName,
        avatarUrl,
      }}
      workspaceId={workspace?.id || ""}
      workspaceName={workspace?.name || "Workspace"}
    />
  );
}

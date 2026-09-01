import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { UserProfileView } from "@/components/app/user-profile-view";

export const metadata = {
  title: "Personal Profile — Ropimo",
  description: "Personal account profile, identity, and preferences",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const [{ data: authData }, workspace] = await Promise.all([
    supabase.auth.getUser(),
    getDefaultWorkspace(),
  ]);

  const user = authData?.user;
  const fullName =
    (user?.user_metadata?.full_name as string) ||
    (user?.email ? user.email.split("@")[0] : "Tashin Khan");
  const email = user?.email || "tashinkan360@gmail.com";

  return (
    <UserProfileView
      user={{
        id: user?.id,
        email,
        fullName,
      }}
      workspaceName={workspace?.name || "brnnd"}
    />
  );
}

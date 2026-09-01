import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { getUserContext } from "@/lib/auth/permissions";
import { AppShell } from "@/components/app/app-shell";
import { getNavVisibility } from "@/lib/auth/permissions";
import { UserContext } from "@/types/permissions";

export const metadata = {
  title: "Workspace — Ropimo",
  description: "Ropimo unified team workspace",
  icons: {
    icon: [
      { url: "/logo/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/logo/favicon.png",
    shortcut: "/logo/favicon.png",
  },
};

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if the user belongs to at least one workspace
  const workspace = await getDefaultWorkspace();

  if (!workspace) {
    // Redirect to onboarding if user has no workspace yet
    redirect("/onboarding");
  }

  // Resolve the full UserContext (workspace role + dept memberships) once per layout render.
  // This is cached per React render tree so child pages calling getUserContext() hit no extra DB.
  const userCtx: UserContext | null = await getUserContext(workspace.id);

  const userData = {
    email: user.email,
    fullName: (user.user_metadata?.full_name as string) || null,
  };

  const navVisibility = userCtx ? getNavVisibility(userCtx) : undefined;

  return (
    <AppShell
      user={userData}
      workspace={workspace}
      userContext={userCtx}
      navVisibility={navVisibility}
    >
      {children}
    </AppShell>
  );
}

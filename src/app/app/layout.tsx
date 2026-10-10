import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspace, getUserWorkspaces } from "@/lib/workspace/queries";
import { getUserContext } from "@/lib/auth/permissions";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { AppShell } from "@/components/app/app-shell";
import { getNavVisibility } from "@/lib/auth/permissions";
import { UserContext } from "@/types/permissions";

export const metadata = {
  title: "Workspace | Ropimo",
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
  const headerList = await headers();
  const currentPath = headerList.get("x-pathname") || "";
  if (currentPath.includes("_kit") || currentPath.includes("/kit")) {
    return <div className="app-root min-h-screen bg-canvas text-ink">{children}</div>;
  }

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

  const [userCtx, projects, allWorkspaces] = await Promise.all([
    getUserContext(workspace.id),
    getWorkspaceProjects(workspace.id),
    getUserWorkspaces(),
  ]);

  if (userCtx?.isDeactivated) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-ink">
        <div className="w-full max-w-md bg-surface border border-hairline rounded-[12px] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D93025]" />
            <h1 className="text-[14px] font-semibold text-ink">Access suspended</h1>
          </div>
          <p className="text-[13px] text-secondary leading-relaxed">
            Your access to <strong className="font-medium text-ink">{workspace.name}</strong> has been deactivated by a workspace administrator. You cannot access workspaces or content while deactivated.
          </p>
          <div className="pt-2 flex items-center justify-between border-t border-hairline">
            <a
              href="/login"
              className="inline-flex items-center justify-center h-8 px-4 text-[13px] font-medium text-white bg-[#111] rounded-[8px] hover:bg-[#222] transition-colors"
            >
              Sign out
            </a>
            <span className="text-[12px] text-tertiary">Contact workspace owner for support</span>
          </div>
        </div>
      </div>
    );
  }

  const userData = {
    email: user.email,
    fullName: (user.user_metadata?.full_name as string) || null,
  };

  const navVisibility = userCtx ? getNavVisibility(userCtx) : undefined;

  return (
    <AppShell
      user={userData}
      workspace={workspace}
      allWorkspaces={allWorkspaces}
      userContext={userCtx}
      navVisibility={navVisibility}
      projects={projects}
    >
      {children}
    </AppShell>
  );
}

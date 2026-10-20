import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { getDefaultWorkspace } from "@/lib/workspace/queries";
import { WorkspaceSettingsForm } from "@/components/app/settings/workspace-settings-form";

export const metadata = {
  title: "Workspace Settings — Zambic",
  description: "Configure workspace name, details, and membership preferences.",
};

export default async function SettingsPage() {
  const workspace = await getDefaultWorkspace();

  const workspaceName = workspace?.name || "Workspace";
  const workspaceSlug = workspace?.slug || "workspace";
  const workspaceIcon = workspace?.icon && !/[\u{1F300}-\u{1F9FF}]/u.test(workspace.icon)
    ? workspace.icon
    : workspaceName[0]?.toUpperCase() || "W";
  const workspaceRole = workspace?.role
    ? workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)
    : "Owner";
  const createdDate = workspace?.created_at
    ? new Date(workspace.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure workspace preferences, roles, and administrative security."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-hairline pb-px text-[13px]">
        <Link
          href="/app/settings"
          className="px-3 py-2 text-ink font-semibold border-b-2 border-ink transition-colors"
        >
          General
        </Link>
        <Link
          href="/app/settings/roles-and-permissions"
          className="px-3 py-2 text-ink-2 hover:text-ink font-medium transition-colors border-b-2 border-transparent"
        >
          Roles & permissions
        </Link>
      </div>

      <WorkspaceSettingsForm
        initialWorkspace={{
          id: workspace?.id || "",
          name: workspaceName,
          slug: workspaceSlug,
          logoUrl: workspace?.logo_url || null,
          icon: workspaceIcon,
          role: workspaceRole,
          createdAt: createdDate,
        }}
      />
    </div>
  );
}


import * as React from "react";
import { PageHeader } from "@/components/app/page-header";
import { SettingsIcon } from "@/components/app/nav-icons";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { getDefaultWorkspace } from "@/lib/workspace/queries";

export default async function SettingsPage() {
  const workspace = await getDefaultWorkspace();

  const workspaceName = workspace?.name || "Workspace";
  const workspaceSlug = workspace?.slug || "workspace";
  const workspaceIcon = workspace?.icon && !/[\u{1F300}-\u{1F9FF}]/u.test(workspace.icon) ? workspace.icon : workspaceName[0].toUpperCase();
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
    <div className="space-y-8">
      <PageHeader
        title="Workspace Settings"
        description="Configure workspace name, details, and membership preferences."
        action={
          <PrimaryButton size="sm">
            Save Changes
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="surface" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#D8DDD4]">
            <SettingsIcon size={18} className="text-[#10251F]" />
            <h3 className="text-base font-bold text-[#18221E]">
              General Information
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#65706A] mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                defaultValue={workspaceName}
                className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-sm text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-[#65706A] mb-1">
                Workspace URL / Slug
              </label>
              <div className="flex items-center rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-sm text-[#65706A]">
                <span>ropimo.app/workspace/</span>
                <span className="font-semibold text-[#18221E]">{workspaceSlug}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D8DDD4]">
              <span className="text-[#65706A]">Workspace Monogram:</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#10251F] text-xs font-bold text-[#C7F34A]">
                {workspaceIcon || (workspaceName ? workspaceName[0].toUpperCase() : "W")}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#65706A]">Your Role:</span>
              <span className="font-bold text-[#10251F] bg-[#E7EADF] px-2 py-0.5 rounded-full text-[10px]">
                {workspaceRole}
              </span>
            </div>
          </div>
        </Card>

        <Card variant="warm" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
            <h3 className="text-base font-bold text-[#18221E]">
              Workspace Status
            </h3>
            <span className="rounded-full bg-[#C7F34A] px-2.5 py-0.5 text-[10px] font-bold text-[#10251F]">
              Active
            </span>
          </div>

          <p className="text-xs text-[#65706A] leading-relaxed">
            This workspace was created on <span className="font-semibold text-[#18221E]">{createdDate}</span>. All data and member records are protected via Supabase Row Level Security.
          </p>

          <div className="pt-2">
            <button
              type="button"
              className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
            >
              Manage Members & Roles
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

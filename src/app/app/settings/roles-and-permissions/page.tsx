import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { PERMISSION_MATRIX } from "@/lib/permissions";
import { RolesPermissionsTable } from "@/components/app/settings/roles-permissions-table";

export const metadata = {
  title: "Roles & Permissions — Ropimo",
  description: "Read-only matrix of workspace capabilities across roles, generated from permissions.ts.",
};

export default function RolesAndPermissionsPage() {
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
          className="px-3 py-2 text-ink-2 hover:text-ink font-medium transition-colors border-b-2 border-transparent"
        >
          General
        </Link>
        <Link
          href="/app/settings/roles-and-permissions"
          className="px-3 py-2 text-ink font-semibold border-b-2 border-ink transition-colors"
        >
          Roles & permissions
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-ink">Permission matrix</h2>
            <span className="text-[12px] text-ink-3 tabular-nums font-normal">
              ({PERMISSION_MATRIX.length} capabilities)
            </span>
          </div>
          <p className="text-[12px] text-ink-2 mt-0.5">
            Single source of truth used across UI actions, server mutations, row-level security, and the AI agent.
          </p>
        </div>

        <RolesPermissionsTable matrix={PERMISSION_MATRIX} />
      </div>
    </div>
  );
}

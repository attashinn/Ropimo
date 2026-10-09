import * as React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoIcon } from "@/components/landing/icons";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard | Ropimo",
  description: "Ropimo workspace dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch workspace memberships
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspace_id, workspaces(*)")
    .eq("user_id", user.id)
    .limit(1);

  const membership = memberships?.[0];
  const workspace = membership?.workspaces as unknown as {
    id: string;
    name: string;
    team_size?: string;
    industry?: string;
    created_at?: string;
  } | null;

  if (!workspace) {
    redirect("/onboarding");
  }

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Team member";

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F6F4EC] text-[#111] antialiased font-[family-name:var(--font-plus-jakarta)]">
      {/* Topbar: 48px height, hairline bottom border */}
      <header className="h-12 w-full border-b border-[#E9E6DA] bg-white px-6">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 transition-opacity hover:opacity-80 focus:outline-none"
            >
              <LogoIcon size={22} />
              <span className="text-[14px] font-semibold tracking-[-0.01em] text-[#111]">
                Ropimo
              </span>
            </Link>
            <span className="text-[12px] text-[#9A9A9A]">/</span>
            <span className="text-[13px] font-medium text-[#111]">{workspace.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#6B6B6B] hidden sm:inline">
              {displayName} ({user.email})
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content: Max ONE container level (main sheet 12px radius, surface #FFFFFF) */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6">
        {/* Page header: title 20px/600 (+ item count in tertiary gray), right side ONE primary button */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-[#111] tracking-[-0.01em]">
              Overview
            </h1>
          </div>

          <Link
            href="/app"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#111] px-3.5 text-[13px] font-medium text-white hover:bg-black transition-colors cursor-pointer"
          >
            <span>Open office</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[1.5]" />
          </Link>
        </div>

        {/* Main Sheet (12px radius, hairline border, surface #FFFFFF, no shadow) */}
        <div className="rounded-[12px] border border-[#E9E6DA] bg-white">
          {/* Header row */}
          <div className="flex h-11 items-center justify-between border-b border-[#E9E6DA] px-5">
            <span className="text-[13px] font-semibold text-[#111]">Workspace details</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1F9D55]" />
              Active
            </span>
          </div>

          {/* Table / rows with hairline dividers (40-44px height, hover item #F4F2EA) */}
          <div className="divide-y divide-[#E9E6DA]">
            <div className="flex h-11 items-center justify-between px-5 text-[13px] hover:bg-[#F4F2EA] transition-colors">
              <span className="text-[#6B6B6B]">Workspace</span>
              <span className="font-medium text-[#111]">{workspace.name}</span>
            </div>

            <div className="flex h-11 items-center justify-between px-5 text-[13px] hover:bg-[#F4F2EA] transition-colors">
              <span className="text-[#6B6B6B]">Team size</span>
              <span className="font-medium text-[#111] tabular-nums">
                {workspace.team_size || "1-10"} members
              </span>
            </div>

            <div className="flex h-11 items-center justify-between px-5 text-[13px] hover:bg-[#F4F2EA] transition-colors">
              <span className="text-[#6B6B6B]">Industry</span>
              <span className="font-medium text-[#111]">
                {workspace.industry || "General"}
              </span>
            </div>

            <div className="flex h-11 items-center justify-between px-5 text-[13px] hover:bg-[#F4F2EA] transition-colors">
              <span className="text-[#6B6B6B]">Role</span>
              <span className="font-medium text-[#111] capitalize">
                {membership?.role || "Owner"}
              </span>
            </div>

            <div className="flex h-11 items-center justify-between px-5 text-[13px] hover:bg-[#F4F2EA] transition-colors">
              <span className="text-[#6B6B6B]">Account</span>
              <span className="font-medium text-[#111]">{user.email}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

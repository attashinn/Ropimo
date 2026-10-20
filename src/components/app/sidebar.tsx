"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Calendar,
  Video,
  Briefcase,
  Folder,
  Users,
  Building2,
  Clock3,
  CalendarDays,
  Settings,
  ChevronDown,
  Check,
  Plus,
  LogOut,
  User as UserIcon,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/types/workspace";
import { UserContext } from "@/types/permissions";
import type { NavVisibility } from "@/lib/auth/permissions";
import { Project } from "@/types/project";
import { switchActiveWorkspaceAction } from "@/lib/workspace/actions";
import {
  Avatar,
  Tooltip,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/app/ui";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  user: {
    email?: string | null;
    fullName?: string | null;
  } | null;
  workspace?: Workspace | null;
  allWorkspaces?: Workspace[];
  userContext?: UserContext | null;
  navVisibility?: NavVisibility;
  projects?: Project[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ElementType;
  key?: keyof NavVisibility;
  matchPrefix?: string[];
}

const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  { label: "Overview", href: "/app", icon: LayoutDashboard, matchPrefix: ["/app"] },
  { label: "Tasks", href: "/app/my-tasks", icon: CheckSquare, matchPrefix: ["/app/my-tasks", "/app/tasks"] },
  { label: "Projects", href: "/app/projects", icon: FolderKanban, matchPrefix: ["/app/projects"] },
  { label: "Calendar", href: "/app/calendar", icon: Calendar, matchPrefix: ["/app/calendar"] },
  { label: "Meetings", href: "/app/meetings", icon: Video, matchPrefix: ["/app/meetings"] },
  { label: "Hiring", href: "/app/hiring", icon: Briefcase, matchPrefix: ["/app/hiring", "/app/recruitment"] },
  { label: "Files", href: "/app/files", icon: Folder, matchPrefix: ["/app/files", "/app/documents"] },
];

const SECONDARY_NAV_ITEMS: NavItemConfig[] = [
  { label: "People", href: "/app/people", icon: Users, matchPrefix: ["/app/people"] },
  { label: "Departments", href: "/app/departments", icon: Building2, matchPrefix: ["/app/departments"] },
  { label: "Attendance", href: "/app/attendance", icon: Clock3, matchPrefix: ["/app/attendance"] },
  { label: "Leave", href: "/app/leave", icon: CalendarDays, matchPrefix: ["/app/leave"] },
];

export function Sidebar({
  user,
  workspace,
  allWorkspaces = [],
  userContext,
  navVisibility,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);

  const displayName =
    user?.fullName ||
    (user?.email ? user.email.split("@")[0] : "Workspace User");

  const workspaceName = workspace?.name || "Workspace";
  const planName = "Pro plan";

  const handleSwitchWorkspace = async (targetId: string) => {
    if (targetId === workspace?.id) return;
    setSwitchingId(targetId);
    try {
      await switchActiveWorkspaceAction(targetId);
      router.push("/app");
      router.refresh();
    } catch {
      setSwitchingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isItemActive = (item: NavItemConfig) => {
    if (item.href === "/app") {
      return pathname === "/app";
    }
    if (item.matchPrefix) {
      return item.matchPrefix.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      );
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const renderNavItem = (item: NavItemConfig) => {
    const active = isItemActive(item);
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        prefetch={true}
        onClick={onCloseMobile}
        className={`group relative flex h-[30px] items-center rounded-lg text-[13px] transition-colors duration-120 ease-out select-none cursor-pointer ${
          isCollapsed ? "w-[30px] justify-center mx-auto" : "w-full px-2 gap-2.5"
        } ${
          active
            ? "bg-[#ECE9DD] text-ink font-medium"
            : "text-ink-2 hover:bg-[#F4F2EA] hover:text-ink font-normal"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 stroke-[1.5] transition-colors duration-120 ${
            active ? "text-ink" : "text-ink-2 group-hover:text-ink"
          }`}
          aria-hidden="true"
        />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href} content={item.label} side="right">
          {linkContent}
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

  return (
    <aside
      className={`flex h-full flex-col justify-between py-2 px-2 select-none bg-transparent ${
        isCollapsed ? "w-[56px] items-center" : "w-[232px]"
      }`}
    >
      {/* Top: Compact Workspace Switcher */}
      <div className="shrink-0 space-y-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`group flex items-center rounded-lg hover:bg-hover transition-colors duration-120 cursor-pointer outline-none focus:ring-1 focus:ring-ink ${
                isCollapsed
                  ? "h-8 w-8 justify-center mx-auto"
                  : "h-8 w-full px-2 gap-2"
              }`}
              title={workspaceName}
            >
              <Avatar
                name={workspaceName}
                size={24}
                className="shrink-0 rounded-md ring-1 ring-black/5"
              />
              {!isCollapsed && (
                <>
                  <span className="truncate text-[13px] font-medium text-ink flex-1 text-left">
                    {workspaceName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 stroke-[1.5] text-ink-3 group-hover:text-ink transition-colors" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align={isCollapsed ? "start" : "start"}
            side="bottom"
            sideOffset={8}
            className="w-[264px] bg-white p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.04)] border border-hairline rounded-xl"
          >
            {/* Header: Section label & Plan badge */}
            <div className="flex items-center justify-between px-2.5 py-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                Workspaces
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent-green/25 text-[#10251F] border border-[#10251F]/10">
                <span className="h-1.5 w-1.5 rounded-full bg-status-done animate-pulse" />
                {planName}
              </span>
            </div>

            {/* Workspace list */}
            <div className="space-y-0.5">
              {allWorkspaces.length > 0 ? (
                allWorkspaces.map((ws) => {
                  const isCurrent = ws.id === workspace?.id;
                  const isSwitching = switchingId === ws.id;

                  return (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                      disabled={isSwitching}
                      className={cn(
                        "group flex items-center justify-between w-full px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-120",
                        isCurrent
                          ? "bg-hover/80 text-ink font-medium"
                          : "text-ink hover:bg-hover"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <Avatar
                            name={ws.name}
                            size={24}
                            className="rounded-md ring-1 ring-black/5"
                          />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 text-left">
                          <span className="truncate text-[13px] font-medium text-ink leading-snug">
                            {ws.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] text-ink-3 font-normal leading-none mt-0.5">
                              Active workspace
                            </span>
                          )}
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="flex items-center justify-center h-4 w-4 rounded-full bg-ink text-white shrink-0 ml-2 shadow-xs">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      ) : isSwitching ? (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-ink-3 border-t-ink animate-spin shrink-0 ml-2" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <DropdownMenuItem disabled className="px-2.5 py-2 text-ink-3 text-[13px]">
                  <span className="truncate">{workspaceName}</span>
                </DropdownMenuItem>
              )}
            </div>

            <DropdownMenuSeparator className="my-1.5 bg-hairline/80" />

            {/* Quick Actions */}
            <div className="space-y-0.5">
              <DropdownMenuItem
                onClick={() => router.push("/onboarding")}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-ink hover:bg-hover transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-ink/25 text-ink-2 group-hover:border-ink/50 group-hover:text-ink transition-colors shrink-0">
                  <Plus className="h-3.5 w-3.5 stroke-[2]" />
                </div>
                <span className="text-[13px] font-medium text-ink flex-1 text-left">
                  Create workspace
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/app/settings")}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-ink hover:bg-hover transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-black/[0.04] text-ink-2 group-hover:bg-black/[0.08] group-hover:text-ink transition-colors shrink-0">
                  <Settings className="h-3.5 w-3.5 stroke-[1.75]" />
                </div>
                <span className="text-[13px] font-medium text-ink flex-1 text-left">
                  Workspace settings
                </span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Primary Nav List */}
        <nav className="space-y-0.5">
          {PRIMARY_NAV_ITEMS.map(renderNavItem)}

          {/* Thin divider */}
          <div className="py-1">
            <div className="h-px bg-hairline mx-1" />
          </div>

          {SECONDARY_NAV_ITEMS.map(renderNavItem)}
        </nav>
      </div>

      {/* Bottom: Settings + User Row + Collapse Toggle */}
      <div className="shrink-0 space-y-1 pt-2 border-t border-hairline/60">
        {/* Settings item at bottom */}
        {renderNavItem({
          label: "Settings",
          href: "/app/settings",
          icon: Settings,
          matchPrefix: ["/app/settings"],
        })}

        {/* User profile row & menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`group flex items-center rounded-lg hover:bg-hover transition-colors duration-120 cursor-pointer outline-none focus:ring-1 focus:ring-ink ${
                isCollapsed
                  ? "h-8 w-8 justify-center mx-auto"
                  : "h-8 w-full px-2 gap-2"
              }`}
              title={displayName}
            >
              <Avatar
                name={displayName}
                size={24}
                accent="blue"
                className="shrink-0"
              />
              {!isCollapsed && (
                <>
                  <span className="truncate text-[13px] font-medium text-ink flex-1 text-left">
                    {displayName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 stroke-[1.5] text-ink-3 group-hover:text-ink transition-colors" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align={isCollapsed ? "start" : "start"}
            side="top"
            sideOffset={8}
            className="w-[240px] bg-white p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.04)] border border-hairline rounded-xl"
          >
            {/* User Header */}
            <div className="px-2.5 py-2 border-b border-hairline/60 mb-1">
              <div className="text-[13px] font-medium text-ink truncate leading-tight">
                {displayName}
              </div>
              <div className="text-[11px] text-ink-3 truncate mt-0.5">
                {user?.email || "Signed in"}
              </div>
            </div>

            <div className="space-y-0.5">
              <DropdownMenuItem
                onClick={() => router.push("/app/profile")}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-ink hover:bg-hover transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-black/[0.04] text-ink-2 group-hover:bg-black/[0.08] group-hover:text-ink transition-colors shrink-0">
                  <UserIcon className="h-3.5 w-3.5 stroke-[1.75]" />
                </div>
                <span className="text-[13px] font-medium text-ink flex-1 text-left">
                  Profile
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/app/settings")}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-ink hover:bg-hover transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-black/[0.04] text-ink-2 group-hover:bg-black/[0.08] group-hover:text-ink transition-colors shrink-0">
                  <Settings className="h-3.5 w-3.5 stroke-[1.75]" />
                </div>
                <span className="text-[13px] font-medium text-ink flex-1 text-left">
                  Settings
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-hairline/80" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-status-overdue hover:bg-status-overdue/10 transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-status-overdue/10 text-status-overdue shrink-0">
                  <LogOut className="h-3.5 w-3.5 stroke-[1.75]" />
                </div>
                <span className="text-[13px] font-medium text-status-overdue flex-1 text-left">
                  Sign out
                </span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desktop Sidebar Collapse Toggle Button */}
        {onToggleCollapse && (
          <div className="pt-1 hidden lg:block">
            <Tooltip
              content={isCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
              shortcut="⌘B"
              side={isCollapsed ? "right" : "top"}
            >
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`flex items-center rounded-lg text-[12px] text-ink-3 hover:text-ink hover:bg-hover transition-colors duration-120 cursor-pointer ${
                  isCollapsed
                    ? "h-7 w-7 justify-center mx-auto"
                    : "h-7 w-full px-2 gap-2"
                }`}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeft className="h-3.5 w-3.5 stroke-[1.5]" />
                ) : (
                  <>
                    <PanelLeftClose className="h-3.5 w-3.5 stroke-[1.5]" />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </aside>
  );
}

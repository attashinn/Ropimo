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
      window.location.href = "/app";
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
                accent="green"
                className="shrink-0"
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
            align={isCollapsed ? "center" : "start"}
            side="bottom"
            sideOffset={6}
            className="w-56 bg-white"
          >
            <DropdownMenuLabel className="text-[11px] text-ink-3">
              {planName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {allWorkspaces.length > 0 ? (
              allWorkspaces.map((ws) => {
                const isCurrent = ws.id === workspace?.id;
                return (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Avatar name={ws.name} size={20} accent="green" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {isCurrent && (
                      <Check className="h-3.5 w-3.5 stroke-[1.5] text-ink shrink-0 ml-2" />
                    )}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <DropdownMenuItem disabled>
                <span className="truncate">{workspaceName}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/onboarding")}
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5 stroke-[1.5] text-ink-2" />
              <span>Create workspace</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/app/settings")}
              className="gap-2"
            >
              <Settings className="h-3.5 w-3.5 stroke-[1.5] text-ink-2" />
              <span>Workspace settings</span>
            </DropdownMenuItem>
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
            align={isCollapsed ? "center" : "start"}
            side="top"
            sideOffset={6}
            className="w-52 bg-white"
          >
            <DropdownMenuItem
              onClick={() => router.push("/app/profile")}
              className="gap-2"
            >
              <UserIcon className="h-3.5 w-3.5 stroke-[1.5] text-ink-2" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/app/settings")}
              className="gap-2"
            >
              <Settings className="h-3.5 w-3.5 stroke-[1.5] text-ink-2" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="gap-2 text-status-overdue focus:text-status-overdue"
            >
              <LogOut className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>Sign out</span>
            </DropdownMenuItem>
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

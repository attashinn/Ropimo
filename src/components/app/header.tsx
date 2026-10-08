"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, Menu } from "lucide-react";
import { Workspace } from "@/types/workspace";
import { RopimoCommandMenu } from "@/components/ropimo/ropimo-command-menu";
import { NotificationCenter } from "./notification-center";
import {
  Avatar,
  IconButton,
  Kbd,
  Tooltip,
} from "@/components/app/ui";
import { AppNotification } from "@/types/notification";

export interface HeaderProps {
  user: {
    email?: string | null;
    fullName?: string | null;
  } | null;
  workspace?: Workspace | null;
  onOpenMobileMenu?: () => void;
}

const PAGE_LABELS: Record<string, string> = {
  "my-tasks": "Tasks",
  tasks: "Tasks",
  projects: "Projects",
  calendar: "Calendar",
  meetings: "Meetings",
  hiring: "Hiring",
  recruitment: "Hiring",
  files: "Files",
  documents: "Files",
  people: "People",
  departments: "Departments",
  attendance: "Attendance",
  leave: "Leave",
  settings: "Settings",
  profile: "Profile",
  agent: "Assistant",
};

export function Header({ user, workspace, onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandMenuOpen, setCommandMenuOpen] = React.useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = React.useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = React.useState(true);

  const workspaceName = workspace?.name || "Workspace";
  const displayName =
    user?.fullName ||
    (user?.email ? user.email.split("@")[0] : "User");

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute breadcrumbs: 13px, no bold
  const segments = pathname.split("/").filter(Boolean);
  const currentPageKey = segments[1] || "";
  const pageLabel = currentPageKey
    ? PAGE_LABELS[currentPageKey] ||
      currentPageKey.charAt(0).toUpperCase() + currentPageKey.slice(1)
    : "Overview";

  return (
    <>
      <header className="h-12 border-b border-hairline px-4 flex items-center justify-between shrink-0 bg-surface select-none">
        {/* Left: Mobile hamburger + Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          {onOpenMobileMenu && (
            <div className="lg:hidden">
              <IconButton
                aria-label="Open navigation drawer"
                onClick={onOpenMobileMenu}
              >
                <Menu className="h-4 w-4 stroke-[1.5]" />
              </IconButton>
            </div>
          )}

          {/* Breadcrumb: workspace / page, 13px, no bold */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center text-[13px] font-normal leading-none truncate"
          >
            <Link
              href="/app"
              className="text-ink-2 hover:text-ink transition-colors truncate"
            >
              {workspaceName}
            </Link>
            <span className="text-ink-3 mx-1.5 font-normal select-none">/</span>
            <span className="text-ink font-normal truncate">{pageLabel}</span>
          </nav>
        </div>

        {/* Right: Search + Bell + Avatar (No AI Copilot button) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Compact Search button */}
          <Tooltip content="Search workspace" shortcut="⌘K">
            <button
              type="button"
              onClick={() => setCommandMenuOpen(true)}
              className="h-8 px-2.5 rounded-lg border border-hairline bg-surface hover:bg-hover text-ink-2 hover:text-ink transition-colors duration-120 inline-flex items-center gap-2 cursor-pointer select-none outline-none focus:ring-1 focus:ring-ink"
            >
              <Search className="h-3.5 w-3.5 stroke-[1.5] text-ink-2" />
              <span className="text-[13px] font-normal hidden sm:inline">Search</span>
              <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
            </button>
          </Tooltip>

          {/* Bell icon button (small 6px dot ONLY if unread) */}
          <Tooltip content="Notifications">
            <div className="relative inline-flex">
              <IconButton
                aria-label="Notifications"
                onClick={() => setNotifCenterOpen((prev) => !prev)}
              >
                <Bell className="h-4 w-4 stroke-[1.5]" />
              </IconButton>
              {hasUnreadNotifs && (
                <span
                  className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-status-overdue ring-1 ring-surface pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </div>
          </Tooltip>

          {/* Avatar (24px) */}
          <Tooltip content={displayName}>
            <button
              type="button"
              onClick={() => router.push("/app/profile")}
              className="h-7 w-7 rounded-full inline-flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer outline-none focus:ring-1 focus:ring-ink ml-0.5"
            >
              <Avatar name={displayName} size={24} accent="blue" />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Command Menu */}
      <RopimoCommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        workspaceId={workspace?.id}
        workspaceName={workspaceName}
        userName={displayName}
      />

      {/* Notifications Drawer */}
      <NotificationCenter
        workspaceId={workspace?.id || ""}
        isOpen={notifCenterOpen}
        onClose={() => {
          setNotifCenterOpen(false);
          setHasUnreadNotifs(false);
        }}
      />
    </>
  );
}

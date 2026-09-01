"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock3,
  CalendarDays,
  FolderKanban,
  CheckSquare,
  Calendar,
  Folder,
  FileText,
  Video,
  Settings,
  ChevronDown,
  LogOut,
  Briefcase,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/types/workspace";
import { UserContext } from "@/types/permissions";
import type { NavVisibility } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  user: {
    email?: string | null;
    fullName?: string | null;
  } | null;
  workspace?: Workspace | null;
  userContext?: UserContext | null;
  navVisibility?: NavVisibility;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  key: keyof NavVisibility;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/app", icon: LayoutDashboard, key: "overview" },
  { label: "Departments", href: "/app/departments", icon: Building2, key: "departments" },
  { label: "People", href: "/app/people", icon: Users, key: "people" },
  { label: "Attendance", href: "/app/attendance", icon: Clock3, key: "attendance" },
  { label: "Leave", href: "/app/leave", icon: CalendarDays, key: "leave" },
  { label: "Projects", href: "/app/projects", icon: FolderKanban, key: "projects" },
  { label: "My Tasks", href: "/app/my-tasks", icon: CheckSquare, key: "myTasks" },
  { label: "Calendar", href: "/app/calendar", icon: Calendar, key: "calendar" },
  { label: "Files", href: "/app/files", icon: Folder, key: "files" },
  { label: "Documents", href: "/app/documents", icon: FileText, key: "documents" },
  { label: "Meetings", href: "/app/meetings", icon: Video, key: "meetings" },
  { label: "Recruitment", href: "/app/recruitment", icon: Briefcase, key: "recruitment" },
];

export function Sidebar({ user, workspace, userContext, navVisibility, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const displayName = user?.fullName || (user?.email ? user.email.split("@")[0] : "Tashin Khan");
  const displayEmail = user?.email || "tashinkan360@gmail.com";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const workspaceName = workspace?.name || "brnnd";
  const workspaceMonogram =
    workspace?.icon ||
    (workspace?.name ? workspace.name[0].toUpperCase() : "B");

  // Role badge for the user card
  const roleBadge = userContext?.workspaceRole
    ? userContext.workspaceRole.charAt(0).toUpperCase() + userContext.workspaceRole.slice(1)
    : null;

  // Filter nav items by visibility — if no navVisibility provided, show all items
  const visibleNavItems = navVisibility
    ? ALL_NAV_ITEMS.filter((item) => navVisibility[item.key] !== false)
    : ALL_NAV_ITEMS;

  // Show settings link only for owners/admins
  const showSettings = !navVisibility || navVisibility.settings !== false;

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-workspace-dropdown]")) {
        setWorkspaceMenuOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <aside className="flex h-full w-full flex-col justify-between bg-white p-4 text-[#18221E] border-r border-[#D8DDD4] select-none">
      {/* Top Area */}
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            href="/app"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10251F]"
          >
            <Image
              src="/logo/ropimo-logo.png"
              alt="Ropimo"
              width={110}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Real Workspace Switcher Display with functional dropdown */}
        <div className="relative" data-workspace-dropdown>
          <div
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="rounded-[12px] border border-[#D8DDD4] bg-white p-2.5 shadow-2xs cursor-pointer hover:border-[#B8C0B2] hover:bg-[#FAF9F5] transition-colors duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#10251F] text-xs font-bold text-[#C7F34A]">
                  {workspaceMonogram}
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-bold text-[#18221E]">
                    {workspaceName}
                  </p>
                  <p className="text-[10px] text-[#65706A]">Workspace</p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-[#65706A] transition-transform",
                  workspaceMenuOpen && "rotate-180"
                )}
              />
            </div>
          </div>

          {/* Workspace dropdown menu */}
          {workspaceMenuOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-[12px] border border-[#D8DDD4] bg-white p-1.5 shadow-elevated animate-in zoom-in-95 duration-150 space-y-1">
              <div className="px-2.5 py-1.5 border-b border-[#E7EADF]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                  Current Workspace
                </p>
                <p className="text-xs font-bold text-[#18221E] truncate">{workspaceName}</p>
              </div>

              {showSettings && (
                <div className="px-1 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      router.push("/app/settings");
                    }}
                    className="w-full flex items-center justify-between rounded-[8px] px-2 py-1.5 text-xs text-[#18221E] hover:bg-[#FAF9F5] transition-colors text-left"
                  >
                    <span>Workspace settings</span>
                    <Settings className="w-3.5 h-3.5 text-[#65706A]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation items — filtered by role */}
        <nav className="space-y-1 pt-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center gap-3 rounded-[10px] px-3 py-2 text-xs font-semibold transition-all duration-150 relative",
                  isActive
                    ? "bg-[#10251F] text-[#C7F34A] shadow-xs"
                    : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive
                      ? "text-[#C7F34A]"
                      : "text-[#65706A] group-hover:text-[#18221E]"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Settings & User Profile */}
      <div className="space-y-3 pt-3 border-t border-[#E7EADF]">
        {showSettings && (
          <Link
            href="/app/settings"
            onClick={onCloseMobile}
            className={cn(
              "group flex items-center gap-3 rounded-[10px] px-3 py-2 text-xs font-semibold transition-all duration-150",
              pathname === "/app/settings"
                ? "bg-[#10251F] text-[#C7F34A]"
                : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
            )}
          >
            <Settings
              size={18}
              className={cn(
                "shrink-0 transition-colors",
                pathname === "/app/settings"
                  ? "text-[#C7F34A]"
                  : "text-[#65706A] group-hover:text-[#18221E]"
              )}
            />
            <span>Settings</span>
          </Link>
        )}

        {/* User Card */}
        <div className="rounded-[12px] border border-[#D8DDD4] bg-white p-2.5 shadow-2xs hover:border-[#B8C0B2] transition-colors duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-xs font-bold text-[#F4F3EE]">
                {userInitials}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-bold text-[#18221E]">
                  {displayName}
                </p>
                <p className="truncate text-[10px] text-[#65706A]">
                  {roleBadge ? roleBadge : displayEmail}
                </p>
              </div>
            </div>

            {/* Logout Action */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Log out"
              title="Log out"
              className="rounded-[6px] p-1.5 text-[#65706A] hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

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
  ChevronRight,
  LogOut,
  Briefcase,
  HelpCircle,
  MessageSquare,
  BookOpen,
  Plus,
  Check,
  ListTodo,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/types/workspace";
import { UserContext } from "@/types/permissions";
import type { NavVisibility } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { Project } from "@/types/project";
import { switchActiveWorkspaceAction } from "@/lib/workspace/actions";

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
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  key: keyof NavVisibility;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "General",
    items: [
      { label: "Overview", href: "/app", icon: LayoutDashboard, key: "overview" },
      { label: "Departments", href: "/app/departments", icon: Building2, key: "departments" },
      { label: "People", href: "/app/people", icon: Users, key: "people" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "AI Copilot", href: "/app/agent", icon: Sparkles, key: "agent", badge: "AI" },
      { label: "Attendance", href: "/app/attendance", icon: Clock3, key: "attendance" },
      { label: "Leave", href: "/app/leave", icon: CalendarDays, key: "leave" },
      { label: "Projects", href: "/app/projects", icon: FolderKanban, key: "projects" },
      { label: "My Tasks", href: "/app/my-tasks", icon: CheckSquare, key: "myTasks" },
    ],
  },
  {
    title: "Collaboration",
    items: [
      { label: "Calendar", href: "/app/calendar", icon: Calendar, key: "calendar" },
      { label: "Files", href: "/app/files", icon: Folder, key: "files" },
      { label: "Documents", href: "/app/documents", icon: FileText, key: "documents" },
      { label: "Meetings", href: "/app/meetings", icon: Video, key: "meetings" },
      { label: "Recruitment", href: "/app/recruitment", icon: Briefcase, key: "recruitment" },
    ],
  },
];

export function Sidebar({
  user,
  workspace,
  allWorkspaces = [],
  userContext,
  navVisibility,
  projects = [],
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = React.useState(false);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = React.useState<string | null>(null);

  const handleSwitchWorkspace = async (targetId: string) => {
    if (targetId === workspace?.id) {
      setWorkspaceMenuOpen(false);
      return;
    }
    setSwitchingWorkspaceId(targetId);
    try {
      await switchActiveWorkspaceAction(targetId);
      window.location.href = "/app";
    } catch {
      setSwitchingWorkspaceId(null);
    }
  };

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
    : "Owner";

  // Filter sections by visibility
  const filteredSections = React.useMemo(() => {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => !navVisibility || navVisibility[item.key] !== false),
    })).filter((section) => section.items.length > 0);
  }, [navVisibility]);

  // Show settings link only for owners/admins
  const showSettings = !navVisibility || navVisibility.settings !== false;
  const isSettingsActive = pathname === "/app/settings";

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
    <aside className="flex h-full w-full flex-col justify-between bg-white p-3 text-[#18221E] border-r border-[#D8DDD4] select-none">
      {/* Top Header & Workspace Switcher */}
      <div className="shrink-0 space-y-3 pb-2">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            href="/app"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10251F]"
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

          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E7EADF] text-[#10251F] border border-[#D8DDD4]">
            PRO
          </span>
        </div>

        {/* Workspace Switcher Card */}
        <div className="relative" data-workspace-dropdown>
          <div
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 cursor-pointer hover:border-[#10251F]/40 hover:bg-white transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[#10251F] text-xs font-bold text-white">
                  {workspaceMonogram}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-[#18221E]">
                      {workspaceName}
                    </p>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#E7EADF] text-[#10251F]">
                      Active
                    </span>
                  </div>
                  <p className="text-[10px] text-[#65706A] mt-0.5">
                    Workspace
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-[#65706A] group-hover:text-[#18221E] transition-transform duration-200",
                  workspaceMenuOpen && "rotate-180"
                )}
              />
            </div>
          </div>

          {/* Workspace dropdown menu */}
          <AnimatePresence>
            {workspaceMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-[12px] border border-[#D8DDD4] bg-white p-2 shadow-lg space-y-2.5"
              >
                {/* Current Workspace Header Card */}
                <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4]">
                  <div className="flex items-center gap-2 truncate">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#10251F] text-xs font-bold text-white">
                      {workspaceMonogram}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-[#18221E] truncate">{workspaceName}</p>
                      <p className="text-[10px] text-[#65706A]">Pro · 1 member</p>
                    </div>
                  </div>

                  {showSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceMenuOpen(false);
                        router.push("/app/settings");
                      }}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-[#D8DDD4] bg-white px-2 py-1 text-[10px] font-medium text-[#18221E] hover:bg-[#FAF9F5] transition-colors shrink-0"
                    >
                      <Settings size={12} />
                      <span>Settings</span>
                    </button>
                  )}
                </div>

                {/* All Workspaces Section */}
                <div className="space-y-1">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A958F]">
                    All workspaces ({allWorkspaces.length || 1})
                  </p>
                  
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {(allWorkspaces.length > 0 ? allWorkspaces : workspace ? [workspace] : []).map((ws) => {
                      const isActive = ws.id === workspace?.id;
                      const monogram = ws.name ? ws.name.slice(0, 1).toUpperCase() : "W";
                      const isSwitching = switchingWorkspaceId === ws.id;

                      return (
                        <button
                          key={ws.id}
                          type="button"
                          disabled={isSwitching}
                          onClick={() => handleSwitchWorkspace(ws.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-1.5 rounded-[6px] text-xs font-medium transition-colors text-left cursor-pointer",
                            isActive
                              ? "bg-[#FAF9F5] text-[#18221E] font-semibold"
                              : "hover:bg-[#FAF9F5] text-[#65706A] hover:text-[#18221E]"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <div className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold shrink-0",
                              isActive ? "bg-[#10251F] text-[#C7F34A]" : "bg-[#E2E6DE] text-[#18221E]"
                            )}>
                              {monogram}
                            </div>
                            <span className="truncate">{ws.name}</span>
                          </div>
                          {isSwitching ? (
                            <div className="h-3 w-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin shrink-0" />
                          ) : isActive ? (
                            <Check size={14} className="text-[#246244] shrink-0" />
                          ) : ws.role ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ECEBE4] text-[#65706A] shrink-0 capitalize">
                              {ws.role}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      router.push("/onboarding");
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-xs font-medium text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors text-left cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add workspace</span>
                  </button>
                </div>

                {/* Support & Docs Section */}
                <div className="space-y-0.5 pt-1 border-t border-[#E7EADF]">
                  <a
                    href="mailto:support@ropimo.com"
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-xs text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                  >
                    <HelpCircle size={14} />
                    <span>Get help</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      router.push("/app/meetings");
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-xs text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors text-left cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Live chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      router.push("/app/documents");
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-xs text-[#65706A] hover:text-[#18221E] hover:bg-[#FAF9F5] transition-colors text-left cursor-pointer"
                  >
                    <BookOpen size={14} />
                    <span>Developer docs</span>
                  </button>
                </div>

                {/* Session Logout Action */}
                <div className="pt-1 border-t border-[#E7EADF]">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Log out</span>
                  </button>
                </div>

                {/* Legal & Policy Footer */}
                <div className="flex items-center justify-between px-1 pt-1 border-t border-[#E7EADF] text-[10px] text-[#8A958F]">
                  <span className="hover:underline cursor-pointer">Terms</span>
                  <span>·</span>
                  <span className="hover:underline cursor-pointer">Privacy</span>
                  <span>·</span>
                  <span className="hover:underline cursor-pointer">Security</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Middle Scrollable Navigation List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 py-1 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {filteredSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="px-2.5 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A958F]">
                {section.title}
              </span>
            </div>

            <nav className="space-y-0.5">
              {section.items.map((item) => {
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
                      "flex items-center justify-between rounded-[8px] px-3 py-2 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-[#10251F] text-white"
                        : "text-[#55635D] hover:text-[#18221E] hover:bg-[#FAF9F5]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Icon
                        size={16}
                        className={cn(
                          "shrink-0",
                          isActive ? "text-white" : "text-[#738079]"
                        )}
                      />
                      <span className="truncate font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide",
                          isActive
                            ? "bg-[#C7F34A] text-[#10251F]"
                            : "bg-[#10251F]/10 text-[#10251F]"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Area: Settings & User Profile Card */}
      <div className="shrink-0 space-y-2 pt-2 border-t border-[#E7EADF]">
        {showSettings && (
          <Link
            href="/app/settings"
            onClick={onCloseMobile}
            className={cn(
              "flex items-center justify-between rounded-[8px] px-3 py-2 text-xs font-medium transition-colors",
              isSettingsActive
                ? "bg-[#10251F] text-white"
                : "text-[#55635D] hover:text-[#18221E] hover:bg-[#FAF9F5]"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Settings
                size={16}
                className={cn(
                  "shrink-0",
                  isSettingsActive ? "text-white" : "text-[#738079]"
                )}
              />
              <span>Settings</span>
            </div>

            <kbd className="text-[9px] font-mono text-[#8A958F] px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#D8DDD4]">
              ⌘,
            </kbd>
          </Link>
        )}

        {/* User Profile Card */}
        <div className="rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-xs font-semibold text-white">
                {userInitials}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-semibold text-[#18221E]">
                  {displayName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#E7EADF] text-[#10251F]">
                    {roleBadge}
                  </span>
                  <span className="truncate text-[10px] text-[#65706A] max-w-[85px]">
                    {displayEmail}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Log out"
              title="Log out"
              className="rounded-[6px] p-1.5 text-[#65706A] hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

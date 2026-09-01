"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  Check,
  CheckCheck,
  CheckSquare,
  CalendarDays,
  FolderKanban,
  UserCheck,
  Video,
  X,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Workspace } from "@/types/workspace";
import { createClient } from "@/lib/supabase/client";
import { AppBreadcrumbs, BreadcrumbItem } from "./app-breadcrumbs";
import { RopimoCommandMenu } from "@/components/ropimo/ropimo-command-menu";
import { ProfileModal } from "./profile-modal";
import { NotificationCenter } from "./notification-center";
import { AppNotification } from "@/types/notification";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  user: {
    email?: string | null;
    fullName?: string | null;
  } | null;
  workspace?: Workspace | null;
  onOpenMobileMenu: () => void;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    workspace_id: "",
    user_id: "",
    title: "Jesmin Sikder requested Annual Leave",
    subtitle: "Aug 25 - Aug 28 (4 days) · Awaiting approval",
    type: "leave_requested",
    read: false,
    action_url: "/app/leave",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    time_ago: "2h ago",
    category: "today",
  },
  {
    id: "notif-2",
    workspace_id: "",
    user_id: "",
    title: "Task assigned: Homepage redesign",
    subtitle: "Project: Ropimo Website · Priority: High",
    type: "task_assigned",
    read: false,
    action_url: "/app/my-tasks",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    time_ago: "4h ago",
    category: "today",
  },
  {
    id: "notif-3",
    workspace_id: "",
    user_id: "",
    title: "Added to project: Marketing Website",
    subtitle: "You were added as a team member",
    type: "project_member_added",
    read: true,
    action_url: "/app/projects",
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    time_ago: "Yesterday",
    category: "yesterday",
  },
];

const SECTION_LABELS: Record<string, string> = {
  departments: "Departments",
  people: "People",
  attendance: "Attendance",
  leave: "Leave",
  projects: "Projects",
  "my-tasks": "My Tasks",
  tasks: "Tasks",
  calendar: "Calendar",
  files: "Files",
  documents: "Documents",
  meetings: "Meetings",
  settings: "Settings",
  profile: "My Profile",
  candidates: "Candidates",
  jobs: "Jobs",
  interviews: "Interviews",
  onboarding: "Onboarding",
};

function generateBreadcrumbs(pathname: string, workspaceName: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: workspaceName, href: "/app" }];

  if (pathname === "/app" || pathname === "/app/") {
    items.push({ label: "Overview", isCurrent: true });
    return items;
  }

  const segments = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);

  let currentPath = "/app";
  segments.forEach((seg, idx) => {
    currentPath += `/${seg}`;
    const isLast = idx === segments.length - 1;
    const knownLabel = SECTION_LABELS[seg.toLowerCase()];

    let label = knownLabel;
    if (!label) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg);
      if (isUuid) {
        const prevSeg = idx > 0 ? segments[idx - 1] : "";
        if (prevSeg === "departments") label = "Department Detail";
        else if (prevSeg === "projects") label = "Project Detail";
        else if (prevSeg === "tasks") label = "Task Detail";
        else if (prevSeg === "people") label = "Member Profile";
        else if (prevSeg === "documents") label = "Document";
        else if (prevSeg === "meetings") label = "Meeting";
        else label = "Details";
      } else {
        const decoded = decodeURIComponent(seg);
        label = decoded.length > 22 ? `${decoded.substring(0, 20)}...` : decoded;
        label = label.replace(/-/g, " ");
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
    }

    items.push({
      label,
      href: isLast ? undefined : currentPath,
      isCurrent: isLast,
    });
  });

  return items;
}

export function Header({ user, workspace, onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [commandMenuOpen, setCommandMenuOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  const workspaceName = workspace?.name || "brnnd";
  const breadcrumbs = React.useMemo(
    () => generateBreadcrumbs(pathname, workspaceName),
    [pathname, workspaceName]
  );

  const displayName = user?.fullName || (user?.email ? user.email.split("@")[0] : "User");
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Load real notifications from database on mount or when workspace changes
  React.useEffect(() => {
    let isMounted = true;
    async function loadNotifications() {
      if (!workspace?.id) return;
      try {
        const { data, error } = await supabase
          .from("workspace_notifications")
          .select("*")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (!error && data && data.length > 0 && isMounted) {
          setNotifications(data as AppNotification[]);
        }
      } catch {
        // use default state
      }
    }
    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, [workspace?.id, supabase]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-header-dropdown]")) {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#D8DDD4] bg-white/95 px-4 sm:px-6 backdrop-blur-xs select-none">
        {/* Left Breadcrumb & Mobile Menu Button */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="rounded-[8px] p-1.5 text-[#18221E] hover:bg-[#E7EADF] lg:hidden focus:outline-none shrink-0"
            aria-label="Open sidebar navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <AppBreadcrumbs items={breadcrumbs} />
          </div>
        </div>

        {/* Right Search & Controls */}
        <div className="flex items-center gap-2.5 shrink-0 ml-3">
          {/* Global Search / Command Menu Trigger */}
          <button
            type="button"
            onClick={() => setCommandMenuOpen(true)}
            className="flex h-9 items-center gap-2 sm:gap-4 rounded-[10px] border border-[#D8DDD4] bg-white px-2.5 sm:px-3 text-xs text-[#65706A] shadow-2xs hover:border-[#B8C0B2] hover:text-[#18221E] transition-colors cursor-pointer"
            title="Search (⌘K)"
          >
            <Search className="h-3.5 w-3.5 text-[#65706A] shrink-0" />
            <span className="text-xs hidden sm:inline">Search anything...</span>
            <kbd className="hidden md:inline-flex items-center rounded border border-[#D8DDD4] bg-[#F4F3EE] px-1.5 py-0.5 font-mono text-[10px] text-[#65706A]">
              ⌘K
            </kbd>
          </button>

          {/* Dynamic Notifications Dropdown */}
          <div className="relative" data-header-dropdown>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNotificationsOpen(!notificationsOpen);
                setUserMenuOpen(false);
              }}
              aria-label="Notifications"
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-white text-[#18221E] shadow-2xs hover:border-[#B8C0B2] hover:bg-[#FAF9F5] transition-all focus:outline-none cursor-pointer",
                notificationsOpen && "border-[#10251F] bg-[#FAF9F5]"
              )}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#246244] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#246244] ring-2 ring-white" />
                </span>
              )}
            </button>

            {/* Notification Center Popover */}
            <NotificationCenter
              workspaceId={workspace?.id || ""}
              initialNotifications={notifications}
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
            />
          </div>

          {/* User Avatar Menu Dropdown */}
          <div className="relative" data-header-dropdown>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUserMenuOpen(!userMenuOpen);
                setNotificationsOpen(false);
              }}
              title={displayName}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10251F] text-xs font-bold text-[#F4F3EE] shadow-2xs hover:scale-105 transition-transform cursor-pointer focus:outline-none"
            >
              {userInitials}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-40 w-60 rounded-[14px] border border-[#D8DDD4] bg-white p-2 shadow-elevated animate-in zoom-in-95 duration-150 space-y-1">
                <div className="px-3 py-2 border-b border-[#E7EADF]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#18221E] truncate">{displayName}</p>
                    <span className="text-[9px] font-semibold text-[#246244] bg-[#EAF4E2] px-1.5 py-0.5 rounded border border-[#D8DDD4]">
                      Personal
                    </span>
                  </div>
                  <p className="text-[11px] text-[#65706A] truncate mt-0.5">{user?.email || "tashinkan360@gmail.com"}</p>
                </div>

                <Link
                  href="/app/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-xs font-medium text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-[#65706A]" />
                  <span>Personal Profile</span>
                </Link>

                <Link
                  href="/app/my-tasks"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-xs font-medium text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-[#65706A]" />
                  <span>My Tasks</span>
                </Link>

                <Link
                  href="/app/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-xs font-medium text-[#18221E] hover:bg-[#FAF9F5] transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-[#65706A]" />
                  <span>Workspace Settings</span>
                </Link>

                <div className="border-t border-[#E7EADF] pt-1 mt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Personal Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
      />

      {/* Global Command Menu Dialog */}
      <RopimoCommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        workspaceId={workspace?.id}
      />
    </>
  );
}

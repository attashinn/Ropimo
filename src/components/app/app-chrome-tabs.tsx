"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  X,
  Plus,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  Trash2,
  PanelLeft,
  Menu,
  Search,
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Workspace } from "@/types/workspace";
import { RopimoCommandMenu } from "@/components/ropimo/ropimo-command-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TooltipProvider } from "@/components/ui/tooltip";

export interface AppTab {
  id: string;
  label: string;
  href: string;
  iconName: string;
}

interface NavDef {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  iconName: string;
  matchPrefix: string[];
}

export const APP_NAV_ITEMS: NavDef[] = [
  { id: "overview", label: "Dashboard", href: "/app", icon: LayoutDashboard, iconName: "LayoutDashboard", matchPrefix: ["/app"] },
  { id: "tasks", label: "Tasks", href: "/app/my-tasks", icon: CheckSquare, iconName: "CheckSquare", matchPrefix: ["/app/my-tasks", "/app/tasks"] },
  { id: "projects", label: "Projects", href: "/app/projects", icon: FolderKanban, iconName: "FolderKanban", matchPrefix: ["/app/projects"] },
  { id: "calendar", label: "Calendar", href: "/app/calendar", icon: Calendar, iconName: "Calendar", matchPrefix: ["/app/calendar"] },
  { id: "meetings", label: "Meetings", href: "/app/meetings", icon: Video, iconName: "Video", matchPrefix: ["/app/meetings"] },
  { id: "hiring", label: "Hiring", href: "/app/hiring", icon: Briefcase, iconName: "Briefcase", matchPrefix: ["/app/hiring", "/app/recruitment"] },
  { id: "files", label: "Files", href: "/app/files", icon: Folder, iconName: "Folder", matchPrefix: ["/app/files", "/app/documents"] },
  { id: "people", label: "People", href: "/app/people", icon: Users, iconName: "Users", matchPrefix: ["/app/people"] },
  { id: "departments", label: "Departments", href: "/app/departments", icon: Building2, iconName: "Building2", matchPrefix: ["/app/departments"] },
  { id: "attendance", label: "Attendance", href: "/app/attendance", icon: Clock3, iconName: "Clock3", matchPrefix: ["/app/attendance"] },
  { id: "leave", label: "Leave", href: "/app/leave", icon: CalendarDays, iconName: "CalendarDays", matchPrefix: ["/app/leave"] },
  { id: "settings", label: "Settings", href: "/app/settings", icon: Settings, iconName: "Settings", matchPrefix: ["/app/settings"] },
];

const ICON_MAP: Record<string, LucideIcon> = {
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
};

function getNavForPath(path: string): NavDef {
  const normalized = path.split("?")[0].replace(/\/$/, "");
  let match: NavDef | undefined;
  let matchLen = 0;
  for (const item of APP_NAV_ITEMS) {
    for (const prefix of item.matchPrefix) {
      if (normalized === prefix || (prefix !== "/app" && normalized.startsWith(prefix))) {
        if (prefix.length > matchLen) {
          match = item;
          matchLen = prefix.length;
        }
      }
    }
  }
  return match || APP_NAV_ITEMS[0];
}

const STORAGE_KEY = "ropimo-app-chrome-tabs";

export interface AppChromeTabsProps {
  children?: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenMobileMenu?: () => void;
  workspace?: Workspace | null;
  user?: {
    email?: string | null;
    fullName?: string | null;
  } | null;
}

export function AppChromeTabs({
  children,
  isCollapsed = false,
  onToggleCollapse,
  onOpenMobileMenu,
  workspace,
  user,
}: AppChromeTabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [tabs, setTabs] = React.useState<AppTab[]>([
    {
      id: "tab-dashboard",
      label: "Dashboard",
      href: "/app",
      iconName: "LayoutDashboard",
    },
  ]);
  const [activeTabId, setActiveTabId] = React.useState<string>("tab-dashboard");
  const activeTabIdRef = React.useRef(activeTabId);
  const [commandMenuOpen, setCommandMenuOpen] = React.useState(false);

  React.useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Global Cmd+K / Ctrl+K listener for Command Menu
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

  // Hydrate from localStorage
  React.useEffect(() => {
    requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
            const seen = new Set<string>();
            const deduped: AppTab[] = [];
            for (const t of parsed.tabs) {
              if (t.id && !seen.has(t.id)) {
                seen.add(t.id);
                deduped.push(t);
              }
            }
            if (deduped.length > 0) {
              setTabs(deduped);
              const activeExists = deduped.some((t) => t.id === parsed.activeTabId);
              const resolvedActive = activeExists ? parsed.activeTabId : deduped[0].id;
              setActiveTabId(resolvedActive);
              activeTabIdRef.current = resolvedActive;
              return;
            }
          }
        }
      } catch {
        // Ignore parse error
      }

      const currentNav = getNavForPath(window.location.pathname || "/app");
      const initialTab: AppTab = {
        id: `tab-initial-${Date.now()}`,
        label: currentNav.label,
        href: window.location.pathname || "/app",
        iconName: currentNav.iconName,
      };
      setTabs([initialTab]);
      setActiveTabId(initialTab.id);
      activeTabIdRef.current = initialTab.id;
    });
  }, []);

  // When user navigates (e.g. clicks sidebar link), update current active tab — just like Chrome!
  React.useEffect(() => {
    const currentNav = getNavForPath(pathname);

    setTabs((prev) => {
      if (prev.length === 0) {
        const newTab: AppTab = {
          id: `tab-${currentNav.id}-${Date.now()}`,
          label: currentNav.label,
          href: pathname,
          iconName: currentNav.iconName,
        };
        setActiveTabId(newTab.id);
        activeTabIdRef.current = newTab.id;
        return [newTab];
      }

      const currentActiveId = activeTabIdRef.current;
      const currentActive = prev.find((t) => t.id === currentActiveId) || prev[0];
      if (currentActive.href === pathname) {
        return prev;
      }

      return prev.map((t) =>
        t.id === currentActive.id
          ? {
              ...t,
              label: currentNav.label,
              href: pathname,
              iconName: currentNav.iconName,
            }
          : t
      );
    });
  }, [pathname]);

  // Persist to localStorage
  React.useEffect(() => {
    if (tabs.length === 0) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs, activeTabId })
      );
    } catch {
      // Storage unavailable
    }
  }, [tabs, activeTabId]);

  const selectTab = React.useCallback(
    (tab: AppTab) => {
      setActiveTabId(tab.id);
      router.push(tab.href);
    },
    [router]
  );

  // New tab is ONLY created when the user explicitly clicks '+' or selects Quick Open
  const addTab = React.useCallback(
    (nav?: NavDef) => {
      const targetNav = nav || APP_NAV_ITEMS[0];
      const newTabId = `tab-${targetNav.id}-${Date.now()}`;
      const newTab: AppTab = {
        id: newTabId,
        label: targetNav.label,
        href: targetNav.href,
        iconName: targetNav.iconName,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTabId);
      router.push(newTab.href);
    },
    [router]
  );

  const closeTab = React.useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      const index = tabs.findIndex((t) => t.id === tabId);
      const newTabs = tabs.filter((t) => t.id !== tabId);
      setTabs(newTabs);

      if (activeTabId === tabId) {
        const nextIndex = index === newTabs.length ? index - 1 : index;
        const safeTab = newTabs[Math.max(0, nextIndex)];
        if (safeTab) {
          setActiveTabId(safeTab.id);
          router.push(safeTab.href);
        }
      }
    },
    [tabs, activeTabId, router]
  );

  const closeOthers = React.useCallback(
    (tabId: string) => {
      const target = tabs.find((t) => t.id === tabId);
      if (!target) return;
      setTabs([target]);
      setActiveTabId(target.id);
      router.push(target.href);
    },
    [tabs, router]
  );

  const closeToRight = React.useCallback(
    (tabId: string) => {
      const index = tabs.findIndex((t) => t.id === tabId);
      if (index === -1) return;
      const newTabs = tabs.slice(0, index + 1);
      setTabs(newTabs);
      if (!newTabs.some((t) => t.id === activeTabId)) {
        setActiveTabId(tabId);
        const current = newTabs.find((t) => t.id === tabId);
        if (current) router.push(current.href);
      }
    },
    [tabs, activeTabId, router]
  );

  const closeToLeft = React.useCallback(
    (tabId: string) => {
      const index = tabs.findIndex((t) => t.id === tabId);
      if (index === -1) return;
      const newTabs = tabs.slice(index);
      setTabs(newTabs);
      if (!newTabs.some((t) => t.id === activeTabId)) {
        setActiveTabId(tabId);
        const current = newTabs.find((t) => t.id === tabId);
        if (current) router.push(current.href);
      }
    },
    [tabs, activeTabId, router]
  );

  const closeAll = React.useCallback(() => {
    if (tabs.length <= 1) return;
    const first = tabs[0];
    setTabs([first]);
    setActiveTabId(first.id);
    router.push(first.href);
  }, [tabs, router]);

  const canClose = tabs.length > 1;
  const activeTabIndex = tabs.findIndex((t) => t.id === activeTabId);
  const activeTabObj = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative bg-canvas">
        {/* Mobile Header: visible on screens < lg */}
        <div className="flex lg:hidden items-center justify-between h-13 px-3.5 bg-canvas select-none shrink-0 border-b border-hairline/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                aria-label="Open navigation drawer"
                className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink hover:bg-black/[0.04] rounded-lg transition-colors cursor-pointer"
              >
                <Menu className="h-5 w-5 stroke-[1.75]" />
              </button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-6 w-6 rounded-md bg-ink text-white flex items-center justify-center text-xs font-bold shrink-0">
                {workspace?.name ? workspace.name[0].toUpperCase() : "R"}
              </span>
              <span className="font-semibold text-ink text-sm truncate">
                {activeTabObj?.label || workspace?.name || "Ropimo"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCommandMenuOpen(true)}
              aria-label="Search workspace"
              className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink hover:bg-black/[0.04] rounded-lg transition-colors cursor-pointer"
            >
              <Search className="h-4 w-4 stroke-[1.75]" />
            </button>
            <div className="w-7 h-7 rounded-full bg-[#18221E] text-white flex items-center justify-center text-[10px] font-semibold">
              {user?.fullName ? user.fullName[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : "U")}
            </div>
          </div>
        </div>

        {/* Desktop Top Tab Bar: visible on lg+ screens */}
        <div className="hidden lg:flex items-end bg-canvas pt-2 pr-3 select-none shrink-0">

          {/* PanelLeft sidebar toggle button on the far left */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Toggle sidebar"
              className="hidden lg:flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink hover:bg-black/[0.04] rounded-lg ml-2 mb-0.5 shrink-0 transition-colors"
            >
              <PanelLeft className={cn("h-4 w-4 stroke-[1.75] transition-transform duration-200", isCollapsed && "rotate-180")} />
            </button>
          )}

          {/* Scrollable Tabs Row */}
          <div
            className="flex items-end overflow-x-auto scrollbar-hide flex-1 pl-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <Reorder.Group
              as="ol"
              axis="x"
              values={tabs}
              onReorder={setTabs}
              className="flex items-end"
              role="tablist"
            >
              <AnimatePresence initial={false}>
                {tabs.map((tab, index) => {
                  const isActive = tab.id === activeTabId;
                  const hasRightNeighborActive =
                    index < tabs.length - 1 && tabs[index + 1].id === activeTabId;
                  const IconComponent = ICON_MAP[tab.iconName] || LayoutDashboard;

                  return (
                    <Reorder.Item
                      value={tab}
                      as="li"
                      layout
                      key={tab.id}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      whileDrag={{ cursor: "grabbing" }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="relative group shrink-0"
                      style={{ zIndex: isActive ? 10 : 1 }}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <div
                            role="tab"
                            aria-selected={isActive}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => selectTab(tab)}
                            onAuxClick={(e) => {
                              if (e.button === 1 && canClose) {
                                e.preventDefault();
                                closeTab(tab.id);
                              }
                            }}
                            className={cn(
                              "relative flex items-center gap-2 px-4 py-2.5 ml-[10px] sm:ml-0 text-sm cursor-pointer active:cursor-grabbing transition-colors duration-150 min-w-[140px] max-w-[220px] outline-none select-none",
                              isActive
                                ? "text-ink font-medium"
                                : "text-ink-2 hover:text-ink"
                            )}
                          >
                            {/* Active Tab Background with concave inverted corners */}
                            {isActive && (
                              <motion.div
                                className="absolute inset-0 bg-surface rounded-t-xl"
                                layoutId="activeAppChromeTab"
                                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                              >
                                {/* Left concave curve */}
                                <div className="absolute -left-3 bottom-0 w-3 h-3 overflow-hidden pointer-events-none">
                                  <div className="absolute right-0 bottom-0 w-6 h-6 bg-canvas rounded-full z-[1]" />
                                  <div className="absolute inset-0 bg-surface" />
                                </div>
                                {/* Right concave curve */}
                                <div className="absolute -right-3 bottom-0 w-3 h-3 overflow-hidden pointer-events-none">
                                  <div className="absolute left-0 bottom-0 w-6 h-6 bg-canvas rounded-full z-[1]" />
                                  <div className="absolute inset-0 bg-surface" />
                                </div>
                              </motion.div>
                            )}

                            {/* Tab Icon and Label */}
                            <div className="relative z-10 flex items-center gap-2 flex-1 min-w-0">
                              <IconComponent className="h-4 w-4 shrink-0 stroke-[1.75]" />
                              <span className="truncate flex-1 font-medium select-none text-[13px]">
                                {tab.label}
                              </span>

                              {canClose && (
                                <button
                                  type="button"
                                  aria-label={`Close ${tab.label} tab`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                  }}
                                  className={cn(
                                    "flex h-5 w-5 items-center justify-center rounded-full transition-colors shrink-0",
                                    isActive
                                      ? "hover:bg-hover text-ink-2 hover:text-ink"
                                      : "opacity-0 group-hover:opacity-100 hover:bg-black/[0.05] text-ink-2 hover:text-ink"
                                  )}
                                >
                                  <X className="h-3 w-3 stroke-[1.75]" />
                                </button>
                              )}
                            </div>

                            {/* Divider line between inactive tabs */}
                            {!isActive && !hasRightNeighborActive && (
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-hairline" />
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48 bg-surface border border-hairline shadow-card text-[13px]">
                          <ContextMenuItem onClick={() => closeTab(tab.id)} disabled={!canClose}>
                            Close Tab
                          </ContextMenuItem>
                          <ContextMenuSeparator className="bg-hairline" />
                          <ContextMenuItem onClick={() => closeOthers(tab.id)} disabled={tabs.length <= 1}>
                            Close Other Tabs
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => closeToRight(tab.id)} disabled={index >= tabs.length - 1}>
                            <ChevronRight className="mr-2 h-3.5 w-3.5" />
                            Close Tabs to Right
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => closeToLeft(tab.id)} disabled={index <= 0}>
                            <ChevronLeft className="mr-2 h-3.5 w-3.5" />
                            Close Tabs to Left
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </Reorder.Item>
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>

            {/* Plus Button with HoverCard Quick-Open */}
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  onClick={() => addTab()}
                  aria-label="New tab"
                  className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink hover:bg-black/[0.04] rounded-lg ml-1 mb-0.5 shrink-0 transition-colors"
                >
                  <Plus className="h-4 w-4 stroke-[1.75]" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                align="start"
                className="w-48 p-1 bg-surface border border-hairline shadow-card rounded-[8px]"
                sideOffset={8}
              >
                <div className="text-[11px] font-semibold text-ink-3 px-2 py-1 uppercase tracking-wider">
                  Quick Open
                </div>
                <div className="max-h-60 overflow-y-auto scrollbar-hide py-0.5">
                  {APP_NAV_ITEMS.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addTab(item)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-ink hover:bg-hover rounded-[6px] transition-colors text-left"
                      >
                        <ItemIcon className="h-4 w-4 text-ink-2 stroke-[1.75]" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>

          {/* Search button (⌘K) */}
          <button
            type="button"
            onClick={() => setCommandMenuOpen(true)}
            aria-label="Search workspace (⌘K)"
            title="Search workspace (⌘K)"
            className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink hover:bg-black/[0.04] rounded-lg mb-0.5 shrink-0 transition-colors"
          >
            <Search className="h-4 w-4 stroke-[1.75]" />
          </button>

          {/* More options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Tab options"
                className="flex h-9 w-9 items-center justify-center text-ink-2 hover:text-ink hover:bg-black/[0.04] rounded-lg mr-2 mb-0.5 shrink-0 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4 stroke-[1.75]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-surface border border-hairline shadow-card text-[13px]">
              <DropdownMenuItem onClick={() => setCommandMenuOpen(true)}>
                <Search className="mr-2 h-4 w-4" />
                Search (⌘K)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-hairline" />
              <DropdownMenuItem onClick={() => addTab()}>
                <Plus className="mr-2 h-4 w-4" />
                New Tab
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-hairline" />
              <DropdownMenuItem
                onClick={closeAll}
                disabled={tabs.length <= 1}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Close All Tabs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main Content Area: Seamlessly attached to active tab */}
        <main className="flex-1 overflow-hidden bg-canvas p-0 md:pr-3 md:pb-3">
          <div
            className={cn(
              "h-full bg-surface overflow-hidden flex flex-col transition-all duration-300 ease-in-out",
              "md:rounded-br-3xl md:rounded-bl-3xl md:rounded-tr-3xl",
              activeTabIndex !== 0 && "md:rounded-tl-3xl"
            )}
          >
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (visible on < lg screens) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D8DDD4] py-1 px-3 flex items-center justify-around select-none">
          {[
            { label: "Dashboard", href: "/app", icon: LayoutDashboard },
            { label: "Tasks", href: "/app/my-tasks", icon: CheckSquare },
            { label: "Projects", href: "/app/projects", icon: FolderKanban },
            { label: "Calendar", href: "/app/calendar", icon: Calendar },
          ].map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors cursor-pointer min-w-[56px]",
                  isActive ? "text-[#18221E] font-semibold" : "text-[#65706A] hover:text-[#18221E]"
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 stroke-[1.75]",
                      isActive ? "text-[#18221E]" : "text-[#65706A]"
                    )}
                  />
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
              </button>
            );
          })}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[#65706A] hover:text-[#18221E] transition-colors cursor-pointer min-w-[56px]"
            >
              <Menu className="h-5 w-5 stroke-[1.75]" />
              <span className="text-[10px] tracking-tight mt-0.5">More</span>
            </button>
          )}
        </nav>
      </div>

      {/* Command Menu */}
      <RopimoCommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        workspaceId={workspace?.id}
        workspaceName={workspace?.name}
        userName={user?.fullName || (user?.email ? user.email.split("@")[0] : undefined)}
      />
    </TooltipProvider>
  );
}

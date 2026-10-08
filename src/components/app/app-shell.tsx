"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Workspace } from "@/types/workspace";
import { UserContext } from "@/types/permissions";
import type { NavVisibility } from "@/lib/auth/permissions";
import { Project } from "@/types/project";
import { IconButton } from "@/components/app/ui";

export interface AppShellProps {
  children: React.ReactNode;
  user: {
    email?: string | null;
    fullName?: string | null;
  } | null;
  workspace?: Workspace | null;
  allWorkspaces?: Workspace[];
  userContext?: UserContext | null;
  navVisibility?: NavVisibility;
  projects?: Project[];
}

const STORAGE_KEY = "ropimo-sidebar-collapsed";

export function AppShell({
  children,
  user,
  workspace,
  allWorkspaces = [],
  userContext,
  navVisibility,
  projects = [],
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Initialize collapse state from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch {
      // Local storage not accessible
    }
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Local storage not accessible
      }
      return next;
    });
  }, []);

  // Keyboard shortcut Cmd+B / Ctrl+B to toggle sidebar collapse
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed, mobileMenuOpen]);

  // Lock body scroll when mobile drawer is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="app-root min-h-screen bg-canvas text-ink flex h-screen overflow-hidden antialiased select-auto">
      {/* Desktop Sidebar: sits directly on the canvas (no border, no white box) */}
      <div
        className={`hidden lg:flex flex-col shrink-0 h-screen transition-[width] duration-150 ease-out select-none ${
          isCollapsed ? "w-[56px]" : "w-[232px]"
        }`}
      >
        <Sidebar
          user={user}
          workspace={workspace}
          allWorkspaces={allWorkspaces}
          userContext={userContext}
          navVisibility={navVisibility}
          projects={projects}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/25 transition-opacity duration-120"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div
            className="relative flex w-[248px] max-w-[82vw] flex-1 flex-col bg-canvas border-r border-hairline shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-50 duration-120"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <div className="absolute top-2.5 right-2.5 z-50">
              <IconButton
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-4 w-4 stroke-[1.5]" />
              </IconButton>
            </div>

            <Sidebar
              user={user}
              workspace={workspace}
              allWorkspaces={allWorkspaces}
              userContext={userContext}
              navVisibility={navVisibility}
              projects={projects}
              isCollapsed={false}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area: Inset 8px from top, right, and bottom */}
      <div className="flex-1 flex flex-col h-screen min-w-0 p-2 lg:pl-0 overflow-hidden">
        {/* The ONE white sheet (surface) with 12px radius and hairline border */}
        <div className="flex-1 flex flex-col rounded-[12px] border border-hairline bg-surface overflow-hidden shadow-none h-[calc(100vh-16px)]">
          {/* Topbar inside sheet: 48px with hairline bottom border */}
          <Header
            user={user}
            workspace={workspace}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* Content scrolls inside the sheet */}
          <main className="flex-1 overflow-y-auto px-6 py-6 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

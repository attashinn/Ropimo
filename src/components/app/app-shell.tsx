"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Workspace } from "@/types/workspace";
import { UserContext } from "@/types/permissions";
import type { NavVisibility } from "@/lib/auth/permissions";
import { Project } from "@/types/project";
import { IconButton } from "@/components/app/ui";
import { AppChromeTabs } from "./app-chrome-tabs";

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
        const val = stored === "true";
        requestAnimationFrame(() => {
          setIsCollapsed(val);
        });
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
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer container */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative flex w-[260px] max-w-[84vw] flex-1 flex-col bg-canvas border-r border-hairline shadow-2xl z-50"
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area with Chrome-Like Tabs */}
      <AppChromeTabs
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapsed}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        workspace={workspace}
        user={user}
      >
        {/* Content scrolls inside the sheet directly under the tabs */}
        <main className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-3.5 sm:py-6 min-w-0 pb-20 lg:pb-6">
          {children}
        </main>
      </AppChromeTabs>
    </div>
  );
}

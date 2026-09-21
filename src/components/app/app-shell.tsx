"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Workspace } from "@/types/workspace";
import { UserContext } from "@/types/permissions";
import type { NavVisibility } from "@/lib/auth/permissions";
import { Project } from "@/types/project";

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

  // Close mobile menu on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

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
    <div className="flex min-h-screen bg-white text-[#18221E] antialiased selection:bg-[#10251F] selection:text-[#C7F34A]">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col bg-white">
        <Sidebar
          user={user}
          workspace={workspace}
          allWorkspaces={allWorkspaces}
          userContext={userContext}
          navVisibility={navVisibility}
          projects={projects}
        />
      </div>

      {/* Mobile Drawer (Apple-style Spring Physics & Blur) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Apple Glass Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/35 backdrop-blur-md"
            />

            {/* Sidebar drawer container with fluid spring */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                damping: 32,
                stiffness: 360,
                mass: 0.8,
              }}
              className="relative flex w-[280px] max-w-[85vw] flex-1 flex-col bg-white shadow-2xl border-r border-[#D8DDD4]"
            >
              {/* Close Button with Apple-style micro-interaction */}
              <div className="absolute top-3.5 right-3 z-50">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-7 h-7 rounded-full bg-[#FAF9F5] border border-[#D8DDD4] text-[#55635D] hover:text-[#10251F] flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                  title="Close Menu (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              <Sidebar
                user={user}
                workspace={workspace}
                allWorkspaces={allWorkspaces}
                userContext={userContext}
                navVisibility={navVisibility}
                projects={projects}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        <Header
          user={user}
          workspace={workspace}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

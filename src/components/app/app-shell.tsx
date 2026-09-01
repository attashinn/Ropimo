"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Workspace } from "@/types/workspace";
import { UserContext } from "@/types/permissions";
import type { NavVisibility } from "@/lib/auth/permissions";

export interface AppShellProps {
  children: React.ReactNode;
  user: {
    email?: string | null;
    fullName?: string | null;
  } | null;
  workspace?: Workspace | null;
  userContext?: UserContext | null;
  navVisibility?: NavVisibility;
}

export function AppShell({ children, user, workspace, userContext, navVisibility }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-white text-[#18221E] antialiased">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col bg-white">
        <Sidebar user={user} workspace={workspace} userContext={userContext} navVisibility={navVisibility} />
      </div>

      {/* Mobile Drawer (Animated) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
            />

            {/* Sidebar drawer container */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative flex w-72 flex-1 flex-col bg-white shadow-xl"
            >
              <Sidebar
                user={user}
                workspace={workspace}
                userContext={userContext}
                navVisibility={navVisibility}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header
          user={user}
          workspace={workspace}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AgentChatView } from "./agent-chat-view";

interface AICopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName?: string;
  userName?: string;
}

export function AICopilotDrawer({
  open,
  onClose,
  workspaceId,
  workspaceName,
  userName,
}: AICopilotDrawerProps) {
  // Listen for Cmd+J / Ctrl+J & Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        if (open) {
          onClose();
        }
      }
      if (open && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Apple Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
          />

          {/* Drawer Slide-Over with Apple Spring Physics */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              damping: 32,
              stiffness: 350,
              mass: 0.85,
            }}
            className="fixed top-0 right-0 bottom-0 w-full sm:max-w-xl z-50 bg-[#FAF9F5] shadow-2xl border-l border-[#E7E5E0] flex flex-col"
          >
            {/* Drawer top close button */}
            <div className="absolute top-3.5 right-3.5 z-20">
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white border border-[#E7E5E0] text-[#525B58] hover:text-[#10251F] hover:bg-neutral-50 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                title="Close Drawer (Esc or ⌘J)"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Embedded Agent Chat View */}
            <div className="flex-1 overflow-hidden pt-1">
              <AgentChatView
                workspaceId={workspaceId}
                workspaceName={workspaceName}
                userName={userName}
                isDrawer={true}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

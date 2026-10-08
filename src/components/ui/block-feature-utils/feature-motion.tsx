"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, Activity, Clock } from "lucide-react";

export default function FeatureMotion({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-full min-h-[220px] flex-col justify-center items-center p-6 overflow-hidden", className)}>
      <div className="relative w-full max-w-[260px] space-y-3">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-md"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Zap className="size-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Velocity Peak</p>
              <p className="text-[10px] text-muted-foreground">+38% sprint throughput</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-500">Fast</span>
        </motion.div>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="flex items-center justify-between rounded-xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Activity className="size-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Calm Office State</p>
              <p className="text-[10px] text-muted-foreground">Zero alert fatigue</p>
            </div>
          </div>
          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
            Optimal
          </span>
        </motion.div>
      </div>
    </div>
  );
}

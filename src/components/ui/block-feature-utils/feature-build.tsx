"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Layers, Workflow, Sparkles, CheckCircle2 } from "lucide-react";

export default function FeatureBuild({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-full min-h-[240px] flex-col justify-between p-6 overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Workflow className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Calm Workspace Engine</h4>
            <p className="text-[10px] text-muted-foreground">Zero bloat, instant delivery</p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Realtime
        </span>
      </div>

      <div className="my-4 space-y-2.5">
        <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <Layers className="size-4 text-violet-500" />
            <span className="text-xs font-medium text-foreground">Task & Project Boards</span>
          </div>
          <CheckCircle2 className="size-4 text-emerald-500" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-xs font-medium text-foreground">AI Autonomous Operations</span>
          </div>
          <CheckCircle2 className="size-4 text-emerald-500" />
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground text-center">
        Built for modern teams who want to get work done without the clutter.
      </div>
    </div>
  );
}

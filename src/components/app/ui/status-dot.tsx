import * as React from "react";

export type StatusType =
  | "done"
  | "active"
  | "progress"
  | "in_progress"
  | "overdue"
  | "none";

export interface StatusDotProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<StatusType, { color: string; defaultLabel: string }> = {
  done: { color: "bg-status-done", defaultLabel: "Done" },
  active: { color: "bg-status-done", defaultLabel: "Active" },
  progress: { color: "bg-status-progress", defaultLabel: "In progress" },
  in_progress: { color: "bg-status-progress", defaultLabel: "In progress" },
  overdue: { color: "bg-status-overdue", defaultLabel: "Overdue" },
  none: { color: "bg-status-none", defaultLabel: "None" },
};

export function StatusDot({ status, label, className = "" }: StatusDotProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-normal text-ink-2 select-none ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.color}`}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
}

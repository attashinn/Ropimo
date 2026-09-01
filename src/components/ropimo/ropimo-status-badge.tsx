"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StandardStatus =
  // Task Status
  | "todo"
  | "in_progress"
  | "in_review"
  | "changes_requested"
  | "blocked"
  | "completed"
  // Task Priority
  | "low"
  | "medium"
  | "high"
  | "urgent"
  // Project Status
  | "active"
  | "planning"
  | "paused"
  | "archived"
  | "on_track"
  | "at_risk"
  | "delayed"
  // Attendance & General
  | "present"
  | "remote"
  | "leave"
  | "pending"
  | "approved"
  | "rejected"
  | "draft"
  | "published";

export interface StatusConfig {
  label: string;
  dotColor?: string;
  subtleClass: string;
  solidClass: string;
  outlineClass: string;
}

const STATUS_DICTIONARY: Record<string, StatusConfig> = {
  // Completed / Success / Green
  completed: {
    label: "Completed",
    dotColor: "bg-[#246244]",
    subtleClass: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]",
    solidClass: "bg-[#246244] text-white border-[#246244]",
    outlineClass: "bg-white text-[#246244] border-[#246244]",
  },
  approved: {
    label: "Approved",
    dotColor: "bg-[#246244]",
    subtleClass: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]",
    solidClass: "bg-[#246244] text-white border-[#246244]",
    outlineClass: "bg-white text-[#246244] border-[#246244]",
  },
  present: {
    label: "Present",
    dotColor: "bg-[#246244]",
    subtleClass: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]",
    solidClass: "bg-[#246244] text-white border-[#246244]",
    outlineClass: "bg-white text-[#246244] border-[#246244]",
  },
  on_track: {
    label: "On Track",
    dotColor: "bg-[#246244]",
    subtleClass: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]",
    solidClass: "bg-[#246244] text-white border-[#246244]",
    outlineClass: "bg-white text-[#246244] border-[#246244]",
  },
  low: {
    label: "Low",
    dotColor: "bg-[#246244]",
    subtleClass: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]",
    solidClass: "bg-[#246244] text-white border-[#246244]",
    outlineClass: "bg-white text-[#246244] border-[#246244]",
  },

  // Active / In Progress / Lime or Ink
  active: {
    label: "Active",
    dotColor: "bg-[#10251F]",
    subtleClass: "bg-[#F4F3EE] text-[#10251F] border-[#D8DDD4]",
    solidClass: "bg-[#10251F] text-[#F4F3EE] border-[#10251F]",
    outlineClass: "bg-white text-[#10251F] border-[#10251F]",
  },
  in_progress: {
    label: "In Progress",
    dotColor: "bg-[#10251F]",
    subtleClass: "bg-[#E7EADF] text-[#10251F] border-[#D8DDD4]",
    solidClass: "bg-[#10251F] text-white border-[#10251F]",
    outlineClass: "bg-white text-[#10251F] border-[#10251F]",
  },
  remote: {
    label: "Remote",
    dotColor: "bg-[#10251F]",
    subtleClass: "bg-[#E7EADF] text-[#10251F] border-[#D8DDD4]",
    solidClass: "bg-[#10251F] text-white border-[#10251F]",
    outlineClass: "bg-white text-[#10251F] border-[#10251F]",
  },

  // In Review / Medium / Warning / Amber
  in_review: {
    label: "In Review",
    dotColor: "bg-[#B58500]",
    subtleClass: "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]",
    solidClass: "bg-[#B58500] text-white border-[#B58500]",
    outlineClass: "bg-white text-[#B58500] border-[#F8E3B6]",
  },
  medium: {
    label: "Medium",
    dotColor: "bg-[#B58500]",
    subtleClass: "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]",
    solidClass: "bg-[#B58500] text-white border-[#B58500]",
    outlineClass: "bg-white text-[#B58500] border-[#F8E3B6]",
  },
  high: {
    label: "High",
    dotColor: "bg-[#D97706]",
    subtleClass: "bg-[#FEF6E4] text-[#D97706] border-[#F8E3B6]",
    solidClass: "bg-[#D97706] text-white border-[#D97706]",
    outlineClass: "bg-white text-[#D97706] border-[#F8E3B6]",
  },
  at_risk: {
    label: "At Risk",
    dotColor: "bg-[#D97706]",
    subtleClass: "bg-[#FEF6E4] text-[#D97706] border-[#F8E3B6]",
    solidClass: "bg-[#D97706] text-white border-[#D97706]",
    outlineClass: "bg-white text-[#D97706] border-[#F8E3B6]",
  },
  pending: {
    label: "Pending",
    dotColor: "bg-[#B58500]",
    subtleClass: "bg-[#FEF6E4] text-[#B58500] border-[#F8E3B6]",
    solidClass: "bg-[#B58500] text-white border-[#B58500]",
    outlineClass: "bg-white text-[#B58500] border-[#F8E3B6]",
  },

  // Urgent / Danger / Red / Blocked
  urgent: {
    label: "Urgent",
    dotColor: "bg-[#D9383A]",
    subtleClass: "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]",
    solidClass: "bg-[#D9383A] text-white border-[#D9383A]",
    outlineClass: "bg-white text-[#D9383A] border-[#F8CBC2]",
  },
  blocked: {
    label: "Blocked",
    dotColor: "bg-[#D9383A]",
    subtleClass: "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]",
    solidClass: "bg-[#D9383A] text-white border-[#D9383A]",
    outlineClass: "bg-white text-[#D9383A] border-[#F8CBC2]",
  },
  changes_requested: {
    label: "Changes Requested",
    dotColor: "bg-[#D9383A]",
    subtleClass: "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]",
    solidClass: "bg-[#D9383A] text-white border-[#D9383A]",
    outlineClass: "bg-white text-[#D9383A] border-[#F8CBC2]",
  },
  rejected: {
    label: "Rejected",
    dotColor: "bg-[#D9383A]",
    subtleClass: "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]",
    solidClass: "bg-[#D9383A] text-white border-[#D9383A]",
    outlineClass: "bg-white text-[#D9383A] border-[#F8CBC2]",
  },
  delayed: {
    label: "Delayed",
    dotColor: "bg-[#D9383A]",
    subtleClass: "bg-[#FDECE8] text-[#D9383A] border-[#F8CBC2]",
    solidClass: "bg-[#D9383A] text-white border-[#D9383A]",
    outlineClass: "bg-white text-[#D9383A] border-[#F8CBC2]",
  },

  // Neutral / Gray / Todo / Planning / Draft / Leave
  todo: {
    label: "To Do",
    dotColor: "bg-[#65706A]",
    subtleClass: "bg-[#F4F3EE] text-[#65706A] border-[#D8DDD4]",
    solidClass: "bg-[#65706A] text-white border-[#65706A]",
    outlineClass: "bg-white text-[#65706A] border-[#D8DDD4]",
  },
  planning: {
    label: "Planning",
    dotColor: "bg-[#65706A]",
    subtleClass: "bg-[#F4F3EE] text-[#65706A] border-[#D8DDD4]",
    solidClass: "bg-[#65706A] text-white border-[#65706A]",
    outlineClass: "bg-white text-[#65706A] border-[#D8DDD4]",
  },
  paused: {
    label: "Paused",
    dotColor: "bg-[#65706A]",
    subtleClass: "bg-[#F4F3EE] text-[#65706A] border-[#D8DDD4]",
    solidClass: "bg-[#65706A] text-white border-[#65706A]",
    outlineClass: "bg-white text-[#65706A] border-[#D8DDD4]",
  },
  archived: {
    label: "Archived",
    dotColor: "bg-[#8A958F]",
    subtleClass: "bg-[#FAF9F5] text-[#8A958F] border-[#D8DDD4]",
    solidClass: "bg-[#8A958F] text-white border-[#8A958F]",
    outlineClass: "bg-white text-[#8A958F] border-[#D8DDD4]",
  },
  leave: {
    label: "On Leave",
    dotColor: "bg-[#65706A]",
    subtleClass: "bg-[#F4F3EE] text-[#65706A] border-[#D8DDD4]",
    solidClass: "bg-[#65706A] text-white border-[#65706A]",
    outlineClass: "bg-white text-[#65706A] border-[#D8DDD4]",
  },
  draft: {
    label: "Draft",
    dotColor: "bg-[#8A958F]",
    subtleClass: "bg-[#F4F3EE] text-[#65706A] border-[#D8DDD4]",
    solidClass: "bg-[#8A958F] text-white border-[#8A958F]",
    outlineClass: "bg-white text-[#8A958F] border-[#D8DDD4]",
  },
  published: {
    label: "Published",
    dotColor: "bg-[#246244]",
    subtleClass: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]",
    solidClass: "bg-[#246244] text-white border-[#246244]",
    outlineClass: "bg-white text-[#246244] border-[#246244]",
  },
};

export interface RopimoStatusBadgeProps {
  status?: StandardStatus | string;
  label?: string;
  variant?: "subtle" | "dot" | "solid" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  pulseDot?: boolean;
  className?: string;
}

export function RopimoStatusBadge({
  status = "todo",
  label,
  variant = "subtle",
  size = "md",
  icon,
  pulseDot = false,
  className,
}: RopimoStatusBadgeProps) {
  const normalizedKey = status.toLowerCase().replace(/\s+/g, "_");
  const config: StatusConfig = STATUS_DICTIONARY[normalizedKey] || {
    label: label || status,
    dotColor: "bg-[#65706A]",
    subtleClass: "bg-[#F4F3EE] text-[#65706A] border-[#D8DDD4]",
    solidClass: "bg-[#65706A] text-white border-[#65706A]",
    outlineClass: "bg-white text-[#65706A] border-[#D8DDD4]",
  };

  const displayLabel = label || config.label;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
    lg: "px-3 py-1 text-xs sm:text-sm font-semibold gap-2",
  };

  const getVariantClass = () => {
    switch (variant) {
      case "solid":
        return config.solidClass;
      case "outline":
        return config.outlineClass;
      case "dot":
      case "subtle":
      default:
        return config.subtleClass;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium select-none shadow-2xs whitespace-nowrap",
        sizeClasses[size],
        getVariantClass(),
        className
      )}
    >
      {variant === "dot" && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulseDot && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                config.dotColor
              )}
            />
          )}
          <span
            className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dotColor)}
          />
        </span>
      )}

      {icon && <span className="shrink-0">{icon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
}

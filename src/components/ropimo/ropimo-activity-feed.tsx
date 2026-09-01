"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  PlusCircle,
  Clock,
  MessageSquare,
  FileEdit,
  Trash2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RopimoUserAvatar } from "./ropimo-user-avatar";

export interface ActivityUser {
  name: string;
  avatarUrl?: string;
  initials?: string;
  role?: string;
}

export type ActivityActionType =
  | "created"
  | "updated"
  | "completed"
  | "commented"
  | "deleted"
  | "assigned"
  | "joined"
  | "other";

export interface ActivityItem {
  id: string;
  user: ActivityUser;
  action: string;
  targetTitle?: string;
  targetHref?: string;
  timestamp: string | Date;
  type?: ActivityActionType;
  metadata?: React.ReactNode;
}

export interface RopimoActivityFeedProps {
  items: ActivityItem[];
  groupByDate?: boolean;
  maxItems?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

function formatRelativeTime(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateInput);
  }
}

function getDateGroup(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return "Earlier";
  } catch {
    return "Earlier";
  }
}

export function RopimoActivityFeed({
  items,
  groupByDate = true,
  maxItems,
  emptyTitle = "No activity yet",
  emptyDescription = "Recent workspace activity will show up here.",
  className,
}: RopimoActivityFeedProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  const grouped = React.useMemo(() => {
    if (!groupByDate) return { All: displayItems };
    const map: Record<string, ActivityItem[]> = {};
    displayItems.forEach((item) => {
      const g = getDateGroup(item.timestamp);
      if (!map[g]) map[g] = [];
      map[g].push(item);
    });
    return map;
  }, [displayItems, groupByDate]);

  const getActionIcon = (type?: ActivityActionType) => {
    switch (type) {
      case "completed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-[#246244]" />;
      case "created":
        return <PlusCircle className="h-3.5 w-3.5 text-[#10251F]" />;
      case "commented":
        return <MessageSquare className="h-3.5 w-3.5 text-[#B58500]" />;
      case "updated":
        return <FileEdit className="h-3.5 w-3.5 text-[#65706A]" />;
      case "deleted":
        return <Trash2 className="h-3.5 w-3.5 text-[#D9383A]" />;
      case "assigned":
      case "joined":
        return <UserPlus className="h-3.5 w-3.5 text-[#246244]" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-[#65706A]" />;
    }
  };

  if (items.length === 0) {
    return (
      <div className={cn("rounded-[14px] border border-[#D8DDD4] bg-white p-6 text-center shadow-2xs", className)}>
        <p className="text-xs font-semibold text-[#18221E]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[#65706A]">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {Object.entries(grouped).map(([groupTitle, groupItems]) => (
        <div key={groupTitle} className="space-y-2">
          {groupByDate && (
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F] px-1">
              {groupTitle}
            </h4>
          )}

          <div className="overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs divide-y divide-[#E7EADF]">
            {groupItems.map((item) => {
              const rowContent = (
                <div className="flex items-start gap-3 p-3.5 text-xs transition-colors hover:bg-[#FAF9F5]">
                  <RopimoUserAvatar
                    name={item.user.name}
                    imageUrl={item.user.avatarUrl}
                    initials={item.user.initials}
                    size="sm"
                  />

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-[#18221E] leading-normal">
                      <span className="font-semibold text-[#18221E]">
                        {item.user.name}
                      </span>{" "}
                      <span className="text-[#65706A]">{item.action}</span>{" "}
                      {item.targetTitle && (
                        <span className="font-medium text-[#18221E]">
                          &ldquo;{item.targetTitle}&rdquo;
                        </span>
                      )}
                    </p>
                    {item.metadata && (
                      <div className="pt-1">{item.metadata}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-[#8A958F] pt-0.5">
                    {getActionIcon(item.type)}
                    <span>{formatRelativeTime(item.timestamp)}</span>
                  </div>
                </div>
              );

              if (item.targetHref) {
                return (
                  <Link
                    key={item.id}
                    href={item.targetHref}
                    className="block no-underline"
                  >
                    {rowContent}
                  </Link>
                );
              }

              return <div key={item.id}>{rowContent}</div>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

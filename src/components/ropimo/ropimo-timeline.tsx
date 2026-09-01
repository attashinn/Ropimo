"use client";

import * as React from "react";
import { Check, Clock, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RopimoUserAvatar } from "./ropimo-user-avatar";

export type TimelineItemStatus = "completed" | "current" | "pending" | "blocked";

export interface TimelineItem {
  id: string;
  title: string;
  description?: React.ReactNode;
  date?: string;
  status?: TimelineItemStatus;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  user?: { name: string; avatarUrl?: string; initials?: string };
  actions?: React.ReactNode;
}

export interface RopimoTimelineProps {
  items: TimelineItem[];
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function RopimoTimeline({
  items,
  orientation = "vertical",
  className,
}: RopimoTimelineProps) {
  const getStatusNode = (status: TimelineItemStatus = "pending", customIcon?: React.ReactNode) => {
    if (customIcon) {
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D8DDD4] bg-white text-[#18221E] shadow-2xs">
          {customIcon}
        </div>
      );
    }

    switch (status) {
      case "completed":
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A] shadow-2xs">
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
          </div>
        );
      case "current":
        return (
          <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#C7F34A] text-[#10251F] border border-[#B7E63D] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#10251F]" />
          </div>
        );
      case "blocked":
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FDECE8] text-[#D9383A] border border-[#F8CBC2] shadow-2xs">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
        );
      case "pending":
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D8DDD4] bg-[#F4F3EE] text-[#8A958F]">
            <Circle className="h-2.5 w-2.5 fill-current" />
          </div>
        );
    }
  };

  if (orientation === "horizontal") {
    return (
      <div className={cn("overflow-x-auto pb-4 pt-2", className)}>
        <div className="flex items-start min-w-[600px]">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            const isDone = item.status === "completed";

            return (
              <div key={item.id} className="relative flex-1 flex flex-col items-start pr-4">
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute top-3 left-6 right-0 h-0.5 -z-0",
                      isDone ? "bg-[#10251F]" : "bg-[#D8DDD4]"
                    )}
                  />
                )}

                <div className="relative z-10 mb-2">
                  {getStatusNode(item.status, item.icon)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#18221E]">
                      {item.title}
                    </span>
                    {item.badge}
                  </div>
                  {item.date && (
                    <p className="text-[11px] font-medium text-[#8A958F]">{item.date}</p>
                  )}
                  {item.description && (
                    <div className="text-xs text-[#65706A] leading-relaxed">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical Timeline
  return (
    <div className={cn("relative space-y-6 pl-2", className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isDone = item.status === "completed";

        return (
          <div key={item.id} className="relative flex items-start gap-4">
            {/* Connecting Vertical Line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-3 top-6 bottom-[-24px] w-0.5 -translate-x-1/2",
                  isDone ? "bg-[#10251F]" : "bg-[#D8DDD4]"
                )}
              />
            )}

            <div className="relative z-10 shrink-0 mt-0.5">
              {getStatusNode(item.status, item.icon)}
            </div>

            <div className="flex-1 min-w-0 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-2xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#18221E]">{item.title}</h4>
                  {item.badge}
                </div>
                {item.date && (
                  <span className="text-[11px] font-medium text-[#8A958F]">
                    {item.date}
                  </span>
                )}
              </div>

              {item.description && (
                <div className="text-xs text-[#65706A] leading-relaxed">
                  {item.description}
                </div>
              )}

              {(item.user || item.actions) && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E7EADF]">
                  {item.user ? (
                    <div className="flex items-center gap-2">
                      <RopimoUserAvatar
                        name={item.user.name}
                        imageUrl={item.user.avatarUrl}
                        initials={item.user.initials}
                        size="xs"
                      />
                      <span className="text-xs text-[#18221E] font-medium">
                        {item.user.name}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {item.actions && <div>{item.actions}</div>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

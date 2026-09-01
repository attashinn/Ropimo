"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface RopimoTabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface RopimoTabsProps {
  tabs: RopimoTabItem[];
  activeTab?: string;
  defaultValue?: string;
  onChange?: (tabId: string) => void;
  variant?: "pill" | "underline" | "segmented";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RopimoTabs({
  tabs,
  activeTab: controlledActiveTab,
  defaultValue,
  onChange,
  variant = "pill",
  size = "md",
  className,
}: RopimoTabsProps) {
  const [internalActive, setInternalActive] = React.useState(
    () => defaultValue || (tabs[0] ? tabs[0].id : "")
  );

  const isControlled = controlledActiveTab !== undefined;
  const currentTab = isControlled ? controlledActiveTab : internalActive;

  const handleTabClick = (tab: RopimoTabItem) => {
    if (tab.disabled) return;
    if (!isControlled) {
      setInternalActive(tab.id);
    }
    onChange?.(tab.id);
  };

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-xs sm:text-sm font-medium gap-2",
    lg: "px-4 py-2 text-sm sm:text-base font-medium gap-2.5",
  };

  const containerClasses = {
    pill: "flex flex-wrap items-center gap-1.5",
    underline: "flex items-center gap-6 border-b border-[#D8DDD4]",
    segmented:
      "inline-flex items-center rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-1 shadow-2xs",
  };

  return (
    <div className={cn(containerClasses[variant], className)}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;

        if (variant === "underline") {
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab)}
              className={cn(
                "relative flex items-center pb-3 pt-1 text-xs sm:text-sm font-medium transition-colors focus:outline-none",
                isActive
                  ? "text-[#18221E] font-bold"
                  : "text-[#65706A] hover:text-[#18221E]",
                tab.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
              )}
            >
              <div className="flex items-center gap-1.5">
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      isActive
                        ? "bg-[#EAF4E2] text-[#246244]"
                        : "bg-[#F4F3EE] text-[#65706A]"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </div>

              {isActive && (
                <motion.div
                  layoutId="ropimo-tabs-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10251F]"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          );
        }

        if (variant === "segmented") {
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab)}
              className={cn(
                "relative flex items-center rounded-[8px] transition-all select-none focus:outline-none",
                sizeClasses[size],
                isActive ? "text-[#18221E] font-bold" : "text-[#65706A] hover:text-[#18221E]",
                tab.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="ropimo-tabs-segmented"
                  className="absolute inset-0 rounded-[8px] border border-[#D8DDD4] bg-white shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      isActive ? "bg-[#EAF4E2] text-[#246244]" : "bg-[#E7EADF] text-[#65706A]"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        }

        // Pill variant
        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => handleTabClick(tab)}
            className={cn(
              "relative flex items-center rounded-[10px] transition-all select-none focus:outline-none",
              sizeClasses[size],
              isActive
                ? "text-white font-semibold"
                : "border border-[#D8DDD4] bg-white text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] shadow-2xs",
              tab.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="ropimo-tabs-pill"
                className="absolute inset-0 rounded-[10px] bg-[#10251F] shadow-xs"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}

            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? "bg-[#18342C] text-[#C7F34A]" : "bg-[#FAF9F5] text-[#65706A]"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

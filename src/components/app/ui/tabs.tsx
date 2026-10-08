"use client";

import * as React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex items-center gap-5 border-b border-hairline ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`group relative -mb-px inline-flex items-center gap-1.5 pb-2.5 pt-1 text-[13px] transition-colors duration-120 ease-out cursor-pointer select-none border-b-2 focus:outline-none ${
              isActive
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-2 hover:text-ink font-normal"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[12px] tabular-nums ${
                  isActive ? "text-ink" : "text-ink-3 group-hover:text-ink-2"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

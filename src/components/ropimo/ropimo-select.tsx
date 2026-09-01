"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface RopimoSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  prefix?: string;
  icon?: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}

export function RopimoSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  prefix,
  icon,
  className,
  align = "left",
}: RopimoSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption
    ? prefix
      ? `${prefix}: ${selectedOption.label}`
      : selectedOption.label
    : placeholder;

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative inline-block text-xs select-none", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex h-9 items-center justify-between gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-semibold text-[#18221E] shadow-2xs hover:border-[#B8C0B2] hover:bg-[#FAF9F5] transition-all cursor-pointer",
          isOpen && "border-[#10251F] ring-1 ring-[#10251F]"
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className="text-[#65706A]">{icon}</span>}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[#65706A] transition-transform duration-150",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1 z-50 min-w-[180px] max-h-60 overflow-y-auto rounded-[12px] border border-[#D8DDD4] bg-white p-1 shadow-elevated animate-in zoom-in-95 duration-150",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={`sel-${opt.value || "empty"}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                  isSelected
                    ? "bg-[#EAF4E2] font-bold text-[#10251F]"
                    : "text-[#18221E] hover:bg-[#FAF9F5]"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-[#246244] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

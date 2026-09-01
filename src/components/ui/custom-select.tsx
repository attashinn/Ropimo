"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  dotColor?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  prefix?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  buttonClassName,
  prefix,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative inline-block text-xs", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-8 items-center justify-between gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-semibold text-[#18221E] shadow-2xs transition-all hover:bg-[#FAF9F5] hover:border-[#10251F] focus:border-[#10251F] focus:outline-none cursor-pointer whitespace-nowrap",
          isOpen && "border-[#10251F] ring-1 ring-[#10251F]/10 bg-[#FAF9F5]",
          buttonClassName
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedOption?.dotColor && (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0 text-[#65706A]">{selectedOption.icon}</span>
          )}
          {prefix && <span className="text-[#65706A] font-normal">{prefix}:</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[#65706A] shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-[#18221E]"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] max-h-64 overflow-y-auto rounded-[12px] border border-[#D8DDD4] bg-white p-1 shadow-xl"
          >
            {options.map((option, idx) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={`opt-${option.value || "empty"}-${idx}`}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-[8px] px-2.5 py-1.5 text-xs text-left font-medium transition-colors cursor-pointer",
                    isSelected
                      ? "bg-[#FAF9F5] text-[#10251F] font-bold"
                      : "text-[#18221E] hover:bg-[#FAF9F5] hover:text-[#10251F]"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.dotColor && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: option.dotColor }}
                      />
                    )}
                    {option.icon && (
                      <span className="shrink-0 text-[#65706A]">{option.icon}</span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-[#10251F] shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  dotColor?: string;
  avatarUrl?: string | null;
  initials?: string;
  sublabel?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  prefix?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  align?: "left" | "right";
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  buttonClassName,
  menuClassName,
  prefix,
  fullWidth = false,
  disabled = false,
  searchable = false,
  align = "left",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && searchable) {
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block text-xs", fullWidth && "w-full", className)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex h-8.5 items-center justify-between gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3 text-xs font-semibold text-[#18221E] shadow-2xs transition-all hover:bg-[#FAF9F5] hover:border-[#10251F] focus:border-[#10251F] focus:outline-none cursor-pointer whitespace-nowrap",
          fullWidth && "w-full",
          disabled && "opacity-50 cursor-not-allowed bg-[#FAF9F5]",
          isOpen && "border-[#10251F] ring-1 ring-[#10251F]/10 bg-[#FAF9F5]",
          buttonClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.avatarUrl ? (
            <img
              src={selectedOption.avatarUrl}
              alt=""
              className="h-4.5 w-4.5 rounded-full object-cover shrink-0"
            />
          ) : selectedOption?.initials ? (
            <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-white">
              {selectedOption.initials}
            </span>
          ) : selectedOption?.dotColor ? (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          ) : selectedOption?.icon ? (
            <span className="shrink-0 text-[#65706A]">{selectedOption.icon}</span>
          ) : null}

          {prefix && <span className="text-[#65706A] font-normal">{prefix}:</span>}
          <span className={cn("truncate font-semibold", !selectedOption && "text-[#8A958F] font-normal")}>
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
            className={cn(
              "absolute top-full mt-1.5 z-50 min-w-[180px] max-h-72 overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white p-1 shadow-xl flex flex-col select-none",
              fullWidth ? "w-full" : "w-auto",
              align === "right" ? "right-0" : "left-0",
              menuClassName
            )}
          >
            {(searchable || options.length > 7) && (
              <div className="p-1.5 border-b border-[#E7EADF] mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FAF9F5] rounded-[8px] border border-[#E7EADF]">
                  <Search className="h-3.5 w-3.5 text-[#8A958F] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-transparent text-xs text-[#18221E] placeholder:text-[#8A958F] focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-[#8A958F] hover:text-[#18221E]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-y-auto max-h-56 p-0.5 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-3 px-2 text-center text-xs text-[#8A958F]">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((option, idx) => {
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
                        {option.avatarUrl ? (
                          <img
                            src={option.avatarUrl}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover shrink-0"
                          />
                        ) : option.initials ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[9.5px] font-bold text-white">
                            {option.initials}
                          </span>
                        ) : option.dotColor ? (
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: option.dotColor }}
                          />
                        ) : option.icon ? (
                          <span className="shrink-0 text-[#65706A]">{option.icon}</span>
                        ) : null}

                        <div className="truncate">
                          <span className="truncate block">{option.label}</span>
                          {option.sublabel && (
                            <span className="text-[10px] text-[#8A958F] block truncate">
                              {option.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-[#10251F] shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

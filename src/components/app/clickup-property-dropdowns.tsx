"use client";

import * as React from "react";
import {
  Search,
  Flag,
  CircleSlash,
  Sparkles,
  UserPlus,
  Plus,
  Check,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import { WorkspacePerson } from "@/types/people";

// ── 1. STATUS DROPDOWN COMPONENT ──────────────────────────────────────────
export type ClickUpStatus =
  | "todo"
  | "planning"
  | "in_progress"
  | "at_risk"
  | "update_required"
  | "on_hold"
  | "complete"
  | "cancelled";

export interface StatusOption {
  id: ClickUpStatus;
  label: string;
  category: "active" | "closed";
  icon: React.ReactNode;
}

export const STATUS_LIST: StatusOption[] = [
  {
    id: "todo",
    label: "TO DO",
    category: "active",
    icon: (
      <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: "planning",
    label: "PLANNING",
    category: "active",
    icon: (
      <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 A9 9 0 0 1 21 12 L12 12 Z" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "in_progress",
    label: "IN PROGRESS",
    category: "active",
    icon: (
      <svg className="w-4 h-4 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 A9 9 0 0 1 12 21 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "at_risk",
    label: "AT RISK",
    category: "active",
    icon: (
      <svg className="w-4 h-4 text-[#EA580C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 A9 9 0 0 1 12 21 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "update_required",
    label: "UPDATE REQUIRED",
    category: "active",
    icon: (
      <svg className="w-4 h-4 text-[#EAB308]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 A9 9 0 0 1 12 21 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "on_hold",
    label: "ON HOLD",
    category: "active",
    icon: (
      <svg className="w-4 h-4 text-[#78716C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 A9 9 0 0 1 12 21 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "complete",
    label: "COMPLETE",
    category: "active",
    icon: (
      <svg className="w-4 h-4 text-[#0D9488]" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12.5 L10.5 15 L16 9" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "cancelled",
    label: "CANCELLED",
    category: "closed",
    icon: (
      <svg className="w-4 h-4 text-[#10B981]" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12.5 L10.5 15 L16 9" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function StatusMenu({
  currentStatus,
  onSelect,
}: {
  currentStatus: string;
  onSelect: (st: ClickUpStatus) => void;
}) {
  const [search, setSearch] = React.useState("");

  const filtered = STATUS_LIST.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  const activeItems = filtered.filter((s) => s.category === "active");
  const closedItems = filtered.filter((s) => s.category === "closed");

  const normalizedCurrent = currentStatus === "completed" ? "complete" : currentStatus;

  return (
    <div className="w-[230px] rounded-xl border border-zinc-200 bg-white p-2 shadow-2xl z-50 text-[13px] font-sans antialiased select-none">
      {/* Search Input */}
      <div className="mb-2">
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full text-[12px] px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
        />
      </div>

      {/* Statuses Group */}
      {activeItems.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-zinc-400">
            <span>Statuses</span>
            <MoreHorizontal className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5">
            {activeItems.map((item) => {
              const isSelected = normalizedCurrent === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[12px] font-semibold tracking-wide transition-colors ${
                    isSelected ? "bg-zinc-100 text-zinc-900" : "hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900" />}
                  {item.id === "complete" && !isSelected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Closed Group */}
      {closedItems.length > 0 && (
        <div className="pt-1.5 border-t border-zinc-100">
          <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">
            <span>Closed</span>
          </div>
          <div className="space-y-0.5">
            {closedItems.map((item) => {
              const isSelected = normalizedCurrent === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[12px] font-semibold tracking-wide transition-colors ${
                    isSelected ? "bg-zinc-100 text-zinc-900" : "hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. PRIORITY DROPDOWN COMPONENT ────────────────────────────────────────
export type ClickUpPriority = "urgent" | "high" | "normal" | "low" | "clear";

export const PRIORITY_OPTIONS: {
  id: ClickUpPriority;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "urgent",
    label: "Urgent",
    color: "text-[#DC2626]",
    icon: <Flag className="w-4 h-4 text-[#DC2626] fill-current" />,
  },
  {
    id: "high",
    label: "High",
    color: "text-[#F59E0B]",
    icon: <Flag className="w-4 h-4 text-[#F59E0B] fill-current" />,
  },
  {
    id: "normal",
    label: "Normal",
    color: "text-[#3B82F6]",
    icon: <Flag className="w-4 h-4 text-[#3B82F6] fill-current" />,
  },
  {
    id: "low",
    label: "Low",
    color: "text-[#9CA3AF]",
    icon: <Flag className="w-4 h-4 text-[#9CA3AF] fill-current" />,
  },
  {
    id: "clear",
    label: "Clear",
    color: "text-zinc-600",
    icon: <CircleSlash className="w-4 h-4 text-zinc-400" />,
  },
];

export function PriorityMenu({
  currentPriority,
  onSelect,
  people = [],
}: {
  currentPriority: string;
  onSelect: (pr: ClickUpPriority) => void;
  people?: WorkspacePerson[];
}) {
  const normalized = currentPriority === "medium" ? "normal" : currentPriority;

  return (
    <div className="w-[200px] rounded-xl border border-zinc-200 bg-white p-2.5 shadow-2xl z-50 text-[13px] font-sans antialiased select-none">
      <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">
        Priority
      </div>

      <div className="space-y-0.5 my-1">
        {PRIORITY_OPTIONS.map((opt) => {
          const isSelected = normalized === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[13px] transition-colors ${
                isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "hover:bg-zinc-50 text-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {opt.icon}
                <span>{opt.label}</span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900" />}
            </button>
          );
        })}
      </div>

      {/* Prioritize with AI */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-1.5 py-1.5 my-2 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-700 text-[12px] font-medium transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
        <span>Prioritize with AI</span>
      </button>

      {/* Personal Priorities Row */}
      <div className="pt-2 border-t border-zinc-100">
        <span className="text-[10.5px] font-semibold text-zinc-400 block px-1 mb-1.5">
          Add to Personal Priorities
        </span>
        <div className="flex items-center gap-1.5 px-1">
          <div className="w-5 h-5 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[9px] font-bold">
            TK
          </div>
          <div className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[9px] font-bold">
            L
          </div>
          <div className="w-5 h-5 rounded-full bg-[#18181B] text-white flex items-center justify-center text-[8px] font-bold">
            M-
          </div>
          <button
            type="button"
            className="w-5 h-5 rounded-full border border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-600 flex items-center justify-center"
          >
            <UserPlus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 3. ASSIGNEES DROPDOWN COMPONENT ───────────────────────────────────────
export function AssigneesMenu({
  selectedId,
  onSelect,
  people = [],
}: {
  selectedId: string;
  onSelect: (userId: string) => void;
  people: WorkspacePerson[];
}) {
  const [search, setSearch] = React.useState("");

  const filtered = people.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-[260px] rounded-xl border border-zinc-200 bg-white p-2.5 shadow-2xl z-50 text-[13px] font-sans antialiased select-none">
      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search or enter email..."
          className="w-full text-[12px] pl-8 pr-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
        />
      </div>

      {/* Assignees Section */}
      <div className="mb-2">
        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">
          Assignees
        </div>
        <div
          onClick={() => onSelect(people[0]?.user_id || "me")}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/70 cursor-pointer transition-colors"
        >
          <div className="relative w-6 h-6 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[10px] font-bold">
            TK
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
          </div>
          <span className="text-[13px] font-medium text-zinc-900">Me</span>
        </div>
      </div>

      {/* People Section */}
      <div className="mb-2">
        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">
          People
        </div>
        <div className="space-y-0.5 max-h-36 overflow-y-auto">
          {filtered.map((p) => {
            const isSelected = selectedId === p.user_id;
            const initials = (p.full_name || p.email || "P").substring(0, 2).toUpperCase();
            return (
              <button
                key={p.user_id}
                type="button"
                onClick={() => onSelect(p.user_id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[12.5px] transition-colors ${
                  isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "hover:bg-zinc-50 text-zinc-800"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    {initials[0]}
                  </div>
                  <span className="truncate">{p.full_name || p.email}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 shrink-0" />}
              </button>
            );
          })}

          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 rounded-lg cursor-pointer">
            <UserPlus className="w-4 h-4 text-zinc-400" />
            <span>Keep typing a full email to invite</span>
          </div>
        </div>
      </div>

      {/* Agents Section */}
      <div className="mb-2 pt-1 border-t border-zinc-100">
        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400">
          Agents
        </div>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-500" />
          <span>Create Agent</span>
        </button>
      </div>

      {/* Assign with AI */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-700 text-[12px] font-medium transition-colors cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
        <span>Assign with AI</span>
      </button>
    </div>
  );
}

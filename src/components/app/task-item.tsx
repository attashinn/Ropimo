"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Task, TaskPriority } from "@/types/task";
import { toggleTaskCompletionAction } from "@/lib/task/actions";

export interface TaskItemProps {
  task: Task;
  workspaceId: string;
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  urgent: {
    label: "Urgent",
    bg: "bg-[#FDECE8]",
    text: "text-[#D9383A]",
    border: "border-[#F8CBC2]",
  },
  high: {
    label: "High",
    bg: "bg-[#FEF6E4]",
    text: "text-[#B58500]",
    border: "border-[#F8E3B6]",
  },
  medium: {
    label: "Medium",
    bg: "bg-[#FEF6E4]",
    text: "text-[#B58500]",
    border: "border-[#F8E3B6]",
  },
  low: {
    label: "Low",
    bg: "bg-[#EAF4E2]",
    text: "text-[#246244]",
    border: "border-[#D8DDD4]",
  },
};

export function TaskItem({ task, workspaceId }: TaskItemProps) {
  const router = useRouter();
  const [completed, setCompleted] = React.useState(task.status === "completed");
  const [toggling, setToggling] = React.useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (toggling) return;

    const nextCompleted = !completed;
    setCompleted(nextCompleted);
    setToggling(true);

    try {
      await toggleTaskCompletionAction(task.id, workspaceId, nextCompleted);
      router.refresh();
    } catch (err) {
      console.error(err);
      setCompleted(!nextCompleted);
    } finally {
      setToggling(false);
    }
  };

  const formattedDueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Aug 28, 2026";

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;

  const contextName =
    task.project?.name ?? task.department?.name ?? "team";

  const primaryAssignee = task.assignees[0];
  const assigneeInitial = primaryAssignee
    ? (primaryAssignee.full_name || primaryAssignee.email || "U")[0].toUpperCase()
    : "T";

  return (
    <div
      className={`group rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xs transition-[border-color,box-shadow,opacity] duration-200 ${
        completed
          ? "border-[#D8DDD4]/50 opacity-60"
          : "hover:border-[#10251F]/30 hover:shadow-sm"
      }`}
    >
      {/* Top Row: Checkbox + Icon + Title/Pill + Right Meta */}
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Checkbox, Icon, Title + Pill */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Checkbox */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            aria-label={completed ? "Mark as incomplete" : "Mark as completed"}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border transition-colors ${
              completed
                ? "border-[#10251F] bg-[#10251F] text-[#C7F34A]"
                : "border-[#CBD2C6] bg-white hover:border-[#10251F]"
            }`}
          >
            {completed && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {/* Icon Box */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#EAF4E2] text-[#246244]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          {/* Title & Context Pill */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/app/tasks/${task.id}`}
              className="focus:outline-none block"
            >
              <h3
                className={`text-[15px] sm:text-base font-bold truncate leading-snug ${
                  completed
                    ? "text-[#8A958F] line-through"
                    : "text-[#18221E] hover:text-[#10251F]"
                }`}
              >
                {task.title}
              </h3>
            </Link>
            <div className="mt-1 flex items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAEFE6] px-2.5 py-0.5 text-xs font-semibold text-[#18221E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#18221E]" />
                <span className="truncate max-w-[180px] sm:max-w-[260px]">
                  {contextName}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Meta: Priority Badge + Avatar + 3 Dots */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-medium ${priority.bg} ${priority.text} ${priority.border}`}
          >
            {priority.label}
          </span>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10251F] text-xs font-bold text-[#F4F3EE] shadow-2xs">
            {assigneeInitial}
          </div>

          <button
            type="button"
            className="text-[#65706A] hover:text-[#18221E] p-1 rounded transition-colors"
            title="More options"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Row: Separated by line, showing Due Date & Tags */}
      <div className="mt-4 pt-3.5 border-t border-[#EAEFE6] flex items-center gap-4 text-xs font-medium text-[#65706A]">
        {/* Due date */}
        <div className="flex items-center gap-2">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#246244]"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Due {formattedDueDate}</span>
        </div>

        {/* Divider */}
        <span className="h-3.5 w-px bg-[#D8DDD4]" />

        {/* Tags */}
        <div className="flex items-center gap-2">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#246244]"
          >
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <span>No tags</span>
        </div>
      </div>
    </div>
  );
}

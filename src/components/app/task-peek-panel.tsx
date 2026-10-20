"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Trash2 } from "lucide-react";
import { Task } from "@/types/task";
import { Avatar, IconButton, Button } from "@/components/app/ui";
import { toggleTaskCompletionAction, deleteTaskAction } from "@/lib/task/actions";
import { toast } from "sonner";

export interface TaskPeekPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (updatedTask: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  workspaceId: string;
}

export function TaskPeekPanel({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  workspaceId,
}: TaskPeekPanelProps) {
  const [cachedTask, setCachedTask] = React.useState<Task | null>(task);
  const [prevTaskProp, setPrevTaskProp] = React.useState<Task | null>(task);

  if (task !== prevTaskProp) {
    setPrevTaskProp(task);
    if (task) {
      setCachedTask(task);
    }
  }

  const activeTask = task || cachedTask;

  const [prevStatus, setPrevStatus] = React.useState(activeTask?.status);
  const [isCompleted, setIsCompleted] = React.useState(activeTask?.status === "completed");
  if (activeTask?.status !== prevStatus) {
    setPrevStatus(activeTask?.status);
    setIsCompleted(activeTask?.status === "completed");
  }

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggle = async () => {
    if (!activeTask) return;
    const nextCompleted = !isCompleted;
    setIsCompleted(nextCompleted);
    try {
      await toggleTaskCompletionAction(activeTask.id, workspaceId, nextCompleted);
      if (onTaskUpdated) {
        onTaskUpdated({
          ...activeTask,
          status: nextCompleted ? "completed" : "todo",
        });
      }
    } catch {
      setIsCompleted(!nextCompleted);
      toast.error("Failed to update task status.");
    }
  };

  const handleDelete = async () => {
    if (!activeTask) return;
    if (confirm("Delete this task?")) {
      try {
        await deleteTaskAction(activeTask.id, workspaceId);
        onTaskDeleted?.(activeTask.id);
        onClose();
      } catch {
        toast.error("Failed to delete task.");
      }
    }
  };

  const formattedDue = activeTask?.due_date
    ? new Date(activeTask.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No due date";

  return (
    <AnimatePresence>
      {isOpen && activeTask && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* 500px Right Peek Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] max-w-full sm:max-w-[94vw] bg-white border-l border-[#D8DDD4] shadow-2xl flex flex-col text-[#18221E] font-sans antialiased"
            role="dialog"
            aria-label="Task details"
          >
            {/* Topbar: 48px */}
            <div className="h-12 px-4 border-b border-[#D8DDD4] flex items-center justify-between shrink-0 bg-white select-none">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggle}
                  className={`h-7 px-3 rounded-lg border text-xs font-semibold transition-all duration-120 flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isCompleted
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-[#D8DDD4] bg-[#FAF9F5] text-[#18221E] hover:bg-white"
                  }`}
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{isCompleted ? "Completed" : "Mark done"}</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <IconButton aria-label="Delete task" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 stroke-[1.5] text-[#65706A] hover:text-rose-600" />
                </IconButton>
                <IconButton aria-label="Close panel" onClick={onClose}>
                  <X className="h-4 w-4 stroke-[1.5] text-[#65706A] hover:text-[#18221E]" />
                </IconButton>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title */}
              <div>
                <h2 className="text-xl font-semibold text-[#18221E] tracking-tight leading-snug">
                  {activeTask.title}
                </h2>
              </div>

              {/* Properties Grid */}
              <div className="border border-[#D8DDD4] rounded-xl overflow-hidden text-xs divide-y divide-[#D8DDD4] bg-white shadow-2xs">
                {/* Status */}
                <div className="flex items-center justify-between h-10 px-4 bg-[#FAF9F5]/40">
                  <span className="text-[#65706A] font-medium">Status</span>
                  <span className="font-semibold text-[#18221E] capitalize px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#D8DDD4]">
                    {activeTask.status.replace("_", " ")}
                  </span>
                </div>

                {/* Assignee */}
                <div className="flex items-center justify-between h-10 px-4">
                  <span className="text-[#65706A] font-medium">Assignee</span>
                  <div className="flex items-center gap-2">
                    {activeTask.assignees && activeTask.assignees.length > 0 ? (
                      <>
                        <Avatar
                          name={activeTask.assignees[0].full_name || undefined}
                          size={20}
                          accent="blue"
                        />
                        <span className="text-[#18221E] font-medium">
                          {activeTask.assignees[0].full_name}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#65706A] italic">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Due date */}
                <div className="flex items-center justify-between h-10 px-4 bg-[#FAF9F5]/40">
                  <span className="text-[#65706A] font-medium">Due date</span>
                  <span className="text-[#18221E] font-medium tabular-nums">{formattedDue}</span>
                </div>

                {/* Project */}
                <div className="flex items-center justify-between h-10 px-4">
                  <span className="text-[#65706A] font-medium">Project</span>
                  {activeTask.project ? (
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: activeTask.project.color || "#18221E" }}
                      />
                      <span className="text-[#18221E] font-medium truncate">{activeTask.project.name}</span>
                    </div>
                  ) : (
                    <span className="text-[#65706A] italic">No project</span>
                  )}
                </div>

                {/* Priority */}
                <div className="flex items-center justify-between h-10 px-4 bg-[#FAF9F5]/40">
                  <span className="text-[#65706A] font-medium">Priority</span>
                  <span className="text-[#18221E] font-semibold capitalize px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#D8DDD4]">
                    {activeTask.priority || "Normal"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold text-[#65706A] uppercase tracking-wider">
                  Description
                </h3>
                <div className="rounded-xl border border-[#D8DDD4] p-4 text-xs text-[#18221E] leading-relaxed min-h-[100px] bg-[#FAF9F5]/50">
                  {activeTask.description ? (
                    <p className="whitespace-pre-wrap">{activeTask.description}</p>
                  ) : (
                    <p className="text-[#65706A] italic">No description provided.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-[#D8DDD4] bg-[#FAF9F5] flex items-center justify-between text-xs text-[#65706A]">
              <span>Created on {new Date(activeTask.created_at).toLocaleDateString()}</span>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-[#18221E]">
                Done
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

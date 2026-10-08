"use client";

import * as React from "react";
import { X, Check, Calendar, Folder, User, Flag, Trash2, ExternalLink } from "lucide-react";
import { Task } from "@/types/task";
import { Avatar, IconButton, StatusDot, Button } from "@/components/app/ui";
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
  const [isCompleted, setIsCompleted] = React.useState(task?.status === "completed");

  React.useEffect(() => {
    setIsCompleted(task?.status === "completed");
  }, [task?.status]);

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

  if (!isOpen || !task) return null;

  const handleToggle = async () => {
    const nextCompleted = !isCompleted;
    setIsCompleted(nextCompleted);
    try {
      await toggleTaskCompletionAction(task.id, workspaceId, nextCompleted);
      if (onTaskUpdated) {
        onTaskUpdated({
          ...task,
          status: nextCompleted ? "completed" : "todo",
        });
      }
    } catch {
      setIsCompleted(!nextCompleted);
      toast.error("Failed to update task status.");
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this task?")) {
      try {
        await deleteTaskAction(task.id, workspaceId);
        onTaskDeleted?.(task.id);
        onClose();
      } catch {
        toast.error("Failed to delete task.");
      }
    }
  };

  const formattedDue = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No due date";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-120"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 480px Right Peek Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-[480px] max-w-[92vw] bg-surface border-l border-hairline shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col duration-150 ease-out animate-in slide-in-from-right"
        role="dialog"
        aria-label="Task details"
      >
        {/* Topbar: 48px */}
        <div className="h-12 px-4 border-b border-hairline flex items-center justify-between shrink-0 bg-surface select-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggle}
              className={`h-6 px-2.5 rounded-full border text-[12px] font-medium transition-colors duration-120 flex items-center gap-1.5 cursor-pointer ${
                isCompleted
                  ? "bg-status-done text-white border-status-done"
                  : "border-hairline bg-surface text-ink hover:bg-hover"
              }`}
            >
              <Check className="h-3 w-3 stroke-[2]" />
              <span>{isCompleted ? "Completed" : "Mark done"}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <IconButton aria-label="Delete task" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 stroke-[1.5] text-ink-3 hover:text-status-overdue" />
            </IconButton>
            <IconButton aria-label="Close panel" onClick={onClose}>
              <X className="h-4 w-4 stroke-[1.5]" />
            </IconButton>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-[18px] font-semibold text-ink leading-snug">
              {task.title}
            </h2>
          </div>

          {/* Properties Grid */}
          <div className="border border-hairline rounded-lg overflow-hidden text-[13px] divide-y divide-hairline bg-surface">
            {/* Status */}
            <div className="flex items-center h-10 px-3.5">
              <span className="w-28 text-ink-2">Status</span>
              <span className="text-ink font-normal capitalize">
                {task.status.replace("_", " ")}
              </span>
            </div>

            {/* Assignee */}
            <div className="flex items-center h-10 px-3.5">
              <span className="w-28 text-ink-2">Assignee</span>
              <div className="flex items-center gap-2">
                {task.assignees && task.assignees.length > 0 ? (
                  <>
                    <Avatar
                      name={task.assignees[0].full_name || undefined}
                      size={20}
                      accent="blue"
                    />
                    <span className="text-ink font-normal">
                      {task.assignees[0].full_name}
                    </span>
                  </>
                ) : (
                  <span className="text-ink-3">Unassigned</span>
                )}
              </div>
            </div>

            {/* Due date */}
            <div className="flex items-center h-10 px-3.5">
              <span className="w-28 text-ink-2">Due date</span>
              <span className="text-ink tabular-nums">{formattedDue}</span>
            </div>

            {/* Project */}
            <div className="flex items-center h-10 px-3.5">
              <span className="w-28 text-ink-2">Project</span>
              {task.project ? (
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: task.project.color || "#3B63F0" }}
                  />
                  <span className="text-ink truncate">{task.project.name}</span>
                </div>
              ) : (
                <span className="text-ink-3">No project</span>
              )}
            </div>

            {/* Priority */}
            <div className="flex items-center h-10 px-3.5">
              <span className="w-28 text-ink-2">Priority</span>
              <span className="text-ink font-normal capitalize">
                {task.priority || "Normal"}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[12px] font-medium text-ink-2 uppercase tracking-normal">
              Description
            </h3>
            <div className="rounded-lg border border-hairline p-3 text-[13px] text-ink leading-relaxed min-h-[90px] bg-canvas/30">
              {task.description ? (
                <p className="whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-ink-3 italic">No description provided.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-hairline bg-surface flex items-center justify-between text-[12px] text-ink-3">
          <span>Created on {new Date(task.created_at).toLocaleDateString()}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </aside>
    </>
  );
}

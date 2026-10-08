import * as React from "react";

export interface EmptyLineProps {
  message: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyLine({
  message,
  actionText,
  onAction,
  className = "",
}: EmptyLineProps) {
  return (
    <div
      className={`flex h-11 items-center px-3.5 text-[13px] text-ink-2 select-none border-b border-hairline ${className}`}
    >
      <span>{message}</span>
      {actionText && (
        <button
          type="button"
          onClick={onAction}
          className="ml-1.5 font-medium text-ink underline hover:text-black focus:outline-none cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

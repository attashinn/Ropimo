import * as React from "react";

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const Row = React.forwardRef<HTMLDivElement, RowProps>(
  (
    {
      selected = false,
      actions,
      className = "",
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`group relative flex h-11 min-h-[44px] items-center justify-between border-b border-hairline px-3.5 text-[13px] transition-colors duration-120 ease-out select-none ${
          onClick ? "cursor-pointer" : ""
        } ${
          selected
            ? "bg-selected text-ink"
            : "bg-surface hover:bg-hover text-ink"
        } ${className}`}
        {...props}
      >
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          {children}
        </div>

        {actions && (
          <div className="ml-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-120 ease-out flex items-center gap-1">
            {actions}
          </div>
        )}
      </div>
    );
  }
);

Row.displayName = "Row";

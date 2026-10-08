import * as React from "react";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Kbd({ children, className = "", ...props }: KbdProps) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded border border-hairline bg-canvas/70 px-1 py-0.5 font-mono text-[10px] text-ink-3 select-none leading-none tracking-normal ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
}

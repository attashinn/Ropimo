import * as React from "react";

export default function FigmaOrbitRing({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 229 109"
      fill="none"
      className={className}
      {...props}
    >
      <ellipse
        cx="114.5"
        cy="54.5"
        rx="113.5"
        ry="53.5"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeDasharray="4 4"
      />
      <ellipse
        cx="114.5"
        cy="54.5"
        rx="78.5"
        ry="36.5"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
    </svg>
  );
}

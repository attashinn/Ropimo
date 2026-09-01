"use client";

import * as React from "react";
import Link from "next/link";

export interface ShareJobButtonProps {
  jobId: string;
  isPublic: boolean;
}

export function ShareJobButton({ jobId, isPublic }: ShareJobButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      const publicUrl = `${window.location.origin}/jobs/${jobId}`;
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isPublic) {
    return (
      <span className="rounded-[8px] bg-stone-100 border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600">
        Not publicly available
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/jobs/${jobId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors shadow-2xs"
      >
        View Public Page ↗
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-[8px] bg-[#10251F] text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-[#18342C] transition-colors shadow-2xs"
      >
        {copied ? "✓ Link copied" : "Share Job"}
      </button>
    </div>
  );
}

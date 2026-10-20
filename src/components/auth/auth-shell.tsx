"use client";

import * as React from "react";
import Link from "next/link";
import { ImageSlot } from "@/components/ui/image-slot";
import { Check } from "lucide-react";
import { ZambicLogo } from "@/components/ui/zambic-logo";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  panelColor?: string; // e.g. '#7ED08A' for login, '#FFE76A' for signup
  imageSlotLabel?: string;
  imageSlotPath?: string;
  chipText?: string;
  chipSubtitle?: string;
}

export function AuthShell({
  children,
  title,
  subtitle,
  panelColor = "#7ED08A",
  imageSlotLabel = "Person photo cutout",
  imageSlotPath = "/images/person-login.png",
  chipText = "Offer signed",
  chipSubtitle,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden w-full bg-[#FAF9F6] text-[#111] antialiased selection:bg-[#111] selection:text-white font-[family-name:var(--font-plus-jakarta)]">
      {/* LEFT COLUMN: Form container */}
      <div className="flex w-full flex-col justify-between h-full px-6 py-5 sm:px-10 lg:w-1/2 lg:px-12 xl:px-16 overflow-y-auto no-scrollbar">
        {/* Top brand logo */}
        <div className="w-full pt-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 transition-transform duration-150 hover:scale-[1.02] focus:outline-none"
          >
            <ZambicLogo size={26} />
          </Link>
        </div>

        {/* Center Form */}
        <div className="my-auto w-full max-w-[380px] mx-auto py-3">
          <div className="mb-5">
            <h1 className="text-[30px] sm:text-[34px] font-[800] tracking-[-0.035em] leading-[1.12] text-[#111]">
              {title}
            </h1>
            <p className="mt-1.5 text-[14px] text-[#65706A] leading-relaxed font-normal">
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {/* Bottom footer text */}
        <div className="w-full pb-1 text-center lg:text-left">
          <p className="text-[11px] text-[#8A948E]">
            &copy; {new Date().getFullYear()} Zambic Inc. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: Big rounded panel inset 16px from edges, solid color */}
      <div className="hidden lg:flex lg:w-1/2 p-4 h-full">
        <div
          className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[32px] p-8 xl:p-10 select-none shadow-[0_20px_50px_rgba(0,0,0,0.06)]"
          style={{ backgroundColor: panelColor }}
        >
          {/* Floating White Chip */}
          <div className="absolute top-8 right-8 z-20 flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-black/5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8F8EA] text-[#248A3D]">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#111] leading-tight">
                {chipText}
              </span>
              {chipSubtitle && (
                <span className="text-[11px] font-medium text-[#738079] leading-tight mt-0.5">
                  {chipSubtitle}
                </span>
              )}
            </div>
          </div>

          {/* Person photo cutout anchored directly to the bottom */}
          <div className="mt-auto w-full flex justify-center items-end">
            <ImageSlot
              label={imageSlotLabel}
              dimensions="800x900"
              path={imageSlotPath}
              rounded="rounded-t-[32px] rounded-b-none"
              className="w-full max-w-[380px] h-[360px] xl:h-[420px] shadow-xs border-2 border-b-0 border-[#111]/10 bg-[#FAF9F5]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

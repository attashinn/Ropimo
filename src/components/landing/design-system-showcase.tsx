"use client";

import * as React from "react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { IconButton } from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";
import { SparklesIcon, CheckIcon } from "./icons";

export function DesignSystemShowcase() {
  return (
    <section className="bg-[#FFFFFF] py-16 border-t border-[#D8DDD4]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-[#D8DDD4] gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7EADF] px-3 py-1 text-xs font-semibold text-[#10251F] mb-3">
              <SparklesIcon size={12} className="text-[#10251F]" />
              Ropimo Design System
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-[#18221E] sm:text-3xl">
              Editorial Warm SaaS Foundations
            </h2>
            <p className="mt-1 text-sm text-[#65706A]">
              Tokens, interactive button mechanics, calm surfaces, and neutral borders.
            </p>
          </div>

          {/* Quick interactive buttons demo */}
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton size="md">
              Primary Action
            </PrimaryButton>
            <SecondaryButton size="md">
              Secondary Action
            </SecondaryButton>
            <IconButton ariaLabel="Check Action">
              <CheckIcon size={16} />
            </IconButton>
          </div>
        </div>

        {/* 3-Column Token Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Color System */}
          <Card variant="surface" className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-3">
                Color Tokens
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#10251F] text-[#F4F3EE]">
                  <span className="font-semibold">Ink (Primary)</span>
                  <span className="font-mono text-[11px]">#10251F</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#C7F34A] text-[#10251F]">
                  <span className="font-semibold">Lime (Accent)</span>
                  <span className="font-mono text-[11px]">#C7F34A</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#F4F3EE] text-[#18221E] border border-[#D8DDD4]">
                  <span className="font-semibold">Background (Warm)</span>
                  <span className="font-mono text-[11px]">#F4F3EE</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#E7EADF] text-[#18221E] border border-[#D8DDD4]">
                  <span className="font-semibold">Soft Green (Muted)</span>
                  <span className="font-mono text-[11px]">#E7EADF</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-[8px] bg-white text-[#18221E] border border-[#D8DDD4]">
                  <span className="font-semibold">Border</span>
                  <span className="font-mono text-[11px]">#D8DDD4</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Typography & Radii */}
          <Card variant="warm" className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#65706A] mb-3">
                Typography & Hierarchy
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xl font-bold tracking-tight text-[#18221E]">
                    Display Heading
                  </p>
                  <p className="text-xs text-[#65706A]">Geist Sans • Bold • Tight tracking</p>
                </div>
                <div>
                  <p className="text-base font-semibold text-[#18221E]">
                    Section Subtitle
                  </p>
                  <p className="text-xs text-[#65706A]">Semibold • 16px</p>
                </div>
                <div>
                  <p className="text-xs leading-relaxed text-[#65706A]">
                    Editorial body copy crafted for legibility, calm contrast, and generous whitespace.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#D8DDD4] flex items-center justify-between text-xs text-[#65706A]">
              <span>Corner Radius:</span>
              <span className="font-mono font-medium text-[#18221E]">10px – 14px</span>
            </div>
          </Card>

          {/* Card 3: Button States & Motion */}
          <Card variant="soft" className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#10251F] mb-3">
                Motion & Micro-interactions
              </p>
              <p className="text-xs text-[#18221E] leading-relaxed">
                Smooth 180ms hover animations using Motion for React. Integrated arrow block translation with zero bounce.
              </p>
              <div className="mt-4 space-y-2.5">
                <PrimaryButton size="sm" className="w-full justify-between">
                  Hover to preview motion
                </PrimaryButton>
                <SecondaryButton size="sm" className="w-full justify-between">
                  Light surface hover
                </SecondaryButton>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#D8DDD4] flex items-center justify-between text-[11px] text-[#10251F]">
              <span>Transition:</span>
              <span className="font-mono font-semibold">cubic-bezier(0.25, 0.1, 0.25, 1)</span>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

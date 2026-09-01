"use client";

import * as React from "react";
import { motion } from "motion/react";
import { slideUp } from "@/lib/animations";

export function ProductPreview() {
  const [activeTab, setActiveTab] = React.useState<"board" | "list" | "roadmap">("board");

  return (
    <section id="product" className="bg-[#FFFFFF] py-14 md:py-20 border-y border-[#D8DDD4]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
            Intuitive Interface
          </h2>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#18221E] sm:text-3xl">
            Designed for clarity, focus, and calm execution
          </p>
        </div>

        {/* Mock Application Container */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="overflow-hidden rounded-[16px] border border-[#D8DDD4] bg-[#FFFFFF] shadow-2xs"
        >
          {/* App Window Header */}
          <div className="flex h-12 items-center justify-between border-b border-[#D8DDD4] bg-[#F4F3EE] px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#D8DDD4]" />
              <span className="h-3 w-3 rounded-full bg-[#D8DDD4]" />
              <span className="h-3 w-3 rounded-full bg-[#D8DDD4]" />
              <span className="ml-3 text-xs font-medium text-[#65706A] hidden sm:inline">
                ropimo.app / workspace / sprint-24
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 rounded-[8px] border border-[#D8DDD4] bg-[#FFFFFF] p-1 text-xs font-medium text-[#65706A]">
              <button
                type="button"
                onClick={() => setActiveTab("board")}
                className={`rounded-[6px] px-3 py-1 transition-colors ${
                  activeTab === "board"
                    ? "bg-[#10251F] text-[#F4F3EE]"
                    : "hover:text-[#18221E]"
                }`}
              >
                Board
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`rounded-[6px] px-3 py-1 transition-colors ${
                  activeTab === "list"
                    ? "bg-[#10251F] text-[#F4F3EE]"
                    : "hover:text-[#18221E]"
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("roadmap")}
                className={`rounded-[6px] px-3 py-1 transition-colors ${
                  activeTab === "roadmap"
                    ? "bg-[#10251F] text-[#F4F3EE]"
                    : "hover:text-[#18221E]"
                }`}
              >
                Roadmap
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#E7EADF] px-2.5 py-1 text-[11px] font-semibold text-[#10251F] border border-[#D8DDD4]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10251F]" />
                Live Sync
              </span>
            </div>
          </div>

          {/* App Body Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#D8DDD4]">
            {/* Left Mock Sidebar */}
            <div className="hidden md:block md:col-span-3 p-5 bg-[#FAF9F5] text-xs">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#D8DDD4]">
                <span className="font-semibold text-[#18221E]">Acme Studio Workspace</span>
                <span className="rounded-[6px] bg-[#E7EADF] px-2 py-0.5 text-[10px] font-bold text-[#10251F]">
                  Pro
                </span>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="font-semibold uppercase tracking-wider text-[10px] text-[#65706A] mb-2">
                    Active Projects
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between rounded-[8px] bg-[#E7EADF] px-3 py-2 font-medium text-[#10251F]">
                      <span>⚡ Sprint 24 (Active)</span>
                      <span className="text-[10px] text-[#65706A]">18 tasks</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[8px] px-3 py-2 text-[#65706A] hover:bg-[#E7EADF]/60">
                      <span>📁 Design System v3</span>
                      <span className="text-[10px] text-[#65706A]">9 tasks</span>
                    </div>
                    <div className="flex items-center justify-between rounded-[8px] px-3 py-2 text-[#65706A] hover:bg-[#E7EADF]/60">
                      <span>🚀 Marketing Launch</span>
                      <span className="text-[10px] text-[#65706A]">24 tasks</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-semibold uppercase tracking-wider text-[10px] text-[#65706A] mb-2">
                    Team Documents
                  </p>
                  <div className="space-y-1 text-[#65706A]">
                    <div className="rounded-[8px] px-3 py-1.5 hover:bg-[#E7EADF]/60">
                      📄 Product Architecture Spec
                    </div>
                    <div className="rounded-[8px] px-3 py-1.5 hover:bg-[#E7EADF]/60">
                      📄 Q3 Milestone Review
                    </div>
                    <div className="rounded-[8px] px-3 py-1.5 hover:bg-[#E7EADF]/60">
                      📄 Customer Interview Notes
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Interactive Kanban Columns */}
            <div className="md:col-span-9 p-4 sm:p-6 bg-[#FFFFFF] overflow-x-auto">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#D8DDD4]">
                <div>
                  <h3 className="text-base font-semibold text-[#18221E]">Sprint 24 — Deliverables</h3>
                  <p className="text-xs text-[#65706A]">Target Completion: Oct 30 • 78% completed</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-[#C7F34A] border border-white">
                      TK
                    </div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E7EADF] text-[10px] font-bold text-[#18221E] border border-white">
                      SL
                    </div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D8DDD4] text-[10px] font-bold text-[#18221E] border border-white">
                      MR
                    </div>
                  </div>
                  <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1 text-xs text-[#18221E]">
                    + Filter
                  </span>
                </div>
              </div>

              {/* Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-[540px]">
                {/* To Do */}
                <div className="rounded-[12px] bg-[#F4F3EE] p-3.5 border border-[#D8DDD4]">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#18221E]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#65706A]" />
                      To Do
                    </span>
                    <span className="rounded-[4px] bg-[#E7EADF] px-1.5 py-0.5 text-[10px] text-[#18221E]">
                      3
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-[10px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="rounded-[4px] bg-[#FAF9F5] border border-[#D8DDD4] px-1.5 py-0.5 font-medium text-[#65706A]">
                          Design
                        </span>
                        <span className="text-[#65706A]">High</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#18221E]">
                        Finalize mobile navigation prototypes
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-[#65706A]">
                        <span>Due tomorrow</span>
                        <span className="font-semibold text-[#18221E]">SL</span>
                      </div>
                    </div>

                    <div className="rounded-[10px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="rounded-[4px] bg-[#FAF9F5] border border-[#D8DDD4] px-1.5 py-0.5 font-medium text-[#65706A]">
                          Docs
                        </span>
                        <span className="text-[#65706A]">Med</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#18221E]">
                        Update API documentation for v2 webhooks
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-[#65706A]">
                        <span>Due in 3d</span>
                        <span className="font-semibold text-[#18221E]">MR</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* In Progress */}
                <div className="rounded-[12px] bg-[#F4F3EE] p-3.5 border border-[#D8DDD4]">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#18221E]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#10251F]" />
                      In Progress
                    </span>
                    <span className="rounded-[4px] bg-[#C7F34A] px-1.5 py-0.5 text-[10px] text-[#10251F] font-bold">
                      2
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-[10px] border border-[#10251F] bg-white p-3.5 shadow-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="rounded-[4px] bg-[#10251F] px-1.5 py-0.5 font-semibold text-[#C7F34A]">
                          Core
                        </span>
                        <span className="text-[#10251F] font-bold">Urgent</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#18221E]">
                        Real-time collaborative document editing
                      </p>
                      <div className="mt-2.5 w-full bg-[#E7EADF] rounded-full h-1.5">
                        <div className="bg-[#10251F] h-1.5 rounded-full w-3/4" />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#65706A]">
                        <span>3/4 subtasks</span>
                        <span className="font-semibold text-[#18221E]">TK</span>
                      </div>
                    </div>

                    <div className="rounded-[10px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="rounded-[4px] bg-[#FAF9F5] border border-[#D8DDD4] px-1.5 py-0.5 font-medium text-[#65706A]">
                          Security
                        </span>
                        <span className="text-[#65706A]">High</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#18221E]">
                        Enterprise SAML / SSO role syncing
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-[#65706A]">
                        <span>In Review</span>
                        <span className="font-semibold text-[#18221E]">TK</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Done */}
                <div className="rounded-[12px] bg-[#F4F3EE] p-3.5 border border-[#D8DDD4]">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#18221E]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#B8C0B2]" />
                      Done
                    </span>
                    <span className="rounded-[4px] bg-[#E7EADF] px-1.5 py-0.5 text-[10px] text-[#18221E] font-semibold">
                      5
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-[10px] border border-[#D8DDD4] bg-white p-3.5 opacity-90">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="rounded-[4px] bg-[#E7EADF] px-1.5 py-0.5 font-medium text-[#18221E]">
                          Platform
                        </span>
                        <span className="text-[#10251F] font-semibold">✓ Done</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#65706A] line-through">
                        Custom workspace branding settings
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-[#65706A]">
                        <span>Completed yesterday</span>
                        <span className="font-semibold text-[#18221E]">SL</span>
                      </div>
                    </div>

                    <div className="rounded-[10px] border border-[#D8DDD4] bg-white p-3.5 opacity-90">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="rounded-[4px] bg-[#E7EADF] px-1.5 py-0.5 font-medium text-[#18221E]">
                          Storage
                        </span>
                        <span className="text-[#10251F] font-semibold">✓ Done</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#65706A] line-through">
                        Shared folder asset tagging & search
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-[#65706A]">
                        <span>Completed</span>
                        <span className="font-semibold text-[#18221E]">MR</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

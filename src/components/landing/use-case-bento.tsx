"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";

type UseCaseTab = "teams" | "product" | "enterprise";

export function UseCaseBento() {
  const [activeTab, setActiveTab] = React.useState<UseCaseTab>("teams");

  const tabData = {
    teams: {
      leftPill: "Core Platform",
      leftTitle: "Launch your initiatives",
      leftDesc:
        "Everything you need to manage deliverables in one place. Structure boards, assign tasks, collaborate async, and keep deadlines on track.",
      rightTopPill: "Agile Sprints",
      rightTopTitle: "Execute without blockers",
      rightTopDesc:
        "Automate subtask assignments, track team velocity, and keep dependencies clearly mapped with live updates.",
      rightBottomPill: "Living Knowledge",
      rightBottomTitle: "Centralize docs & files",
      rightBottomDesc:
        "Project specs, meeting notes, retrospectives, and shared assets live directly inside your project workspace.",
    },
    product: {
      leftPill: "Design & Specs",
      leftTitle: "From concept to spec",
      leftDesc:
        "Embed Figma prototypes, write collaborative PRDs, and break user stories into actionable engineering milestones.",
      rightTopPill: "Release Cycles",
      rightTopTitle: "Ship features on time",
      rightTopDesc:
        "Manage feature flags, QA checklists, and version release schedules with complete cross-functional visibility.",
      rightBottomPill: "Feedback Loops",
      rightBottomTitle: "Customer-driven backlog",
      rightBottomDesc:
        "Tag user interview takeaways and bug reports straight to active backlog epics for immediate prioritization.",
    },
    enterprise: {
      leftPill: "Organization Scale",
      leftTitle: "Multi-workspace governance",
      leftDesc:
        "Department-level isolation, customizable permission matrices, and unified reporting across all organizational squads.",
      rightTopPill: "Security & SSO",
      rightTopTitle: "Enterprise-grade compliance",
      rightTopDesc:
        "SAML 2.0 / Okta integration, custom audit trails, role-based access control, and 99.9% uptime SLA guarantee.",
      rightBottomPill: "Data & Storage",
      rightBottomTitle: "Centralized assets",
      rightBottomDesc:
        "Unlimited secure asset storage with automatic encryption at rest, versioning, and retention policies.",
    },
  };

  const current = tabData[activeTab];

  return (
    <section className="bg-[#F4F3EE] py-20 md:py-28 border-t border-[#D8DDD4]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-[#18221E] sm:text-5xl">
            The unified workspace for every team workflow
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#65706A] sm:text-lg">
            Tailored for fast-moving product squads, trusted by agencies, and built to scale with growing companies. No matter how you work, Ropimo adapts to your flow.
          </p>

          {/* Segmented Pill Switcher */}
          <div className="mt-9 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-[#D8DDD4] bg-white p-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("teams")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                activeTab === "teams"
                  ? "bg-[#10251F] text-[#C7F34A] shadow-xs"
                  : "text-[#18221E] hover:bg-[#F4F3EE]"
              }`}
            >
              <span>⚡</span>
              <span>Fast-moving Teams</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("product")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                activeTab === "product"
                  ? "bg-[#10251F] text-[#C7F34A] shadow-xs"
                  : "text-[#18221E] hover:bg-[#F4F3EE]"
              }`}
            >
              <span>📐</span>
              <span>Product & Design</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("enterprise")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                activeTab === "enterprise"
                  ? "bg-[#10251F] text-[#C7F34A] shadow-xs"
                  : "text-[#18221E] hover:bg-[#F4F3EE]"
              }`}
            >
              <span>🏢</span>
              <span>Scale & Enterprise</span>
            </button>
          </div>
        </div>

        {/* Bento Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Large Card (6 cols) */}
            <div className="lg:col-span-6 flex flex-col justify-between rounded-[20px] border border-[#D8DDD4] bg-[#E7EADF]/60 p-6 sm:p-8 shadow-2xs">
              {/* Top Floating Preview Card */}
              <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#65706A]">
                    Workspace Essentials
                  </span>
                  <span className="rounded-full bg-[#C7F34A] px-2.5 py-0.5 text-[10px] font-bold text-[#10251F]">
                    Ready on Day 1
                  </span>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-[#18221E]">4</span>
                  <span className="text-sm font-semibold text-[#18221E]">
                    core pillars unified seamlessly
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] p-2">
                    <p className="font-bold text-[#18221E]">Boards</p>
                    <p className="text-[10px] text-[#65706A]">Agile</p>
                  </div>
                  <div className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] p-2">
                    <p className="font-bold text-[#18221E]">Tasks</p>
                    <p className="text-[10px] text-[#65706A]">Nested</p>
                  </div>
                  <div className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] p-2">
                    <p className="font-bold text-[#18221E]">Docs</p>
                    <p className="text-[10px] text-[#65706A]">Real-time</p>
                  </div>
                  <div className="rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] p-2">
                    <p className="font-bold text-[#18221E]">Sync</p>
                    <p className="text-[10px] text-[#65706A]">Calendar</p>
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-[#65706A]">
                  AI-assisted search plus 24/7 human support. Scale whenever you are ready.
                </p>
              </div>

              {/* Bottom Card Content */}
              <div className="mt-8">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#10251F] mb-2">
                  <span>⚡</span>
                  <span>{current.leftPill} →</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-[#18221E]">
                  {current.leftTitle}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#65706A]">
                  {current.leftDesc}
                </p>
              </div>
            </div>

            {/* Right Column: 2 Stacked Deep Ink Bento Cards (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              {/* Top Right Card */}
              <div className="rounded-[20px] bg-[#10251F] text-[#F4F3EE] p-6 sm:p-8 border border-[#18342C] shadow-sm flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C7F34A] mb-2">
                      <span>•</span>
                      <span>{current.rightTopPill} →</span>
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-white">
                      {current.rightTopTitle}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#D8DDD4]">
                      {current.rightTopDesc}
                    </p>
                  </div>

                  {/* Embedded Mini UI Mockup */}
                  <div className="shrink-0 w-full sm:w-44 rounded-[12px] bg-white p-3.5 text-[#18221E] shadow-2xs">
                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-semibold text-[#18221E]">
                          <span className="h-2 w-2 rounded-full bg-[#10251F]" />
                          Sprint 24
                        </span>
                        <span className="text-[10px] text-[#65706A]">84%</span>
                      </div>
                      <div className="w-full bg-[#E7EADF] rounded-full h-1.5">
                        <div className="bg-[#10251F] h-1.5 rounded-full w-4/5" />
                      </div>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-[#65706A] border-t border-[#D8DDD4]">
                        <span>✓ 14 tasks</span>
                        <span className="font-semibold text-[#10251F]">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Right Card */}
              <div className="rounded-[20px] bg-[#10251F] text-[#F4F3EE] p-6 sm:p-8 border border-[#18342C] shadow-sm flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C7F34A] mb-2">
                      <span>•</span>
                      <span>{current.rightBottomPill} →</span>
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-white">
                      {current.rightBottomTitle}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#D8DDD4]">
                      {current.rightBottomDesc}
                    </p>
                  </div>

                  {/* Embedded Mini UI Mockup */}
                  <div className="shrink-0 w-full sm:w-44 rounded-[12px] bg-white p-3.5 text-[#18221E] shadow-2xs">
                    <p className="text-[11px] font-bold text-[#18221E]">
                      Docs, specs & files
                    </p>
                    <p className="text-[10px] text-[#65706A] mt-0.5">
                      All in one place
                    </p>
                    <div className="mt-2.5 flex items-center justify-between rounded-[6px] bg-[#E7EADF] px-2 py-1 text-[10px] font-semibold text-[#10251F]">
                      <span>Live Sync</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

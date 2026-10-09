"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Minus, Zap, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

interface FeatureRow {
  category: string;
  name: string;
  description: string;
  ropimo: { value: boolean | string; note?: string };
  clickup: { value: boolean | string; note?: string };
  asana: { value: boolean | string; note?: string };
  monday: { value: boolean | string; note?: string };
}

const COMPARISON_DATA: FeatureRow[] = [
  {
    category: "Core Workflows",
    name: "Task & Sprint Management",
    description: "Assignees, priorities, subtasks, due dates, and real-time sprint boards.",
    ropimo: { value: true, note: "Instant <100ms" },
    clickup: { value: true, note: "Often laggy" },
    asana: { value: true },
    monday: { value: true },
  },
  {
    category: "Core Workflows",
    name: "Native Meetings & Agendas",
    description: "Built-in agendas, auto action items, and live meeting schedules without external plugins.",
    ropimo: { value: true, note: "Built-in" },
    clickup: { value: false, note: "Requires Zoom" },
    asana: { value: false, note: "Requires Zoom" },
    monday: { value: false, note: "Requires Zoom" },
  },
  {
    category: "Core Workflows",
    name: "Hiring & Candidate Pipeline",
    description: "Job posts, applicant Kanban, interview schedules, and digital offer letters.",
    ropimo: { value: true, note: "Included free" },
    clickup: { value: false, note: "Needs Lever/ATS" },
    asana: { value: false, note: "Needs Lever/ATS" },
    monday: { value: "partial", note: "Add-on $24/mo" },
  },
  {
    category: "Core Workflows",
    name: "Official Document Storage & Approvals",
    description: "Versioned company files, formal review sign-offs, and department permission vaults.",
    ropimo: { value: true, note: "Included" },
    clickup: { value: "partial", note: "Basic docs only" },
    asana: { value: false, note: "Needs Google Drive" },
    monday: { value: "partial", note: "Basic files only" },
  },
  {
    category: "Core Workflows",
    name: "Staff Attendance & Leave Tracking",
    description: "Time-off requests, approval routing, and department calendar visibility.",
    ropimo: { value: true, note: "Built-in" },
    clickup: { value: false, note: "Needs BambooHR" },
    asana: { value: false, note: "Needs BambooHR" },
    monday: { value: false, note: "Needs BambooHR" },
  },
  {
    category: "Performance & Experience",
    name: "Lightning Fast Speed",
    description: "Sub-100ms page transitions, optimistic updates, and zero layout freezing.",
    ropimo: { value: true, note: "<100ms instant" },
    clickup: { value: false, note: "Heavy 3-5s load" },
    asana: { value: "partial", note: "Moderate lag" },
    monday: { value: false, note: "Heavy client script" },
  },
  {
    category: "Performance & Experience",
    name: "Keyboard-First Command Palette",
    description: "Global Cmd+K search, fuzzy finder across tasks, files, and members with instant shortcuts.",
    ropimo: { value: true, note: "Cmd+K / C / G+T" },
    clickup: { value: "partial", note: "Basic search" },
    asana: { value: "partial", note: "Basic search" },
    monday: { value: false, note: "Limited shortcuts" },
  },
  {
    category: "Performance & Experience",
    name: "Zero Cognitive Overload",
    description: "A calm, dense, distraction-free sheet. No 800 configuration toggles or cockpit clutter.",
    ropimo: { value: true, note: "Calm & clean" },
    clickup: { value: false, note: "Severe clutter" },
    asana: { value: "partial", note: "Multiple nested tabs" },
    monday: { value: false, note: "Flashy colors" },
  },
  {
    category: "Pricing & Value",
    name: "All-in-One Flat Pricing",
    description: "Everything your company needs in one transparent monthly subscription.",
    ropimo: { value: true, note: "$10–$19 / seat" },
    clickup: { value: false, note: "$19–$28 + plugins" },
    asana: { value: false, note: "$25–$30 / seat" },
    monday: { value: false, note: "$24–$32 / seat" },
  },
];

const COMPARISON_HIGHLIGHTS = [
  {
    competitor: "ClickUp",
    tag: "vs ClickUp",
    title: "Say goodbye to cockpit syndrome.",
    description:
      "ClickUp tried to build every feature on Earth into one screen, resulting in hundreds of settings, sluggish load times, and confused teammates. Ropimo gives you pure speed, calm typography, and zero configuration bloat.",
    ropimoWin: "Instant <100ms speed, 1-click workflows, calm cream design",
    competitorFlaw: "Laggy boards, bloated settings, high learning curve",
    color: "#FFCFC2",
  },
  {
    competitor: "Asana & Monday",
    tag: "vs Asana & Monday",
    title: "Replace 5 disparate SaaS bills.",
    description:
      "Asana and Monday manage basic tasks, but you still need Calendly for meetings, Greenhouse for hiring, and DocuSign for approvals. Ropimo delivers tasks, meetings, hiring pipelines, and official documents in one cohesive app.",
    ropimoWin: "Complete office suite: Tasks + Meetings + Hiring + Documents",
    competitorFlaw: "$120+/mo per seat when factoring in stacked external tools",
    color: "#D6F786",
  },
  {
    competitor: "Notion & Spreadsheets",
    tag: "vs Notion & Sheets",
    title: "Real operations without endless DIY maintenance.",
    description:
      "Notion gives you a blank canvas that someone on your team has to constantly build, maintain, and fix. Ropimo comes out of the box with structured, production-ready workflows built for real companies.",
    ropimoWin: "Ready in 2 minutes, strict data models, zero template breakage",
    competitorFlaw: "Broken databases, fragile permissions, chaotic formatting",
    color: "#FFE76A",
  },
];

export function ComparisonSection() {
  const [selectedCompetitor, setSelectedCompetitor] = useState<"all" | "clickup" | "asana" | "monday">("all");

  return (
    <section className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)] border-t border-neutral-200/50">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto flex flex-col items-center mb-14 sm:mb-20">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#EFECE0] text-[12px] sm:text-[13px] font-bold text-neutral-800 tracking-wider uppercase mb-5 shadow-xs select-none">
            Tool Comparison
          </span>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-[54px] font-[800] tracking-[-0.035em] text-[#111111] leading-[1.08]"
          >
            Why teams replace ClickUp & Asana with Ropimo.
          </motion.h2>

          <p className="mt-5 text-[15.5px] sm:text-[17.5px] text-[#6B6B6B] leading-relaxed max-w-2xl font-medium">
            Stop juggling five separate subscriptions, 40 confusing views, and bloated feature lists nobody on your team actually uses.
          </p>
        </div>

        {/* 3 Quick Contrast Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-24">
          {COMPARISON_HIGHLIGHTS.map((item) => (
            <div
              key={item.competitor}
              className="bg-white rounded-[28px] p-6 sm:p-7 border border-neutral-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    style={{ backgroundColor: item.color }}
                    className="px-3 py-1 rounded-full text-[11px] font-extrabold text-[#111111] tracking-wide shadow-xs"
                  >
                    {item.tag}
                  </span>
                  <span className="text-[12px] font-semibold text-neutral-400">Head to Head</span>
                </div>

                <h3 className="text-[19px] sm:text-[20px] font-extrabold text-[#111111] leading-snug tracking-tight">
                  {item.title}
                </h3>

                <p className="mt-3 text-[13.5px] text-[#6B6B6B] leading-relaxed font-medium">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-col gap-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-[#EAF4E2] text-[#1F9D55] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span className="font-semibold text-[#111111]">{item.ropimoWin}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span className="text-[#6B6B6B]">{item.competitorFlaw}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Matrix Table Card */}
        <div className="w-full bg-white rounded-[32px] sm:rounded-[36px] border border-neutral-200/80 shadow-[0_16px_48px_rgba(0,0,0,0.05)] overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-6 sm:p-8 bg-[#FAF9F6]/80 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
                Detailed Feature Matrix
              </h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] font-medium mt-1">
                See how Ropimo stacks up feature-for-feature against legacy work tools.
              </p>
            </div>

            {/* Filter Toggle Pills on Mobile */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { key: "all", label: "All" },
                { key: "clickup", label: "vs ClickUp" },
                { key: "asana", label: "vs Asana" },
                { key: "monday", label: "vs Monday" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCompetitor(tab.key as any)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCompetitor === tab.key
                      ? "bg-[#111111] text-white"
                      : "bg-[#EFECE0] text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-neutral-200/80 bg-white">
                  <th className="py-4 sm:py-5 px-5 sm:px-8 font-bold text-neutral-500 uppercase text-[11px] tracking-wider w-[36%] sm:w-[32%]">
                    Capabilities
                  </th>
                  {/* Ropimo Column (Highlighted) */}
                  <th className="py-4 sm:py-5 px-4 sm:px-6 bg-[#FAF9F6] border-x border-neutral-200/80 w-[24%] sm:w-[22%] text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <span className="font-extrabold text-[#111111] text-sm sm:text-base">Ropimo</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#111111] text-white text-[9px] sm:text-[10px] font-bold tracking-wide">
                        All-in-One
                      </span>
                    </div>
                  </th>
                  {/* Competitor 1: ClickUp */}
                  {(selectedCompetitor === "all" || selectedCompetitor === "clickup") && (
                    <th className="py-4 sm:py-5 px-3 sm:px-5 font-bold text-neutral-600 w-[14%] sm:w-[15%] text-center">
                      ClickUp
                    </th>
                  )}
                  {/* Competitor 2: Asana */}
                  {(selectedCompetitor === "all" || selectedCompetitor === "asana") && (
                    <th className="py-4 sm:py-5 px-3 sm:px-5 font-bold text-neutral-600 w-[14%] sm:w-[15%] text-center">
                      Asana
                    </th>
                  )}
                  {/* Competitor 3: Monday */}
                  {(selectedCompetitor === "all" || selectedCompetitor === "monday") && (
                    <th className="py-4 sm:py-5 px-3 sm:px-5 font-bold text-neutral-600 w-[14%] sm:w-[15%] text-center">
                      Monday.com
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200/60 font-medium">
                {COMPARISON_DATA.map((row, idx) => (
                  <tr
                    key={row.name}
                    className={idx % 2 === 0 ? "bg-white" : "bg-[#FAF9F6]/30"}
                  >
                    {/* Capability Name & Description */}
                    <td className="py-4 px-5 sm:px-8">
                      <div className="font-bold text-[#111111] text-xs sm:text-[13.5px]">
                        {row.name}
                      </div>
                      <div className="text-[11px] sm:text-xs text-[#6B6B6B] mt-0.5 leading-relaxed hidden sm:block">
                        {row.description}
                      </div>
                    </td>

                    {/* Ropimo Column */}
                    <td className="py-4 px-4 sm:px-6 bg-[#FAF9F6] border-x border-neutral-200/80">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="h-5 w-5 rounded-full bg-[#EAF4E2] text-[#1F9D55] flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                        {row.ropimo.note && (
                          <span className="text-[11px] sm:text-xs font-bold text-[#111111] hidden sm:inline">
                            {row.ropimo.note}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ClickUp Column */}
                    {(selectedCompetitor === "all" || selectedCompetitor === "clickup") && (
                      <td className="py-4 px-3 sm:px-5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {row.clickup.value === true ? (
                            <span className="h-5 w-5 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </span>
                          ) : row.clickup.value === "partial" ? (
                            <span className="h-5 w-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                              <Minus className="w-3 h-3 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="h-5 w-5 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center">
                              <X className="w-3 h-3 stroke-[2.5]" />
                            </span>
                          )}
                          {row.clickup.note && (
                            <span className="text-[10px] text-[#6B6B6B] hidden sm:inline">
                              {row.clickup.note}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Asana Column */}
                    {(selectedCompetitor === "all" || selectedCompetitor === "asana") && (
                      <td className="py-4 px-3 sm:px-5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {row.asana.value === true ? (
                            <span className="h-5 w-5 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </span>
                          ) : row.asana.value === "partial" ? (
                            <span className="h-5 w-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                              <Minus className="w-3 h-3 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="h-5 w-5 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center">
                              <X className="w-3 h-3 stroke-[2.5]" />
                            </span>
                          )}
                          {row.asana.note && (
                            <span className="text-[10px] text-[#6B6B6B] hidden sm:inline">
                              {row.asana.note}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Monday Column */}
                    {(selectedCompetitor === "all" || selectedCompetitor === "monday") && (
                      <td className="py-4 px-3 sm:px-5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {row.monday.value === true ? (
                            <span className="h-5 w-5 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </span>
                          ) : row.monday.value === "partial" ? (
                            <span className="h-5 w-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                              <Minus className="w-3 h-3 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="h-5 w-5 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center">
                              <X className="w-3 h-3 stroke-[2.5]" />
                            </span>
                          )}
                          {row.monday.note && (
                            <span className="text-[10px] text-[#6B6B6B] hidden sm:inline">
                              {row.monday.note}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Callout Footer */}
          <div className="p-6 sm:p-8 bg-[#FAF9F6] border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-5 h-5 text-[#D6F786]" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-[#111111]">
                  Ready to switch from ClickUp or Asana?
                </h4>
                <p className="text-xs sm:text-sm text-[#6B6B6B] font-medium">
                  Import your projects and tasks in under 60 seconds with our instant migrator.
                </p>
              </div>
            </div>

            <Link
              href="/signup"
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#111111] hover:bg-black text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer shrink-0"
            >
              <span>Start Free Migration</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ComparisonSection;

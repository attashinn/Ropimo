"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Minus, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

// ─── Authentic Brand Logos ────────────────────────────────────────────────────

function RopimoLogo() {
  return (
    <div className="w-6 h-6 rounded-md bg-[#111111] flex items-center justify-center shrink-0">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="3.5" stroke="white" strokeWidth="1.8" />
        <path d="M6.5 7.5H13.5M6.5 10H13.5M6.5 12.5H10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ClickUpLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M4 14.5L12 7L20 14.5"
        stroke="url(#clickup-gradient)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 17.5C8.6 19.2 10.2 20 12 20C13.8 20 15.4 19.2 17 17.5"
        stroke="#FF02B0"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="clickup-gradient" x1="4" y1="14.5" x2="20" y2="7" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7B68EE" />
          <stop offset="1" stopColor="#FF02B0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AsanaLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="6.8" r="3.6" fill="#F06A6D" />
      <circle cx="6.2" cy="16.5" r="3.6" fill="#F06A6D" />
      <circle cx="17.8" cy="16.5" r="3.6" fill="#F06A6D" />
    </svg>
  );
}

function MondayLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect x="3.5" y="10.5" width="3.5" height="8.5" rx="1.75" fill="#FF3D57" />
      <rect x="10.25" y="5.5" width="3.5" height="13.5" rx="1.75" fill="#FFCB00" />
      <rect x="17" y="9.5" width="3.5" height="9.5" rx="1.75" fill="#00C875" />
    </svg>
  );
}

// ─── Real-World Comparison Data ───────────────────────────────────────────────

interface ComparisonRow {
  name: string;
  category?: string;
  ropimo: {
    status: "yes" | "no" | "partial";
    headline: string;
    detail: string;
  };
  clickup: {
    status: "yes" | "no" | "partial";
    headline: string;
    detail: string;
  };
  asana: {
    status: "yes" | "no" | "partial";
    headline: string;
    detail: string;
  };
  monday: {
    status: "yes" | "no" | "partial";
    headline: string;
    detail: string;
  };
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    name: "Task & Sprint Management",
    category: "Daily Operations",
    ropimo: {
      status: "yes",
      headline: "Built-in",
      detail: "Live sprint boards, subtasks, & owners",
    },
    clickup: {
      status: "yes",
      headline: "Included",
      detail: "Heavy interface with 40+ view options",
    },
    asana: {
      status: "yes",
      headline: "Included",
      detail: "Basic list & board views",
    },
    monday: {
      status: "yes",
      headline: "Included",
      detail: "Colored spreadsheet-style grid",
    },
  },
  {
    name: "Video Meetings & Auto-Notes",
    category: "Daily Operations",
    ropimo: {
      status: "yes",
      headline: "Built-in native",
      detail: "Agendas & action items convert to tasks",
    },
    clickup: {
      status: "no",
      headline: "Not included",
      detail: "Requires Zoom / Google Meet subscription",
    },
    asana: {
      status: "no",
      headline: "Not included",
      detail: "Requires external meeting link integration",
    },
    monday: {
      status: "no",
      headline: "Not included",
      detail: "Requires external meeting app",
    },
  },
  {
    name: "Hiring Pipeline & ATS",
    category: "Daily Operations",
    ropimo: {
      status: "yes",
      headline: "Included free",
      detail: "Job listings, candidate Kanban, & offers",
    },
    clickup: {
      status: "no",
      headline: "Not included",
      detail: "Requires Lever or Greenhouse ($6,000/yr)",
    },
    asana: {
      status: "no",
      headline: "Not included",
      detail: "Requires external recruiting software",
    },
    monday: {
      status: "partial",
      headline: "Paid add-on",
      detail: "Requires Monday HR module ($24/seat/mo)",
    },
  },
  {
    name: "Company Vault & Document Approvals",
    category: "Daily Operations",
    ropimo: {
      status: "yes",
      headline: "Included free",
      detail: "Digital sign-offs, versioning, & permissions",
    },
    clickup: {
      status: "partial",
      headline: "Basic docs only",
      detail: "No formal approval routing or legal vault",
    },
    asana: {
      status: "no",
      headline: "Not included",
      detail: "Must connect Google Drive or Box",
    },
    monday: {
      status: "partial",
      headline: "Basic files",
      detail: "No built-in signature workflows",
    },
  },
  {
    name: "Attendance & Time-Off Approvals",
    category: "Daily Operations",
    ropimo: {
      status: "yes",
      headline: "Built-in",
      detail: "Leave requests, balances, & office calendar",
    },
    clickup: {
      status: "no",
      headline: "Not included",
      detail: "Requires separate HRIS (e.g. BambooHR)",
    },
    asana: {
      status: "no",
      headline: "Not included",
      detail: "No staff attendance or leave features",
    },
    monday: {
      status: "no",
      headline: "Not included",
      detail: "No leave tracking out of the box",
    },
  },
  {
    name: "Speed & Performance",
    category: "Experience",
    ropimo: {
      status: "yes",
      headline: "Instant <100ms",
      detail: "Optimistic updates with zero UI freeze",
    },
    clickup: {
      status: "no",
      headline: "Frequent lag",
      detail: "Complex boards take 3–5 seconds to load",
    },
    asana: {
      status: "partial",
      headline: "Moderate",
      detail: "Can feel slow on large multi-project teams",
    },
    monday: {
      status: "no",
      headline: "Script heavy",
      detail: "Heavy DOM trees cause browser slowdowns",
    },
  },
  {
    name: "Keyboard Navigation & Cmd+K",
    category: "Experience",
    ropimo: {
      status: "yes",
      headline: "Global command bar",
      detail: "Cmd+K fuzzy search, C to create, G+T jumps",
    },
    clickup: {
      status: "partial",
      headline: "Basic modal",
      detail: "Limited shortcut actions across items",
    },
    asana: {
      status: "partial",
      headline: "Basic search",
      detail: "Search only, no quick command actions",
    },
    monday: {
      status: "no",
      headline: "Limited",
      detail: "Mouse-heavy dropdown navigation",
    },
  },
  {
    name: "Total Stack Monthly Cost",
    category: "Pricing",
    ropimo: {
      status: "yes",
      headline: "$10–$19 / seat",
      detail: "1 tool covers tasks, meetings, HR, & files",
    },
    clickup: {
      status: "no",
      headline: "$19–$28 / seat",
      detail: "Plus $100+/mo in stacked external tools",
    },
    asana: {
      status: "no",
      headline: "$25–$30 / seat",
      detail: "Plus $100+/mo for Zoom, ATS, and storage",
    },
    monday: {
      status: "no",
      headline: "$24–$32 / seat",
      detail: "Expensive tier gating on essential features",
    },
  },
];

export function ComparisonSection() {
  const [activeCompetitor, setActiveCompetitor] = useState<"all" | "clickup" | "asana" | "monday">("all");

  return (
    <section id="compare" className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 px-4 sm:px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)] border-t border-[#E9E6DA]">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Section Header (Authentic, No marketing fluff) */}
        <div className="text-center max-w-2xl mx-auto flex flex-col items-center mb-10 sm:mb-14">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#EFECE0] text-[11.5px] font-bold text-neutral-800 tracking-wider uppercase mb-4 select-none border border-[#E0DCCF]">
            The Honest Comparison
          </span>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-[52px] font-[800] tracking-[-0.035em] text-[#111111] leading-[1.08]"
          >
            Why teams switch from ClickUp and Asana.
          </motion.h2>

          <p className="mt-4 text-[15px] sm:text-[17px] text-[#6B6B6B] leading-relaxed font-medium">
            Most teams pay for a project management tool, then still end up buying separate software for meetings, hiring, and company files. Ropimo puts your whole office in one calm sheet.
          </p>
        </div>

        {/* Clean Flat Comparison Matrix Card (ZERO shadows, crisp hairlines) */}
        <div className="w-full bg-white rounded-[24px] sm:rounded-[28px] border border-[#E9E6DA] overflow-hidden">
          {/* Header Bar with Competitor Tabs for Mobile */}
          <div className="px-6 py-5 bg-[#FAF9F6] border-b border-[#E9E6DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1F9D55]" />
              <span className="text-xs sm:text-sm font-bold text-[#111111]">
                Real Capabilities Breakdown
              </span>
            </div>

            {/* Mobile Column Switcher */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { key: "all", label: "Show All" },
                { key: "clickup", label: "vs ClickUp" },
                { key: "asana", label: "vs Asana" },
                { key: "monday", label: "vs Monday" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveCompetitor(tab.key as "all" | "clickup" | "asana" | "monday")}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                    activeCompetitor === tab.key
                      ? "bg-[#111111] text-white border-[#111111]"
                      : "bg-[#EFECE0] text-neutral-700 border-[#E0DCCF] hover:bg-[#E7E3D5]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-[#E9E6DA] bg-white">
                  <th className="py-4 px-5 sm:px-7 font-bold text-neutral-400 uppercase text-[10px] sm:text-[11px] tracking-wider w-[30%] sm:w-[28%]">
                    Capability
                  </th>

                  {/* Ropimo Column (Featured, subtle warm cream tint, 1px hairlines) */}
                  <th className="py-4 px-4 sm:px-6 bg-[#FAF9F6] border-x border-[#E9E6DA] w-[26%] sm:w-[24%]">
                    <div className="flex flex-col items-start gap-1">
                      <img
                        src="/logo/ropimo-logo.png"
                        alt="Ropimo"
                        className="h-6 sm:h-7 w-auto object-contain"
                      />
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#111111] text-white text-[9px] font-bold tracking-wide">
                          All-in-One
                        </span>
                        <span className="text-[11px] text-[#6B6B6B] font-semibold">
                          $10 flat / mo
                        </span>
                      </div>
                    </div>
                  </th>

                  {/* ClickUp Column */}
                  {(activeCompetitor === "all" || activeCompetitor === "clickup") && (
                    <th className="py-4 px-4 sm:px-5 w-[16%] text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <img
                          src="/logo/comp/clickup-seeklogo.png"
                          alt="ClickUp"
                          className="h-5 sm:h-6 w-auto object-contain max-w-[110px]"
                        />
                        <span className="text-[10px] text-neutral-400 font-medium">
                          $19–$28 / mo
                        </span>
                      </div>
                    </th>
                  )}

                  {/* Asana Column */}
                  {(activeCompetitor === "all" || activeCompetitor === "asana") && (
                    <th className="py-4 px-4 sm:px-5 w-[16%] text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <img
                          src="/logo/comp/asana-seeklogo.png"
                          alt="Asana"
                          className="h-5 sm:h-6 w-auto object-contain max-w-[105px]"
                        />
                        <span className="text-[10px] text-neutral-400 font-medium">
                          $25–$30 / mo
                        </span>
                      </div>
                    </th>
                  )}

                  {/* Monday.com Column */}
                  {(activeCompetitor === "all" || activeCompetitor === "monday") && (
                    <th className="py-4 px-4 sm:px-5 w-[16%] text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <img
                          src="/logo/comp/monday.png"
                          alt="Monday.com"
                          className="h-4 sm:h-5 w-auto object-contain max-w-[115px]"
                        />
                        <span className="text-[10px] text-neutral-400 font-medium">
                          $24–$32 / mo
                        </span>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E9E6DA]">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={row.name}
                    className={idx % 2 === 0 ? "bg-white" : "bg-[#FAF9F6]/40"}
                  >
                    {/* Feature Name */}
                    <td className="py-4 px-5 sm:px-7 align-middle">
                      <div className="font-bold text-[#111111] leading-snug">
                        {row.name}
                      </div>
                      {row.category && (
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide block mt-0.5">
                          {row.category}
                        </span>
                      )}
                    </td>

                    {/* Ropimo Winner Cell */}
                    <td className="py-4 px-4 sm:px-6 bg-[#FAF9F6] border-x border-[#E9E6DA] align-middle">
                      <div className="flex items-start gap-2">
                        <span className="h-4 w-4 rounded-full bg-[#EAF4E2] text-[#1F9D55] flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111111] text-xs">
                            {row.ropimo.headline}
                          </span>
                          <span className="text-[11px] text-[#6B6B6B] mt-0.5 leading-snug">
                            {row.ropimo.detail}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ClickUp Cell */}
                    {(activeCompetitor === "all" || activeCompetitor === "clickup") && (
                      <td className="py-4 px-4 sm:px-5 align-middle text-center">
                        <div className="flex flex-col items-center">
                          {row.clickup.status === "yes" ? (
                            <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 mb-1">
                              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                          ) : row.clickup.status === "partial" ? (
                            <span className="h-4 w-4 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mb-1">
                              <Minus className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0 mb-1">
                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                          )}
                          <span className="font-semibold text-neutral-800 text-[11px]">
                            {row.clickup.headline}
                          </span>
                          <span className="text-[10px] text-neutral-400 leading-tight mt-0.5 max-w-[130px] hidden sm:block">
                            {row.clickup.detail}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Asana Cell */}
                    {(activeCompetitor === "all" || activeCompetitor === "asana") && (
                      <td className="py-4 px-4 sm:px-5 align-middle text-center">
                        <div className="flex flex-col items-center">
                          {row.asana.status === "yes" ? (
                            <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 mb-1">
                              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                          ) : row.asana.status === "partial" ? (
                            <span className="h-4 w-4 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mb-1">
                              <Minus className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0 mb-1">
                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                          )}
                          <span className="font-semibold text-neutral-800 text-[11px]">
                            {row.asana.headline}
                          </span>
                          <span className="text-[10px] text-neutral-400 leading-tight mt-0.5 max-w-[130px] hidden sm:block">
                            {row.asana.detail}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Monday Cell */}
                    {(activeCompetitor === "all" || activeCompetitor === "monday") && (
                      <td className="py-4 px-4 sm:px-5 align-middle text-center">
                        <div className="flex flex-col items-center">
                          {row.monday.status === "yes" ? (
                            <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 mb-1">
                              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                          ) : row.monday.status === "partial" ? (
                            <span className="h-4 w-4 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mb-1">
                              <Minus className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="h-4 w-4 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0 mb-1">
                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                          )}
                          <span className="font-semibold text-neutral-800 text-[11px]">
                            {row.monday.headline}
                          </span>
                          <span className="text-[10px] text-neutral-400 leading-tight mt-0.5 max-w-[130px] hidden sm:block">
                            {row.monday.detail}
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ComparisonSection;

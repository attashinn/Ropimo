"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";

interface DepartmentConfig {
  id: string;
  name: string;
  headline: string;
  highlightWord: string; // the coloured word at end of headline (like "Done.")
  description: string;
  ctaLabel: string;
  accentColor: string; // highlight word colour
  tableTitle: string;
  items: {
    title: string;
    owner: { name: string; avatar: string };
    status: { label: string; color: string; bg: string };
    date: string;
    tag: string;
  }[];
  assistantPrompt: string;
  assistantAction: string;
}

const DEPARTMENTS: DepartmentConfig[] = [
  {
    id: "marketing",
    name: "Marketing",
    headline: "Posts, campaigns and launches.",
    highlightWord: "Done.",
    description:
      "Coordinate product launches, content calendars, and brand deliverables with live asset reviews and zero email back-and-forth.",
    ctaLabel: "Start for free",
    accentColor: "#FF6B3D",
    tableTitle: "Global Brand Campaign",
    items: [
      {
        title: "Q4 Product Launch Marquee Video",
        owner: { name: "Ellyse P.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Review", color: "#D99A00", bg: "#FEF6E4" },
        date: "Oct 24",
        tag: "Video",
      },
      {
        title: "Landing Page Copy & SEO Optimization",
        owner: { name: "Stokes H.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Completed", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 20",
        tag: "Web",
      },
      {
        title: "Social Distribution Asset Pack",
        owner: { name: "Sarah M.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Progress", color: "#3B63F0", bg: "#EEF2FF" },
        date: "Oct 28",
        tag: "Design",
      },
      {
        title: "Brand Identity Refresh Guidelines",
        owner: { name: "Alyssa C.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Not Started", color: "#9A9A9A", bg: "#F4F4F4" },
        date: "Nov 2",
        tag: "Brand",
      },
    ],
    assistantPrompt: "Generate launch timeline for Q4 video",
    assistantAction: "Schedule review meeting & notify video editors",
  },
  {
    id: "it",
    name: "IT",
    headline: "Tickets, infra and incidents.",
    highlightWord: "Resolved.",
    description:
      "Centralise IT requests, track system incidents, and manage vendor contracts all from one shared workspace without juggling tools.",
    ctaLabel: "Start for free",
    accentColor: "#3B63F0",
    tableTitle: "IT Operations Board",
    items: [
      {
        title: "Cloud Migration — Phase 2 Cutover",
        owner: { name: "Conway D.", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Progress", color: "#3B63F0", bg: "#EEF2FF" },
        date: "Oct 30",
        tag: "Infra",
      },
      {
        title: "SSO & SAML Integration for Enterprise",
        owner: { name: "Starc B.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Completed", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 18",
        tag: "Security",
      },
      {
        title: "Hardware Refresh — Design Team Laptops",
        owner: { name: "Ellyse P.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Review", color: "#D99A00", bg: "#FEF6E4" },
        date: "Nov 5",
        tag: "Assets",
      },
      {
        title: "Annual Vendor License Renewals",
        owner: { name: "Stokes H.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Not Started", color: "#9A9A9A", bg: "#F4F4F4" },
        date: "Nov 15",
        tag: "Contracts",
      },
    ],
    assistantPrompt: "Summarise open incidents this week",
    assistantAction: "Found 2 open P1 tickets — escalated to on-call engineer",
  },
  {
    id: "product",
    name: "Product",
    headline: "Sprints, specs and roadmaps.",
    highlightWord: "Aligned.",
    description:
      "Connect user feedback to engineering tickets. Track live sprint velocity, PR reviews, and blocker items without heavy Jira setup.",
    ctaLabel: "Start for free",
    accentColor: "#7ED08A",
    tableTitle: "Sprint 32 — Core Engine",
    items: [
      {
        title: "Real-time Presence WebSockets Protocol",
        owner: { name: "Conway D.", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Progress", color: "#3B63F0", bg: "#EEF2FF" },
        date: "Today",
        tag: "Backend",
      },
      {
        title: "Next.js App Router Performance Pass",
        owner: { name: "Starc B.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Completed", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 18",
        tag: "Frontend",
      },
      {
        title: "Role-Based Access Control Architecture",
        owner: { name: "Alyssa C.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Review", color: "#D99A00", bg: "#FEF6E4" },
        date: "Oct 26",
        tag: "Security",
      },
      {
        title: "Mobile Responsive Audit & Touch Fixes",
        owner: { name: "Sarah M.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Not Started", color: "#9A9A9A", bg: "#F4F4F4" },
        date: "Nov 3",
        tag: "QA",
      },
    ],
    assistantPrompt: "Audit blockers for Sprint 32",
    assistantAction: "Flagged 1 pending PR review & assigned to team lead",
  },
  {
    id: "sales",
    name: "Sales",
    headline: "Deals, pipelines and contracts.",
    highlightWord: "Closed.",
    description:
      "Keep client notes, share meeting summaries with auto-generated action items, and manage deal milestones with zero CRM complexity.",
    ctaLabel: "Start for free",
    accentColor: "#FFE76A",
    tableTitle: "Enterprise Engagements",
    items: [
      {
        title: "Enterprise Annual Contract — Acme Corp",
        owner: { name: "Stokes H.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Review", color: "#D99A00", bg: "#FEF6E4" },
        date: "Oct 25",
        tag: "$48k ARR",
      },
      {
        title: "Client Kickoff Meeting & Scope Alignment",
        owner: { name: "Ellyse P.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Completed", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 17",
        tag: "Call",
      },
      {
        title: "Security & SOC2 Compliance Review Deck",
        owner: { name: "Starc B.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Completed", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 22",
        tag: "Docs",
      },
      {
        title: "Proposal Draft — NovaCraft Expansion",
        owner: { name: "Conway D.", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Progress", color: "#3B63F0", bg: "#EEF2FF" },
        date: "Oct 29",
        tag: "Proposal",
      },
    ],
    assistantPrompt: "Draft post-meeting executive summary",
    assistantAction: "Extracted 4 client action items & created follow-ups",
  },
  {
    id: "hr",
    name: "HR",
    headline: "Hiring, onboarding and leave.",
    highlightWord: "Handled.",
    description:
      "Run your entire candidate pipeline, schedule interviews, store signed employee contracts, and approve time-off requests in one place.",
    ctaLabel: "Start for free",
    accentColor: "#FFCFC2",
    tableTitle: "Recruitment & Team Ops",
    items: [
      {
        title: "Senior Product Designer Interview Loop",
        owner: { name: "Sarah M.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Offer Sent", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 21",
        tag: "Hiring",
      },
      {
        title: "Q4 Staff Attendance & PTO Calendar",
        owner: { name: "Ellyse P.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Active", color: "#3B63F0", bg: "#EEF2FF" },
        date: "Ongoing",
        tag: "People",
      },
      {
        title: "Engineering Onboarding Checklist",
        owner: { name: "Stokes H.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Completed", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 19",
        tag: "Onboarding",
      },
      {
        title: "Leave Policy Document 2026 Update",
        owner: { name: "Alyssa C.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Review", color: "#D99A00", bg: "#FEF6E4" },
        date: "Nov 1",
        tag: "Policy",
      },
    ],
    assistantPrompt: "Prepare offer packet for candidate",
    assistantAction: "Generated standard offer document & sent for review",
  },
  {
    id: "leadership",
    name: "PMO",
    headline: "Goals, OKRs and company rollups.",
    highlightWord: "Visible.",
    description:
      "See company-wide progress without scheduled status interrogations. High-level rollups show exactly what is on track and what is blocked.",
    ctaLabel: "Start for free",
    accentColor: "#D6F786",
    tableTitle: "Company Operations Q4",
    items: [
      {
        title: "Annual Operational Budget & Headcount Plan",
        owner: { name: "Alyssa C.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80" },
        status: { label: "On Track", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Nov 01",
        tag: "Strategy",
      },
      {
        title: "Executive Board Sync & Strategic Priorities",
        owner: { name: "Conway D.", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Scheduled", color: "#3B63F0", bg: "#EEF2FF" },
        date: "Thursday",
        tag: "Meeting",
      },
      {
        title: "Cross-Department OKR Progress Review",
        owner: { name: "Sarah M.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Completed", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 19",
        tag: "OKRs",
      },
      {
        title: "Risk Register — Q4 Delivery Threats",
        owner: { name: "Stokes H.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Review", color: "#D99A00", bg: "#FEF6E4" },
        date: "Oct 31",
        tag: "Risk",
      },
    ],
    assistantPrompt: "Generate Q4 executive overview",
    assistantAction: "Compiled cross-department progress: 92% on schedule",
  },
];

export function DepartmentShowcase() {
  const [activeTab, setActiveTab] = useState("marketing");
  const activeDept = DEPARTMENTS.find((d) => d.id === activeTab) || DEPARTMENTS[0];

  return (
    <section id="workflows" className="relative w-full bg-[#FAF9F6] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)] border-t border-[#E9E6DA]">
      <div className="max-w-6xl mx-auto flex flex-col items-center">

        {/* ── Centered heading (matches ClickUp layout exactly) ─────────────── */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-3xl sm:text-5xl lg:text-[52px] font-[800] tracking-[-0.035em] text-[#111111] leading-[1.08] text-center mb-10 sm:mb-12 max-w-2xl"
        >
          Built for every team in your office.
        </motion.h2>

        {/* ── Pill tab bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap mb-10 sm:mb-14">
          {DEPARTMENTS.map((dept) => {
            const isActive = dept.id === activeTab;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setActiveTab(dept.id)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[12.5px] sm:text-[13.5px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap select-none border ${
                  isActive
                    ? "bg-[#111111] text-white border-[#111111]"
                    : "text-[#6B6B6B] border-[#E9E6DA] hover:border-[#111111] hover:text-[#111111] bg-transparent"
                }`}
              >
                {dept.name}
              </button>
            );
          })}
        </div>

        {/* ── Two-column split (NO card wrapper — matches ClickUp layout) ───── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDept.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
          >
            {/* LEFT: headline + desc + CTA (matches ClickUp left column exactly) */}
            <div className="flex flex-col items-start text-left">
              <h3 className="text-[28px] sm:text-[38px] lg:text-[42px] font-[800] text-[#111111] tracking-tight leading-[1.1]">
                {activeDept.headline}{" "}
                <span style={{ color: activeDept.accentColor }}>
                  {activeDept.highlightWord}
                </span>
              </h3>

              <p className="mt-4 text-[14.5px] sm:text-[16px] text-[#6B6B6B] leading-relaxed font-medium max-w-[420px]">
                {activeDept.description}
              </p>

              <Link
                href="/signup"
                className="mt-7 px-6 py-3 rounded-full bg-[#111111] hover:bg-black text-white text-[13.5px] font-semibold inline-flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{activeDept.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* RIGHT: mockup (replicates ClickUp's split-panel table + AI sidebar) */}
            <div className="w-full relative">
              {/* Main table panel */}
              <div className="w-full bg-white rounded-2xl border border-[#E9E6DA] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]">
                {/* Window chrome */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9E6DA] bg-[#FAF9F6]">
                  <div className="flex items-center gap-2">
                    {/* Traffic light dots */}
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                    <span className="ml-2 text-[12px] font-bold text-[#111111]">
                      {activeDept.tableTitle}
                    </span>
                  </div>

                  {/* View tabs */}
                  <div className="flex items-center gap-1 text-[10.5px] font-semibold">
                    <span className="px-2.5 py-1 rounded-md bg-white border border-[#E9E6DA] text-[#111111]">
                      Main table
                    </span>
                    <span className="px-2 py-1 text-neutral-400 hidden sm:inline">Gantt</span>
                    <span className="px-2 py-1 text-neutral-400 hidden sm:inline">Kanban</span>
                    <span className="px-2 py-1 text-neutral-400 hidden sm:inline">+</span>
                  </div>
                </div>

                {/* Column header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E9E6DA] bg-[#FAF9F6]/60">
                  <span className="flex-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Task</span>
                  <span className="w-16 text-[10px] font-bold text-neutral-400 uppercase tracking-wide text-center hidden sm:block">Tag</span>
                  <span className="w-20 text-[10px] font-bold text-neutral-400 uppercase tracking-wide text-center">Status</span>
                  <span className="w-10 text-[10px] font-bold text-neutral-400 uppercase tracking-wide text-center hidden md:block">Date</span>
                  <span className="w-6" />
                </div>

                {/* Table rows */}
                <div className="divide-y divide-[#E9E6DA]">
                  {activeDept.items.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#FAF9F6]/80 transition-colors"
                    >
                      {/* Checkbox */}
                      <span className="w-3 h-3 rounded border border-[#D8DDD4] shrink-0" />

                      {/* Task name */}
                      <span className="flex-1 text-[11.5px] sm:text-[12.5px] font-semibold text-[#111111] truncate">
                        {item.title}
                      </span>

                      {/* Tag */}
                      <span className="w-16 text-center hidden sm:block">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold text-neutral-500 bg-[#F4F4F4] border border-[#E9E6DA]">
                          {item.tag}
                        </span>
                      </span>

                      {/* Status pill */}
                      <span className="w-20 text-center">
                        <span
                          style={{ color: item.status.color, backgroundColor: item.status.bg }}
                          className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold whitespace-nowrap"
                        >
                          {item.status.label}
                        </span>
                      </span>

                      {/* Date */}
                      <span className="w-10 text-[10px] text-neutral-400 font-medium text-center hidden md:block">
                        {item.date}
                      </span>

                      {/* Avatar */}
                      <img
                        src={item.owner.avatar}
                        alt={item.owner.name}
                        title={item.owner.name}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-white shrink-0"
                      />
                    </div>
                  ))}
                </div>

                {/* Ropimo AI assistant strip at bottom */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-t border-[#E9E6DA] bg-[#FAF9F6]">
                  <div className="w-6 h-6 rounded-lg bg-[#111111] text-[#D6F786] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#111111]">Ropimo AI</span>
                      <span className="text-[9.5px] text-neutral-400 font-medium">• Just now</span>
                    </div>
                    <span className="text-[10.5px] text-[#6B6B6B] truncate">
                      {activeDept.assistantAction}
                    </span>
                  </div>

                  {/* "Find" chip — mirrors ClickUp's right-side action bubble */}
                  <div className="ml-auto shrink-0 flex items-center gap-1.5 bg-[#111111] text-white rounded-full px-3 py-1.5 text-[10px] font-bold cursor-pointer hover:bg-black transition-colors whitespace-nowrap">
                    <Sparkles className="w-2.5 h-2.5 text-[#D6F786]" />
                    {activeDept.assistantPrompt.split(" ").slice(0, 3).join(" ")}…
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

export default DepartmentShowcase;

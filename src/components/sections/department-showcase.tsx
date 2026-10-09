"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Check } from "lucide-react";

interface TaskItem {
  title: string;
  owner: { name: string; avatar: string };
  status: { label: string; color: string; bg: string };
  date: string;
  tag: string;
}

interface Department {
  id: string;
  name: string;
  headline: string;
  highlightWord: string;
  description: string;
  ctaLabel: string;
  accentColor: string;
  tableTitle: string;
  mobileBg: string;
  mobileFeatureTitle: string;
  mobileSubtitle: string;
  items: TaskItem[];
  assistantPrompt: string;
  assistantAction: string;
}

const DEPARTMENTS: Department[] = [
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
    mobileBg: "#F0E8FC",
    mobileFeatureTitle: "Campaign Pipeline",
    mobileSubtitle: "Coordinate launches, assets & calendars",
    items: [
      {
        title: "Q4 Product Launch Marquee Video",
        owner: { name: "Sarah M.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" },
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
        owner: { name: "Ellyse P.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" },
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
    assistantPrompt: "Schedule launch review meeting with all stakeholders",
    assistantAction: "Calendar invites sent for Thursday 10:00 AM with agenda attached",
  },
  {
    id: "it",
    name: "IT",
    headline: "Uptime, deployments and tickets.",
    highlightWord: "Resolved.",
    description:
      "Manage incident triage, access approvals, security audits, and infrastructure tasks with clear ownership across shifts.",
    ctaLabel: "Start for free",
    accentColor: "#3B63F0",
    tableTitle: "IT Operations Board",
    mobileBg: "#EAF2FF",
    mobileFeatureTitle: "Incident & Cloud Ops",
    mobileSubtitle: "Uptime, access requests & deployments",
    items: [
      {
        title: "Cloud Migration: Phase 2 Cutover",
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
        title: "Hardware Refresh: Design Team Laptops",
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
    assistantPrompt: "Check on-call alerts for Sprint 32 cutover",
    assistantAction: "Zero critical alerts detected. SSO audit signed off",
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
    tableTitle: "Sprint 32: Core Engine",
    mobileBg: "#EAF6ED",
    mobileFeatureTitle: "Sprint Velocity",
    mobileSubtitle: "Sprints, specs & roadmaps aligned",
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
        title: "OAuth 2.0 Token Revocation Handler",
        owner: { name: "Stokes H.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Review", color: "#D99A00", bg: "#FEF6E4" },
        date: "Oct 27",
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
    assistantPrompt: "Audit blockers for Sprint 32 delivery",
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
    accentColor: "#FF9F1C",
    tableTitle: "Sales Pipeline Q4",
    mobileBg: "#FFF4E8",
    mobileFeatureTitle: "Deal Flow & CRM",
    mobileSubtitle: "Pipelines, client notes & contracts closed",
    items: [
      {
        title: "Acme Corp: 250 Seat Enterprise Deal",
        owner: { name: "Alyssa C.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Proposal", color: "#3B63F0", bg: "#EEF2FF" },
        date: "Oct 29",
        tag: "Enterprise",
      },
      {
        title: "VentureScale: Annual Plan Renewal",
        owner: { name: "Stokes H.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Closed Won", color: "#1F9D55", bg: "#EAF4E2" },
        date: "Oct 15",
        tag: "Renewal",
      },
      {
        title: "FintechStack: Security Review & MSA",
        owner: { name: "Conway D.", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Legal", color: "#D99A00", bg: "#FEF6E4" },
        date: "Nov 4",
        tag: "Legal",
      },
      {
        title: "Alpha Labs: Custom SLA Proposal",
        owner: { name: "Starc B.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" },
        status: { label: "Negotiating", color: "#9A9A9A", bg: "#F4F4F4" },
        date: "Nov 12",
        tag: "Mid-Market",
      },
    ],
    assistantPrompt: "Send post-meeting recap & draft action items",
    assistantAction: "Sent summary to Acme Corp with 3 follow-up tasks created",
  },
  {
    id: "hr",
    name: "HR",
    headline: "Hiring, onboarding and leave.",
    highlightWord: "Handled.",
    description:
      "Run your entire candidate pipeline, schedule interviews, store signed employee contracts, and approve time-off requests in one place.",
    ctaLabel: "Start for free",
    accentColor: "#8B5CF6",
    tableTitle: "Recruitment & Team Ops",
    mobileBg: "#F5EEFD",
    mobileFeatureTitle: "Hiring & ATS Loop",
    mobileSubtitle: "Candidate pipelines & offer sign-offs",
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
    assistantPrompt: "Prepare standard offer packet for finalist",
    assistantAction: "Offer letter signed in 18 minutes. Onboarding initiated",
  },
  {
    id: "leadership",
    name: "PMO",
    headline: "Goals, OKRs and company rollups.",
    highlightWord: "Visible.",
    description:
      "See company-wide progress without scheduled status interrogations. High-level rollups show exactly what is on track and what is blocked.",
    ctaLabel: "Start for free",
    accentColor: "#52B21E",
    tableTitle: "Company Operations Q4",
    mobileBg: "#F3F7E5",
    mobileFeatureTitle: "Executive OKR Rollup",
    mobileSubtitle: "Cross-department goals & risks visible",
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
        title: "Risk Register: Q4 Delivery Threats",
        owner: { name: "Stokes H.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        status: { label: "In Review", color: "#D99A00", bg: "#FEF6E4" },
        date: "Oct 31",
        tag: "Risk",
      },
    ],
    assistantPrompt: "Compile cross-department Q4 progress summary",
    assistantAction: "All 5 departments reported: 94% of milestones on schedule",
  },
];

export function DepartmentShowcase() {
  const [activeTab, setActiveTab] = useState("marketing");
  const activeDept = DEPARTMENTS.find((d) => d.id === activeTab) || DEPARTMENTS[0];
  const carouselRef = useRef<HTMLDivElement>(null);

  // Scroll mobile carousel when tab is tapped
  const handleTabClick = (deptId: string, index: number) => {
    setActiveTab(deptId);
    if (carouselRef.current) {
      const card = carouselRef.current.children[index] as HTMLElement;
      if (card) {
        card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  // Sync tab highlight on mobile scroll
  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;
    const cardWidth = (container.children[0] as HTMLElement)?.offsetWidth || 300;
    const activeIndex = Math.round(scrollLeft / (cardWidth + 14));
    if (DEPARTMENTS[activeIndex] && DEPARTMENTS[activeIndex].id !== activeTab) {
      setActiveTab(DEPARTMENTS[activeIndex].id);
    }
  };

  return (
    <section
      id="workflows"
      className="relative w-full bg-[#FAF9F6] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)] border-t border-[#E9E6DA]"
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* ── Heading ───────────────────────────────────────────────────────── */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-3xl sm:text-5xl lg:text-[52px] font-[800] tracking-[-0.035em] text-[#111111] leading-[1.08] text-center mb-6 sm:mb-10 max-w-2xl"
        >
          Built for every team in your office.
        </motion.h2>

        {/* ── Pill Tab Bar (Horizontal Scrollable on Mobile, Centered on Desktop) ─ */}
        <div className="w-full max-w-3xl overflow-x-auto no-scrollbar flex items-center justify-start lg:justify-center gap-1.5 pb-2 mb-4 sm:mb-12 px-1">
          {DEPARTMENTS.map((dept, idx) => {
            const isActive = dept.id === activeTab;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => handleTabClick(dept.id, idx)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[12.5px] sm:text-[13.5px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap select-none shrink-0 border ${
                  isActive
                    ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                    : "text-[#6B6B6B] border-[#E9E6DA] hover:border-[#111111] hover:text-[#111111] bg-white lg:bg-transparent"
                }`}
              >
                {dept.name}
              </button>
            );
          })}
        </div>

        {/* ── MOBILE VIEW: monday.com-Style Horizontal Card Carousel (Visible on mobile/tablet) ─ */}
        <div className="block lg:hidden w-full mt-2">
          {/* Subtitle description */}
          <p className="text-[13.5px] text-[#555555] font-medium leading-relaxed text-center px-4 mb-5 max-w-md mx-auto">
            {activeDept.description}
          </p>

          {/* Carousel Track with Sibling Cards Peeking (exact match to monday.com screenshot!) */}
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="w-full overflow-x-auto snap-x snap-mandatory flex gap-3.5 px-4 -mx-4 no-scrollbar pb-6 pt-1"
            style={{ scrollPaddingLeft: "16px", scrollPaddingRight: "16px" }}
          >
            {DEPARTMENTS.map((dept) => (
              <div
                key={dept.id}
                className="w-[84vw] max-w-[340px] shrink-0 snap-center rounded-[28px] p-5 sm:p-6 shadow-sm border border-black/[0.06] flex flex-col justify-between select-none"
                style={{ backgroundColor: dept.mobileBg }}
              >
                {/* 1. Header (Title + Subtitle) */}
                <div>
                  <h4 className="text-[21px] font-[800] text-[#111111] tracking-tight leading-tight">
                    {dept.mobileFeatureTitle}
                  </h4>
                  <p className="text-[12.5px] font-medium text-[#555555] mt-1 leading-snug">
                    {dept.mobileSubtitle}
                  </p>

                  {/* 2. Interactive Speech Bubbles (matches monday.com screenshot) */}
                  <div className="mt-4 flex flex-col gap-2.5">
                    {/* User / Stakeholder bubble */}
                    <div className="bg-white/95 rounded-2xl p-3 shadow-xs border border-black/[0.04] flex items-center justify-between gap-2.5">
                      <p className="text-[12.5px] font-medium text-[#111111] leading-snug">
                        {dept.assistantPrompt}
                      </p>
                      <img
                        src={dept.items[0].owner.avatar}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-black/10"
                      />
                    </div>

                    {/* Agent / Assistant bubble */}
                    <div className="bg-white/90 rounded-2xl p-3 shadow-xs border border-black/[0.04] flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-[#111111] text-[#D6F786] flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[12px] font-medium text-[#222222] leading-snug">
                        {dept.assistantAction}
                      </p>
                    </div>
                  </div>

                  {/* 3. Mini Mockup Table/Board Preview Widget */}
                  <div className="mt-4 bg-white rounded-2xl p-3 border border-black/[0.06] shadow-xs">
                    {/* Mini header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0EDE4]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
                        <span className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
                        <span className="w-2 h-2 rounded-full bg-[#28C840]" />
                        <span className="ml-1 text-[11.5px] font-bold text-[#111111]">
                          {dept.tableTitle}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF9F6] text-neutral-600 border border-[#E9E6DA]">
                        Live
                      </span>
                    </div>

                    {/* 2 Mini task rows */}
                    <div className="flex flex-col gap-2">
                      {dept.items.slice(0, 2).map((item) => (
                        <div
                          key={item.title}
                          className="flex items-center justify-between gap-2 text-[11.5px]"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-3 h-3 rounded border border-neutral-300 shrink-0 inline-flex items-center justify-center">
                              {item.status.label === "Completed" && (
                                <Check className="w-2.5 h-2.5 text-[#1F9D55]" />
                              )}
                            </span>
                            <span className="font-semibold text-[#111111] truncate">
                              {item.title}
                            </span>
                          </div>
                          <span
                            style={{ color: item.status.color, backgroundColor: item.status.bg }}
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                          >
                            {item.status.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Action CTA */}
                <Link
                  href="/signup"
                  className="mt-4 w-full h-10 rounded-full bg-[#111111] hover:bg-black text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <span>Start for free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── DESKTOP VIEW: Split Column ClickUp-Style Layout (Visible on desktop) ─ */}
        <div className="hidden lg:block w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDept.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="w-full grid grid-cols-2 gap-16 items-center"
            >
              {/* LEFT: headline + desc + CTA */}
              <div className="flex flex-col items-start text-left">
                <h3 className="text-[42px] font-[800] text-[#111111] tracking-tight leading-[1.1]">
                  {activeDept.headline}{" "}
                  <span style={{ color: activeDept.accentColor }}>
                    {activeDept.highlightWord}
                  </span>
                </h3>

                <p className="mt-4 text-[16px] text-[#6B6B6B] leading-relaxed font-medium max-w-[420px]">
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

              {/* RIGHT: mockup (split-panel table + AI footer) */}
              <div className="w-full relative">
                <div className="w-full bg-white rounded-2xl border border-[#E9E6DA] overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]">
                  {/* Window chrome */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9E6DA] bg-[#FAF9F6]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                      <span className="ml-2 text-[12px] font-bold text-[#111111]">
                        {activeDept.tableTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10.5px] font-semibold">
                      <span className="px-2.5 py-1 rounded-md bg-white border border-[#E9E6DA] text-[#111111]">
                        Main table
                      </span>
                      <span className="px-2 py-1 text-neutral-400">Gantt</span>
                      <span className="px-2 py-1 text-neutral-400">Kanban</span>
                      <span className="px-2 py-1 text-neutral-400">+</span>
                    </div>
                  </div>

                  {/* Column header */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E9E6DA] bg-[#FAF9F6]/60">
                    <span className="flex-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      Task
                    </span>
                    <span className="w-16 text-[10px] font-bold text-neutral-400 uppercase tracking-wide text-center">
                      Tag
                    </span>
                    <span className="w-20 text-[10px] font-bold text-neutral-400 uppercase tracking-wide text-center">
                      Status
                    </span>
                    <span className="w-10 text-[10px] font-bold text-neutral-400 uppercase tracking-wide text-center">
                      Date
                    </span>
                    <span className="w-6" />
                  </div>

                  {/* Table rows */}
                  <div className="divide-y divide-[#E9E6DA]">
                    {activeDept.items.map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#FAF9F6]/80 transition-colors"
                      >
                        <span className="w-3 h-3 rounded border border-[#D8DDD4] shrink-0" />
                        <span className="flex-1 text-[12.5px] font-semibold text-[#111111] truncate">
                          {item.title}
                        </span>
                        <span className="w-16 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold text-neutral-500 bg-[#F4F4F4] border border-[#E9E6DA]">
                            {item.tag}
                          </span>
                        </span>
                        <span className="w-20 text-center">
                          <span
                            style={{ color: item.status.color, backgroundColor: item.status.bg }}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                          >
                            {item.status.label}
                          </span>
                        </span>
                        <span className="w-10 text-[10px] text-neutral-400 font-medium text-center">
                          {item.date}
                        </span>
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
      </div>
    </section>
  );
}

export default DepartmentShowcase;

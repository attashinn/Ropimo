"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import {
  ChevronDown,
  Menu,
  X,
  Layers,
  FileText,
  Users,
  Kanban,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Workflows", href: "#workflows" },
  { label: "Compare", href: "#compare" },
  { label: "Reviews", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const PRODUCT_MODULES = [
  {
    title: "Tasks & Sprints",
    desc: "Kanban boards, Gantt timelines, subtasks & real-time owners",
    icon: Kanban,
    color: "#3B63F0",
    bg: "#EEF2FF",
  },
  {
    title: "Department Workflows",
    desc: "Pre-built pipelines for Marketing, IT, Sales, HR & PMO",
    icon: Layers,
    color: "#1F9D55",
    bg: "#EAF4E2",
  },
  {
    title: "Live Docs & Notes",
    desc: "Meeting agendas that automatically turn into action items",
    icon: FileText,
    color: "#FF6B3D",
    bg: "#FFF0EB",
  },
  {
    title: "Hiring & ATS",
    desc: "Candidate scorecards, interview stages and offer sign-offs",
    icon: Users,
    color: "#8B5CF6",
    bg: "#F5F3FF",
  },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setScrolled(latest > 20);
    });
  }, [scrollY]);

  return (
    <>
      {/* ── Fixed Floating Navbar Wrapper (Always pinned & visible on scroll) ── */}
      <header className="fixed top-0 left-0 right-0 z-[100] px-4 sm:px-6 pt-3 sm:pt-4 pointer-events-none flex justify-center font-[family-name:var(--font-plus-jakarta)]">
        {/* ── Floating Pill Bar ── */}
        <nav
          aria-label="Main Navigation"
          className={`pointer-events-auto relative w-full max-w-6xl transition-all duration-200 ease-out rounded-full px-4 sm:px-6 flex items-center justify-between select-none ${
            scrolled
              ? "h-[58px] bg-white/90 backdrop-blur-xl border border-neutral-200/80 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.07)]"
              : "h-[62px] bg-white/80 backdrop-blur-md border border-neutral-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
          }`}
        >
          {/* ── LEFT: Official Ropimo Logo + Wordmark (Clean, no extra badges) ── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 sm:gap-3 group shrink-0"
            aria-label="Ropimo Home"
          >
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center">
              <Image
                src="/logo/favicon.png"
                alt="Ropimo"
                width={36}
                height={36}
                className="w-full h-full object-contain rounded-xl"
                priority
              />
            </div>

            <span className="font-[800] tracking-[-0.04em] text-[#111111] text-[19px] sm:text-[20px] leading-none">
              Ropimo
            </span>
          </Link>

          {/* ── CENTER: Clean Desktop Navigation ── */}
          <div
            className="hidden md:flex items-center gap-1 relative"
            onMouseLeave={() => setHoveredNav(null)}
          >
            {/* Product Dropdown Trigger */}
            <div
              className="relative"
              onMouseEnter={() => {
                setHoveredNav("Product");
                setProductOpen(true);
              }}
              onMouseLeave={() => setProductOpen(false)}
            >
              <button
                type="button"
                className={`relative z-10 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13.5px] font-semibold transition-colors cursor-pointer ${
                  productOpen || hoveredNav === "Product"
                    ? "text-[#111111]"
                    : "text-[#555555] hover:text-[#111111]"
                }`}
              >
                Product
                <motion.span
                  animate={{ rotate: productOpen ? 180 : 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </motion.span>
              </button>

              {/* Clean Minimalist Mega Dropdown */}
              <AnimatePresence>
                {productOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute top-[calc(100%+8px)] -left-6 w-[360px] z-50 pointer-events-auto"
                  >
                    <div className="bg-white rounded-2xl p-2.5 shadow-[0_16px_48px_-10px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] border border-neutral-100">
                      <div className="grid grid-cols-1 gap-1">
                        {PRODUCT_MODULES.map((item) => {
                          const IconComp = item.icon;
                          return (
                            <Link
                              key={item.title}
                              href="#workflows"
                              onClick={() => setProductOpen(false)}
                              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors group/item"
                            >
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover/item:scale-105"
                                style={{ backgroundColor: item.bg, color: item.color }}
                              >
                                <IconComp className="w-4.5 h-4.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13.5px] font-bold text-[#111111]">
                                  {item.title}
                                </div>
                                <p className="text-[12px] text-[#6B6B6B] leading-snug mt-0.5">
                                  {item.desc}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Nav Links with Smooth Sliding Indicator */}
            {NAV_ITEMS.map((item) => {
              const isHovered = hoveredNav === item.label;
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setHoveredNav(item.label)}
                >
                  <Link
                    href={item.href}
                    className={`relative z-10 block px-3.5 py-1.5 rounded-full text-[13.5px] font-semibold transition-colors ${
                      isHovered ? "text-[#111111]" : "text-[#555555] hover:text-[#111111]"
                    }`}
                  >
                    {item.label}
                  </Link>

                  {isHovered && (
                    <motion.div
                      layoutId="navbar-hover-pill"
                      className="absolute inset-0 bg-black/[0.05] rounded-full -z-0 pointer-events-none"
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── RIGHT: Clean Real SaaS Action Buttons ── */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Log in link */}
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-full text-[13.5px] font-semibold text-[#111111] hover:bg-black/5 transition-colors"
            >
              Log in
            </Link>

            {/* Primary Action Button (Clean, Non-AI, Premium SaaS style) */}
            <Link
              href="/signup"
              className="inline-flex items-center justify-center h-9 sm:h-9.5 px-4.5 sm:px-5 rounded-full text-[13px] font-bold text-white bg-[#111111] hover:bg-black transition-all shadow-sm active:scale-[0.98] shrink-0"
            >
              Get started free
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-full text-[#111111] hover:bg-black/5 transition-colors cursor-pointer"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mobileOpen ? "close" : "open"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile Slide-In Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] md:hidden font-[family-name:var(--font-plus-jakarta)]"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 bottom-0 w-[84vw] max-w-sm bg-white shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#F0EDE4]">
                <Link
                  href="/"
                  className="flex items-center gap-2.5"
                  onClick={() => setMobileOpen(false)}
                >
                  <Image
                    src="/logo/favicon.png"
                    alt="Ropimo"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-xl object-contain"
                  />
                  <span className="text-[19px] font-extrabold tracking-[-0.04em] text-[#111111]">
                    Ropimo
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-full hover:bg-[#FAF9F6] text-[#111111]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-2">
                  Modules
                </p>
                {PRODUCT_MODULES.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <Link
                      key={item.title}
                      href="#workflows"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.bg, color: item.color }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[13.5px] font-bold text-[#111111]">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] truncate max-w-[210px]">
                          {item.desc}
                        </div>
                      </div>
                    </Link>
                  );
                })}

                <div className="h-px bg-[#F0EDE4] my-3" />

                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-2">
                  Navigation
                </p>
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 rounded-xl text-[14px] font-semibold text-[#111111] hover:bg-[#FAF9F6] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Actions */}
              <div className="px-5 py-5 border-t border-[#F0EDE4] flex flex-col gap-2.5 bg-[#FAF9F6]/50">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full h-11 rounded-full border border-[#E9E6DA] bg-white text-[13.5px] font-bold text-[#111111] flex items-center justify-center hover:bg-neutral-50 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="w-full h-11 rounded-full text-[13.5px] font-bold text-white bg-[#111111] hover:bg-black flex items-center justify-center transition-colors shadow-sm"
                >
                  Get started free
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

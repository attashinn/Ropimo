"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";

export function Navbar() {
  const [pagesOpen, setPagesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "#" },
    { label: "About Us", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Pages", href: "#", hasDropdown: true },
    { label: "Pricing", href: "#" },
  ];

  const pagesDropdown = [
    { label: "Features", desc: "Core capabilities & workflows", href: "#" },
    { label: "Integrations", desc: "Sync with your favorite tools", href: "#" },
    { label: "Changelog", desc: "Latest product updates", href: "#" },
    { label: "Documentation", desc: "Setup guides & API reference", href: "#" },
  ];

  return (
    <header
      className="relative z-50 w-full pt-4 px-4 sm:px-6"
    >
      <nav
        aria-label="Main Navigation"
        className="mx-auto max-w-6xl h-[62px] bg-white rounded-2xl sm:rounded-full px-4 sm:px-6 flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.05)] border border-neutral-200/50 font-[family-name:var(--font-plus-jakarta)]"
      >
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center shadow-sm">
            {/* White rounded-square list glyph */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <rect
                x="3"
                y="3"
                width="14"
                height="14"
                rx="3.5"
                stroke="white"
                strokeWidth="1.8"
              />
              <path
                d="M6.5 7.5H13.5M6.5 10H13.5M6.5 12.5H10.5"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-[20px] font-extrabold tracking-[-0.03em] text-[#111111]">
            TaskTide
          </span>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#333333]">
          {navLinks.map((item) => {
            if (item.hasDropdown) {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setPagesOpen(true)}
                  onMouseLeave={() => setPagesOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setPagesOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 transition-colors hover:text-[#111111] py-2 focus:outline-none cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
                        pagesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {pagesOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64"
                      >
                        <div className="bg-white rounded-2xl p-2 shadow-[0_12px_36px_rgba(0,0,0,0.1)] border border-neutral-100">
                          {pagesDropdown.map((page) => (
                            <Link
                              key={page.label}
                              href={page.href}
                              className="block p-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors"
                            >
                              <div className="text-[13px] font-semibold text-[#111111]">
                                {page.label}
                              </div>
                              <div className="text-[11px] text-[#6B6B6B]">
                                {page.desc}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-[#111111]"
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right: Controls & Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language selector pill */}
          <button
            type="button"
            className="h-9 px-3 bg-[#EFECE0] hover:bg-[#E7E3D5] rounded-full flex items-center gap-1.5 text-xs font-semibold text-[#111111] transition-colors cursor-pointer"
          >
            {/* UK Flag SVG */}
            <span className="w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center shrink-0 shadow-xs">
              <svg viewBox="0 0 60 30" width="16" height="16" className="w-full h-full object-cover">
                <clipPath id="uk-flag">
                  <path d="M0 0v30h60V0z"/>
                </clipPath>
                <path d="M0 0v30h60V0z" fill="#012169"/>
                <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                <path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" strokeWidth="4"/>
                <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
              </svg>
            </span>
            <span>ENG</span>
            <ChevronDown className="w-3 h-3 text-[#111111]" />
          </button>

          {/* My Account Button */}
          <Link
            href="/login"
            className="h-10 px-5 bg-[#111111] hover:bg-black text-white rounded-full text-sm font-semibold tracking-tight inline-flex items-center justify-center transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          >
            My Account
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Navigation Menu"
            className="p-2 rounded-xl text-[#111111] hover:bg-neutral-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden mt-2 mx-auto max-w-6xl"
          >
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-neutral-100 flex flex-col gap-4 font-[family-name:var(--font-plus-jakarta)]">
              <div className="flex flex-col gap-3 text-sm font-semibold text-[#111111]">
                {navLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-1.5 px-2 rounded-lg hover:bg-[#FAF9F6] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <hr className="border-neutral-100" />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  className="h-9 px-3 bg-[#EFECE0] rounded-full flex items-center gap-1.5 text-xs font-semibold text-[#111111]"
                >
                  <span className="w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 60 30" width="16" height="16">
                      <path d="M0 0v30h60V0z" fill="#012169"/>
                      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                      <path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" strokeWidth="4"/>
                      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
                    </svg>
                  </span>
                  <span>ENG</span>
                  <ChevronDown className="w-3 h-3 text-[#111111]" />
                </button>

                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-9 px-5 bg-[#111111] text-white rounded-full text-xs font-semibold inline-flex items-center justify-center"
                >
                  My Account
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

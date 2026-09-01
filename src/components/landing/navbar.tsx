"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { LogoIcon, MenuIcon, XIcon } from "./icons";
import { PrimaryButton } from "@/components/ui/primary-button";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="sticky top-0 z-50 w-full pt-3 pb-2 px-4 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-7xl rounded-[16px] border border-[#D8DDD4] bg-white/95 backdrop-blur-sm px-4 sm:px-6 h-16 flex items-center justify-between shadow-2xs">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10251F]"
          >
            <LogoIcon size={30} />
            <span className="text-xl font-bold tracking-tight text-[#18221E]">
              Ropimo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-[#65706A] transition-colors hover:text-[#18221E]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-[10px] px-3.5 py-2 text-sm font-medium text-[#18221E] transition-colors hover:bg-[#E7EADF]"
          >
            Log In
          </Link>
          <PrimaryButton href="#pricing" size="sm">
            Get started
          </PrimaryButton>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-[8px] p-2 text-[#18221E] hover:bg-[#E7EADF] focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-sm md:hidden"
          >
            <div className="space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-[8px] px-3 py-2 text-base font-medium text-[#18221E] hover:bg-[#E7EADF]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2.5 pt-3 border-t border-[#D8DDD4]">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] py-2.5 text-sm font-medium text-[#18221E] hover:bg-[#F4F3EE]"
                >
                  Log In
                </Link>
                <PrimaryButton
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full justify-between"
                >
                  Get started
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

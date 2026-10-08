"use client";

import Link from "next/link";
import { brandConfig } from "@/lib/data";

export function FooterSection() {
  const currentYear = 2026;

  const productLinks = [
    { label: "Tasks & Projects", href: "#" },
    { label: "Meeting Notes", href: "#" },
    { label: "Hiring Pipeline", href: "#" },
    { label: "Official File Vault", href: "#" },
    { label: "Role Permissions", href: "#" },
    { label: "Integrations", href: "#" },
  ];

  const companyLinks = [
    { label: "About Us", href: "#" },
    { label: "Customer Stories", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Security & Compliance", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ];

  const resourceLinks = [
    { label: "Documentation", href: "#" },
    { label: "Import Guides", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Changelog", href: "#" },
    { label: "Office Templates", href: "#" },
    { label: "System Status", href: "#" },
  ];

  return (
    <footer className="relative w-full bg-[#EFECE0] text-[#111111] pt-16 sm:pt-20 pb-10 overflow-hidden font-[family-name:var(--font-plus-jakarta)]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 pb-14 border-b border-neutral-300/60">
          {/* Brand Column (Left) */}
          <div className="md:col-span-5 flex flex-col items-start">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center shadow-sm">
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
              <span className="text-[22px] font-extrabold tracking-[-0.03em] text-[#111111]">
                {brandConfig.name}
              </span>
            </Link>

            <p className="mt-4 text-[14px] text-neutral-600 leading-relaxed font-medium max-w-sm">
              The all-in-one workspace for modern offices: task boards, meeting
              agendas, recruitment, and official file vaults in one calm system.
            </p>

            <div className="mt-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[12px] font-bold text-neutral-700">
                All cloud systems operational
              </span>
            </div>
          </div>

          {/* 3 Link Columns */}
          <div className="md:col-span-7 grid grid-cols-3 gap-6 sm:gap-8">
            {/* Product */}
            <div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-neutral-500 block mb-4">
                Product
              </span>
              <ul className="flex flex-col gap-2.5 text-[13.5px] font-medium text-neutral-700">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-[#111111] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-neutral-500 block mb-4">
                Company
              </span>
              <ul className="flex flex-col gap-2.5 text-[13.5px] font-medium text-neutral-700">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-[#111111] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-neutral-500 block mb-4">
                Resources
              </span>
              <ul className="flex flex-col gap-2.5 text-[13.5px] font-medium text-neutral-700">
                {resourceLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-[#111111] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-neutral-500 font-medium">
          <div>
            © {currentYear} {brandConfig.name}, Inc. All rights reserved.
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-6 text-[13px] font-semibold text-neutral-700">
            <Link href="#" className="hover:text-black transition-colors">
              Twitter / X
            </Link>
            <Link href="#" className="hover:text-black transition-colors">
              LinkedIn
            </Link>
            <Link href="#" className="hover:text-black transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </div>

      {/* Giant Faded Wordmark Cropped at the Bottom */}
      <div className="w-full flex justify-center pointer-events-none select-none overflow-hidden -mb-10 sm:-mb-16 md:-mb-24 pt-6">
        <span className="text-[130px] sm:text-[190px] md:text-[250px] lg:text-[290px] font-[900] tracking-[-0.05em] text-neutral-900/[0.045] leading-none whitespace-nowrap">
          {brandConfig.name.toUpperCase()}
        </span>
      </div>
    </footer>
  );
}

export default FooterSection;

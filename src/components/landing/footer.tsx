import * as React from "react";
import Link from "next/link";
import { LogoIcon } from "./icons";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#product" },
      { label: "Features", href: "#features" },
      { label: "Roadmap", href: "#product" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Software Teams", href: "#" },
      { label: "Product & Design", href: "#" },
      { label: "Marketing Squads", href: "#" },
      { label: "Agile Sprints", href: "#" },
      { label: "Enterprise Scale", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Community Guides", href: "#" },
      { label: "Templates Hub", href: "#" },
      { label: "Help Center", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Security & Trust", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[#D8DDD4] bg-[#FFFFFF]">
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-12">
          {/* Brand Info */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoIcon size={28} />
              <span className="text-xl font-bold tracking-tight text-[#18221E]">
                Ropimo
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-[#65706A]">
              The unified workspace for modern teams. Projects, tasks, documents, and collaboration in one calm, high-performance interface.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-[#18221E]">
              <span className="h-2 w-2 rounded-full bg-[#10251F]" />
              <span>All systems operational</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="col-span-2 grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-8">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#18221E]">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-2.5 text-xs text-[#65706A]">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="transition-colors hover:text-[#18221E]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-[#D8DDD4] pt-8 sm:flex-row text-xs text-[#65706A] gap-4">
          <p>© {new Date().getFullYear()} Ropimo Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#18221E] transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-[#18221E] transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-[#18221E] transition-colors">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

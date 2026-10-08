"use client";

import React from "react";
import { motion } from "framer-motion";
import { Tag } from "./tag";

interface SectionHeaderProps {
  tag?: string;
  tagTilted?: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeader({
  tag,
  tagTilted = false,
  title,
  subtitle,
  align = "center",
  className = "",
}: SectionHeaderProps) {
  const isCenter = align === "center";

  return (
    <div
      className={`flex flex-col ${
        isCenter ? "items-center text-center mx-auto" : "items-start text-left"
      } max-w-3xl font-[family-name:var(--font-plus-jakarta)] ${className}`}
    >
      {/* Tag Pill */}
      {tag && (
        <div className="mb-4">
          <Tag tilted={tagTilted}>{tag}</Tag>
        </div>
      )}

      {/* Main Heading (Single simple fade-in on scroll: opacity 0 to 1, 8px upward, 400ms, ease-out, once) */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="text-3xl sm:text-4xl md:text-5xl lg:text-[48px] font-[800] tracking-[-0.03em] text-[#111111] leading-[1.08]"
      >
        {title}
      </motion.h2>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`mt-4 text-[14.5px] sm:text-[16px] text-[#6B6B6B] leading-[1.65] font-medium ${
            isCenter ? "max-w-xl" : "max-w-lg"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Reusable hand-drawn scribble underline component for key words in headings.
 */
export function ScribbleUnderline({
  children,
  color = "#111111",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span>{children}</span>
      <svg
        viewBox="0 0 170 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -bottom-2 sm:-bottom-2.5 left-0 w-full h-[12px] sm:h-[15px] pointer-events-none overflow-visible"
      >
        <path
          d="M2 10 C 26 4, 54 14, 90 8 C 120 3, 148 11, 168 7"
          stroke={color}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M162 9 C 130 14, 85 15, 35 15 C 20 15, 10 14, 6 16"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export default SectionHeader;

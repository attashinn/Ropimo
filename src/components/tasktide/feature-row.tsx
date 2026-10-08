"use client";

import React from "react";
import { motion } from "framer-motion";

interface FeatureRowProps {
  reverse?: boolean;
  tag?: string;
  title: string;
  text: string;
  children: React.ReactNode;
}

export function FeatureRow({
  reverse = false,
  tag = "Features",
  title,
  text,
  children,
}: FeatureRowProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 items-center gap-12 sm:gap-16 lg:gap-20 font-[family-name:var(--font-plus-jakarta)]"
    >
      {/* Visual / Image Column */}
      <div
        className={`w-full flex justify-center ${
          reverse ? "md:order-2 md:justify-end" : "md:order-1 md:justify-start"
        }`}
      >
        <div className="w-full max-w-[460px] sm:max-w-[480px] lg:max-w-[500px]">
          {children}
        </div>
      </div>

      {/* Text Column */}
      <div
        className={`flex flex-col items-start text-left ${
          reverse ? "md:order-1 md:pr-4" : "md:order-2 md:pl-4"
        }`}
      >
        {/* Pill Tag */}
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#EFECE0] text-[12px] font-bold text-neutral-700 tracking-wider uppercase mb-5 shadow-xs select-none">
          {tag}
        </span>

        {/* H2 Title (Single simple fade-in on scroll: opacity 0 to 1, 8px upward, 400ms, ease-out, once) */}
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-3xl sm:text-5xl lg:text-[52px] font-[800] tracking-[-0.035em] text-[#111111] leading-[1.08] max-w-lg"
        >
          {title}
        </motion.h2>

        {/* Description */}
        <p className="mt-5 text-[15.5px] sm:text-[17px] text-[#6B6B6B] leading-[1.7] font-medium max-w-md">
          {text}
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            className="bg-[#111111] hover:bg-black text-white text-[14.5px] font-bold px-8 py-3.5 rounded-full transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
          >
            Get Started
          </button>
          <button
            type="button"
            className="bg-transparent border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-100/70 text-[#111111] text-[14.5px] font-bold px-7 py-3.5 rounded-full transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            See how it works
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeatureRow;

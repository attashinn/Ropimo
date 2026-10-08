"use client";

import React from "react";
import { motion } from "framer-motion";
import { ImageSlot } from "@/components/ui/image-slot";
import { Check } from "lucide-react";

export function ProductShowcase() {
  return (
    <section className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 lg:py-32 px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)]">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Centered H2 & Subtext */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-[54px] font-[800] tracking-[-0.03em] text-[#111111] leading-[1.08]"
          >
            See everything in one view.
          </motion.h2>
          <p className="mt-4 text-[16px] sm:text-[18px] text-[#6B6B6B] font-medium leading-relaxed">
            Tasks, meetings, hiring, and files in a single workspace.
          </p>
        </div>

        {/* Cream Container with Large ImageSlot (Static, no hover scale or motion) */}
        <div className="w-full max-w-5xl bg-[#EFECE0] rounded-[40px] p-5 sm:p-6 md:p-8 relative">
          {/* Overlapping top-right chip: Rahim joined the meeting */}
          <div className="absolute -top-3 sm:-top-4 right-4 sm:right-8 z-20 bg-white rounded-full px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-neutral-100 flex items-center gap-2.5 select-none">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FFE76A] flex items-center justify-center text-[11px] font-extrabold text-[#111111] shrink-0 border border-amber-300">
              R
            </div>
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#111111]">
              Rahim joined the meeting
            </span>
          </div>

          {/* Large ImageSlot with 16/10 aspect ratio and soft shadow */}
          <div className="relative w-full aspect-[16/10] overflow-hidden rounded-[32px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.14)] border border-neutral-300/40">
            <ImageSlot
              customLabel="Dashboard screenshot - 1600x1000 - /images/dashboard.png"
              path="/images/dashboard.png"
              dimensions="1600x1000"
              rounded="rounded-[32px]"
              className="w-full h-full"
            />
          </div>

          {/* Overlapping bottom-left chip: Offer signed with green check */}
          <div className="absolute -bottom-3 sm:-bottom-4 left-4 sm:left-8 z-20 bg-white rounded-full px-4 py-2 sm:px-4.5 sm:py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-neutral-100 flex items-center gap-2 select-none">
            <span className="w-5 h-5 rounded-full bg-[#7ED08A]/35 text-[#14532d] flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <span className="text-[13px] sm:text-[14px] font-bold text-[#111111]">
              Offer signed
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductShowcase;

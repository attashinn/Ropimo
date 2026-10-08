"use client";

import React from "react";
import { motion } from "framer-motion";
import { ImageSlot } from "@/components/ui/image-slot";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatarBg: string;
  avatarLabel: string;
  avatarPath: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "We used to lose about two days waiting for legal to dig up the right vendor contract. Now it's just in the legal folder, right version, no emails back and forth.",
    name: "Farhana Ahmed",
    role: "Operations Director",
    company: "Studio Vertex",
    avatarBg: "bg-[#FFE76A]",
    avatarLabel: "Farhana Ahmed - 56x56 - /images/farhana.png",
    avatarPath: "/images/farhana.png",
  },
  {
    quote:
      "Our last three hires got their offer letters signed in under an hour. No print-and-scan nonsense, and HR didn't have to chase anyone across Slack.",
    name: "Tanvir Hasan",
    role: "Head of People",
    company: "Apex Media",
    avatarBg: "bg-[#3B63F0]",
    avatarLabel: "Tanvir Hasan - 56x56 - /images/tanvir.png",
    avatarPath: "/images/tanvir.png",
  },
  {
    quote:
      "Interview scheduling with four managers used to be a nightmare of calendar screenshots. We set the hiring pipeline up once and it just works.",
    name: "Nabila Tabassum",
    role: "Chief of Staff",
    company: "Pathline Logistics",
    avatarBg: "bg-[#7ED08A]",
    avatarLabel: "Nabila Tabassum - 56x56 - /images/nabila.png",
    avatarPath: "/images/nabila.png",
  },
];

export function Testimonials() {
  return (
    <section className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 lg:py-32 px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)]">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-[52px] font-[800] tracking-[-0.03em] text-[#111111] leading-[1.08]"
          >
            Teams that stopped chasing files.
          </motion.h2>
        </div>

        {/* 3 Equal White Cards Grid (Static, no entrance animation or hover scale) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-[28px] p-7 sm:p-8 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.05)] border border-neutral-200/60"
            >
              {/* Quote */}
              <p className="text-[15px] sm:text-[16px] text-[#2D2D2C] leading-[1.65] font-medium mb-8">
                “{t.quote}”
              </p>

              {/* Author Row with 56px Avatar ImageSlot */}
              <div className="flex items-center gap-3.5 pt-6 border-t border-neutral-100">
                <div
                  className={`w-14 h-14 rounded-full ${t.avatarBg} p-0.5 overflow-hidden shrink-0 flex items-center justify-center shadow-xs`}
                >
                  <ImageSlot
                    customLabel={t.avatarLabel}
                    path={t.avatarPath}
                    rounded="rounded-full"
                    className="w-full h-full text-[9px] p-1"
                  />
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-[15px] font-bold text-[#111111] leading-tight">
                    {t.name}
                  </span>
                  <span className="text-[12.5px] font-medium text-[#6B6B6B] mt-0.5">
                    {t.role}, {t.company}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;

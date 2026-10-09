"use client";

import React from "react";
import { motion } from "framer-motion";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatarBg: string;
  initials: string;
  imageSrc: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "We used to lose about two days waiting for legal to dig up the right vendor contract. Now it's just in the legal folder, right version, no emails back and forth.",
    name: "Farhana Ahmed",
    role: "Operations Director",
    company: "Studio Vertex",
    avatarBg: "#FFE76A",
    initials: "FA",
    imageSrc:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=112&auto=format&fit=crop&q=80",
  },
  {
    quote:
      "Our last three hires got their offer letters signed in under an hour. No print-and-scan nonsense, and HR didn't have to chase anyone across Slack.",
    name: "Tanvir Hasan",
    role: "Head of People",
    company: "Apex Media",
    avatarBg: "#3B63F0",
    initials: "TH",
    imageSrc:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=112&auto=format&fit=crop&q=80",
  },
  {
    quote:
      "Interview scheduling with four managers used to be a nightmare of calendar screenshots. We set the hiring pipeline up once and it just works.",
    name: "Nabila Tabassum",
    role: "Chief of Staff",
    company: "Pathline Logistics",
    avatarBg: "#7ED08A",
    initials: "NT",
    imageSrc:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=112&auto=format&fit=crop&q=80",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function Testimonials() {
  return (
    <section id="testimonials" className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 lg:py-32 px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)]">
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

        {/* 3-card stagger grid */}
        <motion.div
          className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={cardVariants}
              className="bg-white rounded-[28px] p-7 sm:p-8 flex flex-col justify-between border border-neutral-200/60"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1L8.5 5H13L9.5 7.5L11 11.5L7 9L3 11.5L4.5 7.5L1 5H5.5L7 1Z"
                      fill="#111111"
                    />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-[15px] sm:text-[16px] text-[#2D2D2C] leading-[1.65] font-medium mb-8">
                "{t.quote}"
              </p>

              {/* Author Row */}
              <div className="flex items-center gap-3.5 pt-6 border-t border-neutral-100">
                {/* Real photo avatar */}
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-white shadow-sm">
                  <img
                    src={t.imageSrc}
                    alt={t.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-[14.5px] font-bold text-[#111111] leading-tight">
                    {t.name}
                  </span>
                  <span className="text-[12px] font-medium text-[#6B6B6B] mt-0.5">
                    {t.role}, {t.company}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default Testimonials;

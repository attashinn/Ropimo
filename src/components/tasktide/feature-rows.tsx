"use client";

import React from "react";
import { motion } from "framer-motion";
import { ImageSlot } from "@/components/ui/image-slot";
import { ScribbleUnderline } from "@/components/ui/section-header";
import { FileText } from "lucide-react";

interface RowConfig {
  tag: string;
  title: React.ReactNode;
  text: string;
  reverse: boolean;
  cardBg: string;
  imageLabel: string;
  imagePath: string;
  chip: React.ReactNode;
}

export function FeatureRows() {
  const rows: RowConfig[] = [
    // Row 1 - Meetings (Image Left, Text Right)
    {
      tag: "Meetings",
      title: (
        <>
          Meetings that end with a{" "}
          <ScribbleUnderline color="#FF6B3D">to-do list</ScribbleUnderline>.
        </>
      ),
      text: "Schedule it, share the agenda, and every action item lands on someone's task list.",
      reverse: false,
      cardBg: "bg-[#7ED08A]",
      imageLabel: "Man smiling in office, cutout - /images/meeting-man.png",
      imagePath: "/images/meeting-man.png",
      chip: (
        <div className="absolute -top-4 -right-4 sm:-right-8 z-20 bg-white rounded-2xl px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.1)] border border-neutral-100 flex items-center gap-3.5 select-none">
          <div className="flex flex-col text-left">
            <span className="text-[14px] sm:text-[15px] font-bold text-[#111111] leading-tight">
              Weekly Ops Sync
            </span>
            <span className="text-[12px] font-medium text-neutral-500 mt-0.5">
              Tue 10:30
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#111111] text-white text-[12px] font-bold">
            Join
          </span>
        </div>
      ),
    },

    // Row 2 - Hiring (Text Left, Image Right)
    {
      tag: "Hiring",
      title: (
        <>
          Hire without the{" "}
          <ScribbleUnderline color="#FF6B3D">spreadsheet</ScribbleUnderline>.
        </>
      ),
      text: "Post the role, review candidates, book interviews, and send the offer from one place.",
      reverse: true,
      cardBg: "bg-[#FFE76A]",
      imageLabel: "Woman smiling with laptop, cutout - /images/hiring-woman.png",
      imagePath: "/images/hiring-woman.png",
      chip: (
        <div className="absolute -top-4 -left-4 sm:-left-8 z-20 bg-white rounded-2xl px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.1)] border border-neutral-100 flex flex-col text-left select-none">
          <span className="text-[14px] sm:text-[15px] font-bold text-[#111111] leading-tight">
            Senior Designer
          </span>
          <span className="text-[12px] font-semibold text-neutral-500 mt-0.5">
            14 applicants
          </span>
        </div>
      ),
    },

    // Row 3 - Official files (Image Left, Text Right)
    {
      tag: "Official files",
      title: (
        <>
          Every contract in{" "}
          <ScribbleUnderline color="#FF6B3D">one place</ScribbleUnderline>.
        </>
      ),
      text: "Offer letters, policies, and client contracts, filed by department. You decide who can see what.",
      reverse: false,
      cardBg: "bg-[#E3EDFB]",
      imageLabel: "Person at desk with documents, cutout - /images/files-person.png",
      imagePath: "/images/files-person.png",
      chip: (
        <div className="absolute -bottom-4 -left-4 sm:-left-8 z-20 bg-white rounded-2xl px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.1)] border border-neutral-100 flex items-center gap-3 select-none">
          <FileText className="w-4.5 h-4.5 text-neutral-600 shrink-0" />
          <span className="text-[13.5px] sm:text-[14.5px] font-bold text-[#111111] leading-tight">
            Offer_Letter_Nabila.pdf
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#7ED08A]/35 text-[#14532d] text-[11px] font-extrabold">
            Signed
          </span>
        </div>
      ),
    },

    // Row 4 - Tasks (Text Left, Image Right)
    {
      tag: "Tasks",
      title: (
        <>
          Everyone knows what&apos;s{" "}
          <ScribbleUnderline color="#FF6B3D">next</ScribbleUnderline>.
        </>
      ),
      text: "Assign work, set a date, and see progress without asking for updates.",
      reverse: true,
      cardBg: "bg-[#FFCFC2]",
      imageLabel: "Team member smiling at desk, cutout - /images/tasks-person.png",
      imagePath: "/images/tasks-person.png",
      chip: (
        <div className="absolute -top-4 -right-4 sm:-right-8 z-20 bg-white rounded-2xl px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.1)] border border-neutral-100 flex items-center gap-3 select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B3D] shrink-0" />
          <span className="text-[14px] sm:text-[15px] font-bold text-[#111111] leading-tight">
            Finalize API specs
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FFE76A] text-[#111111] text-[11px] font-extrabold">
            Today
          </span>
        </div>
      ),
    },
  ];

  return (
    <section className="relative w-full bg-[#FAF9F6] py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-12 font-[family-name:var(--font-plus-jakarta)]">
      <div className="max-w-7xl mx-auto flex flex-col gap-28 sm:gap-36 lg:gap-44">
        {rows.map((row) => (
          <div
            key={row.tag}
            className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 sm:gap-16 lg:gap-20"
          >
            {/* Visual Column */}
            <div
              className={`w-full flex justify-center lg:col-span-6 ${
                row.reverse
                  ? "lg:order-2 lg:justify-end"
                  : "lg:order-1 lg:justify-start"
              }`}
            >
              {/* Big rounded colored card (static, no hover lift/scale) */}
              <div
                className={`relative w-full max-w-[500px] sm:max-w-[520px] lg:max-w-[540px] h-[420px] sm:h-[460px] lg:h-[500px] rounded-[36px] sm:rounded-[44px] ${row.cardBg} flex items-end justify-center select-none shadow-[0_20px_50px_rgba(0,0,0,0.07)]`}
              >
                {/* One floating white chip */}
                {row.chip}

                {/* ImageSlot anchored to bottom */}
                <div className="w-[88%] h-[84%] flex items-end justify-center mb-0">
                  <ImageSlot
                    customLabel={row.imageLabel}
                    path={row.imagePath}
                    rounded="rounded-t-[28px] rounded-b-[28px]"
                    className="w-full h-full shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Text Column */}
            <div
              className={`flex flex-col items-start text-left lg:col-span-6 ${
                row.reverse ? "lg:order-1 lg:pr-8" : "lg:order-2 lg:pl-8"
              }`}
            >
              {/* Small cream tag pill */}
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#EFECE0] text-[13px] font-bold text-neutral-700 tracking-wider uppercase mb-5 shadow-xs select-none">
                {row.tag}
              </span>

              {/* H2 (Single simple fade-in on scroll: opacity 0 to 1, 8px upward, 400ms, ease-out, once) */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-4xl sm:text-5xl lg:text-[54px] font-[800] tracking-[-0.035em] text-[#111111] leading-[1.08] max-w-xl"
              >
                {row.title}
              </motion.h2>

              {/* Short paragraph */}
              <p className="mt-5 text-[17px] sm:text-[18px] text-[#6B6B6B] leading-[1.65] font-medium max-w-md">
                {row.text}
              </p>

              {/* Black Get Started button with 150ms hover scale 1.02 */}
              <button
                type="button"
                className="mt-8 bg-[#111111] hover:bg-black text-white text-[15px] font-bold px-8 py-3.5 rounded-full transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FeatureRows;

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ScallopedEdge } from "@/components/tasktide/scalloped-edge";
import { ImageSlot } from "@/components/ui/image-slot";

interface AvatarCornerProps {
  name: string;
  pillColor: "blue" | "white";
  bgColor: string;
  imageLabel: string;
  imagePath: string;
  placement: "left" | "right";
  positionClass: string;
}

function FloatingAvatarSlot({
  name,
  pillColor,
  bgColor,
  imageLabel,
  imagePath,
  placement,
  positionClass,
}: AvatarCornerProps) {
  return (
    <div
      className={`absolute z-20 flex items-center select-none ${positionClass}`}
    >
      <div
        className={`flex items-center gap-2 ${
          placement === "left" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar circle */}
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[3px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] shrink-0"
        >
          <div
            className={`w-full h-full rounded-full ${bgColor} overflow-hidden relative flex items-center justify-center p-0.5`}
          >
            <ImageSlot
              customLabel={imageLabel}
              path={imagePath}
              rounded="rounded-full"
              className="w-full h-full text-[8.5px] p-0.5"
            />
          </div>
        </div>

        {/* Name pill */}
        <div
          className={`px-3 py-1 rounded-full text-[12.5px] sm:text-[13px] font-bold tracking-tight shadow-[0_4px_14px_rgba(0,0,0,0.06)] font-[family-name:var(--font-plus-jakarta)] ${
            pillColor === "blue"
              ? "bg-[#3B63F0] text-white"
              : "bg-white text-[#111111]"
          }`}
        >
          {name}
        </div>
      </div>
    </div>
  );
}

export function FinalCTASection() {
  const [email, setEmail] = useState("");

  return (
    <section className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 lg:py-32 px-4 sm:px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)]">
      <div
        className="max-w-6xl mx-auto relative rounded-[40px] bg-[#7ED08A] shadow-[0_24px_60px_-15px_rgba(126,208,138,0.35)] overflow-hidden"
      >
        {/* Scalloped Top Edge */}
        <div className="w-full overflow-hidden rounded-t-[40px]">
          <ScallopedEdge
            fillColor="#FAF9F6"
            bottomBgColor="#7ED08A"
            className="w-full"
          />
        </div>

        {/* 4 Floating Avatars with ImageSlot at the 4 corners (Static) */}
        <div className="hidden md:block pointer-events-none">
          {/* Top-Left: Ellyse */}
          <FloatingAvatarSlot
            name="Ellyse"
            pillColor="blue"
            bgColor="bg-[#FFD93D]"
            imageLabel="Ellyse - 64x64 - /images/ellyse.png"
            imagePath="/images/ellyse.png"
            placement="right"
            positionClass="top-[14%] left-[4%]"
          />

          {/* Top-Right: Sarah */}
          <FloatingAvatarSlot
            name="Sarah"
            pillColor="white"
            bgColor="bg-[#3B63F0]"
            imageLabel="Sarah - 64x64 - /images/sarah.png"
            imagePath="/images/sarah.png"
            placement="left"
            positionClass="top-[14%] right-[4%]"
          />

          {/* Bottom-Left: Stokes */}
          <FloatingAvatarSlot
            name="Stokes"
            pillColor="white"
            bgColor="bg-[#7ED957]"
            imageLabel="Stokes - 64x64 - /images/stokes.png"
            imagePath="/images/stokes.png"
            placement="right"
            positionClass="bottom-[14%] left-[4%]"
          />

          {/* Bottom-Right: Conway */}
          <FloatingAvatarSlot
            name="Conway"
            pillColor="blue"
            bgColor="bg-[#FFD93D]"
            imageLabel="Conway - 64x64 - /images/conway.png"
            imagePath="/images/conway.png"
            placement="left"
            positionClass="bottom-[14%] right-[4%]"
          />
        </div>

        {/* Centered Content */}
        <div className="relative z-20 px-6 sm:px-12 pt-10 pb-20 sm:pb-24 flex flex-col items-center text-center max-w-2xl mx-auto">
          {/* H2 (Single simple fade-in on scroll: opacity 0 to 1, 8px upward, 400ms, ease-out, once) */}
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-5xl md:text-[54px] font-[800] tracking-[-0.03em] text-[#111111] leading-[1.08]"
          >
            Give your office one home.
          </motion.h2>

          <p className="mt-4 text-[15px] sm:text-[17px] text-[#111111]/80 font-medium leading-relaxed max-w-lg">
            Stop losing files, chasing updates, and paying for separate software
            subscriptions. Get started with your team today.
          </p>

          {/* Email Input + Get Started Button (matching hero) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) {
                alert(`Welcome aboard! Account setup link sent to: ${email}`);
                setEmail("");
              }
            }}
            className="mt-8 sm:mt-10 relative w-full max-w-[480px] bg-white rounded-full p-2 pl-6 shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-emerald-800/10 flex items-center justify-between focus-within:ring-2 focus-within:ring-black/10"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="bg-transparent border-0 outline-none text-[15px] text-[#111111] placeholder:text-neutral-400 w-full pr-3 font-medium"
            />
            <button
              type="submit"
              className="bg-[#111111] hover:bg-black text-white rounded-full py-2.5 sm:py-3 px-5 sm:px-6 flex items-center gap-2.5 text-[14px] font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shrink-0 shadow-sm cursor-pointer"
            >
              <span>Get Started</span>
              <span className="w-7 h-7 rounded-full bg-white text-[#111111] flex items-center justify-center shrink-0">
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default FinalCTASection;

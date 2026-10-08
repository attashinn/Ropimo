"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Navbar } from "./navbar";
import { FloatingAvatar } from "./floating-avatar";
import { ConnectorLines } from "./connector-lines";
import { ScallopedEdge } from "./scalloped-edge";

export function Hero() {
  const [email, setEmail] = useState("");

  return (
    <section className="relative w-full bg-[#EFECE0] pt-2 sm:pt-4 overflow-hidden font-[family-name:var(--font-plus-jakarta)]">
      {/* Floating Navbar inside the full-width beige hero */}
      <Navbar />

      {/* Main Hero Content Frame (Avatars + Headline + CTA) */}
      <div className="relative w-full max-w-[1260px] mx-auto min-h-[640px] sm:min-h-[700px] lg:min-h-[740px] pt-10 sm:pt-16 pb-20 sm:pb-28 px-4 flex flex-col items-center justify-center">
        {/* SVG Connector Lines connecting avatars */}
        <ConnectorLines />

        {/* 6 Collaborative Floating Avatars anchored relative to content frame */}
        {/* Top-Left: Ellyse */}
        <FloatingAvatar
          name="Ellyse"
          imageSrc="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
          bgColor="yellow"
          pillType="blue"
          pillPlacement="right"
          hasCursor={true}
          cursorPlacement="top-right"
          floatDuration={4.2}
          floatDelay={0}
          className="top-[10%] left-[1%] sm:left-[3%] md:left-[4%] lg:left-[5%]"
        />

        {/* Top-Right: Sarah */}
        <FloatingAvatar
          name="Sarah"
          imageSrc="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80"
          bgColor="blue"
          pillType="white"
          pillPlacement="left"
          floatDuration={3.8}
          floatDelay={0.5}
          className="top-[10%] right-[1%] sm:right-[3%] md:right-[4%] lg:right-[5%]"
        />

        {/* Mid-Left: Stokes */}
        <FloatingAvatar
          name="Stokes"
          imageSrc="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80"
          bgColor="green"
          pillType="white"
          pillPlacement="left"
          floatDuration={4.6}
          floatDelay={0.2}
          className="top-[37%] left-[8%] sm:left-[11%] md:left-[13%] lg:left-[14%]"
        />

        {/* Mid-Right: Starc */}
        <FloatingAvatar
          name="Starc"
          imageSrc="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80"
          bgColor="yellow"
          pillType="white"
          pillPlacement="right"
          floatDuration={4.4}
          floatDelay={0.7}
          className="top-[37%] right-[8%] sm:right-[11%] md:right-[13%] lg:right-[14%]"
        />

        {/* Bottom-Left: Alyssa */}
        <FloatingAvatar
          name="Alyssa"
          imageSrc="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80"
          bgColor="blue"
          pillType="white"
          pillPlacement="right"
          floatDuration={4.0}
          floatDelay={0.4}
          className="top-[63%] left-[1%] sm:left-[3%] md:left-[4%] lg:left-[5%]"
        />

        {/* Bottom-Right: Conway */}
        <FloatingAvatar
          name="Conway"
          imageSrc="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80"
          bgColor="green"
          pillType="blue"
          pillPlacement="left"
          hasCursor={true}
          cursorPlacement="top-left"
          floatDuration={4.5}
          floatDelay={0.9}
          className="top-[63%] right-[1%] sm:right-[3%] md:right-[4%] lg:right-[5%]"
        />

        {/* Centered Hero Content */}
        <div className="relative z-20 max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-[800] tracking-[-0.035em] text-[#111111] leading-[1.08] sm:leading-[1.05]"
          >
            {/* Line 1: Collaborate + green cursor badge + Track with scribble */}
            <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3.5 gap-y-2">
              <span>Collaborate</span>

              {/* Inline tilted green cursor arrow badge */}
              <span className="inline-flex items-center justify-center bg-[#D6F786] rounded-xl sm:rounded-2xl px-2 sm:px-3 py-1 sm:py-1.5 -rotate-6 shadow-xs select-none">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 sm:w-6 sm:h-6 text-[#52B21E]"
                >
                  <path
                    d="M4 4L11.5 21L14.5 13.5L22 10.5L4 4Z"
                    fill="#52B21E"
                    stroke="#429615"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              {/* Word Track with hand-drawn scribble underline */}
              <span className="relative inline-block">
                <span>Track</span>
                <svg
                  viewBox="0 0 170 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-[12px] sm:h-[16px] pointer-events-none overflow-visible"
                >
                  <path
                    d="M2 10 C 25 4, 52 14, 88 8 C 118 3, 146 11, 166 7"
                    stroke="#111111"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M160 9 C 130 14, 85 15, 35 15 C 20 15, 10 14, 6 16"
                    stroke="#111111"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>

            {/* Line 2 */}
            <div className="mt-1 sm:mt-2">
              <span>and Succeed with</span>
            </div>

            {/* Line 3: TaskTide highlight peach box with tag and caret */}
            <div className="mt-2 sm:mt-3 flex items-center justify-center">
              <span className="relative inline-flex items-center bg-[#FFCFC2] px-4 sm:px-7 py-0.5 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-xs">
                <span>TaskTide</span>

                {/* Top-Right orange tag "Software" */}
                <span className="absolute -top-3 sm:-top-3.5 -right-2 sm:-right-3.5 bg-[#FF6B3D] text-white text-[10px] sm:text-[11.5px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full shadow-xs tracking-wide">
                  Software
                </span>

                {/* Thin vertical orange text cursor bar */}
                <span className="w-[2.5px] sm:w-[3.5px] h-[34px] sm:h-[50px] md:h-[62px] bg-[#FF6B3D] rounded-full ml-1.5 sm:ml-2.5" />
              </span>
            </div>
          </motion.h1>

          {/* Subtext */}
          <p
            className="mt-6 sm:mt-8 max-w-lg text-[14px] sm:text-[15.5px] leading-relaxed text-[#6B6B6B] font-medium"
          >
            Track, Analyze, and Improve Your Performance with Our
            <br className="hidden sm:inline" /> Comprehensive Fitness Records
            Platform.
          </p>

          {/* Email Input Bar CTA */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) {
                alert(`Thank you! Signed up with: ${email}`);
                setEmail("");
              }
            }}
            className="mt-8 sm:mt-10 relative w-full max-w-[480px] bg-white rounded-full p-2 pl-6 shadow-[0_12px_36px_rgba(0,0,0,0.06)] border border-neutral-200/80 flex items-center justify-between focus-within:ring-2 focus-within:ring-black/10 focus-within:border-black/30"
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

      {/* Full-width Bottom Scalloped Wavy Edge transitioning to #FAF9F6 */}
      <ScallopedEdge fillColor="#EFECE0" bottomBgColor="#FAF9F6" />
    </section>
  );
}

export default Hero;

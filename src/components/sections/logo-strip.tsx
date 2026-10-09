"use client";

import React from "react";

const brands = [
  { name: "Apex Studios", style: "font-black tracking-tight text-base" },
  { name: "MediPulse Clinics", style: "font-semibold tracking-normal text-sm" },
  { name: "SWIFTHAUL", style: "font-extrabold tracking-widest text-xs" },
  { name: "The Grand Meridian", style: "font-serif italic font-bold text-base" },
  { name: "Lighthouse Academy", style: "font-medium tracking-tight text-sm" },
  { name: "LayerCode Labs", style: "font-mono font-bold tracking-tighter text-sm" },
  { name: "Vertex Capital", style: "font-black tracking-tight text-sm" },
  { name: "NovaCraft", style: "font-extrabold tracking-widest text-xs" },
];

export function LogoStrip() {
  return (
    <section className="relative w-full bg-[#FAF9F6] border-b border-neutral-200/50 py-8 sm:py-10 overflow-hidden font-[family-name:var(--font-plus-jakarta)]">
      {/* Subtitle */}
      <p className="text-[12.5px] font-semibold text-neutral-400 text-center tracking-tight mb-6 select-none uppercase">
        Teams that stopped juggling five tools
      </p>

      {/* Gradient fade masks on left & right edges */}
      <div className="pointer-events-none absolute top-0 left-0 w-24 sm:w-40 h-full z-10 bg-gradient-to-r from-[#FAF9F6] to-transparent" />
      <div className="pointer-events-none absolute top-0 right-0 w-24 sm:w-40 h-full z-10 bg-gradient-to-l from-[#FAF9F6] to-transparent" />

      {/* Marquee track: items duplicated for a seamless loop */}
      <div className="flex items-center overflow-hidden" aria-hidden="true">
        <div className="flex items-center gap-12 sm:gap-16 animate-marquee whitespace-nowrap">
          {[...brands, ...brands].map((brand, i) => (
            <span
              key={`${brand.name}-${i}`}
              className={`text-[#BABABA] hover:text-[#111111] transition-colors duration-200 select-none cursor-default px-2 ${brand.style}`}
            >
              {brand.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LogoStrip;

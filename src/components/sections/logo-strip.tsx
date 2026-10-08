"use client";

import React from "react";

const brands = [
  { name: "Apex Studios", style: "font-black tracking-tight text-lg" },
  { name: "MediPulse Clinics", style: "font-semibold tracking-normal text-base" },
  { name: "SWIFTHAUL", style: "font-extrabold tracking-widest text-sm" },
  { name: "The Grand Meridian", style: "font-serif italic font-bold text-lg" },
  { name: "Lighthouse Academy", style: "font-medium tracking-tight text-base" },
  { name: "LayerCode Labs", style: "font-mono font-bold tracking-tighter text-sm" },
];

export function LogoStrip() {
  return (
    <section className="relative w-full bg-[#FAF9F6] border-b border-neutral-200/50 py-10 sm:py-12 overflow-hidden font-[family-name:var(--font-plus-jakarta)]">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center">
        {/* Subtitle */}
        <p className="text-[13px] font-medium text-neutral-400 text-center tracking-tight mb-8">
          Teams that stopped juggling five tools
        </p>

        {/* Static Row (Both Desktop & Mobile) */}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:justify-between w-full max-w-5xl px-4">
          {brands.map((brand) => (
            <span
              key={brand.name}
              className={`text-[#9A9A9A] hover:text-[#111111] transition-colors duration-150 select-none cursor-default ${brand.style}`}
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

"use client";

import React from "react";

interface FeatureCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
  overlay: React.ReactNode;
  isCenter?: boolean;
  delay?: number;
}

export function FeatureCard({
  imageSrc,
  imageAlt,
  title,
  description,
  overlay,
  isCenter = false,
}: FeatureCardProps) {
  return (
    <div
      className={`flex flex-col items-center w-full ${
        isCenter ? "md:-mt-8" : ""
      }`}
    >
      {/* Photo Container */}
      <div
        className={`relative w-full rounded-[36px] overflow-hidden shadow-[0_10px_36px_rgba(0,0,0,0.07)] border border-neutral-200/50 bg-[#F2EFE8] ${
          isCenter
            ? "h-[430px] sm:h-[470px] md:h-[510px]"
            : "h-[370px] sm:h-[410px] md:h-[450px]"
        }`}
      >
        {/* Photo Image */}
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />

        {/* Warm tone subtle ambient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

        {/* Pinned Bottom Overlay */}
        <div className="absolute bottom-5 left-5 right-5 z-10 pointer-events-auto">
          {overlay}
        </div>
      </div>

      {/* Title & Description Below Image */}
      <div className="mt-7 text-center flex flex-col items-center px-2 font-[family-name:var(--font-plus-jakarta)]">
        <h3 className="text-[22px] font-extrabold text-[#111111] tracking-tight leading-snug">
          {title}
        </h3>
        <p className="mt-2 text-[14px] text-[#6B6B6B] leading-relaxed max-w-[270px] font-medium">
          {description}
        </p>
      </div>
    </div>
  );
}

export default FeatureCard;

"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

function useCountUp(target: number, duration: number, started: boolean, decimals = 0) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const raw = eased * target;
      setCount(decimals > 0 ? Math.round(raw * 10) / 10 : Math.floor(raw));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration, decimals]);

  return count;
}

interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
  started: boolean;
  delay?: number;
  decimals?: number;
}

function StatItem({ value, suffix, label, started, delay = 0, decimals = 0 }: StatItemProps) {
  const count = useCountUp(value, 1600, started, decimals);
  const displayValue = decimals > 0 ? count.toFixed(1) : count.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="flex flex-col items-center text-center px-4 sm:px-8 py-6 w-full"
    >
      <div className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-[800] tracking-[-0.04em] text-[#111111] leading-none mb-3 tabular-nums">
        {displayValue}{suffix}
      </div>
      <p className="text-[14px] sm:text-[15.5px] font-semibold text-[#6B6B6B] max-w-[200px] leading-snug">
        {label}
      </p>
    </motion.div>
  );
}

export function StatsRow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative w-full bg-[#FAF9F6] py-16 sm:py-24 px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)]"
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center divide-y md:divide-y-0 md:divide-x divide-dashed divide-neutral-300/80">
          <StatItem
            value={2400}
            suffix="+"
            label="teams running on Zambic"
            started={inView}
            delay={0}
          />
          <StatItem
            value={9}
            suffix=" hrs"
            label="saved per person every week"
            started={inView}
            delay={0.12}
          />
          <StatItem
            value={4.8}
            suffix=" / 5"
            label="average product rating"
            started={inView}
            delay={0.24}
            decimals={1}
          />
        </div>
      </div>
    </section>
  );
}

export default StatsRow;

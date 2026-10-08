"use client";

import { motion } from "framer-motion";
import { FeatureCard } from "./feature-card";
import { ProgressRing } from "./progress-ring";
import { StatPill } from "./stat-pill";
import { AddTaskBox } from "./add-task-box";

export function FeaturesSection() {
  return (
    <section className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 lg:py-32 px-4 sm:px-8 lg:px-12 font-[family-name:var(--font-plus-jakarta)]">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto flex flex-col items-center">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-5xl md:text-[54px] font-[800] tracking-[-0.035em] text-[#111111] leading-[1.08]"
          >
            Run the office without chasing people.
          </motion.h2>

          <p
            className="mt-5 text-[15.5px] sm:text-[17px] text-[#6B6B6B] leading-relaxed max-w-lg font-medium"
          >
            Assign it, schedule it, file it. Everyone sees the same thing.
          </p>
        </div>

        {/* 3 Feature Cards Grid */}
        <div className="mt-16 sm:mt-24 w-full grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 items-start">
          {/* Card 1: Tasks that actually close */}
          <FeatureCard
            imageSrc="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80"
            imageAlt="Smiling woman with curly hair at work desk"
            title="Tasks that actually close"
            description="Assign deliverables with clear owners, due dates, and live blockers so work never stalls."
            overlay={<ProgressRing percentage={80} label="Sprint completion" />}
            delay={0.1}
          />

          {/* Card 2: Hours and workload, visible (Taller, Pulled Up) */}
          <FeatureCard
            imageSrc="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80"
            imageAlt="Two professionals collaborating at a whiteboard"
            title="Hours and workload, visible"
            description="See who is overloaded and who has bandwidth without awkward weekly check-in spreadsheets."
            overlay={<StatPill />}
            isCenter={true}
            delay={0.25}
          />

          {/* Card 3: Add anything in two clicks */}
          <FeatureCard
            imageSrc="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80"
            imageAlt="Man in white shirt drinking coffee in modern office"
            title="Add anything in two clicks"
            description="Schedule a meeting, assign a task, or log a candidate without leaving your current page."
            overlay={<AddTaskBox />}
            delay={0.4}
          />
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;

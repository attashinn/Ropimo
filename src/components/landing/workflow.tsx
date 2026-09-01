"use client";

import * as React from "react";
import { motion } from "motion/react";
import { slideUp, staggerContainer } from "@/lib/animations";

const STEPS = [
  {
    step: "01",
    title: "Create your workspace",
    description:
      "Set up your company or team hub in seconds. Invite members with custom roles and instant onboarding.",
  },
  {
    step: "02",
    title: "Structure projects & docs",
    description:
      "Group tasks into boards, lists, and sprint milestones. Embed specifications and briefs right where work happens.",
  },
  {
    step: "03",
    title: "Collaborate in real time",
    description:
      "Discuss updates in contextual threads, manage blockers, and track subtask progress with live status updates.",
  },
  {
    step: "04",
    title: "Deliver on schedule",
    description:
      "Review sprint retrospectives, sync calendars, and hit key deadlines with full transparency across your team.",
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="bg-[#FFFFFF] py-20 md:py-28 border-t border-[#D8DDD4]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
            Frictionless Process
          </h2>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#18221E] sm:text-4xl">
            From idea to launch in four simple steps
          </p>
          <p className="mt-4 text-base text-[#65706A] sm:text-lg">
            No complex setup scripts or month-long training. Ropimo gets your entire team working productively on day one.
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((item) => (
            <motion.div
              key={item.step}
              variants={slideUp}
              className="relative flex flex-col justify-between rounded-[14px] border border-[#D8DDD4] bg-[#F4F3EE] p-6 shadow-2xs"
            >
              <div>
                <span className="text-2xl font-extrabold tracking-tight text-[#B8C0B2]">
                  {item.step}
                </span>
                <h3 className="mt-3 text-base font-semibold text-[#18221E]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#65706A]">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

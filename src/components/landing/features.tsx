"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  KanbanIcon,
  TasksIcon,
  UsersIcon,
  FolderIcon,
  DocumentIcon,
  PlanningIcon,
  CalendarIcon,
} from "./icons";
import { staggerContainer, slideUp } from "@/lib/animations";

interface FeatureItem {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  description: string;
  tag: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: KanbanIcon,
    title: "Project Management",
    description:
      "Visualize initiatives with customizable Kanban boards, structured lists, timelines, and sprint cycles tailored to your workflow.",
    tag: "Core Engine",
  },
  {
    icon: TasksIcon,
    title: "Tasks and Assignments",
    description:
      "Break complex projects into actionable sub-tasks. Assign owners, set priority levels, track estimates, and map dependencies.",
    tag: "Execution",
  },
  {
    icon: UsersIcon,
    title: "Team Collaboration",
    description:
      "Keep conversations in context. Mention teammates, resolve discussion threads, and share instant feedback on active deliverables.",
    tag: "Real-Time",
  },
  {
    icon: FolderIcon,
    title: "Files and Folders",
    description:
      "Organize assets with centralized folder trees, version history, in-browser previews, and flexible permissions.",
    tag: "Storage",
  },
  {
    icon: DocumentIcon,
    title: "Documents and Notes",
    description:
      "Create rich specifications, sprint retrospectives, and living knowledge bases linked directly to your tasks and milestones.",
    tag: "Knowledge",
  },
  {
    icon: PlanningIcon,
    title: "Planning and Meetings",
    description:
      "Run sprint planning sessions, set actionable meeting agendas, capture notes, and auto-convert action items into tasks.",
    tag: "Alignment",
  },
  {
    icon: CalendarIcon,
    title: "Integrated Calendar",
    description:
      "Stay ahead of upcoming milestones, launch dates, and sprint deliverables with a unified calendar synced across all projects.",
    tag: "Scheduling",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-[#F4F3EE] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
            Features & Capabilities
          </h2>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#18221E] sm:text-4xl">
            Built for how modern teams actually work.
          </p>
          <p className="mt-4 text-base text-[#65706A] sm:text-lg">
            Every feature in Ropimo is crafted to eliminate context switching and keep your team aligned from concept to release.
          </p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={slideUp}
                className="group flex flex-col justify-between rounded-[14px] border border-[#D8DDD4] bg-white p-7 transition-all duration-200 hover:border-[#B8C0B2] hover:shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-[#F4F3EE] text-[#18221E] transition-colors duration-200 group-hover:border-[#10251F] group-hover:bg-[#10251F] group-hover:text-[#C7F34A]">
                      <Icon size={20} />
                    </div>
                    <span className="rounded-[6px] bg-[#E7EADF] px-2.5 py-0.5 text-[11px] font-semibold text-[#18221E]">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-[#18221E]">
                    {feature.title}
                  </h3>

                  <p className="mt-2.5 text-sm leading-relaxed text-[#65706A]">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

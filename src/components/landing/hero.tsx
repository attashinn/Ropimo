"use client";

import * as React from "react";
import { motion } from "motion/react";
import { CheckIcon, SparklesIcon, ArrowRightIcon } from "./icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Card } from "@/components/ui/card";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#F4F3EE] pt-12 pb-16 md:pt-20 md:pb-24">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        {/* Lime Accent Tag */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#C7F34A] px-3.5 py-1 text-xs font-semibold text-[#10251F] border border-[#B7E63D] mb-7 shadow-2xs"
        >
          <SparklesIcon size={13} className="text-[#10251F]" />
          <span>Start your workspace</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-4xl font-bold tracking-tight text-[#18221E] sm:text-6xl lg:text-7xl"
        >
          Everything your team needs to get work done.
        </motion.h1>

        {/* Supporting Copy */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#65706A] sm:text-lg"
        >
          Ropimo brings projects, tasks, files, documents, planning, and teamwork
          into one simple workspace. Reliable, calm, and backed by real people.
        </motion.p>

        {/* Distinctive Dual Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <PrimaryButton href="#pricing" size="lg" className="w-full sm:w-auto min-w-[200px]">
            Get started free
          </PrimaryButton>

          <SecondaryButton href="#product" size="lg" className="w-full sm:w-auto min-w-[180px]">
            See how it works
          </SecondaryButton>
        </motion.div>

        {/* Trust Signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#18221E]"
        >
          <div className="flex items-center gap-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A]">
              <CheckIcon size={10} />
            </div>
            <span>Free 14-day trial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A]">
              <CheckIcon size={10} />
            </div>
            <span>30-day money-back guarantee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A]">
              <CheckIcon size={10} />
            </div>
            <span>24/7 in-house support</span>
          </div>
        </motion.div>
      </div>

      {/* 3 Quick Spotlight Cards */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card variant="surface" className="p-6 transition-all duration-200 hover:border-[#B8C0B2] group cursor-pointer">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#18221E] group-hover:text-[#10251F]">
                Project Workspaces
              </h3>
              <ArrowRightIcon size={16} className="text-[#65706A] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#18221E]" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#65706A]">
              Get started with workspaces that adapt to your workflow, from agile sprints to cross-team roadmaps.
            </p>
          </Card>

          <Card variant="surface" className="p-6 transition-all duration-200 hover:border-[#B8C0B2] group cursor-pointer">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#18221E] group-hover:text-[#10251F]">
                Tasks & Execution
              </h3>
              <ArrowRightIcon size={16} className="text-[#65706A] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#18221E]" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#65706A]">
              Break down complex initiatives with subtasks, estimates, priority tagging, and live status syncing.
            </p>
          </Card>

          <Card variant="surface" className="p-6 transition-all duration-200 hover:border-[#B8C0B2] group cursor-pointer">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#18221E] group-hover:text-[#10251F]">
                Collaborative Docs
              </h3>
              <ArrowRightIcon size={16} className="text-[#65706A] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#18221E]" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#65706A]">
              Write specifications, meeting agendas, and team retrospectives directly alongside active deliverables.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import { motion } from "motion/react";
import { CheckIcon } from "./icons";
import { slideUp } from "@/lib/animations";

export function Collaboration() {
  return (
    <section className="bg-[#F4F3EE] py-20 md:py-28 border-t border-[#D8DDD4]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Context Copy */}
          <div className="lg:col-span-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
              Team Collaboration
            </h2>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#18221E] sm:text-4xl">
              Fewer status meetings. More focused execution.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[#65706A] sm:text-lg">
              Ropimo keeps your conversations, feedback, and decisions attached to the actual tasks and documents, so nobody has to dig through messy chat logs or email threads.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A] mt-0.5">
                  <CheckIcon size={14} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#18221E]">Contextual Discussion Threads</h4>
                  <p className="text-sm text-[#65706A]">Comment directly on tasks, design assets, and document sections with rich text and attachments.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A] mt-0.5">
                  <CheckIcon size={14} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#18221E]">Instant Activity Feed & Notifications</h4>
                  <p className="text-sm text-[#65706A]">Get targeted updates on deliverables you care about without notification fatigue.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A] mt-0.5">
                  <CheckIcon size={14} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#18221E]">Live Co-Editing & Team Presence</h4>
                  <p className="text-sm text-[#65706A]">Write specs and take meeting notes together in real-time with zero sync delays.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Mockup */}
          <motion.div
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="lg:col-span-6 rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-2xs"
          >
            <div className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10251F] text-xs font-bold text-[#F4F3EE]">
                    SL
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#18221E]">Sarah Lin</p>
                    <p className="text-[11px] text-[#65706A]">Product Designer</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#65706A]">10m ago</span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#18221E]">
                Updated the mobile checkout flow wireframe. <span className="font-semibold text-[#10251F]">@Tashin</span> could you review the payment method selector before sprint sign-off?
              </p>

              <div className="mt-3 rounded-[8px] border border-[#D8DDD4] bg-white p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[#65706A]">📎</span>
                  <span className="font-medium text-[#18221E]">checkout-v3-wireframe.fig</span>
                </div>
                <span className="text-[10px] text-[#65706A]">2.4 MB</span>
              </div>

              {/* Reply Thread */}
              <div className="mt-4 pt-3 border-t border-[#D8DDD4] flex items-start gap-2.5 pl-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-[#C7F34A]">
                  TK
                </div>
                <div className="flex-1 rounded-[8px] bg-white border border-[#D8DDD4] p-2.5 text-xs">
                  <p className="font-semibold text-[#18221E]">Tashin Khan <span className="font-normal text-[#65706A] text-[10px] ml-1">2m ago</span></p>
                  <p className="mt-0.5 text-[#65706A]">Looks great! Approved and moving to Development column.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const faqs = [
  {
    q: "How secure is our official company data?",
    a: "All documents and data are encrypted at rest with AES-256 and in transit with TLS 1.3. Department folders have isolated permission trees so sensitive HR, legal, and financial files are completely private.",
  },
  {
    q: "Can we import tasks, candidates, and files from spreadsheets and Drive?",
    a: "Yes. You can import task lists, applicant spreadsheets, and entire folder structures directly with one click. Folder hierarchies and file attachments are preserved automatically.",
  },
  {
    q: "What happens if we reach our storage limit?",
    a: "You'll never get locked out or have uploads fail unexpectedly. We notify your admin at 85% capacity with easy options to add storage in simple increments or upgrade your plan.",
  },
  {
    q: "How do roles and permissions work across departments?",
    a: "You can set workspace-wide roles (Admin, Member, Contractor) or granular folder permissions (Viewer, Editor, Approver). You can also lock folders to HR or Finance only.",
  },
  {
    q: "Can different departments run their own hiring pipelines?",
    a: "Yes. Engineering, Design, and Operations can each configure distinct stages, custom scorecards, and hiring teams without sharing sensitive candidate notes.",
  },
  {
    q: "Can we cancel or change plans anytime?",
    a: "Yes. You can upgrade, downgrade, or cancel directly from billing settings at any time with zero penalties. Your data remains exportable for 60 days.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section
      id="faq"
      className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 lg:py-32 px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)]"
    >
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        {/* Header (Single simple fade-in on scroll: opacity 0 to 1, 8px upward, 400ms, ease-out, once) */}
        <div className="text-center mb-12 sm:mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-[48px] font-[800] tracking-[-0.03em] text-[#111111] leading-[1.1]"
          >
            Questions we get a lot.
          </motion.h2>
        </div>

        {/* Clean Accordion with Thin Dividers (No Boxes) */}
        <div className="w-full divide-y divide-neutral-200/90 border-t border-b border-neutral-200/90">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div key={faq.q} className="py-5 sm:py-6">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer focus:outline-none group"
                >
                  <span className="text-[16px] sm:text-[17.5px] font-bold text-[#111111] tracking-tight leading-snug group-hover:text-black">
                    {faq.q}
                  </span>

                  <span
                    className={`shrink-0 transition-transform duration-200 text-[#111111] ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    <Plus className="w-5 h-5 stroke-[2.2]" />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 pb-1 text-[14.5px] sm:text-[15.5px] text-[#6B6B6B] leading-[1.65] font-medium">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQSection;

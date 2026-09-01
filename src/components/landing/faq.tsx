"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDownIcon } from "./icons";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "What makes Ropimo different from other project management tools?",
    answer:
      "Ropimo replaces fragmented tool stacks by unifying tasks, collaborative documents, asset storage, and calendar planning in one high-performance interface. Instead of jumping between three different apps, your team executes everything in a single context.",
  },
  {
    question: "Can I import data from Trello, Asana, Jira, or Notion?",
    answer:
      "Yes. Ropimo provides one-click workspace importers for Trello boards, Asana projects, Jira issues, and Notion pages. All your tasks, descriptions, attachments, and assignments are mapped automatically.",
  },
  {
    question: "Is there a free trial or free tier?",
    answer:
      "Yes! The Starter plan is completely free forever for up to 5 members. We also provide an unrestricted 14-day free trial of our Pro plan with no credit card required.",
  },
  {
    question: "How does team billing and seat management work?",
    answer:
      "You only pay for active members in your workspace. You can invite guests and view-only stakeholders for free. When you add or remove members during a billing cycle, charges are prorated automatically.",
  },
  {
    question: "How secure is our team data?",
    answer:
      "All data is encrypted in transit using TLS 1.3 and at rest with AES-256 encryption. We support enterprise SSO (SAML 2.0 / Okta), granular role permissions, and regular automated backups.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-[#F4F3EE] py-20 md:py-28 border-t border-[#D8DDD4]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#18221E] sm:text-4xl">
            Everything you need to know
          </p>
          <p className="mt-4 text-base text-[#65706A]">
            Have questions? We have answers. If you need further assistance, reach out to our team.
          </p>
        </div>

        <div className="mt-14 divide-y divide-[#D8DDD4] border-y border-[#D8DDD4]">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question} className="py-5">
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between text-left focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-[#18221E] pr-4">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-[#65706A]"
                  >
                    <ChevronDownIcon size={18} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="mt-3 text-sm leading-relaxed text-[#65706A]">
                        {faq.answer}
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

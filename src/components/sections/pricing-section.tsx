"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: "Starter",
      badge: null,
      isHighlighted: false,
      monthlyPrice: 12,
      yearlyPrice: 10,
      description: "For small teams replacing spreadsheets.",
      features: [
        "Up to 15 team members",
        "Unlimited task & project boards",
        "Up to 10 GB official file storage",
        "Meeting agendas & auto-notes",
        "Email & community support",
      ],
      btnClass: "bg-[#111111] hover:bg-black text-white",
    },
    {
      name: "Team",
      badge: "Most picked",
      isHighlighted: true,
      monthlyPrice: 24,
      yearlyPrice: 19,
      description: "For fast-growing companies and agencies.",
      features: [
        "Unlimited team members",
        "Hiring & candidate pipeline",
        "Approval workflows",
        "Up to 100 GB official file storage",
        "Priority 24/7 support response",
      ],
      btnClass: "bg-white hover:bg-neutral-100 text-[#111111]",
    },
    {
      name: "Business",
      badge: null,
      isHighlighted: false,
      monthlyPrice: 38,
      yearlyPrice: 30,
      description: "For established firms needing custom security.",
      features: [
        "Unlimited seats & workspaces",
        "Up to 1 TB official file storage",
        "Multi-department permissions",
        "Audit log & compliance export",
        "99.9% uptime SLA guarantee",
      ],
      btnClass: "bg-[#111111] hover:bg-black text-white",
    },
  ];

  return (
    <section
      id="pricing"
      className="relative w-full bg-[#FAF9F6] py-20 sm:py-28 lg:py-32 px-6 lg:px-8 font-[family-name:var(--font-plus-jakarta)]"
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto flex flex-col items-center mb-12 sm:mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-3xl sm:text-5xl lg:text-[52px] font-[800] tracking-[-0.03em] text-[#111111] leading-[1.08]"
          >
            Simple pricing.
          </motion.h2>

          {/* Monthly / Yearly Pill Toggle (Functional) */}
          <div className="mt-8 flex items-center gap-3 bg-white p-1.5 pl-4 pr-1.5 rounded-full border border-neutral-200/80 shadow-xs">
            <span
              onClick={() => setIsYearly(false)}
              className={`text-xs font-bold cursor-pointer transition-colors ${
                !isYearly ? "text-[#111111]" : "text-neutral-400"
              }`}
            >
              Monthly
            </span>

            {/* Pill Switch */}
            <div
              onClick={() => setIsYearly((prev) => !prev)}
              className="w-12 h-6.5 bg-[#EFECE0] rounded-full p-1 flex items-center cursor-pointer"
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-[#111111] shadow-xs transition-transform duration-150 ${
                  isYearly ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>

            <span
              onClick={() => setIsYearly(true)}
              className={`text-xs font-bold cursor-pointer transition-colors ${
                isYearly ? "text-[#111111]" : "text-neutral-400"
              }`}
            >
              Yearly
            </span>

            <span className="bg-[#FF6B3D] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
              Save 20%
            </span>
          </div>
        </div>

        {/* 3 Plain Cards (Static, no entrance animation or hover scale) */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch max-w-6xl">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.name}
                className={`relative rounded-[28px] p-8 sm:p-9 flex flex-col justify-between ${
                  plan.isHighlighted
                    ? "bg-[#111111] text-white shadow-[0_24px_60px_-15px_rgba(0,0,0,0.3)]"
                    : "bg-white text-[#111111] shadow-[0_16px_40px_rgba(0,0,0,0.05)] border border-neutral-200/60"
                }`}
              >
                {/* Small orange Most picked tag */}
                {plan.badge && (
                  <span className="absolute -top-3 right-8 bg-[#FF6B3D] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs tracking-wide">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <h3
                    className={`text-[22px] font-extrabold tracking-tight ${
                      plan.isHighlighted ? "text-white" : "text-[#111111]"
                    }`}
                  >
                    {plan.name}
                  </h3>

                  <p
                    className={`mt-1.5 text-[13.5px] font-medium min-h-[38px] ${
                      plan.isHighlighted ? "text-neutral-400" : "text-[#6B6B6B]"
                    }`}
                  >
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold">$</span>
                    <div className="relative overflow-hidden h-14 flex items-center">
                      <span className="text-5xl font-[800] tracking-tight block">
                        {price}
                      </span>
                    </div>
                    <span
                      className={`text-[13px] font-medium ${
                        plan.isHighlighted ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      per user / month
                    </span>
                  </div>

                  {/* Get Started Button */}
                  <button
                    type="button"
                    className={`mt-7 w-full py-3.5 px-6 rounded-full text-[14px] font-bold transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs ${plan.btnClass}`}
                  >
                    Get Started
                  </button>

                  {/* 5 Short Feature Lines with Simple Check Marks */}
                  <div
                    className={`mt-8 pt-6 border-t ${
                      plan.isHighlighted
                        ? "border-neutral-800"
                        : "border-neutral-100"
                    } flex flex-col gap-3 text-[13.5px]`}
                  >
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2.5">
                        <Check
                          className={`w-4 h-4 shrink-0 stroke-[2.5] ${
                            plan.isHighlighted
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          }`}
                        />
                        <span
                          className={`font-medium ${
                            plan.isHighlighted
                              ? "text-neutral-300"
                              : "text-neutral-700"
                          }`}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;

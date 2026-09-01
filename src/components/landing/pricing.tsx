"use client";

import * as React from "react";
import { motion } from "motion/react";
import { CheckIcon } from "./icons";
import { slideUp } from "@/lib/animations";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";

export function Pricing() {
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "annually">("annually");

  const plans = [
    {
      name: "Starter",
      description: "For individuals and small squads starting out.",
      price: "$0",
      period: "forever",
      cta: "Get Started Free",
      highlighted: false,
      features: [
        "Up to 5 team members",
        "3 active projects",
        "Unlimited tasks & subtasks",
        "Basic Kanban & List views",
        "1 GB secure storage",
        "Community support",
      ],
    },
    {
      name: "Pro",
      description: "For fast-growing teams needing unified execution.",
      price: billingCycle === "annually" ? "$10" : "$12",
      period: "per user / month",
      badge: "Most Popular",
      cta: "Start 14-Day Free Trial",
      highlighted: true,
      features: [
        "Unlimited team members",
        "Unlimited projects & boards",
        "Timeline, Gantt & Calendar views",
        "Collaborative documents & notes",
        "50 GB secure storage",
        "Granular roles & permissions",
        "Priority email & chat support",
      ],
    },
    {
      name: "Enterprise",
      description: "For organizations requiring advanced compliance & scale.",
      price: billingCycle === "annually" ? "$24" : "$29",
      period: "per user / month",
      cta: "Contact Enterprise Sales",
      highlighted: false,
      features: [
        "Everything in Pro",
        "SAML SSO & Okta integration",
        "Custom audit logs & compliance",
        "Unlimited team storage",
        "Dedicated Customer Success Manager",
        "99.9% uptime SLA guarantee",
        "Custom billing & invoicing",
      ],
    },
  ];

  return (
    <section id="pricing" className="bg-[#FFFFFF] py-20 md:py-28 border-t border-[#D8DDD4]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#65706A]">
            Simple & Transparent Pricing
          </h2>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#18221E] sm:text-4xl">
            Choose the right plan for your team
          </p>
          <p className="mt-4 text-base text-[#65706A] sm:text-lg">
            Start free for 14 days. No credit card required. Upgrade or downgrade anytime.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center rounded-[10px] border border-[#D8DDD4] bg-[#F4F3EE] p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-[8px] px-3.5 py-1.5 text-xs font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-[#10251F] text-[#F4F3EE]"
                  : "text-[#65706A] hover:text-[#18221E]"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annually")}
              className={`flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-xs font-medium transition-colors ${
                billingCycle === "annually"
                  ? "bg-[#10251F] text-[#F4F3EE]"
                  : "text-[#65706A] hover:text-[#18221E]"
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-[4px] bg-[#C7F34A] px-1.5 py-0.2 text-[10px] font-bold text-[#10251F]">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={`flex flex-col justify-between rounded-[16px] bg-[#FAF9F5] p-8 transition-all duration-200 ${
                plan.highlighted
                  ? "border-2 border-[#10251F] bg-white shadow-card relative"
                  : "border border-[#D8DDD4] shadow-2xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#18221E]">{plan.name}</h3>
                  {plan.badge && (
                    <span className="rounded-full bg-[#C7F34A] px-3 py-0.5 text-[11px] font-bold text-[#10251F] border border-[#B7E63D]">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-[#65706A]">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-[#18221E]">
                    {plan.price}
                  </span>
                  <span className="text-xs font-medium text-[#65706A]">
                    /{plan.period}
                  </span>
                </div>

                <hr className="my-6 border-[#D8DDD4]" />

                {/* Features List */}
                <ul className="space-y-3 text-xs text-[#18221E]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E7EADF] text-[#10251F]">
                        <CheckIcon size={10} />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                {plan.highlighted ? (
                  <PrimaryButton href="#signup" size="md" className="w-full justify-between">
                    {plan.cta}
                  </PrimaryButton>
                ) : (
                  <SecondaryButton href="#signup" size="md" className="w-full justify-between">
                    {plan.cta}
                  </SecondaryButton>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

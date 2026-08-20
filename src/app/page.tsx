"use client";

import { motion } from "motion/react";
import { slideUp, scaleIn, transitions } from "@/lib/animations";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 px-8 py-10 shadow-2xl backdrop-blur-sm"
      >
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1, ...transitions.spring }}
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-2xl font-semibold tracking-tight text-zinc-100"
        >
          Project setup successful
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="mt-2 text-sm text-zinc-400"
        >
          Next.js App Router, TypeScript, Tailwind CSS, and Motion configured and ready.
        </motion.p>
      </motion.div>
    </main>
  );
}

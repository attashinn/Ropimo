import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPublicJobById } from "@/lib/recruitment/public-queries";
import { PublicApplyForm } from "@/components/public/public-apply-form";
import { LogoIcon } from "@/components/landing/icons";

interface Props {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const job = await getPublicJobById(params.jobId);

  if (!job) {
    return {
      title: "Apply for Position — Careers",
    };
  }

  return {
    title: `Apply for ${job.title} — Careers at ${job.company_name || "Ropimo"}`,
    description: `Submit your candidate application and resume for the ${job.title} position.`,
  };
}

export default async function PublicJobApplyPage(props: Props) {
  const params = await props.params;
  const job = await getPublicJobById(params.jobId);

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F4F3EE] flex flex-col justify-between text-[#18221E]">
        <header className="border-b border-[#D8DDD4] bg-white h-16 flex items-center px-6">
          <Link href="/jobs" className="flex items-center gap-2">
            <LogoIcon size={24} />
            <span className="font-bold">Ropimo Careers</span>
          </Link>
        </header>

        <div className="mx-auto max-w-md p-8 rounded-[16px] border border-[#D8DDD4] bg-white text-center space-y-3 shadow-2xs">
          <h1 className="text-xl font-bold">Position Unavailable</h1>
          <p className="text-xs text-[#65706A]">
            This position is no longer accepting public applications.
          </p>
          <div className="pt-2">
            <Link
              href="/jobs"
              className="inline-block rounded-[10px] bg-[#10251F] text-white px-4 py-2 text-xs font-semibold"
            >
              View Open Positions →
            </Link>
          </div>
        </div>

        <footer className="py-6 text-center text-xs text-[#65706A]">
          © {new Date().getFullYear()} Ropimo Inc.
        </footer>
      </div>
    );
  }

  return <PublicApplyForm job={job} />;
}

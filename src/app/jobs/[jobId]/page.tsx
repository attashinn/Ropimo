import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPublicJobById } from "@/lib/recruitment/public-queries";
import { PublicJobDetail } from "@/components/public/public-job-detail";
import { LogoIcon } from "@/components/landing/icons";

interface Props {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const job = await getPublicJobById(params.jobId);

  if (!job) {
    return {
      title: "Position Not Found — Careers",
    };
  }

  return {
    title: `${job.title} — Careers at ${job.company_name || "Ropimo"}`,
    description:
      job.description?.substring(0, 160) ||
      `Apply for the ${job.title} position at ${job.company_name || "Ropimo"}. ${job.location} • ${job.employment_type}`,
  };
}

export default async function PublicJobDetailPage(props: Props) {
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
            This job opening is either closed, in draft, or no longer accepting applications.
          </p>
          <div className="pt-2">
            <Link
              href="/jobs"
              className="inline-block rounded-[10px] bg-[#10251F] text-white px-4 py-2 text-xs font-semibold"
            >
              Explore Open Positions →
            </Link>
          </div>
        </div>

        <footer className="py-6 text-center text-xs text-[#65706A]">
          © {new Date().getFullYear()} Ropimo Inc.
        </footer>
      </div>
    );
  }

  return <PublicJobDetail job={job} />;
}

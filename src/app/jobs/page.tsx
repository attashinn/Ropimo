import * as React from "react";
import { getPublicJobOpenings } from "@/lib/recruitment/public-queries";
import { PublicJobBoard } from "@/components/public/public-job-board";

export const metadata = {
  title: "Careers & Open Positions — Ropimo",
  description:
    "Explore open career opportunities across engineering, design, product, and operations at Ropimo.",
};

export default async function PublicJobsPage(props: {
  searchParams: Promise<{
    search?: string;
    department?: string;
    location?: string;
    employmentType?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const jobs = await getPublicJobOpenings({
    search: searchParams?.search,
    department: searchParams?.department,
    location: searchParams?.location,
    employmentType: searchParams?.employmentType,
  });

  return <PublicJobBoard initialJobs={jobs} />;
}

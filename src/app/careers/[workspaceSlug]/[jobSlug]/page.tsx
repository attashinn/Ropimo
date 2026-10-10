import * as React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPublicJobBySlug } from "@/lib/recruitment/public-queries";
import { CareerJobDetailView } from "@/components/public/career-job-detail-view";

interface PageProps {
  params: Promise<{
    workspaceSlug: string;
    jobSlug: string;
  }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const { workspace, job } = await getPublicJobBySlug(params.workspaceSlug, params.jobSlug);

  if (!workspace || !job) {
    return {
      title: "Position Not Found — Careers",
    };
  }

  const cleanDescription = (job.description || "").replace(/<[^>]*>/g, "").substring(0, 160);

  return {
    title: `${job.title} — ${workspace.name} Careers`,
    description: cleanDescription || `Apply for ${job.title} at ${workspace.name}. ${job.location} • ${job.employment_type}`,
    openGraph: {
      title: `${job.title} at ${workspace.name}`,
      description: cleanDescription,
      images: workspace.logo_url ? [{ url: workspace.logo_url }] : [],
    },
  };
}

export default async function WorkspaceJobDetailPage(props: PageProps) {
  const params = await props.params;
  const { workspace, job, isOpen } = await getPublicJobBySlug(params.workspaceSlug, params.jobSlug);

  if (!workspace || !job) {
    notFound();
  }

  // Schema.org JobPosting structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    datePosted: job.published_at || job.created_at,
    validThrough: job.closes_at || undefined,
    employmentType: job.employment_type ? job.employment_type.toUpperCase().replace("-", "_") : "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: workspace.name,
      logo: workspace.logo_url || undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
      },
    },
    baseSalary:
      job.show_salary && job.salary_min
        ? {
            "@type": "MonetaryAmount",
            currency: job.currency || "USD",
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salary_min,
              maxValue: job.salary_max || undefined,
              unitText: "YEAR",
            },
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CareerJobDetailView workspace={workspace} job={job} isOpen={isOpen} />
    </>
  );
}

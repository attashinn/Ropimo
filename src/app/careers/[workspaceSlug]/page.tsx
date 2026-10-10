import * as React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPublicWorkspaceCareers } from "@/lib/recruitment/public-queries";
import { CareersPortalView } from "@/components/public/careers-portal-view";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const { workspace } = await getPublicWorkspaceCareers(params.workspaceSlug);

  if (!workspace) {
    return {
      title: "Careers — Page Not Found",
    };
  }

  return {
    title: `Careers at ${workspace.name}`,
    description: `Explore open career opportunities and join the team at ${workspace.name}.`,
    openGraph: {
      title: `Careers at ${workspace.name}`,
      description: `Explore open career opportunities and join the team at ${workspace.name}.`,
      images: workspace.logo_url ? [{ url: workspace.logo_url }] : [],
    },
  };
}

export default async function WorkspaceCareersPage(props: PageProps) {
  const params = await props.params;
  const { workspace, jobs } = await getPublicWorkspaceCareers(params.workspaceSlug);

  if (!workspace) {
    notFound();
  }

  return <CareersPortalView workspace={workspace} jobs={jobs} />;
}

import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { recruitmentStore } from "@/lib/recruitment/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ropimo.com";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  try {
    const adminClient = createAdminClient();

    // 1. Fetch workspaces with published openings
    const { data: workspaces } = await adminClient
      .from("workspaces")
      .select("id, slug, updated_at");

    const wsList = workspaces || [];

    for (const ws of wsList) {
      if (!ws.slug) continue;
      entries.push({
        url: `${baseUrl}/careers/${ws.slug}`,
        lastModified: ws.updated_at ? new Date(ws.updated_at) : now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    // 2. Fetch all published active jobs
    const { data: jobs } = await adminClient
      .from("job_openings")
      .select("id, slug, workspace_id, updated_at, workspaces:workspace_id(slug)")
      .in("status", ["published", "Open"]);

    if (jobs) {
      for (const job of jobs) {
        const wsSlug = (job.workspaces as any)?.slug;
        const jobSlug = job.slug || job.id;
        if (wsSlug && jobSlug) {
          entries.push({
            url: `${baseUrl}/careers/${wsSlug}/${jobSlug}`,
            lastModified: job.updated_at ? new Date(job.updated_at) : now,
            changeFrequency: "daily",
            priority: 0.7,
          });
        }
      }
    }
  } catch {
    // Fallback using store
    const store = recruitmentStore.getStore();
    for (const job of store.job_openings || []) {
      if (job.status === "published" || job.status === "Open") {
        const wsSlug = (job as any).workspace_slug || job.workspace_id;
        entries.push({
          url: `${baseUrl}/careers/${wsSlug}/${job.slug || job.id}`,
          lastModified: new Date(job.updated_at || now),
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }
  }

  return entries;
}

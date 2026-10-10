import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobOpening } from "@/types/recruitment";
import { recruitmentStore } from "./store";

interface JobOpeningJoinedRow {
  id: string;
  workspace_id: string;
  department_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  skills: string[] | null;
  employment_type: JobOpening["employment_type"];
  location: string;
  salary_range: string | null;
  status: JobOpening["status"];
  workspaces: { name?: string } | null;
  departments: { name?: string; color?: string; icon?: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface PublicWorkspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
}

export interface PublicJobOpening extends JobOpening {
  company_name?: string;
  company_logo?: string | null;
}

/**
 * Fetch public careers portal data for a specific workspace by slug
 */
export const getPublicWorkspaceCareers = cache(
  async (workspaceSlug: string): Promise<{ workspace: PublicWorkspace | null; jobs: PublicJobOpening[] }> => {
    if (!workspaceSlug) return { workspace: null, jobs: [] };

    const adminClient = createAdminClient();

    try {
      // 1. Resolve workspace by slug (or id as fallback)
      const { data: wsData } = await adminClient
        .from("workspaces")
        .select("id, name, slug, logo_url")
        .or(`slug.eq.${workspaceSlug.toLowerCase()},id.eq.${workspaceSlug}`)
        .limit(1)
        .maybeSingle();

      let workspace: PublicWorkspace | null = wsData || null;

      // Fallback check in store if workspace not found in DB
      if (!workspace) {
        const storeJobs = recruitmentStore.getStore().job_openings;
        const matchingJob = storeJobs.find((j) => (j as any).workspace_slug === workspaceSlug || j.workspace_id === workspaceSlug);
        if (matchingJob) {
          workspace = {
            id: matchingJob.workspace_id,
            name: "Ropimo Workspace",
            slug: workspaceSlug,
            logo_url: null,
          };
        }
      }

      if (!workspace) {
        return { workspace: null, jobs: [] };
      }

      // 2. Fetch published job openings strictly scoped to this workspace
      const now = new Date().toISOString();
      const { data: jobsData, error } = await adminClient
        .from("job_openings")
        .select(`
          *,
          departments:department_id (
            name,
            icon,
            color
          )
        `)
        .eq("workspace_id", workspace.id)
        .in("status", ["published", "Open"])
        .order("created_at", { ascending: false });

      let jobs: PublicJobOpening[] = [];

      if (!error && jobsData) {
        jobs = jobsData
          .filter((j: any) => !j.closes_at || new Date(j.closes_at) > new Date(now))
          .map((row: any) => ({
            ...row,
            company_name: workspace?.name,
            company_logo: workspace?.logo_url,
            department_name: row.departments?.name || "General",
            department_color: row.departments?.color || "#10251F",
            department_icon: row.departments?.icon || null,
            responsibilities: row.responsibilities || [],
            requirements: row.requirements || [],
            skills: row.skills || [],
          }));
      } else {
        // Fallback to store
        const store = recruitmentStore.getStore();
        jobs = (store.job_openings || [])
          .filter(
            (j) =>
              j.workspace_id === workspace?.id &&
              (j.status === "published" || j.status === "Open") &&
              (!j.closes_at || new Date(j.closes_at) > new Date(now))
          )
          .map((j) => ({
            ...j,
            company_name: workspace?.name,
            company_logo: workspace?.logo_url,
          }));
      }

      return { workspace, jobs };
    } catch {
      return { workspace: null, jobs: [] };
    }
  }
);

/**
 * Fetch a single public job opening by workspaceSlug and jobSlug
 */
export const getPublicJobBySlug = cache(
  async (
    workspaceSlug: string,
    jobSlug: string
  ): Promise<{ workspace: PublicWorkspace | null; job: PublicJobOpening | null; isOpen: boolean }> => {
    if (!workspaceSlug || !jobSlug) return { workspace: null, job: null, isOpen: false };

    const adminClient = createAdminClient();

    try {
      // 1. Resolve workspace
      const { data: wsData } = await adminClient
        .from("workspaces")
        .select("id, name, slug, logo_url")
        .or(`slug.eq.${workspaceSlug.toLowerCase()},id.eq.${workspaceSlug}`)
        .limit(1)
        .maybeSingle();

      let workspace: PublicWorkspace | null = wsData || null;

      if (!workspace) {
        const storeJobs = recruitmentStore.getStore().job_openings;
        const matchingJob = storeJobs.find((j) => (j as any).workspace_slug === workspaceSlug || j.workspace_id === workspaceSlug);
        if (matchingJob) {
          workspace = {
            id: matchingJob.workspace_id,
            name: "Ropimo Workspace",
            slug: workspaceSlug,
            logo_url: null,
          };
        }
      }

      if (!workspace) {
        return { workspace: null, job: null, isOpen: false };
      }

      // 2. Resolve job opening by workspace_id and slug or id
      const { data: jobData, error } = await adminClient
        .from("job_openings")
        .select(`
          *,
          departments:department_id (
            name,
            icon,
            color
          )
        `)
        .eq("workspace_id", workspace.id)
        .or(`slug.eq.${jobSlug.toLowerCase()},id.eq.${jobSlug}`)
        .limit(1)
        .maybeSingle();

      let job: PublicJobOpening | null = null;

      if (!error && jobData) {
        job = {
          ...jobData,
          company_name: workspace.name,
          company_logo: workspace.logo_url,
          department_name: jobData.departments?.name || "General",
          department_color: jobData.departments?.color || "#10251F",
          department_icon: jobData.departments?.icon || null,
          responsibilities: jobData.responsibilities || [],
          requirements: jobData.requirements || [],
          skills: jobData.skills || [],
        };
      } else {
        const store = recruitmentStore.getStore();
        const storeJob = (store.job_openings || []).find(
          (j) =>
            j.workspace_id === workspace?.id &&
            ((j.slug && j.slug.toLowerCase() === jobSlug.toLowerCase()) || j.id === jobSlug)
        );
        if (storeJob) {
          job = {
            ...storeJob,
            company_name: workspace.name,
            company_logo: workspace.logo_url,
          };
        }
      }

      if (!job) {
        return { workspace, job: null, isOpen: false };
      }

      const now = new Date();
      const isStatusOpen = job.status === "published" || job.status === "Open";
      const isNotPastClosesAt = !job.closes_at || new Date(job.closes_at) > now;
      const isOpen = isStatusOpen && isNotPastClosesAt;

      return { workspace, job, isOpen };
    } catch {
      return { workspace: null, job: null, isOpen: false };
    }
  }
);

/**
 * Fetch all public OPEN job openings
 */
export const getPublicJobOpenings = cache(
  async (options?: {
    search?: string;
    department?: string;
    location?: string;
    employmentType?: string;
  }): Promise<PublicJobOpening[]> => {
    const adminClient = createAdminClient();

    try {
      const { data, error } = await adminClient
        .from("job_openings")
        .select(`
          *,
          workspaces:workspace_id (
            name,
            logo_url
          ),
          departments:department_id (
            name,
            icon,
            color
          )
        `)
        .eq("status", "Open")
        .order("created_at", { ascending: false });

      let results: PublicJobOpening[] = [];

      if (!error && data && data.length > 0) {
        results = (data as unknown as JobOpeningJoinedRow[]).map((row) => ({
          id: row.id,
          workspace_id: row.workspace_id,
          company_name: row.workspaces?.name || "Ropimo Workspace",
          department_id: row.department_id,
          department_name: row.departments?.name || "General",
          department_color: row.departments?.color || "#10251F",
          department_icon: row.departments?.icon || null,
          title: row.title,
          slug: row.slug || row.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: row.description,
          responsibilities: row.responsibilities || [],
          requirements: row.requirements || [],
          skills: row.skills || [],
          employment_type: row.employment_type || "Full-time",
          location: row.location || "Remote",
          salary_range: row.salary_range,
          status: "Open",
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        }));
      } else {
        // Fallback to store open jobs
        const allStore = recruitmentStore.getStore();
        results = (allStore.job_openings || [])
          .filter((j) => j.status === "Open")
          .map((j) => ({
            ...j,
            company_name: "Ropimo",
          }));
      }

      // Filtering
      if (options?.search) {
        const q = options.search.toLowerCase().trim();
        results = results.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            (j.department_name && j.department_name.toLowerCase().includes(q)) ||
            j.location.toLowerCase().includes(q) ||
            (j.skills || []).some((s) => s.toLowerCase().includes(q))
        );
      }

      if (options?.department && options.department !== "all") {
        results = results.filter(
          (j) =>
            j.department_name?.toLowerCase() === options.department?.toLowerCase() ||
            j.department_id === options.department
        );
      }

      if (options?.location && options.location !== "all") {
        const loc = options.location.toLowerCase();
        results = results.filter((j) => j.location.toLowerCase().includes(loc));
      }

      if (options?.employmentType && options.employmentType !== "all") {
        results = results.filter(
          (j) => j.employment_type.toLowerCase() === options.employmentType?.toLowerCase()
        );
      }

      return results;
    } catch {
      const allStore = recruitmentStore.getStore();
      return (allStore.job_openings || [])
        .filter((j) => j.status === "Open")
        .map((j) => ({ ...j, company_name: "Ropimo" }));
    }
  }
);

/**
 * Fetch a single public OPEN job opening by ID
 */
export async function getPublicJobById(jobId: string): Promise<PublicJobOpening | null> {
  if (!jobId) return null;

  const adminClient = createAdminClient();

  try {
    const { data, error } = await adminClient
      .from("job_openings")
      .select(`
        *,
        workspaces:workspace_id (
          name,
          logo_url
        ),
        departments:department_id (
          name,
          icon,
          color
        )
      `)
      .eq("id", jobId)
      .eq("status", "Open")
      .single();

    if (!error && data) {
      const row = data as unknown as JobOpeningJoinedRow;
      return {
        id: row.id,
        workspace_id: row.workspace_id,
        company_name: row.workspaces?.name || "Ropimo Workspace",
        department_id: row.department_id,
        department_name: row.departments?.name || "General",
        department_color: row.departments?.color || "#10251F",
        department_icon: row.departments?.icon || null,
        title: row.title,
        slug: row.slug,
        description: row.description,
        responsibilities: row.responsibilities || [],
        requirements: row.requirements || [],
        skills: row.skills || [],
        employment_type: row.employment_type || "Full-time",
        location: row.location || "Remote",
        salary_range: row.salary_range,
        status: "Open",
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      };
    }

    // Check store
    const store = recruitmentStore.getStore();
    const storeJob = (store.job_openings || []).find((j) => j.id === jobId && j.status === "Open");
    if (storeJob) {
      return {
        ...storeJob,
        company_name: "Ropimo",
      };
    }

    return null;
  } catch {
    const store = recruitmentStore.getStore();
    const storeJob = (store.job_openings || []).find((j) => j.id === jobId && j.status === "Open");
    return storeJob ? { ...storeJob, company_name: "Ropimo" } : null;
  }
}

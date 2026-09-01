import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobOpening, EmploymentType } from "@/types/recruitment";
import { recruitmentStore } from "./store";

export interface PublicJobOpening extends JobOpening {
  company_name?: string;
}

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
        results = data.map((row: any) => ({
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
          created_at: row.created_at,
          updated_at: row.updated_at,
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
            j.skills.some((s) => s.toLowerCase().includes(q))
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
      const row: any = data;
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
        created_at: row.created_at,
        updated_at: row.updated_at,
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

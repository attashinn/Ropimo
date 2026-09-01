import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  JobOpening,
  JobOpeningStatus,
  Candidate,
  CandidateStage,
  CandidateApplication,
  ApplicationStageHistory,
  Interview,
  InterviewFeedback,
  JobOffer,
  CandidateActivity,
  RecruitmentStats,
} from "@/types/recruitment";
import { recruitmentStore } from "./store";

/**
 * Fetch all job openings in a workspace
 */
export const getWorkspaceJobOpenings = cache(
  async (
    workspaceId: string,
    options?: {
      status?: JobOpeningStatus | "all";
      departmentId?: string;
      search?: string;
    }
  ): Promise<JobOpening[]> => {
    if (!workspaceId) return [];

    const adminClient = createAdminClient();

    try {
      const { data, error } = await adminClient
        .from("job_openings")
        .select(`
          *,
          departments:department_id (
            id,
            name,
            icon,
            color
          )
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error || !data) {
        // Fallback to store
        let storeJobs = recruitmentStore.getJobOpenings(workspaceId);
        if (options?.status && options.status !== "all") {
          storeJobs = storeJobs.filter((j) => j.status === options.status);
        }
        if (options?.departmentId && options.departmentId !== "all") {
          storeJobs = storeJobs.filter((j) => j.department_id === options.departmentId);
        }
        if (options?.search) {
          const q = options.search.toLowerCase().trim();
          storeJobs = storeJobs.filter(
            (j) =>
              j.title.toLowerCase().includes(q) ||
              (j.department_name && j.department_name.toLowerCase().includes(q))
          );
        }
        return storeJobs;
      }

      // Fetch applicant counts and interview counts
      const jobIds = data.map((j) => j.id);
      const countsMap = new Map<string, { applicants: number; interviews: number }>();

      if (jobIds.length > 0) {
        try {
          const [{ data: apps }, { data: interviews }] = await Promise.all([
            adminClient
              .from("candidate_applications")
              .select("job_opening_id")
              .in("job_opening_id", jobIds),
            adminClient
              .from("interviews")
              .select("job_opening_id")
              .in("job_opening_id", jobIds),
          ]);

          (apps || []).forEach((a) => {
            const curr = countsMap.get(a.job_opening_id) || { applicants: 0, interviews: 0 };
            curr.applicants += 1;
            countsMap.set(a.job_opening_id, curr);
          });

          (interviews || []).forEach((i) => {
            const curr = countsMap.get(i.job_opening_id) || { applicants: 0, interviews: 0 };
            curr.interviews += 1;
            countsMap.set(i.job_opening_id, curr);
          });
        } catch {
          // Ignored
        }
      }

      let results: JobOpening[] = data.map((row: any) => {
        const dept = row.departments;
        const counts = countsMap.get(row.id) || { applicants: 0, interviews: 0 };

        return {
          id: row.id,
          workspace_id: row.workspace_id,
          department_id: row.department_id,
          department_name: dept?.name || null,
          department_color: dept?.color || null,
          department_icon: dept?.icon || null,
          title: row.title,
          slug: row.slug || row.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: row.description,
          responsibilities: row.responsibilities || [],
          requirements: row.requirements || [],
          skills: row.skills || [],
          employment_type: row.employment_type || "Full-time",
          location: row.location || "Remote",
          salary_range: row.salary_range,
          hiring_manager_id: row.hiring_manager_id,
          application_deadline: row.application_deadline,
          status: row.status || "Open",
          applicants_count: counts.applicants,
          interviews_count: counts.interviews,
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      });

      // Also merge any store jobs that might not be in DB yet
      const storeJobs = recruitmentStore.getJobOpenings(workspaceId);
      const existingIds = new Set(results.map((r) => r.id));

      for (const sj of storeJobs) {
        if (!existingIds.has(sj.id)) {
          results.push(sj);
        }
      }

      if (options?.status && options.status !== "all") {
        results = results.filter((j) => j.status === options.status);
      }

      if (options?.departmentId && options.departmentId !== "all") {
        results = results.filter((j) => j.department_id === options.departmentId);
      }

      if (options?.search) {
        const q = options.search.toLowerCase().trim();
        results = results.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            (j.department_name && j.department_name.toLowerCase().includes(q)) ||
            (j.description && j.description.toLowerCase().includes(q))
        );
      }

      return results;
    } catch {
      return recruitmentStore.getJobOpenings(workspaceId);
    }
  }
);

/**
 * Fetch a single job opening by ID
 */
export async function getJobOpeningById(
  jobId: string,
  workspaceId: string
): Promise<JobOpening | null> {
  if (!jobId || !workspaceId) return null;

  const adminClient = createAdminClient();

  try {
    const { data, error } = await adminClient
      .from("job_openings")
      .select(`
        *,
        departments:department_id (
          id,
          name,
          icon,
          color
        )
      `)
      .eq("id", jobId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data) {
      return recruitmentStore.getJobOpeningById(jobId, workspaceId);
    }

    const dept = (data as any).departments;

    const [{ count: applicantsCount }, { count: interviewsCount }] = await Promise.all([
      adminClient
        .from("candidate_applications")
        .select("*", { count: "exact", head: true })
        .eq("job_opening_id", jobId),
      adminClient
        .from("interviews")
        .select("*", { count: "exact", head: true })
        .eq("job_opening_id", jobId),
    ]);

    return {
      id: data.id,
      workspace_id: data.workspace_id,
      department_id: data.department_id,
      department_name: dept?.name || null,
      department_color: dept?.color || null,
      department_icon: dept?.icon || null,
      title: data.title,
      slug: data.slug,
      description: data.description,
      responsibilities: data.responsibilities || [],
      requirements: data.requirements || [],
      skills: data.skills || [],
      employment_type: data.employment_type || "Full-time",
      location: data.location || "Remote",
      salary_range: data.salary_range,
      hiring_manager_id: data.hiring_manager_id,
      application_deadline: data.application_deadline,
      status: data.status || "Open",
      applicants_count: applicantsCount || 0,
      interviews_count: interviewsCount || 0,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch {
    return recruitmentStore.getJobOpeningById(jobId, workspaceId);
  }
}

/**
 * Fetch all candidates in a workspace
 */
export const getWorkspaceCandidates = cache(
  async (
    workspaceId: string,
    options?: {
      stage?: CandidateStage | "all";
      search?: string;
      jobOpeningId?: string;
    }
  ): Promise<Candidate[]> => {
    if (!workspaceId) return [];

    const adminClient = createAdminClient();

    try {
      const { data: candidates, error } = await adminClient
        .from("candidates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error || !candidates) {
        let storeCands = recruitmentStore.getCandidates(workspaceId);
        if (options?.stage && options.stage !== "all") {
          storeCands = storeCands.filter((c) => c.latest_stage === options.stage);
        }
        if (options?.search) {
          const q = options.search.toLowerCase().trim();
          storeCands = storeCands.filter(
            (c) =>
              c.full_name.toLowerCase().includes(q) ||
              c.email.toLowerCase().includes(q) ||
              (c.latest_job_title && c.latest_job_title.toLowerCase().includes(q))
          );
        }
        return storeCands;
      }

      const candidateIds = candidates.map((c) => c.id);
      const applicationsMap = new Map<string, { stage: CandidateStage; jobTitle: string }>();

      if (candidateIds.length > 0) {
        const { data: apps } = await adminClient
          .from("candidate_applications")
          .select(`
            candidate_id,
            stage,
            created_at,
            job_openings:job_opening_id (
              title
            )
          `)
          .in("candidate_id", candidateIds)
          .order("created_at", { ascending: false });

        (apps || []).forEach((a: any) => {
          if (!applicationsMap.has(a.candidate_id)) {
            applicationsMap.set(a.candidate_id, {
              stage: a.stage as CandidateStage,
              jobTitle: a.job_openings?.title || "Application",
            });
          }
        });
      }

      let results: Candidate[] = candidates.map((c) => {
        const appInfo = applicationsMap.get(c.id);
        return {
          id: c.id,
          workspace_id: c.workspace_id,
          full_name: c.full_name,
          email: c.email,
          phone: c.phone || null,
          avatar_url: c.avatar_url || null,
          portfolio_url: c.portfolio_url || null,
          linkedin_url: c.linkedin_url || null,
          years_of_experience: c.years_of_experience || null,
          skills: c.skills || [],
          bio: c.bio || null,
          notes: c.notes || null,
          converted_user_id: c.converted_user_id || null,
          latest_stage: appInfo?.stage || "Applied",
          latest_job_title: appInfo?.jobTitle || "Open Role",
          created_at: c.created_at,
          updated_at: c.updated_at,
        };
      });

      if (options?.stage && options.stage !== "all") {
        results = results.filter((c) => c.latest_stage === options.stage);
      }

      if (options?.search) {
        const q = options.search.toLowerCase().trim();
        results = results.filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.latest_job_title && c.latest_job_title.toLowerCase().includes(q)) ||
            c.skills.some((s) => s.toLowerCase().includes(q))
        );
      }

      return results;
    } catch {
      return recruitmentStore.getCandidates(workspaceId);
    }
  }
);

/**
 * Fetch a single candidate by ID with applications, interviews, feedback, offers, and activities
 */
export async function getCandidateById(
  candidateId: string,
  workspaceId: string
): Promise<{
  candidate: Candidate | null;
  applications: CandidateApplication[];
  interviews: Interview[];
  offers: JobOffer[];
  activities: CandidateActivity[];
}> {
  if (!candidateId || !workspaceId) {
    return { candidate: null, applications: [], interviews: [], offers: [], activities: [] };
  }

  const adminClient = createAdminClient();

  try {
    const [{ data: cData }, { data: aData }, { data: iData }, { data: oData }, { data: actData }] =
      await Promise.all([
        adminClient
          .from("candidates")
          .select("*")
          .eq("id", candidateId)
          .eq("workspace_id", workspaceId)
          .single(),
        adminClient
          .from("candidate_applications")
          .select(`
            *,
            job_openings:job_opening_id (
              id,
              title,
              department_id,
              location,
              employment_type
            )
          `)
          .eq("candidate_id", candidateId)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        adminClient
          .from("interviews")
          .select(`
            *,
            job_openings:job_opening_id (
              title
            )
          `)
          .eq("candidate_id", candidateId)
          .eq("workspace_id", workspaceId)
          .order("scheduled_at", { ascending: true }),
        adminClient
          .from("offers")
          .select(`
            *,
            departments:department_id (
              name
            )
          `)
          .eq("candidate_id", candidateId)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        adminClient
          .from("candidate_activities")
          .select("*")
          .eq("candidate_id", candidateId)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
      ]);

    if (!cData) {
      const storedCand = recruitmentStore.getCandidateById(candidateId, workspaceId);
      const storedApps = recruitmentStore.getCandidateApplications(candidateId, workspaceId);
      const storedIvs = recruitmentStore.getInterviews(workspaceId).filter((i) => i.candidate_id === candidateId);
      const storedOffers = recruitmentStore.getOffers(workspaceId).filter((o) => o.candidate_id === candidateId);
      const storedActs = recruitmentStore.getActivities(candidateId, workspaceId);

      return {
        candidate: storedCand,
        applications: storedApps,
        interviews: storedIvs,
        offers: storedOffers,
        activities: storedActs,
      };
    }

    const applications: CandidateApplication[] = (aData || []).map((row: any) => ({
      id: row.id,
      workspace_id: row.workspace_id,
      candidate_id: row.candidate_id,
      job_opening_id: row.job_opening_id,
      stage: row.stage as CandidateStage,
      cover_letter: row.cover_letter,
      cv_storage_key: row.cv_storage_key,
      cv_file_name: row.cv_file_name,
      cv_file_size: row.cv_file_size,
      cv_file_type: row.cv_file_type,
      cv_uploaded_at: row.cv_uploaded_at,
      rejection_reason: row.rejection_reason,
      rejected_at: row.rejected_at,
      hired_at: row.hired_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      job_opening: row.job_openings
        ? {
            id: row.job_openings.id,
            workspace_id: row.workspace_id,
            title: row.job_openings.title,
            department_id: row.job_openings.department_id,
            location: row.job_openings.location,
            employment_type: row.job_openings.employment_type,
            responsibilities: [],
            requirements: [],
            skills: [],
            status: "Open",
            created_at: "",
            updated_at: "",
          }
        : undefined,
    }));

    const interviews: Interview[] = (iData || []).map((row: any) => ({
      id: row.id,
      workspace_id: row.workspace_id,
      application_id: row.application_id,
      candidate_id: row.candidate_id,
      job_opening_id: row.job_opening_id,
      round_name: row.round_name,
      interviewer_id: row.interviewer_id,
      scheduled_at: row.scheduled_at,
      duration_minutes: row.duration_minutes || 45,
      location_or_link: row.location_or_link,
      status: row.status || "Scheduled",
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const offers: JobOffer[] = (oData || []).map((row: any) => ({
      id: row.id,
      workspace_id: row.workspace_id,
      application_id: row.application_id,
      candidate_id: row.candidate_id,
      job_title: row.job_title,
      department_id: row.department_id,
      department_name: row.departments?.name || null,
      employment_type: row.employment_type || "Full-time",
      salary: row.salary,
      start_date: row.start_date,
      reporting_manager_id: row.reporting_manager_id,
      offer_notes: row.offer_notes,
      expiration_date: row.expiration_date,
      status: row.status || "Draft",
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const activities: CandidateActivity[] = (actData || []).map((row: any) => ({
      id: row.id,
      workspace_id: row.workspace_id,
      candidate_id: row.candidate_id,
      application_id: row.application_id,
      actor_id: row.actor_id,
      action_type: row.action_type,
      title: row.title,
      description: row.description,
      metadata: row.metadata || {},
      created_at: row.created_at,
    }));

    const candidate: Candidate = {
      id: cData.id,
      workspace_id: cData.workspace_id,
      full_name: cData.full_name,
      email: cData.email,
      phone: cData.phone || null,
      avatar_url: cData.avatar_url || null,
      portfolio_url: cData.portfolio_url || null,
      linkedin_url: cData.linkedin_url || null,
      years_of_experience: cData.years_of_experience || null,
      skills: cData.skills || [],
      bio: cData.bio || null,
      notes: cData.notes || null,
      converted_user_id: cData.converted_user_id || null,
      latest_stage: applications[0]?.stage || "Applied",
      latest_job_title: applications[0]?.job_opening?.title || "Open Role",
      created_at: cData.created_at,
      updated_at: cData.updated_at,
    };

    return { candidate, applications, interviews, offers, activities };
  } catch {
    const storedCand = recruitmentStore.getCandidateById(candidateId, workspaceId);
    const storedApps = recruitmentStore.getCandidateApplications(candidateId, workspaceId);
    const storedIvs = recruitmentStore.getInterviews(workspaceId).filter((i) => i.candidate_id === candidateId);
    const storedOffers = recruitmentStore.getOffers(workspaceId).filter((o) => o.candidate_id === candidateId);
    const storedActs = recruitmentStore.getActivities(candidateId, workspaceId);

    return {
      candidate: storedCand,
      applications: storedApps,
      interviews: storedIvs,
      offers: storedOffers,
      activities: storedActs,
    };
  }
}

/**
 * Fetch all interviews in a workspace
 */
export const getWorkspaceInterviews = cache(
  async (workspaceId: string): Promise<Interview[]> => {
    if (!workspaceId) return [];

    const adminClient = createAdminClient();

    try {
      const { data, error } = await adminClient
        .from("interviews")
        .select(`
          *,
          candidates:candidate_id (
            id,
            full_name,
            email,
            avatar_url
          ),
          job_openings:job_opening_id (
            id,
            title
          )
        `)
        .eq("workspace_id", workspaceId)
        .order("scheduled_at", { ascending: true });

      if (error || !data) {
        return recruitmentStore.getInterviews(workspaceId);
      }

      return data.map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        application_id: row.application_id,
        candidate_id: row.candidate_id,
        job_opening_id: row.job_opening_id,
        round_name: row.round_name,
        interviewer_id: row.interviewer_id,
        scheduled_at: row.scheduled_at,
        duration_minutes: row.duration_minutes || 45,
        location_or_link: row.location_or_link,
        status: row.status || "Scheduled",
        notes: row.notes,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        candidate: row.candidates
          ? {
              id: row.candidates.id,
              workspace_id: row.workspace_id,
              full_name: row.candidates.full_name,
              email: row.candidates.email,
              avatar_url: row.candidates.avatar_url,
              skills: [],
              created_at: "",
              updated_at: "",
            }
          : undefined,
        job_opening: row.job_openings
          ? {
              id: row.job_openings.id,
              workspace_id: row.workspace_id,
              title: row.job_openings.title,
              responsibilities: [],
              requirements: [],
              skills: [],
              employment_type: "Full-time",
              location: "",
              status: "Open",
              created_at: "",
              updated_at: "",
            }
          : undefined,
      }));
    } catch {
      return recruitmentStore.getInterviews(workspaceId);
    }
  }
);

/**
 * Fetch high-level recruitment metrics for the dashboard KPI cards
 */
export async function getRecruitmentStats(workspaceId: string): Promise<RecruitmentStats> {
  if (!workspaceId) {
    return {
      openJobsCount: 0,
      activeCandidatesCount: 0,
      interviewsScheduledCount: 0,
      offersPendingCount: 0,
      hiredThisQuarterCount: 0,
    };
  }

  const jobs = await getWorkspaceJobOpenings(workspaceId);
  const candidates = await getWorkspaceCandidates(workspaceId);
  const interviews = await getWorkspaceInterviews(workspaceId);
  const offers = recruitmentStore.getOffers(workspaceId);

  const openJobsCount = jobs.filter((j) => j.status === "Open").length;
  const activeCandidatesCount = candidates.filter(
    (c) => !["Rejected", "Archived", "Withdrawn", "Expired"].includes(c.latest_stage || "")
  ).length;
  const interviewsScheduledCount = interviews.filter(
    (i) => i.status === "Scheduled" || i.status === "Rescheduled"
  ).length;
  const offersPendingCount = offers.filter((o) =>
    ["Draft", "Sent", "Viewed"].includes(o.status)
  ).length;
  const hiredCount = candidates.filter((c) => c.latest_stage === "Hired").length;

  return {
    openJobsCount,
    activeCandidatesCount,
    interviewsScheduledCount,
    offersPendingCount,
    hiredThisQuarterCount: hiredCount,
  };
}

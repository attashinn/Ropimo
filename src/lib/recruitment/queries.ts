import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables } from "@/types/database";
import {
  JobOpening,
  JobOpeningStatus,
  Candidate,
  CandidateStage,
  CandidateApplication,
  Interview,
  InterviewStatus,
  InterviewFeedback,
  JobOffer,
  CandidateActivity,
  CandidateEvent,
  CandidateNote,
  EmploymentType,
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

      type JobOpeningWithDept = Tables<"job_openings"> & { departments?: { name?: string; color?: string; icon?: string } | null };
      let results: JobOpening[] = (data as unknown as JobOpeningWithDept[]).map((row) => {
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
          employment_type: (row.employment_type as EmploymentType) || "Full-time",
          location: row.location || "Remote",
          salary_range: row.salary_range,
          hiring_manager_id: row.hiring_manager_id,
          application_deadline: row.application_deadline,
          status: (row.status as JobOpeningStatus) || "Open",
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

    const dept = (data as unknown as { departments?: { name?: string; color?: string; icon?: string } | null }).departments;

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
      source?: string;
      rating?: number | "all";
      appliedDate?: string;
      skills?: string;
      page?: number;
      pageSize?: number;
      viewerUserId?: string;
      viewerRole?: string;
      leadDepartmentIds?: string[];
    }
  ): Promise<Candidate[]> => {
    if (!workspaceId) return [];

    let viewerUserId = options?.viewerUserId;
    let viewerRole = options?.viewerRole;
    let leadDeptIds = options?.leadDepartmentIds || [];

    // Attempt to resolve caller context if not provided
    if (!viewerUserId || !viewerRole) {
      try {
        const { getUserPermissionContext } = await import("@/lib/permissions-server");
        const ctx = await getUserPermissionContext(workspaceId, viewerUserId);
        if (ctx) {
          viewerUserId = ctx.userId;
          viewerRole = ctx.role;
          leadDeptIds = ctx.leadDepartmentIds || [];
        }
      } catch {
        // Ignored in non-auth or test context
      }
    }

    const adminClient = createAdminClient();

    try {
      const { data: candidates, error } = await adminClient
        .from("candidates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      let candidateList: Candidate[] = [];

      if (error || !candidates) {
        candidateList = recruitmentStore.getCandidates(workspaceId);
      } else {
        const candidateIds = candidates.map((c) => c.id);
        const applicationsMap = new Map<string, { stage: CandidateStage; jobTitle: string; jobId?: string; departmentId?: string; rating?: number; tags?: string[] }>();

        if (candidateIds.length > 0) {
          const { data: apps } = await adminClient
            .from("candidate_applications")
            .select(`
              id,
              candidate_id,
              job_opening_id,
              stage,
              rating,
              tags,
              created_at,
              job_openings:job_opening_id (
                id,
                title,
                department_id
              )
            `)
            .in("candidate_id", candidateIds)
            .order("created_at", { ascending: false });

          type AppWithJob = {
            id: string;
            candidate_id: string;
            job_opening_id: string;
            stage: string;
            rating?: number | null;
            tags?: string[] | null;
            job_openings?: { id: string; title: string; department_id: string | null } | null;
          };

          ((apps as unknown as AppWithJob[]) || []).forEach((a) => {
            if (!applicationsMap.has(a.candidate_id)) {
              applicationsMap.set(a.candidate_id, {
                stage: (a.stage?.toLowerCase() as CandidateStage) || "applied",
                jobTitle: a.job_openings?.title || "Application",
                jobId: a.job_opening_id,
                departmentId: a.job_openings?.department_id || undefined,
                rating: a.rating || undefined,
                tags: a.tags || undefined,
              });
            }
          });
        }

        candidateList = candidates.map((c) => {
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
            rating: c.rating || appInfo?.rating || null,
            tags: c.tags && c.tags.length > 0 ? c.tags : (appInfo?.tags || []),
            source: c.source || "Careers Portal",
            rejection_reason: c.rejection_reason || null,
            rejected_at: c.rejected_at || null,
            converted_user_id: c.converted_user_id || null,
            latest_stage: (c.latest_stage?.toLowerCase() as CandidateStage) || appInfo?.stage || "applied",
            latest_job_title: appInfo?.jobTitle || "Open Role",
            latest_job_id: appInfo?.jobId || undefined,
            department_id: appInfo?.departmentId || undefined,
            created_at: c.created_at,
            updated_at: c.updated_at,
          };
        });
      }

      // ── ACCESS CONTROL FILTERING ──
      // 1. Manager: sees ONLY candidates for their department's jobs (or where they are assigned interviewer)
      if (viewerRole === "manager") {
        const allowedJobs = recruitmentStore
          .getJobOpenings(workspaceId)
          .filter((j) => (j.department_id && leadDeptIds.includes(j.department_id)) || j.hiring_manager_id === viewerUserId)
          .map((j) => j.id);

        const allowedCandidateIdsFromInterviews = recruitmentStore
          .getInterviews(workspaceId)
          .filter((iv) => iv.interviewer_id === viewerUserId || iv.interviewer_ids?.includes(viewerUserId || ""))
          .map((iv) => iv.candidate_id);

        candidateList = candidateList.filter((c) => {
          const apps = recruitmentStore.getCandidateApplications(c.id, workspaceId);
          const hasDeptJob = apps.some((a) => allowedJobs.includes(a.job_opening_id) || (c.department_id && leadDeptIds.includes(c.department_id)));
          const isAssigned = allowedCandidateIdsFromInterviews.includes(c.id);
          return hasDeptJob || isAssigned;
        });
      }
      // 2. Member / Assigned Interviewer: sees ONLY candidates they interview
      else if (viewerRole && !["owner", "admin", "hr"].includes(viewerRole)) {
        const interviewedCandidateIds = recruitmentStore
          .getInterviews(workspaceId)
          .filter((iv) => iv.interviewer_id === viewerUserId || iv.interviewer_ids?.includes(viewerUserId || ""))
          .map((iv) => iv.candidate_id);

        candidateList = candidateList.filter((c) => interviewedCandidateIds.includes(c.id));
      }

      // ── FILTERS ──
      if (options?.stage && options.stage !== "all") {
        const targetStage = options.stage.toLowerCase();
        candidateList = candidateList.filter((c) => (c.latest_stage || "applied").toLowerCase() === targetStage);
      }

      if (options?.jobOpeningId && options.jobOpeningId !== "all") {
        candidateList = candidateList.filter((c) => {
          const apps = recruitmentStore.getCandidateApplications(c.id, workspaceId);
          return c.latest_job_id === options.jobOpeningId || apps.some((a) => a.job_opening_id === options.jobOpeningId);
        });
      }

      if (options?.source && options.source !== "all") {
        candidateList = candidateList.filter((c) => (c.source || "").toLowerCase() === options.source?.toLowerCase());
      }

      if (options?.rating && options.rating !== "all") {
        candidateList = candidateList.filter((c) => c.rating === options.rating);
      }

      if (options?.appliedDate) {
        const filterDate = options.appliedDate.slice(0, 10);
        candidateList = candidateList.filter((c) => c.created_at?.slice(0, 10) === filterDate);
      }

      if (options?.skills) {
        const skillQuery = options.skills.toLowerCase().trim();
        candidateList = candidateList.filter((c) =>
          c.skills.some((s) => s.toLowerCase().includes(skillQuery))
        );
      }

      if (options?.search) {
        const q = options.search.toLowerCase().trim();
        candidateList = candidateList.filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.latest_job_title && c.latest_job_title.toLowerCase().includes(q)) ||
            c.skills.some((s) => s.toLowerCase().includes(q))
        );
      }

      // Pagination
      if (options?.page && options?.pageSize) {
        const start = (options.page - 1) * options.pageSize;
        return candidateList.slice(start, start + options.pageSize);
      }

      return candidateList;
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
  workspaceId: string,
  options?: {
    viewerUserId?: string;
    viewerRole?: string;
    leadDepartmentIds?: string[];
  }
): Promise<{
  candidate: Candidate | null;
  applications: CandidateApplication[];
  interviews: Interview[];
  offers: JobOffer[];
  activities: CandidateActivity[];
  events: CandidateEvent[];
  notes: CandidateNote[];
  feedbacks: InterviewFeedback[];
}> {
  if (!candidateId || !workspaceId) {
    return {
      candidate: null,
      applications: [],
      interviews: [],
      offers: [],
      activities: [],
      events: [],
      notes: [],
      feedbacks: [],
    };
  }

  let viewerUserId = options?.viewerUserId;
  let viewerRole = options?.viewerRole;
  let leadDeptIds = options?.leadDepartmentIds || [];

  if (!viewerUserId || !viewerRole) {
    try {
      const { getUserPermissionContext } = await import("@/lib/permissions-server");
      const ctx = await getUserPermissionContext(workspaceId, viewerUserId);
      if (ctx) {
        viewerUserId = ctx.userId;
        viewerRole = ctx.role;
        leadDeptIds = ctx.leadDepartmentIds || [];
      }
    } catch {
      // Ignored
    }
  }

  const adminClient = createAdminClient();

  try {
    const [
      { data: cData },
      { data: aData },
      { data: iData },
      { data: oData },
      { data: actData },
      { data: evData },
      { data: noteData },
    ] = await Promise.all([
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
      adminClient
        .from("candidate_events")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false }),
      adminClient
        .from("candidate_notes")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false }),
    ]);

    let candidate: Candidate | null = null;
    let applications: CandidateApplication[] = [];
    let interviews: Interview[] = [];
    let offers: JobOffer[] = [];
    let activities: CandidateActivity[] = [];
    let events: CandidateEvent[] = [];
    let notes: CandidateNote[] = [];
    let feedbacks: InterviewFeedback[] = [];

    if (!cData) {
      candidate = recruitmentStore.getCandidateById(candidateId, workspaceId);
      applications = recruitmentStore.getCandidateApplications(candidateId, workspaceId);
      interviews = recruitmentStore.getInterviews(workspaceId).filter((i) => i.candidate_id === candidateId);
      offers = recruitmentStore.getOffers(workspaceId).filter((o) => o.candidate_id === candidateId);
      activities = recruitmentStore.getActivities(candidateId, workspaceId);
      events = recruitmentStore.getCandidateEvents(candidateId, workspaceId);
      notes = recruitmentStore.getCandidateNotes(candidateId, workspaceId);
      interviews.forEach((iv) => {
        feedbacks.push(...recruitmentStore.getFeedback(iv.id, workspaceId));
      });
    } else {
      type AppJoined = Tables<"candidate_applications"> & {
        job_openings?: { id: string; title: string; department_id: string | null; location: string; employment_type: string } | null;
      };
      applications = ((aData as unknown as AppJoined[]) || []).map((row) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        candidate_id: row.candidate_id,
        job_opening_id: row.job_opening_id,
        stage: (row.stage?.toLowerCase() as CandidateStage) || "applied",
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
              employment_type: "Full-time" as EmploymentType,
              responsibilities: [],
              requirements: [],
              skills: [],
              status: "Open",
              created_at: "",
              updated_at: "",
            }
          : undefined,
      }));

      interviews = ((iData as unknown as Tables<"interviews">[]) || []).map((row) => ({
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
        status: (row.status?.toLowerCase() as any) || "scheduled",
        notes: row.notes,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      type OfferJoined = Tables<"offers"> & { departments?: { name?: string } | null };
      offers = ((oData as unknown as OfferJoined[]) || []).map((row) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        application_id: row.application_id,
        candidate_id: row.candidate_id,
        job_title: row.job_title,
        department_id: row.department_id,
        department_name: row.departments?.name || null,
        employment_type: (row.employment_type as EmploymentType) || "Full-time",
        salary: row.salary,
        start_date: row.start_date,
        reporting_manager_id: row.reporting_manager_id,
        offer_notes: row.offer_notes,
        expiration_date: row.expiration_date,
        status: (row.status || "Draft") as import("@/types/recruitment").OfferStatus,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      activities = ((actData as unknown as Tables<"candidate_activities">[]) || []).map((row) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        candidate_id: row.candidate_id,
        application_id: row.application_id,
        actor_id: row.actor_id,
        action_type: row.action_type,
        title: row.title,
        description: row.description,
        metadata: (row.metadata as Record<string, unknown>) || {},
        created_at: row.created_at,
      }));

      events = (evData || []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        candidate_id: row.candidate_id,
        job_opening_id: row.job_opening_id,
        event_type: row.event_type,
        actor_id: row.actor_id,
        actor_name: row.actor_name,
        notes: row.notes,
        metadata: row.metadata || {},
        created_at: row.created_at,
      }));

      notes = (noteData || []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        candidate_id: row.candidate_id,
        application_id: row.application_id,
        author_id: row.author_id,
        author_name: row.author_name || "Team Member",
        content: row.content,
        mentions: row.mentions || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      // Fetch feedback
      if (interviews.length > 0) {
        const ivIds = interviews.map((i) => i.id);
        const { data: fbData } = await adminClient
          .from("interview_feedback")
          .select("*")
          .in("interview_id", ivIds);

        feedbacks = (fbData || []).map((f: any) => ({
          id: f.id,
          workspace_id: cData.workspace_id,
          interview_id: f.interview_id,
          application_id: f.application_id || applications[0]?.id || "",
          candidate_id: cData.id,
          interviewer_id: f.interviewer_id,
          rating: f.rating || f.overall_rating || 3,
          skills_rating: f.skills_rating || 3,
          communication_rating: f.communication_rating || 3,
          culture_rating: f.culture_rating || 3,
          recommendation: f.recommendation || "yes",
          comments: f.comments || f.notes || "",
          submitted_at: f.submitted_at || f.created_at,
          created_at: f.created_at || new Date().toISOString(),
          updated_at: f.updated_at || new Date().toISOString(),
        }));
      }

      candidate = {
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
        rating: cData.rating || null,
        tags: cData.tags || [],
        source: cData.source || "Careers Portal",
        rejection_reason: cData.rejection_reason || null,
        rejected_at: cData.rejected_at || null,
        converted_user_id: cData.converted_user_id || null,
        latest_stage: (applications[0]?.stage?.toLowerCase() as CandidateStage) || "applied",
        latest_job_title: applications[0]?.job_opening?.title || "Open Role",
        created_at: cData.created_at,
        updated_at: cData.updated_at,
      };
    }

    if (!candidate) {
      return { candidate: null, applications: [], interviews: [], offers: [], activities: [], events: [], notes: [], feedbacks: [] };
    }

    // Merge store events & notes if DB was empty
    if (events.length === 0) {
      events = recruitmentStore.getCandidateEvents(candidateId, workspaceId);
    }
    if (notes.length === 0) {
      notes = recruitmentStore.getCandidateNotes(candidateId, workspaceId);
    }

    // ── ACCESS CONTROL RULES ──
    const isInterviewer = interviews.some(
      (iv) => iv.interviewer_id === viewerUserId || iv.interviewer_ids?.includes(viewerUserId || "")
    );

    // 1. Manager Access Check
    if (viewerRole === "manager") {
      const allowedJobs = recruitmentStore
        .getJobOpenings(workspaceId)
        .filter((j) => (j.department_id && leadDeptIds.includes(j.department_id)) || j.hiring_manager_id === viewerUserId)
        .map((j) => j.id);

      const hasDeptJob = applications.some((a) => allowedJobs.includes(a.job_opening_id));
      if (!hasDeptJob && !isInterviewer) {
        return { candidate: null, applications: [], interviews: [], offers: [], activities: [], events: [], notes: [], feedbacks: [] };
      }
    }
    // 2. Member / Assigned Interviewer Access Check
    else if (viewerRole && !["owner", "admin", "hr"].includes(viewerRole)) {
      if (!isInterviewer) {
        return { candidate: null, applications: [], interviews: [], offers: [], activities: [], events: [], notes: [], feedbacks: [] };
      }

      // "never compensation, offers"
      offers = [];

      // "hiring team only" for notes
      notes = [];

      // "or other interviewers' scores until they submit their own"
      feedbacks = feedbacks.filter((fb) => {
        // Can always see own feedback
        if (fb.interviewer_id === viewerUserId) return true;
        // Can only see others' feedback if viewer has submitted feedback for that interview
        const viewerSubmitted = feedbacks.some(
          (myFb) => myFb.interview_id === fb.interview_id && myFb.interviewer_id === viewerUserId
        );
        return viewerSubmitted;
      });
    }

    return { candidate, applications, interviews, offers, activities, events, notes, feedbacks };
  } catch {
    const storedCand = recruitmentStore.getCandidateById(candidateId, workspaceId);
    const storedApps = recruitmentStore.getCandidateApplications(candidateId, workspaceId);
    const storedIvs = recruitmentStore.getInterviews(workspaceId).filter((i) => i.candidate_id === candidateId);
    const storedOffers = recruitmentStore.getOffers(workspaceId).filter((o) => o.candidate_id === candidateId);
    const storedActs = recruitmentStore.getActivities(candidateId, workspaceId);
    const storedEvents = recruitmentStore.getCandidateEvents(candidateId, workspaceId);
    const storedNotes = recruitmentStore.getCandidateNotes(candidateId, workspaceId);
    const storedFeedbacks: InterviewFeedback[] = [];
    storedIvs.forEach((iv) => {
      storedFeedbacks.push(...recruitmentStore.getFeedback(iv.id, workspaceId));
    });

    return {
      candidate: storedCand,
      applications: storedApps,
      interviews: storedIvs,
      offers: storedOffers,
      activities: storedActs,
      events: storedEvents,
      notes: storedNotes,
      feedbacks: storedFeedbacks,
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

      type InterviewJoined = Tables<"interviews"> & {
        candidates?: { id: string; full_name?: string; email?: string; avatar_url?: string | null } | null;
        job_openings?: { id: string; title?: string } | null;
      };
      return (data as unknown as InterviewJoined[]).map((row) => ({
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
        status: (row.status?.toLowerCase() as InterviewStatus) || "scheduled",
        notes: row.notes,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        candidate: row.candidates
          ? {
              id: row.candidates.id,
              workspace_id: row.workspace_id,
              full_name: row.candidates.full_name || "Unknown Candidate",
              email: row.candidates.email || "",
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
              title: row.job_openings.title || "Untitled Opening",
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

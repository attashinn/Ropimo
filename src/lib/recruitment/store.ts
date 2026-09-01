import fs from "fs";
import path from "path";
import {
  JobOpening,
  Candidate,
  CandidateApplication,
  ApplicationStageHistory,
  Interview,
  InterviewFeedback,
  JobOffer,
  CandidateActivity,
} from "@/types/recruitment";

import { EmployeeOnboarding, OnboardingChecklistItem, WorkspaceInvitation } from "@/types/people";

interface RecruitmentDataStore {
  job_openings: JobOpening[];
  candidates: Candidate[];
  candidate_applications: CandidateApplication[];
  application_stage_history: ApplicationStageHistory[];
  interviews: Interview[];
  interview_feedback: InterviewFeedback[];
  offers: JobOffer[];
  candidate_activities: CandidateActivity[];
  onboardings: EmployeeOnboarding[];
  invitations: WorkspaceInvitation[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "recruitment-store.json");

function ensureStore(): RecruitmentDataStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial: RecruitmentDataStore = {
        job_openings: [],
        candidates: [],
        candidate_applications: [],
        application_stage_history: [],
        interviews: [],
        interview_feedback: [],
        offers: [],
        candidate_activities: [],
        onboardings: [],
        invitations: [],
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.onboardings) parsed.onboardings = [];
    if (!parsed.invitations) parsed.invitations = [];
    return parsed;
  } catch {
    return {
      job_openings: [],
      candidates: [],
      candidate_applications: [],
      application_stage_history: [],
      interviews: [],
      interview_feedback: [],
      offers: [],
      candidate_activities: [],
      onboardings: [],
      invitations: [],
    };
  }
}

function saveStore(data: RecruitmentDataStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save recruitment store:", err);
  }
}

export const recruitmentStore = {
  getStore: ensureStore,

  // Job Openings
  getJobOpenings(workspaceId: string): JobOpening[] {
    const store = ensureStore();
    return store.job_openings.filter((j) => j.workspace_id === workspaceId);
  },

  getJobOpeningById(id: string, workspaceId: string): JobOpening | null {
    const store = ensureStore();
    return store.job_openings.find((j) => j.id === id && j.workspace_id === workspaceId) || null;
  },

  saveJobOpening(job: JobOpening) {
    const store = ensureStore();
    const idx = store.job_openings.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      store.job_openings[idx] = job;
    } else {
      store.job_openings.unshift(job);
    }
    saveStore(store);
  },

  // Candidates
  getCandidates(workspaceId: string): Candidate[] {
    const store = ensureStore();
    const cands = store.candidates.filter((c) => c.workspace_id === workspaceId);
    return cands.map((c) => {
      const apps = store.candidate_applications
        .filter((a) => a.candidate_id === c.id && a.workspace_id === workspaceId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latestApp = apps[0];
      const job = latestApp ? store.job_openings.find((j) => j.id === latestApp.job_opening_id) : null;

      return {
        ...c,
        tags: c.tags || [],
        notes_list: c.notes_list || [],
        assigned_recruiter_id: latestApp?.assigned_recruiter_id || c.assigned_recruiter_id || null,
        assigned_recruiter_name: latestApp?.assigned_recruiter_name || c.assigned_recruiter_name || null,
        is_archived: latestApp?.is_archived || c.is_archived || false,
        latest_stage: latestApp?.stage || c.latest_stage || "Applied",
        latest_job_title: job?.title || c.latest_job_title || "General Application",
        latest_application_id: latestApp?.id,
        latest_job_id: latestApp?.job_opening_id,
        cv_storage_key: latestApp?.cv_storage_key || c.cv_storage_key,
        cv_file_name: latestApp?.cv_file_name || c.cv_file_name,
        cv_file_size: latestApp?.cv_file_size || c.cv_file_size,
        cv_file_type: latestApp?.cv_file_type || c.cv_file_type,
        cover_letter: latestApp?.cover_letter || c.cover_letter,
        source: latestApp?.source || c.source || "Careers Portal",
      };
    });
  },

  getCandidateById(id: string, workspaceId: string): Candidate | null {
    const store = ensureStore();
    const c = store.candidates.find((c) => c.id === id && c.workspace_id === workspaceId) || null;
    if (!c) return null;

    const apps = store.candidate_applications
      .filter((a) => a.candidate_id === c.id && a.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestApp = apps[0];
    const job = latestApp ? store.job_openings.find((j) => j.id === latestApp.job_opening_id) : null;

    return {
      ...c,
      tags: c.tags || [],
      notes_list: c.notes_list || [],
      assigned_recruiter_id: latestApp?.assigned_recruiter_id || c.assigned_recruiter_id || null,
      assigned_recruiter_name: latestApp?.assigned_recruiter_name || c.assigned_recruiter_name || null,
      is_archived: latestApp?.is_archived || c.is_archived || false,
      latest_stage: latestApp?.stage || c.latest_stage || "Applied",
      latest_job_title: job?.title || c.latest_job_title || "General Application",
      latest_application_id: latestApp?.id,
      latest_job_id: latestApp?.job_opening_id,
      cv_storage_key: latestApp?.cv_storage_key || c.cv_storage_key,
      cv_file_name: latestApp?.cv_file_name || c.cv_file_name,
      cv_file_size: latestApp?.cv_file_size || c.cv_file_size,
      cv_file_type: latestApp?.cv_file_type || c.cv_file_type,
      cover_letter: latestApp?.cover_letter || c.cover_letter,
      source: latestApp?.source || c.source || "Careers Portal",
    };
  },

  saveCandidate(candidate: Candidate) {
    const store = ensureStore();
    const idx = store.candidates.findIndex((c) => c.id === candidate.id);
    if (idx >= 0) {
      store.candidates[idx] = candidate;
    } else {
      store.candidates.unshift(candidate);
    }
    saveStore(store);
  },

  // Applications
  getApplications(workspaceId: string): CandidateApplication[] {
    const store = ensureStore();
    return store.candidate_applications.filter((a) => a.workspace_id === workspaceId);
  },

  getCandidateApplications(candidateId: string, workspaceId: string): CandidateApplication[] {
    const store = ensureStore();
    return store.candidate_applications.filter(
      (a) => a.candidate_id === candidateId && a.workspace_id === workspaceId
    );
  },

  saveApplication(app: CandidateApplication) {
    const store = ensureStore();
    const idx = store.candidate_applications.findIndex((a) => a.id === app.id);
    if (idx >= 0) {
      store.candidate_applications[idx] = app;
    } else {
      store.candidate_applications.unshift(app);
    }
    saveStore(store);
  },

  // Interviews
  getInterviews(workspaceId: string): Interview[] {
    const store = ensureStore();
    return store.interviews
      .filter((i) => i.workspace_id === workspaceId)
      .map((i) => {
        const candidate = store.candidates.find((c) => c.id === i.candidate_id);
        const job = store.job_openings.find((j) => j.id === i.job_opening_id);
        const feedback = store.interview_feedback.filter(
          (f) => f.interview_id === i.id && f.workspace_id === workspaceId
        );
        return {
          ...i,
          candidate: candidate || undefined,
          job_opening: job || undefined,
          feedback,
        };
      });
  },

  saveInterview(interview: Interview) {
    const store = ensureStore();
    const idx = store.interviews.findIndex((i) => i.id === interview.id);
    if (idx >= 0) {
      store.interviews[idx] = interview;
    } else {
      store.interviews.unshift(interview);
    }
    saveStore(store);
  },

  // Feedback
  getFeedback(interviewId: string, workspaceId: string): InterviewFeedback[] {
    const store = ensureStore();
    return store.interview_feedback.filter(
      (f) => f.interview_id === interviewId && f.workspace_id === workspaceId
    );
  },

  saveFeedback(fb: InterviewFeedback) {
    const store = ensureStore();
    store.interview_feedback.push(fb);
    saveStore(store);
  },

  // Offers
  getOffers(workspaceId: string): JobOffer[] {
    const store = ensureStore();
    return store.offers.filter((o) => o.workspace_id === workspaceId);
  },

  saveOffer(offer: JobOffer) {
    const store = ensureStore();
    const idx = store.offers.findIndex((o) => o.id === offer.id);
    if (idx >= 0) {
      store.offers[idx] = offer;
    } else {
      store.offers.unshift(offer);
    }
    saveStore(store);
  },

  // Activities
  getActivities(candidateId: string, workspaceId: string): CandidateActivity[] {
    const store = ensureStore();
    return store.candidate_activities.filter(
      (a) =>
        (a.candidate_id === candidateId || a.actor_id === candidateId || !candidateId) &&
        a.workspace_id === workspaceId
    );
  },

  getWorkspaceActivities(workspaceId: string): CandidateActivity[] {
    const store = ensureStore();
    return store.candidate_activities.filter((a) => a.workspace_id === workspaceId);
  },

  saveActivity(activity: CandidateActivity) {
    const store = ensureStore();
    store.candidate_activities.unshift(activity);
    saveStore(store);
  },

  // Onboardings
  getOnboardings(workspaceId: string): EmployeeOnboarding[] {
    const store = ensureStore();
    return (store.onboardings || []).filter((o) => o.workspace_id === workspaceId);
  },

  getOnboardingByUserId(userId: string, workspaceId: string): EmployeeOnboarding | null {
    const store = ensureStore();
    return (
      (store.onboardings || []).find(
        (o) => o.user_id === userId && o.workspace_id === workspaceId
      ) || null
    );
  },

  getOnboardingByCandidateId(candidateId: string, workspaceId: string): EmployeeOnboarding | null {
    const store = ensureStore();
    return (
      (store.onboardings || []).find(
        (o) => o.candidate_id === candidateId && o.workspace_id === workspaceId
      ) || null
    );
  },

  saveOnboarding(onboarding: EmployeeOnboarding) {
    const store = ensureStore();
    if (!store.onboardings) store.onboardings = [];
    const idx = store.onboardings.findIndex((o) => o.id === onboarding.id || o.user_id === onboarding.user_id);
    if (idx >= 0) {
      store.onboardings[idx] = onboarding;
    } else {
      store.onboardings.unshift(onboarding);
    }
    saveStore(store);
  },

  // Unique Employee ID Generator (e.g. EMP-001, EMP-002, ...)
  getNextEmployeeId(workspaceId: string): string {
    const store = ensureStore();
    let maxId = 0;

    // Check existing candidates with employee_id
    store.candidates.forEach((c) => {
      if (c.workspace_id === workspaceId && c.employee_id) {
        const match = c.employee_id.match(/EMP-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxId) maxId = num;
        }
      }
    });

    // Check existing onboardings with employee_id
    (store.onboardings || []).forEach((o) => {
      if (o.workspace_id === workspaceId && o.employee_id) {
        const match = o.employee_id.match(/EMP-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxId) maxId = num;
        }
      }
    });

    const nextNum = maxId + 1;
    return `EMP-${String(nextNum).padStart(3, "0")}`;
  },
};

export function createDefaultOnboardingChecklist(): OnboardingChecklistItem[] {
  return [
    // 1. Employee Profile
    {
      id: "chk-prof-1",
      section: "profile",
      title: "Personal Information Confirmed",
      description: "Full legal name, contact details, and identity verified.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "chk-prof-2",
      section: "profile",
      title: "Contact Information & Phone",
      description: "Primary telephone and communication address recorded.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "chk-prof-3",
      section: "profile",
      title: "Emergency Contact Added",
      description: "Emergency point of contact telephone and relation.",
      required: true,
      completed: false,
    },
    {
      id: "chk-prof-4",
      section: "profile",
      title: "Profile Photo / Avatar Uploaded",
      description: "Team directory photo added to workspace profile.",
      required: false,
      completed: false,
    },
    {
      id: "chk-prof-5",
      section: "profile",
      title: "Portfolio & Professional Links",
      description: "LinkedIn, GitHub, or portfolio website added.",
      required: false,
      completed: false,
    },

    // 2. Employment
    {
      id: "chk-emp-1",
      section: "employment",
      title: "Job Title & Role Confirmed",
      description: "Official title verified with department lead.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "chk-emp-2",
      section: "employment",
      title: "Department Assigned",
      description: "Mapped to primary functional department.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "chk-emp-3",
      section: "employment",
      title: "Employment Type & Start Date Confirmed",
      description: "Official first working day recorded in team directory.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "chk-emp-4",
      section: "employment",
      title: "Reporting Manager Assigned",
      description: "Direct reporting lead designated in team hierarchy.",
      required: false,
      completed: false,
    },
    {
      id: "chk-emp-5",
      section: "employment",
      title: "Employee ID Generated",
      description: "Unique company identifier issued.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },

    // 3. Documents
    {
      id: "chk-doc-1",
      section: "documents",
      title: "Resume / CV on File",
      description: "Candidate curriculum vitae archived from application.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "chk-doc-2",
      section: "documents",
      title: "Signed Offer Letter",
      description: "Countersigned compensation and terms agreement.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "chk-doc-3",
      section: "documents",
      title: "Employment Contract / Agreement",
      description: "Executed standard employment terms and NDAs.",
      required: true,
      completed: false,
    },
    {
      id: "chk-doc-4",
      section: "documents",
      title: "Government Identity Document (NID/Passport)",
      description: "Valid identity verification file uploaded to R2.",
      required: true,
      completed: false,
    },
    {
      id: "chk-doc-5",
      section: "documents",
      title: "Educational / Professional Certificates",
      description: "Degree and certification verifications uploaded.",
      required: false,
      completed: false,
    },

    // 4. Access & Setup
    {
      id: "chk-acc-1",
      section: "access",
      title: "Workspace Account Provisioned",
      description: "Active access to Ropimo workspace enabled.",
      required: true,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "chk-acc-2",
      section: "access",
      title: "Company Work Email Configured",
      description: "Corporate Google Workspace / Microsoft 365 inbox setup.",
      required: true,
      completed: false,
    },
    {
      id: "chk-acc-3",
      section: "access",
      title: "Department Channels & Repositories Added",
      description: "Invited to Slack channels, GitHub org, and project boards.",
      required: false,
      completed: false,
    },
    {
      id: "chk-acc-4",
      section: "access",
      title: "Hardware & Tools Provisioned",
      description: "Laptop, accessories, or software licenses assigned.",
      required: false,
      completed: false,
    },
  ];
}

// Attach invitation methods to recruitmentStore
Object.assign(recruitmentStore, {
  getInvitations(workspaceId: string): WorkspaceInvitation[] {
    const store = ensureStore();
    return (store.invitations || []).filter((i) => i.workspace_id === workspaceId);
  },

  getInvitationByToken(token: string): WorkspaceInvitation | null {
    if (!token) return null;
    const store = ensureStore();
    return (store.invitations || []).find((i) => i.token === token) || null;
  },

  getInvitationByEmail(email: string, workspaceId: string): WorkspaceInvitation | null {
    if (!email) return null;
    const store = ensureStore();
    return (
      (store.invitations || []).find(
        (i) => i.workspace_id === workspaceId && i.email?.toLowerCase() === email.toLowerCase()
      ) || null
    );
  },

  saveInvitation(inv: WorkspaceInvitation) {
    const store = ensureStore();
    if (!store.invitations) store.invitations = [];
    const idx = store.invitations.findIndex(
      (i) => i.id === inv.id || (i.workspace_id === inv.workspace_id && i.email?.toLowerCase() === inv.email?.toLowerCase())
    );
    if (idx >= 0) {
      store.invitations[idx] = inv;
    } else {
      store.invitations.unshift(inv);
    }
    saveStore(store);
  },
});

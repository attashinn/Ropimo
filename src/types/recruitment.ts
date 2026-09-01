export type JobOpeningStatus = "Draft" | "Open" | "Paused" | "Closed";
export type EmploymentType = "Full-time" | "Part-time" | "Contractor" | "Intern";
export type JobLocationType = "Remote" | "On-site" | "Hybrid";

export type CandidateStage =
  | "Applied"
  | "Screening"
  | "Shortlisted"
  | "Interview"
  | "Feedback"
  | "Assessment"
  | "Final Review"
  | "Offer"
  | "Hired"
  | "Rejected"
  | "Archived"
  | "Withdrawn"
  | "Expired";

export type InterviewType =
  | "Phone Screen"
  | "Video Interview"
  | "Technical Interview"
  | "HR Interview"
  | "Final Interview"
  | "Other";

export type InterviewStatus =
  | "Scheduled"
  | "Completed"
  | "Cancelled"
  | "Rescheduled"
  | "No-show";

export type InterviewRecommendation = "Strong Hire" | "Hire" | "Maybe" | "No Hire";

export type OfferStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Accepted"
  | "Declined"
  | "Withdrawn"
  | "Expired";

export interface CandidateNote {
  id: string;
  workspace_id: string;
  candidate_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string | null;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface JobOpening {
  id: string;
  workspace_id: string;
  department_id?: string | null;
  department_name?: string | null;
  department_color?: string | null;
  department_icon?: string | null;
  title: string;
  slug?: string | null;
  description?: string | null;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  employment_type: EmploymentType;
  location: string;
  salary_range?: string | null;
  hiring_manager_id?: string | null;
  hiring_manager_name?: string | null;
  application_deadline?: string | null;
  status: JobOpeningStatus;
  applicants_count?: number;
  interviews_count?: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  workspace_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  location?: string | null;
  years_of_experience?: number | null;
  skills: string[];
  tags?: string[];
  bio?: string | null;
  notes?: string | null;
  notes_list?: CandidateNote[];
  assigned_recruiter_id?: string | null;
  assigned_recruiter_name?: string | null;
  assigned_recruiter_avatar?: string | null;
  is_archived?: boolean;
  converted_user_id?: string | null;
  employee_id?: string | null;
  employment_status?: string | null;
  onboarding_status?: string | null;
  hired_at?: string | null;
  hired_job_title?: string | null;
  hired_department_id?: string | null;
  hired_department_name?: string | null;
  hired_start_date?: string | null;
  latest_stage?: CandidateStage;
  latest_job_title?: string;
  latest_application_id?: string;
  latest_job_id?: string;
  cv_storage_key?: string | null;
  cv_file_name?: string | null;
  cv_file_size?: number | null;
  cv_file_type?: string | null;
  cover_letter?: string | null;
  source?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CandidateApplication {
  id: string;
  workspace_id: string;
  candidate_id: string;
  job_opening_id: string;
  stage: CandidateStage;
  cover_letter?: string | null;
  cv_storage_key?: string | null;
  cv_file_name?: string | null;
  cv_file_size?: number | null;
  cv_file_type?: string | null;
  cv_uploaded_at?: string | null;
  assigned_recruiter_id?: string | null;
  assigned_recruiter_name?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  hired_at?: string | null;
  is_archived?: boolean;
  source?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation data
  candidate?: Candidate;
  job_opening?: JobOpening;
}

export interface ApplicationStageHistory {
  id: string;
  workspace_id: string;
  application_id: string;
  from_stage?: string | null;
  to_stage: CandidateStage;
  changed_by?: string | null;
  changed_by_name?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface Interview {
  id: string;
  workspace_id: string;
  application_id: string;
  candidate_id: string;
  job_opening_id: string;
  title?: string;
  round_name: string;
  interview_type?: InterviewType;
  interviewer_id?: string | null;
  interviewer_name?: string | null;
  interviewer_email?: string | null;
  interviewer_ids?: string[];
  interviewer_names?: string[];
  scheduled_at: string;
  duration_minutes: number;
  location?: string | null;
  location_or_link?: string | null;
  meeting_url?: string | null;
  status: InterviewStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  candidate?: Candidate;
  job_opening?: JobOpening;
  feedback?: InterviewFeedback[];
}

export interface InterviewFeedback {
  id: string;
  workspace_id: string;
  interview_id: string;
  application_id: string;
  candidate_id: string;
  interviewer_id: string;
  interviewer_name?: string | null;
  technical_skills_rating?: number | null; // 1-5
  communication_rating?: number | null; // 1-5
  problem_solving_rating?: number | null; // 1-5
  culture_fit_rating?: number | null; // 1-5
  overall_rating?: number | null; // 1-5
  recommendation: InterviewRecommendation;
  strengths?: string | null;
  concerns?: string | null;
  private_notes?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobOffer {
  id: string;
  workspace_id: string;
  workspace_name?: string | null;
  application_id: string;
  candidate_id: string;
  job_opening_id?: string | null;
  job_title: string;
  department_id?: string | null;
  department_name?: string | null;
  employment_type: EmploymentType;
  salary: string;
  salary_currency?: string | null;
  start_date?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  offer_notes?: string | null;
  expiration_date?: string | null;
  status: OfferStatus;
  token?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  withdrawn_at?: string | null;
  withdrawn_reason?: string | null;
  hired_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  candidate?: Candidate;
  job_opening?: JobOpening;
}

export interface CandidateActivity {
  id: string;
  workspace_id: string;
  candidate_id?: string | null;
  application_id?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  action_type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface RecruitmentStats {
  openJobsCount: number;
  activeCandidatesCount: number;
  interviewsScheduledCount: number;
  offersPendingCount: number;
  hiredThisQuarterCount: number;
}

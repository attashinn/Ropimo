export type WorkspaceRole = "owner" | "admin" | "manager" | "member" | "guest";
export type EmploymentType = "Full-time" | "Part-time" | "Contractor" | "Intern";
export type EmploymentStatus = "Active" | "On Leave" | "Probation" | "Inactive" | "Pending";

export interface PersonDepartmentRef {
  id: string;
  name: string;
  icon: string;
  color: string;
  job_title?: string | null;
}

export interface EmployeeWorkHistory {
  id: string;
  user_id: string;
  role_title: string;
  department_name: string;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
  notes?: string | null;
}

export interface EmployeeDocument {
  id: string;
  user_id: string;
  name: string;
  document_type: "CV/Resume" | "Offer Letter" | "Contract" | "NDA" | "Identity" | "Certificate" | "Other";
  file_url: string;
  file_size?: number;
  uploaded_by?: string | null;
  created_at: string;
}

export interface EmployeeAsset {
  id: string;
  user_id: string;
  asset_name: string;
  asset_type: "Hardware" | "Software Account" | "Access Card" | "Other";
  serial_number?: string | null;
  assigned_date: string;
  status: "Assigned" | "Returned" | "Lost" | "Inactive";
}

export interface WorkspacePerson {
  id: string;
  user_id: string;
  workspace_id: string;
  role: WorkspaceRole;
  job_title?: string | null;
  full_name?: string | null;
  email: string;
  avatar_url?: string | null;
  phone?: string | null;
  location?: string | null;
  employee_id?: string | null;
  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
  onboarding_status?: OnboardingStatus;
  candidate_id?: string | null;
  candidate_application_id?: string | null;
  hire_date?: string;
  manager_id?: string | null;
  manager_name?: string | null;
  bio?: string | null;
  skills?: string[];
  linkedin_url?: string | null;
  website_url?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  interests?: string[];
  departments: PersonDepartmentRef[];
  work_history?: EmployeeWorkHistory[];
  documents?: EmployeeDocument[];
  assets?: EmployeeAsset[];
  created_at: string;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  workspace_id: string;
  job_title?: string | null;
  role?: string | null;
  created_at: string;
  person: WorkspacePerson;
}

export type InvitationStatus = "Pending" | "Accepted" | "Expired" | "Revoked" | "pending" | "accepted" | "expired" | "revoked";

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  employee_id?: string | null;
  user_id?: string | null;
  email: string;
  full_name?: string | null;
  job_title?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  role: WorkspaceRole;
  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
  token?: string | null;
  status: InvitationStatus;
  invited_by?: string | null;
  invited_by_name?: string | null;
  expires_at?: string | null;
  accepted_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export type OnboardingStatus =
  | "Not Started"
  | "In Progress"
  | "Documents Pending"
  | "Profile Pending"
  | "Access Setup"
  | "Ready to Start"
  | "Completed";

export type OnboardingChecklistSection = "profile" | "employment" | "documents" | "access";

export interface OnboardingChecklistItem {
  id: string;
  section: OnboardingChecklistSection;
  title: string;
  description?: string;
  required?: boolean;
  completed: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
}

export interface EmployeeOnboarding {
  id: string;
  workspace_id: string;
  user_id: string;
  candidate_id?: string | null;
  application_id?: string | null;
  employee_id?: string | null;
  status: OnboardingStatus;
  progress_percentage: number;
  checklist: OnboardingChecklistItem[];
  started_at: string;
  completed_at?: string | null;
  completed_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  person?: WorkspacePerson;
}

export interface InvitePersonInput {
  workspaceId: string;
  email: string;
  fullName: string;
  phone?: string;
  jobTitle?: string;
  departmentId?: string;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
  managerId?: string;
  startDate?: string;
  role?: WorkspaceRole;
}

export interface UpdatePersonInput {
  workspaceId: string;
  targetUserId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  location?: string;
  employeeId?: string;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
  onboardingStatus?: OnboardingStatus;
  hireDate?: string;
  managerId?: string;
  bio?: string;
  skills?: string[];
  linkedinUrl?: string;
  websiteUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  interests?: string[];
  role?: WorkspaceRole;
  departmentIds?: string[];
}

export interface AssignDepartmentInput {
  departmentId: string;
  workspaceId: string;
  userId: string;
  jobTitle?: string;
}

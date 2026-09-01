import { WorkspacePerson } from "./people";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "changes_requested"
  | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type DeliverableType =
  | "Design"
  | "Video"
  | "Website"
  | "Document"
  | "Campaign"
  | "Other";

export interface TaskProjectRef {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface TaskDepartmentRef {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  workspace_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_by?: string | null;
  uploader?: WorkspacePerson | null;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  workspace_id: string;
  user_id?: string | null;
  user_name?: string | null;
  action_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  workspace_id: string;
  user_id?: string | null;
  author?: WorkspacePerson | null;
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  created_at: string;
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  workspace_id: string;
  submitted_by?: string | null;
  submitter?: WorkspacePerson | null;
  note?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  status: "pending" | "approved" | "changes_requested";
  feedback?: string | null;
  reviewed_by?: string | null;
  reviewer?: WorkspacePerson | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  project_id?: string | null;
  department_id?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  deliverable_type?: DeliverableType | string | null;
  expected_outcome?: string | null;
  requires_approval?: boolean;
  approver_id?: string | null;
  approver?: WorkspacePerson | null;
  notify_assignees?: boolean;
  notify_department?: boolean;
  is_draft?: boolean;
  created_by?: string | null;
  creator?: WorkspacePerson | null;
  created_at: string;
  updated_at: string;
  assignees: WorkspacePerson[];
  project?: TaskProjectRef | null;
  department?: TaskDepartmentRef | null;
  attachments?: TaskAttachment[];
  activities?: TaskActivity[];
  comments?: TaskComment[];
  submissions?: TaskSubmission[];
  // Section / Milestone and Custom Columns
  section?: string | null;
  budget?: number | null;
  launch_date?: string | null;
  channels?: string[] | null;
  assets_needed?: string[] | null;
  requesting_team?: string | null;
  is_milestone?: boolean;
}

export interface AttachmentInput {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
}

export interface CreateTaskInput {
  workspaceId: string;
  title: string;
  description?: string;
  projectId?: string | null;
  departmentId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  deliverableType?: DeliverableType | string | null;
  expectedOutcome?: string | null;
  requiresApproval?: boolean;
  approverId?: string | null;
  notifyAssignees?: boolean;
  notifyDepartment?: boolean;
  assigneeIds?: string[];
  attachments?: AttachmentInput[];
  section?: string | null;
  budget?: number | null;
  launchDate?: string | null;
  channels?: string[];
  assetsNeeded?: string[];
  requestingTeam?: string | null;
  isDraft?: boolean;
}

export interface UpdateTaskInput {
  taskId: string;
  workspaceId: string;
  title?: string;
  description?: string;
  projectId?: string | null;
  departmentId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  deliverableType?: DeliverableType | string | null;
  expectedOutcome?: string | null;
  requiresApproval?: boolean;
  approverId?: string | null;
  notifyAssignees?: boolean;
  notifyDepartment?: boolean;
  isDraft?: boolean;
  assigneeIds?: string[];
}

export interface CategorizedTasks {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  noDueDate: Task[];
  completed: Task[];
}

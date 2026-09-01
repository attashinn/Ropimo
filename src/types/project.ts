export type ProjectStatus =
  | "in_progress"
  | "active"
  | "planning"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectPriority = "low" | "medium" | "high" | "urgent";

export interface ProjectAttachment {
  id: string;
  name: string;
  size: number;
  url: string;
  file_type?: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  department_id?: string | null;
  department_name?: string | null;
  department_color?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  status: ProjectStatus;
  priority?: ProjectPriority;
  color: string;
  icon: string;
  lead_id?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_avatar?: string | null;
  client_name?: string | null;
  budget?: string | number | null;
  start_date?: string | null;
  due_date?: string | null;
  deadline?: string | null;
  progress?: number;
  completed_tasks?: number;
  total_tasks?: number;
  member_ids?: string[];
  attachments?: ProjectAttachment[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  workspaceId: string;
  departmentId?: string | null;
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  color?: string;
  icon?: string;
  leadId?: string | null;
  managerId?: string | null;
  clientName?: string | null;
  budget?: string | number | null;
  startDate?: string | null;
  dueDate?: string | null;
  deadline?: string | null;
  memberIds?: string[];
  attachments?: ProjectAttachment[];
}

export interface UpdateProjectInput {
  projectId: string;
  workspaceId: string;
  name?: string;
  description?: string;
  departmentId?: string | null;
  managerId?: string | null;
  clientName?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  budget?: string | number | null;
  color?: string;
  icon?: string;
  startDate?: string | null;
  dueDate?: string | null;
  deadline?: string | null;
}

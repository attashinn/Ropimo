import { WorkspacePerson } from "./people";
import { Project } from "./project";
import { Department } from "./department";

export type DocumentCategory =
  | "HR"
  | "Finance"
  | "Operations"
  | "Legal"
  | "Marketing"
  | "Product"
  | "Procurement"
  | "Other";

export type DocumentStatus =
  | "Draft"
  | "Published"
  | "In Review"
  | "Approved"
  | "Archived"
  | "Expiring Soon";

export type DocumentAccessLevel = "private" | "specific" | "department" | "company";
export type DocumentPermission = "view" | "comment" | "edit" | "full_access";

export interface DocumentShare {
  id: string;
  user_id?: string | null;
  user?: WorkspacePerson | null;
  department_id?: string | null;
  department?: Department | null;
  permission: DocumentPermission;
}

export interface DocumentVersion {
  id: string;
  version_number: string;
  author_id?: string | null;
  author_name: string;
  author_avatar?: string | null;
  note?: string | null;
  content: string;
  created_at: string;
}

export interface DocumentComment {
  id: string;
  user_id?: string | null;
  author_name: string;
  author_avatar?: string | null;
  content: string;
  resolved?: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  workspace_id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  content: string;
  category: DocumentCategory;
  status: DocumentStatus;
  department_id?: string | null;
  department_name?: string | null;
  department?: { id: string; name: string; color: string; icon: string } | null;
  project_id?: string | null;
  project_name?: string | null;
  project?: { id: string; name: string; color: string; icon: string } | null;
  author_id?: string | null;
  author?: WorkspacePerson | null;
  author_name: string;
  author_avatar?: string | null;
  access_level: DocumentAccessLevel;
  is_starred?: boolean;
  is_trash?: boolean;
  file_extension?: string;
  word_count?: number;
  read_time_minutes?: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
  versions?: DocumentVersion[];
  comments?: DocumentComment[];
  shares?: DocumentShare[];
}

export interface DocumentStats {
  totalDocuments: number;
  draftsCount: number;
  publishedCount: number;
  sharedCount: number;
  expiringSoonCount: number;
  categoriesBreakdown: {
    category: DocumentCategory;
    count: number;
    color: string;
  }[];
}

export interface DocumentFilterState {
  searchQuery: string;
  category: "all" | DocumentCategory;
  status: "all" | DocumentStatus;
  authorId: "all" | string;
  departmentId: "all" | string;
  projectId: "all" | string;
  dateRange: "all" | "today" | "last_7_days" | "last_30_days";
}

export interface CreateDocumentInput {
  workspaceId: string;
  title: string;
  subtitle?: string;
  description?: string;
  content: string;
  category: DocumentCategory;
  status?: DocumentStatus;
  departmentId?: string | null;
  projectId?: string | null;
  accessLevel?: DocumentAccessLevel;
}

export interface UpdateDocumentInput {
  documentId: string;
  workspaceId: string;
  title?: string;
  subtitle?: string;
  description?: string;
  content?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  departmentId?: string | null;
  projectId?: string | null;
  accessLevel?: DocumentAccessLevel;
  versionNote?: string;
}

export interface ShareDocumentInput {
  documentId: string;
  workspaceId: string;
  shares: {
    userId?: string;
    departmentId?: string;
    permission: DocumentPermission;
  }[];
  accessLevel?: DocumentAccessLevel;
}

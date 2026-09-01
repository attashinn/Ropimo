import { WorkspacePerson } from "./people";
import { Project } from "./project";
import { Department } from "./department";

export type FileType =
  | "folder"
  | "pdf"
  | "figma"
  | "excel"
  | "word"
  | "image"
  | "archive"
  | "document"
  | "video"
  | "other";

export type FileAccessLevel = "private" | "department" | "company" | "specific";
export type FilePermission = "view" | "comment" | "edit";

export interface FileShare {
  id: string;
  user_id?: string | null;
  user?: WorkspacePerson | null;
  department_id?: string | null;
  department?: Department | null;
  permission: FilePermission;
}

export interface FileActivity {
  id: string;
  user_name: string;
  user_avatar?: string | null;
  action: string;
  created_at: string;
}

export interface FileItem {
  id: string;
  workspace_id: string;
  folder_id?: string | null;
  is_folder: boolean;
  name: string;
  description?: string | null;
  file_type: FileType;
  extension?: string;
  file_size?: number; // In bytes (undefined/null for folders)
  item_count?: number; // For folders
  file_url?: string | null;
  thumbnail_url?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  department?: { id: string; name: string; color: string; icon: string } | null;
  project_id?: string | null;
  project_name?: string | null;
  project?: { id: string; name: string; color: string; icon: string } | null;
  task_id?: string | null;
  is_starred?: boolean;
  is_trash?: boolean;
  access_level?: FileAccessLevel;
  shares?: FileShare[];
  uploaded_by?: string | null;
  uploader?: WorkspacePerson | null;
  last_modified: string;
  created_at: string;
  updated_at: string;
  activities?: FileActivity[];
}

export interface StorageStats {
  totalBytesUsed: number;
  totalBytesCapacity: number;
  totalFilesCount: number;
  totalFoldersCount: number;
  sharedFilesCount: number;
  recentlyAddedCount: number;
  breakdown: {
    filesBytes: number;
    documentsBytes: number;
    imagesBytes: number;
    otherBytes: number;
  };
}

export interface FileFilterState {
  searchQuery: string;
  fileType: "all" | FileType;
  sortBy: "last_modified" | "name" | "size";
  sortOrder: "asc" | "desc";
  dateRange: "all" | "today" | "last_7_days" | "last_30_days";
  departmentId: "all" | string;
  projectId: "all" | string;
  updatedBy: "all" | string;
  quickAccessView: "all" | "starred" | "shared" | "trash" | "recent_downloads";
}

export interface CreateFolderInput {
  workspaceId: string;
  name: string;
  description?: string;
  parentFolderId?: string | null;
  departmentId?: string | null;
  projectId?: string | null;
  accessLevel?: FileAccessLevel;
}

export interface UploadFileInput {
  workspaceId: string;
  folderId?: string | null;
  name: string;
  fileType: FileType;
  fileSize: number;
  fileUrl: string;
  departmentId?: string | null;
  projectId?: string | null;
  accessLevel?: FileAccessLevel;
}

export interface ShareFileInput {
  fileId: string;
  workspaceId: string;
  shares: {
    userId?: string;
    departmentId?: string;
    permission: FilePermission;
  }[];
  accessLevel?: FileAccessLevel;
}

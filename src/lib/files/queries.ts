import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { FileItem, StorageStats, FileType, FileActivity, FileShare } from "@/types/files";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";

/**
 * Helper to format relative time strings for files
 */
function formatRelativeTime(dateString: string): string {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Fetch real files and folders for workspace (deduplicated per request)
 */
export const getWorkspaceFiles = cache(
  async (
    workspaceId: string,
    folderId?: string | null
  ): Promise<{ items: FileItem[]; allItems: FileItem[] }> => {
    if (!workspaceId) {
      return { items: [], allItems: [] };
    }

    const adminClient = createAdminClient();

    const [
      { data: dbFolders },
      { data: dbFiles },
      { data: dbShares },
      { data: dbActivities },
      allPeople,
      allProjects,
      allDepts,
    ] = await Promise.all([
      adminClient.from("workspace_folders").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      adminClient.from("workspace_files").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      adminClient.from("workspace_file_shares").select("*"),
      adminClient.from("workspace_file_activities").select("*").order("created_at", { ascending: false }),
      getWorkspacePeople(workspaceId),
      getWorkspaceProjects(workspaceId),
      getWorkspaceDepartments(workspaceId),
    ]);

    const peopleMap = new Map(allPeople.map((p) => [p.user_id, p]));
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));
    const deptMap = new Map(allDepts.map((d) => [d.id, d]));

    // Map activities by file_id / folder_id
    const activitiesMap = new Map<string, FileActivity[]>();
    if (dbActivities) {
      dbActivities.forEach((act: any) => {
        const targetId = act.file_id || act.folder_id;
        if (targetId) {
          const list = activitiesMap.get(targetId) || [];
          list.push({
            id: act.id,
            user_name: act.user_name || "Workspace Member",
            action: act.action_type || "Updated item",
            created_at: act.created_at,
          });
          activitiesMap.set(targetId, list);
        }
      });
    }

    // Map shares by file_id / folder_id
    const sharesMap = new Map<string, FileShare[]>();
    if (dbShares) {
      dbShares.forEach((s: any) => {
        const targetId = s.file_id || s.folder_id;
        if (targetId) {
          const list = sharesMap.get(targetId) || [];
          list.push({
            id: s.id,
            user_id: s.user_id,
            user: s.user_id ? peopleMap.get(s.user_id) || null : null,
            department_id: s.department_id,
            department: s.department_id ? deptMap.get(s.department_id) || null : null,
            permission: s.permission || "view",
          });
          sharesMap.set(targetId, list);
        }
      });
    }

    // Count items inside folders
    const folderItemCountMap = new Map<string, number>();
    if (dbFiles) {
      dbFiles.forEach((f: any) => {
        if (f.folder_id && !f.is_trash) {
          folderItemCountMap.set(f.folder_id, (folderItemCountMap.get(f.folder_id) || 0) + 1);
        }
      });
    }
    if (dbFolders) {
      dbFolders.forEach((f: any) => {
        if (f.parent_id && !f.is_trash) {
          folderItemCountMap.set(f.parent_id, (folderItemCountMap.get(f.parent_id) || 0) + 1);
        }
      });
    }

    const parsedItems: FileItem[] = [];

    // Parse DB Folders
    if (dbFolders && dbFolders.length > 0) {
      dbFolders.forEach((f: any) => {
        const uploader = f.created_by ? peopleMap.get(f.created_by) || null : null;
        const project = f.project_id ? projectMap.get(f.project_id) || null : null;
        const dept = f.department_id ? deptMap.get(f.department_id) || null : null;
        const itemCount = folderItemCountMap.get(f.id) || 0;
        const acts = activitiesMap.get(f.id) || [];
        const itemShares = sharesMap.get(f.id) || [];

        parsedItems.push({
          id: f.id,
          workspace_id: f.workspace_id,
          folder_id: f.parent_id,
          is_folder: true,
          name: f.name,
          description: f.description,
          file_type: "folder",
          item_count: itemCount,
          department_id: f.department_id,
          department_name: dept?.name || null,
          department: dept ? { id: dept.id, name: dept.name, color: dept.color, icon: dept.icon } : null,
          project_id: f.project_id,
          project_name: project?.name || null,
          project: project ? { id: project.id, name: project.name, color: project.color, icon: project.icon } : null,
          access_level: f.access_level || "company",
          shares: itemShares,
          is_starred: f.is_starred || false,
          is_trash: f.is_trash || false,
          uploaded_by: f.created_by,
          uploader,
          last_modified: formatRelativeTime(f.updated_at || f.created_at),
          created_at: f.created_at,
          updated_at: f.updated_at,
          activities: acts,
        });
      });
    }

    // Parse DB Files
    if (dbFiles && dbFiles.length > 0) {
      dbFiles.forEach((f: any) => {
        const uploader = f.uploaded_by ? peopleMap.get(f.uploaded_by) || null : null;
        const project = f.project_id ? projectMap.get(f.project_id) || null : null;
        const dept = f.department_id ? deptMap.get(f.department_id) || null : null;
        const acts = activitiesMap.get(f.id) || [];
        const itemShares = sharesMap.get(f.id) || [];

        parsedItems.push({
          id: f.id,
          workspace_id: f.workspace_id,
          folder_id: f.folder_id,
          is_folder: false,
          name: f.name,
          description: f.description,
          file_type: (f.file_type || "document") as FileType,
          extension: f.extension || (f.name.includes(".") ? f.name.split(".").pop()?.toLowerCase() : "file"),
          file_size: Number(f.file_size) || 0,
          file_url: f.file_url,
          thumbnail_url: f.thumbnail_url || (f.file_type === "image" ? f.file_url : null),
          department_id: f.department_id,
          department_name: dept?.name || null,
          department: dept ? { id: dept.id, name: dept.name, color: dept.color, icon: dept.icon } : null,
          project_id: f.project_id,
          project_name: project?.name || null,
          project: project ? { id: project.id, name: project.name, color: project.color, icon: project.icon } : null,
          task_id: f.task_id,
          access_level: f.access_level || "company",
          shares: itemShares,
          is_starred: f.is_starred || false,
          is_trash: f.is_trash || false,
          uploaded_by: f.uploaded_by,
          uploader,
          last_modified: formatRelativeTime(f.updated_at || f.created_at),
          created_at: f.created_at,
          updated_at: f.updated_at,
          activities: acts,
        });
      });
    }

    const items = parsedItems.filter((f) =>
      folderId ? f.folder_id === folderId : f.folder_id === null
    );

    return { items, allItems: parsedItems };
  }
);

/**
 * Fetch real storage overview statistics calculated dynamically from real database files
 */
export const getStorageOverview = cache(
  async (workspaceId: string): Promise<StorageStats> => {
    if (!workspaceId) {
      return {
        totalBytesUsed: 0,
        totalBytesCapacity: 100 * 1024 * 1024 * 1024,
        totalFilesCount: 0,
        totalFoldersCount: 0,
        sharedFilesCount: 0,
        recentlyAddedCount: 0,
        breakdown: {
          filesBytes: 0,
          documentsBytes: 0,
          imagesBytes: 0,
          otherBytes: 0,
        },
      };
    }

    const adminClient = createAdminClient();

    const [
      { data: dbFiles },
      { data: dbFolders },
      { data: dbShares },
    ] = await Promise.all([
      adminClient.from("workspace_files").select("id, file_size, file_type, extension, access_level, created_at, is_trash").eq("workspace_id", workspaceId),
      adminClient.from("workspace_folders").select("id, is_trash").eq("workspace_id", workspaceId),
      adminClient.from("workspace_file_shares").select("file_id"),
    ]);

    const activeFiles = (dbFiles || []).filter((f) => !f.is_trash);
    const activeFolders = (dbFolders || []).filter((f) => !f.is_trash);
    const sharedFileIds = new Set((dbShares || []).map((s) => s.file_id));

    let totalBytesUsed = 0;
    let filesBytes = 0;
    let documentsBytes = 0;
    let imagesBytes = 0;
    let otherBytes = 0;
    let sharedFilesCount = 0;
    let recentlyAddedCount = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    activeFiles.forEach((f) => {
      const size = Number(f.file_size) || 0;
      totalBytesUsed += size;

      // Type categorization
      const type = (f.file_type || "").toLowerCase();
      const ext = (f.extension || "").toLowerCase();

      if (type === "image" || ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext)) {
        imagesBytes += size;
      } else if (type === "document" || type === "pdf" || type === "word" || ["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
        documentsBytes += size;
      } else if (type === "excel" || type === "figma" || type === "archive" || ["xls", "xlsx", "csv", "zip", "fig", "rar"].includes(ext)) {
        filesBytes += size;
      } else {
        otherBytes += size;
      }

      // Sharing calculation
      if (f.access_level === "company" || sharedFileIds.has(f.id)) {
        sharedFilesCount += 1;
      }

      // Recently added (last 7 days)
      if (f.created_at && new Date(f.created_at) >= sevenDaysAgo) {
        recentlyAddedCount += 1;
      }
    });

    const totalBytesCapacity = 100 * 1024 * 1024 * 1024; // 100 GB standard workspace quota

    return {
      totalBytesUsed,
      totalBytesCapacity,
      totalFilesCount: activeFiles.length,
      totalFoldersCount: activeFolders.length,
      sharedFilesCount,
      recentlyAddedCount,
      breakdown: {
        filesBytes,
        documentsBytes,
        imagesBytes,
        otherBytes,
      },
    };
  }
);

/**
 * Fetch chronological recent activities across workspace files & folders
 */
export const getWorkspaceFileActivities = cache(
  async (workspaceId: string): Promise<FileActivity[]> => {
    if (!workspaceId) return [];

    const adminClient = createAdminClient();
    const { data: dbActivities } = await adminClient
      .from("workspace_file_activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!dbActivities) return [];

    return dbActivities.map((act) => ({
      id: act.id,
      user_name: act.user_name || "Workspace Member",
      action: act.action_type,
      created_at: act.created_at,
    }));
  }
);

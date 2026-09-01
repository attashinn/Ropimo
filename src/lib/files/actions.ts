"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateFolderInput,
  UploadFileInput,
  ShareFileInput,
  FileItem,
} from "@/types/files";
import { deleteFromR2 } from "@/lib/storage/r2";
import { revalidatePath } from "next/cache";

export interface FileActionResult {
  success: boolean;
  item?: FileItem;
  error?: string;
}

/**
 * Helper to log file activity
 */
async function logFileActivity({
  fileId,
  folderId,
  userId,
  userName,
  actionType,
}: {
  fileId?: string | null;
  folderId?: string | null;
  userId?: string | null;
  userName?: string | null;
  actionType: string;
}) {
  try {
    const adminClient = createAdminClient();
    await adminClient.from("workspace_file_activities").insert({
      file_id: fileId || null,
      folder_id: folderId || null,
      user_id: userId || null,
      user_name: userName || "Workspace Member",
      action_type: actionType,
    });
  } catch (err) {
    console.warn("Could not log file activity:", err);
  }
}

/**
 * Create a new workspace folder
 */
export async function createFolderAction(
  input: CreateFolderInput
): Promise<FileActionResult> {
  const { workspaceId, name, description, parentFolderId, departmentId, projectId, accessLevel } = input;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const trimmedName = name?.trim();
  if (!trimmedName || trimmedName.length < 1) {
    return { success: false, error: "Folder name cannot be empty." };
  }

  const adminClient = createAdminClient();

  try {
    const { data: newFolder, error } = await adminClient
      .from("workspace_folders")
      .insert({
        workspace_id: workspaceId,
        parent_id: parentFolderId || null,
        name: trimmedName,
        description: description?.trim() || null,
        department_id: departmentId || null,
        project_id: projectId || null,
        access_level: accessLevel || "company",
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder in DB:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Team Member";
    await logFileActivity({
      folderId: newFolder?.id,
      userId: user?.id,
      userName,
      actionType: `Created folder "${trimmedName}"`,
    });

    revalidatePath("/app/files");
    return { success: true };
  } catch (err: any) {
    console.error("Error creating folder:", err);
    return { success: false, error: err?.message || "Failed to create folder" };
  }
}

/**
 * Upload one or multiple files
 */
export async function uploadFilesAction(
  files: UploadFileInput[]
): Promise<FileActionResult> {
  if (!files || files.length === 0) {
    return { success: false, error: "No files to upload." };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();

  try {
    const rows = files.map((f) => ({
      workspace_id: f.workspaceId,
      folder_id: f.folderId || null,
      name: f.name,
      file_type: f.fileType,
      extension: f.name.includes(".") ? f.name.split(".").pop()?.toLowerCase() : "file",
      file_size: f.fileSize,
      file_url: f.fileUrl,
      department_id: f.departmentId || null,
      project_id: f.projectId || null,
      access_level: f.accessLevel || "company",
      uploaded_by: user?.id || null,
    }));

    const { data: inserted, error } = await adminClient
      .from("workspace_files")
      .insert(rows)
      .select();

    if (error) {
      console.error("Error saving files in DB:", error);
      return { success: false, error: error.message };
    }

    // Log activities for each file
    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Team Member";
    if (inserted && inserted.length > 0) {
      for (const item of inserted) {
        await logFileActivity({
          fileId: item.id,
          folderId: item.folder_id,
          userId: user?.id,
          userName,
          actionType: `Uploaded file "${item.name}"`,
        });
      }
    }

    revalidatePath("/app/files");
    return { success: true };
  } catch (err: any) {
    console.error("Error uploading files:", err);
    return { success: false, error: err?.message || "Failed to upload files" };
  }
}

/**
 * Rename a file or folder
 */
export async function renameFileItemAction(
  id: string,
  newName: string,
  isFolder: boolean,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedName = newName?.trim();
  if (!trimmedName) return { success: false, error: "Name cannot be empty" };

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();
  const table = isFolder ? "workspace_folders" : "workspace_files";

  try {
    const { error } = await adminClient
      .from(table)
      .update({ name: trimmedName, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Error renaming item in DB:", error);
      return { success: false, error: error.message };
    }

    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Team Member";
    await logFileActivity({
      fileId: isFolder ? null : id,
      folderId: isFolder ? id : null,
      userId: user?.id,
      userName,
      actionType: `Renamed ${isFolder ? "folder" : "file"} to "${trimmedName}"`,
    });

    revalidatePath("/app/files");
    return { success: true };
  } catch (err: any) {
    console.error("Error renaming item:", err);
    return { success: false, error: err?.message || "Failed to rename item" };
  }
}

/**
 * Move a file or folder into another destination folder
 */
export async function moveItemAction(
  id: string,
  destinationFolderId: string | null,
  isFolder: boolean,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();
  const table = isFolder ? "workspace_folders" : "workspace_files";
  const parentColumn = isFolder ? "parent_id" : "folder_id";

  try {
    // Prevent moving folder into itself
    if (isFolder && id === destinationFolderId) {
      return { success: false, error: "Cannot move a folder into itself" };
    }

    const { error } = await adminClient
      .from(table)
      .update({ [parentColumn]: destinationFolderId || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Error moving item in DB:", error);
      return { success: false, error: error.message };
    }

    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Team Member";
    await logFileActivity({
      fileId: isFolder ? null : id,
      folderId: isFolder ? id : destinationFolderId,
      userId: user?.id,
      userName,
      actionType: `Moved ${isFolder ? "folder" : "file"}`,
    });

    revalidatePath("/app/files");
    return { success: true };
  } catch (err: any) {
    console.error("Error moving item:", err);
    return { success: false, error: err?.message || "Failed to move item" };
  }
}

/**
 * Delete a single file or folder
 */
export async function deleteFileItemAction(
  id: string,
  isFolder: boolean,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();
  const table = isFolder ? "workspace_folders" : "workspace_files";

  try {
    // If it's a file, get storage URL to clean up storage object
    if (!isFolder) {
      const { data: fileRecord } = await adminClient
        .from("workspace_files")
        .select("name, file_url")
        .eq("id", id)
        .single();

      if (fileRecord?.file_url) {
        // Extract key from URL
        const parts = fileRecord.file_url.split("/uploads/");
        const key = parts.length > 1 ? parts[1] : fileRecord.file_url.split("/api/storage/")[1];
        if (key) {
          await deleteFromR2(key);
        }
      }
    }

    const { error } = await adminClient
      .from(table)
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Error deleting item from DB:", error);
      return { success: false, error: error.message };
    }

    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Team Member";
    await logFileActivity({
      userId: user?.id,
      userName,
      actionType: `Deleted ${isFolder ? "folder" : "file"}`,
    });

    revalidatePath("/app/files");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting item:", err);
    return { success: false, error: err?.message || "Failed to delete item" };
  }
}

/**
 * Bulk delete multiple items
 */
export async function bulkDeleteFilesAction(
  items: { id: string; isFolder: boolean }[],
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  if (!items || items.length === 0) {
    return { success: true };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();

  try {
    const fileIds = items.filter((i) => !i.isFolder).map((i) => i.id);
    const folderIds = items.filter((i) => i.isFolder).map((i) => i.id);

    // Clean up storage for files
    if (fileIds.length > 0) {
      const { data: fileRecords } = await adminClient
        .from("workspace_files")
        .select("file_url")
        .in("id", fileIds);

      if (fileRecords) {
        for (const f of fileRecords) {
          if (f.file_url) {
            const parts = f.file_url.split("/uploads/");
            const key = parts.length > 1 ? parts[1] : f.file_url.split("/api/storage/")[1];
            if (key) await deleteFromR2(key);
          }
        }
      }

      await adminClient.from("workspace_files").delete().in("id", fileIds).eq("workspace_id", workspaceId);
    }

    if (folderIds.length > 0) {
      await adminClient.from("workspace_folders").delete().in("id", folderIds).eq("workspace_id", workspaceId);
    }

    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Team Member";
    await logFileActivity({
      userId: user?.id,
      userName,
      actionType: `Bulk deleted ${items.length} items`,
    });

    revalidatePath("/app/files");
    return { success: true };
  } catch (err: any) {
    console.error("Error bulk deleting items:", err);
    return { success: false, error: err?.message || "Failed to bulk delete items" };
  }
}

/**
 * Toggle Starred status
 */
export async function toggleStarFileAction(
  id: string,
  isFolder: boolean,
  workspaceId: string,
  currentStarred: boolean
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const table = isFolder ? "workspace_folders" : "workspace_files";

  try {
    const { error } = await adminClient
      .from(table)
      .update({ is_starred: !currentStarred, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/app/files");
    return { success: true };
  } catch (err: any) {
    console.error("Error starring item:", err);
    return { success: false, error: err?.message || "Failed to star item" };
  }
}

/**
 * Share a file with people or departments
 */
export async function shareFileItemAction(
  input: ShareFileInput
): Promise<{ success: boolean; error?: string }> {
  const { fileId, workspaceId, shares, accessLevel } = input;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();

  try {
    if (accessLevel) {
      await adminClient
        .from("workspace_files")
        .update({ access_level: accessLevel, updated_at: new Date().toISOString() })
        .eq("id", fileId)
        .eq("workspace_id", workspaceId);
    }

    await adminClient
      .from("workspace_file_shares")
      .delete()
      .eq("file_id", fileId);

    if (shares && shares.length > 0) {
      const rows = shares.map((s) => ({
        file_id: fileId,
        user_id: s.userId || null,
        department_id: s.departmentId || null,
        permission: s.permission,
      }));

      await adminClient.from("workspace_file_shares").insert(rows);
    }

    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Team Member";
    await logFileActivity({
      fileId,
      userId: user?.id,
      userName,
      actionType: `Updated sharing settings`,
    });

    revalidatePath("/app/files");
    return { success: true };
  } catch (err: any) {
    console.error("Error sharing file:", err);
    return { success: false, error: err?.message || "Failed to share file" };
  }
}

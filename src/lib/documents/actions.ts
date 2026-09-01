"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateDocumentInput,
  UpdateDocumentInput,
  ShareDocumentInput,
  DocumentItem,
  DocumentStatus,
  DocumentAccessLevel,
} from "@/types/documents";
import { revalidatePath } from "next/cache";
import {
  addRuntimeDocument,
  deleteRuntimeDocument,
  updateRuntimeDocument,
} from "./queries";

export interface DocumentActionResult {
  success: boolean;
  document?: DocumentItem;
  error?: string;
}

/**
 * Create a new workspace document
 */
export async function createDocumentAction(
  input: CreateDocumentInput
): Promise<DocumentActionResult> {
  const {
    workspaceId,
    title,
    subtitle,
    description,
    content,
    category,
    status = "Published",
    departmentId,
    projectId,
    accessLevel = "company",
  } = input;

  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    return { success: false, error: "Document title cannot be empty." };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const newDocId = `doc-${Date.now()}`;
  const runtimeDoc: DocumentItem = {
    id: newDocId,
    workspace_id: workspaceId,
    title: trimmedTitle,
    subtitle: subtitle?.trim() || null,
    description: description?.trim() || null,
    content: content || "",
    category: category || "HR",
    status: status || "Published",
    department_id: departmentId || null,
    project_id: projectId || null,
    access_level: accessLevel,
    author_id: user?.id || null,
    author_name: user?.user_metadata?.full_name || "Tashin Khan",
    word_count: words,
    read_time_minutes: readTime,
    last_updated: "Just now",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    versions: [],
    comments: [],
  };

  // Always save in runtime store immediately
  addRuntimeDocument(runtimeDoc);

  const adminClient = createAdminClient();

  try {
    const { data: newDoc, error } = await adminClient
      .from("workspace_documents")
      .insert({
        workspace_id: workspaceId,
        title: trimmedTitle,
        subtitle: subtitle?.trim() || null,
        description: description?.trim() || null,
        content: content || "",
        category: category || "HR",
        status: status || "Published",
        department_id: departmentId || null,
        project_id: projectId || null,
        access_level: accessLevel,
        author_id: user?.id || null,
        word_count: words,
        read_time_minutes: readTime,
      })
      .select()
      .single();

    if (newDoc) {
      // Create initial version 1.0
      await adminClient.from("workspace_document_versions").insert({
        document_id: newDoc.id,
        version_number: "1.0",
        author_id: user?.id || null,
        author_name: user?.user_metadata?.full_name || "Tashin Khan",
        note: "Initial document creation",
        content: content || "",
      });
    }

    revalidatePath("/app/documents");
    return { success: true, document: runtimeDoc };
  } catch (err: any) {
    console.warn("DB insert error, kept in runtime store:", err);
    revalidatePath("/app/documents");
    return { success: true, document: runtimeDoc };
  }
}

/**
 * Update document content and save new version
 */
export async function updateDocumentContentAction(
  documentId: string,
  content: string,
  title?: string,
  status?: DocumentStatus,
  workspaceId: string = "ws-default",
  versionNote?: string
): Promise<{ success: boolean; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  try {
    const updatePayload: any = {
      content,
      word_count: words,
      read_time_minutes: readTime,
      updated_at: new Date().toISOString(),
    };
    if (title?.trim()) updatePayload.title = title.trim();
    if (status) updatePayload.status = status;

    await adminClient
      .from("workspace_documents")
      .update(updatePayload)
      .eq("id", documentId)
      .eq("workspace_id", workspaceId);

    // Save version history entry if note provided
    if (versionNote) {
      await adminClient.from("workspace_document_versions").insert({
        document_id: documentId,
        version_number: `v-${Date.now().toString().slice(-3)}`,
        author_id: user?.id || null,
        author_name: user?.user_metadata?.full_name || "Tashin Khan",
        note: versionNote,
        content,
      });
    }

    revalidatePath(`/app/documents/${documentId}`);
    revalidatePath("/app/documents");
    return { success: true };
  } catch (err) {
    console.error("Error updating document:", err);
    revalidatePath(`/app/documents/${documentId}`);
    revalidatePath("/app/documents");
    return { success: true };
  }
}

/**
 * Add a comment to document
 */
export async function addDocumentCommentAction(
  documentId: string,
  content: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  if (!content.trim()) return { success: false, error: "Comment cannot be empty" };

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();

  try {
    await adminClient.from("workspace_document_comments").insert({
      document_id: documentId,
      user_id: user?.id || null,
      author_name: user?.user_metadata?.full_name || "Tashin Khan",
      content: content.trim(),
    });

    revalidatePath(`/app/documents/${documentId}`);
    return { success: true };
  } catch (err) {
    console.error("Error adding document comment:", err);
    revalidatePath(`/app/documents/${documentId}`);
    return { success: true };
  }
}

/**
 * Share document permissions
 */
export async function shareDocumentAction(
  input: ShareDocumentInput
): Promise<{ success: boolean; error?: string }> {
  const { documentId, workspaceId, shares, accessLevel } = input;
  const adminClient = createAdminClient();

  try {
    if (accessLevel) {
      await adminClient
        .from("workspace_documents")
        .update({ access_level: accessLevel, updated_at: new Date().toISOString() })
        .eq("id", documentId)
        .eq("workspace_id", workspaceId);
    }

    if (shares && shares.length > 0) {
      await adminClient
        .from("workspace_document_shares")
        .delete()
        .eq("document_id", documentId);

      const rows = shares.map((s) => ({
        document_id: documentId,
        user_id: s.userId || null,
        department_id: s.departmentId || null,
        permission: s.permission,
      }));

      await adminClient.from("workspace_document_shares").insert(rows);
    }

    revalidatePath(`/app/documents/${documentId}`);
    revalidatePath("/app/documents");
    return { success: true };
  } catch (err) {
    console.error("Error sharing document:", err);
    revalidatePath(`/app/documents/${documentId}`);
    revalidatePath("/app/documents");
    return { success: true };
  }
}

/**
 * Delete a document
 */
export async function deleteDocumentAction(
  documentId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  deleteRuntimeDocument(documentId);

  const adminClient = createAdminClient();

  try {
    await adminClient
      .from("workspace_documents")
      .delete()
      .eq("id", documentId)
      .eq("workspace_id", workspaceId);

    revalidatePath("/app/documents");
    return { success: true };
  } catch (err) {
    console.error("Error deleting document:", err);
    revalidatePath("/app/documents");
    return { success: true };
  }
}

/**
 * Toggle star status
 */
export async function toggleStarDocumentAction(
  documentId: string,
  currentStarred: boolean,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  try {
    await adminClient
      .from("workspace_documents")
      .update({ is_starred: !currentStarred, updated_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("workspace_id", workspaceId);

    revalidatePath("/app/documents");
    return { success: true };
  } catch (err) {
    console.error("Error starring document:", err);
    revalidatePath("/app/documents");
    return { success: true };
  }
}

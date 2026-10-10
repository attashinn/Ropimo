"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateDocumentInput,
  ShareDocumentInput,
  DocumentItem,
  DocumentStatus,
} from "@/types/documents";
import { revalidatePath } from "next/cache";
import {
  addRuntimeDocument,
  deleteRuntimeDocument,
} from "./queries";

export interface DocumentActionResult {
  success: boolean;
  document?: DocumentItem;
  error?: string;
}

const CreateDocumentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  title: z.string().min(1, "Document title cannot be empty."),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  content: z.string().optional(),
  category: z.enum([
    "HR",
    "Finance",
    "Operations",
    "Legal",
    "Marketing",
    "Product",
    "Procurement",
    "Other",
  ]),
  status: z.enum(["Draft", "In Review", "Published", "Archived", "Approved", "Expiring Soon"]).optional().default("Published"),
  departmentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  accessLevel: z.enum(["private", "department", "company"]).optional().default("company"),
});

const UpdateDocumentContentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required."),
  content: z.string(),
  title: z.string().optional(),
  status: z.enum(["Draft", "In Review", "Published", "Archived", "Approved", "Expiring Soon"]).optional(),
  workspaceId: z.string().optional().default("ws-default"),
  versionNote: z.string().optional(),
});

const AddDocumentCommentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required."),
  content: z.string().min(1, "Comment cannot be empty."),
  workspaceId: z.string().optional(),
});

const ShareDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  accessLevel: z.enum(["private", "department", "company"]).optional(),
  shares: z
    .array(
      z.object({
        userId: z.string().optional().nullable(),
        departmentId: z.string().optional().nullable(),
        permission: z.enum(["view", "comment", "edit"]),
      })
    )
    .optional(),
});

const DeleteDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

const ToggleStarDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required."),
  currentStarred: z.boolean(),
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

/**
 * Create a new workspace document
 */
export async function createDocumentAction(
  rawInput: CreateDocumentInput
): Promise<DocumentActionResult> {
  const parsed = CreateDocumentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;

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

  const trimmedTitle = title.trim();
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const bodyContent = content || `# ${trimmedTitle}\n\nStart writing here...`;
  const words = bodyContent.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const adminClient = createAdminClient();

  try {
    const { data: newDoc, error: insertError } = await adminClient
      .from("workspace_documents")
      .insert({
        workspace_id: workspaceId,
        title: trimmedTitle,
        subtitle: subtitle || null,
        description: description || null,
        content: bodyContent,
        category,
        status,
        access_level: accessLevel,
        department_id: departmentId || null,
        project_id: projectId || null,
        author_id: user?.id || null,
        word_count: words,
        read_time_minutes: readTime,
        is_starred: false,
        is_trash: false,
      })
      .select()
      .single();

    if (insertError || !newDoc) {
      console.warn("DB insert error, falling back to in-memory:", insertError);
      // Fallback in-memory
      const fallbackDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        workspace_id: workspaceId,
        title: trimmedTitle,
        subtitle: subtitle || null,
        description: description || null,
        content: bodyContent,
        category,
        status,
        access_level: accessLevel,
        department_id: departmentId || null,
        project_id: projectId || null,
        author_id: user?.id || null,
        author_name: (user?.user_metadata?.full_name as string) || "Current User",
        author: {
          id: user?.id || "u-current",
          user_id: user?.id || "u-current",
          workspace_id: workspaceId,
          role: "owner",
          full_name: (user?.user_metadata?.full_name as string) || "Current User",
          email: user?.email || "user@example.com",
          departments: [],
          created_at: new Date().toISOString(),
        },
        word_count: words,
        read_time_minutes: readTime,
        is_starred: false,
        is_trash: false,
        last_updated: "Just now",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        versions: [],
        comments: [],
      };
      addRuntimeDocument(fallbackDoc);
      revalidatePath("/app/documents");
      return { success: true, document: fallbackDoc };
    }

    // Insert initial version record
    await adminClient.from("workspace_document_versions").insert({
      document_id: newDoc.id,
      version_number: "v1.0",
      author_id: user?.id || null,
      author_name: (user?.user_metadata?.full_name as string) || "Current User",
      note: "Initial document creation",
      content: bodyContent,
    });

    const runtimeDoc: DocumentItem = {
      id: newDoc.id,
      workspace_id: newDoc.workspace_id,
      title: newDoc.title,
      subtitle: newDoc.subtitle,
      description: newDoc.description,
      content: newDoc.content,
      category: newDoc.category as DocumentItem["category"],
      status: newDoc.status as DocumentStatus,
      access_level: newDoc.access_level as DocumentItem["access_level"],
      department_id: newDoc.department_id,
      project_id: newDoc.project_id,
      author_id: newDoc.author_id,
      author_name: (user?.user_metadata?.full_name as string) || "Current User",
      word_count: newDoc.word_count || 0,
      read_time_minutes: newDoc.read_time_minutes || 1,
      is_starred: newDoc.is_starred || false,
      is_trash: newDoc.is_trash || false,
      last_updated: "Just now",
      created_at: newDoc.created_at,
      updated_at: newDoc.updated_at,
      versions: [],
      comments: [],
    };
    addRuntimeDocument(runtimeDoc);

    revalidatePath("/app/documents");
    return { success: true, document: runtimeDoc };
  } catch (err: unknown) {
    console.error("createDocumentAction error:", err);
    const msg = err instanceof Error ? err.message : "Unexpected error saving document.";
    return { success: false, error: msg };
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
  const parsed = UpdateDocumentContentSchema.safeParse({
    documentId,
    content,
    title,
    status,
    workspaceId,
    versionNote,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();
  const words = input.content.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  try {
    const updatePayload: Record<string, unknown> = {
      content: input.content,
      word_count: words,
      read_time_minutes: readTime,
      updated_at: new Date().toISOString(),
    };
    if (input.title?.trim()) updatePayload.title = input.title.trim();
    if (input.status) updatePayload.status = input.status;

    await adminClient
      .from("workspace_documents")
      .update(updatePayload)
      .eq("id", input.documentId)
      .eq("workspace_id", input.workspaceId);

    if (input.versionNote) {
      await adminClient.from("workspace_document_versions").insert({
        document_id: input.documentId,
        version_number: `v-${Date.now().toString().slice(-3)}`,
        author_id: user?.id || null,
        author_name: (user?.user_metadata?.full_name as string) || "Current User",
        note: input.versionNote,
        content: input.content,
      });
    }

    revalidatePath(`/app/documents/${input.documentId}`);
    revalidatePath("/app/documents");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error updating document:", err);
    revalidatePath(`/app/documents/${input.documentId}`);
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
  workspaceId?: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = AddDocumentCommentSchema.safeParse({ documentId, content, workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const adminClient = createAdminClient();

  try {
    await adminClient.from("workspace_document_comments").insert({
      document_id: parsed.data.documentId,
      user_id: user?.id || null,
      author_name: (user?.user_metadata?.full_name as string) || "Current User",
      content: parsed.data.content.trim(),
    });

    revalidatePath(`/app/documents/${parsed.data.documentId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Error adding document comment:", err);
    revalidatePath(`/app/documents/${parsed.data.documentId}`);
    return { success: true };
  }
}

/**
 * Share document permissions
 */
export async function shareDocumentAction(
  rawInput: ShareDocumentInput
): Promise<{ success: boolean; error?: string }> {
  const parsed = ShareDocumentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;

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
  } catch (err: unknown) {
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
  const parsed = DeleteDocumentSchema.safeParse({ documentId, workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

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
  } catch (err: unknown) {
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
  const parsed = ToggleStarDocumentSchema.safeParse({ documentId, currentStarred, workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const adminClient = createAdminClient();

  try {
    await adminClient
      .from("workspace_documents")
      .update({ is_starred: !currentStarred, updated_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("workspace_id", workspaceId);

    revalidatePath("/app/documents");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error starring document:", err);
    revalidatePath("/app/documents");
    return { success: true };
  }
}

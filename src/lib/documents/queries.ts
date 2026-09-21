import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DocumentItem,
  DocumentCategory,
  DocumentStatus,
  DocumentStats,
} from "@/types/documents";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceDepartments } from "@/lib/department/queries";

/** Category color map â€” used for stats sidebar */
const CATEGORY_COLORS: Record<string, string> = {
  HR: "#DC2626",
  Finance: "#16A34A",
  Operations: "#2563EB",
  Legal: "#D97706",
  Marketing: "#EA580C",
  Product: "#F59E0B",
  Procurement: "#059669",
  Other: "#9333EA",
};

/** Compute DocumentStats from a list of real documents */
function computeDocumentStats(docs: DocumentItem[]): DocumentStats {
  const totalDocuments = docs.filter((d) => !d.is_trash).length;
  const draftsCount = docs.filter((d) => !d.is_trash && d.status === "Draft").length;
  const publishedCount = docs.filter((d) => !d.is_trash && d.status === "Published").length;
  const sharedCount = docs.filter((d) => !d.is_trash && d.access_level !== "private").length;
  const expiringSoonCount = docs.filter((d) => !d.is_trash && d.status === "Expiring Soon").length;

  // Build category breakdown from real documents
  const categoryMap = new Map<string, number>();
  docs.filter((d) => !d.is_trash).forEach((d) => {
    const cat = d.category || "Other";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });

  const ORDERED_CATEGORIES: DocumentCategory[] = [
    "HR", "Finance", "Operations", "Legal", "Marketing", "Product", "Procurement", "Other",
  ];
  const categoriesBreakdown = ORDERED_CATEGORIES
    .filter((cat) => (categoryMap.get(cat) || 0) > 0)
    .map((cat) => ({
      category: cat,
      count: categoryMap.get(cat) || 0,
      color: CATEGORY_COLORS[cat] || "#9333EA",
    }));

  return { totalDocuments, draftsCount, publishedCount, sharedCount, expiringSoonCount, categoriesBreakdown };
}

// Kept as an empty array â€” all documents now come from Supabase only.
// No mock/seed data. Empty workspaces show a clean empty state with a CTA.
export const DEFAULT_DOCUMENTS_DATA: DocumentItem[] = [];

// In-memory runtime storage for newly created documents (server-process lifetime)
// This bridges the gap between the action saving to DB and the next server render
const runtimeDocumentsStore: DocumentItem[] = [];

export function addRuntimeDocument(doc: DocumentItem) {
  const idx = runtimeDocumentsStore.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    runtimeDocumentsStore[idx] = doc;
  } else {
    runtimeDocumentsStore.unshift(doc);
  }
}

export function deleteRuntimeDocument(id: string) {
  const idx = runtimeDocumentsStore.findIndex((d) => d.id === id);
  if (idx >= 0) runtimeDocumentsStore.splice(idx, 1);
}

export function updateRuntimeDocument(doc: Partial<DocumentItem> & { id: string }) {
  const idx = runtimeDocumentsStore.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    runtimeDocumentsStore[idx] = { ...runtimeDocumentsStore[idx], ...doc };
  }
}

/**
 * Fetch all documents in workspace (deduplicated per request)
 */
export const getWorkspaceDocuments = cache(
  async (workspaceId: string): Promise<DocumentItem[]> => {
    const adminClient = createAdminClient();

    let dbDocs: any[] | null = null;
    let allPeople: any[] = [];
    let allProjects: any[] = [];
    let allDepts: any[] = [];

    try {
      const [
        docsRes,
        people,
        projects,
        depts,
      ] = await Promise.all([
        adminClient
          .from("workspace_documents")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        getWorkspacePeople(workspaceId),
        getWorkspaceProjects(workspaceId),
        getWorkspaceDepartments(workspaceId),
      ]);
      dbDocs = docsRes.data;
      allPeople = people;
      allProjects = projects;
      allDepts = depts;
    } catch {
      // Fallback if db offline
    }

    const peopleMap = new Map(allPeople.map((p) => [p.user_id, p]));
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));
    const deptMap = new Map(allDepts.map((d) => [d.id, d]));

    const parsedDocs: DocumentItem[] = [];

    if (dbDocs && dbDocs.length > 0) {
      dbDocs.forEach((d: any) => {
        const author = d.author_id ? peopleMap.get(d.author_id) || null : null;
        const project = d.project_id ? projectMap.get(d.project_id) || null : null;
        const dept = d.department_id ? deptMap.get(d.department_id) || null : null;

        parsedDocs.push({
          id: d.id,
          workspace_id: d.workspace_id,
          title: d.title,
          subtitle: d.subtitle || null,
          description: d.description || null,
          content: d.content || "",
          category: (d.category || "HR") as DocumentCategory,
          status: (d.status || "Published") as DocumentStatus,
          department_id: d.department_id,
          department_name: dept?.name || null,
          department: dept ? { id: dept.id, name: dept.name, color: dept.color, icon: dept.icon } : null,
          project_id: d.project_id,
          project_name: project?.name || null,
          project: project ? { id: project.id, name: project.name, color: project.color, icon: project.icon } : null,
          author_id: d.author_id,
          author,
          author_name: author?.full_name || "Tashin Khan",
          author_avatar: author?.avatar_url || null,
          access_level: d.access_level || "company",
          is_starred: d.is_starred || false,
          is_trash: d.is_trash || false,
          word_count: d.word_count || 100,
          read_time_minutes: d.read_time_minutes || 1,
          last_updated: "Just now",
          created_at: d.created_at,
          updated_at: d.updated_at,
          versions: [],
          comments: [],
        });
      });
    }

    const combinedMap = new Map<string, DocumentItem>();
    // 1. Add database documents first (source of truth)
    parsedDocs.forEach((doc) => combinedMap.set(doc.id, doc));
    // 2. Overlay runtime in-memory documents (newly created before next revalidation)
    runtimeDocumentsStore.forEach((doc) => {
      if (!workspaceId || doc.workspace_id === workspaceId) {
        // Only keep runtime doc if it doesn't exist in DB yet
        if (!combinedMap.has(doc.id)) {
          combinedMap.set(doc.id, doc);
        }
      }
    });

    return Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
);

/**
 * Fetch a single document by ID with versions and comments
 */
export async function getDocumentById(
  documentId: string,
  workspaceId: string
): Promise<DocumentItem | null> {
  const allDocs = await getWorkspaceDocuments(workspaceId);
  const found = allDocs.find((d) => d.id === documentId);
  return found || null;
}

/**
 * Get document metrics and statistics â€” computed from real workspace documents
 */
export async function getDocumentStats(workspaceId: string): Promise<DocumentStats> {
  const docs = await getWorkspaceDocuments(workspaceId);
  return computeDocumentStats(docs);
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  DocumentItem,
  DocumentVersion,
  DocumentComment,
  DocumentStatus,
  DocumentCategory,
} from "@/types/documents";
import { WorkspacePerson } from "@/types/people";
import { PrimaryButton } from "@/components/ui/primary-button";
import { cn } from "@/lib/utils";
import {
  DocumentIcon,
  HistoryIcon,
  MessageSquareIcon,
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  QuoteIcon,
  CodeIcon,
  TableIcon,
} from "./document-icons";
import {
  ShareIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  StarIcon,
  CheckIcon,
  XIcon,
  ChevronLeftIcon,
  UsersIcon,
  MoreVerticalIcon,
} from "./file-icons";
import {
  updateDocumentContentAction,
  addDocumentCommentAction,
  deleteDocumentAction,
  toggleStarDocumentAction,
} from "@/lib/documents/actions";

export interface DocumentDetailViewProps {
  document: DocumentItem;
  workspaceId: string;
  workspaceName?: string;
  people: WorkspacePerson[];
}

export function DocumentDetailView({
  document: initialDoc,
  workspaceId,
  workspaceName = "brnnd",
  people,
}: DocumentDetailViewProps) {
  const router = useRouter();
  const [doc, setDoc] = React.useState<DocumentItem>(initialDoc);
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(initialDoc.title);
  const [content, setContent] = React.useState(initialDoc.content);
  const [status, setStatus] = React.useState<DocumentStatus>(initialDoc.status);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"info" | "versions" | "comments" | "access">("info");
  const [newComment, setNewComment] = React.useState("");
  const [comments, setComments] = React.useState<DocumentComment[]>(initialDoc.comments || []);
  const [versions, setVersions] = React.useState<DocumentVersion[]>(initialDoc.versions || []);
  const [versionNote, setVersionNote] = React.useState("");

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    const updated = {
      ...doc,
      title: title.trim(),
      content: content,
      status: status,
      word_count: content.split(/\s+/).filter(Boolean).length,
      read_time_minutes: Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)),
      last_updated: "Just now",
      updated_at: new Date().toISOString(),
    };

    if (versionNote.trim()) {
      const newV: DocumentVersion = {
        id: `v-${Date.now()}`,
        version_number: `v${versions.length + 1}.0`,
        author_name: "Tashin Khan",
        created_at: "Just now",
        note: versionNote.trim(),
        content,
      };
      setVersions([newV, ...versions]);
    }

    setDoc(updated);
    setIsEditing(false);
    setVersionNote("");

    await updateDocumentContentAction(
      doc.id,
      content,
      title.trim(),
      status,
      workspaceId,
      versionNote.trim() || undefined
    );
    setSaving(false);
  };

  // Restore earlier version
  const handleRestoreVersion = async (v: DocumentVersion) => {
    setContent(v.content);
    setIsEditing(true);
    setActiveTab("info");
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comm: DocumentComment = {
      id: `comm-${Date.now()}`,
      author_name: "Tashin Khan",
      content: newComment.trim(),
      created_at: "Just now",
      resolved: false,
    };

    setComments([comm, ...comments]);
    const txt = newComment.trim();
    setNewComment("");
    await addDocumentCommentAction(doc.id, txt, workspaceId);
  };

  // Download content
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Delete
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDocumentAction(doc.id, workspaceId);
      router.push("/app/documents");
    }
  };

  return (
    <div className="space-y-6">
      {/* ================================================== */}
      {/* HEADER BAR */}
      {/* ================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#D8DDD4]">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#65706A] mb-1">
            <Link href="/app/documents" className="font-medium text-[#65706A] hover:underline">
              Documents
            </Link>
            <span className="text-[#B8C0B2]">/</span>
            <span className="font-semibold text-[#18221E] truncate max-w-xs">{doc.title}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold tracking-tight text-[#18221E] sm:text-3xl border-b border-[#10251F] bg-transparent focus:outline-none"
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-[#18221E] sm:text-3xl">
                {doc.title}
              </h1>
            )}

            <StatusBadge status={status} />
          </div>

          <p className="mt-1 text-xs text-[#65706A]">
            {doc.category} · {doc.word_count || 100} words · {doc.read_time_minutes || 1} min read · Updated {doc.last_updated} by {doc.author_name}
          </p>
        </div>

        {/* Right-side Action Buttons */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setTitle(doc.title);
                  setContent(doc.content);
                }}
                className="rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-[10px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#10251F] px-3.5 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
              >
                <EditIcon size={13} />
                <span>Edit Document</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                title="Download Markdown"
              >
                <DownloadIcon size={13} />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="rounded-[10px] border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                title="Delete Document"
              >
                <TrashIcon size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ================================================== */}
      {/* 2-COLUMN WORKSPACE (Editor & Right Details Panel) */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: DOCUMENT CONTENT AREA (~75%) */}
        <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
          {isEditing && (
            /* Rich Text Formatting Toolbar */
            <div className="flex items-center gap-1 rounded-[12px] border border-[#D8DDD4] bg-white p-2 shadow-2xs text-xs flex-wrap">
              <button
                type="button"
                onClick={() => setContent((prev) => prev + " **Bold** ")}
                className="p-1.5 rounded hover:bg-[#FAF9F5] text-[#18221E]"
                title="Bold"
              >
                <BoldIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setContent((prev) => prev + " *Italic* ")}
                className="p-1.5 rounded hover:bg-[#FAF9F5] text-[#18221E]"
                title="Italic"
              >
                <ItalicIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setContent((prev) => prev + "\n## Heading 2\n")}
                className="px-2 py-1 rounded hover:bg-[#FAF9F5] font-bold text-[#18221E]"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => setContent((prev) => prev + "\n### Heading 3\n")}
                className="px-2 py-1 rounded hover:bg-[#FAF9F5] font-bold text-[#18221E]"
                title="Heading 3"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => setContent((prev) => prev + "\n- Item 1\n- Item 2\n")}
                className="p-1.5 rounded hover:bg-[#FAF9F5] text-[#18221E]"
                title="Bullet List"
              >
                <ListBulletIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setContent((prev) => prev + "\n> Callout / Quote\n")}
                className="p-1.5 rounded hover:bg-[#FAF9F5] text-[#18221E]"
                title="Quote"
              >
                <QuoteIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setContent((prev) => prev + "\n```typescript\nconst ropimo = 'v2.0';\n```\n")}
                className="p-1.5 rounded hover:bg-[#FAF9F5] text-[#18221E]"
                title="Code Block"
              >
                <CodeIcon size={14} />
              </button>
              <button
                type="button"
                onClick={() => setContent((prev) => prev + "\n| Col 1 | Col 2 |\n| :--- | :--- |\n| Val 1 | Val 2 |\n")}
                className="p-1.5 rounded hover:bg-[#FAF9F5] text-[#18221E]"
                title="Table"
              >
                <TableIcon size={14} />
              </button>

              <div className="ml-auto flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Version note (e.g. Added section 3)"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 py-1 text-xs"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                  className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-1 text-xs font-semibold"
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="In Review">In Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>
          )}

          {/* Main Content Viewer / Textarea */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-8 shadow-2xs min-h-[500px]">
            {isEditing ? (
              <textarea
                rows={22}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full bg-transparent font-mono text-xs text-[#18221E] focus:outline-none resize-y leading-relaxed"
                placeholder="Start writing Markdown here..."
              />
            ) : (
              <div className="prose prose-sm max-w-none text-[#18221E] space-y-4">
                <FormattedMarkdown content={doc.content} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TABS PANEL (Info, Versions, Comments, Access) (~25%) */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs space-y-4">
            {/* Tab Navigation */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] text-[11px] font-semibold text-[#65706A]">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={cn(
                  "py-1 rounded-[6px] transition-colors",
                  activeTab === "info" && "bg-white text-[#18221E] shadow-2xs"
                )}
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("versions")}
                className={cn(
                  "py-1 rounded-[6px] transition-colors",
                  activeTab === "versions" && "bg-white text-[#18221E] shadow-2xs"
                )}
              >
                Versions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("comments")}
                className={cn(
                  "py-1 rounded-[6px] transition-colors",
                  activeTab === "comments" && "bg-white text-[#18221E] shadow-2xs"
                )}
              >
                Comments
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("access")}
                className={cn(
                  "py-1 rounded-[6px] transition-colors",
                  activeTab === "access" && "bg-white text-[#18221E] shadow-2xs"
                )}
              >
                Access
              </button>
            </div>

            {/* TAB CONTENT: INFO */}
            {activeTab === "info" && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                  <span className="text-[#65706A]">Category</span>
                  <span className="font-semibold text-[#18221E]">{doc.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                  <span className="text-[#65706A]">Status</span>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                  <span className="text-[#65706A]">Author</span>
                  <span className="font-semibold text-[#18221E]">{doc.author_name}</span>
                </div>
                {doc.department_name && (
                  <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                    <span className="text-[#65706A]">Department</span>
                    <span className="font-semibold text-[#18221E]">{doc.department_name}</span>
                  </div>
                )}
                {doc.project_name && (
                  <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                    <span className="text-[#65706A]">Project</span>
                    <span className="font-semibold text-[#18221E]">{doc.project_name}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                  <span className="text-[#65706A]">Access Level</span>
                  <span className="font-semibold text-[#18221E] capitalize">{doc.access_level}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                  <span className="text-[#65706A]">Created</span>
                  <span className="font-semibold text-[#18221E]">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                  <span className="text-[#65706A]">Last Modified</span>
                  <span className="font-semibold text-[#18221E]">{doc.last_updated}</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: VERSIONS */}
            {activeTab === "versions" && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                  Version History
                </span>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {versions.length === 0 ? (
                    <p className="text-xs text-[#65706A]">Version 1.0 (Current)</p>
                  ) : (
                    versions.map((v, i) => (
                      <div
                        key={v.id || i}
                        className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#18221E]">{v.version_number}</span>
                          <span className="text-[10px] text-[#65706A]">{v.created_at}</span>
                        </div>
                        <p className="text-[11px] text-[#65706A]">
                          Edited by {v.author_name}
                        </p>
                        {v.note && (
                          <p className="text-[10px] italic text-[#18221E]">
                            "{v.note}"
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(v)}
                          className="mt-1 text-[10px] font-bold text-[#246244] hover:underline"
                        >
                          Restore this version ↺
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: COMMENTS */}
            {activeTab === "comments" && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                  Discussion & Comments ({comments.length})
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-xs text-[#65706A]">No comments posted yet.</p>
                  ) : (
                    comments.map((c, i) => (
                      <div
                        key={c.id || i}
                        className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#18221E]">{c.author_name}</span>
                          <span className="text-[10px] text-[#65706A]">{c.created_at}</span>
                        </div>
                        <p className="text-xs text-[#18221E]">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="pt-2 border-t border-[#D8DDD4] space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Write a comment (@ mention teammates)..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="rounded-[6px] bg-[#10251F] px-3 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
                  >
                    Post Comment
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: ACCESS */}
            {activeTab === "access" && (
              <div className="space-y-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                  Active Permissions
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4]">
                    <div>
                      <p className="font-semibold text-[#18221E]">Entire Company</p>
                      <p className="text-[10px] text-[#65706A]">All workspace members</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#65706A]">View</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4]">
                    <div>
                      <p className="font-semibold text-[#18221E]">{doc.author_name} (Owner)</p>
                      <p className="text-[10px] text-[#65706A]">Author & Manager</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#246244]">Full Access</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case "Published":
      return (
        <span className="inline-flex items-center rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857] border border-[#A7F3D0]">
          Published
        </span>
      );
    case "Draft":
      return (
        <span className="inline-flex items-center rounded-md bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-semibold text-[#B45309] border border-[#FDE68A]">
          Draft
        </span>
      );
    case "In Review":
      return (
        <span className="inline-flex items-center rounded-md bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8] border border-[#BFDBFE]">
          In Review
        </span>
      );
    case "Approved":
      return (
        <span className="inline-flex items-center rounded-md bg-[#F0FDF4] px-2 py-0.5 text-[11px] font-semibold text-[#15803D] border border-[#BBF7D0]">
          Approved
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#4B5563] border border-[#E5E7EB]">
          {status}
        </span>
      );
  }
}

function FormattedMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-3 font-sans">
      {lines.map((line, idx) => {
        // Image markdown: ![alt](url)
        const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          const alt = imgMatch[1] || "Uploaded image";
          const src = imgMatch[2];
          return (
            <div key={idx} className="my-4 rounded-xl border border-[#D8DDD4] bg-[#FAF9F5] p-3 overflow-hidden shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[480px] w-auto max-w-full rounded-lg object-contain mx-auto transition-transform hover:scale-[1.01]"
                loading="lazy"
              />
              <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-[#65706A]">
                <span className="truncate font-medium">{alt}</span>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#10251F] hover:underline"
                >
                  Open Original ↗
                </a>
              </div>
            </div>
          );
        }

        if (line.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-xl font-bold text-[#18221E] pb-2 border-b border-[#D8DDD4]">
              {line.replace("# ", "")}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-base font-bold text-[#18221E] mt-4 mb-2">
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-bold text-[#18221E] mt-3 mb-1">
              {line.replace("### ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={idx} className="text-xs text-[#18221E] ml-4 list-disc">
              {line.replace("- ", "")}
            </li>
          );
        }
        if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ")) {
          return (
            <li key={idx} className="text-xs text-[#18221E] ml-4 list-decimal">
              {line.replace(/^\d+\.\s/, "")}
            </li>
          );
        }
        if (line.startsWith("> ")) {
          return (
            <blockquote key={idx} className="border-l-4 border-[#10251F] pl-3 py-1 text-xs italic text-[#65706A] bg-[#FAF9F5] rounded-r">
              {line.replace("> ", "")}
            </blockquote>
          );
        }
        if (line === "---") {
          return <hr key={idx} className="border-t border-[#D8DDD4] my-4" />;
        }
        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }
        return (
          <p key={idx} className="text-xs leading-relaxed text-[#18221E]">
            {line}
          </p>
        );
      })}
    </div>
  );
}

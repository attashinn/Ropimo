"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  DocumentItem,
  DocumentCategory,
  DocumentStatus,
  DocumentAccessLevel,
  DocumentPermission,
  DocumentStats,
} from "@/types/documents";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { PrimaryButton } from "@/components/ui/primary-button";
import { cn } from "@/lib/utils";
import {
  DocumentIcon,
  DocumentTotalIcon,
  DocumentDraftIcon,
  DocumentPublishedIcon,
  DocumentSharedIcon,
  DocumentExpiringIcon,
  HistoryIcon,
  MessageSquareIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  QuoteIcon,
  CodeIcon,
  TableIcon,
} from "./document-icons";
import {
  SearchIcon,
  FilterIcon,
  PlusIcon,
  UploadIcon,
  ListIcon,
  GridIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  StarIcon,
  TrashIcon,
  EditIcon,
  ShareIcon,
  DownloadIcon,
  CheckIcon,
  XIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  UsersIcon,
  ExternalLinkIcon,
} from "./file-icons";
import {
  createDocumentAction,
  deleteDocumentAction,
  toggleStarDocumentAction,
  shareDocumentAction,
} from "@/lib/documents/actions";
import { uploadFileToR2 } from "@/lib/storage/upload-client";

export interface DocumentsViewProps {
  workspaceId: string;
  workspaceName?: string;
  currentUserId?: string;
  initialDocuments: DocumentItem[];
  documentStats: DocumentStats;
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
}

export function DocumentsView({
  workspaceId,
  workspaceName = "brnnd",
  currentUserId,
  initialDocuments,
  documentStats,
  people,
  projects,
  departments,
}: DocumentsViewProps) {
  const router = useRouter();
  const [documents, setDocuments] = React.useState<DocumentItem[]>(initialDocuments);
  React.useEffect(() => {
    setDocuments((prev) => {
      const map = new Map<string, DocumentItem>();
      // Keep existing client documents (including newly uploaded)
      prev.forEach((d) => map.set(d.id, d));
      // Merge in incoming server documents
      initialDocuments.forEach((d) => map.set(d.id, d));
      return Array.from(map.values());
    });
  }, [initialDocuments]);

  // View & Filtering State
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<"all" | DocumentCategory>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<"all" | DocumentStatus>("all");
  const [selectedAuthorId, setSelectedAuthorId] = React.useState<string>("all");
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("all");
  const [selectedProjId, setSelectedProjId] = React.useState<string>("all");
  const [activeQuickFilter, setActiveQuickFilter] = React.useState<string>("all");
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);

  // Selection
  const [selectedDocIds, setSelectedDocIds] = React.useState<string[]>([]);

  // Modals & Panels
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [shareModalDoc, setShareModalDoc] = React.useState<DocumentItem | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = React.useState<DocumentItem | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = React.useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);

  // Filtered documents list
  const filteredDocuments = React.useMemo(() => {
    let list = documents;

    // Quick filters
    if (activeQuickFilter === "approvals") {
      list = list.filter((d) => d.status === "In Review" || d.status === "Draft");
    } else if (activeQuickFilter === "trash") {
      list = list.filter((d) => d.is_trash);
    } else {
      list = list.filter((d) => !d.is_trash);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.subtitle && d.subtitle.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          d.category.toLowerCase().includes(q) ||
          d.author_name.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter((d) => d.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== "all") {
      list = list.filter((d) => d.status === selectedStatus);
    }

    // Author filter
    if (selectedAuthorId !== "all") {
      list = list.filter((d) => d.author_id === selectedAuthorId);
    }

    // Department filter
    if (selectedDeptId !== "all") {
      list = list.filter((d) => d.department_id === selectedDeptId);
    }

    // Project filter
    if (selectedProjId !== "all") {
      list = list.filter((d) => d.project_id === selectedProjId);
    }

    return list;
  }, [
    documents,
    activeQuickFilter,
    searchQuery,
    selectedCategory,
    selectedStatus,
    selectedAuthorId,
    selectedDeptId,
    selectedProjId,
  ]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocuments.map((d) => d.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  // Actions
  const handleToggleStar = async (doc: DocumentItem) => {
    const nextStarred = !doc.is_starred;
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, is_starred: nextStarred } : d))
    );
    await toggleStarDocumentAction(doc.id, !!doc.is_starred, workspaceId);
  };

  const handleDeleteDocument = async (doc: DocumentItem) => {
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    setSelectedDocIds((prev) => prev.filter((id) => id !== doc.id));
    setDeleteConfirmDoc(null);
    await deleteDocumentAction(doc.id, workspaceId);
  };

  const handleDocumentCreated = (newDoc: DocumentItem | DocumentItem[]) => {
    const docs = Array.isArray(newDoc) ? newDoc : [newDoc];
    setDocuments((prev) => [...docs, ...prev]);
    setCreateModalOpen(false);
    setUploadModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ================================================== */}
      {/* PAGE HEADER */}
      {/* ================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#D8DDD4]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18221E] sm:text-3xl">
            Documents
          </h1>
          <p className="mt-1 text-sm text-[#65706A]">
            Create, manage and collaborate on company documents.
          </p>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-2.5">
          {/* Primary Dark Green Button */}
          <PrimaryButton
            size="sm"
            onClick={() => setCreateModalOpen(true)}
          >
            + New Document
          </PrimaryButton>

          {/* Secondary Outlined Upload Document Button */}
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#B8C0B2] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10251F]"
          >
            <UploadIcon size={14} className="text-[#10251F]" />
            <span>Upload Document</span>
          </button>

          {/* Extra Options 3-dot Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              className="rounded-[10px] border border-[#D8DDD4] bg-white p-2 text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] hover:border-[#B8C0B2] transition-colors focus:outline-none"
              title="More options"
            >
              <MoreVerticalIcon size={16} />
            </button>

            <AnimatePresence>
              {headerMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setHeaderMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-[12px] border border-[#D8DDD4] bg-white p-1.5 shadow-xl z-40 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setCreateModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left font-medium text-[#18221E] hover:bg-[#FAF9F5]"
                    >
                      <PlusIcon size={14} />
                      <span>New Document</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setActiveQuickFilter("approvals");
                      }}
                      className="w-full flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left font-medium text-[#18221E] hover:bg-[#FAF9F5]"
                    >
                      <HistoryIcon size={14} />
                      <span>Pending Approvals</span>
                    </button>
                    <div className="my-1 border-t border-[#D8DDD4]" />
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setActiveQuickFilter("trash");
                      }}
                      className="w-full flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left font-medium text-[#65706A] hover:bg-[#FAF9F5] hover:text-red-600"
                    >
                      <TrashIcon size={14} />
                      <span>Recycle Bin</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* DOCUMENT STATISTICS (5 COMPACT CARDS) */}
      {/* ================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Documents */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#EAF4E2] text-[#246244]">
            <DocumentTotalIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              TOTAL DOCUMENTS
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {documentStats.totalDocuments}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">All documents</span>
          </div>
        </div>

        {/* Card 2: Drafts */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FEF6E4] text-[#B58500]">
            <DocumentDraftIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              DRAFTS
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {documentStats.draftsCount}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">Work in progress</span>
          </div>
        </div>

        {/* Card 3: Published */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#EFF6FF] text-[#2563EB]">
            <DocumentPublishedIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              PUBLISHED
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {documentStats.publishedCount}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">Published documents</span>
          </div>
        </div>

        {/* Card 4: Shared */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FAF5FF] text-[#7C3AED]">
            <DocumentSharedIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              SHARED
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {documentStats.sharedCount}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">Shared with others</span>
          </div>
        </div>

        {/* Card 5: Expiring Soon */}
        <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FEF2F2] text-[#DC2626]">
            <DocumentExpiringIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              EXPIRING SOON
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {documentStats.expiringSoonCount}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">Within 30 days</span>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* MAIN DOCUMENT WORKSPACE (2 COLUMNS: ~75% / ~25%) */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: DOCUMENT BROWSER (~75% on XL) */}
        <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
          {/* TOOLBAR */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[14px] border border-[#D8DDD4] bg-white p-3 shadow-2xs">
            {/* Left: Search input */}
            <div className="relative flex-1 max-w-sm">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65706A]"
              />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] pl-8.5 pr-8 text-xs text-[#18221E] placeholder:text-[#65706A] focus:border-[#10251F] focus:bg-white focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#65706A] hover:text-[#18221E]"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>

            {/* Right-side dropdowns & view toggle */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="h-8 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 text-xs font-semibold text-[#18221E] focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Legal">Legal</option>
                <option value="Marketing">Marketing</option>
                <option value="Product">Product</option>
                <option value="Procurement">Procurement</option>
                <option value="Other">Other</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="h-8 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 text-xs font-semibold text-[#18221E] focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="In Review">In Review</option>
                <option value="Approved">Approved</option>
                <option value="Archived">Archived</option>
              </select>

              {/* Author Filter */}
              <select
                value={selectedAuthorId}
                onChange={(e) => setSelectedAuthorId(e.target.value)}
                className="h-8 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 text-xs font-semibold text-[#18221E] focus:outline-none cursor-pointer"
              >
                <option value="all">All Authors</option>
                {people.map((p) => (
                  <option key={p.id} value={p.user_id || p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>

              {/* Filter Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterPopoverOpen(!filterPopoverOpen)}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 rounded-[8px] border px-2.5 text-xs font-semibold transition-colors focus:outline-none",
                    selectedDeptId !== "all" || selectedProjId !== "all"
                      ? "bg-[#10251F] text-white border-[#10251F]"
                      : "bg-white text-[#18221E] border-[#D8DDD4] hover:bg-[#FAF9F5]"
                  )}
                >
                  <FilterIcon size={13} />
                  <span>Filters</span>
                </button>

                <AnimatePresence>
                  {filterPopoverOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setFilterPopoverOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute right-0 top-full mt-2 w-64 rounded-[12px] border border-[#D8DDD4] bg-white p-4 shadow-xl z-40 text-xs space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#D8DDD4]">
                          <span className="font-bold text-[#18221E]">More Filters</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDeptId("all");
                              setSelectedProjId("all");
                              setSelectedAuthorId("all");
                              setSelectedCategory("all");
                              setSelectedStatus("all");
                            }}
                            className="text-[10px] font-semibold text-[#65706A] hover:text-[#18221E]"
                          >
                            Reset
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                            Department
                          </label>
                          <select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            className="w-full rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] p-1.5 text-xs"
                          >
                            <option value="all">All Departments</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                            Project
                          </label>
                          <select
                            value={selectedProjId}
                            onChange={(e) => setSelectedProjId(e.target.value)}
                            className="w-full rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] p-1.5 text-xs"
                          >
                            <option value="all">All Projects</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* View Toggle (Grid / List) */}
              <div className="flex items-center rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded-[6px] p-1.5 transition-colors",
                    viewMode === "list"
                      ? "bg-[#10251F] text-[#F4F3EE] shadow-xs"
                      : "text-[#65706A] hover:text-[#18221E]"
                  )}
                  title="List View"
                >
                  <ListIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded-[6px] p-1.5 transition-colors",
                    viewMode === "grid"
                      ? "bg-[#10251F] text-[#F4F3EE] shadow-xs"
                      : "text-[#65706A] hover:text-[#18221E]"
                  )}
                  title="Grid View"
                >
                  <GridIcon size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE FILTER / BATCH ACTIONS BAR */}
          {(activeQuickFilter !== "all" || selectedDocIds.length > 0) && (
            <div className="flex items-center justify-between px-1 text-xs">
              {activeQuickFilter !== "all" && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#18221E] capitalize">
                    Filter: {activeQuickFilter.replace("_", " ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveQuickFilter("all")}
                    className="rounded bg-[#E7EADF] px-1.5 py-0.5 text-[10px] font-bold text-[#10251F]"
                  >
                    Clear ✕
                  </button>
                </div>
              )}

              {selectedDocIds.length > 0 && (
                <div className="flex items-center gap-2 bg-[#E7EADF] px-2.5 py-1 rounded-[8px] text-xs font-semibold text-[#10251F] ml-auto">
                  <span>{selectedDocIds.length} selected</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDocIds([])}
                    className="hover:underline text-[10px]"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENT TABLE OR GRID */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
            {filteredDocuments.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F5] border border-[#D8DDD4] text-[#65706A]">
                  <DocumentIcon size={22} />
                </div>
                <h4 className="text-sm font-bold text-[#18221E]">No documents found</h4>
                <p className="text-xs text-[#65706A]">
                  Create a new document or change your filter settings.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-3.5 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
                >
                  <PlusIcon size={13} />
                  <span>New Document</span>
                </button>
              </div>
            ) : viewMode === "list" ? (
              /* ==================== LIST VIEW TABLE ==================== */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#D8DDD4] bg-[#FAF9F5] text-[#65706A] font-bold select-none">
                      <th className="w-10 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredDocuments.length > 0 &&
                            selectedDocIds.length === filteredDocuments.length
                          }
                          onChange={handleToggleSelectAll}
                          className="h-3.5 w-3.5 rounded border-[#D8DDD4] text-[#10251F] focus:ring-[#10251F]"
                        />
                      </th>
                      <th className="px-3 py-3 uppercase tracking-wider text-[10px]">
                        DOCUMENT NAME ↑
                      </th>
                      <th className="px-3 py-3 uppercase tracking-wider text-[10px]">CATEGORY</th>
                      <th className="px-3 py-3 uppercase tracking-wider text-[10px]">STATUS</th>
                      <th className="px-3 py-3 uppercase tracking-wider text-[10px]">AUTHOR</th>
                      <th className="px-3 py-3 uppercase tracking-wider text-[10px]">LAST UPDATED</th>
                      <th className="w-12 px-3 py-3 text-right uppercase tracking-wider text-[10px]">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8DDD4]">
                    {filteredDocuments.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => router.push(`/app/documents/${doc.id}`)}
                          className={cn(
                            "group hover:bg-[#FAF9F5] transition-colors cursor-pointer",
                            isSelected && "bg-[#FAF9F5]"
                          )}
                        >
                          {/* Checkbox */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectOne(doc.id);
                            }}
                            className="px-4 py-3 text-center"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded border-[#D8DDD4] text-[#10251F] focus:ring-[#10251F]"
                            />
                          </td>

                          {/* Document Name + Subtitle */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3 max-w-sm truncate">
                              <span className="shrink-0">
                                <DocumentIcon size={18} color={getCategoryColor(doc.category)} />
                              </span>
                              <div className="min-w-0 truncate">
                                <p className="font-semibold text-[#18221E] group-hover:underline truncate text-xs">
                                  {doc.title}
                                </p>
                                {doc.subtitle && (
                                  <p className="text-[11px] text-[#65706A] truncate">
                                    {doc.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-3 py-3 whitespace-nowrap font-medium text-[#18221E]">
                            {doc.category}
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <StatusBadge status={doc.status} />
                          </td>

                          {/* Author */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[10px] font-bold text-[#F4F3EE]">
                                {doc.author_name ? doc.author_name[0].toUpperCase() : "T"}
                              </div>
                              <span className="text-xs font-medium text-[#18221E] truncate max-w-[120px]">
                                {doc.author_name}
                              </span>
                            </div>
                          </td>

                          {/* Last Updated */}
                          <td className="px-3 py-3 text-[#65706A] whitespace-nowrap">
                            {doc.last_updated}
                          </td>

                          {/* Action Menu (⋯) */}
                          <td
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-3 text-right relative"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionMenuId(
                                  openActionMenuId === doc.id ? null : doc.id
                                )
                              }
                              className="rounded p-1 text-[#65706A] hover:bg-[#E7EADF] hover:text-[#18221E] transition-colors focus:outline-none"
                            >
                              <MoreHorizontalIcon size={16} />
                            </button>

                            {/* Dropdown Action Menu */}
                            {openActionMenuId === doc.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setOpenActionMenuId(null)}
                                />
                                <div className="absolute right-3 top-10 w-44 rounded-[12px] border border-[#D8DDD4] bg-white p-1.5 shadow-xl z-40 text-left text-xs space-y-0.5">
                                  <Link
                                    href={`/app/documents/${doc.id}`}
                                    onClick={() => setOpenActionMenuId(null)}
                                    className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[#FAF9F5] text-[#18221E]"
                                  >
                                    <ExternalLinkIcon size={13} />
                                    <span>Open / Edit</span>
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setShareModalDoc(doc);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[#FAF9F5] text-[#18221E]"
                                  >
                                    <ShareIcon size={13} />
                                    <span>Share</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleToggleStar(doc);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[#FAF9F5] text-[#18221E]"
                                  >
                                    <StarIcon size={13} filled={doc.is_starred} />
                                    <span>{doc.is_starred ? "Unstar" : "Star"}</span>
                                  </button>
                                  <div className="my-1 border-t border-[#D8DDD4]" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setDeleteConfirmDoc(doc);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-red-50 text-red-600 font-medium"
                                  >
                                    <TrashIcon size={13} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ==================== GRID VIEW ==================== */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => router.push(`/app/documents/${doc.id}`)}
                    className="group relative rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-4 transition-all hover:bg-white hover:shadow-xs cursor-pointer flex flex-col justify-between min-h-[160px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white border border-[#D8DDD4] shadow-2xs">
                        <DocumentIcon size={18} color={getCategoryColor(doc.category)} />
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-bold text-[#18221E] truncate group-hover:underline">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-[#65706A] truncate">
                        {doc.subtitle || doc.description || doc.category}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#D8DDD4] text-[10px] text-[#65706A]">
                      <span>{doc.author_name}</span>
                      <span>{doc.last_updated}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-[#D8DDD4] bg-[#FAF9F5] text-xs gap-3">
              <span className="text-[#65706A]">
                Showing 1 to {Math.min(10, filteredDocuments.length)} of {documentStats.totalDocuments} documents
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-[6px] border border-[#D8DDD4] bg-white p-1.5 text-[#65706A] hover:bg-[#FAF9F5] disabled:opacity-50"
                  disabled
                >
                  <ChevronLeftIcon size={13} />
                </button>

                <button
                  type="button"
                  className="h-7 w-7 rounded-[6px] bg-[#10251F] font-bold text-[#F4F3EE]"
                >
                  1
                </button>
                <button
                  type="button"
                  className="h-7 w-7 rounded-[6px] border border-[#D8DDD4] bg-white font-medium text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  2
                </button>
                <button
                  type="button"
                  className="h-7 w-7 rounded-[6px] border border-[#D8DDD4] bg-white font-medium text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  3
                </button>
                <span className="px-1 text-[#65706A]">...</span>
                <button
                  type="button"
                  className="h-7 w-8 rounded-[6px] border border-[#D8DDD4] bg-white font-medium text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  33
                </button>

                <button
                  type="button"
                  className="rounded-[6px] border border-[#D8DDD4] bg-white p-1.5 text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  <ChevronRightIcon size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CATEGORIES & ACTIVITY (~25% on XL) */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-5">
          {/* SECTION 1: DOCUMENT CATEGORIES */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D8DDD4]">
              <span className="text-xs font-bold text-[#18221E]">Document Categories</span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E]"
              >
                View all →
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {documentStats.categoriesBreakdown.map((cat, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat.category ? "all" : cat.category)
                  }
                  className={cn(
                    "w-full flex items-center justify-between p-1.5 rounded-[6px] transition-colors",
                    selectedCategory === cat.category ? "bg-[#FAF9F5] font-bold" : "hover:bg-[#FAF9F5]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-[#18221E]">{cat.category}</span>
                  </div>
                  <span className="font-semibold text-[#65706A]">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: RECENT ACTIVITY */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D8DDD4]">
              <span className="text-xs font-bold text-[#18221E]">Recent Activity</span>
              <button
                type="button"
                className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E]"
              >
                View all →
              </button>
            </div>

            <div className="space-y-3">
              {[
                { name: "Company Policy Handbook.pdf", action: "Uploaded by Tashin Khan", time: "2 hours ago", color: "#DC2626" },
                { name: "Q3 Budget Report 2026.xlsx", action: "Edited by Arafath Hossain", time: "Yesterday", color: "#16A34A" },
                { name: "Project Management Playbook.docx", action: "Created by Fatema Islam", time: "Yesterday", color: "#2563EB" },
                { name: "Brand Guidelines 2026.pptx", action: "Edited by Sarah Ahmed", time: "2 days ago", color: "#EA580C" },
                { name: "Client Contract Template.pdf", action: "Downloaded by Munshi Tanjir", time: "2 days ago", color: "#D97706" },
              ].map((act, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4]">
                    <DocumentIcon size={14} color={act.color} />
                  </div>
                  <div className="min-w-0 flex-1 truncate">
                    <p className="truncate text-xs font-bold text-[#18221E]">{act.name}</p>
                    <p className="text-[10px] text-[#65706A]">{act.action}</p>
                    <p className="text-[9px] text-[#65706A]/75">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: QUICK ACTIONS */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D8DDD4]">
              <span className="text-xs font-bold text-[#18221E]">Quick Actions</span>
            </div>

            <div className="space-y-1.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="w-full flex items-center justify-between p-2 rounded-[8px] hover:bg-[#FAF9F5] text-[#18221E] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PlusIcon size={14} className="text-[#10251F]" />
                  <span>Create New Document</span>
                </div>
                <ChevronRightIcon size={12} className="opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("HR")}
                className="w-full flex items-center justify-between p-2 rounded-[8px] hover:bg-[#FAF9F5] text-[#18221E] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <DocumentIcon size={14} className="text-blue-600" />
                  <span>Document Templates</span>
                </div>
                <ChevronRightIcon size={12} className="opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveQuickFilter("approvals")}
                className="w-full flex items-center justify-between p-2 rounded-[8px] hover:bg-[#FAF9F5] text-[#18221E] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HistoryIcon size={14} className="text-amber-600" />
                  <span>Pending Approvals</span>
                </div>
                <ChevronRightIcon size={12} className="opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveQuickFilter("trash")}
                className="w-full flex items-center justify-between p-2 rounded-[8px] hover:bg-[#FAF9F5] text-[#18221E] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TrashIcon size={14} className="text-red-500" />
                  <span>Recycle Bin</span>
                </div>
                <ChevronRightIcon size={12} className="opacity-60" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* MODALS */}
      {/* ================================================== */}

      {/* 1. CREATE DOCUMENT MODAL */}
      <CreateDocumentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workspaceId={workspaceId}
        projects={projects}
        departments={departments}
        onSuccess={handleDocumentCreated}
      />

      {/* 2. UPLOAD DOCUMENT MODAL */}
      <UploadDocumentModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        workspaceId={workspaceId}
        projects={projects}
        departments={departments}
        onSuccess={handleDocumentCreated}
      />

      {/* 3. SHARE MODAL */}
      {shareModalDoc && (
        <ShareDocumentModal
          document={shareModalDoc}
          onClose={() => setShareModalDoc(null)}
          people={people}
          workspaceId={workspaceId}
        />
      )}

      {/* 4. DELETE CONFIRMATION */}
      {deleteConfirmDoc && (
        <DeleteDocConfirmDialog
          document={deleteConfirmDoc}
          onClose={() => setDeleteConfirmDoc(null)}
          onConfirm={() => handleDeleteDocument(deleteConfirmDoc)}
        />
      )}
    </div>
  );
}

// =========================================================================
// STATUS BADGE COMPONENT
// =========================================================================

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
    case "Expiring Soon":
      return (
        <span className="inline-flex items-center rounded-md bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] border border-[#FECACA]">
          Expiring Soon
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

function getCategoryColor(category: DocumentCategory) {
  switch (category) {
    case "HR":
      return "#DC2626";
    case "Finance":
      return "#16A34A";
    case "Operations":
      return "#2563EB";
    case "Legal":
      return "#D97706";
    case "Marketing":
      return "#EA580C";
    case "Product":
      return "#F59E0B";
    case "Procurement":
      return "#059669";
    default:
      return "#9333EA";
  }
}

// =========================================================================
// CREATE DOCUMENT MODAL
// =========================================================================

function CreateDocumentModal({
  isOpen,
  onClose,
  workspaceId,
  projects,
  departments,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projects: Project[];
  departments: Department[];
  onSuccess: (newDoc: DocumentItem) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [category, setCategory] = React.useState<DocumentCategory>("HR");
  const [departmentId, setDepartmentId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [accessLevel, setAccessLevel] = React.useState<DocumentAccessLevel>("company");
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (publishStatus: DocumentStatus = "Published") => {
    if (!title.trim()) return;
    setLoading(true);

    const selectedDept = departments.find((d) => d.id === departmentId);
    const selectedProj = projects.find((p) => p.id === projectId);

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      workspace_id: workspaceId,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      description: subtitle.trim() || null,
      content: content || `# ${title}\n\nStart writing document content here...`,
      category,
      status: publishStatus,
      department_id: departmentId || null,
      department_name: selectedDept?.name || null,
      project_id: projectId || null,
      project_name: selectedProj?.name || null,
      author_id: "u-tashin",
      author_name: "Tashin Khan",
      author_avatar: null,
      access_level: accessLevel,
      word_count: content.split(/\s+/).filter(Boolean).length || 50,
      read_time_minutes: 1,
      last_updated: "Just now",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      versions: [
        {
          id: `v-${Date.now()}`,
          version_number: "1.0",
          author_name: "Tashin Khan",
          created_at: "Just now",
          note: "Initial version",
          content: content,
        },
      ],
      comments: [],
    };

    try {
      await createDocumentAction({
        workspaceId,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        content: newDoc.content,
        category,
        status: publishStatus,
        departmentId: departmentId || undefined,
        projectId: projectId || undefined,
        accessLevel,
      });
      onSuccess(newDoc);
    } catch (err) {
      console.error(err);
      onSuccess(newDoc);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-2xl rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
              <h3 className="text-base font-bold text-[#18221E]">New Document</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5]"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-[#18221E] mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Employee Onboarding Guide"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18221E] mb-1">
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of this document"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
                  >
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Legal">Legal</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Product">Product</option>
                    <option value="Procurement">Procurement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                    Project
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
                  >
                    <option value="">None</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                  Access Level
                </label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as DocumentAccessLevel)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
                >
                  <option value="company">Entire Company</option>
                  <option value="department">Department</option>
                  <option value="specific">Specific People</option>
                  <option value="private">Private (Only Me)</option>
                </select>
              </div>

              {/* Rich text editor box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#18221E]">
                    Document Content
                  </label>
                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-1 border border-[#D8DDD4] rounded-[6px] bg-[#FAF9F5] p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setContent((prev) => prev + " **Bold** ")}
                      className="p-1 rounded hover:bg-white text-[#65706A]"
                      title="Bold"
                    >
                      <BoldIcon size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContent((prev) => prev + " *Italic* ")}
                      className="p-1 rounded hover:bg-white text-[#65706A]"
                      title="Italic"
                    >
                      <ItalicIcon size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContent((prev) => prev + "\n- List Item")}
                      className="p-1 rounded hover:bg-white text-[#65706A]"
                      title="List"
                    >
                      <ListBulletIcon size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContent((prev) => prev + "\n> Quote")}
                      className="p-1 rounded hover:bg-white text-[#65706A]"
                      title="Quote"
                    >
                      <QuoteIcon size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContent((prev) => prev + "\n```\ncode\n```")}
                      className="p-1 rounded hover:bg-white text-[#65706A]"
                      title="Code"
                    >
                      <CodeIcon size={12} />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  placeholder="Write Markdown or document content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-3 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DDD4]">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[8px] px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !title.trim()}
                onClick={() => handleSubmit("Draft")}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={loading || !title.trim()}
                onClick={() => handleSubmit("Published")}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
              >
                <span>{loading ? "Publishing..." : "Publish"}</span>
                <span className="text-[#C7F34A]">→</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// =========================================================================
// UPLOAD DOCUMENT MODAL
// =========================================================================

function UploadDocumentModal({
  isOpen,
  onClose,
  workspaceId,
  projects,
  departments,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  projects: Project[];
  departments: Department[];
  onSuccess: (newDocs: DocumentItem | DocumentItem[]) => void;
}) {
  interface SelectedFileItem {
    id: string;
    file: File;
    previewUrl?: string;
    isImage: boolean;
    ext: string;
    sizeFormatted: string;
  }

  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<DocumentCategory>("HR");
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadStatusText, setUploadStatusText] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount / change
  React.useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [files]);

  const addFiles = (fileList: FileList | File[]) => {
    const newItems: SelectedFileItem[] = Array.from(fileList).map((f) => {
      const isImg = f.type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif)$/i.test(f.name);
      const ext = f.name.split(".").pop()?.toUpperCase() || "FILE";
      const sizeFormatted =
        f.size > 1024 * 1024
          ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(f.size / 1024).toFixed(0)} KB`;

      return {
        id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        file: f,
        isImage: isImg,
        previewUrl: isImg ? URL.createObjectURL(f) : undefined,
        ext,
        sizeFormatted,
      };
    });

    setFiles((prev) => {
      const combined = [...prev, ...newItems];
      if (combined.length === 1 && !title) {
        setTitle(combined[0].file.name.replace(/\.[^/.]+$/, ""));
      }
      return combined;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so re-selecting same file triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const remaining = prev.filter((f) => f.id !== id);
      if (remaining.length === 1) {
        setTitle(remaining[0].file.name.replace(/\.[^/.]+$/, ""));
      } else if (remaining.length === 0) {
        setTitle("");
      }
      return remaining;
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(5);
    setUploadStatusText(`Preparing upload of ${files.length} document${files.length > 1 ? "s" : ""}...`);

    const createdDocuments: DocumentItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const currentFile = item.file;
        const fileTitle =
          files.length === 1 && title.trim()
            ? title.trim()
            : currentFile.name.replace(/\.[^/.]+$/, "");

        setUploadStatusText(`Uploading ${i + 1} of ${files.length}: ${currentFile.name}...`);

        // Upload directly to Cloudflare R2
        const r2Result = await uploadFileToR2(currentFile, {
          folder: "documents",
          workspaceId,
          onProgress: (percent) => {
            const overall = Math.round(((i + percent / 100) / files.length) * 100);
            setUploadProgress(Math.max(5, overall));
          },
        });

        const fileUrl = r2Result.success ? r2Result.fileUrl : "";
        const isImage = item.isImage;

        // Build rich markdown content with preview image embedding
        let docContent = `# ${fileTitle}\n\nUploaded document on ${new Date().toLocaleDateString()}.\n\n- **File Name:** \`${currentFile.name}\`\n- **File Size:** ${item.sizeFormatted}\n- **Format:** ${item.ext}`;

        if (isImage && fileUrl) {
          docContent += `\n\n![${fileTitle}](${fileUrl})`;
        } else if (fileUrl) {
          docContent += `\n\n[Download Original Document](${fileUrl})`;
        }

        const newDoc: DocumentItem = {
          id: `doc-${Date.now()}-${i}`,
          workspace_id: workspaceId,
          title: fileTitle,
          subtitle: `${item.ext} Document`,
          description: `Uploaded file: ${currentFile.name} (${item.sizeFormatted})`,
          content: docContent,
          category,
          status: "Published",
          author_id: "u-tashin",
          author_name: "Tashin Khan",
          access_level: "company",
          word_count: 50,
          read_time_minutes: 1,
          last_updated: "Just now",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          versions: [],
          comments: [],
        };

        await createDocumentAction({
          workspaceId,
          title: fileTitle,
          subtitle: newDoc.subtitle || undefined,
          content: newDoc.content,
          category,
          status: "Published",
        });

        createdDocuments.push(newDoc);
      }

      setUploadProgress(100);
      setUploadStatusText("Upload complete!");

      // Small delay for smooth visual feedback before pop-out
      setTimeout(() => {
        onSuccess(createdDocuments.length === 1 ? createdDocuments[0] : createdDocuments);
        // Reset state
        setFiles([]);
        setTitle("");
        setUploading(false);
        setUploadProgress(0);
        onClose();
      }, 300);
    } catch (err) {
      console.error("Document upload error:", err);
      if (createdDocuments.length > 0) {
        onSuccess(createdDocuments);
      }
      setUploading(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!uploading ? onClose : undefined}
            className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full max-w-lg rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 space-y-5"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
              <div>
                <h3 className="text-base font-bold text-[#18221E]">Upload Documents & Media</h3>
                <p className="text-xs text-[#65706A] mt-0.5">
                  Upload logos, posters, PDFs, sheets, or presentations to Cloudflare R2
                </p>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded p-1.5 text-[#65706A] hover:bg-[#FAF9F5] transition-colors"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drop / Selection Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    addFiles(e.dataTransfer.files);
                  }
                }}
                className="flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-5 text-center cursor-pointer hover:border-[#10251F] hover:bg-white transition-all group"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E7EADF] text-[#10251F] mb-2 group-hover:scale-105 transition-transform">
                  <UploadIcon size={20} />
                </div>
                <p className="text-xs font-bold text-[#18221E]">
                  {files.length > 0
                    ? `Click to add more files (${files.length} selected)`
                    : "Drag & drop files or click to browse"}
                </p>
                <p className="text-[11px] text-[#65706A] mt-1">
                  Supports PNG, JPG, WebP, SVG, PDF, DOCX, XLSX, PPTX, TXT, MD
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Selected Files Live Preview Grid / List */}
              {files.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#65706A]">
                    <span>Selected Files ({files.length})</span>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-red-600 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {files.map((item) => (
                      <div
                        key={item.id}
                        className="relative flex items-center gap-2.5 rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 hover:bg-white transition-colors overflow-hidden group"
                      >
                        {/* Visual Preview (Thumbnail or Icon Badge) */}
                        {item.isImage && item.previewUrl ? (
                          <div className="relative h-12 w-12 shrink-0 rounded-[6px] overflow-hidden border border-[#D8DDD4] bg-[#10251F]/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] bg-[#10251F] text-[10px] font-bold text-[#C7F34A]">
                            {item.ext}
                          </div>
                        )}

                        {/* File Meta */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#18221E]">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-[#65706A]">{item.sizeFormatted}</p>
                        </div>

                        {/* Remove Button */}
                        {!uploading && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(item.id);
                            }}
                            className="p-1 rounded text-[#65706A] hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Remove file"
                          >
                            <XIcon size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Title Input (Shown when 1 file is selected) */}
              {files.length === 1 && (
                <div>
                  <label className="block text-xs font-semibold text-[#18221E] mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Company Logo or Q3 Budget Report"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#18221E] focus:outline-none focus:border-[#10251F] focus:bg-white transition-colors"
                  />
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none focus:border-[#10251F] focus:bg-white transition-colors"
                >
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Legal">Legal</option>
                  <option value="Marketing">Marketing (Posters, Logos, Ads)</option>
                  <option value="Product">Product</option>
                  <option value="Procurement">Procurement</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-medium text-[#18221E]">
                    <span className="truncate">{uploadStatusText}</span>
                    <span className="font-bold text-[#10251F]">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#E7EADF] overflow-hidden">
                    <div
                      className="h-full bg-[#10251F] transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DDD4]">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={onClose}
                  className="rounded-[8px] px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5] disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || files.length === 0 || (files.length === 1 && !title.trim())}
                  className="rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {uploading
                    ? "Uploading..."
                    : files.length > 1
                    ? `Upload ${files.length} Documents`
                    : "Upload Document"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// =========================================================================
// SHARE DOCUMENT MODAL
// =========================================================================

function ShareDocumentModal({
  document,
  onClose,
  people,
  workspaceId,
}: {
  document: DocumentItem;
  onClose: () => void;
  people: WorkspacePerson[];
  workspaceId: string;
}) {
  const [selectedPersonId, setSelectedPersonId] = React.useState("");
  const [permission, setPermission] = React.useState<DocumentPermission>("view");
  const [sharesList, setSharesList] = React.useState<{ name: string; permission: DocumentPermission }[]>([
    { name: "Entire Company", permission: "view" },
    { name: "Sarah Ahmed (Design Lead)", permission: "edit" },
  ]);

  const handleAddShare = () => {
    if (!selectedPersonId) return;
    const person = people.find((p) => (p.user_id || p.id) === selectedPersonId);
    if (!person) return;

    setSharesList((prev) => [
      ...prev,
      { name: person.full_name || person.email, permission },
    ]);
    setSelectedPersonId("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
          <h3 className="text-base font-bold text-[#18221E]">Share Document</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5]">
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#65706A]">
            Share <span className="font-bold text-[#18221E]">{document.title}</span> with teammates and departments.
          </p>

          <div className="flex gap-2">
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="flex-1 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
            >
              <option value="">Select a team member...</option>
              {people.map((p) => (
                <option key={p.id} value={p.user_id || p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
            </select>

            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as DocumentPermission)}
              className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] font-semibold focus:outline-none"
            >
              <option value="view">View</option>
              <option value="comment">Comment</option>
              <option value="edit">Edit</option>
              <option value="full_access">Full Access</option>
            </select>

            <button
              type="button"
              onClick={handleAddShare}
              className="rounded-[8px] bg-[#10251F] px-3 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
            >
              Add
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#D8DDD4]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              People with access
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {sharesList.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <UsersIcon size={14} className="text-[#10251F]" />
                    <span className="font-semibold text-[#18221E] truncate">{s.name}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[#65706A]">{s.permission}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// DELETE CONFIRM DIALOG
// =========================================================================

function DeleteDocConfirmDialog({
  document,
  onClose,
  onConfirm,
}: {
  document: DocumentItem;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xl z-10 space-y-3"
      >
        <h4 className="text-sm font-bold text-[#18221E]">Delete Document</h4>
        <p className="text-xs text-[#65706A] leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-[#18221E]">"{document.title}"</span>?
          This document will be moved to the recycle bin.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-[8px] bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileItem,
  FileType,
  FileAccessLevel,
  FilePermission,
  StorageStats,
  FileActivity,
} from "@/types/files";
import { WorkspacePerson } from "@/types/people";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { PrimaryButton } from "@/components/ui/primary-button";
import { cn } from "@/lib/utils";
import {
  FolderIcon,
  PdfIcon,
  FigmaIcon,
  ExcelIcon,
  WordIcon,
  ImageIcon,
  ArchiveIcon,
  StorageIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
  DownloadIcon,
  UploadIcon,
  GridIcon,
  ListIcon,
  MoreHorizontalIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ClockIcon,
  UsersIcon,
  ExternalLinkIcon,
  EditIcon,
} from "./file-icons";
import {
  createFolderAction,
  uploadFilesAction,
  renameFileItemAction,
  moveItemAction,
  deleteFileItemAction,
  bulkDeleteFilesAction,
  toggleStarFileAction,
  shareFileItemAction,
} from "@/lib/files/actions";
import { uploadFileToR2 } from "@/lib/storage/upload-client";

export interface FilesViewProps {
  workspaceId: string;
  workspaceName?: string;
  currentUserId?: string;
  initialItems: FileItem[];
  allInitialItems: FileItem[];
  storageStats: StorageStats;
  initialActivities?: FileActivity[];
  people: WorkspacePerson[];
  projects: Project[];
  departments: Department[];
}

export function FilesView({
  workspaceId,
  workspaceName = "brnnd",
  currentUserId,
  initialItems,
  allInitialItems,
  storageStats,
  initialActivities = [],
  people,
  projects,
  departments,
}: FilesViewProps) {
  // Navigation & Folder Hierarchy
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [folderHistory, setFolderHistory] = React.useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Files" },
  ]);

  // Items State
  const [allItems, setAllItems] = React.useState<FileItem[]>(allInitialItems);
  React.useEffect(() => {
    setAllItems(allInitialItems);
  }, [allInitialItems]);

  // View & Filter States
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFileType, setSelectedFileType] = React.useState<"all" | FileType>("all");
  const [sortBy, setSortBy] = React.useState<"last_modified" | "name" | "size">("last_modified");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("all");
  const [selectedProjId, setSelectedProjId] = React.useState<string>("all");
  const [selectedUploaderId, setSelectedUploaderId] = React.useState<string>("all");
  const [activeQuickFilter, setActiveQuickFilter] = React.useState<"all" | "starred" | "shared" | "trash">("all");
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);

  // Selection
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);

  // Modals & Panels
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = React.useState(false);
  const [selectedFileForDetails, setSelectedFileForDetails] = React.useState<FileItem | null>(null);
  const [previewModalFile, setPreviewModalFile] = React.useState<FileItem | null>(null);
  const [shareModalItem, setShareModalItem] = React.useState<FileItem | null>(null);
  const [renameModalItem, setRenameModalItem] = React.useState<FileItem | null>(null);
  const [moveModalItem, setMoveModalItem] = React.useState<FileItem | null>(null);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = React.useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = React.useState<FileItem | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = React.useState(false);
  const [activityModalOpen, setActivityModalOpen] = React.useState(false);
  const [openActionMenuId, setOpenActionMenuId] = React.useState<string | null>(null);

  // Current folder items based on currentFolderId and filters
  const displayedItems = React.useMemo(() => {
    let list = allItems;

    // Quick access views override folder filtering
    if (activeQuickFilter === "starred") {
      list = list.filter((item) => item.is_starred && !item.is_trash);
    } else if (activeQuickFilter === "shared") {
      list = list.filter((item) => item.access_level === "company" || (item.shares && item.shares.length > 0));
    } else if (activeQuickFilter === "trash") {
      list = list.filter((item) => item.is_trash);
    } else {
      // Normal folder browsing
      list = list.filter((item) => (item.folder_id || null) === currentFolderId && !item.is_trash);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.department_name && item.department_name.toLowerCase().includes(q)) ||
          (item.project_name && item.project_name.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (selectedFileType !== "all") {
      list = list.filter((item) => item.file_type === selectedFileType);
    }

    // Department filter
    if (selectedDeptId !== "all") {
      list = list.filter((item) => item.department_id === selectedDeptId);
    }

    // Project filter
    if (selectedProjId !== "all") {
      list = list.filter((item) => item.project_id === selectedProjId);
    }

    // Uploader filter
    if (selectedUploaderId !== "all") {
      list = list.filter((item) => item.uploaded_by === selectedUploaderId);
    }

    // Sorting
    return [...list].sort((a, b) => {
      // Always keep folders on top during folder browsing
      if (activeQuickFilter === "all" && !searchQuery.trim()) {
        if (a.is_folder && !b.is_folder) return -1;
        if (!a.is_folder && b.is_folder) return 1;
      }

      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortBy === "size") {
        const sizeA = a.file_size || 0;
        const sizeB = b.file_size || 0;
        return sortOrder === "asc" ? sizeA - sizeB : sizeB - sizeA;
      }
      // default: last_modified / created_at
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [
    allItems,
    currentFolderId,
    activeQuickFilter,
    searchQuery,
    selectedFileType,
    selectedDeptId,
    selectedProjId,
    selectedUploaderId,
    sortBy,
    sortOrder,
  ]);

  // Folder navigation handlers
  const handleNavigateToFolder = (folder: FileItem) => {
    setCurrentFolderId(folder.id);
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setActiveQuickFilter("all");
    setSelectedItemIds([]);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const target = folderHistory[index];
    setCurrentFolderId(target.id);
    setFolderHistory((prev) => prev.slice(0, index + 1));
    setActiveQuickFilter("all");
    setSelectedItemIds([]);
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === displayedItems.length && displayedItems.length > 0) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(displayedItems.map((i) => i.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Star Toggle
  const handleToggleStar = async (item: FileItem) => {
    const nextStarred = !item.is_starred;
    setAllItems((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, is_starred: nextStarred } : f))
    );
    if (selectedFileForDetails?.id === item.id) {
      setSelectedFileForDetails((prev) => prev ? { ...prev, is_starred: nextStarred } : null);
    }
    await toggleStarFileAction(item.id, item.is_folder, workspaceId, !!item.is_starred);
  };

  // Delete Action
  const handleDeleteItem = async (item: FileItem) => {
    setAllItems((prev) => prev.filter((f) => f.id !== item.id));
    setSelectedItemIds((prev) => prev.filter((id) => id !== item.id));
    if (selectedFileForDetails?.id === item.id) {
      setSelectedFileForDetails(null);
    }
    setDeleteConfirmItem(null);
    await deleteFileItemAction(item.id, item.is_folder, workspaceId);
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    const itemsToDelete = allItems.filter((i) => selectedItemIds.includes(i.id));
    setAllItems((prev) => prev.filter((i) => !selectedItemIds.includes(i.id)));
    setSelectedItemIds([]);
    setBulkDeleteConfirmOpen(false);

    await bulkDeleteFilesAction(
      itemsToDelete.map((i) => ({ id: i.id, isFolder: i.is_folder })),
      workspaceId
    );
  };

  // Move single item
  const handleMoveSuccess = (id: string, destinationFolderId: string | null) => {
    setAllItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, folder_id: destinationFolderId } : i))
    );
    setMoveModalItem(null);
  };

  // Bulk Move
  const handleBulkMoveSuccess = (destinationFolderId: string | null) => {
    setAllItems((prev) =>
      prev.map((i) => (selectedItemIds.includes(i.id) ? { ...i, folder_id: destinationFolderId } : i))
    );
    setSelectedItemIds([]);
    setBulkMoveModalOpen(false);
  };

  // Download Trigger
  const handleDownload = (item: FileItem) => {
    if (!item.file_url) return;
    const link = document.createElement("a");
    link.href = item.file_url;
    link.download = item.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk Download
  const handleBulkDownload = () => {
    const filesToDownload = allItems.filter(
      (i) => selectedItemIds.includes(i.id) && !i.is_folder && i.file_url
    );
    filesToDownload.forEach((f) => handleDownload(f));
  };

  // All available folders for moving items
  const availableFolders = React.useMemo(() => {
    return allItems.filter((i) => i.is_folder && !i.is_trash);
  }, [allItems]);

  // Current folder name
  const currentFolderName = folderHistory[folderHistory.length - 1]?.name || "Files";

  return (
    <div className="min-h-full space-y-6 pb-16 bg-white">
      {/* ================================================== */}
      {/* HEADER: Title, Breadcrumbs, Action Buttons */}
      {/* ================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#D8DDD4] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-[#18221E]">
              Files
            </span>
            <span className="rounded-full bg-[#FAF9F5] px-2.5 py-0.5 text-xs font-semibold text-[#65706A] border border-[#D8DDD4]">
              {storageStats.totalFilesCount} files
            </span>
          </div>

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 text-xs text-[#65706A]">
            {folderHistory.map((crumb, idx) => (
              <React.Fragment key={crumb.id || "root"}>
                {idx > 0 && <ChevronRightIcon size={12} className="text-[#65706A]/60" />}
                <button
                  type="button"
                  onClick={() => handleNavigateBreadcrumb(idx)}
                  className={cn(
                    "hover:text-[#18221E] transition-colors",
                    idx === folderHistory.length - 1
                      ? "font-bold text-[#18221E]"
                      : "font-medium hover:underline"
                  )}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Action Buttons: New Folder, Upload */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setNewFolderModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] transition-colors shadow-2xs"
          >
            <PlusIcon size={14} />
            <span>New Folder</span>
          </button>

          <PrimaryButton
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="h-9 px-4 text-xs font-semibold"
          >
            <UploadIcon size={14} />
            <span>Upload</span>
          </PrimaryButton>
        </div>
      </div>

      {/* ================================================== */}
      {/* 5 TOP STAT CARDS (100% REAL METRICS) */}
      {/* ================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {/* Card 1: Total Files */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] text-[#10251F]">
            <PdfIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              TOTAL FILES
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {storageStats.totalFilesCount}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">Accessible files</span>
          </div>
        </div>

        {/* Card 2: Folders */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] text-[#D97706]">
            <FolderIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              FOLDERS
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {storageStats.totalFoldersCount}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">All folders</span>
          </div>
        </div>

        {/* Card 3: Total Size */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#EFF6FF] text-[#2563EB]">
            <StorageIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              TOTAL SIZE
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {formatBytes(storageStats.totalBytesUsed)}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">Used storage</span>
          </div>
        </div>

        {/* Card 4: Shared Files */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FAF5FF] text-[#7C3AED]">
            <UsersIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              SHARED FILES
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {storageStats.sharedFilesCount}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">Shared with others</span>
          </div>
        </div>

        {/* Card 5: Recently Added */}
        <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-[12px] border border-[#D8DDD4] bg-white p-3.5 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FEF2F2] text-[#DC2626]">
            <ClockIcon size={18} />
          </div>
          <div className="min-w-0 truncate">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              RECENTLY ADDED
            </span>
            <span className="text-lg font-bold text-[#18221E] leading-none block mt-0.5">
              {storageStats.recentlyAddedCount}
            </span>
            <span className="text-[10px] text-[#65706A] mt-0.5 block">In the last 7 days</span>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* MAIN FILE WORKSPACE (2 COLUMNS: ~75% / ~25%) */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FILE BROWSER (~75% on XL) */}
        <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
          {/* FILE BROWSER TOOLBAR */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[14px] border border-[#D8DDD4] bg-white p-3 shadow-2xs">
            {/* Left: Search input */}
            <div className="relative flex-1 max-w-sm">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65706A]"
              />
              <input
                type="text"
                placeholder="Search files and folders..."
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

            {/* Right: Type, Sort, View Toggle, Filter */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Type Select */}
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value as any)}
                className="h-8 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 text-xs font-semibold text-[#18221E] focus:outline-none cursor-pointer"
              >
                <option value="all">Type: All</option>
                <option value="folder">Folders</option>
                <option value="pdf">PDFs</option>
                <option value="figma">Figma Files</option>
                <option value="excel">Excel Files</option>
                <option value="word">Word Files</option>
                <option value="image">Images</option>
                <option value="archive">ZIP Archives</option>
              </select>

              {/* Sort Select */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2.5 text-xs font-semibold text-[#18221E] focus:outline-none cursor-pointer"
              >
                <option value="last_modified">Last Modified</option>
                <option value="name">Name A–Z</option>
                <option value="size">File Size</option>
              </select>

              {/* View Toggle (Grid / List) */}
              <div className="flex items-center rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-0.5 shadow-2xs">
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
              </div>

              {/* Filter Popover Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterPopoverOpen(!filterPopoverOpen)}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 rounded-[8px] border px-2.5 text-xs font-semibold transition-colors focus:outline-none",
                    selectedDeptId !== "all" || selectedProjId !== "all" || selectedUploaderId !== "all"
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
                          <span className="font-bold text-[#18221E]">Filter Files</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDeptId("all");
                              setSelectedProjId("all");
                              setSelectedUploaderId("all");
                              setSelectedFileType("all");
                            }}
                            className="text-[10px] font-semibold text-[#65706A] hover:text-[#18221E]"
                          >
                            Reset all
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

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                            Updated By
                          </label>
                          <select
                            value={selectedUploaderId}
                            onChange={(e) => setSelectedUploaderId(e.target.value)}
                            className="w-full rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] p-1.5 text-xs"
                          >
                            <option value="all">All People</option>
                            {people.map((p) => (
                              <option key={p.id} value={p.user_id || p.id}>
                                {p.full_name || p.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* QUICK ACCESS FILTER TABS */}
          <div className="flex items-center gap-2 border-b border-[#D8DDD4] pb-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveQuickFilter("all");
                setCurrentFolderId(null);
                setFolderHistory([{ id: null, name: "Files" }]);
              }}
              className={cn(
                "rounded-full px-3 py-1 font-semibold transition-colors",
                activeQuickFilter === "all"
                  ? "bg-[#10251F] text-[#F4F3EE]"
                  : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
              )}
            >
              All Files
            </button>

            <button
              type="button"
              onClick={() => setActiveQuickFilter("starred")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition-colors",
                activeQuickFilter === "starred"
                  ? "bg-[#10251F] text-[#F4F3EE]"
                  : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
              )}
            >
              <StarIcon size={13} filled={activeQuickFilter === "starred"} />
              <span>Starred</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveQuickFilter("shared")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition-colors",
                activeQuickFilter === "shared"
                  ? "bg-[#10251F] text-[#F4F3EE]"
                  : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
              )}
            >
              <ShareIcon size={13} />
              <span>Shared</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveQuickFilter("trash")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold transition-colors",
                activeQuickFilter === "trash"
                  ? "bg-[#10251F] text-[#F4F3EE]"
                  : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
              )}
            >
              <TrashIcon size={13} />
              <span>Trash</span>
            </button>
          </div>

          {/* MAIN FILE TABLE OR GRID */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
            {displayedItems.length === 0 ? (
              /* EMPTY STATE */
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F5] border border-[#D8DDD4] text-[#65706A]">
                  <FolderIcon size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#18221E]">
                    {searchQuery ? "No files match your search" : "This folder is empty"}
                  </h4>
                  <p className="text-xs text-[#65706A] max-w-sm">
                    {searchQuery
                      ? "Try searching for a different keyword or resetting your filters."
                      : "Upload files or create folders to organize your workspace assets."}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewFolderModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                  >
                    <PlusIcon size={13} />
                    <span>New Folder</span>
                  </button>
                  <PrimaryButton
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    className="h-8 px-3 text-xs"
                  >
                    <UploadIcon size={13} />
                    <span>Upload File</span>
                  </PrimaryButton>
                </div>
              </div>
            ) : viewMode === "list" ? (
              /* ==================== LIST VIEW (TABLE) ==================== */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#D8DDD4] bg-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            selectedItemIds.length === displayedItems.length &&
                            displayedItems.length > 0
                          }
                          onChange={handleToggleSelectAll}
                          className="h-3.5 w-3.5 rounded border-[#D8DDD4] text-[#10251F] focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Updated By</th>
                      <th className="px-4 py-3">Last Modified</th>
                      <th className="w-12 px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#D8DDD4]">
                    {displayedItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            if (item.is_folder) {
                              handleNavigateToFolder(item);
                            } else {
                              setSelectedFileForDetails(item);
                            }
                          }}
                          className={cn(
                            "group hover:bg-[#FAF9F5] transition-colors cursor-pointer",
                            isSelected && "bg-[#F4F3EE]/60"
                          )}
                        >
                          {/* Checkbox */}
                          <td
                            className="px-4 py-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectOne(item.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-3.5 w-3.5 rounded border-[#D8DDD4] text-[#10251F] focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Name + Icon + Star */}
                          <td className="px-4 py-3 font-semibold text-[#18221E]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4] text-[#10251F]">
                                {getFileIcon(item.file_type)}
                              </div>

                              <span className="truncate max-w-xs">{item.name}</span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStar(item);
                                }}
                                className={cn(
                                  "rounded p-0.5 transition-colors",
                                  item.is_starred
                                    ? "text-amber-500"
                                    : "text-transparent group-hover:text-[#65706A] hover:text-amber-500"
                                )}
                              >
                                <StarIcon size={13} filled={item.is_starred} />
                              </button>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3 text-[#65706A]">
                            {formatTypeLabel(item.file_type)}
                          </td>

                          {/* Size / Items */}
                          <td className="px-4 py-3 text-[#65706A]">
                            {item.is_folder
                              ? `${item.item_count || 0} items`
                              : formatBytes(item.file_size || 0)}
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3">
                            {item.department_name ? (
                              <span className="rounded-full bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#18221E] border border-[#D8DDD4]">
                                {item.department_name}
                              </span>
                            ) : (
                              <span className="text-[#65706A]">—</span>
                            )}
                          </td>

                          {/* Updated By */}
                          <td className="px-4 py-3 text-[#18221E]">
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-[#F4F3EE]">
                                {(item.uploader?.full_name || "T")[0]?.toUpperCase()}
                              </div>
                              <span className="truncate max-w-[100px]">
                                {item.uploader?.full_name || "Workspace Member"}
                              </span>
                            </div>
                          </td>

                          {/* Last Modified */}
                          <td className="px-4 py-3 text-[#65706A]">
                            {item.last_modified}
                          </td>

                          {/* Actions menu */}
                          <td
                            className="px-4 py-3 text-right relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionMenuId(
                                  openActionMenuId === item.id ? null : item.id
                                )
                              }
                              className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                            >
                              <MoreHorizontalIcon size={15} />
                            </button>

                            {openActionMenuId === item.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setOpenActionMenuId(null)}
                                />
                                <div className="absolute right-4 top-10 w-44 rounded-[10px] border border-[#D8DDD4] bg-white p-1.5 shadow-xl z-40 text-xs text-left space-y-0.5">
                                  {!item.is_folder && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          setPreviewModalFile(item);
                                        }}
                                        className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[#FAF9F5] text-[#18221E]"
                                      >
                                        <ExternalLinkIcon size={13} />
                                        <span>Preview</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleDownload(item);
                                        }}
                                        className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[#FAF9F5] text-[#18221E]"
                                      >
                                        <DownloadIcon size={13} />
                                        <span>Download</span>
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setShareModalItem(item);
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
                                      setMoveModalItem(item);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[#FAF9F5] text-[#18221E]"
                                  >
                                    <FolderIcon size={13} />
                                    <span>Move</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleToggleStar(item);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[#FAF9F5] text-[#18221E]"
                                  >
                                    <StarIcon size={13} filled={item.is_starred} />
                                    <span>{item.is_starred ? "Unstar" : "Star"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setRenameModalItem(item);
                                    }}
                                    className="w-full flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-[#FAF9F5] text-[#18221E]"
                                  >
                                    <EditIcon size={13} />
                                    <span>Rename</span>
                                  </button>
                                  <div className="my-1 border-t border-[#D8DDD4]" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setDeleteConfirmItem(item);
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
                {displayedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.is_folder) {
                        handleNavigateToFolder(item);
                      } else {
                        setSelectedFileForDetails(item);
                      }
                    }}
                    className="group relative rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-3.5 transition-all hover:bg-white hover:shadow-xs cursor-pointer flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white border border-[#D8DDD4] shadow-2xs">
                        {getFileIcon(item.file_type)}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(item);
                        }}
                        className="rounded p-1 text-[#65706A] hover:text-amber-500"
                      >
                        <StarIcon size={14} filled={item.is_starred} />
                      </button>
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-bold text-[#18221E] truncate group-hover:underline">
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#65706A]">
                        <span>
                          {item.is_folder
                            ? `${item.item_count || 0} items`
                            : formatBytes(item.file_size || 0)}
                        </span>
                        <span>{item.last_modified}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-[#D8DDD4] bg-[#FAF9F5] text-xs gap-3">
              <span className="text-[#65706A]">
                Showing 1 to {displayedItems.length} of {displayedItems.length} files
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
                  className="rounded-[6px] border border-[#D8DDD4] bg-white p-1.5 text-[#18221E] hover:bg-[#FAF9F5]"
                  disabled
                >
                  <ChevronRightIcon size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STORAGE OVERVIEW & QUICK ACCESS (~25% on XL) */}
        <div className="xl:col-span-4 2xl:col-span-3 space-y-5">
          {/* SECTION 1: STORAGE OVERVIEW (100% REAL DYNAMIC NUMBERS) */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D8DDD4]">
              <span className="text-xs font-bold text-[#18221E]">Storage Overview</span>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E]"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between text-xs">
                <div>
                  <span className="font-bold text-[#18221E] text-sm">
                    {formatBytes(storageStats.totalBytesUsed)}
                  </span>
                  <span className="text-[#65706A]">
                    {" "}of {formatBytes(storageStats.totalBytesCapacity)} used
                  </span>
                </div>
                <span className="font-bold text-[#246244]">
                  {(
                    (storageStats.totalBytesUsed / (storageStats.totalBytesCapacity || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-[#E7EADF] overflow-hidden">
                <div
                  className="h-full bg-[#246244] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0.5,
                        (storageStats.totalBytesUsed / (storageStats.totalBytesCapacity || 1)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>

              {/* Storage Breakdown Dots */}
              <div className="pt-2 border-t border-[#D8DDD4] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#246244]" />
                    <span className="text-[#65706A]">Files</span>
                  </div>
                  <span className="font-semibold text-[#18221E]">
                    {formatBytes(storageStats.breakdown.filesBytes)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                    <span className="text-[#65706A]">Documents</span>
                  </div>
                  <span className="font-semibold text-[#18221E]">
                    {formatBytes(storageStats.breakdown.documentsBytes)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                    <span className="text-[#65706A]">Images</span>
                  </div>
                  <span className="font-semibold text-[#18221E]">
                    {formatBytes(storageStats.breakdown.imagesBytes)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                    <span className="text-[#65706A]">Other</span>
                  </div>
                  <span className="font-semibold text-[#18221E]">
                    {formatBytes(storageStats.breakdown.otherBytes)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: RECENT ACTIVITY (REAL TIMELINE) */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D8DDD4]">
              <span className="text-xs font-bold text-[#18221E]">Recent Activity</span>
              <button
                type="button"
                onClick={() => setActivityModalOpen(true)}
                className="text-[11px] font-semibold text-[#65706A] hover:text-[#18221E]"
              >
                View all →
              </button>
            </div>

            <div className="space-y-3">
              {initialActivities.length === 0 ? (
                <p className="text-xs text-[#65706A] py-2 text-center">
                  No file activity recorded yet.
                </p>
              ) : (
                initialActivities.slice(0, 5).map((act, i) => (
                  <div key={act.id || i} className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4] text-[#10251F]">
                      <ClockIcon size={14} />
                    </div>
                    <div className="min-w-0 flex-1 truncate">
                      <p className="text-xs font-bold text-[#18221E] truncate">
                        {act.action}
                      </p>
                      <p className="text-[10px] text-[#65706A] truncate">
                        by {act.user_name} · {formatRelativeTime(act.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* FLOATING BULK ACTIONS TOOLBAR */}
      {/* ================================================== */}
      <AnimatePresence>
        {selectedItemIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-[12px] border border-[#10251F] bg-[#10251F] px-4 py-2.5 text-xs text-[#F4F3EE] shadow-2xl"
          >
            <span className="font-semibold bg-[#246244] px-2 py-0.5 rounded-full text-[11px]">
              {selectedItemIds.length} selected
            </span>

            <div className="h-4 w-px bg-white/20" />

            <button
              type="button"
              onClick={handleBulkDownload}
              className="inline-flex items-center gap-1.5 font-medium hover:text-[#C7F34A] transition-colors"
            >
              <DownloadIcon size={13} />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkMoveModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-medium hover:text-[#C7F34A] transition-colors"
            >
              <FolderIcon size={13} />
              <span>Move</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              <TrashIcon size={13} />
              <span>Delete</span>
            </button>

            <div className="h-4 w-px bg-white/20" />

            <button
              type="button"
              onClick={() => setSelectedItemIds([])}
              className="text-[#65706A] hover:text-[#F4F3EE]"
            >
              <XIcon size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================== */}
      {/* MODALS */}
      {/* ================================================== */}

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        workspaceId={workspaceId}
        currentFolderId={currentFolderId}
        projects={projects}
        departments={departments}
        onSuccess={(newFiles) => {
          setAllItems((prev) => [...newFiles, ...prev]);
          setUploadModalOpen(false);
        }}
      />

      {/* New Folder Modal */}
      <NewFolderModal
        isOpen={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
        workspaceId={workspaceId}
        currentFolderId={currentFolderId}
        projects={projects}
        departments={departments}
        onSuccess={(newFolder) => {
          setAllItems((prev) => [newFolder, ...prev]);
          setNewFolderModalOpen(false);
        }}
      />

      {/* File Details Drawer */}
      {selectedFileForDetails && (
        <FileDetailsDrawer
          file={selectedFileForDetails}
          onClose={() => setSelectedFileForDetails(null)}
          onPreview={() => {
            setPreviewModalFile(selectedFileForDetails);
            setSelectedFileForDetails(null);
          }}
          onShare={() => {
            setShareModalItem(selectedFileForDetails);
            setSelectedFileForDetails(null);
          }}
          onRename={() => {
            setRenameModalItem(selectedFileForDetails);
            setSelectedFileForDetails(null);
          }}
          onDelete={() => {
            setDeleteConfirmItem(selectedFileForDetails);
            setSelectedFileForDetails(null);
          }}
          onToggleStar={() => handleToggleStar(selectedFileForDetails)}
        />
      )}

      {/* File Preview Modal */}
      {previewModalFile && (
        <FilePreviewModal
          file={previewModalFile}
          onClose={() => setPreviewModalFile(null)}
          onDownload={() => handleDownload(previewModalFile)}
        />
      )}

      {/* Move Modal (Single) */}
      {moveModalItem && (
        <MoveItemModal
          item={moveModalItem}
          availableFolders={availableFolders}
          onClose={() => setMoveModalItem(null)}
          onSuccess={handleMoveSuccess}
          workspaceId={workspaceId}
        />
      )}

      {/* Move Modal (Bulk) */}
      {bulkMoveModalOpen && (
        <BulkMoveModal
          itemCount={selectedItemIds.length}
          availableFolders={availableFolders}
          onClose={() => setBulkMoveModalOpen(false)}
          onSuccess={handleBulkMoveSuccess}
          workspaceId={workspaceId}
          selectedIds={selectedItemIds}
        />
      )}

      {/* Share Modal */}
      {shareModalItem && (
        <ShareModal
          item={shareModalItem}
          onClose={() => setShareModalItem(null)}
          people={people}
          departments={departments}
          workspaceId={workspaceId}
          onSuccess={() => setShareModalItem(null)}
        />
      )}

      {/* Rename Modal */}
      {renameModalItem && (
        <RenameModal
          item={renameModalItem}
          onClose={() => setRenameModalItem(null)}
          workspaceId={workspaceId}
          onSuccess={(id, newName) => {
            setAllItems((prev) =>
              prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
            );
            setRenameModalItem(null);
          }}
        />
      )}

      {/* Single Delete Confirm Dialog */}
      {deleteConfirmItem && (
        <DeleteConfirmDialog
          item={deleteConfirmItem}
          onClose={() => setDeleteConfirmItem(null)}
          onConfirm={() => handleDeleteItem(deleteConfirmItem)}
        />
      )}

      {/* Bulk Delete Confirm Dialog */}
      {bulkDeleteConfirmOpen && (
        <BulkDeleteConfirmDialog
          count={selectedItemIds.length}
          onClose={() => setBulkDeleteConfirmOpen(false)}
          onConfirm={handleBulkDelete}
        />
      )}

      {/* Activity Timeline Modal */}
      {activityModalOpen && (
        <ActivityTimelineModal
          activities={initialActivities}
          onClose={() => setActivityModalOpen(false)}
        />
      )}
    </div>
  );
}

// =========================================================================
// HELPER FORMATTERS
// =========================================================================

function getFileIcon(type: FileType) {
  switch (type) {
    case "folder":
      return <FolderIcon size={16} className="text-[#D97706]" />;
    case "pdf":
      return <PdfIcon size={16} className="text-[#DC2626]" />;
    case "figma":
      return <FigmaIcon size={16} className="text-[#9333EA]" />;
    case "excel":
      return <ExcelIcon size={16} className="text-[#16A34A]" />;
    case "word":
      return <WordIcon size={16} className="text-[#2563EB]" />;
    case "image":
      return <ImageIcon size={16} className="text-[#EA580C]" />;
    case "archive":
      return <ArchiveIcon size={16} className="text-[#475569]" />;
    default:
      return <PdfIcon size={16} className="text-[#65706A]" />;
  }
}

function formatTypeLabel(type: FileType) {
  switch (type) {
    case "folder":
      return "Folder";
    case "pdf":
      return "PDF";
    case "figma":
      return "Figma";
    case "excel":
      return "Excel";
    case "word":
      return "Word";
    case "image":
      return "Image";
    case "archive":
      return "ZIP Archive";
    default:
      return "Document";
  }
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || "B"}`;
}

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
  });
}

// =========================================================================
// UPLOAD MODAL
// =========================================================================

function UploadModal({
  isOpen,
  onClose,
  workspaceId,
  currentFolderId,
  projects,
  departments,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentFolderId: string | null;
  projects: Project[];
  departments: Department[];
  onSuccess: (newFiles: FileItem[]) => void;
}) {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [departmentId, setDepartmentId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [accessLevel, setAccessLevel] = React.useState<FileAccessLevel>("company");
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(10);

    const selectedDept = departments.find((d) => d.id === departmentId);
    const selectedProj = projects.find((p) => p.id === projectId);

    try {
      const uploadedFileItems: FileItem[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split(".").pop()?.toLowerCase() || "file";
        let ftype: FileType = "other";
        if (ext === "pdf") ftype = "pdf";
        else if (ext === "fig") ftype = "figma";
        else if (["xlsx", "xls", "csv"].includes(ext)) ftype = "excel";
        else if (["docx", "doc"].includes(ext)) ftype = "word";
        else if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) ftype = "image";
        else if (["zip", "rar", "tar", "gz"].includes(ext)) ftype = "archive";

        // Upload to Cloudflare R2 / Local Storage
        const uploadResult = await uploadFileToR2(file, {
          folder: "files",
          workspaceId,
          onProgress: (percent) => {
            const overall = Math.round(((i + percent / 100) / selectedFiles.length) * 100);
            setUploadProgress(Math.max(10, overall));
          },
        });

        const fileUrl = uploadResult.success ? uploadResult.fileUrl : `/api/storage/${uploadResult.key}`;

        uploadedFileItems.push({
          id: `file-${Date.now()}-${i}`,
          workspace_id: workspaceId,
          folder_id: currentFolderId,
          is_folder: false,
          name: file.name,
          file_type: ftype,
          extension: ext,
          file_size: file.size,
          file_url: fileUrl,
          thumbnail_url: ftype === "image" ? fileUrl : null,
          department_id: departmentId || null,
          department_name: selectedDept?.name || null,
          project_id: projectId || null,
          project_name: selectedProj?.name || null,
          access_level: accessLevel,
          is_starred: false,
          is_trash: false,
          last_modified: "Just now",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      await uploadFilesAction(
        uploadedFileItems.map((f) => ({
          workspaceId,
          folderId: f.folder_id,
          name: f.name,
          fileType: f.file_type,
          fileSize: f.file_size || 0,
          fileUrl: f.file_url || "#",
          departmentId: f.department_id,
          projectId: f.project_id,
          accessLevel: f.access_level,
        }))
      );

      setUploadProgress(100);
      onSuccess(uploadedFileItems);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
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
            className="relative w-full max-w-lg rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
              <h3 className="text-base font-bold text-[#18221E]">Upload Files</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5]"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-6 text-center cursor-pointer hover:border-[#10251F] hover:bg-white transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7EADF] text-[#10251F] mb-2">
                  <UploadIcon size={18} />
                </div>
                <p className="text-xs font-bold text-[#18221E]">
                  Drag and drop files here, or <span className="text-[#246244] underline">browse</span>
                </p>
                <p className="text-[10px] text-[#65706A] mt-1">
                  Supports Images, PDF, Word, Excel, Figma, ZIP, and documents
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected Files Preview List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <PdfIcon size={14} className="text-[#10251F] shrink-0" />
                        <span className="font-semibold text-[#18221E] truncate">{file.name}</span>
                        <span className="text-[10px] text-[#65706A]">({formatBytes(file.size)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedFile(idx)}
                        className="text-[#65706A] hover:text-red-600 p-0.5"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-[#18221E]">
                    <span>Uploading files...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#E7EADF] overflow-hidden">
                    <div
                      className="h-full bg-[#246244] transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Tagging: Department, Project, Access */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
                  >
                    <option value="">None (Workspace-wide)</option>
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
                  onChange={(e) => setAccessLevel(e.target.value as FileAccessLevel)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
                >
                  <option value="company">Entire Company</option>
                  <option value="department">Department Members</option>
                  <option value="private">Private (Uploader Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DDD4]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || selectedFiles.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
                >
                  <span>{uploading ? "Uploading..." : "Upload Files"}</span>
                  <span className="text-[#C7F34A]">→</span>
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
// NEW FOLDER MODAL
// =========================================================================

function NewFolderModal({
  isOpen,
  onClose,
  workspaceId,
  currentFolderId,
  projects,
  departments,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentFolderId: string | null;
  projects: Project[];
  departments: Department[];
  onSuccess: (newFolder: FileItem) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [accessLevel, setAccessLevel] = React.useState<FileAccessLevel>("company");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const selectedDept = departments.find((d) => d.id === departmentId);
    const selectedProj = projects.find((p) => p.id === projectId);

    const newFolderItem: FileItem = {
      id: `folder-${Date.now()}`,
      workspace_id: workspaceId,
      folder_id: currentFolderId,
      is_folder: true,
      name: name.trim(),
      description: description.trim() || null,
      file_type: "folder",
      item_count: 0,
      department_id: departmentId || null,
      department_name: selectedDept?.name || null,
      project_id: projectId || null,
      project_name: selectedProj?.name || null,
      access_level: accessLevel,
      is_starred: false,
      is_trash: false,
      last_modified: "Just now",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await createFolderAction({
      workspaceId,
      name: name.trim(),
      description: description.trim() || undefined,
      parentFolderId: currentFolderId,
      departmentId: departmentId || undefined,
      projectId: projectId || undefined,
      accessLevel,
    });

    setLoading(false);
    onSuccess(newFolderItem);
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
            className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
              <h3 className="text-base font-bold text-[#18221E]">Create New Folder</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5]"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#18221E] mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Assets, Invoices, Contracts"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18221E] mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Folder contents or project tags"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  onChange={(e) => setAccessLevel(e.target.value as FileAccessLevel)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
                >
                  <option value="company">Entire Company</option>
                  <option value="department">Department Members</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DDD4]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-4 py-2 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
                >
                  <span>{loading ? "Creating..." : "Create Folder"}</span>
                  <span className="text-[#C7F34A]">→</span>
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
// FILE DETAILS DRAWER
// =========================================================================

function FileDetailsDrawer({
  file,
  onClose,
  onPreview,
  onShare,
  onRename,
  onDelete,
  onToggleStar,
}: {
  file: FileItem;
  onClose: () => void;
  onPreview: () => void;
  onShare: () => void;
  onRename: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#10251F]/40 backdrop-blur-xs"
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-md h-full bg-white border-l border-[#D8DDD4] p-6 shadow-2xl z-10 flex flex-col justify-between overflow-y-auto space-y-6"
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
            <span className="text-xs font-bold text-[#65706A] uppercase tracking-wider">
              {file.is_folder ? "Folder Details" : "File Details"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5]"
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* Preview Box */}
          <div className="flex flex-col items-center justify-center rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-6 text-center">
            {file.file_type === "image" && file.file_url ? (
              <img
                src={file.file_url}
                alt={file.name}
                className="max-h-36 max-w-full rounded-[8px] object-contain mb-3 shadow-xs"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-[12px] bg-white border border-[#D8DDD4] shadow-xs mb-3">
                {getFileIcon(file.file_type)}
              </div>
            )}
            <h3 className="text-sm font-bold text-[#18221E] break-all max-w-xs">
              {file.name}
            </h3>
            <span className="text-xs text-[#65706A] mt-1">
              {formatTypeLabel(file.file_type)}
              {!file.is_folder && ` · ${formatBytes(file.file_size || 0)}`}
            </span>
          </div>

          {/* Actions Bar */}
          <div className="grid grid-cols-4 gap-2">
            {!file.is_folder && (
              <button
                type="button"
                onClick={onPreview}
                className="flex flex-col items-center justify-center p-2 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-[11px] font-semibold text-[#18221E]"
              >
                <ExternalLinkIcon size={14} className="mb-1 text-[#10251F]" />
                <span>Preview</span>
              </button>
            )}

            <button
              type="button"
              onClick={onShare}
              className="flex flex-col items-center justify-center p-2 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-[11px] font-semibold text-[#18221E]"
            >
              <ShareIcon size={14} className="mb-1 text-[#10251F]" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={onToggleStar}
              className="flex flex-col items-center justify-center p-2 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-[11px] font-semibold text-[#18221E]"
            >
              <StarIcon size={14} filled={file.is_starred} className="mb-1 text-amber-500" />
              <span>{file.is_starred ? "Starred" : "Star"}</span>
            </button>

            <button
              type="button"
              onClick={onRename}
              className="flex flex-col items-center justify-center p-2 rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] hover:bg-white text-[11px] font-semibold text-[#18221E]"
            >
              <EditIcon size={14} className="mb-1 text-[#10251F]" />
              <span>Rename</span>
            </button>
          </div>

          {/* Metadata Table */}
          <div className="space-y-2.5 pt-3 border-t border-[#D8DDD4] text-xs">
            <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
              <span className="text-[#65706A]">Uploaded By</span>
              <span className="font-semibold text-[#18221E]">
                {file.uploader?.full_name || "Workspace Member"}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
              <span className="text-[#65706A]">Last Modified</span>
              <span className="font-semibold text-[#18221E]">{file.last_modified}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
              <span className="text-[#65706A]">Access Level</span>
              <span className="font-semibold text-[#18221E] capitalize">{file.access_level || "Company"}</span>
            </div>

            {file.department_name && (
              <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                <span className="text-[#65706A]">Department</span>
                <span className="font-semibold text-[#18221E]">{file.department_name}</span>
              </div>
            )}

            {file.project_name && (
              <div className="flex justify-between py-1 border-b border-[#FAF9F5]">
                <span className="text-[#65706A]">Related Project</span>
                <span className="font-semibold text-[#18221E]">{file.project_name}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {file.description && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                Description
              </span>
              <p className="rounded-[8px] bg-[#FAF9F5] p-2.5 text-xs text-[#18221E] border border-[#D8DDD4]">
                {file.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer Delete */}
        <div className="pt-4 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 rounded-[8px] border border-red-200 bg-red-50 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
          >
            <TrashIcon size={14} />
            <span>Delete {file.is_folder ? "Folder" : "File"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// FILE PREVIEW MODAL
// =========================================================================

function FilePreviewModal({
  file,
  onClose,
  onDownload,
}: {
  file: FileItem;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#10251F]/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-4xl max-h-[85vh] rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 flex flex-col space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#FAF9F5] border border-[#D8DDD4]">
              {getFileIcon(file.file_type)}
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-[#18221E] truncate">{file.name}</h3>
              <p className="text-[10px] text-[#65706A]">
                {formatTypeLabel(file.file_type)} · {formatBytes(file.file_size || 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#10251F] px-3 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
            >
              <DownloadIcon size={13} />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-[#65706A] hover:bg-[#FAF9F5]"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 min-h-[300px] flex items-center justify-center bg-[#FAF9F5] rounded-[12px] border border-[#D8DDD4] p-4 overflow-auto">
          {file.file_type === "image" && file.file_url ? (
            <img
              src={file.file_url}
              alt={file.name}
              className="max-h-[60vh] max-w-full rounded-[8px] object-contain shadow-xs"
            />
          ) : file.file_type === "pdf" && file.file_url ? (
            <iframe
              src={file.file_url}
              title={file.name}
              className="w-full h-[60vh] rounded-[8px] border border-[#D8DDD4]"
            />
          ) : (
            <div className="text-center space-y-3 p-8">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-[12px] bg-white border border-[#D8DDD4]">
                {getFileIcon(file.file_type)}
              </div>
              <div>
                <p className="text-xs font-bold text-[#18221E]">{file.name}</p>
                <p className="text-[11px] text-[#65706A] mt-1">
                  Preview not available in-browser for this format.
                </p>
              </div>
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
              >
                <DownloadIcon size={13} />
                <span>Download File</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// MOVE ITEM MODAL
// =========================================================================

function MoveItemModal({
  item,
  availableFolders,
  onClose,
  onSuccess,
  workspaceId,
}: {
  item: FileItem;
  availableFolders: FileItem[];
  onClose: () => void;
  onSuccess: (id: string, targetFolderId: string | null) => void;
  workspaceId: string;
}) {
  const [targetFolderId, setTargetFolderId] = React.useState<string | null>(null);
  const [moving, setMoving] = React.useState(false);

  const handleMove = async () => {
    setMoving(true);
    await moveItemAction(item.id, targetFolderId, item.is_folder, workspaceId);
    onSuccess(item.id, targetFolderId);
    setMoving(false);
  };

  const filteredFolders = availableFolders.filter((f) => f.id !== item.id);

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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-sm rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xl z-10 space-y-4"
      >
        <h4 className="text-sm font-bold text-[#18221E]">
          Move "{item.name}"
        </h4>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
            Select Destination Folder
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto border border-[#D8DDD4] rounded-[8px] p-2 bg-[#FAF9F5]">
            <button
              type="button"
              onClick={() => setTargetFolderId(null)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-[6px] text-xs font-semibold text-left transition-colors",
                targetFolderId === null ? "bg-[#10251F] text-[#F4F3EE]" : "hover:bg-white text-[#18221E]"
              )}
            >
              <FolderIcon size={14} />
              <span>Root (Files)</span>
            </button>

            {filteredFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTargetFolderId(f.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-[6px] text-xs font-semibold text-left transition-colors",
                  targetFolderId === f.id ? "bg-[#10251F] text-[#F4F3EE]" : "hover:bg-white text-[#18221E]"
                )}
              >
                <FolderIcon size={14} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={moving}
            className="rounded-[8px] bg-[#10251F] px-4 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
          >
            {moving ? "Moving..." : "Move Here"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// BULK MOVE MODAL
// =========================================================================

function BulkMoveModal({
  itemCount,
  availableFolders,
  onClose,
  onSuccess,
  workspaceId,
  selectedIds,
}: {
  itemCount: number;
  availableFolders: FileItem[];
  onClose: () => void;
  onSuccess: (targetFolderId: string | null) => void;
  workspaceId: string;
  selectedIds: string[];
}) {
  const [targetFolderId, setTargetFolderId] = React.useState<string | null>(null);
  const [moving, setMoving] = React.useState(false);

  const handleMove = async () => {
    setMoving(true);
    for (const id of selectedIds) {
      await moveItemAction(id, targetFolderId, false, workspaceId);
    }
    onSuccess(targetFolderId);
    setMoving(false);
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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-sm rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xl z-10 space-y-4"
      >
        <h4 className="text-sm font-bold text-[#18221E]">
          Move {itemCount} Items
        </h4>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
            Select Destination Folder
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto border border-[#D8DDD4] rounded-[8px] p-2 bg-[#FAF9F5]">
            <button
              type="button"
              onClick={() => setTargetFolderId(null)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-[6px] text-xs font-semibold text-left transition-colors",
                targetFolderId === null ? "bg-[#10251F] text-[#F4F3EE]" : "hover:bg-white text-[#18221E]"
              )}
            >
              <FolderIcon size={14} />
              <span>Root (Files)</span>
            </button>

            {availableFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTargetFolderId(f.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-[6px] text-xs font-semibold text-left transition-colors",
                  targetFolderId === f.id ? "bg-[#10251F] text-[#F4F3EE]" : "hover:bg-white text-[#18221E]"
                )}
              >
                <FolderIcon size={14} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={moving}
            className="rounded-[8px] bg-[#10251F] px-4 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
          >
            {moving ? "Moving..." : "Move Here"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// SHARE MODAL
// =========================================================================

function ShareModal({
  item,
  onClose,
  people,
  departments,
  workspaceId,
  onSuccess,
}: {
  item: FileItem;
  onClose: () => void;
  people: WorkspacePerson[];
  departments: Department[];
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [accessLevel, setAccessLevel] = React.useState<FileAccessLevel>(
    item.access_level || "company"
  );
  const [selectedPersonId, setSelectedPersonId] = React.useState("");
  const [permission, setPermission] = React.useState<FilePermission>("view");
  const [sharesList, setSharesList] = React.useState<
    { userId?: string; name: string; permission: FilePermission }[]
  >(
    (item.shares || []).map((s) => ({
      userId: s.user_id || undefined,
      name: s.user?.full_name || s.user?.email || "Team Member",
      permission: s.permission,
    }))
  );
  const [saving, setSaving] = React.useState(false);

  const handleAddShare = () => {
    if (!selectedPersonId) return;
    const person = people.find((p) => (p.user_id || p.id) === selectedPersonId);
    if (!person) return;

    setSharesList((prev) => [
      ...prev,
      {
        userId: person.user_id || person.id,
        name: person.full_name || person.email,
        permission,
      },
    ]);
    setSelectedPersonId("");
  };

  const handleRemoveShare = (idx: number) => {
    setSharesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveShares = async () => {
    setSaving(true);
    await shareFileItemAction({
      fileId: item.id,
      workspaceId,
      accessLevel,
      shares: sharesList.map((s) => ({
        userId: s.userId,
        permission: s.permission,
      })),
    });
    setSaving(false);
    onSuccess();
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
          <h3 className="text-base font-bold text-[#18221E]">Share & Permissions</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5]">
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#65706A]">
            Manage sharing settings for <span className="font-bold text-[#18221E]">{item.name}</span>
          </p>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#65706A] mb-1">
              General Access
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as FileAccessLevel)}
              className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none"
            >
              <option value="company">Entire Company (Anyone in workspace)</option>
              <option value="department">Department Members Only</option>
              <option value="private">Restricted (Only shared people)</option>
            </select>
          </div>

          {/* Add member input */}
          <div className="flex gap-2 pt-2">
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
              onChange={(e) => setPermission(e.target.value as FilePermission)}
              className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs text-[#18221E] focus:outline-none font-semibold"
            >
              <option value="view">Can view</option>
              <option value="edit">Can edit</option>
            </select>

            <button
              type="button"
              onClick={handleAddShare}
              className="rounded-[8px] bg-[#10251F] px-3 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
            >
              Add
            </button>
          </div>

          {/* Current access list */}
          <div className="space-y-2 pt-2 border-t border-[#D8DDD4]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
              Specific collaborators
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {sharesList.length === 0 ? (
                <p className="text-xs text-[#65706A] italic">No specific members added.</p>
              ) : (
                sharesList.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <UsersIcon size={14} className="text-[#10251F]" />
                      <span className="font-semibold text-[#18221E] truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-[#65706A]">{s.permission}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveShare(idx)}
                        className="text-[#65706A] hover:text-red-600"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

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
            onClick={handleSaveShares}
            disabled={saving}
            className="rounded-[8px] bg-[#10251F] px-4 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// RENAME MODAL
// =========================================================================

function RenameModal({
  item,
  onClose,
  workspaceId,
  onSuccess,
}: {
  item: FileItem;
  onClose: () => void;
  workspaceId: string;
  onSuccess: (id: string, newName: string) => void;
}) {
  const [newName, setNewName] = React.useState(item.name);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    await renameFileItemAction(item.id, newName.trim(), item.is_folder, workspaceId);
    onSuccess(item.id, newName.trim());
    setLoading(false);
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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-sm rounded-[16px] border border-[#D8DDD4] bg-white p-5 shadow-2xl z-10 space-y-4"
      >
        <h4 className="text-sm font-bold text-[#18221E]">
          Rename {item.is_folder ? "Folder" : "File"}
        </h4>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:bg-white focus:outline-none"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DDD4]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="rounded-[8px] bg-[#10251F] px-3.5 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// =========================================================================
// DELETE CONFIRM DIALOGS
// =========================================================================

function DeleteConfirmDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: FileItem;
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
        <h4 className="text-sm font-bold text-[#18221E]">
          Delete {item.is_folder ? "Folder" : "File"}
        </h4>
        <p className="text-xs text-[#65706A] leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-[#18221E]">"{item.name}"</span>?
          {item.is_folder && " All contained files and subfolders will also be removed."}
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

function BulkDeleteConfirmDialog({
  count,
  onClose,
  onConfirm,
}: {
  count: number;
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
        <h4 className="text-sm font-bold text-[#18221E]">
          Delete {count} Items
        </h4>
        <p className="text-xs text-[#65706A] leading-relaxed">
          Are you sure you want to delete these <span className="font-bold text-[#18221E]">{count} items</span>?
          This action will permanently delete all selected files and folders from the workspace.
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
            {deleting ? "Deleting..." : "Delete All"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =========================================================================
// ACTIVITY TIMELINE MODAL
// =========================================================================

function ActivityTimelineModal({
  activities,
  onClose,
}: {
  activities: FileActivity[];
  onClose: () => void;
}) {
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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xl z-10 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#D8DDD4]">
          <h3 className="text-base font-bold text-[#18221E]">File Activity Log</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#65706A] hover:bg-[#FAF9F5]">
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-xs text-[#65706A] py-6 text-center">
              No activity records found.
            </p>
          ) : (
            activities.map((act, i) => (
              <div
                key={act.id || i}
                className="flex items-start gap-3 p-2.5 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-white border border-[#D8DDD4] text-[#10251F]">
                  <ClockIcon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#18221E]">{act.action}</p>
                  <p className="text-[10px] text-[#65706A] mt-0.5">
                    by {act.user_name} · {formatRelativeTime(act.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-[#D8DDD4]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] bg-[#10251F] px-4 py-1.5 text-xs font-semibold text-[#F4F3EE] hover:bg-[#18342C]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Building2,
  Folder,
  Download,
  Share2,
  Star,
  Trash2,
  Edit,
  ExternalLink,
  Copy,
  Check,
  X,
  Clock,
  Shield,
  User,
  ChevronDown,
} from "lucide-react";
import { FileItem, FileType } from "@/types/files";
import { Department } from "@/types/department";
import { Project } from "@/types/project";
import { updateFileDepartmentAction } from "@/lib/files/actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/app/ui";
import {
  FolderIcon,
  PdfIcon,
  FigmaIcon,
  ExcelIcon,
  WordIcon,
  ImageIcon,
  ArchiveIcon,
} from "./file-icons";
import { cn } from "@/lib/utils";

export interface FileDetailsDrawerProps {
  file: FileItem | null;
  workspaceId: string;
  departments: Department[];
  projects: Project[];
  onClose: () => void;
  onPreview?: () => void;
  onShare?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onToggleStar?: () => void;
  onFileUpdated?: (updated: FileItem) => void;
}

function getFileIcon(type: FileType, size = 18) {
  switch (type) {
    case "folder":
      return <FolderIcon size={size} className="text-amber-500" />;
    case "pdf":
      return <PdfIcon size={size} className="text-rose-500" />;
    case "figma":
      return <FigmaIcon size={size} className="text-purple-500" />;
    case "excel":
      return <ExcelIcon size={size} className="text-emerald-600" />;
    case "word":
      return <WordIcon size={size} className="text-blue-600" />;
    case "image":
      return <ImageIcon size={size} className="text-amber-600" />;
    case "archive":
      return <ArchiveIcon size={size} className="text-slate-600" />;
    default:
      return <FileText className="text-ink-3" size={size} />;
  }
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatTypeLabel(type: FileType): string {
  switch (type) {
    case "folder":
      return "Folder";
    case "pdf":
      return "PDF Document";
    case "figma":
      return "Figma Design";
    case "excel":
      return "Spreadsheet";
    case "word":
      return "Word Document";
    case "image":
      return "Image";
    case "archive":
      return "ZIP Archive";
    default:
      return "Document";
  }
}

export function FileDetailsDrawer({
  file,
  workspaceId,
  departments = [],
  projects = [],
  onClose,
  onPreview,
  onShare,
  onRename,
  onDelete,
  onToggleStar,
  onFileUpdated,
}: FileDetailsDrawerProps) {
  const [currentFile, setCurrentFile] = React.useState<FileItem | null>(file);
  const [activeTab, setActiveTab] = React.useState<"overview" | "sharing" | "activity">("overview");

  // Sync state
  React.useEffect(() => {
    setCurrentFile(file);
  }, [file]);

  // Global Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && file) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [file, onClose]);

  if (!file || !currentFile) return null;

  const handleDepartmentChange = async (deptId: string | null) => {
    const selectedDept = departments.find((d) => d.id === deptId);
    const updated: FileItem = {
      ...currentFile,
      department_id: deptId,
      department_name: selectedDept?.name || null,
      department: selectedDept
        ? { id: selectedDept.id, name: selectedDept.name, color: selectedDept.color || "#246244", icon: selectedDept.icon || "building" }
        : null,
    };
    setCurrentFile(updated);
    onFileUpdated?.(updated);

    try {
      const res = await updateFileDepartmentAction(currentFile.id, deptId, currentFile.is_folder, workspaceId);
      if (res.success) {
        toast.success(`Department updated to ${selectedDept?.name || "None"}`);
      } else {
        toast.error(res.error || "Failed to update department");
      }
    } catch {
      toast.error("Failed to update department");
    }
  };

  const handleDownload = () => {
    if (!currentFile.file_url) {
      toast.error("No download link available for this file");
      return;
    }
    const link = document.createElement("a");
    link.href = currentFile.file_url;
    link.download = currentFile.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  };

  const handleCopyLink = () => {
    const url = currentFile.file_url || window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("File link copied to clipboard");
  };

  const currentDept = departments.find((d) => d.id === currentFile.department_id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop (Framer Motion fade) */}
        <motion.div
          key="file-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/25 backdrop-blur-xs cursor-pointer"
        />

        {/* Slide-over Drawer Panel (Spring physics like Framer) */}
        <motion.aside
          key="file-panel"
          initial={{ x: "100%", opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.6 }}
          transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
          className="relative z-10 w-full max-w-xl lg:max-w-2xl h-full bg-surface border-l border-hairline shadow-2xl flex flex-col text-ink font-sans overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-hairline flex items-center justify-between shrink-0 bg-surface">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle border border-hairline shadow-2xs">
                {getFileIcon(currentFile.file_type, 18)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-ink truncate max-w-xs sm:max-w-md">
                    {currentFile.name}
                  </h1>
                </div>
                <p className="text-xs text-ink-3 truncate">
                  {formatTypeLabel(currentFile.file_type)}
                  {!currentFile.is_folder && ` · ${formatBytes(currentFile.file_size || 0)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!currentFile.is_folder && currentFile.file_url && (
                <button
                  type="button"
                  onClick={onPreview || handleDownload}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-3 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
                  title="Open Preview"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-3 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
                title="Copy link"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onToggleStar}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface text-ink-3 hover:text-amber-500 hover:bg-hover transition-colors cursor-pointer"
                title={currentFile.is_starred ? "Unstar" : "Star"}
              >
                <Star
                  className={cn(
                    "h-3.5 w-3.5",
                    currentFile.is_starred ? "fill-amber-400 text-amber-500" : ""
                  )}
                />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 items-center gap-1 px-2.5 rounded-md text-ink-3 hover:text-ink hover:bg-hover transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
                <span className="text-[10px] text-ink-3 font-mono hidden sm:inline">ESC</span>
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-hairline">
            {/* Visual Preview Box */}
            <div className="p-6 bg-surface">
              {currentFile.file_type === "image" && currentFile.file_url ? (
                <div className="relative group rounded-xl border border-hairline bg-subtle/40 overflow-hidden flex items-center justify-center min-h-[220px] max-h-[320px]">
                  <img
                    src={currentFile.file_url}
                    alt={currentFile.name}
                    className="max-h-[300px] max-w-full object-contain p-2 rounded-lg"
                  />
                  <div className="absolute inset-0 bg-ink/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={currentFile.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md bg-white text-ink text-xs font-semibold shadow-card flex items-center gap-1.5 hover:bg-hover transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Full Resolution</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-subtle/30 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-hairline shadow-2xs mb-3 text-ink">
                    {getFileIcon(currentFile.file_type, 32)}
                  </div>
                  <h3 className="text-sm font-semibold text-ink break-all max-w-sm">
                    {currentFile.name}
                  </h3>
                  <p className="text-xs text-ink-3 mt-1">
                    {formatTypeLabel(currentFile.file_type)}
                    {!currentFile.is_folder && ` · ${formatBytes(currentFile.file_size || 0)}`}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Properties Strip */}
            <div className="px-6 py-4 bg-surface">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Department (Clickable inline dropdown) */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Building2 className="h-3 w-3" />
                    <span>Department</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-ink/80 transition-colors w-full text-left truncate cursor-pointer focus:outline-none"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: currentDept?.color || "#246244" }}
                        />
                        <span className="truncate">{currentFile.department_name || "Unassigned"}</span>
                        <ChevronDown className="h-2.5 w-2.5 text-ink-3 ml-auto shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel>Assign Department</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDepartmentChange(null)} className="cursor-pointer text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-ink-3 mr-2" />
                        <span>No department</span>
                        {!currentFile.department_id && <Check className="h-3 w-3 ml-auto text-ink shrink-0" />}
                      </DropdownMenuItem>
                      {departments.map((d) => (
                        <DropdownMenuItem
                          key={d.id}
                          onClick={() => handleDepartmentChange(d.id)}
                          className="flex items-center gap-2 cursor-pointer text-xs"
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: d.color || "#246244" }}
                          />
                          <span className="truncate">{d.name}</span>
                          {currentFile.department_id === d.id && <Check className="h-3 w-3 ml-auto text-ink shrink-0" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Size */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <FileText className="h-3 w-3" />
                    <span>Size</span>
                  </div>
                  <span className="text-xs font-semibold text-ink truncate block">
                    {currentFile.is_folder
                      ? `${currentFile.item_count || 0} items`
                      : formatBytes(currentFile.file_size || 0)}
                  </span>
                </div>

                {/* Uploaded By */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <User className="h-3 w-3" />
                    <span>Uploaded By</span>
                  </div>
                  <span className="text-xs font-semibold text-ink truncate block">
                    {currentFile.uploader?.full_name || "Workspace Member"}
                  </span>
                </div>

                {/* Access Level */}
                <div className="rounded-lg border border-hairline bg-subtle/50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <Shield className="h-3 w-3" />
                    <span>Access</span>
                  </div>
                  <span className="text-xs font-semibold text-ink capitalize truncate block">
                    {currentFile.access_level || "Company"}
                  </span>
                </div>
              </div>
            </div>

            {/* Framer-style Tab Bar */}
            <div className="px-6 border-b border-hairline flex items-center gap-6 text-xs font-medium h-11 shrink-0 bg-surface">
              {[
                { key: "overview", label: "Overview" },
                { key: "sharing", label: "Sharing" },
                { key: "activity", label: "Activity", count: currentFile.activities?.length || 0 },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as "overview" | "sharing" | "activity")}
                    className={cn(
                      "h-full relative flex items-center gap-1.5 transition-colors cursor-pointer",
                      isActive ? "text-ink font-semibold" : "text-ink-3 hover:text-ink"
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.2 text-[10px] font-medium",
                          isActive ? "bg-ink text-white" : "bg-subtle text-ink-2"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="active-file-tab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="px-6 py-5 bg-surface min-h-[220px]">
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-hairline bg-subtle/30 p-4 space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                      File Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-ink-3 block">File Name</span>
                        <span className="font-medium text-ink break-all block">
                          {currentFile.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-3 block">Last Modified</span>
                        <span className="font-medium text-ink block">
                          {currentFile.last_modified}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-3 block">File Type</span>
                        <span className="font-medium text-ink block">
                          {formatTypeLabel(currentFile.file_type)} ({currentFile.extension || "file"})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-3 block">Related Project</span>
                        <span className="font-medium text-ink block">
                          {currentFile.project_name || "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentFile.description && (
                    <div className="space-y-1.5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        Description
                      </h3>
                      <p className="text-xs text-ink leading-relaxed rounded-lg border border-hairline bg-subtle/30 p-3">
                        {currentFile.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SHARING */}
              {activeTab === "sharing" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-hairline bg-subtle/30 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-ink">Access Permission</h4>
                        <p className="text-[11px] text-ink-3">
                          {currentFile.access_level === "company"
                            ? "Everyone in this workspace can view and download this file."
                            : currentFile.access_level === "department"
                            ? "Members of the assigned department have access."
                            : "Restricted to specific shared users."}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase border border-hairline bg-surface text-ink capitalize">
                        {currentFile.access_level || "Company"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onShare}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-hairline bg-surface hover:bg-hover px-3 py-2 text-xs font-medium text-ink transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5 text-ink-3" />
                    <span>Manage Shared Members & Departments</span>
                  </button>
                </div>
              )}

              {/* TAB 3: ACTIVITY */}
              {activeTab === "activity" && (
                <div className="space-y-2">
                  {(!currentFile.activities || currentFile.activities.length === 0) ? (
                    <div className="p-6 rounded-lg border border-dashed border-hairline text-center text-xs text-ink-3 bg-subtle/20">
                      No recent activity recorded for this file yet.
                    </div>
                  ) : (
                    currentFile.activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-2.5 rounded-lg border border-hairline bg-subtle/30 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{act.action}</p>
                          <p className="text-[10px] text-ink-3 mt-0.5">By {act.user_name}</p>
                        </div>
                        <span className="text-[10px] text-ink-3 shrink-0" suppressHydrationWarning>
                          {act.created_at}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-hairline bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {!currentFile.is_folder && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-lg bg-ink px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-ink/90 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
              )}

              <button
                type="button"
                onClick={onRename}
                className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-hover transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Edit className="h-3.5 w-3.5 text-ink-3" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-rose-200 bg-surface px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Delete</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-hairline bg-surface px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-hover shadow-2xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}

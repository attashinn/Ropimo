"use client";

import * as React from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  Code2,
  File,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedFileItem {
  id: string;
  name: string;
  size: number; // bytes
  type?: string;
  progress?: number; // 0 - 100
  error?: string;
  file?: File;
}

export interface RopimoFileUploadProps {
  files?: UploadedFileItem[];
  onFilesChange?: (files: UploadedFileItem[]) => void;
  onUpload?: (files: File[]) => void;
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
  disabled?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(fileName: string, mimeType?: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(ext) || mimeType?.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-[#246244]" />;
  }
  if (["mp4", "mov", "webm", "avi"].includes(ext) || mimeType?.startsWith("video/")) {
    return <Film className="h-4 w-4 text-[#B58500]" />;
  }
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) {
    return <Archive className="h-4 w-4 text-[#65706A]" />;
  }
  if (["ts", "tsx", "js", "jsx", "json", "html", "css", "py"].includes(ext)) {
    return <Code2 className="h-4 w-4 text-[#1E40AF]" />;
  }
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
    return <FileText className="h-4 w-4 text-[#10251F]" />;
  }
  return <File className="h-4 w-4 text-[#65706A]" />;
}

export function RopimoFileUpload({
  files = [],
  onFilesChange,
  onUpload,
  accept,
  maxSizeMB = 25,
  maxFiles = 10,
  disabled = false,
  title = "Drop files here or click to browse",
  description = `Supports all major formats up to ${maxSizeMB}MB each`,
  className,
}: RopimoFileUploadProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const processFiles = (incomingFiles: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: UploadedFileItem[] = [];
    const rawFiles: File[] = [];

    const fileArray = Array.from(incomingFiles);

    if (files.length + fileArray.length > maxFiles) {
      setErrorMessage(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    for (const f of fileArray) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        setErrorMessage(`"${f.name}" exceeds the max file size of ${maxSizeMB}MB.`);
        continue;
      }

      validFiles.push({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: f.name,
        size: f.size,
        type: f.type,
        progress: 100,
        file: f,
      });
      rawFiles.push(f);
    }

    if (validFiles.length > 0) {
      onFilesChange?.([...files, ...validFiles]);
      onUpload?.(rawFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string) => {
    onFilesChange?.(files.filter((f) => f.id !== id));
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "group relative flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer select-none",
          isDragOver
            ? "border-[#10251F] bg-[#EAF4E2]/40 scale-[1.005]"
            : "border-[#D8DDD4] bg-[#FAFAF8] hover:border-[#B8C0B2] hover:bg-[#FAF9F5]",
          disabled && "opacity-50 pointer-events-none cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          disabled={disabled}
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#D8DDD4] bg-white text-[#10251F] shadow-2xs group-hover:scale-105 transition-transform">
          <Upload className="h-5 w-5" />
        </div>

        <p className="mt-3 text-xs sm:text-sm font-bold text-[#18221E] tracking-tight">
          {title}
        </p>

        <p className="mt-1 text-xs text-[#65706A] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-[8px] border border-[#F8CBC2] bg-[#FDECE8] p-2.5 text-xs text-[#D9383A]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
            Files ({files.length})
          </p>

          <div className="space-y-1.5">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-[10px] border border-[#D8DDD4] bg-white p-2.5 text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] shrink-0">
                    {getFileIcon(file.name, file.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#18221E] truncate max-w-[200px] sm:max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-[#65706A]">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.error ? (
                    <span className="text-[11px] text-[#D9383A]">{file.error}</span>
                  ) : file.progress !== undefined && file.progress < 100 ? (
                    <span className="text-[11px] font-mono text-[#65706A]">
                      {file.progress}%
                    </span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-[#246244]" />
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(file.id);
                    }}
                    className="rounded-[6px] p-1 text-[#8A958F] hover:bg-[#FAF9F5] hover:text-[#D9383A] transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

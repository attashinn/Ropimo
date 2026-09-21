"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  X,
  User,
  FileText,
  Loader2,
  AtSign,
  Users,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface AttachedFileItem {
  id: string;
  name: string;
  size: string;
  sizeInBytes?: number;
  type: string;
  url?: string;
  previewUrl?: string;
  isUploading?: boolean;
}

export interface MentionInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  members?: WorkspaceMember[];
  taggedMembers?: WorkspaceMember[];
  onTaggedMembersChange?: (members: WorkspaceMember[]) => void;
  attachedFiles?: AttachedFileItem[];
  onAttachedFilesChange?: (files: AttachedFileItem[]) => void;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type @ to mention teammates, attach files...",
  members = [],
  taggedMembers: externalTaggedMembers,
  onTaggedMembersChange,
  attachedFiles = [],
  onAttachedFilesChange,
  disabled = false,
  minHeight = "min-h-[80px]",
  className,
}: MentionInputProps) {
  const [localMembers, setLocalMembers] = React.useState<WorkspaceMember[]>(members);
  const [internalTaggedMembers, setInternalTaggedMembers] = React.useState<WorkspaceMember[]>([]);
  const [showMentionMenu, setShowMentionMenu] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionCursorIndex, setMentionCursorIndex] = React.useState<number | null>(null);
  const [selectedMentionIdx, setSelectedMentionIdx] = React.useState(0);

  const activeTaggedMembers = externalTaggedMembers ?? internalTaggedMembers;

  const setTagged = React.useCallback(
    (newTagged: WorkspaceMember[]) => {
      if (onTaggedMembersChange) {
        onTaggedMembersChange(newTagged);
      } else {
        setInternalTaggedMembers(newTagged);
      }
    },
    [onTaggedMembersChange]
  );

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // If members not provided, fetch from /api/workspace/members
  React.useEffect(() => {
    if (members && members.length > 0) {
      setLocalMembers(members);
      return;
    }

    let isMounted = true;
    fetch("/api/workspace/members")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.members) {
          setLocalMembers(data.members);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [members]);

  // Filter members based on query
  const filteredMembers = React.useMemo(() => {
    if (!mentionQuery) return localMembers;
    const q = mentionQuery.toLowerCase();
    return localMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q))
    );
  }, [localMembers, mentionQuery]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(text);

    // Look backward from cursor for @
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      // Valid mention query if no space or newline after @
      if (!/\s/.test(query)) {
        setMentionQuery(query);
        setMentionCursorIndex(lastAtIndex);
        setShowMentionMenu(true);
        setSelectedMentionIdx(0);
        return;
      }
    }

    setShowMentionMenu(false);
  };

  const handleSelectMember = (member: WorkspaceMember) => {
    // 1. Add to tagged teammates list if not already tagged
    const alreadyTagged = activeTaggedMembers.some(
      (m) => (m.id || m.user_id) === (member.id || member.user_id)
    );
    if (!alreadyTagged) {
      setTagged([...activeTaggedMembers, member]);
    }

    // 2. Clean out the typed "@query" from textarea so no plain text remains
    if (mentionCursorIndex !== null && textareaRef.current) {
      const beforeAt = value.slice(0, mentionCursorIndex);
      const cursorPos = textareaRef.current.selectionStart;
      const afterCursor = value.slice(cursorPos);
      const cleaned = (beforeAt + afterCursor).replace(/\s{2,}/g, " ");
      onChange(cleaned);
    }

    setShowMentionMenu(false);
    setMentionQuery("");
    setMentionCursorIndex(null);

    // Refocus the textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 15);
  };

  const handleRemoveTaggedMember = (memberId: string) => {
    setTagged(
      activeTaggedMembers.filter(
        (m) => (m.id || m.user_id) !== memberId
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIdx((prev) =>
          prev === 0 ? filteredMembers.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMember(filteredMembers[selectedMentionIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    // Backspace on empty text removes last tagged member
    if (e.key === "Backspace" && value === "" && activeTaggedMembers.length > 0) {
      setTagged(activeTaggedMembers.slice(0, -1));
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && onSubmit && !showMentionMenu) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = "";

    const newItems: AttachedFileItem[] = fileList.map((f) => {
      const isImg = f.type.startsWith("image/");
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        sizeInBytes: f.size,
        type: f.type || "Document",
        previewUrl: isImg ? URL.createObjectURL(f) : undefined,
        isUploading: true,
      };
    });

    let currentList = [...attachedFiles, ...newItems];
    onAttachedFilesChange?.(currentList);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const targetId = newItems[i].id;

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "attachments");
        formData.append("workspaceId", "default");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          currentList = currentList.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  url: data.fileUrl || data.url,
                  sizeInBytes: data.size || file.size,
                  isUploading: false,
                }
              : item
          );
        } else {
          currentList = currentList.map((item) =>
            item.id === targetId ? { ...item, isUploading: false } : item
          );
        }
      } catch (err) {
        console.error("Upload failed:", err);
        currentList = currentList.map((item) =>
          item.id === targetId ? { ...item, isUploading: false } : item
        );
      }
      onAttachedFilesChange?.(currentList);
    }
  };

  const handleRemoveFile = (id: string) => {
    onAttachedFilesChange?.(attachedFiles.filter((f) => f.id !== id));
  };

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-[#E7E5E0] bg-white transition-all focus-within:border-[#10251F]/40 focus-within:ring-2 focus-within:ring-[#10251F]/5 shadow-xs",
        className
      )}
    >
      {/* Top Active Badges Row (Tagged Teammates & Attached Files) */}
      {(activeTaggedMembers.length > 0 || attachedFiles.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 p-3 pb-1 border-b border-[#F4F3EF] bg-[#FCFBF8] rounded-t-2xl">
          {/* Dynamic SaaS Profile Pills */}
          <AnimatePresence>
            {activeTaggedMembers.map((member) => {
              const id = member.id || member.user_id;
              const initial = member.name ? member.name.charAt(0).toUpperCase() : "?";
              return (
                <motion.div
                  key={id}
                  layout
                  initial={{ scale: 0.7, opacity: 0, y: -4 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", stiffness: 450, damping: 26 }}
                  className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-[#10251F] text-white border border-[#23453a] shadow-xs hover:border-[#C7F34A]/50 transition-all group select-none"
                >
                  {/* Profile Avatar / Initial */}
                  <div className="w-5 h-5 rounded-full bg-[#C7F34A] text-[#10251F] flex items-center justify-center font-extrabold text-[10px] ring-1 ring-white/20 shrink-0 shadow-2xs">
                    {initial}
                  </div>

                  {/* Profile Name */}
                  <span className="font-semibold text-xs text-white tracking-tight">
                    {member.name}
                  </span>

                  {/* Role Badge */}
                  {member.role && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-white/15 text-white/90 font-mono">
                      {member.role}
                    </span>
                  )}

                  {/* Online dot indicator */}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveTaggedMember(id)}
                    className="text-white/60 hover:text-[#C7F34A] hover:bg-white/10 rounded-full p-0.5 transition-colors cursor-pointer ml-0.5"
                    title={`Remove @${member.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Attached Files Chips */}
          <AnimatePresence>
            {attachedFiles.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E7E5E0] text-xs font-medium text-[#10251F] shadow-2xs"
              >
                {file.isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                ) : file.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="w-4 h-4 rounded object-cover border border-slate-200"
                  />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#525B58]" />
                )}
                <span className="truncate max-w-[130px]">{file.name}</span>
                <span className="text-[10px] text-[#88908D]">
                  {file.isUploading ? "Uploading..." : `(${file.size})`}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="text-[#88908D] hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Main Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full bg-transparent p-3 text-xs sm:text-[13px] text-[#10251F] placeholder:text-[#88908D] focus:outline-none resize-none leading-relaxed",
          minHeight
        )}
      />

      {/* Mention Auto-Complete Floating Menu */}
      <AnimatePresence>
        {showMentionMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className="absolute bottom-full left-3 mb-2 z-50 w-76 max-h-64 overflow-y-auto rounded-2xl border border-[#E7E5E0] bg-white shadow-2xl p-1.5"
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#F4F3EF] mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#88908D] flex items-center gap-1.5">
                <Users className="w-3 h-3 text-[#10251F]" />
                Mention Teammate ({filteredMembers.length})
              </span>
              <span className="text-[10px] text-[#88908D] font-mono">
                Tab or Enter
              </span>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="px-3 py-4 text-xs text-[#88908D] text-center">
                No teammates matching &ldquo;{mentionQuery}&rdquo;
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member, idx) => {
                  const isSelected = idx === selectedMentionIdx;
                  const isAlreadyTagged = activeTaggedMembers.some(
                    (m) => (m.id || m.user_id) === (member.id || member.user_id)
                  );
                  return (
                    <button
                      key={member.user_id || member.id}
                      type="button"
                      onClick={() => handleSelectMember(member)}
                      onMouseEnter={() => setSelectedMentionIdx(idx)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all cursor-pointer group",
                        isSelected
                          ? "bg-[#10251F] text-white shadow-xs"
                          : "hover:bg-[#FAF9F5] text-[#10251F]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors shadow-2xs",
                            isSelected
                              ? "bg-[#C7F34A] text-[#10251F]"
                              : "bg-[#E7E5E0] text-[#10251F] group-hover:bg-[#10251F] group-hover:text-[#C7F34A]"
                          )}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate leading-tight">
                            {member.name}
                          </div>
                          {member.email && (
                            <div
                              className={cn(
                                "text-[10px] truncate leading-tight",
                                isSelected ? "text-white/60" : "text-[#88908D]"
                              )}
                            >
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isAlreadyTagged && (
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                              isSelected
                                ? "bg-white/20 text-[#C7F34A]"
                                : "bg-emerald-100 text-emerald-800"
                            )}
                          >
                            Tagged
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider font-mono",
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-neutral-100 text-[#525B58]"
                          )}
                        >
                          {member.role}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[#F4F3EF] bg-[#FAF9F5] rounded-b-2xl text-xs text-[#525B58]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white hover:text-[#10251F] hover:shadow-2xs text-[#525B58] transition-all cursor-pointer text-xs font-medium"
            title="Attach documents, images, or deliverables"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attach</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const cursorPos = textareaRef.current?.selectionStart ?? value.length;
              setMentionCursorIndex(cursorPos);
              setShowMentionMenu((prev) => !prev);
              textareaRef.current?.focus();
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-medium",
              showMentionMenu
                ? "bg-[#10251F] text-[#C7F34A] shadow-xs"
                : "hover:bg-white hover:text-[#10251F] hover:shadow-2xs text-[#525B58]"
            )}
            title="Mention and assign teammate"
          >
            <AtSign className="w-3.5 h-3.5" />
            <span>Mention</span>
          </button>
        </div>

        <div className="text-[11px] text-[#88908D] flex items-center gap-2">
          {activeTaggedMembers.length > 0 && (
            <span className="text-emerald-700 font-medium">
              {activeTaggedMembers.length} teammate{activeTaggedMembers.length > 1 ? "s" : ""} tagged
            </span>
          )}
          <span>
            Tip: type <kbd className="font-mono font-bold text-[#10251F] bg-white px-1 py-0.2 rounded border border-[#E7E5E0]">@</kbd> to assign
          </span>
        </div>
      </div>
    </div>
  );
}

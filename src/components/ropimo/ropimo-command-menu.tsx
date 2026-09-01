"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Building2,
  Users,
  Clock3,
  Calendar,
  FileText,
  Folder,
  Settings,
  Plus,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  keywords?: string[];
}

export interface CommandGroup {
  id: string;
  title: string;
  items: CommandItem[];
}

export interface RopimoCommandMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  groups?: CommandGroup[];
  workspaceId?: string;
  placeholder?: string;
  className?: string;
}

export function RopimoCommandMenu({
  open: controlledOpen,
  onOpenChange,
  groups,
  workspaceId,
  placeholder = "Type a command or search...",
  className,
}: RopimoCommandMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus on open
  React.useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Default system commands if none provided
  const defaultGroups: CommandGroup[] = React.useMemo(() => {
    if (groups) return groups;

    const base = workspaceId ? `/app/${workspaceId}` : "/app";

    return [
      {
        id: "navigation",
        title: "Navigation",
        items: [
          {
            id: "nav-overview",
            title: "Overview Dashboard",
            subtitle: "Main workspace hub",
            icon: <LayoutDashboard className="h-4 w-4" />,
            shortcut: "G O",
            onSelect: () => router.push(base),
          },
          {
            id: "nav-projects",
            title: "Projects Directory",
            subtitle: "All team projects and deliverables",
            icon: <FolderKanban className="h-4 w-4" />,
            shortcut: "G P",
            onSelect: () => router.push(`${base}/projects`),
          },
          {
            id: "nav-departments",
            title: "Departments",
            subtitle: "Squads and departmental hubs",
            icon: <Building2 className="h-4 w-4" />,
            shortcut: "G D",
            onSelect: () => router.push(`${base}/departments`),
          },
          {
            id: "nav-people",
            title: "People & Directory",
            subtitle: "Team members and roles",
            icon: <Users className="h-4 w-4" />,
            shortcut: "G T",
            onSelect: () => router.push(`${base}/people`),
          },
          {
            id: "nav-attendance",
            title: "Attendance & Time",
            subtitle: "Daily check-ins and logs",
            icon: <Clock3 className="h-4 w-4" />,
            shortcut: "G A",
            onSelect: () => router.push(`${base}/attendance`),
          },
          {
            id: "nav-calendar",
            title: "Calendar & Schedule",
            subtitle: "Deadlines, leaves, and events",
            icon: <Calendar className="h-4 w-4" />,
            shortcut: "G C",
            onSelect: () => router.push(`${base}/calendar`),
          },
          {
            id: "nav-documents",
            title: "Documents",
            subtitle: "Company docs and notes",
            icon: <FileText className="h-4 w-4" />,
            onSelect: () => router.push(`${base}/documents`),
          },
          {
            id: "nav-files",
            title: "Files & Storage",
            subtitle: "Uploaded assets and deliverables",
            icon: <Folder className="h-4 w-4" />,
            onSelect: () => router.push(`${base}/files`),
          },
          {
            id: "nav-settings",
            title: "Workspace Settings",
            subtitle: "Preferences and integrations",
            icon: <Settings className="h-4 w-4" />,
            shortcut: "G S",
            onSelect: () => router.push(`${base}/settings`),
          },
        ],
      },
      {
        id: "actions",
        title: "Quick Actions",
        items: [
          {
            id: "act-new-project",
            title: "Create New Project",
            subtitle: "Start a new team initiative",
            icon: <Plus className="h-4 w-4" />,
            shortcut: "C P",
            onSelect: () => router.push(`${base}/projects?create=true`),
          },
          {
            id: "act-new-task",
            title: "Create New Task",
            subtitle: "Add a task or deliverable",
            icon: <Plus className="h-4 w-4" />,
            shortcut: "C T",
            onSelect: () => router.push(`${base}/tasks?create=true`),
          },
        ],
      },
    ];
  }, [groups, workspaceId, router]);

  // Filter items
  const filteredGroups = React.useMemo(() => {
    if (!search.trim()) return defaultGroups;
    const q = search.toLowerCase();

    return defaultGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchSub = item.subtitle?.toLowerCase().includes(q);
          const matchKw = item.keywords?.some((k) => k.toLowerCase().includes(q));
          return matchTitle || matchSub || matchKw;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [defaultGroups, search]);

  const flatItems = React.useMemo(() => {
    return filteredGroups.flatMap((g) => g.items);
  }, [filteredGroups]);

  // Keyboard navigation inside menu
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % (flatItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = flatItems[selectedIndex];
      if (selected) {
        selected.onSelect();
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-[#10251F]/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-[16px] border border-[#D8DDD4] bg-white shadow-elevated animate-in zoom-in-95 duration-150",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative flex items-center border-b border-[#D8DDD4] px-4 py-3 bg-[#FAF9F5]">
          <Search className="h-4 w-4 text-[#65706A] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-[#18221E] placeholder:text-[#8A958F] focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="p-1 text-[#8A958F] hover:text-[#18221E] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center rounded border border-[#D8DDD4] bg-white px-1.5 py-0.5 text-[10px] font-mono text-[#65706A]">
              ESC
            </kbd>
          )}
        </div>

        {/* Command Items List */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-3">
          {flatItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#65706A]">
              No matching commands or pages found.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const globalIdx = flatItems.findIndex((fi) => fi.id === item.id);
                  const isSelected = globalIdx === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        item.onSelect();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-xs transition-colors text-left group",
                        isSelected
                          ? "bg-[#10251F] text-white"
                          : "text-[#18221E] hover:bg-[#FAF9F5]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-[6px] border shrink-0 transition-colors",
                            isSelected
                              ? "border-[#25463C] bg-[#18342C] text-[#C7F34A]"
                              : "border-[#D8DDD4] bg-[#F4F3EE] text-[#10251F]"
                          )}
                        >
                          {item.icon || <ArrowRight className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-semibold truncate leading-tight">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p
                              className={cn(
                                "text-[11px] truncate",
                                isSelected ? "text-[#D8DDD4]" : "text-[#65706A]"
                              )}
                            >
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.shortcut && (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <kbd
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[10px] font-mono",
                              isSelected
                                ? "border-[#25463C] bg-[#18342C] text-[#C7F34A]"
                                : "border-[#D8DDD4] bg-[#FAF9F5] text-[#65706A]"
                            )}
                          >
                            {item.shortcut}
                          </kbd>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="flex items-center justify-between border-t border-[#D8DDD4] bg-[#FAF9F5] px-4 py-2 text-[11px] text-[#65706A]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#D8DDD4] bg-white px-1 font-mono">↑</kbd>
              <kbd className="rounded border border-[#D8DDD4] bg-white px-1 font-mono">↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-[#D8DDD4] bg-white px-1.5 font-mono">↵</kbd>
              select
            </span>
          </div>
          <div>
            <span className="font-semibold text-[#10251F]">Ropimo</span> Command
          </div>
        </div>
      </div>
    </div>
  );
}

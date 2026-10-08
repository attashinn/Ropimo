"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  Plus,
  FolderKanban,
  Video,
  Briefcase,
  Upload,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Folder,
  Users,
  Building2,
  Clock3,
  CalendarDays,
  Settings,
  MessageSquare,
  Clock,
  ArrowRight,
  User,
  FileText,
} from "lucide-react";
import { searchWorkspaceAction, WorkspaceSearchResults } from "@/lib/workspace/search";
import { CreateTaskModal } from "@/components/app/create-task-modal";
import { CreateProjectModal } from "@/components/app/create-project-modal";
import { AICopilotDrawer } from "@/components/app/ai/ai-copilot-drawer";

export interface RopimoCommandMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  workspaceId?: string;
  workspaceName?: string;
  userName?: string;
}

interface RecentItem {
  id: string;
  title: string;
  type: "page" | "task" | "project";
  href: string;
}

const DEFAULT_RECENT: RecentItem[] = [
  { id: "rec-1", title: "Overview", type: "page", href: "/app" },
  { id: "rec-2", title: "Tasks", type: "page", href: "/app/my-tasks" },
  { id: "rec-3", title: "Projects", type: "page", href: "/app/projects" },
];

export function RopimoCommandMenu({
  open: controlledOpen,
  onOpenChange,
  workspaceId = "",
  workspaceName = "Workspace",
  userName = "User",
}: RopimoCommandMenuProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setIsOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const [search, setSearch] = React.useState("");
  const [dbResults, setDbResults] = React.useState<WorkspaceSearchResults>({
    tasks: [],
    projects: [],
    people: [],
    files: [],
  });
  const [isSearching, setIsSearching] = React.useState(false);

  // Modals & Side Panels
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = React.useState(false);

  // Debounced database search
  React.useEffect(() => {
    if (!search.trim() || !workspaceId) {
      setDbResults({ tasks: [], projects: [], people: [], files: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await searchWorkspaceAction(workspaceId, search.trim());
        setDbResults(res);
      } catch (err) {
        console.error("Command palette search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [search, workspaceId]);

  // Global Keyboard Shortcuts:
  // - Cmd+K / Ctrl+K: open/close palette
  // - /: focus search (open palette)
  // - C: new task
  // - G then O: overview
  // - G then T: tasks
  React.useEffect(() => {
    let gPressedTimeout: NodeJS.Timeout | null = null;
    let isGPressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
        return;
      }

      // If open, handle escape
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // If focused inside an input or dialog, do not trigger single key or sequence shortcuts
      if (isInput || isOpen) return;

      // '/' shortcut to focus search
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // 'c' or 'C' shortcut to trigger New Task
      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !isGPressed) {
        e.preventDefault();
        setCreateTaskOpen(true);
        return;
      }

      // 'g' or 'G' sequence
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
        isGPressed = true;
        if (gPressedTimeout) clearTimeout(gPressedTimeout);
        gPressedTimeout = setTimeout(() => {
          isGPressed = false;
        }, 1000);
        return;
      }

      if (isGPressed) {
        if (e.key.toLowerCase() === "o") {
          e.preventDefault();
          isGPressed = false;
          if (gPressedTimeout) clearTimeout(gPressedTimeout);
          router.push("/app");
          return;
        }
        if (e.key.toLowerCase() === "t") {
          e.preventDefault();
          isGPressed = false;
          if (gPressedTimeout) clearTimeout(gPressedTimeout);
          router.push("/app/my-tasks");
          return;
        }
        // Any other key cancels the sequence
        isGPressed = false;
        if (gPressedTimeout) clearTimeout(gPressedTimeout);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gPressedTimeout) clearTimeout(gPressedTimeout);
    };
  }, [isOpen, router, setIsOpen]);

  // Navigation helper
  const navigateTo = (href: string) => {
    setIsOpen(false);
    setSearch("");
    router.push(href);
  };

  const handleOpenAction = (action: "task" | "project" | "meeting" | "candidate" | "file") => {
    setIsOpen(false);
    setSearch("");
    switch (action) {
      case "task":
        setCreateTaskOpen(true);
        break;
      case "project":
        setCreateProjectOpen(true);
        break;
      case "meeting":
        router.push("/app/calendar");
        break;
      case "candidate":
        router.push("/app/people");
        break;
      case "file":
        router.push("/app/files");
        break;
    }
  };

  const handleAskAI = () => {
    setIsOpen(false);
    setSearch("");
    setAiDrawerOpen(true);
  };

  if (!isOpen) {
    return (
      <>
        {/* Modals rendered even when command menu closed */}
        <CreateTaskModal
          isOpen={createTaskOpen}
          onClose={() => setCreateTaskOpen(false)}
          workspaceId={workspaceId}
          people={[]}
          projects={[]}
          departments={[]}
          onSuccess={() => {
            setCreateTaskOpen(false);
            router.refresh();
          }}
        />

        <CreateProjectModal
          isOpen={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          workspaceId={workspaceId}
          onSuccess={() => {
            setCreateProjectOpen(false);
            router.refresh();
          }}
        />

        <AICopilotDrawer
          open={aiDrawerOpen}
          onClose={() => setAiDrawerOpen(false)}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          userName={userName}
        />
      </>
    );
  }

  return (
    <>
      {/* Centered at top 15vh with backdrop */}
      <div className="fixed inset-0 z-50 flex justify-center items-start pt-[15vh] px-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/25 transition-opacity duration-120"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        {/* 12px radius, max-w-xl command palette */}
        <Command
          className="app-root relative z-50 w-full max-w-xl rounded-[12px] border border-hairline bg-surface bg-white text-ink shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden duration-120 animate-in fade-in-0 zoom-in-95 select-none outline-none"
          loop
        >
          {/* Input at the top with NO border */}
          <div className="flex items-center px-3.5 border-b border-hairline bg-surface">
            <Search className="h-4 w-4 stroke-[1.5] text-ink-3 mr-2.5 shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="w-full h-12 bg-transparent text-[13px] text-ink placeholder:text-ink-3 outline-none border-none focus:outline-none focus:ring-0"
              autoFocus
            />
          </div>

          {/* Results list */}
          <Command.List className="max-h-[380px] overflow-y-auto p-1.5 space-y-1 outline-none">
            {/* Empty fallback */}
            <Command.Empty className="px-3 py-6 text-center text-[13px] text-ink-3">
              No direct matches found.
            </Command.Empty>

            {/* Group 1: Actions */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
            >
              <Command.Item
                onSelect={() => handleOpenAction("task")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Plus className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">New task</span>
                <span className="ml-auto pl-3 font-mono text-[10px] text-ink-3">
                  C
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleOpenAction("project")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <FolderKanban className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">New project</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleOpenAction("meeting")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Video className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Schedule meeting</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleOpenAction("candidate")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Briefcase className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Add candidate</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleOpenAction("file")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Upload className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Upload file</span>
              </Command.Item>
            </Command.Group>

            {/* Database Search Results (Tasks) */}
            {dbResults.tasks.length > 0 && (
              <Command.Group
                heading="Tasks"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
              >
                {dbResults.tasks.map((task) => (
                  <Command.Item
                    key={task.id}
                    onSelect={() => navigateTo("/app/my-tasks")}
                    className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
                  >
                    <CheckSquare className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                    <span className="truncate">{task.title}</span>
                    <span className="ml-auto pl-3 text-[11px] text-ink-3 capitalize">
                      {task.status.replace("_", " ")}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Database Search Results (Projects) */}
            {dbResults.projects.length > 0 && (
              <Command.Group
                heading="Projects"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
              >
                {dbResults.projects.map((proj) => (
                  <Command.Item
                    key={proj.id}
                    onSelect={() => navigateTo(`/app/projects/${proj.id}`)}
                    className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
                  >
                    <span
                      className="h-2 w-2 rounded-full mr-2.5 shrink-0"
                      style={{ backgroundColor: proj.color || "#3B63F0" }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Database Search Results (People) */}
            {dbResults.people.length > 0 && (
              <Command.Group
                heading="People"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
              >
                {dbResults.people.map((person) => (
                  <Command.Item
                    key={person.id}
                    onSelect={() => navigateTo("/app/people")}
                    className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
                  >
                    <User className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                    <span className="truncate">{person.fullName}</span>
                    {person.jobTitle && (
                      <span className="ml-auto pl-3 text-[11px] text-ink-3 truncate">
                        {person.jobTitle}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Database Search Results (Files) */}
            {dbResults.files.length > 0 && (
              <Command.Group
                heading="Files"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
              >
                {dbResults.files.map((file) => (
                  <Command.Item
                    key={file.id}
                    onSelect={() => navigateTo("/app/files")}
                    className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
                  >
                    <FileText className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Group 2: Go to (Every page) */}
            <Command.Group
              heading="Go to"
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
            >
              <Command.Item
                onSelect={() => navigateTo("/app")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <LayoutDashboard className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Overview</span>
                <span className="ml-auto pl-3 font-mono text-[10px] text-ink-3">
                  G O
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/my-tasks")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <CheckSquare className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Tasks</span>
                <span className="ml-auto pl-3 font-mono text-[10px] text-ink-3">
                  G T
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/projects")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <FolderKanban className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Projects</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/calendar")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Calendar className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Calendar</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/meetings")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Video className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Meetings</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/hiring")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Briefcase className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Hiring</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/files")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Folder className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Files</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/people")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Users className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">People</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/departments")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Building2 className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Departments</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/attendance")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Clock3 className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Attendance</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/leave")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <CalendarDays className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Leave</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/app/settings")}
                className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <Settings className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate">Settings</span>
              </Command.Item>
            </Command.Group>

            {/* Group 3: Recent (when no search query) */}
            {!search && (
              <Command.Group
                heading="Recent"
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
              >
                {DEFAULT_RECENT.map((rec) => (
                  <Command.Item
                    key={rec.id}
                    onSelect={() => navigateTo(rec.href)}
                    className="relative flex h-[32px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
                  >
                    <Clock className="h-4 w-4 stroke-[1.5] text-ink-3 mr-2.5 shrink-0" />
                    <span className="truncate">{rec.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Group 4: Ask AI (A single clean row at the bottom) */}
            <Command.Group
              heading="Ask AI"
              className="pt-1 border-t border-hairline/60 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
            >
              <Command.Item
                onSelect={handleAskAI}
                className="relative flex h-[34px] cursor-pointer items-center rounded-lg px-2.5 text-[13px] text-ink outline-none transition-colors duration-120 data-[selected=true]:bg-selected data-[selected=true]:text-ink hover:bg-hover"
              >
                <MessageSquare className="h-4 w-4 stroke-[1.5] text-ink-2 mr-2.5 shrink-0" />
                <span className="truncate font-medium">
                  {search.trim()
                    ? `Ask Ropimo AI: "${search.trim()}"`
                    : "Ask Ropimo AI"}
                </span>
                <span className="ml-auto pl-3 font-mono text-[10px] text-ink-3">
                  ↵
                </span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer bar */}
          <div className="h-9 px-3.5 border-t border-hairline flex items-center justify-between text-[11px] text-ink-3 select-none bg-surface">
            <span>↑ ↓ to navigate · ↵ to select · Esc to close</span>
            <span className="font-mono text-[10px]">⌘K</span>
          </div>
        </Command>
      </div>

      {/* Creation modals */}
      <CreateTaskModal
        isOpen={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        workspaceId={workspaceId}
        people={[]}
        projects={[]}
        departments={[]}
        onSuccess={() => {
          setCreateTaskOpen(false);
          router.refresh();
        }}
      />

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        workspaceId={workspaceId}
        onSuccess={() => {
          setCreateProjectOpen(false);
          router.refresh();
        }}
      />

      {/* AI Side Panel Drawer */}
      <AICopilotDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        userName={userName}
      />
    </>
  );
}

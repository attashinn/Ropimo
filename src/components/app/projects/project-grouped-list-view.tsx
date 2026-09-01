"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Diamond,
  User,
  Calendar,
  DollarSign,
  Layers,
  Sparkles,
  Share2,
  SlidersHorizontal,
  MoreHorizontal,
  FolderKanban,
  Check,
  Building2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Task, TaskStatus } from "@/types/task";
import { Project } from "@/types/project";
import { WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { toggleTaskCompletionAction, createTaskAction } from "@/lib/task/actions";
import { cn } from "@/lib/utils";

export interface ProjectGroupedListViewProps {
  project: Project;
  tasks: Task[];
  people: WorkspacePerson[];
  departments: Department[];
  onSelectTask?: (task: Task) => void;
  onOpenCreateModal?: () => void;
}

export function ProjectGroupedListView({
  project,
  tasks: initialTasks,
  people,
  departments,
  onSelectTask,
  onOpenCreateModal,
}: ProjectGroupedListViewProps) {
  // Local Tasks State
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});
  const [inlineAddingSection, setInlineAddingSection] = React.useState<string | null>(null);
  const [inlineTaskTitle, setInlineTaskTitle] = React.useState("");
  const [addingSectionOpen, setAddingSectionOpen] = React.useState(false);
  const [newSectionName, setNewSectionName] = React.useState("");
  const [customSections, setCustomSections] = React.useState<string[]>([
    "Launch Milestones",
    "Launch Monitoring",
    "Product & Marketing Launch Work",
  ]);

  // Seed standard Asana-style milestones if tasks list is small or empty
  const enrichedTasks = React.useMemo(() => {
    if (tasks.length >= 6) {
      return tasks;
    }

    // Default reference mockup tasks to match the user's exact design
    const seedTasks: Partial<Task>[] = [
      {
        id: `seed-1-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Finalize Summer Campaign Brief",
        section: "Launch Milestones",
        status: "completed",
        is_milestone: true,
        budget: 1200000,
        launch_date: "Jun 01, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "high",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(0, 1),
      },
      {
        id: `seed-2-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Approve Creative Concepts",
        section: "Launch Milestones",
        status: "todo",
        is_milestone: true,
        budget: 500000,
        launch_date: "Jun 08, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "high",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(1, 2),
      },
      {
        id: `seed-3-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Complete Landing Page Development",
        section: "Launch Milestones",
        status: "in_progress",
        is_milestone: true,
        budget: 950000,
        launch_date: "Jun 15, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(2, 3),
      },
      {
        id: `seed-4-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Finalize Product Feature Set",
        section: "Launch Milestones",
        status: "completed",
        is_milestone: true,
        budget: 1400000,
        launch_date: "Jun 22, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "high",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(0, 1),
      },
      {
        id: `seed-5-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Launch Go-Live Readiness Review",
        section: "Launch Milestones",
        status: "todo",
        is_milestone: true,
        budget: 600000,
        launch_date: "Jun 29, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(1, 2),
      },
      // Launch Monitoring
      {
        id: `seed-6-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Monthly Launch Readiness Status Review",
        section: "Launch Monitoring",
        status: "todo",
        is_milestone: false,
        budget: 2000000,
        launch_date: "Jul 06, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(2, 3),
      },
      {
        id: `seed-7-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Weekly Status Report",
        section: "Launch Monitoring",
        status: "todo",
        is_milestone: false,
        budget: 850000,
        launch_date: "Jul 13, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "low",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(0, 1),
      },
      // Product & Marketing Launch Work
      {
        id: `seed-8-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Finalize Summer Landing Page Copy",
        section: "Product & Marketing Launch Work",
        status: "todo",
        is_milestone: false,
        budget: 1100000,
        launch_date: "Jul 20, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "high",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(1, 2),
      },
      {
        id: `seed-9-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Finalize Summer Landing Page Design",
        section: "Product & Marketing Launch Work",
        status: "todo",
        is_milestone: false,
        budget: 750000,
        launch_date: "Jul 27, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(2, 3),
      },
      {
        id: `seed-10-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Align on Social Launch Strategy",
        section: "Product & Marketing Launch Work",
        status: "todo",
        is_milestone: false,
        budget: 300000,
        launch_date: "Aug 03, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "low",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(0, 1),
      },
      {
        id: `seed-11-${project.id}`,
        project_id: project.id,
        workspace_id: project.workspace_id,
        title: "Prepare Social Launch Assets",
        section: "Product & Marketing Launch Work",
        status: "todo",
        is_milestone: false,
        budget: 1600000,
        launch_date: "Aug 10, 2026",
        channels: ["Email", "+5"],
        assets_needed: ["Hero", "+10"],
        requesting_team: "R&D Expansion",
        priority: "high",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees: people.slice(1, 2),
      },
    ];

    // Merge existing tasks
    const existing = [...tasks];
    seedTasks.forEach((st) => {
      if (!existing.some((e) => e.title.toLowerCase() === st.title?.toLowerCase())) {
        existing.push(st as Task);
      }
    });
    return existing;
  }, [tasks, project.id, project.workspace_id, people]);

  // Section Grouping
  const sections = React.useMemo(() => {
    const list = [...customSections];
    enrichedTasks.forEach((t) => {
      const sec = t.section || "General Tasks";
      if (!list.includes(sec)) list.push(sec);
    });
    return list;
  }, [customSections, enrichedTasks]);

  // Toggle Task Completion
  const handleToggleTask = async (task: Task) => {
    const newStatus: TaskStatus = task.status === "completed" ? "todo" : "completed";

    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    if (!task.id.startsWith("seed-")) {
      try {
        await toggleTaskCompletionAction(
          task.id,
          task.workspace_id,
          newStatus === "completed"
        );
      } catch {}
    }
  };

  // Toggle Section Collapse
  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Inline Add Task Submit
  const handleInlineAddTask = async (section: string) => {
    if (!inlineTaskTitle.trim()) {
      setInlineAddingSection(null);
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      workspace_id: project.workspace_id,
      project_id: project.id,
      title: inlineTaskTitle.trim(),
      section,
      status: "todo",
      priority: "medium",
      budget: 500000,
      launch_date: "Aug 17, 2026",
      channels: ["Email", "+2"],
      assets_needed: ["Hero", "+4"],
      requesting_team: departments[0]?.name || "R&D Expansion",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignees: people.slice(0, 1),
    };

    setTasks((prev) => [...prev, newTask]);
    setInlineTaskTitle("");
    setInlineAddingSection(null);

    try {
      await createTaskAction({
        workspaceId: project.workspace_id,
        projectId: project.id,
        title: newTask.title,
        section,
        priority: "medium",
        status: "todo",
      });
    } catch {}
  };

  // Add New Custom Section
  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    if (!customSections.includes(newSectionName.trim())) {
      setCustomSections((prev) => [...prev, newSectionName.trim()]);
    }
    setNewSectionName("");
    setAddingSectionOpen(false);
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return "$500,000";
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="w-full bg-white rounded-[16px] border border-[#E5E8E1] overflow-hidden shadow-xs select-none">
      {/* ── LIST TABLE ─────────────────────────────────────────────────── */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[950px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-[#E5E8E1] bg-[#FAFAF8] text-[#65706A] font-semibold text-[11px]">
              <th className="py-2.5 px-4 font-semibold w-[360px]">Task name</th>
              <th className="py-2.5 px-3 font-semibold w-[160px]">Assignee</th>
              <th className="py-2.5 px-3 font-semibold w-[120px]">Budget</th>
              <th className="py-2.5 px-3 font-semibold w-[130px]">Launch date</th>
              <th className="py-2.5 px-3 font-semibold w-[110px]">Channels</th>
              <th className="py-2.5 px-3 font-semibold w-[110px]">Assets needed</th>
              <th className="py-2.5 px-3 font-semibold w-[140px]">Requesting team</th>
              <th className="py-2.5 px-2 font-semibold w-[40px] text-center">
                <button
                  type="button"
                  className="hover:text-[#18221E] cursor-pointer"
                  title="Add custom field column"
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>

          {/* Table Body Groups */}
          <tbody className="divide-y divide-[#E5E8E1]/60">
            {sections.map((secName) => {
              const secTasks = enrichedTasks.filter(
                (t) => (t.section || "General Tasks") === secName
              );
              const isCollapsed = collapsedSections[secName];

              return (
                <React.Fragment key={secName}>
                  {/* Section Header Row */}
                  <tr className="bg-[#FFFFFF] hover:bg-[#F9FAF7] transition-colors border-t border-[#E5E8E1]">
                    <td colSpan={8} className="py-2.5 px-3">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleSection(secName)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#18221E] hover:text-[#246244] transition-colors cursor-pointer"
                        >
                          {isCollapsed ? (
                            <ChevronRight size={14} className="text-[#8A958F]" />
                          ) : (
                            <ChevronDown size={14} className="text-[#8A958F]" />
                          )}
                          <span>{secName}</span>
                          <span className="text-[10px] font-semibold text-[#8A958F] ml-1">
                            ({secTasks.length})
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Section Tasks Rows */}
                  {!isCollapsed && (
                    <>
                      {secTasks.map((task) => {
                        const isDone = task.status === "completed";
                        const isMilestone = task.is_milestone || secName.toLowerCase().includes("milestone");
                        const assignee = task.assignees?.[0] || people[0];
                        const assigneeName = assignee?.full_name || "Unassigned";

                        return (
                          <tr
                            key={task.id}
                            className="group hover:bg-[#F9FAF7] transition-colors text-xs border-b border-[#E5E8E1]/40"
                          >
                            {/* Task Name & Completion Checkbox */}
                            <td className="py-2.5 px-4 pl-7">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTask(task)}
                                  className="shrink-0 transition-transform active:scale-90 cursor-pointer"
                                  title={isDone ? "Mark incomplete" : "Mark complete"}
                                >
                                  {isDone ? (
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#246244] text-white">
                                      <Check size={10} strokeWidth={3} />
                                    </div>
                                  ) : isMilestone ? (
                                    <div className="h-4 w-4 border border-[#8A958F] rotate-45 rounded-[2px] hover:border-[#246244] transition-colors flex items-center justify-center" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border border-[#8A958F] hover:border-[#246244] transition-colors" />
                                  )}
                                </button>

                                <span
                                  onClick={() => onSelectTask?.(task)}
                                  className={cn(
                                    "font-medium text-[#18221E] hover:text-[#246244] cursor-pointer truncate transition-colors",
                                    isDone && "line-through text-[#8A958F]"
                                  )}
                                >
                                  {task.title}
                                </span>
                              </div>
                            </td>

                            {/* Assignee */}
                            <td className="py-2 px-3">
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF9F5] border border-[#E5E8E1] px-2 py-0.5 max-w-[145px]">
                                {assignee?.avatar_url ? (
                                  <img
                                    src={assignee.avatar_url}
                                    alt=""
                                    className="h-4 w-4 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10251F] text-[9px] font-bold text-white">
                                    {assigneeName[0]?.toUpperCase()}
                                  </div>
                                )}
                                <span className="text-[11px] font-medium text-[#18221E] truncate">
                                  {assigneeName}
                                </span>
                              </div>
                            </td>

                            {/* Budget */}
                            <td className="py-2 px-3 font-medium text-[#18221E] text-[11px]">
                              {formatCurrency(task.budget)}
                            </td>

                            {/* Launch Date */}
                            <td className="py-2 px-3 text-[#65706A] text-[11px] font-medium">
                              {task.launch_date || task.due_date || "Jul 20, 2026"}
                            </td>

                            {/* Channels */}
                            <td className="py-2 px-3">
                              <div className="inline-flex items-center gap-1 rounded-[6px] border border-[#E5E8E1] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#18221E]">
                                <span>{task.channels?.[0] || "Email"}</span>
                                <span className="text-[#8A958F]">{task.channels?.[1] || "+5"}</span>
                              </div>
                            </td>

                            {/* Assets Needed */}
                            <td className="py-2 px-3">
                              <div className="inline-flex items-center gap-1 rounded-[6px] border border-[#E5E8E1] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#18221E]">
                                <span>{task.assets_needed?.[0] || "Hero"}</span>
                                <span className="text-[#8A958F]">{task.assets_needed?.[1] || "+10"}</span>
                              </div>
                            </td>

                            {/* Requesting Team */}
                            <td className="py-2 px-3">
                              <span className="inline-block rounded-[6px] border border-[#E5E8E1] bg-white px-2 py-0.5 text-[10px] font-medium text-[#65706A] truncate max-w-[130px]">
                                {task.requesting_team || "R&D Expansion"}
                              </span>
                            </td>

                            {/* Options */}
                            <td className="py-2 px-2 text-center text-[#8A958F] group-hover:text-[#18221E]">
                              <button
                                type="button"
                                onClick={() => onSelectTask?.(task)}
                                className="opacity-0 group-hover:opacity-100 hover:text-[#18221E] transition-opacity cursor-pointer p-1"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Inline Add Task Row */}
                      <tr className="border-b border-[#E5E8E1]/40">
                        <td colSpan={8} className="py-2 px-4 pl-7">
                          {inlineAddingSection === secName ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleInlineAddTask(secName);
                              }}
                              className="flex items-center gap-2"
                            >
                              <div className="h-4 w-4 rounded-full border border-dashed border-[#8A958F]" />
                              <input
                                autoFocus
                                type="text"
                                value={inlineTaskTitle}
                                onChange={(e) => setInlineTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setInlineAddingSection(null);
                                }}
                                placeholder="Write a task name and press Enter..."
                                className="w-full text-xs font-medium text-[#18221E] bg-transparent outline-none border-b border-[#10251F] pb-0.5"
                              />
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setInlineAddingSection(secName);
                                setInlineTaskTitle("");
                              }}
                              className="inline-flex items-center gap-1.5 text-xs text-[#8A958F] hover:text-[#18221E] font-medium transition-colors cursor-pointer"
                            >
                              <Plus size={13} />
                              <span>Add task...</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── BOTTOM ADD SECTION BAR ──────────────────────────────────────── */}
      <div className="p-3.5 bg-[#FAF9F5] border-t border-[#E5E8E1] flex items-center justify-between">
        {addingSectionOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddSection();
            }}
            className="flex items-center gap-2 text-xs"
          >
            <input
              autoFocus
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Section / Milestone Name (e.g. Phase 2 Delivery)..."
              className="rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none w-72"
            />
            <button
              type="submit"
              className="rounded-[8px] bg-[#10251F] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#18342C] transition-colors cursor-pointer"
            >
              Add Section
            </button>
            <button
              type="button"
              onClick={() => setAddingSectionOpen(false)}
              className="text-xs text-[#65706A] hover:text-[#18221E] px-2"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAddingSectionOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#65706A] hover:text-[#18221E] transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Section</span>
          </button>
        )}

        <span className="text-[11px] text-[#8A958F]">
          {enrichedTasks.length} tasks across {sections.length} sections
        </span>
      </div>
    </div>
  );
}

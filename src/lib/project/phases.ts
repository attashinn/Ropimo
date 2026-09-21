import { Task } from "@/types/task";
import { Department } from "@/types/department";

export interface ProjectPhase {
  id: string; // "01", "02", ... "00"
  name: string; // "01 — Project HQ"
  title: string; // "Project HQ"
  iconName: "list" | "user" | "folder";
  defaultCount: number;
}

export const STRUCTURED_PROJECT_PHASES: ProjectPhase[] = [
  { id: "01", name: "01 — Project HQ", title: "Project HQ", iconName: "list", defaultCount: 19 },
  { id: "02", name: "02 — Strategy & Research", title: "Strategy & Research", iconName: "list", defaultCount: 16 },
  { id: "03", name: "03 — Branding", title: "Branding", iconName: "list", defaultCount: 14 },
  { id: "04", name: "04 — UI UX", title: "UI UX", iconName: "list", defaultCount: 45 },
  { id: "05", name: "05 — Development", title: "Development", iconName: "list", defaultCount: 34 },
  { id: "06", name: "06 — Content & Marketing", title: "Content & Marketing", iconName: "list", defaultCount: 15 },
  { id: "07", name: "07 — QA & Launch", title: "QA & Launch", iconName: "list", defaultCount: 20 },
  { id: "08", name: "08 — Client Requests", title: "Client Requests", iconName: "list", defaultCount: 6 },
  { id: "09", name: "09 — Client Updates", title: "Client Updates", iconName: "user", defaultCount: 13 },
  { id: "00", name: "00 — Project Assets", title: "Project Assets", iconName: "folder", defaultCount: 23 },
];

export function getTaskPhase(task: { deliverable_type?: string | null; section?: string | null }): string {
  const str = (task.deliverable_type || task.section || "").trim();
  for (const phase of STRUCTURED_PROJECT_PHASES) {
    if (str.startsWith(phase.id) || str.toLowerCase().includes(phase.title.toLowerCase())) {
      return phase.id;
    }
  }
  return "01"; // default to Project HQ
}

export function getTaskCollaborativeDepartments(
  task: { department_id?: string | null; expected_outcome?: string | null; department?: any },
  allDepartments: Department[]
): Department[] {
  const result: Department[] = [];
  const addedIds = new Set<string>();

  // Parse collaborative departments from expected_outcome
  if (task.expected_outcome) {
    try {
      if (task.expected_outcome.startsWith("{") && task.expected_outcome.includes("departments")) {
        const parsed = JSON.parse(task.expected_outcome);
        if (Array.isArray(parsed.departments)) {
          parsed.departments.forEach((dIdOrName: string) => {
            const found = allDepartments.find(
              (d) => d.id === dIdOrName || d.name.toLowerCase() === dIdOrName.toLowerCase()
            );
            if (found && !addedIds.has(found.id)) {
              result.push(found);
              addedIds.add(found.id);
            }
          });
        }
      } else {
        const parts = task.expected_outcome.split(",").map((s) => s.trim());
        parts.forEach((p) => {
          const found = allDepartments.find(
            (d) => d.id === p || d.name.toLowerCase() === p.toLowerCase()
          );
          if (found && !addedIds.has(found.id)) {
            result.push(found);
            addedIds.add(found.id);
          }
        });
      }
    } catch {
      // ignore
    }
  }

  // Also include primary department if present
  const primaryId = task.department_id || task.department?.id;
  if (primaryId && !addedIds.has(primaryId)) {
    const found = allDepartments.find((d) => d.id === primaryId);
    if (found) {
      result.unshift(found);
      addedIds.add(found.id);
    } else if (task.department) {
      result.unshift({
        id: task.department.id,
        name: task.department.name,
        color: task.department.color || "#10251F",
        icon: task.department.icon || "Building2",
        slug: "dept",
        workspace_id: "",
        created_at: "",
        updated_at: "",
      });
      addedIds.add(task.department.id);
    }
  }

  // If still empty, default to first 1 or 2 workspace departments for collaborative demonstration
  if (result.length === 0 && allDepartments.length > 0) {
    result.push(allDepartments[0]);
    if (allDepartments.length > 1) {
      result.push(allDepartments[1]);
    }
  }

  return result;
}

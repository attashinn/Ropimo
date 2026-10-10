/**
 * Ropimo Centralized Permissions Engine
 * 
 * Implements the exact RBAC matrix across:
 * - UI (conditional rendering, disabled tooltips)
 * - Server actions (requirePermission)
 * - API routes
 * - AI Copilot agent
 * 
 * Roles: owner, admin, hr, manager, member
 * Department level: department_members.is_lead
 */

import {
  WorkspaceRole,
  PermissionKey,
  PermissionScope,
  PermissionResource,
  PermissionUser,
  PermissionDefinition,
} from "@/types/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// 1. PERMISSION MATRIX SPECIFICATION (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────

export const PERMISSION_MATRIX: PermissionDefinition[] = [
  {
    key: "workspace:settings",
    name: "Workspace settings, branding",
    category: "Workspace",
    description: "Manage general workspace profile, name, slug, logo, and branding.",
    owner: "Yes",
    admin: "Yes",
    hr: "—",
    manager: "—",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "workspace:billing",
    name: "Billing, delete workspace, transfer",
    category: "Workspace",
    description: "Manage subscription billing, payment methods, workspace deletion, and ownership transfer.",
    owner: "Yes",
    admin: "—",
    hr: "—",
    manager: "—",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "members:invite",
    name: "Invite members",
    category: "People",
    description: "Send workspace invitations to new team members.",
    owner: "Yes (all roles)",
    admin: "Yes (except owner)",
    hr: "Yes (member, manager only)",
    manager: "—",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "members:manage_roles",
    name: "Change roles, remove members",
    category: "People",
    description: "Demote, promote, reassign roles, deactivate, or remove members from workspace.",
    owner: "Yes (except last owner)",
    admin: "Yes (not owners)",
    hr: "—",
    manager: "—",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "departments:create_delete",
    name: "Create/delete departments",
    category: "Departments",
    description: "Add new organizational departments or delete existing ones.",
    owner: "Yes",
    admin: "Yes",
    hr: "—",
    manager: "—",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "departments:edit",
    name: "Edit a department",
    category: "Departments",
    description: "Modify department settings, description, and assign department leads.",
    owner: "Yes",
    admin: "Yes",
    hr: "—",
    manager: "Own dept",
    member: "—",
    defaultScope: "department",
  },
  {
    key: "projects:view",
    name: "Projects: view",
    category: "Projects",
    description: "View project details, roadmaps, and timelines.",
    owner: "All",
    admin: "All",
    hr: "All",
    manager: "Own depts",
    member: "Only projects they belong to",
    defaultScope: "department",
  },
  {
    key: "projects:manage",
    name: "Projects: create/edit/delete",
    category: "Projects",
    description: "Create new projects, modify attributes, archive, or delete projects.",
    owner: "All",
    admin: "All",
    hr: "—",
    manager: "Own depts",
    member: "—",
    defaultScope: "department",
  },
  {
    key: "tasks:create",
    name: "Tasks: create",
    category: "Tasks",
    description: "Create new tasks in any visible project.",
    owner: "Any visible project",
    admin: "Any visible project",
    hr: "Any visible project",
    manager: "Any visible project",
    member: "Any visible project",
    defaultScope: "department",
  },
  {
    key: "tasks:manage",
    name: "Tasks: edit/delete",
    category: "Tasks",
    description: "Edit task descriptions, assignees, priorities, due dates, or delete tasks.",
    owner: "All",
    admin: "All",
    hr: "Own/assigned",
    manager: "Own dept",
    member: "Own/assigned",
    defaultScope: "own",
  },
  {
    key: "files:view",
    name: "Official files: view",
    category: "Files",
    description: "Access and preview folders and documents according to folder security clearance.",
    owner: "All",
    admin: "All",
    hr: "Company + HR-only",
    manager: "Company + own dept",
    member: "Company + own dept",
    defaultScope: "department",
  },
  {
    key: "files:manage",
    name: "Official files: create/edit/delete",
    category: "Files",
    description: "Upload, update, or remove files in authorized folders.",
    owner: "All",
    admin: "All",
    hr: "Company + HR-only",
    manager: "Company + own dept",
    member: "Company + own dept",
    defaultScope: "department",
  },
  {
    key: "jobs:manage",
    name: "Job openings: create/edit",
    category: "Hiring",
    description: "Draft, edit, or configure job vacancy listings.",
    owner: "Yes",
    admin: "Yes",
    hr: "Yes",
    manager: "Draft for own dept only",
    member: "—",
    defaultScope: "department",
  },
  {
    key: "jobs:publish",
    name: "Job openings: publish",
    category: "Hiring",
    description: "Publish open jobs to the public board or close vacancies.",
    owner: "Yes",
    admin: "Yes",
    hr: "Yes",
    manager: "— (HR/Admin publish)",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "candidates:view",
    name: "Candidates: view",
    category: "Hiring",
    description: "Browse candidate applications, CVs, and screening answers.",
    owner: "All",
    admin: "All",
    hr: "All",
    manager: "Own dept's jobs",
    member: "Only if assigned interviewer",
    defaultScope: "department",
  },
  {
    key: "candidates:manage",
    name: "Candidates: move stage, reject",
    category: "Hiring",
    description: "Advance candidate stages, advance to offer, or mark rejected.",
    owner: "Yes",
    admin: "Yes",
    hr: "Yes",
    manager: "—",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "interviews:schedule",
    name: "Interviews: schedule",
    category: "Hiring",
    description: "Schedule interview rounds, set dates, and assign team interviewers.",
    owner: "Yes",
    admin: "Yes",
    hr: "Yes",
    manager: "Own dept jobs",
    member: "—",
    defaultScope: "department",
  },
  {
    key: "scorecards:submit",
    name: "Scorecards: submit",
    category: "Hiring",
    description: "Submit candidate scorecard ratings and round evaluations.",
    owner: "Any assigned interviewer",
    admin: "Any assigned interviewer",
    hr: "Any assigned interviewer",
    manager: "Any assigned interviewer",
    member: "Any assigned interviewer",
    defaultScope: "own",
  },
  {
    key: "offers:manage",
    name: "Offers and compensation",
    category: "Hiring",
    description: "View, draft, send, and approve candidate compensation offers.",
    owner: "Yes",
    admin: "Yes",
    hr: "Yes",
    manager: "—",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "leave:request",
    name: "Leave: request",
    category: "Leave & Attendance",
    description: "Submit time-off and leave requests.",
    owner: "All roles",
    admin: "All roles",
    hr: "All roles",
    manager: "All roles",
    member: "All roles",
    defaultScope: "own",
  },
  {
    key: "leave:approve",
    name: "Leave: approve",
    category: "Leave & Attendance",
    description: "Approve or reject employee leave requests.",
    owner: "All",
    admin: "All",
    hr: "All",
    manager: "Own dept",
    member: "—",
    defaultScope: "department",
  },
  {
    key: "attendance:view_team",
    name: "Attendance: view team",
    category: "Leave & Attendance",
    description: "View team daily attendance summaries, check-in logs, and timesheets.",
    owner: "All",
    admin: "All",
    hr: "All",
    manager: "Own dept",
    member: "Own only",
    defaultScope: "department",
  },
  {
    key: "employee_private_info:view",
    name: "Employee private info",
    category: "People",
    description: "View sensitive contact info, phone, address, and identity documents.",
    owner: "Yes",
    admin: "Yes",
    hr: "Yes",
    manager: "Only their own",
    member: "Only their own",
    defaultScope: "own",
  },
  {
    key: "audit_log:view",
    name: "Audit log",
    category: "Security",
    description: "Inspect workspace audit trails, role modifications, and administrative history.",
    owner: "Yes",
    admin: "Yes",
    hr: "—",
    manager: "—",
    member: "—",
    defaultScope: "workspace",
  },
  {
    key: "ai:copilot",
    name: "AI Copilot",
    category: "Productivity",
    description: "Interact with the AI assistant, executing actions strictly within the acting user's permissions.",
    owner: "All roles",
    admin: "All roles",
    hr: "All roles",
    manager: "All roles",
    member: "All roles",
    defaultScope: "workspace",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORE EVALUATION FUNCTION: can(user, permission, resource?)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a user has permission to perform an action on a resource.
 * Pure evaluation function — deterministic and safe for UI, Server, and Agent.
 */
export function can(
  user: PermissionUser | null | undefined,
  permission: PermissionKey,
  resource?: PermissionResource
): boolean {
  if (!user) return false;

  // Deactivated users have zero permissions across the workspace
  if (user.isDeactivated) return false;

  // Multi-tenant barrier: if resource specifies a workspace, caller must belong to that workspace
  if (resource?.workspaceId && resource.workspaceId !== user.workspaceId) {
    return false;
  }

  const role = user.role;
  const leadDeptIds = user.leadDepartmentIds || [];
  const memberDeptIds = user.memberDepartmentIds || [];
  const projectIds = user.projectIds || [];

  switch (permission) {
    // ── Workspace Settings ───────────────────────────────────────────────────
    case "workspace:settings":
      return role === "owner" || role === "admin";

    case "workspace:billing":
      return role === "owner";

    // ── Member Invitation & Role Management ──────────────────────────────────
    case "members:invite": {
      if (role === "owner") return true;
      if (role === "admin") {
        // Admins cannot invite owners
        return resource?.targetRole !== "owner";
      }
      if (role === "hr") {
        // HR can only invite 'member' or 'manager'
        if (!resource?.targetRole) return true;
        return resource.targetRole === "member" || resource.targetRole === "manager";
      }
      return false;
    }

    case "members:manage_roles": {
      // Safety: nobody can change their own role or remove themselves via manage_roles
      if (resource?.targetUserId && resource.targetUserId === user.userId) {
        return false;
      }
      if (role === "owner") return true;
      if (role === "admin") {
        // Admins cannot edit, demote, or remove owners
        if (resource?.targetRole === "owner") return false;
        return true;
      }
      return false;
    }

    // ── Departments ─────────────────────────────────────────────────────────
    case "departments:create_delete":
      return role === "owner" || role === "admin";

    case "departments:edit": {
      if (role === "owner" || role === "admin") return true;
      if (role === "manager") {
        // Manager's powers apply to departments they lead or manage
        return Boolean(resource?.departmentId && leadDeptIds.includes(resource.departmentId));
      }
      return false;
    }

    // ── Projects ────────────────────────────────────────────────────────────
    case "projects:view": {
      if (role === "owner" || role === "admin" || role === "hr") return true;
      if (role === "manager") {
        if (!resource?.departmentId && !resource?.projectId) return true;
        if (resource.departmentId && leadDeptIds.includes(resource.departmentId)) return true;
        if (resource.projectId && projectIds.includes(resource.projectId)) return true;
        if (resource.memberIds && resource.memberIds.includes(user.userId)) return true;
        return false;
      }
      if (role === "member") {
        // Only projects they belong to
        if (resource?.projectId && projectIds.includes(resource.projectId)) return true;
        if (resource?.memberIds && resource.memberIds.includes(user.userId)) return true;
        if (resource?.createdBy === user.userId) return true;
        return false;
      }
      return false;
    }

    case "projects:manage": {
      if (role === "owner" || role === "admin") return true;
      if (role === "manager") {
        return Boolean(resource?.departmentId && leadDeptIds.includes(resource.departmentId));
      }
      return false;
    }

    // ── Tasks ───────────────────────────────────────────────────────────────
    case "tasks:create": {
      // Any visible project (all roles)
      return can(user, "projects:view", resource);
    }

    case "tasks:manage": {
      if (role === "owner" || role === "admin") return true;
      if (role === "hr") {
        // Own / assigned
        return Boolean(
          resource?.createdBy === user.userId ||
          (resource?.assigneeIds && resource.assigneeIds.includes(user.userId))
        );
      }
      if (role === "manager") {
        // Own dept or own/assigned
        if (resource?.departmentId && leadDeptIds.includes(resource.departmentId)) return true;
        return Boolean(
          resource?.createdBy === user.userId ||
          (resource?.assigneeIds && resource.assigneeIds.includes(user.userId))
        );
      }
      if (role === "member") {
        // Own / assigned
        return Boolean(
          resource?.createdBy === user.userId ||
          (resource?.assigneeIds && resource.assigneeIds.includes(user.userId))
        );
      }
      return false;
    }

    // ── Official Files ──────────────────────────────────────────────────────
    case "files:view":
    case "files:manage": {
      const accessLevel = resource?.accessLevel || resource?.folderAccessLevel || "company";

      if (role === "owner" || role === "admin") return true;

      if (accessLevel === "admin") {
        return false; // Only owner/admin
      }

      if (accessLevel === "hr") {
        return role === "hr";
      }

      if (accessLevel === "company") {
        return true; // Accessible to all roles
      }

      if (accessLevel === "department") {
        if (role === "manager") {
          return Boolean(
            resource?.departmentId &&
            (leadDeptIds.includes(resource.departmentId) || memberDeptIds.includes(resource.departmentId))
          );
        }
        if (role === "member") {
          return Boolean(resource?.departmentId && memberDeptIds.includes(resource.departmentId));
        }
        if (role === "hr") {
          return Boolean(resource?.departmentId && memberDeptIds.includes(resource.departmentId));
        }
        return false;
      }

      if (accessLevel === "private") {
        return resource?.createdBy === user.userId;
      }

      return false;
    }

    // ── Job Openings ────────────────────────────────────────────────────────
    case "jobs:manage": {
      if (role === "owner" || role === "admin" || role === "hr") return true;
      if (role === "manager") {
        // Draft for own dept only
        const isDraft = !resource?.status || resource.status.toLowerCase() === "draft";
        return Boolean(isDraft && resource?.departmentId && leadDeptIds.includes(resource.departmentId));
      }
      return false;
    }

    case "jobs:publish": {
      // HR and admin publish (Owner, Admin, HR only)
      return role === "owner" || role === "admin" || role === "hr";
    }

    // ── Candidates ──────────────────────────────────────────────────────────
    case "candidates:view": {
      if (role === "owner" || role === "admin" || role === "hr") return true;
      if (role === "manager") {
        return Boolean(resource?.departmentId && leadDeptIds.includes(resource.departmentId));
      }
      if (role === "member") {
        // Only if assigned as interviewer
        return Boolean(
          resource?.assignedInterviewerIds &&
          resource.assignedInterviewerIds.includes(user.userId)
        );
      }
      return false;
    }

    case "candidates:manage": {
      return role === "owner" || role === "admin" || role === "hr";
    }

    // ── Interviews & Scorecards ─────────────────────────────────────────────
    case "interviews:schedule": {
      if (role === "owner" || role === "admin" || role === "hr") return true;
      if (role === "manager") {
        return Boolean(resource?.departmentId && leadDeptIds.includes(resource.departmentId));
      }
      return false;
    }

    case "scorecards:submit": {
      // Any assigned interviewer, any role
      if (role === "owner" || role === "admin") return true;
      if (resource?.interviewerId && resource.interviewerId === user.userId) return true;
      if (resource?.assignedInterviewerIds && resource.assignedInterviewerIds.includes(user.userId)) return true;
      return false;
    }

    // ── Offers & Compensation ───────────────────────────────────────────────
    case "offers:manage": {
      return role === "owner" || role === "admin" || role === "hr";
    }

    // ── Leave ───────────────────────────────────────────────────────────────
    case "leave:request": {
      // All roles for themselves
      if (!resource?.userId) return true;
      return resource.userId === user.userId;
    }

    case "leave:approve": {
      if (role === "owner" || role === "admin" || role === "hr") return true;
      if (role === "manager") {
        return Boolean(resource?.departmentId && leadDeptIds.includes(resource.departmentId));
      }
      return false;
    }

    // ── Attendance ──────────────────────────────────────────────────────────
    case "attendance:view_team": {
      if (role === "owner" || role === "admin" || role === "hr") return true;
      if (role === "manager") {
        return Boolean(resource?.departmentId && leadDeptIds.includes(resource.departmentId));
      }
      if (role === "member") {
        // Own only
        return !resource?.userId || resource.userId === user.userId;
      }
      return false;
    }

    // ── Employee Private Info ───────────────────────────────────────────────
    case "employee_private_info:view": {
      if (role === "owner" || role === "admin" || role === "hr") return true;
      // Manager & Member: only their own
      return Boolean(resource?.userId && resource.userId === user.userId);
    }

    // ── Audit Log ───────────────────────────────────────────────────────────
    case "audit_log:view": {
      return role === "owner" || role === "admin";
    }

    // ── AI Copilot ──────────────────────────────────────────────────────────
    case "ai:copilot": {
      return true; // All roles, acting with that user's permissions
    }

    default:
      return false;
  }
}

/**
 * Returns a human-friendly denial explanation for UI tooltips
 */
export function getPermissionDenialReason(
  permission: PermissionKey,
  role?: WorkspaceRole
): string {
  switch (permission) {
    case "workspace:settings":
      return "Only owners and admins can configure workspace settings.";
    case "workspace:billing":
      return "Only the workspace owner can manage billing and workspace ownership.";
    case "members:invite":
      return "Only owners, admins, and HR can invite team members.";
    case "members:manage_roles":
      return "Only owners and admins can modify member roles.";
    case "departments:create_delete":
      return "Only owners and admins can create or delete departments.";
    case "departments:edit":
      return "Only owners, admins, and department managers can edit this department.";
    case "projects:manage":
      return "Only owners, admins, and department managers can manage projects.";
    case "jobs:publish":
      return "Only HR and admins can publish or unpublish job openings.";
    case "candidates:manage":
      return "Only HR, admins, and owners can change candidate stages or reject candidates.";
    case "offers:manage":
      return "Only HR, admins, and owners can manage offers and compensation.";
    case "leave:approve":
      return "Only department managers, HR, and admins can approve leave.";
    case "attendance:view_team":
      return "Only department managers, HR, and admins can view team attendance.";
    case "employee_private_info:view":
      return "Only HR, admins, and owners can access sensitive employee private info.";
    case "audit_log:view":
      return "Only owners and admins can view audit logs.";
    default:
      return "You do not have permission to perform this action.";
  }
}

/**
 * Server-side gatekeeper function.
 * Verifies that the authenticated caller has the required permission.
 */
export async function requirePermission(
  permission: PermissionKey,
  resource?: PermissionResource,
  explicitUserId?: string
): Promise<PermissionUser> {
  const { requirePermission: reqPerm } = await import("./permissions-server");
  return reqPerm(permission, resource, explicitUserId);
}


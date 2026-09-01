import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  WorkspacePerson,
  DepartmentMember,
  PersonDepartmentRef,
  EmploymentType,
  EmploymentStatus,
} from "@/types/people";

import { recruitmentStore } from "@/lib/recruitment/store";
import { EmployeeOnboarding, OnboardingStatus } from "@/types/people";

/**
 * Fetch all people in a workspace, including their assigned departments and job titles (deduplicated per request)
 */
export const getWorkspacePeople = cache(
  async (workspaceId: string): Promise<WorkspacePerson[]> => {
    if (!workspaceId) return [];

    let isAuthed = true;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) isAuthed = false;
    } catch {
      // CLI / background script context
    }

    if (!isAuthed) return [];

    const adminClient = createAdminClient();

    // 1. Fetch workspace members
    const { data: members } = await adminClient
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    // 2. Fetch department memberships
    const { data: deptMemberships } = await adminClient
      .from("department_members")
      .select(`
        department_id,
        user_id,
        job_title,
        departments:department_id (
          id,
          name,
          icon,
          color
        )
      `)
      .eq("workspace_id", workspaceId);

    interface DeptMembershipRow {
      department_id: string;
      user_id: string;
      job_title: string | null;
      departments: {
        id: string;
        name: string;
        icon: string;
        color: string;
      } | null;
    }

    const userDeptsMap = new Map<string, PersonDepartmentRef[]>();
    ((deptMemberships as unknown as DeptMembershipRow[]) || []).forEach((dm) => {
      if (dm.departments) {
        const list = userDeptsMap.get(dm.user_id) || [];
        list.push({
          id: dm.departments.id,
          name: dm.departments.name,
          icon: dm.departments.icon,
          color: dm.departments.color,
          job_title: dm.job_title,
        });
        userDeptsMap.set(dm.user_id, list);
      }
    });

    const userIds = (members || []).map((m) => m.user_id);
    const userProfilesMap = new Map<
      string,
      {
        email: string;
        fullName: string | null;
        avatarUrl: string | null;
        phone: string | null;
        location: string | null;
        jobTitle: string | null;
        employeeId: string | null;
        employmentType: string | null;
        employmentStatus: string | null;
        bio: string | null;
        skills: string[];
      }
    >();

    try {
      const userResults = await Promise.all(
        userIds.map((id) => adminClient.auth.admin.getUserById(id))
      );
      userResults.forEach((res) => {
        const u = res.data?.user;
        if (u) {
          const meta = u.user_metadata || {};
          userProfilesMap.set(u.id, {
            email: u.email || "",
            fullName: meta.full_name || meta.name || null,
            avatarUrl: meta.avatar_url || null,
            phone: meta.phone || null,
            location: meta.location || null,
            jobTitle: meta.job_title || null,
            employeeId: meta.employee_id || null,
            employmentType: meta.employment_type || null,
            employmentStatus: meta.employment_status || null,
            bio: meta.bio || null,
            skills: Array.isArray(meta.skills) ? meta.skills : [],
          });
        }
      });
    } catch {
      // Ignored
    }

    // 3. Candidate and Onboarding cross-referencing
    const candidates = recruitmentStore.getCandidates(workspaceId);
    const candidateByUserMap = new Map<string, (typeof candidates)[0]>();
    candidates.forEach((c) => {
      if (c.converted_user_id) candidateByUserMap.set(c.converted_user_id, c);
    });

    const onboardings = recruitmentStore.getOnboardings(workspaceId);
    const onboardingByUserMap = new Map<string, EmployeeOnboarding>();
    onboardings.forEach((o) => {
      onboardingByUserMap.set(o.user_id, o);
    });

    const dbPeople: WorkspacePerson[] = (members || []).map((m) => {
      const profile = userProfilesMap.get(m.user_id);
      const email = profile?.email || m.email || "team@ropimo.com";
      const full_name = m.full_name || profile?.fullName || email.split("@")[0] || "Team Member";
      const departments = userDeptsMap.get(m.user_id) || [];
      const linkedCandidate = candidateByUserMap.get(m.user_id);
      const linkedOnboarding = onboardingByUserMap.get(m.user_id);

      const employeeId =
        linkedCandidate?.employee_id ||
        linkedOnboarding?.employee_id ||
        profile?.employeeId ||
        null;

      const employmentStatus =
        (linkedCandidate?.employment_status as EmploymentStatus | undefined) ||
        (profile?.employmentStatus as EmploymentStatus | undefined) ||
        (linkedOnboarding && linkedOnboarding.status !== "Completed" ? "Pending" : "Active");

      const onboardingStatus =
        (linkedOnboarding?.status as OnboardingStatus | undefined) ||
        (linkedCandidate?.onboarding_status as OnboardingStatus | undefined) ||
        "Completed";

      return {
        id: m.id,
        user_id: m.user_id,
        workspace_id: m.workspace_id,
        role: m.role || "member",
        job_title: m.job_title || profile?.jobTitle || linkedCandidate?.hired_job_title || null,
        full_name,
        email,
        avatar_url: m.avatar_url || profile?.avatarUrl || null,
        phone: profile?.phone || linkedCandidate?.phone || null,
        location: profile?.location || linkedCandidate?.location || null,
        employee_id: employeeId,
        employment_type: (profile?.employmentType as EmploymentType | undefined) ?? "Full-time",
        employment_status: employmentStatus,
        onboarding_status: onboardingStatus,
        candidate_id: linkedCandidate?.id || linkedOnboarding?.candidate_id || null,
        candidate_application_id: linkedCandidate?.latest_application_id || linkedOnboarding?.application_id || null,
        hire_date: linkedCandidate?.hired_start_date || m.created_at,
        bio: profile?.bio || linkedCandidate?.bio || null,
        skills: profile?.skills || linkedCandidate?.skills || [],
        departments,
        created_at: m.created_at,
      };
    });

    return dbPeople;
  }
);

/**
 * Fetch all members belonging to a specific department
 */
export async function getDepartmentMembers(
  departmentId: string,
  workspaceId: string
): Promise<DepartmentMember[]> {
  if (!departmentId || !workspaceId) return [];

  const adminClient = createAdminClient();

  const { data: dmRows } = await adminClient
    .from("department_members")
    .select("*")
    .eq("department_id", departmentId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (!dmRows || dmRows.length === 0) {
    return [];
  }

  const allPeople = await getWorkspacePeople(workspaceId);
  const peopleMap = new Map(allPeople.map((p) => [p.user_id, p]));

  const departmentMembers: DepartmentMember[] = [];

  for (const row of dmRows) {
    const person = peopleMap.get(row.user_id);
    if (person) {
      departmentMembers.push({
        id: row.id,
        department_id: row.department_id,
        user_id: row.user_id,
        workspace_id: row.workspace_id,
        job_title: row.job_title || person.job_title,
        role: row.role || person.role,
        created_at: row.created_at,
        person,
      });
    }
  }

  return departmentMembers;
}

/**
 * Fetch a single person by user_id and workspace_id
 */
export async function getWorkspacePersonById(
  personId: string,
  workspaceId: string
): Promise<WorkspacePerson | null> {
  if (!personId || !workspaceId) return null;

  const people = await getWorkspacePeople(workspaceId);
  const person = people.find(
    (p) =>
      p.id === personId ||
      p.user_id === personId ||
      p.email.toLowerCase() === personId.toLowerCase() ||
      p.full_name?.toLowerCase().replace(/\s+/g, "-") === personId.toLowerCase()
  );

  if (person) return person;

  // Fallback: check workspace invitations for pending teammates
  const { getWorkspaceInvitations } = await import("@/lib/invitations/queries");
  const invitations = await getWorkspaceInvitations(workspaceId);
  const inv = invitations.find(
    (i) =>
      i.id === personId ||
      i.user_id === personId ||
      i.employee_id === personId ||
      i.token === personId ||
      i.email.toLowerCase() === personId.toLowerCase()
  );

  if (inv) {
    const targetDept = inv.department_id ? { id: inv.department_id, name: "Department", icon: "departments", color: "blue", job_title: inv.job_title || undefined } : null;
    return {
      id: inv.id,
      workspace_id: workspaceId,
      user_id: inv.user_id || inv.id,
      email: inv.email,
      full_name: inv.full_name || inv.email.split("@")[0],
      avatar_url: null,
      role: inv.role,
      departments: targetDept ? [targetDept] : [],
      job_title: inv.job_title || "Team Member",
      employee_id: inv.employee_id || "EMP-INV",
      employment_type: inv.employment_type || "Full-time",
      employment_status: "Pending",
      created_at: inv.created_at,
    };
  }

  return null;
}

export interface MemberProjectSummary {
  id: string;
  name: string;
  role: string;
  status: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
}

export interface MemberActivitySummary {
  id: string;
  action: string;
  target: string;
  timeAgo: string;
  createdAt: string;
}

/**
 * Fetch real task activities for a specific team member
 */
export async function getMemberActivities(
  userId: string,
  workspaceId: string
): Promise<MemberActivitySummary[]> {
  if (!userId || !workspaceId) return [];

  const adminClient = createAdminClient();

  const { data: rows } = await adminClient
    .from("task_activities")
    .select("id, action_type, created_at, task_id, tasks:task_id(title)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!rows || rows.length === 0) return [];

  return rows.map((r) => {
    const createdTime = new Date(r.created_at);
    const diffMin = Math.round((Date.now() - createdTime.getTime()) / 60000);
    const timeAgo =
      diffMin < 1
        ? "Just now"
        : diffMin < 60
        ? `${diffMin}m ago`
        : diffMin < 1440
        ? `${Math.round(diffMin / 60)}h ago`
        : `${Math.round(diffMin / 1440)}d ago`;

    const task = r.tasks as unknown as { title?: string } | null;
    const actionLabel = (r.action_type || "updated").replace(/_/g, " ");

    return {
      id: r.id,
      action: actionLabel,
      target: task?.title ? `"${task.title}"` : "Task",
      timeAgo,
      createdAt: r.created_at,
    };
  });
}

/**
 * Fetch real projects associated with a team member
 */
export async function getMemberProjects(
  userId: string,
  workspaceId: string
): Promise<MemberProjectSummary[]> {
  if (!userId || !workspaceId) return [];

  const adminClient = createAdminClient();

  const [{ data: allProjects }, { data: userTasks }, { data: allTasks }] = await Promise.all([
    adminClient
      .from("projects")
      .select("id, name, status, created_by")
      .eq("workspace_id", workspaceId),
    adminClient
      .from("tasks")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .eq("created_by", userId)
      .not("project_id", "is", null),
    adminClient
      .from("tasks")
      .select("id, project_id, status")
      .eq("workspace_id", workspaceId)
      .not("project_id", "is", null),
  ]);

  if (!allProjects || allProjects.length === 0) return [];

  const userProjectIds = new Set<string>();
  allProjects.forEach((p) => {
    if (p.created_by === userId) userProjectIds.add(p.id);
  });
  (userTasks || []).forEach((t) => {
    if (t.project_id) userProjectIds.add(t.project_id);
  });

  const projectTasksMap = new Map<string, { total: number; completed: number }>();
  (allTasks || []).forEach((t) => {
    if (!t.project_id) return;
    const curr = projectTasksMap.get(t.project_id) || { total: 0, completed: 0 };
    curr.total += 1;
    if (t.status === "completed") curr.completed += 1;
    projectTasksMap.set(t.project_id, curr);
  });

  return allProjects
    .filter((p) => userProjectIds.has(p.id))
    .map((p) => {
      const counts = projectTasksMap.get(p.id) || { total: 0, completed: 0 };
      const progress = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
      const isLead = p.created_by === userId;

      return {
        id: p.id,
        name: p.name,
        role: isLead ? "Project Lead" : "Contributor",
        status: p.status === "active" ? "Active" : p.status || "Active",
        progress,
        completedTasks: counts.completed,
        totalTasks: counts.total,
      };
    });
}

/**
 * Efficiently batch-fetch activities and project summaries for all workspace members in 3 optimized queries
 */
export async function getWorkspaceMemberProjectsAndActivitiesMaps(workspaceId: string): Promise<{
  memberActivitiesMap: Record<string, MemberActivitySummary[]>;
  memberProjectsMap: Record<string, MemberProjectSummary[]>;
}> {
  if (!workspaceId) {
    return { memberActivitiesMap: {}, memberProjectsMap: {} };
  }

  const adminClient = createAdminClient();

  const [
    { data: activitiesRows },
    { data: allProjects },
    { data: allTasks },
  ] = await Promise.all([
    adminClient
      .from("task_activities")
      .select("id, user_id, action_type, created_at, task_id, tasks:task_id(title)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient
      .from("projects")
      .select("id, name, status, created_by")
      .eq("workspace_id", workspaceId),
    adminClient
      .from("tasks")
      .select("id, project_id, status, created_by")
      .eq("workspace_id", workspaceId)
      .not("project_id", "is", null),
  ]);

  // Build activities map
  const memberActivitiesMap: Record<string, MemberActivitySummary[]> = {};
  (activitiesRows || []).forEach((r) => {
    if (!r.user_id) return;
    if (!memberActivitiesMap[r.user_id]) {
      memberActivitiesMap[r.user_id] = [];
    }
    if (memberActivitiesMap[r.user_id].length < 20) {
      const createdTime = new Date(r.created_at);
      const diffMin = Math.round((Date.now() - createdTime.getTime()) / 60000);
      const timeAgo =
        diffMin < 1
          ? "Just now"
          : diffMin < 60
          ? `${diffMin}m ago`
          : diffMin < 1440
          ? `${Math.round(diffMin / 60)}h ago`
          : `${Math.round(diffMin / 1440)}d ago`;

      const task = r.tasks as unknown as { title?: string } | null;
      const actionLabel = (r.action_type || "updated").replace(/_/g, " ");

      memberActivitiesMap[r.user_id].push({
        id: r.id,
        action: actionLabel,
        target: task?.title ? `"${task.title}"` : "Task",
        timeAgo,
        createdAt: r.created_at,
      });
    }
  });

  // Build projects map
  const projectTasksMap = new Map<string, { total: number; completed: number }>();
  const userProjectsSetMap = new Map<string, Set<string>>();

  (allProjects || []).forEach((p) => {
    if (p.created_by) {
      const set = userProjectsSetMap.get(p.created_by) || new Set();
      set.add(p.id);
      userProjectsSetMap.set(p.created_by, set);
    }
  });

  (allTasks || []).forEach((t) => {
    if (!t.project_id) return;
    const curr = projectTasksMap.get(t.project_id) || { total: 0, completed: 0 };
    curr.total += 1;
    if (t.status === "completed") curr.completed += 1;
    projectTasksMap.set(t.project_id, curr);

    if (t.created_by) {
      const set = userProjectsSetMap.get(t.created_by) || new Set();
      set.add(t.project_id);
      userProjectsSetMap.set(t.created_by, set);
    }
  });

  const memberProjectsMap: Record<string, MemberProjectSummary[]> = {};
  userProjectsSetMap.forEach((pIds, uId) => {
    memberProjectsMap[uId] = (allProjects || [])
      .filter((p) => pIds.has(p.id))
      .map((p) => {
        const counts = projectTasksMap.get(p.id) || { total: 0, completed: 0 };
        const progress = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
        const isLead = p.created_by === uId;
        return {
          id: p.id,
          name: p.name,
          role: isLead ? "Project Lead" : "Contributor",
          status: p.status === "active" ? "Active" : p.status || "Active",
          progress,
          completedTasks: counts.completed,
          totalTasks: counts.total,
        };
      });
  });

  return { memberActivitiesMap, memberProjectsMap };
}

/**
 * Fetch employee onboarding record by employee/user ID
 */
export async function getEmployeeOnboarding(
  userIdOrEmpId: string,
  workspaceId: string
): Promise<EmployeeOnboarding | null> {
  if (!userIdOrEmpId || !workspaceId) return null;

  const person = await getWorkspacePersonById(userIdOrEmpId, workspaceId);
  const realUserId = person ? person.user_id : userIdOrEmpId;
  const onboarding = recruitmentStore.getOnboardingByUserId(realUserId, workspaceId);

  if (!onboarding) {
    if (person) {
      const isPending = person.employment_status === "Pending";
      const defaultChecklist = [
        {
          id: `chk-1-${person.user_id}`,
          title: "Accept Workspace Invitation",
          description: "Invitation confirmed and account activated.",
          category: "profile",
          required: true,
          status: isPending ? "pending" : "completed",
          completed_at: isPending ? undefined : person.created_at,
        },
        {
          id: `chk-2-${person.user_id}`,
          title: "Complete Profile & Contact Information",
          description: "Verify phone number, emergency contacts, and personal details.",
          category: "profile",
          required: true,
          status: "pending",
        },
        {
          id: `chk-3-${person.user_id}`,
          title: "Upload Profile Photo",
          description: "Add team directory avatar for workspace visibility.",
          category: "profile",
          required: false,
          status: "pending",
        },
        {
          id: `chk-4-${person.user_id}`,
          title: "Verify Employment Details & Role",
          description: `Confirm job title (${person.job_title || "Team Member"}) and employment tier.`,
          category: "employment",
          required: true,
          status: isPending ? "pending" : "completed",
        },
        {
          id: `chk-5-${person.user_id}`,
          title: "Sign Offer Letter & NDA",
          description: "Review and e-sign standard employment agreements.",
          category: "documents",
          required: true,
          status: isPending ? "pending" : "completed",
        },
        {
          id: `chk-6-${person.user_id}`,
          title: "Workspace & Department Access Setup",
          description: "Configure role permissions and department task boards.",
          category: "workspace",
          required: true,
          status: isPending ? "pending" : "completed",
        },
        {
          id: `chk-7-${person.user_id}`,
          title: "First Day Team Intro & Orientation",
          description: "Complete intro meeting with workspace administrator.",
          category: "profile",
          required: false,
          status: "pending",
        },
      ];

      const completedCount = defaultChecklist.filter((c) => c.status === "completed").length;
      const progress = Math.round((completedCount / defaultChecklist.length) * 100);

      return {
        id: `onb-${person.user_id}`,
        workspace_id: workspaceId,
        user_id: person.user_id,
        employee_id: person.employee_id || "EMP-001",
        status: isPending ? "In Progress" : "Completed",
        progress_percentage: progress,
        checklist: defaultChecklist as any,
        started_at: person.created_at,
        completed_at: isPending ? null : person.created_at,
        created_at: person.created_at,
        updated_at: person.created_at,
        person,
      };
    }
    return null;
  }

  return {
    ...onboarding,
    person: person || undefined,
  };
}

/**
 * Fetch recruitment history and candidate record for an employee
 */
export async function getEmployeeRecruitmentHistory(
  userIdOrEmpId: string,
  workspaceId: string
) {
  if (!userIdOrEmpId || !workspaceId) return null;

  const people = await getWorkspacePeople(workspaceId);
  const person = people.find(
    (p) =>
      p.id === userIdOrEmpId ||
      p.user_id === userIdOrEmpId ||
      p.employee_id?.toLowerCase() === userIdOrEmpId.toLowerCase()
  );

  const realUserId = person ? person.user_id : userIdOrEmpId;
  const candidates = recruitmentStore.getCandidates(workspaceId);
  const candidate = candidates.find(
    (c) =>
      c.converted_user_id === realUserId ||
      (person?.email && c.email.toLowerCase() === person.email.toLowerCase())
  );

  if (!candidate) return null;

  const applications = recruitmentStore.getCandidateApplications(candidate.id, workspaceId);
  const interviews = recruitmentStore.getInterviews(workspaceId).filter((i) => i.candidate_id === candidate.id);
  const offers = recruitmentStore.getOffers(workspaceId).filter((o) => o.candidate_id === candidate.id);
  const activities = recruitmentStore.getActivities(candidate.id, workspaceId);

  return {
    candidate,
    applications,
    interviews,
    offers,
    activities,
  };
}

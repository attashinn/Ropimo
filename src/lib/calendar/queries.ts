import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
} from "@/types/calendar";
import { getWorkspacePeople } from "@/lib/people/queries";
import { getWorkspaceProjects } from "@/lib/project/queries";
import { getWorkspaceTasks } from "@/lib/task/queries";
import { WorkspacePerson } from "@/types/people";

// Placeholder stubs — calendar events are not yet connected to real people data
const EMPTY_ATTENDEE = { id: "", user_id: "", full_name: "", email: "", job_title: null, workspace_id: "", role: "member", departments: [], created_at: "", avatar_url: null } as unknown as WorkspacePerson;
const pTashin: WorkspacePerson = EMPTY_ATTENDEE;
const pSarah: WorkspacePerson = EMPTY_ATTENDEE;
const pRahim: WorkspacePerson = EMPTY_ATTENDEE;
const pFatema: WorkspacePerson = EMPTY_ATTENDEE;
const pTanjir: WorkspacePerson = EMPTY_ATTENDEE;
const pArafath: WorkspacePerson = EMPTY_ATTENDEE;

export const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "evt-standup-today",
    workspace_id: "ws-default",
    title: "Development Standup",
    description: "Daily engineering sync to unblock team members, review active PRs, and align on sprint deliverable priorities.",
    event_type: "meeting",
    start_date: "2026-08-21",
    end_date: "2026-08-21",
    is_all_day: false,
    start_time: "10:00 AM",
    end_time: "10:30 AM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    project_color: "#10251F",
    project: { id: "proj-ropimo", name: "Ropimo Platform", color: "#10251F", icon: "R" },
    location: "Meeting Room Alpha / Google Meet",
    meeting_link: "https://meet.google.com/rop-dev-sync",
    status: "scheduled",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-15T09:00:00Z",
    updated_at: "2026-08-20T10:00:00Z",
    participants: [pTashin, pSarah, pRahim, pArafath],
    attachments: [
      { id: "att-1", name: "Sprint_Roadmap_August.pdf", size: 1420000, type: "pdf", url: "#" }
    ],
    comments: [
      { id: "cm-1", author_name: "Tashin Khan", content: "Agenda added. Please review before call.", created_at: "2026-08-21T08:30:00Z" }
    ]
  },
  {
    id: "evt-review-homepage",
    workspace_id: "ws-default",
    title: "Review Muntajar Homepage",
    description: "Conduct comprehensive review of the new responsive homepage designs and typography scale.",
    event_type: "task",
    start_date: "2026-08-21",
    end_date: "2026-08-21",
    is_all_day: false,
    start_time: "02:00 PM",
    end_time: "03:30 PM",
    department_id: "dept-design",
    department_name: "Design",
    department_color: "#B58500",
    department: { id: "dept-design", name: "Design", color: "#B58500", icon: "design" },
    project_id: "proj-muntajar",
    project_name: "Muntajar Website",
    project_color: "#EA580C",
    project: { id: "proj-muntajar", name: "Muntajar Website", color: "#EA580C", icon: "M" },
    location: "Design Studio Room",
    meeting_link: null,
    status: "in_progress",
    created_by: "u-sarah",
    creator: pSarah,
    created_at: "2026-08-16T14:00:00Z",
    updated_at: "2026-08-21T09:00:00Z",
    participants: [pSarah, pTashin],
    attachments: [
      { id: "att-2", name: "Homepage_Figma_Export_v2.png", size: 3400000, type: "image", url: "#" }
    ],
    comments: []
  },
  {
    id: "evt-marketing-strat",
    workspace_id: "ws-default",
    title: "Marketing Strategy Meeting",
    description: "Review conversion metrics, ad spend efficiency, and Q3 content distribution plan.",
    event_type: "meeting",
    start_date: "2026-08-22",
    end_date: "2026-08-22",
    is_all_day: false,
    start_time: "11:00 AM",
    end_time: "12:00 PM",
    department_id: "dept-marketing",
    department_name: "Marketing",
    department_color: "#7E22CE",
    department: { id: "dept-marketing", name: "Marketing", color: "#7E22CE", icon: "marketing" },
    project_id: "proj-social",
    project_name: "Social Media Campaign",
    project_color: "#78350F",
    project: { id: "proj-social", name: "Social Media Campaign", color: "#78350F", icon: "S" },
    location: "Conference Room B",
    meeting_link: "https://meet.google.com/mkt-strategy-q3",
    status: "scheduled",
    created_by: "u-sarah",
    creator: pSarah,
    created_at: "2026-08-18T10:00:00Z",
    updated_at: "2026-08-18T10:00:00Z",
    participants: [pSarah, pFatema, pTanjir],
    attachments: [],
    comments: []
  },
  {
    id: "evt-deadline-muntajar",
    workspace_id: "ws-default",
    title: "Muntajar Website Deadline",
    description: "Final client delivery and staging server deployment sign-off for Muntajar Inc.",
    event_type: "deadline",
    start_date: "2026-08-25",
    end_date: "2026-08-25",
    is_all_day: true,
    start_time: "06:00 PM",
    end_time: "06:00 PM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-muntajar",
    project_name: "Muntajar Website",
    project_color: "#EA580C",
    project: { id: "proj-muntajar", name: "Muntajar Website", color: "#EA580C", icon: "M" },
    location: "Production Staging",
    meeting_link: null,
    status: "scheduled",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    participants: [pTashin, pSarah, pArafath],
    attachments: [],
    comments: []
  },
  {
    id: "evt-workshop-team",
    workspace_id: "ws-default",
    title: "Team Workshop — Modern Design Systems",
    description: "All-hands engineering and design alignment on component primitives, accessibility standards, and token management.",
    event_type: "event",
    start_date: "2026-08-14",
    end_date: "2026-08-14",
    is_all_day: false,
    start_time: "02:00 PM",
    end_time: "04:30 PM",
    department_id: "dept-design",
    department_name: "Design",
    department_color: "#B58500",
    department: { id: "dept-design", name: "Design", color: "#B58500", icon: "design" },
    project_id: null,
    project_name: null,
    location: "Main Auditorium & Zoom",
    meeting_link: "https://meet.google.com/allhands-workshop",
    status: "completed",
    created_by: "u-sarah",
    creator: pSarah,
    created_at: "2026-08-10T12:00:00Z",
    updated_at: "2026-08-14T17:00:00Z",
    participants: [pTashin, pSarah, pRahim, pFatema, pTanjir, pArafath],
    attachments: [
      { id: "att-3", name: "Design_System_Tokens.pdf", size: 2100000, type: "pdf", url: "#" }
    ],
    comments: [
      { id: "cm-2", author_name: "Sarah Ahmed", content: "Great session everyone! Slide deck attached.", created_at: "2026-08-14T17:05:00Z" }
    ]
  },
  {
    id: "evt-leave-sarah",
    workspace_id: "ws-default",
    title: "Sarah Ahmed – Annual Leave",
    description: "Out of office for family commitment. Please route urgent design questions to Tashin or Fatema.",
    event_type: "leave",
    start_date: "2026-08-18",
    end_date: "2026-08-19",
    is_all_day: true,
    start_time: null,
    end_time: null,
    department_id: "dept-design",
    department_name: "Design",
    department_color: "#B58500",
    department: { id: "dept-design", name: "Design", color: "#B58500", icon: "design" },
    project_id: null,
    project_name: null,
    location: null,
    meeting_link: null,
    status: "completed",
    created_by: "u-sarah",
    creator: pSarah,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    participants: [pSarah],
    attachments: [],
    comments: []
  },
  {
    id: "evt-finish-homepage-task",
    workspace_id: "ws-default",
    title: "Finish Homepage Design",
    description: "Deliver final high-fidelity responsive screens for desktop and mobile viewports.",
    event_type: "task",
    start_date: "2026-08-04",
    end_date: "2026-08-04",
    is_all_day: false,
    start_time: "11:00 AM",
    end_time: "01:00 PM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    project_color: "#10251F",
    project: { id: "proj-ropimo", name: "Ropimo Platform", color: "#10251F", icon: "R" },
    location: "Studio Desk 4",
    meeting_link: null,
    status: "completed",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-04T13:30:00Z",
    participants: [pTashin, pSarah],
    attachments: [],
    comments: []
  },
  {
    id: "evt-weekly-planning",
    workspace_id: "ws-default",
    title: "Weekly Planning & Prioritization",
    description: "Cross-functional roadmap triage and weekly milestone assignment.",
    event_type: "meeting",
    start_date: "2026-08-03",
    end_date: "2026-08-03",
    is_all_day: false,
    start_time: "10:00 AM",
    end_time: "11:00 AM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    project_color: "#10251F",
    project: { id: "proj-ropimo", name: "Ropimo Platform", color: "#10251F", icon: "R" },
    location: "Boardroom 1",
    meeting_link: "https://meet.google.com/rop-weekly-plan",
    status: "completed",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-03T11:00:00Z",
    participants: [pTashin, pSarah, pRahim, pTanjir],
    attachments: [],
    comments: []
  },
  {
    id: "evt-1on1-sarah",
    workspace_id: "ws-default",
    title: "1:1 Tashin × Sarah",
    description: "Bi-weekly sync on design leadership, team capacity, and Q4 hiring plan.",
    event_type: "meeting",
    start_date: "2026-08-05",
    end_date: "2026-08-05",
    is_all_day: false,
    start_time: "03:30 PM",
    end_time: "04:00 PM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: null,
    project_name: null,
    location: "Coffee Lounge",
    meeting_link: "https://meet.google.com/1on1-tashin-sarah",
    status: "completed",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-05T16:00:00Z",
    participants: [pTashin, pSarah],
    attachments: [],
    comments: []
  },
  {
    id: "evt-sprint-planning-aug",
    workspace_id: "ws-default",
    title: "Sprint Planning Session",
    description: "Scope tasks for sprint 14 including calendar module and document editor integration.",
    event_type: "meeting",
    start_date: "2026-08-06",
    end_date: "2026-08-06",
    is_all_day: false,
    start_time: "10:30 AM",
    end_time: "11:30 AM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    project_color: "#10251F",
    project: { id: "proj-ropimo", name: "Ropimo Platform", color: "#10251F", icon: "R" },
    location: "Engineering Pod",
    meeting_link: "https://meet.google.com/sprint-14-plan",
    status: "completed",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-06T11:30:00Z",
    participants: [pTashin, pArafath, pSarah],
    attachments: [],
    comments: []
  },
  {
    id: "evt-uiux-review",
    workspace_id: "ws-default",
    title: "UI/UX Review & Polish",
    description: "Fine-tune spacing hierarchy, keyboard navigation, and motion easing curves.",
    event_type: "task",
    start_date: "2026-08-11",
    end_date: "2026-08-11",
    is_all_day: false,
    start_time: "10:00 AM",
    end_time: "12:00 PM",
    department_id: "dept-design",
    department_name: "Design",
    department_color: "#B58500",
    department: { id: "dept-design", name: "Design", color: "#B58500", icon: "design" },
    project_id: "proj-dashboard",
    project_name: "Client Dashboard",
    project_color: "#1E293B",
    project: { id: "proj-dashboard", name: "Client Dashboard", color: "#1E293B", icon: "C" },
    location: "Design Desk",
    meeting_link: null,
    status: "completed",
    created_by: "u-sarah",
    creator: pSarah,
    created_at: "2026-08-08T00:00:00Z",
    updated_at: "2026-08-11T12:00:00Z",
    participants: [pSarah, pFatema],
    attachments: [],
    comments: []
  },
  {
    id: "evt-client-presentation",
    workspace_id: "ws-default",
    title: "Client Presentation — Apex Global",
    description: "Present the completed Client Dashboard staging preview to executive stakeholders.",
    event_type: "meeting",
    start_date: "2026-08-12",
    end_date: "2026-08-12",
    is_all_day: false,
    start_time: "11:30 AM",
    end_time: "12:30 PM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-dashboard",
    project_name: "Client Dashboard",
    project_color: "#1E293B",
    project: { id: "proj-dashboard", name: "Client Dashboard", color: "#1E293B", icon: "C" },
    location: "Executive Boardroom & Zoom",
    meeting_link: "https://zoom.us/j/apex-ropimo-portal",
    status: "completed",
    created_by: "u-arafath",
    creator: pArafath,
    created_at: "2026-08-05T00:00:00Z",
    updated_at: "2026-08-12T13:00:00Z",
    participants: [pArafath, pTashin, pTanjir],
    attachments: [
      { id: "att-4", name: "Apex_Client_Deck.pdf", size: 4500000, type: "pdf", url: "#" }
    ],
    comments: []
  },
  {
    id: "evt-avirohost-review",
    workspace_id: "ws-default",
    title: "Avirohost Backend Architecture Review",
    description: "Database indexing and multi-region failover cluster review with senior backend engineers.",
    event_type: "meeting",
    start_date: "2026-08-24",
    end_date: "2026-08-24",
    is_all_day: false,
    start_time: "02:00 PM",
    end_time: "03:30 PM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-avirohost",
    project_name: "Avirohost Platform",
    project_color: "#0D9488",
    project: { id: "proj-avirohost", name: "Avirohost Platform", color: "#0D9488", icon: "A" },
    location: "Engineering Room 2",
    meeting_link: "https://meet.google.com/aviro-arch-review",
    status: "scheduled",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-19T00:00:00Z",
    updated_at: "2026-08-19T00:00:00Z",
    participants: [pTashin, pArafath],
    attachments: [],
    comments: []
  },
  {
    id: "evt-video-gear-maint",
    workspace_id: "ws-default",
    title: "Video Studio Gear Maintenance",
    description: "Recalibrate 4K camera rigs, audio lavaliers, and check backup storage arrays.",
    event_type: "task",
    start_date: "2026-08-27",
    end_date: "2026-08-27",
    is_all_day: false,
    start_time: "03:00 PM",
    end_time: "04:30 PM",
    department_id: "dept-video",
    department_name: "Video Production",
    department_color: "#C2410C",
    department: { id: "dept-video", name: "Video Production", color: "#C2410C", icon: "video" },
    project_id: "proj-video",
    project_name: "Video Production Studio",
    project_color: "#7C3AED",
    project: { id: "proj-video", name: "Video Production Studio", color: "#7C3AED", icon: "V" },
    location: "Studio Floor 2",
    meeting_link: null,
    status: "scheduled",
    created_by: "u-rahim",
    creator: pRahim,
    created_at: "2026-08-18T00:00:00Z",
    updated_at: "2026-08-18T00:00:00Z",
    participants: [pRahim],
    attachments: [],
    comments: []
  },
  {
    id: "evt-sprint-retro",
    workspace_id: "ws-default",
    title: "Sprint Retrospective",
    description: "Celebrate sprint completions, review what went well and what can be improved for next cycle.",
    event_type: "meeting",
    start_date: "2026-08-28",
    end_date: "2026-08-28",
    is_all_day: false,
    start_time: "04:00 PM",
    end_time: "05:00 PM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    project_color: "#10251F",
    project: { id: "proj-ropimo", name: "Ropimo Platform", color: "#10251F", icon: "R" },
    location: "Main Lounge & Zoom",
    meeting_link: "https://meet.google.com/rop-retro",
    status: "scheduled",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-15T00:00:00Z",
    updated_at: "2026-08-15T00:00:00Z",
    participants: [pTashin, pSarah, pRahim, pArafath, pTanjir],
    attachments: [],
    comments: []
  },
  {
    id: "evt-ropimo-launch-deadline",
    workspace_id: "ws-default",
    title: "Ropimo Platform v2 Launch",
    description: "Official internal rollout and company-wide adoption deadline.",
    event_type: "deadline",
    start_date: "2026-08-30",
    end_date: "2026-08-30",
    is_all_day: true,
    start_time: "11:59 PM",
    end_time: "11:59 PM",
    department_id: "dept-dev",
    department_name: "Development",
    department_color: "#246244",
    department: { id: "dept-dev", name: "Development", color: "#246244", icon: "code" },
    project_id: "proj-ropimo",
    project_name: "Ropimo Platform",
    project_color: "#10251F",
    project: { id: "proj-ropimo", name: "Ropimo Platform", color: "#10251F", icon: "R" },
    location: "Global Release",
    meeting_link: null,
    status: "scheduled",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    participants: [pTashin, pSarah, pRahim, pFatema, pTanjir, pArafath],
    attachments: [],
    comments: []
  },
  {
    id: "evt-company-townhall",
    workspace_id: "ws-default",
    title: "Monthly Company Townhall",
    description: "Company growth update, new employee welcomes, team spotlight awards, and Q&A.",
    event_type: "event",
    start_date: "2026-08-31",
    end_date: "2026-08-31",
    is_all_day: false,
    start_time: "02:00 PM",
    end_time: "03:30 PM",
    department_id: null,
    department_name: "All Company",
    department_color: "#10251F",
    project_id: null,
    project_name: null,
    location: "Main Townhall Stage & Live Stream",
    meeting_link: "https://meet.google.com/ropimo-townhall-aug",
    status: "scheduled",
    created_by: "u-tashin",
    creator: pTashin,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    participants: [pTashin, pSarah, pRahim, pFatema, pTanjir, pArafath],
    attachments: [],
    comments: []
  }
];

/**
 * Fetch all calendar events in a workspace (deduplicated per request)
 * Merges:
 * 1. Calendar DB entries
 * 2. Tasks with due dates
 * 3. Projects with deadlines
 * 4. Default company events
 */
export const getWorkspaceCalendarEvents = cache(
  async (workspaceId: string, currentUserId?: string): Promise<CalendarEvent[]> => {
    if (!workspaceId) return DEFAULT_CALENDAR_EVENTS;

    const adminClient = createAdminClient();

    // Fetch in parallel: DB events, tasks, projects, people
    const [
      { data: dbEvents },
      workspaceTasks,
      workspaceProjects,
      allPeople,
    ] = await Promise.all([
      adminClient
        .from("calendar_events")
        .select(`
          *,
          departments:department_id(id, name, color, icon),
          projects:project_id(id, name, color, icon)
        `)
        .eq("workspace_id", workspaceId)
        .order("start_date", { ascending: true }),
      getWorkspaceTasks(workspaceId),
      getWorkspaceProjects(workspaceId),
      getWorkspacePeople(workspaceId),
    ]);

    const peopleMap = new Map<string, WorkspacePerson>(
      allPeople.map((p) => [p.user_id, p])
    );

    const parsedDbEvents: CalendarEvent[] = [];

    if (dbEvents && dbEvents.length > 0) {
      const eventIds = dbEvents.map((e) => e.id);
      const [participantsRes, attachmentsRes, commentsRes] = await Promise.all([
        adminClient.from("calendar_event_participants").select("*").in("event_id", eventIds),
        adminClient.from("calendar_event_attachments").select("*").in("event_id", eventIds),
        adminClient.from("calendar_event_comments").select("*").in("event_id", eventIds),
      ]);

      const participantsMap = new Map<string, WorkspacePerson[]>();
      (participantsRes.data || []).forEach((row) => {
        const p = peopleMap.get(row.user_id);
        if (p) {
          const list = participantsMap.get(row.event_id) || [];
          list.push(p);
          participantsMap.set(row.event_id, list);
        }
      });

      const attachmentsMap = new Map<string, any[]>();
      (attachmentsRes.data || []).forEach((row) => {
        const list = attachmentsMap.get(row.event_id) || [];
        list.push({
          id: row.id,
          name: row.file_name,
          size: row.file_size || 0,
          type: row.file_type || "document",
          url: row.file_url,
        });
        attachmentsMap.set(row.event_id, list);
      });

      const commentsMap = new Map<string, any[]>();
      (commentsRes.data || []).forEach((row) => {
        const list = commentsMap.get(row.event_id) || [];
        list.push({
          id: row.id,
          user_id: row.user_id,
          author_name: row.author_name,
          author_avatar: row.author_avatar,
          content: row.content,
          created_at: row.created_at,
        });
        commentsMap.set(row.event_id, list);
      });

      dbEvents.forEach((row: any) => {
        const dateOnly = row.start_date.includes("T")
          ? row.start_date.split("T")[0]
          : row.start_date;

        parsedDbEvents.push({
          id: row.id,
          workspace_id: row.workspace_id,
          title: row.title,
          description: row.description,
          event_type: row.event_type as CalendarEventType,
          start_date: dateOnly,
          end_date: row.end_date ? (row.end_date.includes("T") ? row.end_date.split("T")[0] : row.end_date) : dateOnly,
          is_all_day: row.is_all_day || false,
          start_time: row.start_time,
          end_time: row.end_time,
          department_id: row.department_id,
          department_name: row.departments?.name || null,
          department_color: row.departments?.color || null,
          department: row.departments || null,
          project_id: row.project_id,
          project_name: row.projects?.name || null,
          project_color: row.projects?.color || null,
          project: row.projects || null,
          location: row.location,
          meeting_link: row.meeting_link,
          status: (row.status || "scheduled") as CalendarEventStatus,
          created_by: row.created_by,
          creator: row.created_by ? peopleMap.get(row.created_by) || null : null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          participants: participantsMap.get(row.id) || [],
          attachments: attachmentsMap.get(row.id) || [],
          comments: commentsMap.get(row.id) || [],
        });
      });
    }

    // Convert workspace tasks with due_date into task calendar events
    const taskEvents: CalendarEvent[] = (workspaceTasks || [])
      .filter((t) => t.due_date)
      .map((t) => {
        const dateOnly = t.due_date!.includes("T")
          ? t.due_date!.split("T")[0]
          : t.due_date!;

        return {
          id: `task-cal-${t.id}`,
          task_id: t.id,
          workspace_id: t.workspace_id,
          title: t.title,
          description: t.description,
          event_type: "task" as CalendarEventType,
          start_date: dateOnly,
          end_date: dateOnly,
          is_all_day: false,
          start_time: "02:00 PM",
          end_time: "03:00 PM",
          department_id: t.department_id,
          department_name: t.department?.name || null,
          department_color: t.department?.color || null,
          department: t.department || null,
          project_id: t.project_id,
          project_name: t.project?.name || null,
          project_color: t.project?.color || null,
          project: t.project || null,
          location: null,
          meeting_link: null,
          status: (t.status === "completed" ? "completed" : "scheduled") as CalendarEventStatus,
          created_by: t.created_by,
          creator: t.creator || null,
          created_at: t.created_at,
          updated_at: t.updated_at,
          participants: t.assignees || [],
          attachments: (t.attachments || []).map((att) => ({
            id: att.id,
            name: att.file_name,
            size: att.file_size,
            type: att.file_type,
            url: att.file_url,
          })),
          comments: (t.comments || []).map((c) => ({
            id: c.id,
            author_name: c.author?.full_name || "Team Member",
            author_avatar: c.author?.avatar_url,
            content: c.content,
            created_at: c.created_at,
          })),
        };
      });

    // Merge everything together with defaults
    const combinedMap = new Map<string, CalendarEvent>();

    // Add seed events
    DEFAULT_CALENDAR_EVENTS.forEach((e) => combinedMap.set(e.id, e));

    // Add task events
    taskEvents.forEach((e) => combinedMap.set(e.id, e));

    // Add db events
    parsedDbEvents.forEach((e) => combinedMap.set(e.id, e));

    // Add approved leaves from attendance store
    try {
      const { attendanceStore } = await import("@/lib/attendance/store");
      const approvedLeaves = attendanceStore.getLeaveRequests(workspaceId, {
        status: "Approved",
      });

      for (const l of approvedLeaves) {
        const p = peopleMap.get(l.user_id);
        const leaveEvent: CalendarEvent = {
          id: `leave-cal-${l.id}`,
          workspace_id: workspaceId,
          title: `${p?.full_name || "Team Member"} — ${l.leave_type} (Leave)`,
          description: `Approved ${l.leave_type} (${l.duration_days} days). Reason: ${l.reason}`,
          event_type: "leave" as CalendarEventType,
          start_date: l.start_date,
          end_date: l.end_date,
          is_all_day: true,
          start_time: "09:00 AM",
          end_time: "05:00 PM",
          department_id: p?.departments[0]?.id || null,
          department_name: p?.departments[0]?.name || "All Company",
          department_color: "#7E22CE",
          status: "scheduled",
          created_by: l.user_id,
          creator: p || null,
          created_at: l.created_at,
          updated_at: l.updated_at,
          participants: p ? [p] : [],
          attachments: [],
          comments: [],
        };
        combinedMap.set(leaveEvent.id, leaveEvent);
      }
    } catch {
      // Fallback
    }

    const allEvents = Array.from(combinedMap.values());

    return allEvents.sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
  }
);

/**
 * Fetch upcoming calendar events for the right-side schedule panel
 */
export const getUpcomingCalendarEvents = cache(
  async (workspaceId: string, limit: number = 8): Promise<CalendarEvent[]> => {
    const events = await getWorkspaceCalendarEvents(workspaceId);
    const todayStr = "2026-08-21"; // Target platform anchor date

    const upcoming = events.filter((e) => e.start_date >= todayStr);
    return upcoming.slice(0, limit);
  }
);

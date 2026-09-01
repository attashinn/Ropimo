import { WorkspacePerson } from "./people";

export type CalendarEventType =
  | "meeting"
  | "task"
  | "deadline"
  | "event"
  | "leave";

export type CalendarEventStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CalendarViewMode = "month" | "week" | "day";

export interface CalendarAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface CalendarEventComment {
  id: string;
  user_id?: string | null;
  author_name: string;
  author_avatar?: string | null;
  content: string;
  created_at: string;
}

export interface CalendarEventActivity {
  id: string;
  user_name: string;
  action: string;
  created_at: string;
}

export interface CalendarDepartmentRef {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface CalendarProjectRef {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  title: string;
  description?: string | null;
  event_type: CalendarEventType;
  start_date: string; // ISO date or timestamp (e.g., "2026-08-21")
  end_date?: string | null;
  is_all_day: boolean;
  start_time?: string | null; // e.g. "10:00 AM" or "10:00"
  end_time?: string | null;   // e.g. "11:00 AM" or "11:00"
  department_id?: string | null;
  department_name?: string | null;
  department_color?: string | null;
  department?: CalendarDepartmentRef | null;
  project_id?: string | null;
  project_name?: string | null;
  project_color?: string | null;
  project?: CalendarProjectRef | null;
  location?: string | null;
  meeting_link?: string | null;
  status: CalendarEventStatus;
  created_by?: string | null;
  creator?: WorkspacePerson | null;
  created_at: string;
  updated_at: string;
  participants: WorkspacePerson[];
  attachments: CalendarAttachment[];
  task_id?: string | null;
  comments: CalendarEventComment[];
}

export interface CreateCalendarEventInput {
  workspaceId: string;
  title: string;
  description?: string;
  eventType: CalendarEventType;
  startDate: string;
  endDate?: string;
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  departmentId?: string;
  projectId?: string;
  participantIds?: string[];
  location?: string;
  meetingLink?: string;
  attachments?: {
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

export interface UpdateCalendarEventInput {
  eventId: string;
  workspaceId: string;
  title?: string;
  description?: string;
  eventType?: CalendarEventType;
  startDate?: string;
  endDate?: string;
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  departmentId?: string;
  projectId?: string;
  participantIds?: string[];
  location?: string;
  meetingLink?: string;
  status?: CalendarEventStatus;
  attachments?: {
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

export interface CalendarFilterState {
  searchQuery: string;
  eventType: "all" | CalendarEventType;
  departmentId: "all" | string;
  onlyMyEvents: boolean;
  activeCalendars: {
    mySchedule: boolean;
    projects: boolean;
    meetings: boolean;
    events: boolean;
    leave: boolean;
  };
}

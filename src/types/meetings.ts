export type MeetingType = "Internal" | "Client" | "Department" | "One-on-one" | "Interview" | "Training";

export type MeetingStatus = "Upcoming" | "Live" | "Completed" | "Cancelled";

export type MeetingLocationType = "Video" | "Physical" | "Custom";

export type RecurrenceFrequency = "None" | "Daily" | "Weekly" | "Biweekly" | "Monthly";

export interface MeetingAttendee {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  role?: string;
  rsvp?: "Accepted" | "Declined" | "Pending";
}

export interface MeetingAgendaItem {
  id: string;
  order: number;
  title: string;
  duration_minutes?: number;
  notes?: string;
}

export interface MeetingAttachment {
  id: string;
  name: string;
  size_bytes: number;
  url: string;
  mime_type: string;
  uploaded_by?: string;
}

export interface MeetingItem {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  timezone?: string;
  organizer_id: string;
  organizer_name: string;
  organizer_role?: string;
  organizer_avatar?: string | null;
  department_id?: string;
  department_name?: string;
  project_id?: string;
  project_name?: string;
  attendees: MeetingAttendee[];
  attendee_count: number;
  agenda: MeetingAgendaItem[];
  attachments: MeetingAttachment[];
  location_type: MeetingLocationType;
  location_value?: string;
  meeting_link?: string;
  meeting_id_code?: string;
  is_recurring: boolean;
  recurrence?: RecurrenceFrequency;
  reminders?: number[];
  notify_attendees: boolean;
  notes?: string;
  recording_url?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  starred?: boolean;
}

export interface MeetingStats {
  totalMeetings: number;
  upcomingThisWeek: number;
  totalAttended: number;
  totalHours: number;
  cancelledThisMonth: number;
}

export interface MeetingInsights {
  meetingsHeld: number;
  totalParticipants: number;
  avgMeetingMinutes: number;
  meetingsCancelled: number;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  type: MeetingType;
  date: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  organizer_id?: string;
  department_id?: string;
  project_id?: string;
  attendees?: Omit<MeetingAttendee, "id">[];
  agenda?: Omit<MeetingAgendaItem, "id">[];
  attachments?: Omit<MeetingAttachment, "id">[];
  location_type?: MeetingLocationType;
  location_value?: string;
  is_recurring?: boolean;
  recurrence?: RecurrenceFrequency;
  notify_attendees?: boolean;
}

export interface UpdateMeetingInput extends Partial<CreateMeetingInput> {
  id: string;
  status?: MeetingStatus;
  notes?: string;
  cancellation_reason?: string;
}

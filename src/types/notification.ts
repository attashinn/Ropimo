export type NotificationType =
  | "task_assigned"
  | "project_member_added"
  | "leave_requested"
  | "leave_approved"
  | "leave_rejected"
  | "invitation_accepted"
  | "meeting_scheduled"
  | "system";

export type NotificationCategory = "today" | "yesterday" | "older";

export type NotificationFilterTab = "all" | "unread" | "requests";

export interface AppNotification {
  id: string;
  workspace_id: string;
  user_id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  type: NotificationType;
  title: string;
  subtitle?: string | null;
  action_url: string;
  entity_type?: "task" | "project" | "leave" | "invitation" | "meeting" | "system" | null;
  entity_id?: string | null;
  read: boolean;
  created_at: string;
  updated_at?: string;
  // Computed / UI properties
  time_ago?: string;
  category?: NotificationCategory;
}

export interface CreateNotificationInput {
  workspace_id: string;
  user_id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  type: NotificationType;
  title: string;
  subtitle?: string | null;
  action_url: string;
  entity_type?: "task" | "project" | "leave" | "invitation" | "meeting" | "system" | null;
  entity_id?: string | null;
}

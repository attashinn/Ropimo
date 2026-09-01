/**
 * Ropimo Notification Memory Store
 * Provides offline fallback and in-memory persistence when Supabase table isn't yet migrated.
 */
import { AppNotification, CreateNotificationInput } from "@/types/notification";

class NotificationStore {
  private notifications: Map<string, AppNotification> = new Map();

  constructor() {
    this.initDefaultNotifications();
  }

  private initDefaultNotifications() {
    // Initial notifications are loaded per workspace
  }

  public getNotifications(workspaceId: string, userId: string): AppNotification[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.workspace_id === workspaceId && n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addNotification(input: CreateNotificationInput): AppNotification {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const notification: AppNotification = {
      id,
      workspace_id: input.workspace_id,
      user_id: input.user_id,
      actor_id: input.actor_id || null,
      actor_name: input.actor_name || null,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle || null,
      action_url: input.action_url,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  public markAsRead(notificationId: string, userId: string): boolean {
    const notif = this.notifications.get(notificationId);
    if (notif && notif.user_id === userId) {
      notif.read = true;
      notif.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  public markAllAsRead(workspaceId: string, userId: string): void {
    for (const notif of this.notifications.values()) {
      if (notif.workspace_id === workspaceId && notif.user_id === userId) {
        notif.read = true;
        notif.updated_at = new Date().toISOString();
      }
    }
  }

  public dismissNotification(notificationId: string, userId: string): boolean {
    const notif = this.notifications.get(notificationId);
    if (notif && notif.user_id === userId) {
      return this.notifications.delete(notificationId);
    }
    return false;
  }

  public clearAll(workspaceId: string, userId: string): void {
    for (const [id, notif] of this.notifications.entries()) {
      if (notif.workspace_id === workspaceId && notif.user_id === userId) {
        this.notifications.delete(id);
      }
    }
  }
}

export const notificationStore = new NotificationStore();

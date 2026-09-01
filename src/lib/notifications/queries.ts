import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AppNotification, NotificationCategory } from "@/types/notification";
import { notificationStore } from "./store";

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function categorizeNotification(dateStr: string): NotificationCategory {
  try {
    const d = new Date(dateStr);
    const now = new Date();

    const todayStr = now.toISOString().split("T")[0];
    const itemDateStr = d.toISOString().split("T")[0];

    if (itemDateStr === todayStr) return "today";

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (itemDateStr === yesterdayStr) return "yesterday";

    return "older";
  } catch {
    return "older";
  }
}

/**
 * Fetch notifications for a user in a specific workspace.
 * First queries Supabase workspace_notifications table; falls back to store if table not found or empty.
 */
export const getUserNotifications = cache(
  async (workspaceId: string, userId: string): Promise<AppNotification[]> => {
    if (!workspaceId || !userId) return [];

    let dbNotifications: AppNotification[] = [];

    try {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from("workspace_notifications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data && data.length > 0) {
        dbNotifications = data as AppNotification[];
      }
    } catch {
      // Fallback to store
    }

    const storeNotifications = notificationStore.getNotifications(workspaceId, userId);

    // Merge and deduplicate by ID
    const map = new Map<string, AppNotification>();
    for (const notif of dbNotifications) {
      map.set(notif.id, notif);
    }
    for (const notif of storeNotifications) {
      if (!map.has(notif.id)) {
        map.set(notif.id, notif);
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return merged.map((n) => ({
      ...n,
      time_ago: formatRelativeTime(n.created_at),
      category: categorizeNotification(n.created_at),
    }));
  }
);

/**
 * Fetch unread notification count for badge
 */
export const getUnreadNotificationCount = cache(
  async (workspaceId: string, userId: string): Promise<number> => {
    const list = await getUserNotifications(workspaceId, userId);
    return list.filter((n) => !n.read).length;
  }
);

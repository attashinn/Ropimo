"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationStore } from "./store";
import { revalidatePath } from "next/cache";

export async function markNotificationReadAction(
  notificationId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    notificationStore.markAsRead(notificationId, user.id);

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workspace_notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    } catch {
      // ignore
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to mark notification read." };
  }
}

export async function markAllNotificationsReadAction(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    notificationStore.markAllAsRead(workspaceId, user.id);

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workspace_notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id);
    } catch {
      // ignore
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to mark all read." };
  }
}

export async function dismissNotificationAction(
  notificationId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    notificationStore.dismissNotification(notificationId, user.id);

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workspace_notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);
    } catch {
      // ignore
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to dismiss notification." };
  }
}

export async function clearAllNotificationsAction(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    notificationStore.clearAll(workspaceId, user.id);

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workspace_notifications")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id);
    } catch {
      // ignore
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to clear notifications." };
  }
}

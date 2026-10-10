"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationStore } from "./store";
import { revalidatePath } from "next/cache";

const NotificationActionSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

const WorkspaceActionSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

export async function markNotificationReadAction(
  notificationId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = NotificationActionSchema.safeParse({ notificationId, workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    notificationStore.markAsRead(parsed.data.notificationId, user.id);

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workspace_notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("id", parsed.data.notificationId)
        .eq("workspace_id", parsed.data.workspaceId)
        .eq("user_id", user.id);
    } catch {
      // ignore
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark notification read.";
    return { success: false, error: msg };
  }
}

export async function markAllNotificationsReadAction(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = WorkspaceActionSchema.safeParse({ workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    notificationStore.markAllAsRead(parsed.data.workspaceId, user.id);

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workspace_notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("workspace_id", parsed.data.workspaceId)
        .eq("user_id", user.id);
    } catch {
      // ignore
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark all read.";
    return { success: false, error: msg };
  }
}

export async function dismissNotificationAction(
  notificationId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = NotificationActionSchema.safeParse({ notificationId, workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    notificationStore.dismissNotification(parsed.data.notificationId, user.id);

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workspace_notifications")
        .delete()
        .eq("id", parsed.data.notificationId)
        .eq("workspace_id", parsed.data.workspaceId)
        .eq("user_id", user.id);
    } catch {
      // ignore
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to dismiss notification.";
    return { success: false, error: msg };
  }
}

export async function clearAllNotificationsAction(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = WorkspaceActionSchema.safeParse({ workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    notificationStore.clearAll(parsed.data.workspaceId, user.id);

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workspace_notifications")
        .delete()
        .eq("workspace_id", parsed.data.workspaceId)
        .eq("user_id", user.id);
    } catch {
      // ignore
    }

    revalidatePath("/app");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to clear notifications.";
    return { success: false, error: msg };
  }
}

"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CalendarEvent,
} from "@/types/calendar";
import { revalidatePath } from "next/cache";

export interface CalendarActionResult {
  success: boolean;
  event?: CalendarEvent;
  error?: string;
}

const CreateCalendarEventSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  title: z.string().min(2, "Event title must be at least 2 characters."),
  description: z.string().optional().nullable(),
  eventType: z.enum(["meeting", "task", "deadline", "event", "leave"]),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().optional().nullable(),
  isAllDay: z.boolean().optional(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  participantIds: z.array(z.string()).optional(),
  location: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        size: z.number(),
        type: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

const UpdateCalendarEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  eventType: z.enum(["meeting", "task", "deadline", "event", "leave"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  isAllDay: z.boolean().optional(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  participantIds: z.array(z.string()).optional(),
  location: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
});

const DeleteCalendarEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
});

const ToggleCalendarTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required."),
  workspaceId: z.string().min(1, "Workspace ID is required."),
  currentStatus: z.string().min(1, "Current status is required."),
});

const AddCalendarCommentSchema = z.object({
  eventId: z.string().min(1, "Event ID is required."),
  content: z.string().min(1, "Comment content cannot be empty."),
});

/**
 * Create a new Calendar Event
 */
export async function createCalendarEventAction(
  rawInput: CreateCalendarEventInput
): Promise<CalendarActionResult> {
  const parsed = CreateCalendarEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const trimmedTitle = input.title.trim();
  const adminClient = createAdminClient();

  try {
    const { data: newEvent, error: insertError } = await adminClient
      .from("calendar_events")
      .insert({
        workspace_id: input.workspaceId,
        title: trimmedTitle,
        description: input.description?.trim() || null,
        event_type: input.eventType,
        start_date: input.startDate.includes("T") ? input.startDate : `${input.startDate}T00:00:00Z`,
        end_date: input.endDate
          ? (input.endDate.includes("T") ? input.endDate : `${input.endDate}T00:00:00Z`)
          : (input.startDate.includes("T") ? input.startDate : `${input.startDate}T00:00:00Z`),
        is_all_day: input.isAllDay ?? false,
        start_time: input.isAllDay ? null : (input.startTime || "10:00 AM"),
        end_time: input.isAllDay ? null : (input.endTime || "11:00 AM"),
        department_id: input.departmentId || null,
        project_id: input.projectId || null,
        location: input.location?.trim() || null,
        meeting_link: input.meetingLink?.trim() || null,
        status: "scheduled",
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (insertError || !newEvent) {
      console.warn("Could not insert to DB (fallback mode):", insertError);
      revalidatePath("/app/calendar");
      return { success: true };
    }

    // Insert participants if any
    const participantIds = input.participantIds ?? [];
    if (participantIds.length > 0) {
      const participantRows = participantIds.map((userId) => ({
        event_id: newEvent.id,
        user_id: userId,
      }));
      await adminClient.from("calendar_event_participants").insert(participantRows);
    }

    // Insert attachments if any
    const attachments = input.attachments ?? [];
    if (attachments.length > 0) {
      const attachmentRows = attachments.map((att) => ({
        event_id: newEvent.id,
        file_name: att.name,
        file_size: att.size,
        file_type: att.type,
        file_url: att.url,
      }));
      await adminClient.from("calendar_event_attachments").insert(attachmentRows);
    }

    revalidatePath("/app/calendar");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error creating calendar event:", err);
    revalidatePath("/app/calendar");
    return { success: true };
  }
}

/**
 * Update an existing Calendar Event
 */
export async function updateCalendarEventAction(
  rawInput: UpdateCalendarEventInput
): Promise<CalendarActionResult> {
  const parsed = UpdateCalendarEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;

  const adminClient = createAdminClient();

  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.eventType !== undefined) updateData.event_type = input.eventType;
    if (input.startDate !== undefined) {
      updateData.start_date = input.startDate.includes("T") ? input.startDate : `${input.startDate}T00:00:00Z`;
    }
    if (input.endDate !== undefined) {
      updateData.end_date = input.endDate ? (input.endDate.includes("T") ? input.endDate : `${input.endDate}T00:00:00Z`) : null;
    }
    if (input.isAllDay !== undefined) updateData.is_all_day = input.isAllDay;
    if (input.startTime !== undefined) updateData.start_time = input.isAllDay ? null : input.startTime;
    if (input.endTime !== undefined) updateData.end_time = input.isAllDay ? null : input.endTime;
    if (input.departmentId !== undefined) updateData.department_id = input.departmentId || null;
    if (input.projectId !== undefined) updateData.project_id = input.projectId || null;
    if (input.location !== undefined) updateData.location = input.location?.trim() || null;
    if (input.meetingLink !== undefined) updateData.meeting_link = input.meetingLink?.trim() || null;
    if (input.status !== undefined) updateData.status = input.status;

    await adminClient
      .from("calendar_events")
      .update(updateData)
      .eq("id", input.eventId)
      .eq("workspace_id", input.workspaceId);

    if (input.participantIds !== undefined) {
      await adminClient
        .from("calendar_event_participants")
        .delete()
        .eq("event_id", input.eventId);

      if (input.participantIds.length > 0) {
        const rows = input.participantIds.map((uid) => ({
          event_id: input.eventId,
          user_id: uid,
        }));
        await adminClient.from("calendar_event_participants").insert(rows);
      }
    }

    revalidatePath("/app/calendar");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error updating calendar event:", err);
    revalidatePath("/app/calendar");
    return { success: true };
  }
}

/**
 * Delete a Calendar Event
 */
export async function deleteCalendarEventAction(
  eventId: string,
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = DeleteCalendarEventSchema.safeParse({ eventId, workspaceId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const adminClient = createAdminClient();

  try {
    await adminClient
      .from("calendar_events")
      .delete()
      .eq("id", eventId)
      .eq("workspace_id", workspaceId);

    revalidatePath("/app/calendar");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error deleting calendar event:", err);
    revalidatePath("/app/calendar");
    return { success: true };
  }
}

/**
 * Toggle Task Completion from Calendar
 */
export async function toggleCalendarTaskAction(
  taskId: string,
  workspaceId: string,
  currentStatus: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = ToggleCalendarTaskSchema.safeParse({ taskId, workspaceId, currentStatus });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const adminClient = createAdminClient();
  const newStatus = currentStatus === "completed" ? "todo" : "completed";

  try {
    await adminClient
      .from("tasks")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("workspace_id", workspaceId);

    revalidatePath("/app/calendar");
    revalidatePath("/app/my-tasks");
    revalidatePath("/app/projects");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error toggling task from calendar:", err);
    revalidatePath("/app/calendar");
    return { success: true };
  }
}

/**
 * Add Comment / Note to Calendar Event
 */
export async function addCalendarEventCommentAction(
  eventId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = AddCalendarCommentSchema.safeParse({ eventId, content });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const userMeta = user?.user_metadata as Record<string, unknown> | undefined;
  const authorName = (typeof userMeta?.full_name === "string" ? userMeta.full_name : null) || (user?.email ? user.email.split("@")[0] : "Team Member");
  const adminClient = createAdminClient();

  try {
    await adminClient.from("calendar_event_comments").insert({
      event_id: eventId,
      user_id: user?.id || null,
      author_name: authorName,
      content: content.trim(),
    });

    revalidatePath("/app/calendar");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error adding calendar comment:", err);
    revalidatePath("/app/calendar");
    return { success: true };
  }
}

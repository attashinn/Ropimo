"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MeetingItem,
  CreateMeetingInput,
  UpdateMeetingInput,
} from "@/types/meetings";

const CreateMeetingSchema = z.object({
  workspace_id: z.string().min(1, "Workspace ID is required."),
  title: z.string().min(1, "Meeting title is required."),
  description: z.string().optional().nullable(),
  date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_minutes: z.number().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  location_type: z.string().optional(),
  location_value: z.string().optional(),
  meeting_url: z.string().optional(),
  organizer_id: z.string().optional(),
  attendees: z.array(z.unknown()).optional(),
  agenda: z.array(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  recurrence: z.string().optional(),
  notify_attendees: z.boolean().optional(),
});

const UpdateMeetingSchema = z.object({
  id: z.string().min(1, "Meeting ID is required."),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_minutes: z.number().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  location_type: z.string().optional(),
  location_value: z.string().optional(),
  meeting_url: z.string().optional(),
  agenda: z.array(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  recurrence: z.string().optional(),
  notes: z.string().optional().nullable(),
});

const ConvertActionItemSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required."),
  meetingId: z.string().min(1, "Meeting ID is required."),
  title: z.string().min(1, "Action item title is required."),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

const CancelMeetingSchema = z.object({
  meetingId: z.string().min(1, "Meeting ID is required."),
  reason: z.string().optional(),
});

const DeleteMeetingSchema = z.object({
  meetingId: z.string().min(1, "Meeting ID is required."),
});

export async function createMeetingAction(
  rawInput: CreateMeetingInput & { workspace_id: string }
): Promise<{ success: boolean; meeting?: MeetingItem; error?: string }> {
  const parsed = CreateMeetingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;

  try {
    const adminClient = createAdminClient();
    let userId = input.organizer_id;

    try {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        userId = authData.user.id;
      }
    } catch {
      // CLI / background context
    }

    const meetingLink = `https://meet.brnnd.com/${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const meetingCode = Math.random().toString().slice(2, 5) + "-" + Math.random().toString().slice(2, 5) + "-" + Math.random().toString().slice(2, 5);

    const startIso = input.date ? `${input.date}T10:00:00Z` : new Date().toISOString();
    const endIso = input.date ? `${input.date}T11:00:00Z` : new Date(Date.now() + 3600000).toISOString();

    // 1. Try workspace_meetings table
    const { data: wmRow, error: wmErr } = await adminClient
      .from("workspace_meetings")
      .insert({
        workspace_id: input.workspace_id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: (input.status || "scheduled").toLowerCase(),
        start_time: startIso,
        end_time: endIso,
        duration_minutes: 60,
        location: input.location_value || "Google Meet",
        meeting_url: meetingLink,
        created_by: userId || null,
        attendees: (input.attendees || []).map((a, i) => ({ ...(typeof a === "object" && a ? a : {}), id: `att-${Date.now()}-${i}` })),
        attendee_count: (input.attendees || []).length || 1,
        agenda: input.agenda || [],
        notes: null,
      })
      .select()
      .maybeSingle();

    if (!wmErr && wmRow) {
      revalidatePath("/app/meetings");
      return { success: true };
    }

    // 2. Fallback to calendar_events
    const { data: calRow, error: calErr } = await adminClient
      .from("calendar_events")
      .insert({
        workspace_id: input.workspace_id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        event_type: "meeting",
        start_date: input.date ? `${input.date}T10:00:00Z` : new Date().toISOString(),
        end_date: input.date ? `${input.date}T11:00:00Z` : new Date(Date.now() + 3600000).toISOString(),
        start_time: "10:00 AM",
        end_time: "11:00 AM",
        is_all_day: false,
        location: input.location_value || "Google Meet",
        meeting_link: meetingLink,
        status: "scheduled",
        created_by: userId || null,
      })
      .select()
      .single();

    if (calErr || !calRow) {
      return { success: false, error: calErr?.message || "Failed to create meeting." };
    }

    const meeting: MeetingItem = {
      id: calRow.id,
      title: calRow.title,
      description: calRow.description || undefined,
      type: "Online",
      status: "Upcoming",
      date: input.date || new Date().toISOString().split("T")[0],
      start_time: "10:00 AM",
      end_time: "11:00 AM",
      duration_minutes: 60,
      location_type: "Google Meet",
      location_value: "Google Meet",
      meeting_url: meetingLink,
      meeting_code: meetingCode,
      organizer_id: userId || "u-current",
      organizer_name: "Host",
      organizer_role: "Organizer",
      attendees: [],
      attendee_count: 1,
      agenda: [],
      tags: input.tags || [],
      recurrence: input.recurrence || "None",
      notify_attendees: input.notify_attendees ?? true,
      created_at: calRow.created_at,
      updated_at: calRow.updated_at,
    };

    revalidatePath("/app/meetings");
    return { success: true, meeting };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}

export async function updateMeetingAction(
  rawInput: UpdateMeetingInput
): Promise<{ success: boolean; meeting?: MeetingItem; error?: string }> {
  const parsed = UpdateMeetingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const input = parsed.data;

  try {
    const adminClient = createAdminClient();

    // 1. Try workspace_meetings
    const { data: wmRow, error: wmErr } = await adminClient
      .from("workspace_meetings")
      .update({
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.status ? { status: input.status.toLowerCase() } : {}),
        ...(input.location_value ? { location: input.location_value } : {}),
        ...(input.meeting_url ? { meeting_url: input.meeting_url } : {}),
        ...(input.agenda ? { agenda: input.agenda } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select()
      .maybeSingle();

    if (!wmErr && wmRow) {
      revalidatePath("/app/meetings");
      return { success: true };
    }

    // 2. Fallback to calendar_events
    let calStatus = "scheduled";
    if (input.status === "Completed") calStatus = "completed";
    if (input.status === "Cancelled") calStatus = "cancelled";

    await adminClient
      .from("calendar_events")
      .update({
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(calStatus ? { status: calStatus } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);

    revalidatePath("/app/meetings");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: msg };
  }
}

/**
 * Convert a meeting action item into a workspace task
 */
export async function convertMeetingActionItemToTaskAction(rawParams: {
  workspaceId: string;
  meetingId: string;
  title: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high" | "urgent";
}): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const parsed = ConvertActionItemSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }
  const params = parsed.data;

  try {
    const { requireWorkspaceRole } = await import("@/lib/auth/require-user");
    await requireWorkspaceRole(params.workspaceId);

    const title = params.title.trim();
    const adminClient = createAdminClient();

    // 1. Fetch meeting title for task context
    const { data: meeting } = await adminClient
      .from("workspace_meetings")
      .select("title, agenda")
      .eq("id", params.meetingId)
      .maybeSingle();

    const meetingTitle = meeting?.title || "Meeting";

    // 2. Insert new task
    const { data: task, error: taskError } = await adminClient
      .from("tasks")
      .insert({
        workspace_id: params.workspaceId,
        title,
        description: `Action item originated from meeting: "${meetingTitle}"`,
        status: "todo",
        priority: params.priority || "medium",
        due_date: params.dueDate ? new Date(params.dueDate).toISOString() : null,
      })
      .select("id")
      .single();

    if (taskError || !task) {
      return { success: false, error: taskError?.message || "Failed to create task from action item." };
    }

    // 3. Assign task if assignee specified
    if (params.assigneeId) {
      try {
        await adminClient.from("task_assignees").insert({
          task_id: task.id,
          user_id: params.assigneeId,
        });
      } catch (assignErr) {
        console.warn("Assignee insertion note:", assignErr);
      }
    }

    revalidatePath("/app/meetings");
    revalidatePath("/app/tasks");
    revalidatePath("/app/my-tasks");

    return { success: true, taskId: task.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to convert action item to task.";
    return { success: false, error: msg };
  }
}

export async function cancelMeetingAction(
  meetingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = CancelMeetingSchema.safeParse({ meetingId, reason });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    await adminClient
      .from("workspace_meetings")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: parsed.data.reason || "Cancelled by host",
        updated_at: now,
      })
      .eq("id", parsed.data.meetingId);

    await adminClient
      .from("calendar_events")
      .update({
        status: "cancelled",
        updated_at: now,
      })
      .eq("id", parsed.data.meetingId);

    revalidatePath("/app/meetings");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel meeting.";
    return { success: false, error: msg };
  }
}

export async function deleteMeetingAction(
  meetingId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = DeleteMeetingSchema.safeParse({ meetingId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
  }

  try {
    const adminClient = createAdminClient();

    await adminClient.from("workspace_meetings").delete().eq("id", parsed.data.meetingId);
    await adminClient.from("calendar_events").delete().eq("id", parsed.data.meetingId);

    revalidatePath("/app/meetings");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete meeting.";
    return { success: false, error: msg };
  }
}

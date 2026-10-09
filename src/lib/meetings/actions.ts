"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MeetingItem,
  CreateMeetingInput,
  UpdateMeetingInput,
} from "@/types/meetings";

export async function createMeetingAction(
  input: CreateMeetingInput & { workspace_id: string }
): Promise<{ success: boolean; meeting?: MeetingItem; error?: string }> {
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

    // 1. Try workspace_meetings table
    const { data: wmRow, error: wmErr } = await adminClient
      .from("workspace_meetings")
      .insert({
        workspace_id: input.workspace_id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        status: "Upcoming",
        date: input.date,
        start_time: input.start_time,
        end_time: input.end_time,
        duration_minutes: 60,
        timezone: input.timezone || "Asia/Dhaka",
        organizer_id: userId || null,
        organizer_name: "Tashin Khan",
        department_id: input.department_id || null,
        project_id: input.project_id || null,
        attendees: (input.attendees || []).map((a, i) => ({ ...a, id: `att-${Date.now()}-${i}` })),
        attendee_count: (input.attendees || []).length || 1,
        agenda: (input.agenda || []).map((a, i) => ({ ...a, id: `ag-${Date.now()}-${i}` })),
        attachments: (input.attachments || []).map((a, i) => ({ ...a, id: `attach-${Date.now()}-${i}` })),
        location_type: input.location_type || "Video",
        location_value: input.location_value || null,
        meeting_link: meetingLink,
        meeting_id_code: meetingCode,
        is_recurring: input.is_recurring || false,
        recurrence: input.recurrence || "None",
        notify_attendees: input.notify_attendees ?? true,
      })
      .select()
      .single();

    if (!wmErr && wmRow) {
      revalidatePath("/app/meetings");
      return { success: true, meeting: wmRow as unknown as MeetingItem };
    }

    // 2. Fallback to calendar_events table
    const startIso = `${input.date}T10:00:00Z`;
    const { data: calRow, error: calErr } = await adminClient
      .from("calendar_events")
      .insert({
        workspace_id: input.workspace_id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        event_type: "meeting",
        start_date: startIso,
        end_date: startIso,
        is_all_day: false,
        start_time: input.start_time,
        end_time: input.end_time,
        department_id: input.department_id || null,
        project_id: input.project_id || null,
        location: input.location_value || null,
        meeting_link: meetingLink,
        status: "scheduled",
        created_by: userId || null,
      })
      .select()
      .single();

    if (calErr) {
      return { success: false, error: calErr.message || "Failed to create meeting." };
    }

    const meeting: MeetingItem = {
      id: calRow.id,
      workspace_id: calRow.workspace_id,
      title: calRow.title,
      description: calRow.description || "",
      type: input.type,
      status: "Upcoming",
      date: input.date,
      start_time: input.start_time,
      end_time: input.end_time,
      duration_minutes: 60,
      timezone: input.timezone || "Asia/Dhaka",
      organizer_id: userId || "user-lead",
      organizer_name: "Tashin Khan",
      department_id: input.department_id,
      project_id: input.project_id,
      attendees: (input.attendees || []).map((a, i) => ({ ...a, id: `att-${i}` })),
      attendee_count: (input.attendees || []).length || 1,
      agenda: [],
      attachments: [],
      location_type: input.location_type || "Video",
      location_value: input.location_value,
      meeting_link: meetingLink,
      meeting_id_code: meetingCode,
      is_recurring: input.is_recurring || false,
      recurrence: input.recurrence || "None",
      notify_attendees: input.notify_attendees ?? true,
      created_at: calRow.created_at,
      updated_at: calRow.updated_at,
    };

    revalidatePath("/app/meetings");
    return { success: true, meeting };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function updateMeetingAction(
  input: UpdateMeetingInput
): Promise<{ success: boolean; meeting?: MeetingItem; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Try workspace_meetings
    const { data: wmRow, error: wmErr } = await adminClient
      .from("workspace_meetings")
      .update({
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.date ? { date: input.date } : {}),
        ...(input.start_time ? { start_time: input.start_time } : {}),
        ...(input.end_time ? { end_time: input.end_time } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.cancellation_reason ? { cancellation_reason: input.cancellation_reason } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select()
      .maybeSingle();

    if (!wmErr && wmRow) {
      revalidatePath("/app/meetings");
      return { success: true, meeting: wmRow as unknown as MeetingItem };
    }

    // 2. Fallback to calendar_events
    let calStatus: string | undefined;
    if (input.status === "Completed") calStatus = "completed";
    else if (input.status === "Cancelled") calStatus = "cancelled";
    else if (input.status === "Live") calStatus = "in_progress";
    else if (input.status === "Upcoming") calStatus = "scheduled";

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
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function cancelMeetingAction(
  meetingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    await adminClient
      .from("workspace_meetings")
      .update({
        status: "Cancelled",
        cancelled_at: now,
        cancellation_reason: reason || "Cancelled by host",
        updated_at: now,
      })
      .eq("id", meetingId);

    await adminClient
      .from("calendar_events")
      .update({
        status: "cancelled",
        updated_at: now,
      })
      .eq("id", meetingId);

    revalidatePath("/app/meetings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel meeting." };
  }
}

export async function deleteMeetingAction(
  meetingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    await adminClient.from("workspace_meetings").delete().eq("id", meetingId);
    await adminClient.from("calendar_events").delete().eq("id", meetingId);

    revalidatePath("/app/meetings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete meeting." };
  }
}

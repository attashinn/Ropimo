"use server";

import {
  MeetingItem,
  CreateMeetingInput,
  UpdateMeetingInput,
  MeetingAttendee,
  MeetingAgendaItem,
  MeetingAttachment,
} from "@/types/meetings";
import { DEFAULT_MEETINGS_DATA } from "./queries";

// ─── In-memory store ──────────────────────────────────────────────────────────
// Uses a module-level array seeded from DEFAULT_MEETINGS_DATA.
// In production, replace each action body with actual Supabase queries.
let _store: MeetingItem[] | null = null;

function getStore(): MeetingItem[] {
  if (!_store) {
    _store = [...DEFAULT_MEETINGS_DATA];
  }
  return _store;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createMeetingAction(
  input: CreateMeetingInput & { workspace_id: string }
): Promise<{ success: boolean; meeting?: MeetingItem; error?: string }> {
  try {
    const now = new Date().toISOString();
    const newMeeting: MeetingItem = {
      id: `meet-${Date.now()}`,
      workspace_id: input.workspace_id,
      title: input.title,
      description: input.description,
      type: input.type,
      status: "Upcoming",
      date: input.date,
      start_time: input.start_time,
      end_time: input.end_time,
      duration_minutes: 60,
      timezone: input.timezone ?? "Asia/Dhaka",
      organizer_id: input.organizer_id ?? "u-tashin",
      organizer_name: "Tashin Khan",
      organizer_role: "Development Lead",
      organizer_avatar: null,
      department_id: input.department_id,
      project_id: input.project_id,
      attendees: (input.attendees ?? []).map((a, i) => ({ ...a, id: `att-new-${i}` })),
      attendee_count: (input.attendees ?? []).length,
      agenda: (input.agenda ?? []).map((a, i) => ({ ...a, id: `ag-new-${i}` })),
      attachments: (input.attachments ?? []).map((a, i) => ({ ...a, id: `attach-new-${i}` })),
      location_type: input.location_type ?? "Video",
      location_value: input.location_value,
      meeting_link: `https://meet.brnnd.com/${input.title.toLowerCase().replace(/\s+/g, "-")}`,
      meeting_id_code:
        Math.random().toString().slice(2, 5) +
        "-" +
        Math.random().toString().slice(2, 5) +
        "-" +
        Math.random().toString().slice(2, 5),
      is_recurring: input.is_recurring ?? false,
      recurrence: input.recurrence,
      notify_attendees: input.notify_attendees ?? true,
      created_at: now,
      updated_at: now,
    };
    const store = getStore();
    store.unshift(newMeeting);
    return { success: true, meeting: newMeeting };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateMeetingAction(
  input: UpdateMeetingInput
): Promise<{ success: boolean; meeting?: MeetingItem; error?: string }> {
  try {
    const store = getStore();
    const idx = store.findIndex((m) => m.id === input.id);
    if (idx === -1) return { success: false, error: "Meeting not found" };

    const attendees: MeetingAttendee[] = input.attendees
      ? input.attendees.map((a, i) => ({
          ...a,
          id: (a as any).id || `att-${Date.now()}-${i}`,
        }))
      : store[idx].attendees;

    const agenda: MeetingAgendaItem[] = input.agenda
      ? input.agenda.map((ag, i) => ({
          ...ag,
          id: (ag as any).id || `ag-${Date.now()}-${i}`,
        }))
      : store[idx].agenda;

    const attachments: MeetingAttachment[] = input.attachments
      ? input.attachments.map((at, i) => ({
          ...at,
          id: (at as any).id || `at-${Date.now()}-${i}`,
        }))
      : store[idx].attachments;

    const updated: MeetingItem = {
      ...store[idx],
      ...input,
      attendees,
      agenda,
      attachments,
      updated_at: new Date().toISOString(),
    };
    store[idx] = updated;
    return { success: true, meeting: updated };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function cancelMeetingAction(
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const store = getStore();
    const idx = store.findIndex((m) => m.id === id);
    if (idx === -1) return { success: false, error: "Meeting not found" };
    store[idx] = {
      ...store[idx],
      status: "Cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteMeetingAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const store = getStore();
    const idx = store.findIndex((m) => m.id === id);
    if (idx === -1) return { success: false, error: "Meeting not found" };
    store.splice(idx, 1);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MeetingItem,
  MeetingStats,
  MeetingInsights,
  MeetingType,
  MeetingStatus,
} from "@/types/meetings";
import { Tables } from "@/types/database";

export const getWorkspaceMeetings = cache(
  async (
    workspaceId: string,
    options?: {
      status?: string;
      date?: string;
      departmentId?: string;
      projectId?: string;
    }
  ): Promise<MeetingItem[]> => {
    if (!workspaceId) return [];

    const adminClient = createAdminClient();

    // 1. Try querying dedicated workspace_meetings table
    const { data: wmRows, error: wmErr } = await adminClient
      .from("workspace_meetings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("start_time", { ascending: false });

    if (!wmErr && wmRows && wmRows.length > 0) {
      let list: MeetingItem[] = wmRows.map((r: Tables<"workspace_meetings">) => {
        const rawDate = r.start_time
          ? new Date(r.start_time).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        const rawStartTime = r.start_time
          ? new Date(r.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "10:00 AM";
        const rawEndTime = r.end_time
          ? new Date(r.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "11:00 AM";
        let status: MeetingStatus = "Upcoming";
        if (r.status === "completed") status = "Completed";
        else if (r.status === "cancelled") status = "Cancelled";
        else if (r.status === "in_progress") status = "Live";

        return {
          id: r.id,
          workspace_id: r.workspace_id,
          title: r.title,
          description: r.description || "",
          type: ((r as unknown as Record<string, unknown>).type || "Internal") as MeetingType,
          status,
          date: rawDate,
          start_time: rawStartTime,
          end_time: rawEndTime,
          duration_minutes: 60,
          timezone: "Asia/Dhaka",
          organizer_id: r.created_by || "user-organizer",
          organizer_name: "Organizer",
          attendees: [],
          attendee_count: 1,
          agenda: [],
          attachments: [],
          location_type:
            r.location?.includes("http") || r.meeting_url ? "Video" : "Physical",
          location_value: r.location || undefined,
          location_details: r.location || r.meeting_url || "Main Office",
          meeting_link: r.meeting_url || undefined,
          meeting_id_code: r.id.substring(0, 8),
          is_recurring: false,
          notify_attendees: true,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      });

      if (options?.status && options.status !== "All") {
        list = list.filter((m) => m.status === options.status);
      }
      if (options?.date) {
        list = list.filter((m) => m.date === options.date);
      }
      return list;
    }

    // 2. Fallback to calendar_events table where event_type = 'meeting'
    const { data: calRows, error: calErr } = await adminClient
      .from("calendar_events")
      .select(`
        *,
        departments:department_id (id, name, color),
        projects:project_id (id, name, color)
      `)
      .eq("workspace_id", workspaceId)
      .eq("event_type", "meeting")
      .order("start_date", { ascending: false });

    if (!calErr && calRows) {
      const meetings: MeetingItem[] = calRows.map((r) => {
        const rawDate = r.start_date ? new Date(r.start_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
        let status: MeetingStatus = "Upcoming";
        if (r.status === "completed") status = "Completed";
        else if (r.status === "cancelled") status = "Cancelled";
        else if (r.status === "in_progress") status = "Live";

        return {
          id: r.id,
          workspace_id: r.workspace_id,
          title: r.title,
          description: r.description || "",
          type: "Internal" as MeetingType,
          status,
          date: rawDate,
          start_time: r.start_time || "10:00 AM",
          end_time: r.end_time || "11:00 AM",
          duration_minutes: 60,
          timezone: "Asia/Dhaka",
          organizer_id: r.created_by || "user-organizer",
          organizer_name: "Team Lead",
          department_id: r.department_id || undefined,
          department_name: r.departments?.name,
          project_id: r.project_id || undefined,
          project_name: r.projects?.name,
          attendees: [],
          attendee_count: 1,
          agenda: [],
          attachments: [],
          location_type: r.location ? "Physical" : "Video",
          location_value: r.location || undefined,
          meeting_link: r.meeting_link || undefined,
          meeting_id_code: r.id.substring(0, 8),
          is_recurring: false,
          notify_attendees: true,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      });

      return meetings;
    }

    return [];
  }
);

export const getMeetingStats = cache(
  async (workspaceId: string): Promise<MeetingStats> => {
    const meetings = await getWorkspaceMeetings(workspaceId);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const sevenDaysLater = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let upcomingThisWeek = 0;
    let totalAttended = 0;
    let totalMinutes = 0;
    let cancelledThisMonth = 0;

    for (const m of meetings) {
      if ((m.status === "Upcoming" || m.status === "Live") && m.date >= todayStr && m.date <= sevenDaysLater) {
        upcomingThisWeek++;
      }
      if (m.status === "Completed") {
        totalAttended++;
        totalMinutes += m.duration_minutes || 60;
      }
      if (m.status === "Cancelled" && m.date.startsWith(currentMonthPrefix)) {
        cancelledThisMonth++;
      }
    }

    return {
      totalMeetings: meetings.length,
      upcomingThisWeek,
      totalAttended,
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      cancelledThisMonth,
    };
  }
);

export const getMeetingInsights = cache(
  async (workspaceId: string): Promise<MeetingInsights> => {
    const meetings = await getWorkspaceMeetings(workspaceId);
    let meetingsHeld = 0;
    let totalParticipants = 0;
    let totalMinutes = 0;
    let meetingsCancelled = 0;

    for (const m of meetings) {
      if (m.status === "Completed") {
        meetingsHeld++;
        totalParticipants += m.attendee_count || 1;
        totalMinutes += m.duration_minutes || 60;
      } else if (m.status === "Cancelled") {
        meetingsCancelled++;
      }
    }

    return {
      meetingsHeld,
      totalParticipants,
      avgMeetingMinutes: meetingsHeld > 0 ? Math.round(totalMinutes / meetingsHeld) : 0,
      meetingsCancelled,
    };
  }
);

export const getMeetingById = cache(
  async (meetingId: string): Promise<MeetingItem | null> => {
    const adminClient = createAdminClient();

    const { data: wm } = await adminClient
      .from("workspace_meetings")
      .select("*")
      .eq("id", meetingId)
      .maybeSingle();

    if (wm) {
      return wm as unknown as MeetingItem;
    }

    const { data: cal } = await adminClient
      .from("calendar_events")
      .select(`
        *,
        departments:department_id (id, name, color),
        projects:project_id (id, name, color)
      `)
      .eq("id", meetingId)
      .maybeSingle();

    if (cal) {
      const rawDate = cal.start_date ? new Date(cal.start_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      return {
        id: cal.id,
        workspace_id: cal.workspace_id,
        title: cal.title,
        description: cal.description || "",
        type: "Internal" as MeetingType,
        status: (cal.status === "completed" ? "Completed" : cal.status === "cancelled" ? "Cancelled" : "Upcoming") as MeetingStatus,
        date: rawDate,
        start_time: cal.start_time || "10:00 AM",
        end_time: cal.end_time || "11:00 AM",
        duration_minutes: 60,
        timezone: "Asia/Dhaka",
        organizer_id: cal.created_by || "user-organizer",
        organizer_name: "Team Lead",
        department_id: cal.department_id || undefined,
        department_name: cal.departments?.name,
        project_id: cal.project_id || undefined,
        project_name: cal.projects?.name,
        attendees: [],
        attendee_count: 1,
        agenda: [],
        attachments: [],
        location_type: cal.location ? "Physical" : "Video",
        location_value: cal.location || undefined,
        meeting_link: cal.meeting_link || undefined,
        meeting_id_code: cal.id.substring(0, 8),
        is_recurring: false,
        notify_attendees: true,
        created_at: cal.created_at || new Date().toISOString(),
        updated_at: cal.updated_at || new Date().toISOString(),
      };
    }

    return null;
  }
);

export type { MeetingInsights, MeetingStats };

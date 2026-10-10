/**
 * RFC 5545 iCalendar (.ics) Generation and Utilities
 *
 * Fully compliant with Google Calendar, Apple Calendar, and Outlook:
 * - Generates VCALENDAR / VEVENT blocks
 * - Persistent UID per interview
 * - Incremental SEQUENCE for reschedules and updates
 * - METHOD:REQUEST for new/reschedule, METHOD:CANCEL for cancellations
 * - STATUS:CONFIRMED or STATUS:CANCELLED
 */

export interface IcsEventOptions {
  uid: string;
  sequence?: number;
  title?: string;
  roundName?: string;
  candidateName?: string;
  jobTitle?: string;
  interviewerNames?: string[];
  meetingUrl?: string;
  description?: string;
  location?: string;
  startDate?: Date;
  scheduledAt?: string | Date;
  durationMinutes: number;
  timezone?: string;
  status?: "CONFIRMED" | "CANCELLED";
  method?: "REQUEST" | "CANCEL";
  organizerName?: string;
  organizerEmail?: string;
  attendees?: Array<{
    name: string;
    email: string;
    role?: "REQ-PARTICIPANT" | "OPT-PARTICIPANT";
  }>;
  url?: string;
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generates valid RFC 5545 .ics text content.
 */
export function generateIcsContent(options: IcsEventOptions): string {
  const sequence = options.sequence ?? 0;
  const status = options.status ?? "CONFIRMED";
  const method = options.method ?? (status === "CANCELLED" ? "CANCEL" : "REQUEST");

  const rawStart = options.startDate || options.scheduledAt;
  const startDate = typeof rawStart === "string" ? new Date(rawStart) : (rawStart instanceof Date ? rawStart : new Date());
  const dtStart = formatIcsDate(startDate);
  const endDate = new Date(startDate.getTime() + options.durationMinutes * 60 * 1000);
  const dtEnd = formatIcsDate(endDate);
  const dtStamp = formatIcsDate(new Date());

  const summary =
    options.title ||
    (options.roundName && options.candidateName
      ? `Interview: ${options.roundName} — ${options.candidateName}`
      : options.roundName || "Interview");

  const organizerName = options.organizerName || "Ropimo Recruitment Team";
  const organizerEmail = options.organizerEmail || "hr@ropimo.com";
  const meetingUrl = options.url || options.meetingUrl;
  const location = options.location || meetingUrl || "Online";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ropimo//Hiring Calendar//EN",
    `METHOD:${method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${options.uid}`,
    `SEQUENCE:${sequence}`,
    `STATUS:${status}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
  ];

  const desc =
    options.description ||
    (options.jobTitle
      ? `Interview for ${options.jobTitle}\nRound: ${options.roundName || "Interview"}${
          options.interviewerNames ? `\nInterviewers: ${options.interviewerNames.join(", ")}` : ""
        }${meetingUrl ? `\nMeeting: ${meetingUrl}` : ""}`
      : undefined);

  if (desc) {
    lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
  }

  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }

  if (meetingUrl) {
    lines.push(`URL:${meetingUrl}`);
  }

  lines.push(`ORGANIZER;CN=${escapeIcsText(organizerName)}:mailto:${organizerEmail}`);

  if (options.attendees && options.attendees.length > 0) {
    for (const att of options.attendees) {
      const role = att.role || "REQ-PARTICIPANT";
      lines.push(
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=${role};PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeIcsText(
          att.name
        )}:mailto:${att.email}`
      );
    }
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/**
 * Formats date and time into readable format with specified timezone.
 */
export function formatInterviewDateTime(
  dateIso: string,
  timeZone: string = "Asia/Dhaka"
): { dateStr: string; timeStr: string; fullStr: string } {
  try {
    const d = new Date(dateIso);
    const dateStr = d.toLocaleDateString("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    return {
      dateStr,
      timeStr,
      fullStr: `${dateStr} at ${timeStr}`,
    };
  } catch {
    const d = new Date(dateIso);
    return {
      dateStr: d.toDateString(),
      timeStr: d.toTimeString().substring(0, 5),
      fullStr: d.toLocaleString(),
    };
  }
}

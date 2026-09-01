"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MeetingItem } from "@/types/meetings";
import { PrimaryButton } from "@/components/ui/primary-button";
import { cn } from "@/lib/utils";
import { cancelMeetingAction, deleteMeetingAction } from "@/lib/meetings/actions";

// ─── Inline Icons ──────────────────────────────────────────────────────────────
function IconCalendar({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconClock({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconVideo({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}
function IconUsers({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconMapPin({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconRepeat({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function IconLink({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconChevronLeft({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconMoreVertical({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}
function IconX({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconTrash({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}
function IconEdit({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconCopy({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconFileText({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconCheckCircle({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MEETING_TYPE_COLORS: Record<string, string> = {
  Internal: "bg-[#EAF4E2] text-[#2D6A3F] border border-[#B2DEB8]",
  Client: "bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]",
  Department: "bg-[#FFF7ED] text-[#92400E] border border-[#FED7AA]",
  "One-on-one": "bg-[#F0F9FF] text-[#0369A1] border border-[#BAE6FD]",
  Interview: "bg-[#FDF4FF] text-[#7E22CE] border border-[#E9D5FF]",
  Training: "bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3]",
};

const STATUS_COLORS: Record<string, string> = {
  Upcoming: "bg-[#EAF4E2] text-[#2D6A3F] border border-[#B2DEB8]",
  Live: "bg-[#FFF7ED] text-[#D97706] border border-[#FED7AA]",
  Completed: "bg-[#F0F9FF] text-[#0369A1] border border-[#BAE6FD]",
  Cancelled: "bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3]",
};

const AVATAR_BG = [
  "bg-[#10251F] text-[#C7F34A]",
  "bg-[#3730A3] text-white",
  "bg-[#D97706] text-white",
  "bg-[#0369A1] text-white",
  "bg-[#7E22CE] text-white",
  "bg-[#9F1239] text-white",
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`;
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium",
      type === "success" ? "bg-white border-[#B2DEB8] text-[#2D6A3F]" : "bg-white border-red-200 text-red-700"
    )}>
      <span className={cn("w-2 h-2 rounded-full", type === "success" ? "bg-[#2D6A3F]" : "bg-red-600")} />
      {msg}
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface MeetingDetailViewProps {
  meeting: MeetingItem;
  workspaceName?: string;
}

export function MeetingDetailView({ meeting, workspaceName = "brnnd" }: MeetingDetailViewProps) {
  const router = useRouter();
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCancel() {
    const res = await cancelMeetingAction(meeting.id, "Cancelled by organizer");
    if (res.success) {
      showToast("Meeting cancelled");
      setTimeout(() => router.push("/app/meetings"), 1500);
    } else {
      showToast(res.error ?? "Failed to cancel", "error");
    }
    setActionMenuOpen(false);
  }

  async function handleDelete() {
    const res = await deleteMeetingAction(meeting.id);
    if (res.success) {
      showToast("Meeting deleted");
      setTimeout(() => router.push("/app/meetings"), 1500);
    } else {
      showToast(res.error ?? "Failed to delete", "error");
    }
    setActionMenuOpen(false);
  }

  function handleJoin() {
    if (meeting.meeting_link) {
      window.open(meeting.meeting_link, "_blank");
    } else {
      showToast("No video link configured for this meeting");
    }
  }

  function handleCopyLink() {
    const link = meeting.meeting_link ?? `https://meet.brnnd.com/join/${meeting.meeting_id_code?.replace(/-/g, "")}`;
    navigator.clipboard.writeText(link).then(() => showToast("Meeting link copied"));
    setActionMenuOpen(false);
  }

  // Close dropdown on outside click
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-action-menu]")) {
        setActionMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isCancelled = meeting.status === "Cancelled";
  const isUpcoming = meeting.status === "Upcoming" || meeting.status === "Live";

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-[#D8DDD4]">
        <div>
          <p className="text-xs text-[#65706A] mb-1 flex items-center gap-1">
            <Link href="/app" className="hover:text-[#18221E] transition-colors">{workspaceName}</Link>
            {" / "}
            <Link href="/app/meetings" className="hover:text-[#18221E] transition-colors">Meetings</Link>
            {" / "}
            <span className="text-[#18221E] font-medium">{meeting.title}</span>
          </p>
          <div className="flex items-center gap-2.5 mt-1">
            <Link
              href="/app/meetings"
              className="flex items-center gap-1 text-xs text-[#65706A] hover:text-[#18221E] transition-colors"
            >
              <IconChevronLeft size={13} />
              Back
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#18221E]">{meeting.title}</h1>
            <span className={cn(
              "inline-block px-2 py-0.5 rounded text-[10px] font-semibold leading-tight",
              STATUS_COLORS[meeting.status] ?? "bg-[#E7EADF] text-[#65706A]"
            )}>
              {meeting.status}
            </span>
          </div>
          {meeting.description && (
            <p className="text-sm text-[#65706A] mt-0.5">{meeting.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isUpcoming && (
            <PrimaryButton size="sm" onClick={handleJoin}>
              Join Meeting
            </PrimaryButton>
          )}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#D8DDD4] bg-white text-xs font-medium text-[#18221E] hover:bg-[#F4F3EE] transition-colors"
          >
            <IconLink size={13} />
            Copy Link
          </button>
          <div className="relative" data-action-menu>
            <button
              onClick={() => setActionMenuOpen(o => !o)}
              className="flex items-center justify-center w-8 h-8 rounded-md border border-[#D8DDD4] bg-white hover:bg-[#F4F3EE] transition-colors text-[#65706A]"
            >
              <IconMoreVertical size={15} />
            </button>
            {actionMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#D8DDD4] rounded-lg shadow-lg z-30 py-1">
                {isUpcoming && (
                  <button
                    onClick={() => setActionMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#18221E] hover:bg-[#F4F3EE]"
                  >
                    <IconEdit size={13} className="text-[#65706A]" /> Edit meeting
                  </button>
                )}
                <button
                  onClick={() => setActionMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#18221E] hover:bg-[#F4F3EE]"
                >
                  <IconCopy size={13} className="text-[#65706A]" /> Duplicate
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#18221E] hover:bg-[#F4F3EE]"
                >
                  <IconLink size={13} className="text-[#65706A]" /> Copy meeting link
                </button>
                {isUpcoming && (
                  <>
                    <div className="border-t border-[#D8DDD4] my-1" />
                    <button
                      onClick={handleCancel}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50"
                    >
                      <IconX size={13} /> Cancel meeting
                    </button>
                  </>
                )}
                <div className="border-t border-[#D8DDD4] my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  <IconTrash size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex gap-4 items-start">
        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Meeting info card */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg">
            <div className="px-4 py-3 border-b border-[#D8DDD4]">
              <h2 className="text-xs font-bold text-[#18221E]">Meeting Details</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#EAF4E2]">
                  <IconCalendar size={13} className="text-[#2D6A3F]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65706A] leading-none mb-0.5">Date</p>
                  <p className="text-xs font-medium text-[#18221E]">{formatDate(meeting.date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FFF7ED]">
                  <IconClock size={13} className="text-[#D97706]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65706A] leading-none mb-0.5">Time</p>
                  <p className="text-xs font-medium text-[#18221E]">{meeting.start_time} – {meeting.end_time}</p>
                  <p className="text-[10px] text-[#65706A]">{durationLabel(meeting.duration_minutes)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#EEF2FF]">
                  {meeting.location_type === "Physical"
                    ? <IconMapPin size={13} className="text-[#3730A3]" />
                    : <IconVideo size={13} className="text-[#3730A3]" />
                  }
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65706A] leading-none mb-0.5">Location</p>
                  <p className="text-xs font-medium text-[#18221E]">
                    {meeting.location_type === "Physical"
                      ? meeting.location_value ?? "Physical location"
                      : "Video call"}
                  </p>
                  {meeting.meeting_link && meeting.location_type !== "Physical" && (
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#10251F] hover:underline truncate block max-w-[160px]"
                    >
                      {meeting.meeting_link}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F0F9FF]">
                  <IconUsers size={13} className="text-[#0369A1]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65706A] leading-none mb-0.5">Type</p>
                  <span className={cn(
                    "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight",
                    MEETING_TYPE_COLORS[meeting.type] ?? "bg-[#E7EADF] text-[#65706A]"
                  )}>
                    {meeting.type}
                  </span>
                </div>
              </div>

              {meeting.is_recurring && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#EAF4E2]">
                    <IconRepeat size={13} className="text-[#2D6A3F]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65706A] leading-none mb-0.5">Recurring</p>
                    <p className="text-xs font-medium text-[#18221E]">{meeting.recurrence ?? "Weekly"}</p>
                  </div>
                </div>
              )}

              {meeting.meeting_id_code && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#EEF2FF]">
                    <IconLink size={13} className="text-[#3730A3]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65706A] leading-none mb-0.5">Meeting ID</p>
                    <p className="text-xs font-mono font-medium text-[#18221E] tracking-wider">{meeting.meeting_id_code}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Agenda card */}
          {meeting.agenda.length > 0 && (
            <div className="bg-white border border-[#D8DDD4] rounded-lg">
              <div className="px-4 py-3 border-b border-[#D8DDD4]">
                <h2 className="text-xs font-bold text-[#18221E]">Agenda</h2>
              </div>
              <div className="divide-y divide-[#F0F0EA]">
                {meeting.agenda.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E7EADF] text-[10px] font-bold text-[#65706A]">
                      {item.order}
                    </span>
                    <p className="flex-1 text-xs text-[#18221E]">{item.title}</p>
                    {item.duration_minutes && (
                      <span className="text-[10px] text-[#65706A] shrink-0">{item.duration_minutes} min</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes placeholder */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg">
            <div className="px-4 py-3 border-b border-[#D8DDD4] flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#18221E]">Notes</h2>
              <span className="text-[10px] text-[#A0A9A4]">Meeting notes will appear here</span>
            </div>
            <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
              <IconFileText size={20} className="text-[#D8DDD4]" />
              <p className="text-xs text-[#65706A]">No notes have been added yet.</p>
              <button className="text-[11px] font-medium text-[#10251F] hover:underline">Add meeting notes →</button>
            </div>
          </div>

          {/* Action items placeholder */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg">
            <div className="px-4 py-3 border-b border-[#D8DDD4] flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#18221E]">Action Items</h2>
              <button className="text-[11px] font-medium text-[#10251F] hover:underline">+ Add item</button>
            </div>
            <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
              <IconCheckCircle size={20} className="text-[#D8DDD4]" />
              <p className="text-xs text-[#65706A]">No action items yet.</p>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-64 shrink-0 space-y-3">
          {/* Organizer */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg p-4">
            <h3 className="text-xs font-bold text-[#18221E] mb-3">Organizer</h3>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10251F] text-[11px] font-bold text-[#C7F34A]">
                {initials(meeting.organizer_name)}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#18221E]">{meeting.organizer_name}</p>
                {meeting.organizer_role && (
                  <p className="text-[10px] text-[#65706A]">{meeting.organizer_role}</p>
                )}
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#18221E]">Attendees</h3>
              <span className="text-[10px] text-[#65706A]">{meeting.attendee_count} total</span>
            </div>
            <div className="space-y-2">
              {meeting.attendees.slice(0, 6).map((attendee, i) => (
                <div key={attendee.id} className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                    AVATAR_BG[i % AVATAR_BG.length]
                  )}>
                    {initials(attendee.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-[#18221E] truncate">{attendee.full_name}</p>
                    {attendee.role && (
                      <p className="text-[10px] text-[#65706A] truncate">{attendee.role}</p>
                    )}
                  </div>
                  {attendee.rsvp && (
                    <span className={cn(
                      "ml-auto shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded",
                      attendee.rsvp === "Accepted" ? "bg-[#EAF4E2] text-[#2D6A3F]"
                        : attendee.rsvp === "Declined" ? "bg-[#FFF1F2] text-[#9F1239]"
                        : "bg-[#FFF7ED] text-[#D97706]"
                    )}>
                      {attendee.rsvp}
                    </span>
                  )}
                </div>
              ))}
              {meeting.attendee_count > 6 && (
                <p className="text-[10px] text-[#65706A] pt-1">+{meeting.attendee_count - 6} more attendees</p>
              )}
            </div>
          </div>

          {/* Quick info */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D8DDD4]">
              <h3 className="text-xs font-bold text-[#18221E]">Quick Info</h3>
            </div>
            <div className="divide-y divide-[#F0F0EA]">
              {meeting.department_name && (
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-[11px] text-[#65706A]">Department</span>
                  <span className="text-[11px] font-medium text-[#18221E]">{meeting.department_name}</span>
                </div>
              )}
              {meeting.timezone && (
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-[11px] text-[#65706A]">Timezone</span>
                  <span className="text-[11px] font-medium text-[#18221E]">{meeting.timezone}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[11px] text-[#65706A]">Notifications</span>
                <span className={cn("text-[11px] font-medium", meeting.notify_attendees ? "text-[#2D6A3F]" : "text-[#65706A]")}>
                  {meeting.notify_attendees ? "Enabled" : "Disabled"}
                </span>
              </div>
              {meeting.cancellation_reason && (
                <div className="px-4 py-2">
                  <p className="text-[10px] font-semibold text-[#9F1239] mb-0.5">Cancellation Reason</p>
                  <p className="text-[11px] text-[#65706A]">{meeting.cancellation_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

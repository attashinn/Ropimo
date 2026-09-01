"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MeetingItem, MeetingStats, MeetingInsights, MeetingType, CreateMeetingInput } from "@/types/meetings";
import { PrimaryButton } from "@/components/ui/primary-button";
import { cn } from "@/lib/utils";
import { createMeetingAction, cancelMeetingAction, deleteMeetingAction } from "@/lib/meetings/actions";
import { DatePicker } from "@/components/ui/date-picker";

// ─── Inline Icons ────────────────────────────────────────────────────────────
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
function IconSearch({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconFilter({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
function IconChevronDown({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
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
function IconChevronRight({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
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
function IconX({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconPlus({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
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
function IconEye({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconMapPin({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconRepeat({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface MeetingsViewProps {
  workspaceId: string;
  workspaceName?: string;
  initialMeetings: MeetingItem[];
  meetingStats: MeetingStats;
  meetingInsights: MeetingInsights;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MEETING_TYPE_COLORS: Record<string, string> = {
  Internal: "bg-[#EAF4E2] text-[#2D6A3F] border border-[#B2DEB8]",
  Client: "bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]",
  Department: "bg-[#FFF7ED] text-[#92400E] border border-[#FED7AA]",
  "One-on-one": "bg-[#F0F9FF] text-[#0369A1] border border-[#BAE6FD]",
  Interview: "bg-[#FDF4FF] text-[#7E22CE] border border-[#E9D5FF]",
  Training: "bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3]",
};

const MEETING_TYPE_ICON_BG: Record<string, string> = {
  Internal: "bg-[#10251F]",
  Client: "bg-[#3730A3]",
  Department: "bg-[#D97706]",
  "One-on-one": "bg-[#0369A1]",
  Interview: "bg-[#7E22CE]",
  Training: "bg-[#9F1239]",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

const AVATAR_BG = [
  "bg-[#10251F] text-[#C7F34A]",
  "bg-[#3730A3] text-white",
  "bg-[#D97706] text-white",
  "bg-[#0369A1] text-white",
  "bg-[#7E22CE] text-white",
  "bg-[#9F1239] text-white",
];

function AvatarStack({ names, extraCount }: { names: string[]; extraCount: number }) {
  const shown = names.slice(0, 3);
  return (
    <div className="flex items-center">
      {shown.map((name, i) => (
        <div
          key={i}
          title={name}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold border-2 border-white",
            AVATAR_BG[i % AVATAR_BG.length]
          )}
          style={{ marginLeft: i === 0 ? 0 : -6 }}
        >
          {initials(name)}
        </div>
      ))}
      {extraCount > 0 && (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#E7EADF] text-[9px] font-bold text-[#65706A]"
          style={{ marginLeft: -6 }}
        >
          +{extraCount}
        </div>
      )}
    </div>
  );
}

// Mini calendar for sidebar
const MAY_2026 = {
  year: 2026,
  month: 4, // 0-indexed → May
  label: "May 2026",
  daysInMonth: 31,
  startDay: 4, // Friday (0=Sun)
};

function MiniCalendar({ selectedDate, onSelectDate, highlightedDates }: {
  selectedDate: string;
  onSelectDate: (d: string) => void;
  highlightedDates: Set<string>;
}) {
  const [offset, setOffset] = React.useState(0);
  const month = (MAY_2026.month + offset + 12) % 12;
  const year = MAY_2026.year + Math.floor((MAY_2026.month + offset) / 12);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOffset(o => o - 1)} className="p-1 rounded hover:bg-[#E7EADF] text-[#65706A]">
          <IconChevronLeft size={13} />
        </button>
        <span className="text-xs font-semibold text-[#18221E]">{monthLabel}</span>
        <button onClick={() => setOffset(o => o + 1)} className="p-1 rounded hover:bg-[#E7EADF] text-[#65706A]">
          <IconChevronRight size={13} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-[#65706A] text-center py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = dateStr === selectedDate;
          const hasMeeting = highlightedDates.has(dateStr);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(isSelected ? "" : dateStr)}
              className={cn(
                "relative text-[11px] h-7 w-full flex items-center justify-center rounded transition-colors",
                isSelected
                  ? "bg-[#10251F] text-[#F4F3EE] font-bold"
                  : "hover:bg-[#E7EADF] text-[#18221E]"
              )}
            >
              {day}
              {hasMeeting && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#10251F]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule Meeting Modal ───────────────────────────────────────────────────
interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateMeetingInput) => Promise<void>;
  workspaceId: string;
}

function ScheduleMeetingModal({ open, onClose, onSubmit, workspaceId }: ScheduleModalProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<MeetingType>("Internal");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [timezone, setTimezone] = React.useState("Asia/Dhaka (GMT+6)");
  const [locationType, setLocationType] = React.useState<"Video" | "Physical" | "Custom">("Video");
  const [locationValue, setLocationValue] = React.useState("");
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [recurrence, setRecurrence] = React.useState<string>("Weekly");
  const [agendaItems, setAgendaItems] = React.useState<string[]>([""]);
  const [attendeeInput, setAttendeeInput] = React.useState("");
  const [attendees, setAttendees] = React.useState<string[]>([]);
  const [notifyAttendees, setNotifyAttendees] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required";
    if (!date) e.date = "Date is required";
    if (!startTime) e.start_time = "Start time is required";
    if (!endTime) e.end_time = "End time is required";
    return e;
  }

  async function handleSubmit(e?: React.FormEvent, draft = false) {
    if (e) e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        date,
        start_time: startTime,
        end_time: endTime,
        timezone,
        location_type: locationType,
        location_value: locationValue || undefined,
        is_recurring: isRecurring,
        recurrence: isRecurring ? (recurrence as any) : "None",
        notify_attendees: notifyAttendees,
        agenda: agendaItems.filter(a => a.trim()).map((a, i) => ({ order: i + 1, title: a.trim() })),
        attendees: attendees.map(email => ({ full_name: email.split("@")[0], email })),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white border border-[#D8DDD4] rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8DDD4] shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#18221E]">Schedule Meeting</h2>
            <p className="text-xs text-[#65706A] mt-0.5">Create and invite team members</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#E7EADF] text-[#65706A]">
            <IconX size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: "" })); }}
              placeholder="e.g. Weekly Product Review"
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm text-[#18221E] placeholder:text-[#A0A9A4] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white",
                errors.title ? "border-red-400" : "border-[#D8DDD4]"
              )}
            />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">Description / Briefing</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Goals, context, and discussion topics..."
              rows={2}
              className="w-full rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] placeholder:text-[#A0A9A4] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">Meeting Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as MeetingType)}
              className="w-full rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
            >
              {["Internal", "Client", "Department", "One-on-one", "Interview", "Training"].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">Date <span className="text-red-500">*</span></label>
              <DatePicker
                value={date}
                onChange={(val) => {
                  setDate(val);
                  setErrors((prev) => ({ ...prev, date: "" }));
                }}
                placeholder="Select date"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">Start Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18221E] mb-1">End Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
            >
              <option>Asia/Dhaka (GMT+6)</option>
              <option>UTC (GMT+0)</option>
              <option>America/New_York (GMT-5)</option>
              <option>Europe/London (GMT+1)</option>
              <option>Asia/Dubai (GMT+4)</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">Location / Link</label>
            <div className="flex gap-2 mb-2">
              {(["Video", "Physical", "Custom"] as const).map(lt => (
                <button
                  key={lt}
                  type="button"
                  onClick={() => setLocationType(lt)}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-xs font-medium transition-colors",
                    locationType === lt
                      ? "bg-[#10251F] text-white border-[#10251F]"
                      : "bg-white text-[#65706A] border-[#D8DDD4] hover:border-[#10251F]"
                  )}
                >
                  {lt === "Video" ? "Video" : lt === "Physical" ? "In-Person" : "Custom Link"}
                </button>
              ))}
            </div>
            <input
              value={locationValue}
              onChange={e => setLocationValue(e.target.value)}
              placeholder={
                locationType === "Video" ? "Paste meeting URL or leave blank to auto-generate"
                  : locationType === "Physical" ? "Room name or address"
                  : "Custom meeting link"
              }
              className="w-full rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] placeholder:text-[#A0A9A4] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
            />
          </div>

          {/* Invite Attendees */}
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">Invite Attendees</label>
            <div className="flex gap-2">
              <input
                value={attendeeInput}
                onChange={e => setAttendeeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = attendeeInput.trim();
                    if (val && !attendees.includes(val)) setAttendees(prev => [...prev, val]);
                    setAttendeeInput("");
                  }
                }}
                placeholder="Name or email, press Enter to add"
                className="flex-1 rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] placeholder:text-[#A0A9A4] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  const val = attendeeInput.trim();
                  if (val && !attendees.includes(val)) setAttendees(prev => [...prev, val]);
                  setAttendeeInput("");
                }}
                className="px-3 py-2 rounded-md border border-[#D8DDD4] text-xs text-[#65706A] hover:bg-[#E7EADF]"
              >
                Add
              </button>
            </div>
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {attendees.map((a, i) => (
                  <span key={i} className="flex items-center gap-1 bg-[#EAF4E2] text-[#2D6A3F] text-xs px-2 py-0.5 rounded-full border border-[#B2DEB8]">
                    {a}
                    <button onClick={() => setAttendees(prev => prev.filter((_, j) => j !== i))} className="text-[#2D6A3F] hover:text-red-600">
                      <IconX size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">Agenda</label>
            <div className="space-y-2">
              {agendaItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[#65706A] w-4 shrink-0">{i + 1}.</span>
                  <input
                    value={item}
                    onChange={e => setAgendaItems(prev => prev.map((a, j) => j === i ? e.target.value : a))}
                    placeholder={`e.g. ${["Review current progress", "Discuss blockers", "Assign next steps"][i] || "Agenda item"}`}
                    className="flex-1 rounded-md border border-[#D8DDD4] px-3 py-1.5 text-sm text-[#18221E] placeholder:text-[#A0A9A4] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
                  />
                  {agendaItems.length > 1 && (
                    <button onClick={() => setAgendaItems(prev => prev.filter((_, j) => j !== i))} className="text-[#65706A] hover:text-red-600">
                      <IconX size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAgendaItems(prev => [...prev, ""])}
                className="flex items-center gap-1.5 text-xs text-[#10251F] font-medium hover:underline"
              >
                <IconPlus size={12} /> Add item
              </button>
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3 py-2 border-t border-[#D8DDD4]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="rounded border-[#D8DDD4] text-[#10251F] focus:ring-[#10251F]"
              />
              <span className="text-xs font-medium text-[#18221E]">Recurring meeting</span>
            </label>
            {isRecurring && (
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value)}
                className="rounded-md border border-[#D8DDD4] px-2 py-1 text-xs text-[#18221E] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
              >
                {["Daily","Weekly","Biweekly","Monthly"].map(r => <option key={r}>{r}</option>)}
              </select>
            )}
          </div>

          {/* Notify */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notify"
              checked={notifyAttendees}
              onChange={e => setNotifyAttendees(e.target.checked)}
              className="rounded border-[#D8DDD4] text-[#10251F] focus:ring-[#10251F]"
            />
            <label htmlFor="notify" className="text-xs text-[#65706A] cursor-pointer">Send email invites to all attendees</label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#D8DDD4] bg-[#FAFAF8] rounded-b-xl shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-[#D8DDD4] text-xs font-medium text-[#65706A] hover:bg-[#E7EADF] transition-colors">
            Cancel
          </button>
          <button
            onClick={e => handleSubmit(e, true)}
            disabled={saving}
            className="px-4 py-2 rounded-md border border-[#D8DDD4] text-xs font-medium text-[#18221E] hover:bg-[#E7EADF] transition-colors"
          >
            Save Draft
          </button>
          <PrimaryButton size="sm" disabled={saving} onClick={() => handleSubmit()}>
            {saving ? "Scheduling..." : "Schedule Meeting"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ─── Join with ID Modal ───────────────────────────────────────────────────────
function JoinWithIdModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [meetingId, setMeetingId] = React.useState("");
  const [password, setPassword] = React.useState("");

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white border border-[#D8DDD4] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8DDD4]">
          <div>
            <h2 className="text-sm font-bold text-[#18221E]">Join a Meeting</h2>
            <p className="text-xs text-[#65706A] mt-0.5">Enter a meeting ID to join</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#E7EADF] text-[#65706A]">
            <IconX size={14} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">Meeting ID</label>
            <input
              value={meetingId}
              onChange={e => setMeetingId(e.target.value)}
              placeholder="e.g. 382-947-615"
              className="w-full rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] placeholder:text-[#A0A9A4] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white font-mono tracking-wider"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#18221E] mb-1">Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter meeting password"
              className="w-full rounded-md border border-[#D8DDD4] px-3 py-2 text-sm text-[#18221E] placeholder:text-[#A0A9A4] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white"
            />
          </div>
        </div>
        <div className="flex gap-2.5 px-5 py-4 border-t border-[#D8DDD4] bg-[#FAFAF8]">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-md border border-[#D8DDD4] text-xs font-medium text-[#65706A] hover:bg-[#E7EADF]">
            Cancel
          </button>
          <PrimaryButton size="sm" className="flex-1" onClick={() => {
            if (meetingId.trim()) {
              window.open(`https://meet.brnnd.com/join/${meetingId.replace(/-/g, "")}`, "_blank");
              onClose();
            }
          }}>
            Join Meeting
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirmModal({ meeting, onConfirm, onClose }: {
  meeting: MeetingItem | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!meeting) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white border border-[#D8DDD4] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-5">
          <h3 className="text-sm font-bold text-[#18221E]">Delete Meeting</h3>
          <p className="text-xs text-[#65706A] mt-2">
            Are you sure you want to delete <strong>"{meeting.title}"</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2.5 px-5 py-4 border-t border-[#D8DDD4] bg-[#FAFAF8]">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-md border border-[#D8DDD4] text-xs font-medium text-[#65706A] hover:bg-[#E7EADF]">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
            Delete Meeting
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
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

// ─── Main View ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

export function MeetingsView({
  workspaceId,
  workspaceName = "brnnd",
  initialMeetings,
  meetingStats,
  meetingInsights,
}: MeetingsViewProps) {
  const router = useRouter();
  const [meetings, setMeetings] = React.useState<MeetingItem[]>(initialMeetings);
  React.useEffect(() => setMeetings(initialMeetings), [initialMeetings]);

  // Tabs & filters
  const [activeTab, setActiveTab] = React.useState<"Upcoming" | "Past" | "Cancelled">("Upcoming");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("All Types");
  const [filterOrganizer, setFilterOrganizer] = React.useState<string>("All Organizers");
  const [selectedDate, setSelectedDate] = React.useState<string>("");

  // Modals
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [deleteMeeting, setDeleteMeeting] = React.useState<MeetingItem | null>(null);
  const [actionMenuId, setActionMenuId] = React.useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);

  // Pagination
  const [page, setPage] = React.useState(1);

  // Toast
  const [toast, setToast] = React.useState<{ msg: string; type: "success" | "error" } | null>(null);
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Close action menus on outside click
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-action-menu]")) {
        setActionMenuId(null);
        setHeaderMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Filtered & paginated meetings
  const allMeetings = React.useMemo(() => {
    let list = meetings.filter(m => {
      if (activeTab === "Upcoming") return m.status === "Upcoming" || m.status === "Live";
      if (activeTab === "Past") return m.status === "Completed";
      return m.status === "Cancelled";
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.description?.toLowerCase() ?? "").includes(q) ||
        m.organizer_name.toLowerCase().includes(q)
      );
    }
    if (filterType !== "All Types") list = list.filter(m => m.type === filterType);
    if (filterOrganizer !== "All Organizers") list = list.filter(m => m.organizer_name === filterOrganizer);
    if (selectedDate) list = list.filter(m => m.date === selectedDate);
    return list;
  }, [meetings, activeTab, searchQuery, filterType, filterOrganizer, selectedDate]);

  const totalPages = Math.max(1, Math.ceil(allMeetings.length / PAGE_SIZE));
  const paginated = allMeetings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  React.useEffect(() => setPage(1), [activeTab, searchQuery, filterType, filterOrganizer, selectedDate]);

  const uniqueOrganizers = Array.from(new Set(meetings.map(m => m.organizer_name)));
  const highlightedDates = React.useMemo(() => {
    const s = new Set<string>();
    meetings.filter(m => m.status === "Upcoming" || m.status === "Live").forEach(m => s.add(m.date));
    return s;
  }, [meetings]);

  // Today's meetings (May 21 seed date)
  const todayMeetings = React.useMemo(() =>
    meetings
      .filter(m => m.date === "2026-05-21" && (m.status === "Upcoming" || m.status === "Live"))
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  , [meetings]);

  async function handleSchedule(input: CreateMeetingInput) {
    const res = await createMeetingAction({ ...input, workspace_id: workspaceId });
    if (res.success && res.meeting) {
      setMeetings(prev => [res.meeting!, ...prev]);
      showToast("Meeting scheduled successfully");
    } else {
      showToast(res.error ?? "Failed to schedule meeting", "error");
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteMeetingAction(id);
    if (res.success) {
      setMeetings(prev => prev.filter(m => m.id !== id));
      showToast("Meeting deleted");
    } else {
      showToast(res.error ?? "Failed to delete", "error");
    }
    setDeleteMeeting(null);
  }

  async function handleCancel(id: string) {
    const res = await cancelMeetingAction(id, "Cancelled by organizer");
    if (res.success) {
      setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: "Cancelled" as const } : m));
      showToast("Meeting cancelled");
    } else {
      showToast(res.error ?? "Failed to cancel", "error");
    }
    setActionMenuId(null);
  }

  function handleJoin(m: MeetingItem) {
    if (m.meeting_link) {
      window.open(m.meeting_link, "_blank");
    } else {
      showToast("No video link configured for this meeting");
    }
  }

  function handleCopyLink(m: MeetingItem) {
    const link = m.meeting_link ?? `https://meet.brnnd.com/join/${m.meeting_id_code?.replace(/-/g, "")}`;
    navigator.clipboard.writeText(link).then(() => showToast("Meeting link copied"));
    setActionMenuId(null);
  }

  const STAT_CARDS = [
    { label: "TOTAL MEETINGS", value: meetingStats.totalMeetings, sub: "All time", iconBg: "bg-[#EAF4E2]", iconColor: "text-[#2D6A3F]", Icon: IconCalendar },
    { label: "UPCOMING", value: meetingStats.upcomingThisWeek, sub: "This week", iconBg: "bg-[#FFF7ED]", iconColor: "text-[#D97706]", Icon: IconClock },
    { label: "ATTENDED", value: meetingStats.totalAttended, sub: "Meetings attended", iconBg: "bg-[#EEF2FF]", iconColor: "text-[#3730A3]", Icon: IconUsers },
    { label: "MEETING HOURS", value: meetingStats.totalHours, sub: "Total hours", iconBg: "bg-[#F0F9FF]", iconColor: "text-[#0369A1]", Icon: IconVideo },
    { label: "CANCELLED", value: meetingStats.cancelledThisMonth, sub: "This month", iconBg: "bg-[#FFF1F2]", iconColor: "text-[#9F1239]", Icon: IconX },
  ];

  return (
    <div className="space-y-5">
      {/* ── Modals ── */}
      <ScheduleMeetingModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} onSubmit={handleSchedule} workspaceId={workspaceId} />
      <JoinWithIdModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <DeleteConfirmModal
        meeting={deleteMeeting}
        onConfirm={() => deleteMeeting && handleDelete(deleteMeeting.id)}
        onClose={() => setDeleteMeeting(null)}
      />
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-[#D8DDD4]">
        <div>
          <p className="text-xs text-[#65706A] mb-1">
            <span className="hover:text-[#18221E] cursor-pointer transition-colors">{workspaceName}</span>
            {" / "}
            <span className="text-[#18221E] font-medium">Meetings</span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#18221E]">Meetings</h1>
          <p className="text-sm text-[#65706A] mt-0.5">Schedule, manage and track all company meetings in one place.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PrimaryButton size="sm" onClick={() => setScheduleOpen(true)}>
            + Schedule Meeting
          </PrimaryButton>
          <button
            onClick={() => setJoinOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#D8DDD4] bg-white text-xs font-medium text-[#18221E] hover:bg-[#F4F3EE] transition-colors"
          >
            <IconLink size={13} />
            Join with ID
          </button>
          <div className="relative" data-action-menu>
            <button
              onClick={() => setHeaderMenuOpen(o => !o)}
              className="flex items-center justify-center w-8 h-8 rounded-md border border-[#D8DDD4] bg-white hover:bg-[#F4F3EE] transition-colors text-[#65706A]"
            >
              <IconMoreVertical size={15} />
            </button>
            {headerMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#D8DDD4] rounded-lg shadow-lg z-30 py-1">
                {["Export Meetings", "Import Schedule", "Meeting Settings", "Analytics"].map(item => (
                  <button key={item} onClick={() => setHeaderMenuOpen(false)}
                    className="w-full text-left px-3 py-2 text-xs text-[#18221E] hover:bg-[#F4F3EE] transition-colors">
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map(({ label, value, sub, iconBg, iconColor, Icon }) => (
          <div key={label} className="flex items-start gap-3 bg-white border border-[#D8DDD4] rounded-lg p-3.5">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", iconBg)}>
              <Icon size={15} className={iconColor} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#65706A] leading-none mb-1">{label}</p>
              <p className="text-xl font-bold text-[#18221E] leading-none">{value}</p>
              <p className="text-[10px] text-[#65706A] mt-0.5 leading-none">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="flex gap-4 items-start">
        {/* Left — Meetings table */}
        <div className="flex-1 min-w-0 bg-white border border-[#D8DDD4] rounded-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#D8DDD4]">
            {/* Tabs */}
            <div className="flex rounded-md overflow-hidden border border-[#D8DDD4] text-xs font-medium shrink-0">
              {(["Upcoming", "Past", "Cancelled"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    activeTab === tab
                      ? "bg-[#10251F] text-white"
                      : "bg-white text-[#65706A] hover:bg-[#F4F3EE]"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Type filter */}
            <div className="relative shrink-0">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1.5 rounded-md border border-[#D8DDD4] text-xs text-[#18221E] bg-white focus:outline-none focus:ring-1 focus:ring-[#10251F] cursor-pointer"
              >
                <option>All Types</option>
                {["Internal","Client","Department","One-on-one","Interview","Training"].map(t => <option key={t}>{t}</option>)}
              </select>
              <IconChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#65706A] pointer-events-none" />
            </div>

            {/* Organizer filter */}
            <div className="relative shrink-0">
              <select
                value={filterOrganizer}
                onChange={e => setFilterOrganizer(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1.5 rounded-md border border-[#D8DDD4] text-xs text-[#18221E] bg-white focus:outline-none focus:ring-1 focus:ring-[#10251F] cursor-pointer"
              >
                <option>All Organizers</option>
                {uniqueOrganizers.map(o => <option key={o}>{o}</option>)}
              </select>
              <IconChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#65706A] pointer-events-none" />
            </div>

            {/* Filters button */}
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#D8DDD4] text-xs text-[#65706A] hover:bg-[#F4F3EE] transition-colors shrink-0">
              <IconFilter size={12} /> Filters
              <IconChevronDown size={11} />
            </button>

            {/* Search */}
            <div className="relative shrink-0">
              <IconSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A0A9A4]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search meetings..."
                className="pl-7 pr-3 py-1.5 rounded-md border border-[#D8DDD4] text-xs text-[#18221E] placeholder:text-[#A0A9A4] focus:outline-none focus:ring-1 focus:ring-[#10251F] bg-white w-40"
              />
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1.2fr_1.4fr_1fr_auto] gap-3 px-4 py-2 border-b border-[#D8DDD4] bg-[#FAFAF8]">
            {["MEETING", "TYPE", "DATE & TIME", "ORGANIZER", "ATTENDEES", "ACTIONS"].map(col => (
              <div key={col} className="text-[10px] font-semibold uppercase tracking-wider text-[#65706A]">{col}</div>
            ))}
          </div>

          {/* Rows */}
          {paginated.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2 text-center">
              <IconCalendar size={24} className="text-[#D8DDD4]" />
              <p className="text-sm font-medium text-[#65706A]">No meetings found</p>
              <p className="text-xs text-[#A0A9A4]">Try adjusting your filters or schedule a new meeting.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0EA]">
              {paginated.map(meeting => {
                const extraAttendees = Math.max(0, meeting.attendee_count - meeting.attendees.length);
                const shownNames = meeting.attendees.slice(0, 3).map(a => a.full_name);
                const extraCount = Math.max(0, meeting.attendee_count - 3);

                return (
                  <div
                    key={meeting.id}
                    className="grid grid-cols-[2fr_1fr_1.2fr_1.4fr_1fr_auto] gap-3 px-4 py-3 items-center hover:bg-[#FAFAF8] transition-colors group cursor-pointer"
                    onClick={() => router.push(`/app/meetings/${meeting.id}`)}
                  >
                    {/* Meeting info */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md mt-0.5",
                        MEETING_TYPE_ICON_BG[meeting.type] ?? "bg-[#10251F]"
                      )}>
                        {meeting.type === "Client" ? (
                          <IconUsers size={13} className="text-white" />
                        ) : meeting.type === "Interview" ? (
                          <IconEye size={13} className="text-white" />
                        ) : (
                          <IconVideo size={13} className="text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#18221E] truncate leading-snug">
                          {meeting.title}
                          {meeting.is_recurring && (
                            <IconRepeat size={10} className="inline ml-1 text-[#65706A]" />
                          )}
                        </p>
                        {meeting.description && (
                          <p className="text-[11px] text-[#65706A] truncate leading-snug mt-0.5">{meeting.description}</p>
                        )}
                        {meeting.status === "Cancelled" && meeting.cancellation_reason && (
                          <p className="text-[10px] text-red-500 mt-0.5 truncate">{meeting.cancellation_reason}</p>
                        )}
                      </div>
                    </div>

                    {/* Type badge */}
                    <div>
                      <span className={cn(
                        "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight",
                        MEETING_TYPE_COLORS[meeting.type] ?? "bg-[#E7EADF] text-[#65706A]"
                      )}>
                        {meeting.type}
                      </span>
                    </div>

                    {/* Date & time */}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#18221E] leading-snug">{formatDate(meeting.date)}</p>
                      <p className="text-[11px] text-[#65706A] leading-snug">{meeting.start_time} – {meeting.end_time}</p>
                      <p className="text-[10px] text-[#A0A9A4]">
                        {meeting.location_type === "Video" ? "Video call" : meeting.location_value ?? "Physical"}
                      </p>
                    </div>

                    {/* Organizer */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                        AVATAR_BG[0]
                      )}>
                        {initials(meeting.organizer_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#18221E] truncate leading-snug">{meeting.organizer_name}</p>
                        {meeting.organizer_role && (
                          <p className="text-[10px] text-[#65706A] truncate leading-snug">{meeting.organizer_role}</p>
                        )}
                      </div>
                    </div>

                    {/* Attendees */}
                    <div>
                      <AvatarStack names={shownNames} extraCount={extraCount} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      {(meeting.status === "Upcoming" || meeting.status === "Live") && (
                        <button
                          onClick={() => handleJoin(meeting)}
                          className="px-2.5 py-1 rounded-md border border-[#D8DDD4] text-[11px] font-semibold text-[#18221E] hover:bg-[#E7EADF] transition-colors"
                        >
                          Join
                        </button>
                      )}
                      <div className="relative" data-action-menu>
                        <button
                          onClick={() => setActionMenuId(id => id === meeting.id ? null : meeting.id)}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#E7EADF] text-[#65706A] transition-colors"
                        >
                          <IconMoreVertical size={14} />
                        </button>
                        {actionMenuId === meeting.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#D8DDD4] rounded-lg shadow-lg z-30 py-1">
                            <button onClick={() => { setActionMenuId(null); router.push(`/app/meetings/${meeting.id}`); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#18221E] hover:bg-[#F4F3EE]">
                              <IconEye size={13} className="text-[#65706A]" /> View details
                            </button>
                            {(meeting.status === "Upcoming") && (
                              <button onClick={() => setActionMenuId(null)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#18221E] hover:bg-[#F4F3EE]">
                                <IconEdit size={13} className="text-[#65706A]" /> Edit meeting
                              </button>
                            )}
                            <button onClick={() => setActionMenuId(null)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#18221E] hover:bg-[#F4F3EE]">
                              <IconCopy size={13} className="text-[#65706A]" /> Duplicate
                            </button>
                            <button onClick={() => handleCopyLink(meeting)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#18221E] hover:bg-[#F4F3EE]">
                              <IconLink size={13} className="text-[#65706A]" /> Copy meeting link
                            </button>
                            {meeting.status === "Upcoming" && (
                              <>
                                <div className="border-t border-[#D8DDD4] my-1" />
                                <button onClick={() => handleCancel(meeting.id)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50">
                                  <IconX size={13} /> Cancel meeting
                                </button>
                              </>
                            )}
                            <div className="border-t border-[#D8DDD4] my-1" />
                            <button
                              onClick={() => { setDeleteMeeting(meeting); setActionMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              <IconTrash size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#D8DDD4] bg-[#FAFAF8]">
            <p className="text-xs text-[#65706A]">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, allMeetings.length)} to {Math.min(page * PAGE_SIZE, allMeetings.length)} of {allMeetings.length} {activeTab.toLowerCase()} meetings
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-md border border-[#D8DDD4] text-xs text-[#65706A] hover:bg-[#E7EADF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-7 h-7 rounded-md border text-xs font-medium transition-colors",
                    page === p
                      ? "bg-[#10251F] text-white border-[#10251F]"
                      : "border-[#D8DDD4] text-[#65706A] hover:bg-[#E7EADF]"
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-md border border-[#D8DDD4] text-xs text-[#65706A] hover:bg-[#E7EADF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-64 shrink-0 space-y-3">
          {/* Mini Calendar */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg p-4">
            <h3 className="text-xs font-bold text-[#18221E] mb-3">Calendar</h3>
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              highlightedDates={highlightedDates}
            />
          </div>

          {/* Today's Meetings */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#18221E]">Today's Meetings</h3>
              <button className="text-[11px] text-[#10251F] font-medium hover:underline">View all →</button>
            </div>
            {todayMeetings.length === 0 ? (
              <p className="text-xs text-[#65706A]">No meetings today.</p>
            ) : (
              <div className="space-y-2.5">
                {todayMeetings.map(m => {
                  const dotColor = m.type === "Client" ? "bg-[#3730A3]" : m.type === "Internal" ? "bg-[#2D6A3F]" : "bg-[#D97706]";
                  return (
                    <div key={m.id} className="flex items-start gap-2">
                      <div className="text-[10px] font-mono text-[#65706A] w-14 shrink-0 mt-0.5">{m.start_time}</div>
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", dotColor)} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#18221E] leading-snug truncate">{m.title}</p>
                        <p className="text-[10px] text-[#65706A]">{durationLabel(m.duration_minutes)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Meeting Insights */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#18221E]">Meeting Insights</h3>
              <div className="relative">
                <select className="appearance-none text-[10px] text-[#65706A] bg-transparent pr-3 focus:outline-none cursor-pointer font-medium">
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>This Quarter</option>
                </select>
                <IconChevronDown size={9} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#65706A] pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconCalendar size={12} className="text-[#65706A]" />
                  <span className="text-[11px] text-[#65706A]">Meetings held</span>
                </div>
                <span className="text-xs font-semibold text-[#18221E]">{meetingInsights.meetingsHeld}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconUsers size={12} className="text-[#65706A]" />
                  <span className="text-[11px] text-[#65706A]">Total participants</span>
                </div>
                <span className="text-xs font-semibold text-[#18221E]">{meetingInsights.totalParticipants}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconClock size={12} className="text-[#65706A]" />
                  <span className="text-[11px] text-[#65706A]">Avg. meeting time</span>
                </div>
                <span className="text-xs font-semibold text-[#18221E]">{meetingInsights.avgMeetingMinutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconX size={12} className="text-[#65706A]" />
                  <span className="text-[11px] text-[#65706A]">Meetings cancelled</span>
                </div>
                <span className="text-xs font-semibold text-[#18221E]">{meetingInsights.meetingsCancelled}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-[#D8DDD4] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D8DDD4]">
              <h3 className="text-xs font-bold text-[#18221E]">Quick Actions</h3>
            </div>
            <div className="divide-y divide-[#F0F0EA]">
              {[
                { label: "My Meeting Room", icon: IconVideo },
                { label: "Meeting Templates", icon: IconCopy },
                { label: "Recurring Meetings", icon: IconRepeat },
                { label: "Meeting Recordings", icon: IconEye },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F4F3EE] transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={13} className="text-[#65706A]" />
                    <span className="text-[11px] font-medium text-[#18221E]">{label}</span>
                  </div>
                  <IconChevronRight size={12} className="text-[#A0A9A4] group-hover:text-[#65706A] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

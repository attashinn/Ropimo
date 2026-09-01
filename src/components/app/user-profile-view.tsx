"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Shield,
  Bell,
  Check,
  Globe,
  Clock,
  Key,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Briefcase,
  Calendar,
  Sparkles,
} from "lucide-react";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
import { RopimoStatusBadge } from "@/components/ropimo/ropimo-status-badge";
import { cn } from "@/lib/utils";

export interface UserProfileViewProps {
  user: {
    id?: string;
    email?: string | null;
    fullName?: string | null;
  } | null;
  workspaceName?: string;
  myTasksCount?: number;
  completedTasksCount?: number;
}

export function UserProfileView({
  user,
  workspaceName = "brnnd",
  myTasksCount = 5,
  completedTasksCount = 14,
}: UserProfileViewProps) {
  const [activeTab, setActiveTab] = React.useState<"general" | "work" | "notifications" | "security">("general");
  const [fullName, setFullName] = React.useState(user?.fullName || "Tashin Khan");
  const [jobTitle, setJobTitle] = React.useState("Founder & Lead Designer");
  const [bio, setBio] = React.useState("Building scalable workspace software and digital products.");
  const [timezone, setTimezone] = React.useState("Asia/Dhaka (GMT+6)");
  const [copied, setCopied] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved">("idle");

  const email = user?.email || "tashinkan360@gmail.com";
  const userInitials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 select-none">
      {/* Top Banner Card (ClickUp/Linear Style) */}
      <div className="overflow-hidden rounded-[16px] border border-[#D8DDD4] bg-white shadow-2xs">
        {/* Decorative Top Accent Banner */}
        <div className="h-28 w-full bg-gradient-to-r from-[#10251F] via-[#18342C] to-[#246244] relative">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-[#C7F34A] animate-pulse" />
              Active now
            </span>
          </div>
        </div>

        {/* Profile Info Bar */}
        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative rounded-full ring-4 ring-white shadow-md bg-[#10251F]">
                <RopimoUserAvatar name={fullName} size="xl" className="h-20 w-20 text-2xl font-bold" />
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18221E]">
                    {fullName}
                  </h1>
                  <span className="rounded-full bg-[#EAF4E2] border border-[#D8DDD4] px-2.5 py-0.5 text-[11px] font-bold text-[#246244]">
                    Owner · {workspaceName}
                  </span>
                </div>
                <p className="text-xs text-[#65706A] mt-0.5">
                  {email} · {jobTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D8DDD4] bg-white px-3 py-2 text-xs font-semibold text-[#18221E] shadow-2xs hover:bg-[#FAF9F5] transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#246244]" /> : <Copy className="h-3.5 w-3.5 text-[#65706A]" />}
                <span>{copied ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-6 border-b border-[#E7EADF] pt-2 text-xs font-semibold">
            {[
              { id: "general", label: "Personal Details", icon: User },
              { id: "work", label: "My Work & Summary", icon: Briefcase },
              { id: "notifications", label: "Notifications & Alerts", icon: Bell },
              { id: "security", label: "Security & Sessions", icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "relative flex items-center gap-2 pb-3 transition-colors cursor-pointer",
                    isActive
                      ? "text-[#18221E] font-bold"
                      : "text-[#65706A] hover:text-[#18221E]"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-[#246244]" : "text-[#65706A]")} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#246244]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB CONTENT 1: GENERAL DETAILS */}
      {activeTab === "general" && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-[#18221E]">General Information</h2>
              <p className="text-xs text-[#65706A]">Update your personal identity and profile details visible across your workspace.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#18221E] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#18221E] mb-1.5">Personal Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] px-3.5 py-2.5 text-xs text-[#65706A] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-[#18221E] mb-1.5">Role / Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-[#18221E] mb-1.5">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none transition-colors"
                >
                  <option value="Asia/Dhaka (GMT+6)">Asia/Dhaka (GMT+6)</option>
                  <option value="UTC (GMT+0)">UTC (GMT+0)</option>
                  <option value="America/New_York (GMT-4)">America/New_York (GMT-4)</option>
                  <option value="America/Los_Angeles (GMT-7)">America/Los_Angeles (GMT-7)</option>
                  <option value="Europe/London (GMT+1)">Europe/London (GMT+1)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#18221E] mb-1.5">Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none transition-colors resize-none"
                  placeholder="Tell your team about yourself..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saveStatus === "saving"}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#10251F] px-5 py-2.5 text-xs font-semibold text-[#F4F3EE] shadow-xs hover:bg-[#18342C] transition-colors cursor-pointer"
            >
              {saveStatus === "saved" ? (
                <>
                  <Check className="h-4 w-4 text-[#C7F34A]" />
                  <span>Changes Saved</span>
                </>
              ) : saveStatus === "saving" ? (
                <span>Saving...</span>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT 2: MY WORK & SUMMARY */}
      {activeTab === "work" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">Open Assigned Tasks</span>
              <p className="mt-1 text-2xl font-bold text-[#18221E]">{myTasksCount}</p>
              <Link href="/app/my-tasks" className="mt-2 inline-block text-xs font-bold text-[#246244] hover:underline">
                View all tasks →
              </Link>
            </div>

            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">Completed Tasks</span>
              <p className="mt-1 text-2xl font-bold text-[#18221E]">{completedTasksCount}</p>
              <span className="mt-2 block text-xs text-[#65706A]">Across all projects</span>
            </div>

            <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">Workspace Role</span>
              <p className="mt-1 text-2xl font-bold text-[#18221E]">Admin / Owner</p>
              <span className="mt-2 block text-xs text-[#65706A]">{workspaceName}</span>
            </div>
          </div>

          {/* Assigned Work overview */}
          <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7EADF]">
              <div>
                <h3 className="text-sm font-bold text-[#18221E]">Recent Assigned Work</h3>
                <p className="text-xs text-[#65706A]">Work assigned directly to your profile.</p>
              </div>
              <Link href="/app/my-tasks" className="text-xs font-bold text-[#246244] hover:underline">
                Open My Tasks
              </Link>
            </div>

            <div className="divide-y divide-[#E7EADF] text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#18221E]">Redesign landing page hero section</p>
                  <p className="text-[11px] text-[#65706A]">Website Redesign · Due in 2 days</p>
                </div>
                <span className="rounded-full bg-[#EBF3FE] text-[#1E40AF] px-2.5 py-0.5 text-[10px] font-bold border border-[#BFDBFE]">
                  In Progress
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#18221E]">Update employee onboarding flow</p>
                  <p className="text-[11px] text-[#65706A]">HR System · Due Jun 2</p>
                </div>
                <span className="rounded-full bg-[#FEF6E4] text-[#B58500] px-2.5 py-0.5 text-[10px] font-bold border border-[#F8E3B6]">
                  To Do
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: NOTIFICATIONS & ALERTS */}
      {activeTab === "notifications" && (
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-5 text-xs">
          <div>
            <h2 className="text-sm font-bold text-[#18221E]">Notification Preferences</h2>
            <p className="text-xs text-[#65706A]">Control when and how you receive alerts and updates.</p>
          </div>

          <div className="divide-y divide-[#E7EADF] space-y-1">
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#18221E]">Task assignments & status updates</p>
                <p className="text-[11px] text-[#65706A]">Receive instant alerts when tasks are assigned to you.</p>
              </div>
              <span className="rounded-full bg-[#EAF4E2] text-[#246244] px-2.5 py-0.5 text-[11px] font-bold border border-[#D8DDD4]">
                Enabled
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#18221E]">Leave requests & approvals</p>
                <p className="text-[11px] text-[#65706A]">Notify me whenever a team member requests leave.</p>
              </div>
              <span className="rounded-full bg-[#EAF4E2] text-[#246244] px-2.5 py-0.5 text-[11px] font-bold border border-[#D8DDD4]">
                Enabled
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#18221E]">Weekly workspace digest</p>
                <p className="text-[11px] text-[#65706A]">Get a weekly email summary of key deliverables and events.</p>
              </div>
              <span className="rounded-full bg-[#FAF9F5] text-[#65706A] px-2.5 py-0.5 text-[11px] font-bold border border-[#D8DDD4]">
                Monday 9 AM
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: SECURITY & SESSIONS */}
      {activeTab === "security" && (
        <div className="space-y-5">
          <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-bold text-[#18221E]">Active Sessions</h2>
              <p className="text-xs text-[#65706A]">Devices currently signed in to your account.</p>
            </div>

            <div className="p-4 rounded-[12px] bg-[#FAF9F5] border border-[#D8DDD4] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Laptop className="h-5 w-5 text-[#246244]" />
                <div>
                  <p className="font-bold text-[#18221E]">Windows 11 · Chrome Browser</p>
                  <p className="text-[11px] text-[#65706A]">Dhaka, Bangladesh · Current Session</p>
                </div>
              </div>
              <span className="rounded-full bg-[#EAF4E2] text-[#246244] px-2.5 py-0.5 text-[10px] font-bold border border-[#D8DDD4]">
                Active Now
              </span>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-2xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[#18221E]">Authentication Provider</h3>
            <p className="text-[#65706A]">
              Your account is authenticated securely via Supabase Auth with email verification.
            </p>
            <div className="flex items-center gap-2 text-[#246244] font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Password and session encryption verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

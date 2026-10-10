"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Send,
  UserPlus,
  ArrowRight,
  ExternalLink,
  Shield,
  Search,
  CalendarDays,
  UserCheck,
  RefreshCw,
  Ban,
  AlertTriangle,
  Mail,
  Building2,
} from "lucide-react";
import { WorkspaceInvitation, WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import {
  resendEmployeeInvitationAction,
  revokeEmployeeInvitationAction,
} from "@/lib/invitations/actions";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
import { getAppUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface OnboardingInvitationsViewProps {
  workspaceId: string;
  userRole: string;
  invitations: WorkspaceInvitation[];
  people: WorkspacePerson[];
  departments: Department[];
  onOpenInviteModal: () => void;
}

export function OnboardingInvitationsView({
  workspaceId,
  userRole,
  invitations = [],
  people = [],
  departments = [],
  onOpenInviteModal,
}: OnboardingInvitationsViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "pending" | "accepted" | "expired" | "revoked"
  >("all");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Live timer for 60-second cooldown calculation
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const canManage = ["owner", "admin", "hr"].includes(userRole.toLowerCase());

  // Search-filtered base list
  const searchMatchedInvitations = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return invitations;
    return invitations.filter((inv) => {
      const email = inv.email.toLowerCase();
      const name = (inv.full_name || "").toLowerCase();
      const role = (inv.role || "").toLowerCase();
      const job = (inv.job_title || "").toLowerCase();
      return email.includes(q) || name.includes(q) || role.includes(q) || job.includes(q);
    });
  }, [invitations, searchQuery]);

  // Status counts (matching current search query)
  const counts = React.useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let expired = 0;
    let revoked = 0;

    for (const inv of searchMatchedInvitations) {
      const s = (inv.status || "pending").toLowerCase();
      if (s === "pending") {
        if (inv.expires_at && new Date() > new Date(inv.expires_at)) {
          expired++;
        } else {
          pending++;
        }
      } else if (s === "accepted") {
        accepted++;
      } else if (s === "expired") {
        expired++;
      } else if (s === "revoked") {
        revoked++;
      }
    }

    return {
      all: searchMatchedInvitations.length,
      pending,
      accepted,
      expired,
      revoked,
    };
  }, [searchMatchedInvitations]);

  // Filtered invitations according to selected status filter
  const displayedInvitations = React.useMemo(() => {
    if (statusFilter === "all") return searchMatchedInvitations;

    return searchMatchedInvitations.filter((inv) => {
      const s = (inv.status || "pending").toLowerCase();
      const isExpired = inv.expires_at && new Date() > new Date(inv.expires_at);

      if (statusFilter === "pending") {
        return s === "pending" && !isExpired;
      }
      if (statusFilter === "expired") {
        return s === "expired" || (s === "pending" && isExpired);
      }
      return s === statusFilter;
    });
  }, [searchMatchedInvitations, statusFilter]);

  // Action Handlers
  const handleCopyLink = (inv: WorkspaceInvitation) => {
    const token = inv.token || inv.token_hash || inv.id;
    const origin = typeof window !== "undefined" ? window.location.origin : getAppUrl();
    const inviteUrl = `${origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(inv.id);
    setActionNotice(`Invite link copied to clipboard.`);
    setTimeout(() => {
      setCopiedId(null);
      setActionNotice(null);
    }, 3000);
  };

  const handleResend = async (inv: WorkspaceInvitation) => {
    setResendingId(inv.id);
    setErrorMessage(null);
    try {
      const res = await resendEmployeeInvitationAction({
        workspaceId,
        invitationId: inv.id,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to resend invitation.");
      } else {
        setActionNotice(`Fresh invitation email sent to ${inv.email}.`);
        router.refresh();
      }
    } catch {
      setErrorMessage("Failed to resend invitation.");
    } finally {
      setResendingId(null);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleRevoke = async (inv: WorkspaceInvitation) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${inv.email}?`)) {
      return;
    }

    setRevokingId(inv.id);
    setErrorMessage(null);
    try {
      const res = await revokeEmployeeInvitationAction({
        workspaceId,
        invitationId: inv.id,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to revoke invitation.");
      } else {
        setActionNotice(`Invitation for ${inv.email} revoked.`);
        router.refresh();
      }
    } catch {
      setErrorMessage("Failed to revoke invitation.");
    } finally {
      setRevokingId(null);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  // Helper: Cooldown calculation
  const getCooldown = (lastSentAt?: string | null) => {
    if (!lastSentAt) return 0;
    const sentTime = new Date(lastSentAt).getTime();
    const elapsedSeconds = Math.floor((now - sentTime) / 1000);
    return elapsedSeconds < 60 ? 60 - elapsedSeconds : 0;
  };

  // Helper: Status dot & text
  const renderStatus = (inv: WorkspaceInvitation) => {
    const s = (inv.status || "pending").toLowerCase();
    const isExpired = inv.expires_at && new Date() > new Date(inv.expires_at);

    if (s === "accepted") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#246244]">
          <span className="w-2 h-2 rounded-full bg-[#246244]" />
          <span>Accepted</span>
        </span>
      );
    }

    if (s === "revoked") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#D93025]">
          <span className="w-2 h-2 rounded-full bg-[#D93025]" />
          <span>Revoked</span>
        </span>
      );
    }

    if (s === "expired" || isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9A9A9A]">
          <span className="w-2 h-2 rounded-full bg-[#9A9A9A]" />
          <span>Expired</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#B58500]">
        <span className="w-2 h-2 rounded-full bg-[#B58500]" />
        <span>Pending</span>
      </span>
    );
  };

  // Helper: Correct date for status
  const renderDate = (inv: WorkspaceInvitation) => {
    const s = (inv.status || "pending").toLowerCase();
    const isExpired = inv.expires_at && new Date() > new Date(inv.expires_at);

    if (s === "accepted" && inv.accepted_at) {
      return (
        <div>
          <span className="text-[12px] text-[#111111] font-medium">
            Accepted {new Date(inv.accepted_at).toLocaleDateString()}
          </span>
        </div>
      );
    }

    if (s === "revoked") {
      return (
        <div>
          <span className="text-[12px] text-[#6B6B6B]">
            Revoked {inv.updated_at ? new Date(inv.updated_at).toLocaleDateString() : ""}
          </span>
        </div>
      );
    }

    if (s === "expired" || isExpired) {
      return (
        <div>
          <span className="text-[12px] text-[#D93025]">
            Expired {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : ""}
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        <p className="text-[12px] text-[#111111] font-medium">
          Sent {new Date(inv.created_at).toLocaleDateString()}
        </p>
        <p className="text-[11px] text-[#9A9A9A]">
          Expires {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "in 7 days"}
        </p>
      </div>
    );
  };

  // Helper: Email delivery badge
  const renderEmailStatus = (inv: WorkspaceInvitation) => {
    const emStatus = (inv.email_status || "queued").toLowerCase();

    if (emStatus === "delivered") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#EAF4E2] text-[#246244] text-[11px] font-medium">
          <Check className="w-3 h-3" />
          <span>Delivered</span>
        </span>
      );
    }

    if (emStatus === "bounced") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#FCE8E6] text-[#D93025] text-[11px] font-semibold">
          <AlertTriangle className="w-3 h-3" />
          <span>Bounced</span>
        </span>
      );
    }

    if (emStatus === "complained") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#FCE8E6] text-[#D93025] text-[11px] font-medium">
          <span>Complained</span>
        </span>
      );
    }

    if (emStatus === "sent") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#FAF9F5] border border-[#E9E6DA] text-[#6B6B6B] text-[11px] font-medium">
          <span>Sent</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#FAF9F5] border border-[#E9E6DA] text-[#9A9A9A] text-[11px] font-medium">
        <span>Queued</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 select-none">
      {/* 1. TOP STAT METRICS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-[#E9E6DA] bg-[#FFFFFF] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#6B6B6B]">Pending invitations</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#FEF6E4] text-[#B58500] border border-[#F8E3B6]">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#111111] tabular-nums">{counts.pending}</p>
          <p className="text-[11px] text-[#9A9A9A] mt-0.5">Awaiting teammate acceptance</p>
        </div>

        <div className="rounded-[12px] border border-[#E9E6DA] bg-[#FFFFFF] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#6B6B6B]">Accepted members</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#EAF4E2] text-[#246244] border border-[#C2E0C8]">
              <UserCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#111111] tabular-nums">{counts.accepted}</p>
          <p className="text-[11px] text-[#9A9A9A] mt-0.5">Joined via invitation link</p>
        </div>

        <div className="rounded-[12px] border border-[#E9E6DA] bg-[#FFFFFF] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#6B6B6B]">Active directory team</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#FAF9F5] text-[#111111] border border-[#E9E6DA]">
              <Shield className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#111111] tabular-nums">{people.length}</p>
          <p className="text-[11px] text-[#9A9A9A] mt-0.5">Members in workspace</p>
        </div>
      </div>

      {/* NOTICES */}
      {actionNotice && (
        <div className="rounded-[8px] border border-[#C2E0C8] bg-[#EAF4E2] p-3 text-[12px] font-medium text-[#246244] flex items-center justify-between">
          <span>✓ {actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-[#246244] hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-[8px] border border-[#F5C2C7] bg-[#FCE8E6] p-3 text-[12px] font-medium text-[#D93025] flex items-center justify-between">
          <span>✕ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#D93025] hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. TOOLBAR (SEARCH + STATUS FILTERS + INVITE BUTTON) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A9A9A]" />
            <input
              type="text"
              placeholder="Search invited teammates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-[8px] border border-[#E9E6DA] bg-white pl-9 pr-3 text-[12px] text-[#111111] placeholder:text-[#9A9A9A] shadow-2xs focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>

          {/* Filter Pills with Exact Counts */}
          <div className="flex items-center gap-1 rounded-[8px] border border-[#E9E6DA] bg-white p-1 text-[12px] shadow-2xs overflow-x-auto">
            {[
              { id: "all", label: "All", count: counts.all },
              { id: "pending", label: "Pending", count: counts.pending },
              { id: "accepted", label: "Accepted", count: counts.accepted },
              { id: "expired", label: "Expired", count: counts.expired },
              { id: "revoked", label: "Revoked", count: counts.revoked },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={cn(
                  "rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                  statusFilter === st.id
                    ? "bg-[#111111] text-white font-semibold"
                    : "text-[#6B6B6B] hover:bg-[#FAF9F5] hover:text-[#111111]"
                )}
              >
                <span>{st.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full tabular-nums",
                    statusFilter === st.id ? "bg-white/20 text-white" : "bg-[#FAF9F5] text-[#9A9A9A]"
                  )}
                >
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={onOpenInviteModal}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#111111] px-3.5 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#222222] transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite people</span>
          </button>
        )}
      </div>

      {/* 3. INVITATIONS TABLE */}
      <div className="rounded-[12px] border border-[#E9E6DA] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[#E9E6DA] bg-[#FAF9F5] text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                <th className="py-3 px-4">Invitee</th>
                <th className="py-3 px-4">Role & department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Email status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E6DA]">
              {displayedInvitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-[#FAF9F5] border border-[#E9E6DA] flex items-center justify-center text-[#9A9A9A] mb-2">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <p className="text-[13px] font-semibold text-[#111111]">
                        No invitations match your filter
                      </p>
                      <p className="text-[12px] text-[#6B6B6B] mt-0.5">
                        Invite a new teammate using the button above to generate a join link.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedInvitations.map((inv) => {
                  const isCopied = copiedId === inv.id;
                  const isResending = resendingId === inv.id;
                  const isRevoking = revokingId === inv.id;
                  const isPending = (inv.status || "pending").toLowerCase() === "pending";
                  const isExpired = inv.expires_at && new Date() > new Date(inv.expires_at);

                  // Cooldown & resend limits
                  const cooldownSeconds = getCooldown(inv.last_sent_at);
                  const isCooldownActive = cooldownSeconds > 0;
                  const resendCount = Number(inv.resend_count || 0);
                  const isMaxResendReached = resendCount >= 5;

                  // Department name resolution
                  const targetDeptIds: string[] = Array.isArray(inv.department_ids) && inv.department_ids.length > 0
                    ? inv.department_ids
                    : inv.department_id
                    ? [inv.department_id]
                    : [];

                  const deptNames = targetDeptIds
                    .map((id) => departments.find((d) => d.id === id)?.name)
                    .filter(Boolean);

                  const isBounced = (inv.email_status || "").toLowerCase() === "bounced";

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-[#FAF9F5] transition-colors">
                        {/* 1. Invitee */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <RopimoUserAvatar name={inv.full_name || inv.email} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#111111] truncate">
                                {inv.full_name || inv.email.split("@")[0]}
                              </p>
                              <p className="text-[11px] text-[#6B6B6B] truncate font-mono">
                                {inv.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Role and Department */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="capitalize px-2 py-0.5 rounded-[4px] bg-[#ECE9DD] text-[#111111] text-[11px] font-semibold">
                              {inv.role}
                            </span>
                            {inv.is_lead && (
                              <span className="px-2 py-0.5 rounded-[4px] bg-[#FAF9F5] border border-[#E9E6DA] text-[#111111] text-[10px] font-semibold">
                                Lead
                              </span>
                            )}
                            {deptNames.map((dName, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded-[4px] bg-[#FAF9F5] border border-[#E9E6DA] text-[#6B6B6B] text-[10px]"
                              >
                                {dName}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 3. Status (dot) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatus(inv)}
                        </td>

                        {/* 4. Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderDate(inv)}
                        </td>

                        {/* 5. Email status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderEmailStatus(inv)}
                        </td>

                        {/* 6. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Copy Link */}
                            <button
                              type="button"
                              onClick={() => handleCopyLink(inv)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer border",
                                isCopied
                                  ? "bg-[#EAF4E2] text-[#246244] border-[#C2E0C8]"
                                  : "bg-white text-[#111111] border-[#E9E6DA] hover:bg-[#FAF9F5]"
                              )}
                              title="Copy invitation link"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3 text-[#246244]" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 text-[#6B6B6B]" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Resend with 60s cooldown and max 5 */}
                            {isPending && !isExpired && canManage && (
                              <button
                                type="button"
                                disabled={isResending || isCooldownActive || isMaxResendReached}
                                onClick={() => handleResend(inv)}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-[6px] border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer",
                                  isCooldownActive || isMaxResendReached
                                    ? "bg-[#FAF9F5] border-[#E9E6DA] text-[#9A9A9A] cursor-not-allowed"
                                    : "bg-white border-[#E9E6DA] text-[#111111] hover:bg-[#FAF9F5]"
                                )}
                                title={
                                  isMaxResendReached
                                    ? "Max 5 resends reached"
                                    : isCooldownActive
                                    ? `Wait ${cooldownSeconds}s before resending`
                                    : "Resend invitation email"
                                }
                              >
                                <RefreshCw
                                  className={cn("h-3 w-3", isResending && "animate-spin")}
                                />
                                <span>
                                  {isResending
                                    ? "Sending..."
                                    : isMaxResendReached
                                    ? "Max (5)"
                                    : isCooldownActive
                                    ? `${cooldownSeconds}s`
                                    : "Resend"}
                                </span>
                              </button>
                            )}

                            {/* Revoke */}
                            {isPending && canManage && (
                              <button
                                type="button"
                                disabled={isRevoking}
                                onClick={() => handleRevoke(inv)}
                                className="inline-flex items-center gap-1 rounded-[6px] border border-[#E9E6DA] bg-white px-2 py-1 text-[11px] font-medium text-[#6B6B6B] hover:text-[#D93025] hover:border-[#F5C2C7] transition-all cursor-pointer disabled:opacity-50"
                                title="Revoke invitation"
                              >
                                <Ban className="h-3 w-3" />
                                <span>Revoke</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Warning row for bounces */}
                      {isBounced && (
                        <tr className="bg-[#FEF6E4]/50 border-b border-[#F8E3B6]">
                          <td colSpan={6} className="py-2 px-4 text-[11px] text-[#B58500] font-medium">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#B58500] flex-shrink-0" />
                              <span>
                                Delivery bounced: The email to {inv.email} could not be delivered. Please verify the email address or share the invite link directly.
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

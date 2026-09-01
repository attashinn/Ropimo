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
  Sparkles,
  CalendarDays,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { WorkspaceInvitation, WorkspacePerson } from "@/types/people";
import { Department } from "@/types/department";
import { resendEmployeeInvitationAction } from "@/lib/invitations/actions";
import { RopimoUserAvatar } from "@/components/ropimo/ropimo-user-avatar";
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
  const [statusFilter, setStatusFilter] = React.useState<"all" | "pending" | "accepted" | "expired">("all");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);

  const canManage = ["owner", "admin", "manager"].includes(userRole);

  const pendingInvs = invitations.filter((i) => (i.status || "Pending").toLowerCase() === "pending");
  const acceptedInvs = invitations.filter((i) => (i.status || "").toLowerCase() === "accepted");
  const expiredInvs = invitations.filter((i) => (i.status || "").toLowerCase() === "expired");

  const handleCopyLink = (inv: WorkspaceInvitation) => {
    const token = inv.token || inv.id;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const inviteUrl = `${origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(inv.id);
    setActionNotice(`Invite link for ${inv.full_name || inv.email} copied to clipboard!`);
    setTimeout(() => {
      setCopiedId(null);
      setActionNotice(null);
    }, 3000);
  };

  const handleResendInvite = async (inv: WorkspaceInvitation) => {
    setResendingId(inv.id);
    try {
      const res = await resendEmployeeInvitationAction({
        workspaceId,
        invitationId: inv.id,
      });
      if (res.success) {
        setActionNotice(`Fresh invitation link sent & generated for ${inv.email}!`);
        router.refresh();
      }
    } catch {
      setActionNotice("Failed to resend invitation.");
    } finally {
      setResendingId(null);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // Filtered invitations
  const filteredInvitations = React.useMemo(() => {
    return invitations.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (inv.full_name && inv.full_name.toLowerCase().includes(q)) ||
        inv.email.toLowerCase().includes(q) ||
        (inv.job_title && inv.job_title.toLowerCase().includes(q));

      const s = (inv.status || "Pending").toLowerCase();
      const matchesStatus = statusFilter === "all" || s === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invitations, searchQuery, statusFilter]);

  const getStatusBadge = (status?: string | null, expiresAt?: string | null) => {
    const s = (status || "Pending").toLowerCase();
    const isExpired = expiresAt && new Date() > new Date(expiresAt);

    if (s === "accepted") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C2E0C8] bg-[#EAF4E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#246244]">
          <CheckCircle2 className="h-3 w-3" />
          Joined & Active
        </span>
      );
    }

    if (s === "expired" || isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
          <Clock className="h-3 w-3" />
          Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F8E3B6] bg-[#FEF6E4] px-2.5 py-0.5 text-[11px] font-semibold text-[#B58500]">
        <Clock className="h-3 w-3" />
        Pending Invitation
      </span>
    );
  };

  const formatExpiry = (dateStr?: string | null) => {
    if (!dateStr) return "In 7 days";
    try {
      const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diff <= 0) return "Expired";
      if (diff === 1) return "Expires in 1 day";
      return `Expires in ${diff} days`;
    } catch {
      return "Valid for 7 days";
    }
  };

  return (
    <div className="space-y-5 select-none">
      {/* 1. TOP STAT METRICS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65706A]">Pending Invitations</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#FEF6E4] text-[#B58500] border border-[#F8E3B6]">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#18221E]">{pendingInvs.length}</p>
          <p className="text-[11px] text-[#8A958F] mt-0.5">Awaiting link acceptance</p>
        </div>

        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65706A]">Accepted / In Onboarding</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#EAF4E2] text-[#246244] border border-[#C2E0C8]">
              <UserCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#18221E]">{acceptedInvs.length}</p>
          <p className="text-[11px] text-[#8A958F] mt-0.5">Invites completed</p>
        </div>

        <div className="rounded-[14px] border border-[#D8DDD4] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#65706A]">Active Workspace Team</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#10251F] text-[#C7F34A]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#18221E]">{people.length}</p>
          <p className="text-[11px] text-[#8A958F] mt-0.5">Members in directory</p>
        </div>
      </div>

      {/* ACTION NOTICE TOAST */}
      {actionNotice && (
        <div className="rounded-[10px] border border-[#246244]/30 bg-[#EAF4E2] p-3 text-xs font-semibold text-[#246244] flex items-center justify-between animate-in fade-in duration-150">
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

      {/* 2. TOOLBAR (SEARCH + FILTER + INVITE) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#65706A]" />
            <input
              type="text"
              placeholder="Search invited teammates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-[10px] border border-[#D8DDD4] bg-white pl-9 pr-3 text-xs text-[#18221E] placeholder:text-[#8A958F] shadow-2xs focus:border-[#10251F] focus:outline-none transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 rounded-[10px] border border-[#D8DDD4] bg-white p-1 text-xs shadow-2xs">
            {[
              { id: "all", label: `All (${invitations.length})` },
              { id: "pending", label: `Pending (${pendingInvs.length})` },
              { id: "accepted", label: `Accepted (${acceptedInvs.length})` },
              { id: "expired", label: `Expired (${expiredInvs.length})` },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={cn(
                  "rounded-[6px] px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                  statusFilter === st.id
                    ? "bg-[#10251F] text-white font-bold"
                    : "text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E]"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={onOpenInviteModal}
            className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#10251F] px-3.5 text-xs font-semibold text-[#F4F3EE] shadow-xs hover:bg-[#18342C] transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5 text-[#C7F34A]" />
            <span>Invite teammate</span>
          </button>
        )}
      </div>

      {/* 3. INVITATIONS TABLE */}
      <div className="rounded-[16px] border border-[#D8DDD4] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E7EADF] bg-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                <th className="py-3 px-4 font-bold">INVITEE</th>
                <th className="py-3 px-4 font-bold">ROLE & DEPT</th>
                <th className="py-3 px-4 font-bold text-center">INVITE STATUS</th>
                <th className="py-3 px-4 font-bold">EXPIRATION</th>
                <th className="py-3 px-4 font-bold text-right">ONBOARDING & ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EADF]">
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-[#FAF9F5] border border-[#D8DDD4] flex items-center justify-center text-[#8A958F] mb-2">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-[#18221E]">No invitations match your filter</p>
                      <p className="text-[11px] text-[#65706A] mt-0.5">
                        Invite a new teammate using the button above to generate a join link.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((inv) => {
                  const isCopied = copiedId === inv.id;
                  const isResending = resendingId === inv.id;
                  const isPending = (inv.status || "Pending").toLowerCase() === "pending";
                  const targetDept = departments.find((d) => d.id === inv.department_id);

                  return (
                    <tr key={inv.id} className="hover:bg-[#FAF9F5] transition-colors">
                      {/* Invitee Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <RopimoUserAvatar name={inv.full_name || inv.email} size="sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-[#18221E] truncate">
                              {inv.full_name || inv.email.split("@")[0]}
                            </p>
                            <p className="text-[11px] text-[#65706A] truncate">{inv.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#18221E] truncate max-w-[160px]">
                          {inv.job_title || inv.role || "Member"}
                        </p>
                        <span className="text-[10px] text-[#8A958F]">
                          {targetDept?.name ? `${targetDept.name} · ` : ""}
                          <span className="capitalize">{inv.role}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(inv.status, inv.expires_at)}
                      </td>

                      {/* Expiration */}
                      <td className="py-3.5 px-4 text-[11px] text-[#65706A] whitespace-nowrap">
                        <p className="font-medium">{formatExpiry(inv.expires_at)}</p>
                        <p className="text-[10px] text-[#8A958F]">
                          Sent {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs border",
                              isCopied
                                ? "bg-[#EAF4E2] text-[#246244] border-[#C2E0C8]"
                                : "bg-white text-[#18221E] border-[#D8DDD4] hover:bg-[#FAF9F5] hover:border-[#B8C0B2]"
                            )}
                            title="Copy live invitation URL"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3 w-3 text-[#246244]" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-[#65706A]" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {/* Resend Button */}
                          {isPending && canManage && (
                            <button
                              type="button"
                              disabled={isResending}
                              onClick={() => handleResendInvite(inv)}
                              className="inline-flex items-center gap-1 rounded-[8px] border border-[#D8DDD4] bg-white px-2.5 py-1 text-xs font-semibold text-[#65706A] hover:bg-[#FAF9F5] hover:text-[#18221E] transition-all cursor-pointer disabled:opacity-50"
                              title="Resend invitation email and generate fresh token"
                            >
                              <RefreshCw className={cn("h-3 w-3", isResending && "animate-spin")} />
                              <span>{isResending ? "Sending..." : "Resend"}</span>
                            </button>
                          )}

                          {/* View Onboarding Checklist Link */}
                          <Link
                            href={`/app/people/onboarding/${inv.user_id || inv.employee_id || inv.id}`}
                            className="inline-flex items-center gap-1 rounded-[8px] bg-[#FAF9F5] border border-[#D8DDD4] px-2.5 py-1 text-xs font-semibold text-[#246244] hover:bg-[#EAF4E2] hover:border-[#C2E0C8] transition-all no-underline"
                            title="Open onboarding checklist"
                          >
                            <span>Onboarding</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
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

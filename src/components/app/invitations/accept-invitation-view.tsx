"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  acceptWorkspaceInvitationAction,
  requestNewInviteAction,
} from "@/lib/invitations/actions";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceInvitation } from "@/types/people";
import {
  Check,
  AlertCircle,
  Building2,
  Users,
  Shield,
  ArrowRight,
  LogOut,
  Mail,
  Clock,
  Ban,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AcceptInvitationViewProps {
  token: string;
  invitation: WorkspaceInvitation | null;
  state: "valid" | "expired" | "revoked" | "accepted" | "invalid";
  workspaceName?: string;
  departmentNames?: string[];
  departmentName?: string;
  inviterName?: string;
  inviterEmail?: string;
  error?: string;
  currentUser?: { id: string; email: string } | null;
  hasExistingAccount?: boolean;
  existingUserName?: string | null;
  isAlreadyMember?: boolean;
}

export function AcceptInvitationView({
  token,
  invitation,
  state: initialState,
  workspaceName = "Workspace",
  departmentNames = [],
  inviterName = "A team administrator",
  inviterEmail,
  error: initialError,
  currentUser,
  hasExistingAccount = false,
  existingUserName,
  isAlreadyMember = false,
}: AcceptInvitationViewProps) {
  const router = useRouter();

  const [state, setState] = React.useState(initialState);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(initialError || null);

  // Expired screen request new invite state
  const [isRequestingNew, setIsRequestingNew] = React.useState(false);
  const [newInviteRequested, setNewInviteRequested] = React.useState(false);

  // Accepted screen welcome checklist state
  const [acceptedData, setAcceptedData] = React.useState<{
    workspaceId?: string;
    employeeId?: string;
    role?: string;
  } | null>(null);

  // Editable details for onboarding confirmation
  const [fullName, setFullName] = React.useState(
    invitation?.full_name ||
      existingUserName ||
      (currentUser?.email ? currentUser.email.split("@")[0] : "")
  );
  const [jobTitle, setJobTitle] = React.useState(invitation?.job_title || "");

  // Email match verification
  const isEmailMatch = Boolean(
    currentUser?.email &&
      invitation?.email &&
      currentUser.email.toLowerCase().trim() === invitation.email.toLowerCase().trim()
  );

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.reload();
    } catch {}
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await acceptWorkspaceInvitationAction({
        token,
        fullName: fullName.trim(),
        jobTitle: jobTitle.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to accept invitation.");
        setIsSubmitting(false);
        return;
      }

      setAcceptedData({
        workspaceId: res.workspaceId,
        employeeId: res.employeeId,
        role: res.role,
      });
      setState("accepted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const handleRequestNewInvite = async () => {
    setIsRequestingNew(true);
    try {
      const res = await requestNewInviteAction(token);
      if (res.success) {
        setNewInviteRequested(true);
      } else {
        setErrorMessage(res.error || "Failed to send notification to inviter.");
      }
    } catch {
      setErrorMessage("Failed to send notification to inviter.");
    } finally {
      setIsRequestingNew(false);
    }
  };

  const allDepts =
    departmentNames.length > 0
      ? departmentNames
      : invitation?.department_name
      ? [invitation.department_name]
      : [];

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. INVALID TOKEN SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (state === "invalid" || !invitation) {
    return (
      <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-center items-center p-4 antialiased">
        <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] p-8 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#FAF9F5] border border-[#E9E6DA] text-[#6B6B6B] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-[#9A9A9A]" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-[17px] font-semibold text-[#111111]">
              Invalid invitation link
            </h1>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
              {errorMessage ||
                "This invitation link does not exist, has already been used, or was damaged. Please check the URL or ask your administrator for a new invite."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex h-9 px-4 rounded-[8px] bg-[#111111] text-white text-[12px] font-semibold items-center justify-center hover:bg-[#222222] transition-colors"
            >
              Back to Zambic
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. EXPIRED INVITATION SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (state === "expired") {
    return (
      <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-center items-center p-4 antialiased">
        <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] p-8 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#FEF6E4] border border-[#F8E3B6] text-[#B58500] flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-[17px] font-semibold text-[#111111]">
              This invitation has expired
            </h1>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
              Invitations are valid for 7 days. You can request a fresh invitation link from{" "}
              <strong className="text-[#111111]">{inviterName}</strong>.
            </p>
          </div>

          {newInviteRequested ? (
            <div className="p-3.5 rounded-[8px] bg-[#EAF4E2] border border-[#C2E0C8] text-[12px] text-[#246244] font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>We notified {inviterName}. They will email you a new invite.</span>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                disabled={isRequestingNew}
                onClick={handleRequestNewInvite}
                className="w-full h-10 px-4 rounded-[8px] bg-[#111111] text-white text-[13px] font-semibold hover:bg-[#222222] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isRequestingNew ? "Sending request..." : "Ask for a new invite"}
              </button>
            </div>
          )}

          <div className="text-[11px] text-[#9A9A9A]">
            Invited email: <span className="font-mono">{invitation.email}</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REVOKED INVITATION SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (state === "revoked") {
    return (
      <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-center items-center p-4 antialiased">
        <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] p-8 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#FCE8E6] border border-[#F5C2C7] text-[#D93025] flex items-center justify-center mx-auto">
            <Ban className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-[17px] font-semibold text-[#111111]">
              Invitation revoked
            </h1>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
              An administrator has revoked or cancelled this invitation. Please contact your
              team administrator for a new invite if you still need access.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex h-9 px-4 rounded-[8px] bg-[#111111] text-white text-[12px] font-semibold items-center justify-center hover:bg-[#222222] transition-colors"
            >
              Back to Zambic
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ALREADY ACCEPTED SCREEN / WELCOME CHECKLIST
  // ─────────────────────────────────────────────────────────────────────────────
  if (state === "accepted" || isAlreadyMember) {
    return (
      <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-center items-center p-4 antialiased">
        <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] p-8 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#EAF4E2] border border-[#C2E0C8] text-[#246244] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-[18px] font-semibold text-[#111111]">
              Welcome to {workspaceName}
            </h1>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
              You are a member of <strong className="text-[#111111]">{workspaceName}</strong> as a{" "}
              <strong className="text-[#111111] capitalize">
                {acceptedData?.role || invitation.role}
              </strong>
              {acceptedData?.employeeId ? ` (${acceptedData.employeeId})` : ""}.
            </p>
          </div>

          {/* Quick Welcome Checklist */}
          <div className="p-4 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA] text-left space-y-2.5">
            <span className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">
              Welcome checklist
            </span>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2 text-[#246244]">
                <Check className="w-4 h-4 text-[#246244]" />
                <span className="line-through text-[#6B6B6B]">Accept workspace invitation</span>
              </div>
              <div className="flex items-center gap-2 text-[#111111]">
                <span className="w-4 h-4 rounded-full border border-[#CCCCCC] flex items-center justify-center text-[10px] text-[#6B6B6B]">
                  2
                </span>
                <span>Review your team and projects</span>
              </div>
              <div className="flex items-center gap-2 text-[#111111]">
                <span className="w-4 h-4 rounded-full border border-[#CCCCCC] flex items-center justify-center text-[10px] text-[#6B6B6B]">
                  3
                </span>
                <span>Update profile and emergency contact</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/app"
              className="w-full h-10 px-4 rounded-[8px] bg-[#111111] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#222222] transition-colors"
            >
              <span>Go to workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. VALID INVITATION SCREEN (LOGGED IN VS LOGGED OUT)
  // ─────────────────────────────────────────────────────────────────────────────

  // Case A: User is logged in with WRONG email
  if (currentUser && !isEmailMatch) {
    return (
      <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-center items-center p-4 antialiased">
        <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] p-8 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#FEF6E4] border border-[#F8E3B6] text-[#B58500] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-[17px] font-semibold text-[#111111]">
              Wrong account logged in
            </h1>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
              This invite is for <strong className="text-[#111111]">{invitation.email}</strong>.
              You are currently signed in as{" "}
              <strong className="text-[#111111]">{currentUser.email}</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA] text-[12px] text-[#6B6B6B] text-left">
            Sign out of your current account to continue accepting this invitation.
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full h-10 px-4 rounded-[8px] bg-[#111111] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#222222] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out to continue</span>
            </button>
            <Link
              href="/"
              className="w-full h-9 rounded-[8px] border border-[#E9E6DA] bg-white text-[12px] font-medium text-[#6B6B6B] hover:text-[#111111] flex items-center justify-center hover:bg-[#FAF9F5] transition-colors"
            >
              Cancel and return home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case B: User is LOGGED OUT
  if (!currentUser) {
    const inviteReturnUrl = `/invite/${token}`;
    const loginUrl = `/login?email=${encodeURIComponent(
      invitation.email
    )}&next=${encodeURIComponent(inviteReturnUrl)}&locked=true`;
    const signupUrl = `/signup?email=${encodeURIComponent(
      invitation.email
    )}&next=${encodeURIComponent(inviteReturnUrl)}&locked=true`;

    return (
      <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-center items-center p-4 antialiased">
        <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <span className="text-[12px] font-bold tracking-wider text-[#111111]">ZAMBIC</span>
            <h1 className="text-[18px] font-semibold text-[#111111]">Join {workspaceName}</h1>
            <p className="text-[13px] text-[#6B6B6B]">
              <strong className="text-[#111111]">{inviterName}</strong> invited you to join as a{" "}
              <strong className="text-[#111111] capitalize">{invitation.role}</strong>
              {allDepts.length > 0 ? ` (${allDepts.join(", ")})` : ""}.
            </p>
          </div>

          {/* Invitation Details Summary */}
          <div className="p-4 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA] space-y-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-[#6B6B6B]">Invited email:</span>
              <span className="font-mono text-[#111111] font-medium">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B6B6B]">Role:</span>
              <span className="capitalize text-[#111111] font-semibold">{invitation.role}</span>
            </div>
            {allDepts.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#6B6B6B]">Department:</span>
                <span className="text-[#111111] font-medium">{allDepts.join(", ")}</span>
              </div>
            )}
            {invitation.message && (
              <div className="pt-2 border-t border-[#E9E6DA] text-[#6B6B6B] italic">
                &ldquo;{invitation.message}&rdquo;
              </div>
            )}
          </div>

          {/* Action based on existing account */}
          {hasExistingAccount ? (
            <div className="space-y-3">
              <div className="p-3 rounded-[8px] bg-[#ECE9DD] text-[12px] text-[#6B6B6B] flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#111111] flex-shrink-0" />
                <span>Existing account found. Sign in with {invitation.email} to accept.</span>
              </div>
              <Link
                href={loginUrl}
                className="w-full h-10 px-4 rounded-[8px] bg-[#111111] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#222222] transition-colors"
              >
                <span>Log in to accept invitation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-[8px] bg-[#ECE9DD] text-[12px] text-[#6B6B6B] flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#111111] flex-shrink-0" />
                <span>Email will be prefilled and locked to {invitation.email}.</span>
              </div>
              <Link
                href={signupUrl}
                className="w-full h-10 px-4 rounded-[8px] bg-[#111111] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#222222] transition-colors"
              >
                <span>Create account & accept</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="text-center pt-1">
                <Link
                  href={loginUrl}
                  className="text-[12px] text-[#6B6B6B] hover:text-[#111111] underline transition-colors"
                >
                  Already have an account? Log in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Case C: User is LOGGED IN with MATCHING email -> Confirm & Accept!
  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-center items-center p-4 antialiased">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E9E6DA] rounded-[12px] p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <span className="text-[12px] font-bold tracking-wider text-[#111111]">ZAMBIC</span>
          <h1 className="text-[18px] font-semibold text-[#111111]">Join {workspaceName}</h1>
          <p className="text-[13px] text-[#6B6B6B]">
            <strong className="text-[#111111]">{inviterName}</strong> invited you to join the team.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-[8px] bg-[#FCE8E6] border border-[#F5C2C7] text-[#D93025] text-[12px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Invitation Card */}
        <div className="p-4 rounded-[8px] bg-[#FAF9F5] border border-[#E9E6DA] space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#6B6B6B]">Signed in as:</span>
            <span className="font-mono text-[#111111] font-medium">{currentUser.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B6B6B]">Assigned role:</span>
            <span className="capitalize text-[#111111] font-semibold">{invitation.role}</span>
          </div>
          {allDepts.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[#6B6B6B]">Department:</span>
              <span className="text-[#111111] font-medium">
                {allDepts.join(", ")} {invitation.is_lead ? "(Lead)" : ""}
              </span>
            </div>
          )}
          {invitation.message && (
            <div className="pt-2 border-t border-[#E9E6DA] text-[#6B6B6B] italic">
              &ldquo;{invitation.message}&rdquo;
            </div>
          )}
        </div>

        {/* Confirmation Form */}
        <form onSubmit={handleAcceptInvitation} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[12px] font-semibold text-[#111111]">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full h-10 px-3 rounded-[8px] border border-[#E9E6DA] bg-white text-[13px] text-[#111111] focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[12px] font-semibold text-[#111111]">Job title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full h-10 px-3 rounded-[8px] border border-[#E9E6DA] bg-white text-[13px] text-[#111111] focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !fullName.trim()}
              className="w-full h-10 px-4 rounded-[8px] bg-[#111111] text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#222222] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                "Joining workspace..."
              ) : (
                <>
                  <span>Accept invitation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sign Out Option */}
        <div className="text-center pt-1 border-t border-[#E9E6DA]">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[12px] text-[#6B6B6B] hover:text-[#D93025] transition-colors cursor-pointer"
          >
            Not you? Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

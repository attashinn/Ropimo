"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { WorkspaceInvitation } from "@/types/people";
import { submitEmployeeOnboardingAction } from "@/lib/people/actions";
import { signInWithOtpAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { LogoIcon } from "@/components/landing/icons";
import {
  User,
  Phone,
  MapPin,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Check,
  Camera,
  Eye,
  EyeOff,
  Building2,
  Mail,
  Loader2,
  CheckCircle2,
  LogIn,
} from "lucide-react";

export interface AcceptInvitationViewProps {
  invitation: WorkspaceInvitation | null;
  workspaceName?: string;
  departmentName?: string;
  inviterName?: string;
  error?: string;
  currentUser?: { id: string; email: string } | null;
  hasExistingAccount?: boolean;
  existingUserName?: string | null;
  isAlreadyMember?: boolean;
  isAccepted?: boolean;
}

export function AcceptInvitationView({
  invitation,
  workspaceName = "Workspace",
  departmentName,
  inviterName,
  error: initialError,
  currentUser,
  hasExistingAccount = false,
  existingUserName,
  isAlreadyMember = false,
  isAccepted = false,
}: AcceptInvitationViewProps) {
  const router = useRouter();

  // Check if currently authenticated
  const isCurrentlyLoggedIn = Boolean(currentUser);
  const isMatchingEmail = Boolean(
    currentUser?.email &&
    invitation?.email &&
    currentUser.email.toLowerCase() === invitation.email.toLowerCase()
  );

  // Wizard Step: 1 = Account Credentials, 2 = Profile Details
  const [step, setStep] = React.useState<1 | 2>(1);

  // Form Fields
  const [fullName, setFullName] = React.useState(
    invitation?.full_name || existingUserName || (currentUser?.email ? currentUser.email.split("@")[0] : "")
  );
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  // Avatar Upload
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(initialError || null);
  const [joinedSuccess, setJoinedSuccess] = React.useState(false);
  const [magicLinkSent, setMagicLinkSent] = React.useState(false);
  const [sendingMagicLink, setSendingMagicLink] = React.useState(false);

  // Avatar Initials
  const initials = React.useMemo(() => {
    if (!fullName.trim()) return "U";
    return fullName
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [fullName]);

  // Invalid Token Screen
  if (!invitation) {
    return (
      <div className="min-h-screen bg-[#0C1613] flex flex-col items-center justify-center p-4 text-[#F4F3EE] antialiased">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-[24px] border border-[#234B3D]/60 bg-[#10251F]/90 p-8 shadow-2xl text-center space-y-5 backdrop-blur-xl"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-2xl font-bold">
            !
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Invitation Not Found</h1>
            <p className="text-xs text-[#8C9E94] leading-relaxed">
              {initialError || "This invitation link is invalid or has expired. Please ask your workspace administrator to resend the invite."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-[12px] bg-[#C7F34A] px-5 py-2.5 text-xs font-bold text-[#10251F] hover:bg-[#D7F76B] transition-all shadow-md"
            >
              Go to Sign In &rarr;
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Handle Photo Selection & Upload directly to /api/upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Profile photo must be less than 10MB.");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    setIsUploadingPhoto(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");
      formData.append("workspaceId", invitation?.workspace_id || "default");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAvatarUrl(data.fileUrl || data.url);
      } else {
        console.warn("Upload fallback:", data.error);
      }
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // One-click join handler for currently authenticated user
  const handleQuickJoin = async () => {
    if (!invitation) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitEmployeeOnboardingAction({
        workspaceId: invitation.workspace_id,
        token: invitation.token || "",
        fullName: fullName || existingUserName || currentUser?.email?.split("@")[0] || "Team Member",
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to join workspace.");
        setSubmitting(false);
        return;
      }

      setJoinedSuccess(true);
      setSubmitting(false);
      setTimeout(() => {
        window.location.href = "/app";
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  // Send magic link for passwordless login and workspace join
  const handleSendMagicLink = async () => {
    if (!invitation?.email) return;
    setSendingMagicLink(true);
    setErrorMsg(null);

    try {
      if (!isAlreadyMember) {
        await submitEmployeeOnboardingAction({
          workspaceId: invitation.workspace_id,
          token: invitation.token || "",
          fullName: fullName || existingUserName || invitation.email.split("@")[0] || "Team Member",
        });
      }

      const res = await signInWithOtpAction({
        email: invitation.email,
        redirectPath: "/app",
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to send magic sign-in link. Please try again.");
        setSendingMagicLink(false);
        return;
      }

      setMagicLinkSent(true);
      setSendingMagicLink(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send magic link. Please try again.");
      setSendingMagicLink(false);
    }
  };

  // Sign-in & join handler for user with an existing account
  const handleExistingAccountLoginAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !password) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (authError) {
        const lowerMsg = (authError.message || "").toLowerCase();
        if (lowerMsg.includes("invalid login credentials") || lowerMsg.includes("invalid credentials")) {
          setErrorMsg(
            "Incorrect password. If you originally registered with Magic Link, click 'Sign In with Magic Link' above."
          );
        } else {
          setErrorMsg(authError.message || "Incorrect password. Please verify your password or reset it.");
        }
        setSubmitting(false);
        return;
      }

      // Automatically join the workspace under this authenticated account
      if (!isAlreadyMember) {
        const res = await submitEmployeeOnboardingAction({
          workspaceId: invitation.workspace_id,
          token: invitation.token || "",
          fullName: fullName || existingUserName || invitation.email.split("@")[0],
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to join workspace.");
          setSubmitting(false);
          return;
        }
      }

      setJoinedSuccess(true);
      setSubmitting(false);
      setTimeout(() => {
        window.location.href = "/app";
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in and join workspace.");
      setSubmitting(false);
    }
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return false;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitEmployeeOnboardingAction({
        workspaceId: invitation.workspace_id,
        token: invitation.token || "",
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        password,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to complete onboarding. Please try again.");
        setSubmitting(false);
        return;
      }

      setJoinedSuccess(true);
      setSubmitting(false);

      // Auto-redirect directly into the workspace
      setTimeout(() => {
        window.location.href = "/app";
      }, 1600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1310] relative flex flex-col justify-between text-[#18221E] antialiased overflow-x-hidden selection:bg-[#C7F34A] selection:text-[#10251F]">
      {/* ── AMBIENT GLOW BACKGROUND ────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-emerald-500/12 via-[#C7F34A]/8 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[40%] -left-[200px] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[50%] -right-[200px] w-[500px] h-[500px] bg-[#10251F]/40 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* ── TOP HEADER / BRAND ────────────────────────────────────────────── */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-7 pb-3 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <LogoIcon size={34} />
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#C7F34A] transition-colors">
            Ropimo
          </span>
        </Link>

        <div className="inline-flex items-center gap-2 rounded-full border border-[#234B3D]/80 bg-[#10251F]/60 px-3.5 py-1 text-xs text-[#A1B3A9] backdrop-blur-md">
          <ShieldCheck size={13} className="text-[#C7F34A]" />
          <span>Encrypted Invitation</span>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ───────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[540px]">
          <AnimatePresence mode="wait">
            {joinedSuccess ? (
              /* ── CELEBRATION / SUCCESS SCREEN ───────────────────────────── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-[28px] border border-[#2B5445] bg-[#10251F]/95 p-8 sm:p-10 shadow-2xl text-center backdrop-blur-xl text-white space-y-6"
              >
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#C7F34A] text-[#10251F] shadow-lg shadow-[#C7F34A]/20">
                  <Check size={40} strokeWidth={3} />
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full border-2 border-[#C7F34A]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#C7F34A]/15 border border-[#C7F34A]/30 px-3 py-1 text-[11px] font-bold text-[#C7F34A]">
                    <Sparkles size={12} />
                    <span>Setup Complete!</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Welcome to {workspaceName}!
                  </h2>
                  <p className="text-sm text-[#A1B3A9] max-w-sm mx-auto leading-relaxed">
                    Your account has been created and joined to the workspace. Taking you straight to your dashboard...
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 text-xs text-[#8C9E94]">
                  <Loader2 size={15} className="animate-spin text-[#C7F34A]" />
                  <span>Redirecting to your workspace...</span>
                </div>
              </motion.div>
            ) : (
              /* ── ONBOARDING WIZARD CARD ─────────────────────────────────── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="rounded-[28px] border border-[#D8DDD4] bg-[#FAF9F5] shadow-2xl overflow-hidden backdrop-blur-xl"
              >
                {/* ── WORKSPACE INVITATION SPOTLIGHT BANNER ─────────────────── */}
                <div className="bg-[#10251F] p-6 sm:p-7 text-white border-b border-[#234B3D]/80 relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-36 h-36 bg-gradient-to-br from-[#C7F34A]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-start gap-4">
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[16px] bg-[#18362D] border border-[#2B5445] text-[#C7F34A] font-extrabold text-xl shadow-inner">
                      {workspaceName.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#C7F34A] bg-[#C7F34A]/15 border border-[#C7F34A]/30 px-2.5 py-0.5 rounded-full">
                          Workspace Invite
                        </span>
                        {invitation.role && (
                          <span className="text-[11px] font-semibold text-[#8C9E94] capitalize">
                            Role: {invitation.role}
                          </span>
                        )}
                      </div>

                      <h1 className="text-xl font-bold tracking-tight text-white truncate">
                        {workspaceName}
                      </h1>

                      <p className="text-xs text-[#A1B3A9] leading-relaxed">
                        {inviterName ? (
                          <>
                            Invited by <strong className="text-white">{inviterName}</strong>
                            {invitation.job_title && (
                              <> as <span className="text-[#C7F34A] font-medium">{invitation.job_title}</span></>
                            )}
                            {departmentName && <> in {departmentName}</>}
                          </>
                        ) : (
                          <>You&apos;ve been invited to join as {invitation.job_title || "a team member"}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Recipient verified email pill */}
                  <div className="mt-4 pt-3.5 border-t border-[#1C3E33] flex items-center justify-between text-xs text-[#8C9E94]">
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail size={13} className="text-[#C7F34A]" />
                      <span className="font-mono text-[#D8E2DC] text-[11px] truncate">
                        {invitation.email}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-[#C7F34A] shrink-0">
                      <CheckCircle2 size={12} />
                      <span>Verified Invite</span>
                    </span>
                  </div>
                </div>

                {/* ── CONDITIONAL STEPPER OR DIRECT JOIN ──────────────────── */}
                {!isCurrentlyLoggedIn && !hasExistingAccount && !isAlreadyMember && !isAccepted && (
                  <div className="flex border-b border-[#E2E6DE] bg-[#F2F1EC] text-xs font-semibold px-6 py-2.5 gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs cursor-pointer ${
                        step === 1
                          ? "bg-[#10251F] text-[#F4F3EE] shadow-xs"
                          : "text-[#65706A] hover:text-[#18221E]"
                      }`}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                        1
                      </span>
                      <span>Account Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1()) setStep(2);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs cursor-pointer ${
                        step === 2
                          ? "bg-[#10251F] text-[#F4F3EE] shadow-xs"
                          : "text-[#65706A] hover:text-[#18221E]"
                      }`}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                        2
                      </span>
                      <span>Profile & Photo</span>
                    </button>
                  </div>
                )}

                {/* ── FORM CONTENT ─────────────────────────────────────────── */}
                <div className="p-6 sm:p-8 space-y-6">
                  {errorMsg && (
                    <div className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium leading-relaxed">
                      ✕ {errorMsg}
                    </div>
                  )}

                  {/* ── SCENARIO 0: ALREADY ACCEPTED OR ALREADY A WORKSPACE MEMBER ── */}
                  {isAlreadyMember || isAccepted ? (
                    <div className="space-y-6 py-2 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600">
                        <CheckCircle2 size={32} />
                      </div>

                      <div className="space-y-1.5">
                        <h2 className="text-lg font-bold text-[#18221E]">
                          You&apos;re already part of {workspaceName}!
                        </h2>
                        <p className="text-xs text-[#65706A] max-w-sm mx-auto leading-relaxed">
                          This invitation for <strong className="text-[#18221E] font-mono">{invitation.email}</strong> has already been accepted and connected to your account.
                        </p>
                      </div>

                      {isCurrentlyLoggedIn ? (
                        <div className="pt-2 space-y-3">
                          <Link
                            href="/app"
                            className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-[#10251F] hover:bg-[#18342C] px-6 py-3.5 text-sm font-bold text-[#F4F3EE] shadow-md transition-all"
                          >
                            <span>Open {workspaceName} Dashboard</span>
                            <ArrowRight size={16} className="text-[#C7F34A]" />
                          </Link>
                          <div className="text-center">
                            <Link
                              href="/login"
                              className="text-xs text-[#65706A] hover:text-[#18221E] underline font-medium"
                            >
                              Sign into a different account &rarr;
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 space-y-4 text-left">
                          {magicLinkSent ? (
                            <div className="p-4.5 rounded-[16px] border border-emerald-300 bg-emerald-50 text-emerald-950 space-y-2 text-center">
                              <div className="flex justify-center">
                                <Mail size={24} className="text-emerald-600" />
                              </div>
                              <p className="text-xs font-bold text-emerald-950">
                                Magic sign-in link sent to {invitation.email}!
                              </p>
                              <p className="text-[11px] text-emerald-800 leading-relaxed">
                                Please check your email inbox and click the sign-in link to open your workspace.
                              </p>
                              <button
                                type="button"
                                onClick={handleSendMagicLink}
                                disabled={sendingMagicLink}
                                className="text-xs text-emerald-900 font-semibold underline hover:text-emerald-700 cursor-pointer pt-1"
                              >
                                {sendingMagicLink ? "Sending..." : "Didn't receive it? Click to resend"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendMagicLink}
                              disabled={sendingMagicLink}
                              className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-[#10251F] hover:bg-[#18342C] px-6 py-3.5 text-sm font-bold text-[#F4F3EE] shadow-md transition-all cursor-pointer disabled:opacity-50"
                            >
                              {sendingMagicLink ? (
                                <>
                                  <Loader2 size={16} className="animate-spin text-[#C7F34A]" />
                                  <span>Sending magic link...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={16} className="text-[#C7F34A]" />
                                  <span>Send Magic Link to Log In (Passwordless)</span>
                                  <ArrowRight size={16} className="text-[#C7F34A]" />
                                </>
                              )}
                            </button>
                          )}

                          <div className="text-center pt-1">
                            <Link
                              href="/login"
                              className="text-xs text-[#65706A] hover:text-[#18221E] underline font-medium"
                            >
                              Or sign in with password &rarr;
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isCurrentlyLoggedIn ? (
                    /* ── SCENARIO A: USER ALREADY LOGGED IN (ONE-CLICK ACCEPT) ── */
                    <div className="space-y-6 py-2">
                      <div className="p-4 rounded-[16px] border border-emerald-200 bg-emerald-50/60 text-emerald-950 flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#10251F] text-[#C7F34A] flex items-center justify-center font-bold text-sm shrink-0">
                          {currentUser?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-xs font-bold text-emerald-950">
                            Signed in as {currentUser?.email}
                          </p>
                          <p className="text-[11px] text-emerald-800 leading-relaxed">
                            {isMatchingEmail
                              ? "You are logged in with the email this invite was sent to."
                              : `This invite was addressed to ${invitation.email}. You can join directly with your current active account.`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <button
                          type="button"
                          onClick={handleQuickJoin}
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-[#10251F] hover:bg-[#18342C] px-6 py-3 text-sm font-bold text-[#F4F3EE] shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {submitting ? (
                            <>
                              <Loader2 size={16} className="animate-spin text-[#C7F34A]" />
                              <span>Joining {workspaceName}...</span>
                            </>
                          ) : (
                            <>
                              <span>Accept Invitation & Join {workspaceName}</span>
                              <ArrowRight size={16} className="text-[#C7F34A]" />
                            </>
                          )}
                        </button>

                        <div className="text-center">
                          <Link
                            href="/login"
                            className="text-xs text-[#65706A] hover:text-[#18221E] underline font-medium"
                          >
                            Switch to a different account &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : hasExistingAccount ? (
                    /* ── SCENARIO B: USER HAS EXISTING ACCOUNT (SIGN IN & JOIN) ── */
                    <div className="space-y-5">
                      <div className="p-3.5 rounded-[14px] border border-emerald-200 bg-emerald-50/60 text-emerald-950 text-xs flex items-center gap-2.5 font-medium">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>
                          Account recognized! Welcome back <strong>{existingUserName || invitation.email}</strong>.
                        </span>
                      </div>

                      {/* Primary Action: Magic Link (Passwordless) */}
                      {magicLinkSent ? (
                        <div className="p-4.5 rounded-[16px] border border-emerald-300 bg-emerald-50 text-emerald-950 space-y-2 text-center">
                          <div className="flex justify-center">
                            <Mail size={24} className="text-emerald-600" />
                          </div>
                          <p className="text-sm font-bold text-emerald-950">
                            Magic sign-in link sent!
                          </p>
                          <p className="text-xs text-emerald-800 leading-relaxed max-w-xs mx-auto">
                            We sent a link to <strong className="font-semibold">{invitation.email}</strong>. Click the link in your email to sign in and immediately access {workspaceName}.
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleSendMagicLink}
                              disabled={sendingMagicLink}
                              className="text-xs text-emerald-900 font-semibold underline hover:text-emerald-700 cursor-pointer"
                            >
                              {sendingMagicLink ? "Sending..." : "Didn't receive it? Click to resend"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <button
                            type="button"
                            onClick={handleSendMagicLink}
                            disabled={sendingMagicLink}
                            className="w-full flex items-center justify-center gap-2.5 rounded-[14px] bg-[#10251F] hover:bg-[#18342C] px-6 py-3.5 text-sm font-bold text-[#F4F3EE] shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            {sendingMagicLink ? (
                              <>
                                <Loader2 size={16} className="animate-spin text-[#C7F34A]" />
                                <span>Sending magic link...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={16} className="text-[#C7F34A]" />
                                <span>Sign In with Magic Link (1-Click)</span>
                                <ArrowRight size={16} className="text-[#C7F34A]" />
                              </>
                            )}
                          </button>
                          <p className="text-[11px] text-center text-[#8C9489]">
                            Recommended for passwordless accounts. We&apos;ll email you a secure 1-click link.
                          </p>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-[#E2E6DE]" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-[#8C9489]">
                          <span className="bg-white px-3">or sign in with password</span>
                        </div>
                      </div>

                      {/* Password Fallback Form */}
                      <form onSubmit={handleExistingAccountLoginAndJoin} className="space-y-3.5">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-[#18221E]">
                              Account Password
                            </label>
                            <Link href="/login" className="text-[11px] text-emerald-700 hover:underline">
                              Forgot password?
                            </Link>
                          </div>
                          <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65706A]" />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter your existing password"
                              className="w-full rounded-[12px] border border-[#D8DDD4] bg-white pl-10 pr-9 py-2.5 text-sm text-[#18221E] placeholder:text-[#8C9489] focus:border-[#10251F] focus:ring-1 focus:ring-[#10251F] focus:outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9489] hover:text-[#18221E] p-1 cursor-pointer"
                            >
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting || !password}
                          className="w-full flex items-center justify-center gap-2 rounded-[14px] border border-[#D8DDD4] bg-white hover:bg-[#FAF9F5] px-6 py-2.5 text-xs font-bold text-[#18221E] shadow-xs transition-all cursor-pointer disabled:opacity-40"
                        >
                          {submitting ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-[#10251F]" />
                              <span>Verifying password...</span>
                            </>
                          ) : (
                            <span>Sign In & Join with Password</span>
                          )}
                        </button>
                      </form>
                    </div>
                  ) : step === 1 ? (
                    /* ── SCENARIO C (STEP 1): BRAND NEW USER REGISTRATION ─── */
                    <form onSubmit={handleNextStep} className="space-y-4.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#18221E] mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65706A]" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Alex Morgan"
                            className="w-full rounded-[12px] border border-[#D8DDD4] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#8C9489] focus:border-[#10251F] focus:ring-1 focus:ring-[#10251F] focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#18221E] mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C9489]" />
                          <input
                            type="email"
                            readOnly
                            disabled
                            value={invitation.email}
                            className="w-full rounded-[12px] border border-[#E2E6DE] bg-[#ECEBE4] pl-10 pr-3.5 py-2.5 text-sm text-[#65706A] font-mono select-none cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-[#18221E] mb-1.5">
                            Create Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65706A]" />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              minLength={6}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="At least 6 chars"
                              className="w-full rounded-[12px] border border-[#D8DDD4] bg-white pl-10 pr-9 py-2.5 text-sm text-[#18221E] placeholder:text-[#8C9489] focus:border-[#10251F] focus:ring-1 focus:ring-[#10251F] focus:outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9489] hover:text-[#18221E] p-1 cursor-pointer"
                            >
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#18221E] mb-1.5">
                            Confirm Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65706A]" />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              minLength={6}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat password"
                              className="w-full rounded-[12px] border border-[#D8DDD4] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#8C9489] focus:border-[#10251F] focus:ring-1 focus:ring-[#10251F] focus:outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-[12px] bg-[#10251F] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#18342C] transition-all shadow-md cursor-pointer group"
                        >
                          <span>Next: Profile Photo</span>
                          <ArrowRight size={14} className="text-[#C7F34A] group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* ── STEP 2: PROFILE & PHOTO ──────────────────────────── */
                    <form onSubmit={handleFinalSubmit} className="space-y-4.5">
                      {/* Avatar Picker */}
                      <div>
                        <label className="block text-xs font-semibold text-[#18221E] mb-2">
                          Profile Photo <span className="text-[#8C9489] font-normal">(Optional)</span>
                        </label>
                        <div className="flex items-center gap-4 p-3 rounded-[16px] border border-[#D8DDD4] bg-white">
                          <div className="relative group">
                            {avatarPreview ? (
                              <img
                                src={avatarPreview}
                                alt="Avatar preview"
                                className="h-16 w-16 rounded-full object-cover border border-[#D8DDD4]"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A] font-bold text-lg border border-[#234B3D]">
                                {initials}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#10251F] text-white hover:bg-[#18342C] shadow-xs cursor-pointer"
                              title="Change photo"
                            >
                              <Camera size={12} />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-white transition-colors cursor-pointer"
                            >
                              {avatarPreview ? "Change Photo" : "Upload Picture"}
                            </button>
                            <p className="text-[11px] text-[#8C9489] mt-1">
                              JPG, PNG or GIF up to 5MB.
                            </p>
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {/* Phone & Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-[#18221E] mb-1.5">
                            Phone Number <span className="text-[#8C9489] font-normal">(Optional)</span>
                          </label>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65706A]" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+1 (555) 000-0000"
                              className="w-full rounded-[12px] border border-[#D8DDD4] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#8C9489] focus:border-[#10251F] focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#18221E] mb-1.5">
                            Location / Address <span className="text-[#8C9489] font-normal">(Optional)</span>
                          </label>
                          <div className="relative">
                            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#65706A]" />
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="e.g. San Francisco, CA"
                              className="w-full rounded-[12px] border border-[#D8DDD4] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#8C9489] focus:border-[#10251F] focus:outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div>
                        <label className="block text-xs font-semibold text-[#18221E] mb-1.5">
                          Professional Bio <span className="text-[#8C9489] font-normal">(Optional)</span>
                        </label>
                        <textarea
                          rows={2}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Brief intro about your role, background, or interests..."
                          className="w-full rounded-[12px] border border-[#D8DDD4] bg-white px-3.5 py-2.5 text-sm text-[#18221E] placeholder:text-[#8C9489] focus:border-[#10251F] focus:outline-none transition-all resize-none"
                        />
                      </div>

                      <div className="pt-4 flex items-center justify-between border-t border-[#E7EADF]">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors cursor-pointer"
                        >
                          <ArrowLeft size={14} />
                          <span>Back</span>
                        </button>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center gap-2 rounded-[12px] bg-[#10251F] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#18342C] disabled:opacity-50 transition-all shadow-md cursor-pointer group"
                        >
                          {submitting ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-[#C7F34A]" />
                              <span>Joining Workspace...</span>
                            </>
                          ) : (
                            <>
                              <span>Join {workspaceName}</span>
                              <span className="text-[#C7F34A] group-hover:translate-x-0.5 transition-transform">→</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-[#8C9E94]/80 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1C3E33]/60">
        <span>&copy; {new Date().getFullYear()} Ropimo Workspace Suite. All rights reserved.</span>
        <div className="flex items-center gap-4 text-[#A1B3A9]">
          <Link href="/" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/login" className="hover:text-[#C7F34A] transition-colors">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}

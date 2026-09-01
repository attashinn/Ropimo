"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { WorkspaceInvitation } from "@/types/people";
import { submitEmployeeOnboardingAction } from "@/lib/people/actions";
import {
  CheckCircle2,
  Upload,
  User,
  Phone,
  MapPin,
  FileText,
  Lock,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AcceptInvitationViewProps {
  invitation: WorkspaceInvitation | null;
  workspaceName?: string;
  departmentName?: string;
  error?: string;
}

export function AcceptInvitationView({
  invitation,
  workspaceName = "Workspace",
  departmentName,
  error: initialError,
}: AcceptInvitationViewProps) {
  const router = useRouter();

  // Step State for standard members (1: Profile, 2: Photo, 3: CV, 4: Submitted)
  const [step, setStep] = React.useState<number>(1);

  // Form Fields
  const [fullName, setFullName] = React.useState(invitation?.full_name || "");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Media / File Uploads
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [cvFileName, setCvFileName] = React.useState<string | null>(null);
  const [cvFileSize, setCvFileSize] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(initialError || null);
  const [submittedData, setSubmittedData] = React.useState<{ directAccess?: boolean; role?: string } | null>(null);

  if (!invitation) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-8 shadow-sm text-center space-y-4"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 text-xl font-bold">
            !
          </div>
          <h1 className="text-lg font-bold text-[#18221E]">Invalid Invitation Link</h1>
          <p className="text-xs text-[#65706A]">
            {initialError || "This invitation link is invalid or does not exist. Please contact your workspace administrator."}
          </p>
          <div className="pt-2">
            <Link
              href="/signin"
              className="inline-block rounded-[10px] bg-[#10251F] px-5 py-2 text-xs font-bold text-white hover:bg-[#18342C] transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const isSpecialAccess = invitation.role !== "member";

  // Handle Photo Selection
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle CV File Selection
  const handleCvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFileName(file.name);
    setCvFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
  };

  // Final Submit
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      setStep(1);
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      setStep(1);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setStep(1);
      return;
    }

    setSubmitting(true);

    try {
      const res = await submitEmployeeOnboardingAction({
        workspaceId: invitation.workspace_id,
        token: invitation.token || "",
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarPreview || undefined,
        cvUrl: cvFileName ? `/uploads/${cvFileName}` : undefined,
        cvFileName: cvFileName || undefined,
        password,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit onboarding application.");
        setSubmitting(false);
        return;
      }

      setSubmittedData(res.data);
      if (res.data?.directAccess) {
        setTimeout(() => {
          router.push("/app");
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-[20px] border border-[#D8DDD4] bg-white p-7 sm:p-9 shadow-lg space-y-6"
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="text-center space-y-1.5 border-b border-[#E7EADF] pb-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF4E2] border border-[#C2E0C8] px-3 py-1 text-[11px] font-bold text-[#246244] mb-1">
            <Sparkles size={12} />
            <span>Workspace Invitation · {workspaceName}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#18221E] tracking-tight">
            {isSpecialAccess ? "Activate Direct Access" : "Employee Onboarding"}
          </h1>
          <p className="text-xs text-[#65706A]">
            {isSpecialAccess
              ? `You've been granted ${invitation.role.toUpperCase()} access to ${workspaceName}.`
              : "Complete your onboarding profile and document submission to join the team."}
          </p>
        </div>

        {/* ── STATUS BANNERS ──────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="rounded-[10px] bg-red-50 p-3.5 text-xs text-red-700 border border-red-200 font-semibold">
            ✕ {errorMsg}
          </div>
        )}

        {/* ── SUBMITTED / SUCCESS STATE ──────────────────────────────────── */}
        {submittedData ? (
          <div className="rounded-[16px] bg-[#FAF9F5] border border-[#D8DDD4] p-7 text-center space-y-4">
            {submittedData.directAccess ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#10251F] text-[#C7F34A]">
                  <Check size={26} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#18221E]">Welcome to {workspaceName}!</h3>
                  <p className="text-xs text-[#65706A]">
                    Your account has been activated with <strong>{submittedData.role}</strong> access. Redirecting you to your workspace...
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF6E4] border border-[#F8E3B6] text-[#B58500]">
                  <Clock size={26} />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF6E4] border border-[#F8E3B6] px-2.5 py-0.5 text-[10px] font-bold text-[#B58500]">
                    Status: Pending Admin Approval
                  </span>
                  <h3 className="text-lg font-bold text-[#18221E]">Onboarding Application Submitted!</h3>
                  <p className="text-xs text-[#65706A] max-w-md mx-auto leading-relaxed">
                    Thank you, <strong>{fullName}</strong>. Your profile details, photo, and CV have been securely sent to your workspace administrator for approval and department assignment.
                  </p>
                </div>

                <div className="rounded-[12px] bg-white border border-[#E7EADF] p-4 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] border-b border-[#E7EADF] pb-2">
                    <span className="text-[#65706A]">Applicant Email:</span>
                    <span className="font-semibold text-[#18221E]">{invitation.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] border-b border-[#E7EADF] pb-2">
                    <span className="text-[#65706A]">CV Document:</span>
                    <span className="font-semibold text-[#246244]">{cvFileName || "Submitted"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#65706A]">Next Step:</span>
                    <span className="font-semibold text-[#18221E]">Admin reviews & activates account</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#8A958F]">
                  You will receive an email confirmation as soon as your administrator approves your account.
                </p>
              </>
            )}
          </div>
        ) : isSpecialAccess ? (
          /* ── DIRECT ACCESS FORM (ADMIN / MANAGER) ───────────────────────── */
          <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs">
            <div className="rounded-[12px] bg-[#FAF9F5] border border-[#D8DDD4] p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">Direct Access Role</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#18221E] capitalize">{invitation.role}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#10251F] text-white px-2.5 py-0.5 text-[10px] font-bold">
                  <ShieldCheck size={11} className="text-[#C7F34A]" />
                  Instant Activation
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#18221E] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Create Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#10251F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#18342C] transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>{submitting ? "Activating Account..." : "Join Workspace →"}</span>
            </button>
          </form>
        ) : (
          /* ── STANDARD MEMBER 3-STEP ONBOARDING WIZARD ───────────────────── */
          <form onSubmit={handleFinalSubmit} className="space-y-5 text-xs">
            {/* Stepper Progress Bar */}
            <div className="flex items-center justify-between gap-2 border-b border-[#E7EADF] pb-4">
              {[
                { num: 1, label: "Profile Details" },
                { num: 2, label: "Profile Photo" },
                { num: 3, label: "Upload CV / Docs" },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className="flex items-center gap-2 text-left cursor-pointer"
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all",
                      step === s.num
                        ? "bg-[#10251F] text-[#C7F34A]"
                        : step > s.num
                        ? "bg-[#EAF4E2] text-[#246244] border border-[#C2E0C8]"
                        : "bg-[#FAF9F5] text-[#8A958F] border border-[#D8DDD4]"
                    )}
                  >
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] hidden sm:inline font-semibold",
                      step === s.num ? "text-[#18221E] font-bold" : "text-[#65706A]"
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              ))}
            </div>

            {/* STEP 1: Profile & Contact Details */}
            {step === 1 && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">
                      Home / Work Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                      className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">
                    Professional Bio (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief intro about your role, skills, and background..."
                    className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">
                      Create Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!fullName.trim() || !phone.trim() || !address.trim() || !password) {
                        setErrorMsg("Please fill in all required profile fields.");
                        return;
                      }
                      setErrorMsg(null);
                      setStep(2);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#10251F] px-4 py-2 text-xs font-bold text-white hover:bg-[#18342C] transition-all cursor-pointer shadow-xs"
                  >
                    <span>Next: Profile Photo</span>
                    <ArrowRight size={13} className="text-[#C7F34A]" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Profile Photo Upload */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="text-center py-2">
                  <p className="text-xs font-bold text-[#18221E]">Upload your Team Directory Photo</p>
                  <p className="text-[11px] text-[#65706A] mt-0.5">
                    This photo will be visible to your teammates across task boards and departments.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed border-[#D8DDD4] rounded-[16px] bg-[#FAF9F5]">
                  {avatarPreview ? (
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Profile preview"
                        className="h-24 w-24 rounded-full object-cover border-2 border-[#10251F] shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setAvatarPreview(null)}
                        className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#10251F] text-white text-xs hover:bg-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EAF4E2] text-[#246244] border border-[#C2E0C8]">
                      <User size={32} />
                    </div>
                  )}

                  <label className="inline-flex items-center gap-2 rounded-[10px] bg-white border border-[#D8DDD4] px-4 py-2 text-xs font-bold text-[#18221E] hover:bg-[#FAF9F5] transition-all cursor-pointer shadow-2xs">
                    <Upload size={14} className="text-[#246244]" />
                    <span>{avatarPreview ? "Change Photo" : "Select Photo from Computer"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-[#8A958F]">Supports PNG, JPG, WEBP up to 5MB</span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#65706A] hover:text-[#18221E]"
                  >
                    <ArrowLeft size={13} />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#10251F] px-4 py-2 text-xs font-bold text-white hover:bg-[#18342C] transition-all cursor-pointer shadow-xs"
                  >
                    <span>Next: Upload CV / Docs</span>
                    <ArrowRight size={13} className="text-[#C7F34A]" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Resume / CV Upload & Submit */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="text-center py-2">
                  <p className="text-xs font-bold text-[#18221E]">Upload Resume / CV Document</p>
                  <p className="text-[11px] text-[#65706A] mt-0.5">
                    Your CV will be attached to your employee record for administrator verification.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-[#D8DDD4] rounded-[16px] bg-[#FAF9F5]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF4E2] text-[#246244]">
                    <FileText size={22} />
                  </div>

                  {cvFileName ? (
                    <div className="w-full max-w-sm rounded-[10px] bg-white border border-[#C2E0C8] p-3 flex items-center justify-between">
                      <div className="truncate">
                        <p className="font-bold text-[#18221E] truncate text-xs">{cvFileName}</p>
                        <p className="text-[10px] text-[#8A958F]">{cvFileSize || "Uploaded document"}</p>
                      </div>
                      <span className="text-[#246244] font-bold text-xs">✓ Ready</span>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-[#65706A]">PDF, DOCX, or employment documents</p>
                  )}

                  <label className="inline-flex items-center gap-2 rounded-[10px] bg-white border border-[#D8DDD4] px-4 py-2 text-xs font-bold text-[#18221E] hover:bg-[#FAF9F5] transition-all cursor-pointer shadow-2xs">
                    <Upload size={14} className="text-[#246244]" />
                    <span>{cvFileName ? "Replace Document" : "Choose CV / Resume File"}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCvUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Summary Notice */}
                <div className="rounded-[10px] bg-[#EAF4E2]/60 border border-[#C2E0C8] p-3 text-[11px] text-[#246244] leading-relaxed">
                  ✓ After clicking submit, your onboarding application will be submitted to the workspace administrator for approval and department assignment.
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#65706A] hover:text-[#18221E]"
                  >
                    <ArrowLeft size={13} />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#10251F] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#18342C] transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <span>{submitting ? "Submitting Application..." : "Submit for Approval →"}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
}

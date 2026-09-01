"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicJobOpening } from "@/lib/recruitment/public-queries";
import { LogoIcon } from "@/components/landing/icons";
import { submitCandidateApplicationAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface PublicApplyFormProps {
  job: PublicJobOpening;
}

export function PublicApplyForm({ job }: PublicApplyFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [portfolioUrl, setPortfolioUrl] = React.useState("");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [yearsOfExperience, setYearsOfExperience] = React.useState<number | "">("");
  const [skillsStr, setSkillsStr] = React.useState("");
  const [coverLetter, setCoverLetter] = React.useState("");
  const [additionalNotes, setAdditionalNotes] = React.useState("");

  // CV File Upload state
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = React.useState(false);
  const [cvStorageKey, setCvStorageKey] = React.useState("");
  const [cvFileName, setCvFileName] = React.useState("");
  const [cvFileSize, setCvFileSize] = React.useState<number>(0);
  const [cvFileType, setCvFileType] = React.useState("application/pdf");

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const extension = selected.name.split(".").pop()?.toLowerCase();
    const isDoc = ["pdf", "doc", "docx"].includes(extension || "");

    if (!isDoc && !validTypes.includes(selected.type)) {
      setErrorMsg("Please upload a valid CV document (PDF, DOC, or DOCX).");
      return;
    }

    if (selected.size > 15 * 1024 * 1024) {
      setErrorMsg("File size exceeds 15MB limit. Please upload a smaller file.");
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    setUploadingCv(true);

    try {
      const formData = new FormData();
      formData.append("file", selected);
      formData.append("folder", "resumes");
      formData.append("workspaceId", job.workspace_id);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.key) {
        setCvStorageKey(data.key);
        setCvFileName(selected.name);
        setCvFileSize(selected.size);
        setCvFileType(selected.type || "application/pdf");
      } else {
        setErrorMsg(data.error || "Failed to upload CV to storage.");
      }
    } catch {
      setErrorMsg("Failed to upload CV. Please check your connection and try again.");
    } finally {
      setUploadingCv(false);
    }
  };

  const isValid = fullName.trim().length >= 2 && email.includes("@") && Boolean(cvStorageKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading || uploadingCv) return;

    setLoading(true);
    setErrorMsg(null);

    const skills = skillsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await submitCandidateApplicationAction({
        workspaceId: job.workspace_id,
        jobOpeningId: job.id,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        yearsOfExperience: typeof yearsOfExperience === "number" ? yearsOfExperience : undefined,
        skills,
        coverLetter: (coverLetter.trim() + (additionalNotes ? `\n\nAdditional Notes:\n${additionalNotes}` : "")).trim() || undefined,
        cvStorageKey,
        cvFileName,
        cvFileSize,
        cvFileType,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit application.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setLoading(false);
    } catch {
      setErrorMsg("An unexpected error occurred while submitting your application.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#18221E] flex flex-col justify-between">
      {/* 1. PUBLIC HEADER */}
      <header className="border-b border-[#D8DDD4] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/jobs" className="flex items-center gap-2.5">
            <LogoIcon size={26} />
            <span className="text-lg font-bold tracking-tight text-[#18221E]">Ropimo</span>
            <span className="rounded-full bg-[#FAF9F5] border border-[#D8DDD4] px-2 py-0.5 text-[11px] font-semibold text-[#65706A]">
              Careers
            </span>
          </Link>

          <Link
            href={`/jobs/${job.id}`}
            className="text-xs font-semibold text-[#65706A] hover:text-[#18221E] transition-colors"
          >
            ← Back to Position
          </Link>
        </div>
      </header>

      {/* 2. MAIN APPLICATION CONTENT */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* SUCCESS SCREEN */}
          {submitted ? (
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-8 sm:p-12 text-center space-y-4 shadow-2xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF4E2] text-[#246244] text-2xl font-bold">
                ✓
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18221E]">
                  Application submitted
                </h1>
                <p className="text-sm text-[#65706A] max-w-md mx-auto">
                  Thanks for applying for <span className="font-bold text-[#18221E]">{job.title}</span> at{" "}
                  <span className="font-semibold text-[#18221E]">{job.company_name}</span>.
                </p>
                <p className="text-xs text-[#65706A] max-w-md mx-auto leading-relaxed pt-1">
                  Your application has been received successfully. Our hiring team will review your
                  profile and reach out directly if your background is a match for the next interview
                  stage.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href="/jobs"
                  className="inline-block rounded-[10px] bg-[#10251F] text-white px-6 py-2.5 text-xs font-bold hover:bg-[#18342C] shadow-2xs transition-colors"
                >
                  View Open Positions →
                </Link>
              </div>
            </div>
          ) : (
            /* APPLICATION FORM */
            <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
              {/* Form Title & Summary */}
              <div className="border-b border-[#D8DDD4]/80 pb-5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-[6px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-0.5 text-[11px] font-semibold text-[#18221E]">
                    {job.department_name}
                  </span>
                  <span className="text-xs text-[#65706A]">• {job.company_name}</span>
                </div>
                <h1 className="text-2xl font-extrabold text-[#18221E]">Apply for {job.title}</h1>
                <p className="text-xs text-[#65706A]">
                  Please complete the application form below. Required fields are marked with an asterisk (
                  <span className="text-red-500">*</span>).
                </p>
              </div>

              {errorMsg && (
                <div className="rounded-[10px] bg-red-50 p-3.5 text-xs text-red-600 border border-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                {/* Contact Information */}
                <div className="space-y-3.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#65706A]">
                    1. Contact Information
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-semibold text-[#18221E] mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#18221E] mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-semibold text-[#18221E] mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#18221E] mb-1">Current Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                        className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* CV / Resume Upload */}
                <div className="space-y-3.5 pt-2 border-t border-[#D8DDD4]/60">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#65706A]">
                    2. CV / Resume <span className="text-red-500">*</span>
                  </h2>

                  <div className="rounded-[12px] border-2 border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-6 text-center space-y-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      id="cv-upload-public"
                    />

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#18221E]">
                        {uploadingCv
                          ? "Uploading resume to secure Cloudflare R2 storage..."
                          : cvFileName
                          ? `✓ Attached: ${cvFileName} (${Math.round(cvFileSize / 1024)} KB)`
                          : "Upload your resume / CV"}
                      </p>
                      <p className="text-[11px] text-[#65706A]">
                        Supported formats: PDF, DOC, DOCX up to 15MB
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="cv-upload-public"
                        className="inline-block cursor-pointer rounded-[8px] bg-white border border-[#D8DDD4] px-4 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5] shadow-2xs"
                      >
                        {cvFileName ? "Change File" : "Choose File"}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Experience & Links */}
                <div className="space-y-3.5 pt-2 border-t border-[#D8DDD4]/60">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#65706A]">
                    3. Experience & Web Presence
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-semibold text-[#18221E] mb-1">LinkedIn Profile</label>
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#18221E] mb-1">Portfolio / GitHub</label>
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-semibold text-[#18221E] mb-1">
                        Years of Professional Experience
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={yearsOfExperience}
                        onChange={(e) =>
                          setYearsOfExperience(e.target.value ? Number(e.target.value) : "")
                        }
                        placeholder="e.g. 5"
                        className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#18221E] mb-1">
                        Key Skills (comma separated)
                      </label>
                      <input
                        type="text"
                        value={skillsStr}
                        onChange={(e) => setSkillsStr(e.target.value)}
                        placeholder="React, TypeScript, Next.js, Node.js"
                        className="w-full rounded-[10px] border border-[#D8DDD4] bg-white px-3.5 py-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="space-y-3.5 pt-2 border-t border-[#D8DDD4]/60">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#65706A]">
                    4. Cover Letter & Note
                  </h2>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">
                      Why are you interested in this position?
                    </label>
                    <textarea
                      rows={4}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Share what excites you about this role, your relevant achievements, and how you can contribute..."
                      className="w-full rounded-[10px] border border-[#D8DDD4] bg-white p-3 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#D8DDD4]">
                  <p className="text-[11px] text-[#65706A]">
                    By submitting, you agree to the processing of your personal information for
                    recruitment.
                  </p>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="w-full sm:w-auto text-center rounded-[10px] border border-[#D8DDD4] bg-white px-4 py-2.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                    >
                      Cancel
                    </Link>

                    <PrimaryButton
                      type="submit"
                      disabled={!isValid || loading || uploadingCv}
                      className="w-full sm:w-auto"
                    >
                      {loading ? "Submitting Application..." : "Submit Application →"}
                    </PrimaryButton>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* 3. PUBLIC FOOTER */}
      <footer className="border-t border-[#D8DDD4] bg-white py-8 px-4 text-center text-xs text-[#65706A]">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={20} />
            <span className="font-bold text-[#18221E]">Ropimo</span>
            <span>— Careers</span>
          </div>
          <p>© {new Date().getFullYear()} Ropimo Inc.</p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { JobOpening } from "@/types/recruitment";
import { submitCandidateApplicationAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface ApplyJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  jobOpening: JobOpening;
  onSuccess?: () => void;
}

export function ApplyJobModal({
  isOpen,
  onClose,
  workspaceId,
  jobOpening,
  onSuccess,
}: ApplyJobModalProps) {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [portfolioUrl, setPortfolioUrl] = React.useState("");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [yearsOfExperience, setYearsOfExperience] = React.useState<number | "">("");
  const [skillsStr, setSkillsStr] = React.useState("");
  const [coverLetter, setCoverLetter] = React.useState("");

  // File Upload to R2
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = React.useState(false);
  const [cvStorageKey, setCvStorageKey] = React.useState("");
  const [cvFileName, setCvFileName] = React.useState("");
  const [cvFileSize, setCvFileSize] = React.useState<number>(0);
  const [cvFileType, setCvFileType] = React.useState("application/pdf");

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 15 * 1024 * 1024) {
      setErrorMsg("CV file size exceeds 15MB limit.");
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    setUploadingCv(true);

    try {
      const formData = new FormData();
      formData.append("file", selected);
      formData.append("folder", "resumes");
      formData.append("workspaceId", workspaceId);

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
        setErrorMsg(data.error || "Failed to upload CV.");
      }
    } catch {
      setErrorMsg("Failed to upload CV to storage.");
    } finally {
      setUploadingCv(false);
    }
  };

  const isValid = fullName.trim().length > 1 && email.includes("@") && Boolean(cvStorageKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const skills = skillsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await submitCandidateApplicationAction({
        workspaceId,
        jobOpeningId: jobOpening.id,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        yearsOfExperience: typeof yearsOfExperience === "number" ? yearsOfExperience : undefined,
        skills,
        coverLetter: coverLetter.trim() || undefined,
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

      setSuccessMsg("Application submitted successfully!");
      setLoading(false);
      setTimeout(() => {
        onClose();
        router.refresh();
        if (onSuccess) onSuccess();
      }, 1000);
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#D8DDD4]/60 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#18221E]">Apply for Position</h2>
                <p className="text-xs text-[#65706A]">{jobOpening.title}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-[#65706A] hover:text-[#18221E]"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-[8px] bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="rounded-[8px] bg-[#EAF4E2] p-2.5 text-xs text-[#246244] border border-[#246244]/20 font-medium">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={yearsOfExperience}
                    onChange={(e) =>
                      setYearsOfExperience(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="e.g. 5"
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              {/* CV / Resume Upload */}
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">
                  Upload CV / Resume (PDF, DOCX) <span className="text-red-500">*</span>
                </label>
                <div className="rounded-[10px] border border-dashed border-[#D8DDD4] bg-[#FAF9F5] p-3 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="cv-upload-input"
                  />
                  <label
                    htmlFor="cv-upload-input"
                    className="cursor-pointer text-xs font-semibold text-[#10251F] hover:underline"
                  >
                    {uploadingCv
                      ? "Uploading CV to storage..."
                      : cvFileName
                      ? `Selected: ${cvFileName} (${Math.round(cvFileSize / 1024)} KB) — Click to replace`
                      : "Choose CV File (PDF / DOCX)"}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">LinkedIn Profile</label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Portfolio / GitHub</label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Key Skills</label>
                <input
                  type="text"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  placeholder="React, TypeScript, Node.js, Next.js"
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Cover Letter / Note</label>
                <textarea
                  rows={2}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Why you are interested in this position..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-white p-2 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <PrimaryButton type="submit" disabled={!isValid || loading || uploadingCv} size="sm">
                  {loading ? "Submitting..." : "Submit Application"}
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

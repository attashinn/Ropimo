"use client";

import * as React from "react";
import Link from "next/link";
import { PublicWorkspace, PublicJobOpening } from "@/lib/recruitment/public-queries";
import { submitCandidateApplicationAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

export interface CareerJobDetailViewProps {
  workspace: PublicWorkspace;
  job: PublicJobOpening;
  isOpen: boolean;
}

export function CareerJobDetailView({ workspace, job, isOpen }: CareerJobDetailViewProps) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [portfolioUrl, setPortfolioUrl] = React.useState("");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [githubUrl, setGithubUrl] = React.useState("");
  const [coverLetter, setCoverLetter] = React.useState("");
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [consent, setConsent] = React.useState(false);
  const [websiteHp, setWebsiteHp] = React.useState(""); // Honeypot
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

  // Resume Upload
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = React.useState(false);
  const [resumeStorageKey, setResumeStorageKey] = React.useState("");
  const [resumeFileName, setResumeFileName] = React.useState("");
  const [resumeFileSize, setResumeFileSize] = React.useState<number>(0);
  const [resumeFileType, setResumeFileType] = React.useState("application/pdf");

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const extension = selected.name.split(".").pop()?.toLowerCase();
    const isDoc = ["pdf", "doc", "docx"].includes(extension || "");

    if (!isDoc) {
      setErrorMsg("Please upload a valid CV document (.pdf, .doc, or .docx).");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setErrorMsg("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    setUploadingResume(true);

    try {
      const formData = new FormData();
      formData.append("file", selected);
      formData.append("folder", "candidates");
      formData.append("workspaceId", workspace.id);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.key) {
        setResumeStorageKey(data.key);
        setResumeFileName(selected.name);
        setResumeFileSize(selected.size);
        setResumeFileType(selected.type || "application/pdf");
      } else {
        setErrorMsg(data.error || "Failed to upload resume document.");
      }
    } catch {
      setErrorMsg("Failed to upload resume. Please check your connection and try again.");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const questions = job.application_questions || [];

  const areQuestionsValid = questions.every((q) => {
    if (!q.required) return true;
    const ans = answers[q.id];
    return ans !== undefined && ans !== null && String(ans).trim().length > 0;
  });

  const isValid =
    fullName.trim().length >= 2 &&
    email.includes("@") &&
    Boolean(resumeStorageKey) &&
    consent &&
    areQuestionsValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading || uploadingResume) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await submitCandidateApplicationAction({
        workspaceId: workspace.id,
        jobOpeningId: job.id,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        coverLetter: coverLetter.trim() || undefined,
        cvStorageKey: resumeStorageKey,
        cvFileName: resumeFileName,
        cvFileSize: resumeFileSize,
        cvFileType: resumeFileType,
        answers,
        consent,
        website_hp: websiteHp,
        turnstileToken,
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
    <div className="min-h-screen bg-[#F6F4EC] text-[#111111] flex flex-col justify-between selection:bg-[#111111] selection:text-white">
      {/* 1. HEADER */}
      <header className="border-b border-[#E5E2D6] bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href={`/careers/${workspace.slug}`}
            className="flex items-center gap-3 text-xs font-semibold text-[#666666] hover:text-[#111111] transition-colors"
          >
            {workspace.logo_url ? (
              <img
                src={workspace.logo_url}
                alt={workspace.name}
                className="h-7 w-7 rounded-lg object-cover border border-[#E5E2D6]"
              />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold text-xs tracking-tight">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span>← All openings at {workspace.name}</span>
          </Link>

          <span className="rounded-full bg-[#FAF9F5] border border-[#E5E2D6] px-2.5 py-0.5 text-[11px] font-semibold text-[#666666]">
            {job.department_name || "General"}
          </span>
        </div>
      </header>

      {/* 2. MAIN CONTENT */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* POSITION HEADER */}
          <div className="rounded-2xl border border-[#E5E2D6] bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
                {job.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#666666]">
                <span className="font-semibold text-[#111111]">{job.department_name || "General"}</span>
                <span>•</span>
                <span>{job.location}</span>
                <span>•</span>
                <span className="capitalize">{job.work_mode || "remote"}</span>
                <span>•</span>
                <span>{job.employment_type}</span>
                {job.experience_level && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{job.experience_level}</span>
                  </>
                )}
                {job.show_salary && (job.salary_min || job.salary_max) && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-[#111111]">
                      {job.currency || "$"}{job.salary_min?.toLocaleString()}
                      {job.salary_max ? ` – ${job.currency || "$"}${job.salary_max.toLocaleString()}` : "+"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {!isOpen ? (
            /* CLOSED / PAUSED STATE */
            <div className="rounded-2xl border border-[#E5E2D6] bg-white p-10 text-center space-y-4 shadow-xs">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#FAF9F5] border border-[#E5E2D6] flex items-center justify-center text-[#888888] text-lg font-bold">
                ✕
              </div>
              <h2 className="text-xl font-bold text-[#111111]">This position is no longer open</h2>
              <p className="text-xs text-[#666666] max-w-md mx-auto leading-relaxed">
                Applications for this role have been paused or closed. You can explore our other active opportunities to see if there is another match for your skills.
              </p>
              <div className="pt-2">
                <Link
                  href={`/careers/${workspace.slug}`}
                  className="inline-block rounded-lg bg-[#111111] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#333333] transition-colors"
                >
                  View other open positions →
                </Link>
              </div>
            </div>
          ) : submitted ? (
            /* APPLICATION SUBMITTED SUCCESS */
            <div className="rounded-2xl border border-[#E5E2D6] bg-white p-10 sm:p-14 text-center space-y-4 shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF5EA] text-[#2D6A4F] text-2xl font-bold">
                ✓
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-[#111111]">Application submitted</h2>
                <p className="text-xs text-[#666666] max-w-md mx-auto leading-relaxed">
                  Thank you for applying for <span className="font-bold text-[#111111]">{job.title}</span> at{" "}
                  <span className="font-semibold text-[#111111]">{workspace.name}</span>. A confirmation email has been dispatched to{" "}
                  <span className="font-semibold text-[#111111]">{email}</span>.
                </p>
                <p className="text-xs text-[#666666] max-w-md mx-auto leading-relaxed pt-1">
                  Our recruiting team will review your qualifications and reach out directly with next steps.
                </p>
              </div>
              <div className="pt-6">
                <Link
                  href={`/careers/${workspace.slug}`}
                  className="inline-block rounded-lg bg-[#111111] text-white px-6 py-2.5 text-xs font-semibold hover:bg-[#333333] transition-colors"
                >
                  View other open positions →
                </Link>
              </div>
            </div>
          ) : (
            /* ACTIVE JOB DETAIL & APPLY FORM */
            <div className="space-y-8">
              {/* DESCRIPTION & REQUIREMENTS CARD */}
              <div className="rounded-2xl border border-[#E5E2D6] bg-white p-6 sm:p-8 shadow-xs space-y-6">
                {job.description && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#666666]">
                      About the role
                    </h2>
                    <div
                      className="prose prose-sm max-w-none text-xs text-[#333333] leading-relaxed space-y-3"
                      dangerouslySetInnerHTML={{ __html: job.description }}
                    />
                  </div>
                )}

                {job.requirements && (
                  <div className="space-y-3 pt-4 border-t border-[#E5E2D6]">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#666666]">
                      Requirements
                    </h2>
                    {Array.isArray(job.requirements) ? (
                      <ul className="list-disc pl-5 text-xs text-[#333333] space-y-1.5">
                        {job.requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-[#333333] whitespace-pre-line leading-relaxed">
                        {job.requirements}
                      </div>
                    )}
                  </div>
                )}

                {job.benefits && (
                  <div className="space-y-3 pt-4 border-t border-[#E5E2D6]">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#666666]">
                      Benefits & Perks
                    </h2>
                    {Array.isArray(job.benefits) ? (
                      <ul className="list-disc pl-5 text-xs text-[#333333] space-y-1.5">
                        {job.benefits.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-[#333333] whitespace-pre-line leading-relaxed">
                        {job.benefits}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* APPLY FORM CARD */}
              <div id="apply-form" className="rounded-2xl border border-[#E5E2D6] bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-[#E5E2D6] pb-4 space-y-1">
                  <h2 className="text-xl font-extrabold text-[#111111]">Apply for this position</h2>
                  <p className="text-xs text-[#666666]">
                    Please complete the details below. Required fields are marked with an asterisk (<span className="text-red-500">*</span>).
                  </p>
                </div>

                {errorMsg && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                  {/* Honeypot field for spam bots */}
                  <input
                    type="text"
                    name="website_hp"
                    value={websiteHp}
                    onChange={(e) => setWebsiteHp(e.target.value)}
                    style={{ display: "none" }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {/* 1. Basic Info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                      1. Contact information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-semibold text-[#111111] mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-[#111111] mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@example.com"
                          className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#111111] mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 2. Resume Upload */}
                  <div className="space-y-3 pt-2 border-t border-[#E5E2D6]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                      2. Resume / CV <span className="text-red-500">*</span>
                    </h3>

                    <div className="rounded-xl border-2 border-dashed border-[#E5E2D6] bg-[#FAF9F5] p-6 text-center space-y-2">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        id="career-resume-file"
                      />

                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-[#111111]">
                          {uploadingResume
                            ? "Uploading resume to secure Cloudflare R2 storage..."
                            : resumeFileName
                            ? `✓ Attached: ${resumeFileName} (${Math.round(resumeFileSize / 1024)} KB)`
                            : "Upload your resume"}
                        </p>
                        <p className="text-[11px] text-[#666666]">
                          PDF, DOC, or DOCX up to 5MB
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="career-resume-file"
                          className="inline-block cursor-pointer rounded-lg bg-white border border-[#E5E2D6] px-4 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F6F4EC] shadow-2xs"
                        >
                          {resumeFileName ? "Change file" : "Choose file"}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 3. Links */}
                  <div className="space-y-3 pt-2 border-t border-[#E5E2D6]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                      3. Web links (Optional)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-[#111111] mb-1">Portfolio</label>
                        <input
                          type="url"
                          value={portfolioUrl}
                          onChange={(e) => setPortfolioUrl(e.target.value)}
                          placeholder="https://mywork.com"
                          className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-[#111111] mb-1">LinkedIn</label>
                        <input
                          type="url"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-[#111111] mb-1">GitHub</label>
                        <input
                          type="url"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          placeholder="https://github.com/..."
                          className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Custom Questions */}
                  {questions.length > 0 && (
                    <div className="space-y-3.5 pt-2 border-t border-[#E5E2D6]">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                        4. Application questions
                      </h3>

                      <div className="space-y-3">
                        {questions.map((q) => (
                          <div key={q.id} className="space-y-1.5">
                            <label className="block font-semibold text-[#111111]">
                              {q.question} {q.required && <span className="text-red-500">*</span>}
                            </label>

                            {q.type === "short_text" && (
                              <input
                                type="text"
                                required={q.required}
                                value={answers[q.id] || ""}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                              />
                            )}

                            {q.type === "long_text" && (
                              <textarea
                                rows={3}
                                required={q.required}
                                value={answers[q.id] || ""}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                className="w-full rounded-lg border border-[#E5E2D6] bg-white p-3 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                              />
                            )}

                            {q.type === "yes_no" && (
                              <div className="flex items-center gap-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    value="Yes"
                                    checked={answers[q.id] === "Yes"}
                                    onChange={() => handleAnswerChange(q.id, "Yes")}
                                    className="accent-[#111111]"
                                  />
                                  <span>Yes</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    value="No"
                                    checked={answers[q.id] === "No"}
                                    onChange={() => handleAnswerChange(q.id, "No")}
                                    className="accent-[#111111]"
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            )}

                            {q.type === "select" && (
                              <select
                                required={q.required}
                                value={answers[q.id] || ""}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                              >
                                <option value="">Select an option</option>
                                {(q.options || []).map((opt, idx) => (
                                  <option key={idx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Cover letter */}
                  <div className="space-y-3 pt-2 border-t border-[#E5E2D6]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                      5. Note or cover letter (Optional)
                    </h3>
                    <textarea
                      rows={3}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Add anything else you would like us to know about your background or motivation..."
                      className="w-full rounded-lg border border-[#E5E2D6] bg-white p-3 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                    />
                  </div>

                  {/* Turnstile verification widget */}
                  <div className="pt-2">
                    <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />
                  </div>

                  {/* Consent Checkbox */}
                  <div className="pt-2 border-t border-[#E5E2D6]">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 rounded border-[#E5E2D6] accent-[#111111]"
                        required
                      />
                      <span className="text-[11px] text-[#666666] leading-relaxed">
                        I consent to {workspace.name} collecting and processing my application data for recruitment purposes in accordance with applicable privacy policies. <span className="text-red-500">*</span>
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex items-center justify-end">
                    <PrimaryButton
                      type="submit"
                      disabled={!isValid || loading || uploadingResume}
                      className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold"
                    >
                      {loading ? "Submitting application..." : "Submit application →"}
                    </PrimaryButton>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="border-t border-[#E5E2D6] bg-white py-6 px-4 text-center text-xs text-[#666666]">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#111111]">{workspace.name}</span>
            <span>— Careers Portal</span>
          </div>
          <p className="text-[11px] text-[#888888]">Powered by Zambic</p>
        </div>
      </footer>
    </div>
  );
}

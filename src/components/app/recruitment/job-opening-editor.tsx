"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  JobOpening,
  JobWorkMode,
  EmploymentType,
  ApplicationQuestion,
  ApplicationQuestionType,
} from "@/types/recruitment";
import { Department } from "@/types/department";
import { TiptapEditor } from "./tiptap-editor";
import {
  createJobOpeningAction,
  updateJobOpeningAction,
} from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface WorkspaceMemberOption {
  id: string;
  name: string;
  role: string;
}

export interface JobOpeningEditorProps {
  workspaceId: string;
  workspaceSlug: string;
  userRole: string;
  departments: Department[];
  members: WorkspaceMemberOption[];
  initialJob?: JobOpening | null;
}

export function JobOpeningEditor({
  workspaceId,
  workspaceSlug,
  userRole,
  departments,
  members,
  initialJob,
}: JobOpeningEditorProps) {
  const router = useRouter();
  const isEditing = Boolean(initialJob?.id);

  // Form State
  const [jobId, setJobId] = React.useState(initialJob?.id || "");
  const [title, setTitle] = React.useState(initialJob?.title || "");
  const [slug, setSlug] = React.useState(initialJob?.slug || "");
  const [departmentId, setDepartmentId] = React.useState(initialJob?.department_id || "");
  const [hiringManagerId, setHiringManagerId] = React.useState(initialJob?.hiring_manager_id || "");
  const [location, setLocation] = React.useState(initialJob?.location || "Remote");
  const [workMode, setWorkMode] = React.useState<JobWorkMode>(initialJob?.work_mode || "remote");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>(
    initialJob?.employment_type || "Full-time"
  );
  const [experienceLevel, setExperienceLevel] = React.useState(initialJob?.experience_level || "mid");
  const [openingsCount, setOpeningsCount] = React.useState<number>(initialJob?.openings_count || 1);
  const [salaryMin, setSalaryMin] = React.useState<number | "">(
    initialJob?.salary_min !== undefined && initialJob?.salary_min !== null ? initialJob.salary_min : ""
  );
  const [salaryMax, setSalaryMax] = React.useState<number | "">(
    initialJob?.salary_max !== undefined && initialJob?.salary_max !== null ? initialJob.salary_max : ""
  );
  const [currency, setCurrency] = React.useState(initialJob?.currency || "USD");
  const [showSalary, setShowSalary] = React.useState(Boolean(initialJob?.show_salary));
  const [description, setDescription] = React.useState(initialJob?.description || "");
  const [requirements, setRequirements] = React.useState(
    Array.isArray(initialJob?.requirements)
      ? initialJob.requirements.join("\n")
      : (initialJob?.requirements as string) || ""
  );
  const [benefits, setBenefits] = React.useState(
    Array.isArray(initialJob?.benefits)
      ? initialJob.benefits.join("\n")
      : (initialJob?.benefits as string) || ""
  );
  const [closesAt, setClosesAt] = React.useState(
    initialJob?.closes_at ? initialJob.closes_at.split("T")[0] : ""
  );

  // Application Questions (Max 5)
  const [questions, setQuestions] = React.useState<ApplicationQuestion[]>(
    initialJob?.application_questions || []
  );

  // Status & Feedback
  const [status, setStatus] = React.useState(initialJob?.status || "draft");
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Permission: Managers can only create draft; HR or Admin can publish
  const canPublish = ["owner", "admin", "hr"].includes(userRole.toLowerCase());

  // Auto-slug generation from title if slug not customized
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isEditing || !slug) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  // Questions Manager
  const addQuestion = () => {
    if (questions.length >= 5) return;
    const newQ: ApplicationQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: "short_text",
      question: "",
      required: false,
      options: [],
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<ApplicationQuestion>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  // Payload Builder
  const buildPayload = (targetStatus: "draft" | "published") => {
    const parsedReqs = requirements
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    const parsedBenefits = benefits
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    return {
      id: jobId || undefined,
      workspaceId,
      departmentId: departmentId || null,
      hiringManagerId: hiringManagerId || null,
      title: title.trim(),
      slug: slug.trim() || undefined,
      location: location.trim(),
      workMode,
      employmentType,
      experienceLevel: experienceLevel || null,
      openingsCount: Number(openingsCount) || 1,
      salaryMin: typeof salaryMin === "number" ? salaryMin : null,
      salaryMax: typeof salaryMax === "number" ? salaryMax : null,
      currency,
      showSalary,
      description,
      requirements: parsedReqs,
      benefits: parsedBenefits,
      applicationQuestions: questions.slice(0, 5),
      status: targetStatus,
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
    };
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    if (savingDraft || publishing) return;
    if (!title.trim()) {
      setErrorMsg("Please enter at least a title to save a draft.");
      return;
    }

    setSavingDraft(true);
    setErrorMsg(null);

    const payload = buildPayload("draft");

    try {
      if (jobId) {
        const res = await updateJobOpeningAction({ ...payload, id: jobId });
        if (res.success && res.data) {
          setJobId(res.data.id);
          setStatus("draft");
          setLastSaved(new Date().toLocaleTimeString());
        } else {
          setErrorMsg(res.error || "Failed to save draft.");
        }
      } else {
        const res = await createJobOpeningAction(payload);
        if (res.success && res.data) {
          setJobId(res.data.id);
          setStatus("draft");
          setLastSaved(new Date().toLocaleTimeString());
        } else {
          setErrorMsg(res.error || "Failed to create draft.");
        }
      }
    } catch {
      setErrorMsg("Error communicating with server.");
    } finally {
      setSavingDraft(false);
    }
  };

  // Autosave Draft (debounced)
  React.useEffect(() => {
    if (!title || title.trim().length < 2) return;
    const timer = setTimeout(() => {
      handleSaveDraft();
    }, 4000);
    return () => clearTimeout(timer);
  }, [title, location, description, requirements, benefits, workMode, employmentType]);

  // Publish Action with Validation
  const handlePublish = async () => {
    if (!title || title.trim().length < 2) {
      setErrorMsg("Job title must be at least 2 characters to publish.");
      return;
    }
    if (!description || description.trim().length < 10) {
      setErrorMsg("Please provide a thorough job description before publishing.");
      return;
    }
    if (!location.trim()) {
      setErrorMsg("Job location is required to publish.");
      return;
    }

    setPublishing(true);
    setErrorMsg(null);

    const payload = buildPayload("published");

    try {
      if (jobId) {
        const res = await updateJobOpeningAction({ ...payload, id: jobId });
        if (res.success) {
          router.push("/app/people");
          router.refresh();
        } else {
          setErrorMsg(res.error || "Failed to publish job opening.");
        }
      } else {
        const res = await createJobOpeningAction(payload);
        if (res.success) {
          router.push("/app/people");
          router.refresh();
        } else {
          setErrorMsg(res.error || "Failed to publish job opening.");
        }
      }
    } catch {
      setErrorMsg("An unexpected error occurred while publishing.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#111111] pb-24">
      {/* 1. TOP HEADER & ACTIONS BAR */}
      <div className="sticky top-0 z-30 border-b border-[#E5E2D6] bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/app/people"
              className="text-xs font-semibold text-[#666666] hover:text-[#111111] transition-colors"
            >
              ← People / Job Openings
            </Link>
            <span className="text-[#CCCCCC]">/</span>
            <span className="text-xs font-bold text-[#111111]">
              {isEditing ? "Edit Job Opening" : "New Job Opening"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {lastSaved && (
              <span className="text-[11px] text-[#888888] hidden sm:inline-block">
                Draft autosaved at {lastSaved}
              </span>
            )}

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-lg border border-[#E5E2D6] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F6F4EC] transition-colors"
            >
              Preview
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || publishing}
              className="rounded-lg border border-[#E5E2D6] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F6F4EC] transition-colors"
            >
              {savingDraft ? "Saving..." : "Save Draft"}
            </button>

            {canPublish ? (
              <PrimaryButton
                onClick={handlePublish}
                disabled={savingDraft || publishing}
                className="px-4 py-1.5 text-xs font-bold"
              >
                {publishing ? "Publishing..." : "Publish Opening"}
              </PrimaryButton>
            ) : (
              <button
                type="button"
                disabled
                title="Only HR and Admin roles can publish job openings."
                className="rounded-lg bg-[#E5E2D6] text-[#888888] px-4 py-1.5 text-xs font-semibold cursor-not-allowed"
              >
                Publish (HR Only)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN FORM CONTAINER */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600">
            {errorMsg}
          </div>
        )}

        {/* SECTION 1: ROLE IDENTITY */}
        <div className="rounded-xl border border-[#E5E2D6] bg-white p-6 shadow-xs space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
            1. Role Title & Placement
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Public URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] px-3 py-2 text-xs text-[#666666]">
                <span className="text-[#888888]">/careers/{workspaceSlug}/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="senior-frontend-engineer"
                  className="flex-1 bg-transparent text-xs font-semibold text-[#111111] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                <option value="">General / No Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Hiring Manager</label>
              <select
                value={hiringManagerId}
                onChange={(e) => setHiringManagerId(e.target.value)}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: WORK ARRANGEMENT & EMPLOYMENT */}
        <div className="rounded-xl border border-[#E5E2D6] bg-white p-6 shadow-xs space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
            2. Work Arrangement & Level
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote or San Francisco, CA"
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as JobWorkMode)}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contractor">Contractor</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                <option value="entry">Entry-level</option>
                <option value="mid">Mid-level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Principal</option>
                <option value="executive">Executive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Headcount / Openings</label>
              <input
                type="number"
                min={1}
                value={openingsCount}
                onChange={(e) => setOpeningsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Application Deadline</label>
              <input
                type="date"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: COMPENSATION */}
        <div className="rounded-xl border border-[#E5E2D6] bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
              3. Compensation
            </h2>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#111111]">
              <input
                type="checkbox"
                checked={showSalary}
                onChange={(e) => setShowSalary(e.target.checked)}
                className="rounded border-[#E5E2D6] accent-[#111111]"
              />
              <span>Display salary on public careers portal</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Minimum Salary</label>
              <input
                type="number"
                placeholder="e.g. 100000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Maximum Salary</label>
              <input
                type="number"
                placeholder="e.g. 140000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: DESCRIPTION & DETAILS (TIPTAP RICH TEXT) */}
        <div className="rounded-xl border border-[#E5E2D6] bg-white p-6 shadow-xs space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
            4. Role Overview & Description (Rich Text) <span className="text-red-500">*</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Full Description
            </label>
            <TiptapEditor value={description} onChange={(val) => setDescription(val)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Requirements (one per line)
              </label>
              <textarea
                rows={5}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="5+ years of React and TypeScript experience&#10;Strong API design fundamentals&#10;Excellent communication skills"
                className="w-full rounded-lg border border-[#E5E2D6] bg-white p-3 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Benefits & Perks (one per line)
              </label>
              <textarea
                rows={5}
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder="Comprehensive health & dental coverage&#10;Unlimited PTO policy&#10;Annual education & home office stipend"
                className="w-full rounded-lg border border-[#E5E2D6] bg-white p-3 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: CUSTOM APPLICATION QUESTIONS */}
        <div className="rounded-xl border border-[#E5E2D6] bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                5. Custom Application Questions ({questions.length}/5)
              </h2>
              <p className="text-[11px] text-[#888888]">
                Add up to 5 customized questions for applicants to answer when applying.
              </p>
            </div>

            {questions.length < 5 && (
              <button
                type="button"
                onClick={addQuestion}
                className="rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F6F4EC] transition-colors"
              >
                + Add Question
              </button>
            )}
          </div>

          {questions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E5E2D6] p-6 text-center text-xs text-[#888888]">
              No custom questions configured. Standard application fields (Name, Email, Phone, Resume, Links) will be collected.
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-[#E5E2D6] bg-[#FAF9F5] p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#111111]">Question #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                        placeholder="e.g. What is your notice period?"
                        className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                      />
                    </div>

                    <div>
                      <select
                        value={q.type}
                        onChange={(e) =>
                          updateQuestion(q.id, {
                            type: e.target.value as ApplicationQuestionType,
                          })
                        }
                        className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                      >
                        <option value="short_text">Short text</option>
                        <option value="long_text">Long text</option>
                        <option value="yes_no">Yes / No</option>
                        <option value="select">Dropdown select</option>
                      </select>
                    </div>
                  </div>

                  {q.type === "select" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#666666] mb-1">
                        Select Options (comma separated)
                      </label>
                      <input
                        type="text"
                        value={(q.options || []).join(", ")}
                        onChange={(e) =>
                          updateQuestion(q.id, {
                            options: e.target.value
                              .split(",")
                              .map((o) => o.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Option 1, Option 2, Option 3"
                        className="w-full rounded-lg border border-[#E5E2D6] bg-white px-3 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#666666]">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                      className="rounded border-[#E5E2D6] accent-[#111111]"
                    />
                    <span>Required question</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 3. PREVIEW MODAL */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#F6F4EC] p-6 shadow-xl border border-[#E5E2D6] space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E2D6] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                Applicant Preview Mode
              </span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-xs font-bold text-[#111111] hover:text-[#555555]"
              >
                ✕ Close
              </button>
            </div>

            <div className="rounded-xl bg-white p-6 border border-[#E5E2D6] space-y-4">
              <h1 className="text-2xl font-extrabold text-[#111111]">{title || "Untitled Role"}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#666666]">
                <span>{location || "Remote"}</span>
                <span>•</span>
                <span className="capitalize">{workMode}</span>
                <span>•</span>
                <span>{employmentType}</span>
                {showSalary && (salaryMin || salaryMax) && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-[#111111]">
                      {currency} {salaryMin ? Number(salaryMin).toLocaleString() : ""}
                      {salaryMax ? ` – ${Number(salaryMax).toLocaleString()}` : "+"}
                    </span>
                  </>
                )}
              </div>

              {description && (
                <div
                  className="prose prose-xs max-w-none text-xs text-[#333333] pt-4 border-t border-[#E5E2D6]"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Candidate, CandidateApplication, EmploymentType } from "@/types/recruitment";
import { Department } from "@/types/department";
import { createOfferAction, sendOfferAction } from "@/lib/recruitment/actions";
import { PrimaryButton } from "@/components/ui/primary-button";

export interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  candidate: Candidate;
  application: CandidateApplication;
  departments: Department[];
  onSuccess?: () => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "CHF", "JPY"];

export function CreateOfferModal({
  isOpen,
  onClose,
  workspaceId,
  candidate,
  application,
  departments,
  onSuccess,
}: CreateOfferModalProps) {
  const router = useRouter();

  const [step, setStep] = React.useState<"form" | "preview">("form");
  const [jobTitle, setJobTitle] = React.useState(
    application.job_opening?.title || candidate.latest_job_title || "Software Engineer"
  );
  const [departmentId, setDepartmentId] = React.useState(
    application.job_opening?.department_id || departments[0]?.id || ""
  );
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("Full-time");
  const [salary, setSalary] = React.useState("$150,000");
  const [salaryCurrency, setSalaryCurrency] = React.useState("USD");
  const [startDate, setStartDate] = React.useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const [expirationDate, setExpirationDate] = React.useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [offerNotes, setOfferNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const isValid = jobTitle.trim().length > 1 && salary.trim().length > 0;
  const deptName = departments.find((d) => d.id === departmentId)?.name || "General";

  const handleSaveDraftOrSend = async (actionType: "draft" | "send") => {
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await createOfferAction({
        workspaceId,
        applicationId: application.id,
        candidateId: candidate.id,
        jobOpeningId: application.job_opening_id,
        jobTitle: jobTitle.trim(),
        departmentId: departmentId || undefined,
        employmentType,
        salary: salary.trim(),
        salaryCurrency,
        startDate: startDate || undefined,
        expirationDate: expirationDate || undefined,
        offerNotes: offerNotes.trim() || undefined,
        status: "Draft",
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create offer.");
        setLoading(false);
        return;
      }

      if (actionType === "send" && res.data?.id) {
        await sendOfferAction({
          workspaceId,
          offerId: res.data.id,
        });
      }

      setLoading(false);
      onClose();
      router.refresh();
      if (onSuccess) onSuccess();
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
                <h2 className="text-base font-bold text-[#18221E]">
                  {step === "preview" ? "Offer Summary & Preview" : "Create Job Offer"}
                </h2>
                <p className="text-xs text-[#65706A]">
                  Candidate: <span className="font-semibold text-[#18221E]">{candidate.full_name}</span>
                </p>
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

            {step === "form" ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Department</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Employment Type</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-semibold text-[#18221E] mb-1">Salary / Compensation *</label>
                    <input
                      type="text"
                      required
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="e.g. $165,000 / year"
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Currency</label>
                    <select
                      value={salaryCurrency}
                      onChange={(e) => setSalaryCurrency(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-2 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Proposed Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#18221E] mb-1">Offer Expiration Date</label>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] px-3 py-1.5 text-xs text-[#18221E] focus:border-[#10251F] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#18221E] mb-1">Notes / Terms</label>
                  <textarea
                    rows={2}
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                    placeholder="Bonus structure, equity details, or relocation allowance..."
                    className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:border-[#10251F] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#D8DDD4]/60">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!isValid}
                    onClick={() => setStep("preview")}
                    className="rounded-[8px] bg-[#10251F] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs disabled:opacity-50"
                  >
                    Preview Offer →
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Formal Offer Preview */
              <div className="space-y-4 text-xs">
                <div className="rounded-[12px] border border-[#D8DDD4] bg-[#FAF9F5] p-5 space-y-3">
                  <div className="border-b border-[#D8DDD4]/80 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#65706A]">
                      Employment Offer
                    </span>
                    <h3 className="text-base font-bold text-[#18221E] mt-0.5">{jobTitle}</h3>
                    <p className="text-xs text-[#65706A]">
                      Department: {deptName} • {employmentType}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Candidate
                      </span>
                      <p className="font-semibold text-[#18221E]">{candidate.full_name}</p>
                      <p className="text-[11px] text-[#65706A]">{candidate.email}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Compensation
                      </span>
                      <p className="font-bold text-sm text-[#246244]">
                        {salary} {salaryCurrency}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Start Date
                      </span>
                      <p className="font-semibold text-[#18221E]">{startDate || "Immediate"}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Offer Expiration
                      </span>
                      <p className="font-semibold text-[#18221E]">{expirationDate || "7 days"}</p>
                    </div>
                  </div>

                  {offerNotes && (
                    <div className="pt-2 border-t border-[#D8DDD4]/60">
                      <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                        Additional Notes
                      </span>
                      <p className="text-xs text-[#18221E] mt-0.5 whitespace-pre-wrap">{offerNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#D8DDD4]/60">
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="rounded-[8px] border border-[#D8DDD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                  >
                    ← Edit Details
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSaveDraftOrSend("draft")}
                      className="rounded-[8px] border border-[#10251F] bg-white px-3.5 py-1.5 text-xs font-bold text-[#10251F] hover:bg-[#FAF9F5]"
                    >
                      Save Draft
                    </button>
                    <PrimaryButton
                      type="button"
                      disabled={loading}
                      onClick={() => handleSaveDraftOrSend("send")}
                      className="rounded-[8px] px-4 py-1.5 text-xs font-bold"
                    >
                      {loading ? "Sending..." : "Send Offer"}
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

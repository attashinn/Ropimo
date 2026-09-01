"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  acceptPublicOfferAction,
  declinePublicOfferAction,
} from "@/lib/recruitment/actions";

export interface CandidateOfferViewProps {
  offer: {
    id: string;
    token?: string | null;
    workspace_id: string;
    workspace_name: string;
    position_title: string;
    department_name: string;
    employment_type: string;
    salary: string;
    salary_currency: string;
    start_date?: string | null;
    expiration_date?: string | null;
    status: string;
    sent_at?: string | null;
    accepted_at?: string | null;
    declined_at?: string | null;
    candidate_name: string;
    candidate_email: string;
  };
}

const DECLINE_REASONS = [
  "Compensation / Salary",
  "Accepted another offer",
  "Timing mismatch",
  "Personal reasons",
  "Role / scope mismatch",
  "Other",
];

export function CandidateOfferView({ offer }: CandidateOfferViewProps) {
  const router = useRouter();

  const [status, setStatus] = React.useState(offer.status);
  const [acceptedAt, setAcceptedAt] = React.useState(offer.accepted_at);

  // Accept modal / confirm
  const [acceptModalOpen, setAcceptModalOpen] = React.useState(false);
  const [confirmedTerms, setConfirmedTerms] = React.useState(false);
  const [accepting, setAccepting] = React.useState(false);

  // Decline modal
  const [declineModalOpen, setDeclineModalOpen] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState(DECLINE_REASONS[0]);
  const [declineDetails, setDeclineDetails] = React.useState("");
  const [declining, setDeclining] = React.useState(false);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const isAccepted = status === "Accepted";
  const isDeclined = status === "Declined";
  const isWithdrawn = status === "Withdrawn";
  const isExpired = status === "Expired";
  const isActionable = ["Sent", "Viewed"].includes(status);

  const handleAccept = async () => {
    if (!confirmedTerms || accepting) return;
    setAccepting(true);
    setErrorMsg(null);

    try {
      const res = await acceptPublicOfferAction({
        tokenOrOfferId: offer.token || offer.id,
        confirmed: true,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to accept offer.");
        setAccepting(false);
        return;
      }

      setStatus("Accepted");
      setAcceptedAt(new Date().toISOString());
      setAcceptModalOpen(false);
      setAccepting(false);
      router.refresh();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setAccepting(false);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (declining) return;
    setDeclining(true);
    setErrorMsg(null);

    try {
      const res = await declinePublicOfferAction({
        tokenOrOfferId: offer.token || offer.id,
        reason: declineReason,
        details: declineDetails.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to decline offer.");
        setDeclining(false);
        return;
      }

      setStatus("Declined");
      setDeclineModalOpen(false);
      setDeclining(false);
      router.refresh();
    } catch {
      setErrorMsg("An unexpected error occurred.");
      setDeclining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#18221E] flex flex-col justify-between">
      {/* Public Header */}
      <header className="border-b border-[#D8DDD4] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/jobs" className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-[6px] bg-[#10251F] text-white flex items-center justify-center font-black text-xs">
              R
            </span>
            <span className="font-bold tracking-tight text-sm text-[#18221E]">
              {offer.workspace_name} Careers
            </span>
          </Link>

          <span className="text-xs text-[#65706A]">Employment Offer</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl w-full px-4 py-10">
        <div className="rounded-[16px] border border-[#D8DDD4] bg-white p-8 shadow-sm space-y-6">
          {/* Status Banner */}
          {isAccepted ? (
            <div className="rounded-[12px] bg-[#EAF4E2] border border-[#246244]/20 p-4 text-center space-y-1">
              <span className="text-xl font-bold text-[#246244]">🎉 Offer Accepted</span>
              <p className="text-xs text-[#246244]/90">
                You accepted this offer on{" "}
                {new Date(acceptedAt || Date.now()).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
                . Our hiring team will contact you with onboarding details shortly.
              </p>
            </div>
          ) : isDeclined ? (
            <div className="rounded-[12px] bg-stone-100 border border-stone-200 p-4 text-center space-y-1 text-[#65706A]">
              <span className="text-base font-bold text-[#18221E]">Offer Declined</span>
              <p className="text-xs">
                You have declined this offer. Thank you for your time throughout the interview process.
              </p>
            </div>
          ) : isWithdrawn ? (
            <div className="rounded-[12px] bg-stone-100 border border-stone-200 p-4 text-center text-xs text-[#65706A]">
              This offer has been withdrawn by the hiring team.
            </div>
          ) : isExpired ? (
            <div className="rounded-[12px] bg-amber-50 border border-amber-200 p-4 text-center text-xs text-amber-800">
              This offer has expired. Please contact your recruiter if you need an extension.
            </div>
          ) : null}

          {/* Offer Header */}
          <div className="border-b border-[#D8DDD4]/80 pb-5 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#246244]">
              Official Job Offer
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#18221E]">
              {offer.position_title}
            </h1>
            <p className="text-xs text-[#65706A]">
              {offer.workspace_name} • Department of {offer.department_name}
            </p>
          </div>

          {/* Candidate Greeting */}
          <div className="text-xs text-[#18221E] leading-relaxed space-y-2">
            <p>
              Dear <strong>{offer.candidate_name}</strong>,
            </p>
            <p className="text-[#65706A]">
              We were thoroughly impressed by your background, experience, and discussions during our interview process. We are excited to extend an offer for you to join our team as <strong>{offer.position_title}</strong>.
            </p>
          </div>

          {/* Compensation & Key Terms Card */}
          <div className="rounded-[14px] border border-[#D8DDD4] bg-[#FAF9F5] p-5 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#65706A]">
              Offer Terms & Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                  Compensation
                </span>
                <p className="font-extrabold text-base text-[#246244] mt-0.5">
                  {offer.salary} {offer.salary_currency}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                  Employment Type
                </span>
                <p className="font-semibold text-[#18221E] mt-0.5">{offer.employment_type}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                  Proposed Start Date
                </span>
                <p className="font-semibold text-[#18221E] mt-0.5">
                  {offer.start_date
                    ? new Date(offer.start_date).toLocaleDateString("en-US", { dateStyle: "medium" })
                    : "To be coordinated"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[#65706A] block">
                  Offer Expiration
                </span>
                <p className="font-semibold text-[#18221E] mt-0.5">
                  {offer.expiration_date
                    ? new Date(offer.expiration_date).toLocaleDateString("en-US", { dateStyle: "medium" })
                    : "7 days from receipt"}
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-[8px] bg-red-50 p-3 text-xs text-red-600 border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          {isActionable && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#D8DDD4]/80">
              <button
                type="button"
                onClick={() => setDeclineModalOpen(true)}
                className="w-full sm:w-auto rounded-[10px] border border-red-200 bg-white px-5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                Decline Offer
              </button>

              <button
                type="button"
                onClick={() => setAcceptModalOpen(true)}
                className="w-full sm:w-auto rounded-[10px] bg-[#10251F] text-white px-7 py-2.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-sm"
              >
                Accept Offer →
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Accept Confirmation Modal */}
      {acceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4">
            <h3 className="text-base font-bold text-[#18221E]">Confirm Acceptance</h3>
            <p className="text-xs text-[#65706A]">
              Please confirm your acceptance of the offer for <strong>{offer.position_title}</strong> at <strong>{offer.workspace_name}</strong>.
            </p>

            <label className="flex items-start gap-2.5 p-3 rounded-[10px] border border-[#D8DDD4] bg-[#FAF9F5] cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedTerms}
                onChange={(e) => setConfirmedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#D8DDD4] text-[#10251F] focus:ring-0"
              />
              <span className="text-xs text-[#18221E] font-medium leading-tight">
                By accepting this offer, I confirm that I accept the employment terms shown above.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DDD4]/60">
              <button
                type="button"
                onClick={() => setAcceptModalOpen(false)}
                disabled={accepting}
                className="rounded-[8px] border border-[#D8DDD4] bg-white px-4 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmedTerms || accepting}
                onClick={handleAccept}
                className="rounded-[8px] bg-[#10251F] text-white px-5 py-1.5 text-xs font-bold hover:bg-[#18342C] transition-colors shadow-2xs disabled:opacity-50"
              >
                {accepting ? "Processing..." : "Confirm & Accept Offer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {declineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-[#D8DDD4] bg-white p-6 shadow-xl text-[#18221E] space-y-4">
            <h3 className="text-base font-bold text-red-600">Decline Employment Offer</h3>
            <p className="text-xs text-[#65706A]">
              We value your feedback. Please let us know why you are declining this offer.
            </p>

            <form onSubmit={handleDecline} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Reason</label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:outline-none"
                >
                  {DECLINE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18221E] mb-1">Additional Feedback (Optional)</label>
                <textarea
                  rows={2}
                  value={declineDetails}
                  onChange={(e) => setDeclineDetails(e.target.value)}
                  placeholder="Optional details for the hiring team..."
                  className="w-full rounded-[8px] border border-[#D8DDD4] bg-[#FAF9F5] p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DDD4]/60">
                <button
                  type="button"
                  onClick={() => setDeclineModalOpen(false)}
                  disabled={declining}
                  className="rounded-[8px] border border-[#D8DDD4] bg-white px-4 py-1.5 text-xs font-semibold text-[#18221E] hover:bg-[#FAF9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={declining}
                  className="rounded-[8px] bg-red-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-red-700 transition-colors shadow-2xs"
                >
                  {declining ? "Processing..." : "Confirm Decline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#D8DDD4] bg-white py-4 text-center text-xs text-[#65706A]">
        © {new Date().getFullYear()} {offer.workspace_name}. Powered by Ropimo Recruitment.
      </footer>
    </div>
  );
}

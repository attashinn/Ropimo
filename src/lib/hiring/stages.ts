/**
 * Hiring Pipeline Stages & Allowed State Transitions
 *
 * STAGES: applied, screening, interview, offer, hired, rejected, withdrawn.
 * Enforced on server actions and recorded to candidate_events.
 */

export const HIRING_STAGES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type HiringStage = (typeof HIRING_STAGES)[number];

export interface StageDefinition {
  stage: HiringStage;
  label: string;
  description: string;
  dotColor: string;
  badgeClass: string;
}

export const STAGE_DEFINITIONS: Record<HiringStage, StageDefinition> = {
  applied: {
    stage: "applied",
    label: "Applied",
    description: "New application received, awaiting screening",
    dotColor: "#0284C7", // Sky 600
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  screening: {
    stage: "screening",
    label: "Screening",
    description: "Initial resume review or recruiter phone screen",
    dotColor: "#4F46E5", // Indigo 600
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  interview: {
    stage: "interview",
    label: "Interview",
    description: "Technical, behavioral, or panel interviews scheduled/in progress",
    dotColor: "#D97706", // Amber 600
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  offer: {
    stage: "offer",
    label: "Offer",
    description: "Job offer extended, pending candidate acceptance",
    dotColor: "#059669", // Emerald 600
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  hired: {
    stage: "hired",
    label: "Hired",
    description: "Offer accepted and candidate onboarded",
    dotColor: "#10251F", // Dark Forest
    badgeClass: "bg-[#EAF4E2] text-[#246244] border-[#D8DDD4]",
  },
  rejected: {
    stage: "rejected",
    label: "Rejected",
    description: "Not selected for this opening",
    dotColor: "#78716C", // Stone 500
    badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
  },
  withdrawn: {
    stage: "withdrawn",
    label: "Withdrawn",
    description: "Candidate withdrew application or accepted another offer",
    dotColor: "#A8A29E", // Stone 400
    badgeClass: "bg-stone-50 text-stone-600 border-stone-200",
  },
};

/**
 * Transition rules matrix:
 * Defines allowed destination stages for any given current stage.
 */
export const ALLOWED_TRANSITIONS: Record<HiringStage, readonly HiringStage[]> = {
  applied: ["screening", "interview", "rejected", "withdrawn"],
  screening: ["interview", "offer", "rejected", "withdrawn"],
  interview: ["screening", "offer", "rejected", "withdrawn"],
  offer: ["interview", "hired", "rejected", "withdrawn"],
  hired: ["withdrawn"], // Hired candidates can only be marked withdrawn/cancelled by admin
  rejected: ["screening", "interview"], // Allows reconsideration
  withdrawn: ["screening", "interview"], // Allows candidate reactivation
};

/**
 * Validates if a transition from `currentStage` to `targetStage` is permitted.
 */
export function isAllowedStageTransition(
  currentStage: string | null | undefined,
  targetStage: string
): { allowed: boolean; reason?: string } {
  const normalizedCurrent = (currentStage || "applied").toLowerCase() as HiringStage;
  const normalizedTarget = targetStage.toLowerCase() as HiringStage;

  if (normalizedCurrent === normalizedTarget) {
    return { allowed: true };
  }

  if (!HIRING_STAGES.includes(normalizedTarget)) {
    return {
      allowed: false,
      reason: `"${targetStage}" is not a valid candidate stage.`,
    };
  }

  const allowedDestinations = ALLOWED_TRANSITIONS[normalizedCurrent];
  if (!allowedDestinations || !allowedDestinations.includes(normalizedTarget)) {
    const currentLabel = STAGE_DEFINITIONS[normalizedCurrent]?.label || normalizedCurrent;
    const targetLabel = STAGE_DEFINITIONS[normalizedTarget]?.label || normalizedTarget;
    return {
      allowed: false,
      reason: `Cannot move candidate directly from "${currentLabel}" to "${targetLabel}".`,
    };
  }

  return { allowed: true };
}

/**
 * Helper to normalize any case-insensitive stage string to canonical HiringStage.
 */
export function normalizeStage(stage?: string | null): HiringStage {
  if (!stage) return "applied";
  const s = stage.toLowerCase().trim();
  if ((HIRING_STAGES as readonly string[]).includes(s)) {
    return s as HiringStage;
  }
  if (s === "shortlisted" || s === "feedback") return "interview";
  if (s === "assessment" || s === "final review") return "interview";
  if (s === "expired") return "withdrawn";
  return "applied";
}

import { z } from "zod";

export const ApplicationQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["short_text", "long_text", "yes_no", "select"]),
  question: z.string().min(1, "Question text is required"),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export const JobOpeningSchema = z.object({
  id: z.string().optional(),
  workspaceId: z.string().uuid("Invalid workspace ID"),
  departmentId: z.string().uuid().optional().nullable().or(z.literal("")),
  hiringManagerId: z.string().uuid().optional().nullable().or(z.literal("")),
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  slug: z.string().trim().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  location: z.string().trim().min(1, "Location is required"),
  workMode: z.enum(["onsite", "hybrid", "remote"]).default("remote"),
  employmentType: z.enum(["Full-time", "Part-time", "Contractor", "Intern"]).default("Full-time"),
  experienceLevel: z.string().optional().nullable(),
  openingsCount: z.number().int().min(1, "Openings count must be at least 1").default(1),
  salaryMin: z.number().nonnegative().optional().nullable(),
  salaryMax: z.number().nonnegative().optional().nullable(),
  currency: z.string().default("USD"),
  showSalary: z.boolean().default(false),
  description: z.string().trim().min(10, "Job description must be at least 10 characters"),
  requirements: z.union([z.array(z.string()), z.string()]).default([]),
  benefits: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  applicationQuestions: z.array(ApplicationQuestionSchema).max(5, "Maximum 5 application questions allowed").default([]),
  status: z.enum(["draft", "published", "paused", "closed"]).default("draft"),
  closesAt: z.string().optional().nullable(),
});

export const PublicCandidateApplicationSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID format."),
  jobOpeningId: z.string().min(1, "Job opening ID is required."),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
  email: z.string().trim().email("Please provide a valid email address.").toLowerCase(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  portfolioUrl: z
    .string()
    .trim()
    .url("Portfolio URL must be a valid web link.")
    .optional()
    .nullable()
    .or(z.literal("")),
  linkedinUrl: z
    .string()
    .trim()
    .url("LinkedIn URL must be a valid web link.")
    .optional()
    .nullable()
    .or(z.literal("")),
  githubUrl: z
    .string()
    .trim()
    .url("GitHub URL must be a valid web link.")
    .optional()
    .nullable()
    .or(z.literal("")),
  yearsOfExperience: z
    .number()
    .min(0, "Years of experience cannot be negative.")
    .max(60, "Years of experience cannot exceed 60.")
    .optional()
    .nullable(),
  skills: z.array(z.string().trim()).optional(),
  coverLetter: z.string().trim().max(10000, "Cover letter cannot exceed 10,000 characters.").optional().nullable(),
  cvStorageKey: z.string().min(5, "CV storage reference is required."),
  cvFileName: z
    .string()
    .regex(/^[a-zA-Z0-9_\-.]+\.(pdf|doc|docx)$/i, "CV file must be a PDF, DOC, or DOCX document with a safe filename."),
  cvFileSize: z
    .number()
    .max(5 * 1024 * 1024, "CV file size cannot exceed 5MB."),
  cvFileType: z
    .enum([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ])
    .optional(),
  answers: z.record(z.string(), z.any()).optional().nullable(),
  consent: z.boolean().refine((val) => val === true, {
    message: "You must consent to data processing to apply.",
  }),
  website_hp: z.string().optional().nullable().or(z.literal("")),
  turnstileToken: z.string().optional().nullable(),
});

export type PublicCandidateApplicationInput = z.infer<typeof PublicCandidateApplicationSchema>;
export type JobOpeningInput = z.infer<typeof JobOpeningSchema>;

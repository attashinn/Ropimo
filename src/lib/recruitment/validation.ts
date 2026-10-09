import { z } from "zod";

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
    .max(15 * 1024 * 1024, "CV file size cannot exceed 15MB.")
    .optional(),
  cvFileType: z
    .enum([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ])
    .optional(),
  turnstileToken: z.string().optional().nullable(),
});

export type PublicCandidateApplicationInput = z.infer<typeof PublicCandidateApplicationSchema>;

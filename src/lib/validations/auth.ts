import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter your email address")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Please enter your password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(80, "Full name is too long"),
    email: z
      .string()
      .min(1, "Please enter your work email")
      .email("Please enter a valid work email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: "You must agree to the Terms and Privacy Policy to continue",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter your email address")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const workspaceStepSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name is too long"),
  teamSize: z.enum(["1-10", "11-50", "51-200", "200+"], {
    error: "Please select a team size",
  }),
  industry: z
    .string()
    .min(1, "Please select your industry"),
});

export type WorkspaceStepInput = z.infer<typeof workspaceStepSchema>;

export const roleStepSchema = z.object({
  role: z.enum(["Owner", "HR", "Manager", "Team member"], {
    error: "Please select your role",
  }),
});

export type RoleStepInput = z.infer<typeof roleStepSchema>;

export const inviteStepSchema = z.object({
  emails: z
    .array(
      z.string().email("Please enter a valid email address").or(z.literal(""))
    )
    .max(5, "You can invite up to 5 teammates right now"),
});

export type InviteStepInput = z.infer<typeof inviteStepSchema>;

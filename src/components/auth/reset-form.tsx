"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/password-input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ResetForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setErrorMessage(
          error.message || "Could not update your password. Please try requesting a new link."
        );
        setIsLoading(false);
        return;
      }

      toast.success("Password updated successfully!");
      // Redirect to /login with success message
      router.push("/login?message=Password%20has%20been%20reset%20successfully.%20Please%20log%20in.");
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      setErrorMessage("Failed to update password. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {errorMessage && (
        <div className="mb-5 rounded-2xl border border-[#F5C2BE] bg-[#FDF2F1] p-3.5 text-xs text-[#D93025] font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* New Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-[13px] font-semibold text-[#111] mb-1.5"
          >
            New password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-[13px] font-semibold text-[#111] mb-1.5"
          >
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-[13px] text-[#D93025] mt-1 font-medium">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 sm:h-12 w-full rounded-full bg-[#111] text-white text-[14px] font-bold transition-all duration-150 hover:scale-[1.02] hover:bg-black active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Updating password...</span>
              </>
            ) : (
              <span>Reset password</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface GoogleButtonProps {
  redirectPath?: string;
}

export function GoogleButton({ redirectPath = "/dashboard" }: GoogleButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
        },
      });

      if (error) {
        toast.error("Could not sign in with Google. Please try again.");
        setLoading(false);
      }
    } catch {
      toast.error("An unexpected error occurred during Google sign in.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="flex h-11 sm:h-12 w-full items-center justify-center gap-3 rounded-full border border-[#E5E2D6] bg-white px-4 text-[14px] font-bold text-[#111] transition-all duration-150 hover:scale-[1.02] hover:bg-[#F9F8F5] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#111]" />
      ) : (
        <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.28 21.41 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.28 2.59 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
          />
        </svg>
      )}
      <span>Continue with Google</span>
    </button>
  );
}

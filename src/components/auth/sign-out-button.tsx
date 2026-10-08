"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

export function SignOutButton() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Signed out");
      window.location.href = "/login";
    } catch {
      toast.error("Failed to sign out");
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#E9E6DA] bg-white px-3 text-[13px] font-medium text-[#6B6B6B] hover:text-[#111] hover:bg-[#F4F2EA] transition-colors disabled:opacity-50 cursor-pointer"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 stroke-[1.5]" />
      )}
      <span>Sign out</span>
    </button>
  );
}

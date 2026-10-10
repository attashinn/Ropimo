if (typeof window !== "undefined") {
  throw new Error("createAdminClient must never be executed on the client.");
}

import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with admin (service role) privileges.
 * WARNING: Never import or execute this in client components or browser contexts.
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder-project.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey && process.env.NODE_ENV === "production") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production and must never be exposed.");
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-service-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

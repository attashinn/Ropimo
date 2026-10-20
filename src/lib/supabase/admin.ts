if (typeof window !== "undefined") {
  throw new Error("createAdminClient must never be executed on the client.");
}

import { createAdminClient as createNeonAdminClient } from "@/lib/neon/adapter";

/**
 * Server-only Neon DB client with admin privileges.
 * WARNING: Never import or execute this in client components or browser contexts.
 */
export function createAdminClient() {
  return createNeonAdminClient();
}

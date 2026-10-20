if (typeof window !== "undefined") {
  throw new Error("createAdminClient must never be executed on the client.");
}

import { createAdminClient as createNeonAdminClient } from "./adapter";

/**
 * Server-only Neon DB client with admin privileges.
 */
export function createAdminClient() {
  return createNeonAdminClient();
}

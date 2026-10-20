import { createServerClient as createNeonServerClient } from "@/lib/neon/adapter";

export async function createClient() {
  return createNeonServerClient();
}

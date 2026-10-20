import { createServerClient as createNeonServerClient } from "./adapter";

export async function createClient() {
  return createNeonServerClient();
}

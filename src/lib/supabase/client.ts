import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "@/lib/env";

/**
 * Supabase client for use in Client Components (browser).
 * Sessions are shared with the server via cookies (see server.ts).
 */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

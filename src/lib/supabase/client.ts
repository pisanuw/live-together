import { createBrowserClient } from "@supabase/ssr";

import { DB_SCHEMA, requireSupabaseEnv } from "@/lib/env";

/**
 * Supabase client for use in Client Components (browser).
 * Sessions are shared with the server via cookies (see server.ts).
 * Queries default to the `wcv` schema so WCV never touches other apps' tables.
 */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey, {
    db: { schema: DB_SCHEMA },
  });
}

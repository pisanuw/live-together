/**
 * Centralized environment access.
 *
 * `NEXT_PUBLIC_*` values are statically referenced here so Next.js inlines them
 * into the client bundle. Server-only secrets (e.g. the service-role key) must
 * NEVER be read from client components.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/** True when the browser-safe Supabase credentials are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/**
 * Returns the Supabase URL + anon key, throwing a clear error if either is
 * missing. Call this only when a Supabase client is actually needed.
 */
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const { supabaseUrl: url, supabaseAnonKey: anonKey } = env;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment (.env)."
    );
  }
  return { url, anonKey };
}

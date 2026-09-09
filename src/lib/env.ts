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

/**
 * WCV shares the "upvoteme" Supabase project with other apps, so every WCV
 * table lives in this dedicated Postgres schema — never `public` — to avoid
 * name collisions. All Supabase clients default their queries to it.
 * (The schema must be added to the project's exposed Data API schemas.)
 */
export const DB_SCHEMA = "wcv";

/** Slug of the default building (seeded in Stage 1). */
export const DEFAULT_BUILDING_SLUG = "wcv";

/**
 * Server-only environment. NEVER import these from a Client Component — the
 * service-role key bypasses RLS and the superadmin secret gates bootstrap.
 */
export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  superadminSecret: process.env.SUPERADMIN_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom:
    process.env.EMAIL_FROM ??
    "West Complex Village <noreply-live-together@pisan.me>",
} as const;

/** Returns Resend credentials, throwing if the API key is missing. */
export function requireResend(): { apiKey: string; from: string } {
  const apiKey = serverEnv.resendApiKey;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set (required to send email).");
  }
  return { apiKey, from: serverEnv.emailFrom };
}

/** Returns the service-role key, throwing a clear error if it is missing. */
export function requireServiceRoleKey(): string {
  const key = serverEnv.supabaseServiceRoleKey;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is required for privileged " +
        "server-side writes (approvals, provisioning)."
    );
  }
  return key;
}

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

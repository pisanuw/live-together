import { env, isSupabaseConfigured } from "@/lib/env";

export interface SupabasePing {
  configured: boolean;
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Lightweight, schema-independent connectivity check: hits the Supabase Auth
 * health endpoint. Proves the URL + key reach a live project without touching
 * any table (so it is unaffected by the `wcv` schema not existing yet).
 */
export async function pingSupabase(): Promise<SupabasePing> {
  if (!isSupabaseConfigured()) {
    return { configured: false, ok: false, error: "not configured" };
  }

  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: env.supabaseAnonKey as string },
      cache: "no-store",
    });
    return { configured: true, ok: res.ok, status: res.status };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

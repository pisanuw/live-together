import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  DB_SCHEMA,
  requireServiceRoleKey,
  requireSupabaseEnv,
} from "@/lib/env";

/**
 * Service-role Supabase client for privileged, server-only writes and
 * cross-user reads (provisioning, approvals, member/invite management).
 *
 * BYPASSES RLS — every caller MUST perform its own authorization check first.
 * Never import this from a Client Component.
 */
export function createAdminClient() {
  const { url } = requireSupabaseEnv();
  const serviceRoleKey = requireServiceRoleKey();

  return createSupabaseClient(url, serviceRoleKey, {
    db: { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

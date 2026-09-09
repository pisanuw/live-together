import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { DB_SCHEMA, isSupabaseConfigured, requireSupabaseEnv } from "@/lib/env";

/**
 * Refreshes the Supabase auth session on each request and syncs the cookies
 * onto the response. Called from `proxy.ts` (Next 16's middleware replacement).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;
  const { url, anonKey } = requireSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    db: { schema: DB_SCHEMA },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the user to trigger a token refresh when needed. Do not run code
  // between createServerClient and getUser (per @supabase/ssr guidance).
  await supabase.auth.getUser();

  return response;
}

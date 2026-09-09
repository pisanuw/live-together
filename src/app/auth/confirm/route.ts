import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { provisionUser } from "@/lib/auth/provision";
import { createClient } from "@/lib/supabase/server";

/** Magic-link (email OTP) confirmation via token_hash. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await provisionUser(user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid+or+expired+link`);
}

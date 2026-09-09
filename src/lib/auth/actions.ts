"use server";

import { redirect } from "next/navigation";

import { sendMagicLinkEmail } from "@/lib/email/magic-link";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env.siteUrl}/auth/callback` },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) redirect("/login?error=Enter+your+email");

  // Generate the link server-side and deliver via Resend (WCV's own
  // from-address) — the shared project's Supabase SMTP is never used.
  try {
    await sendMagicLinkEmail(email);
  } catch {
    redirect("/login?error=Could+not+send+the+sign-in+email");
  }
  redirect("/login?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

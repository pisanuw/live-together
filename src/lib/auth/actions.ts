"use server";

import { redirect } from "next/navigation";

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
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/login?error=Enter+your+email");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Ride the DEFAULT ({{ .ConfirmationURL }}) email template — it honors this
    // per-request redirect, so we don't touch the shared project's Site URL or
    // email templates. Same code-exchange path as Google (/auth/callback).
    options: { emailRedirectTo: `${env.siteUrl}/auth/callback` },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

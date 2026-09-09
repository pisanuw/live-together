import "server-only";

import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

function magicLinkHtml(url: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0">WCV</p>
    <h1 style="font-size:20px;margin:4px 0 16px">Sign in to West Complex Village</h1>
    <p style="color:#444;line-height:1.5">Click the button below to sign in. This link expires shortly and can be used once.</p>
    <p style="margin:24px 0">
      <a href="${url}" style="background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">Sign in</a>
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5">If the button doesn't work, paste this link into your browser:<br>
      <a href="${url}" style="color:#555">${url}</a>
    </p>
    <p style="color:#aaa;font-size:12px;margin-top:24px">If you didn't request this, you can ignore this email.</p>
  </div>`;
}

/**
 * Generates a single-use magic link server-side and emails it via Resend.
 * Bypasses Supabase's (project-wide, shared) email delivery entirely.
 */
export async function sendMagicLinkEmail(email: string): Promise<void> {
  const admin = createAdminClient();
  const redirectTo = `${env.siteUrl}/auth/callback`;

  const generate = () =>
    admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

  let { data, error } = await generate();
  if (error) {
    // `magiclink` requires an existing user; create a passwordless one + retry.
    const created = await admin.auth.admin.createUser({ email });
    if (created.error && !/registered|already/i.test(created.error.message)) {
      throw created.error;
    }
    ({ data, error } = await generate());
  }

  const props = data?.properties;
  if (error || !props?.hashed_token) {
    throw error ?? new Error("Could not generate a magic link");
  }

  const url = new URL(`${env.siteUrl}/auth/confirm`);
  url.searchParams.set("token_hash", props.hashed_token);
  // Use the ACTUAL verification type — Supabase returns `signup` for a
  // brand-new email and `magiclink` for an existing user. Hardcoding either
  // makes verifyOtp reject the other (which bounced users back to /login).
  url.searchParams.set("type", props.verification_type ?? "magiclink");
  url.searchParams.set("next", "/");

  await sendEmail({
    to: email,
    subject: "Your West Complex Village sign-in link",
    html: magicLinkHtml(url.toString()),
    text: `Sign in to West Complex Village: ${url.toString()}`,
  });
}

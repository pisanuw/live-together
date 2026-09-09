import "server-only";

import { requireResend } from "@/lib/env";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends a transactional email via the Resend REST API (no SDK dependency).
 * Uses WCV's own from-address so it never relies on the shared Supabase
 * project's SMTP settings.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { apiKey, from } = requireResend();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
}

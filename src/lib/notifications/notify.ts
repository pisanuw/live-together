import "server-only";

import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import type { NotifCategory } from "@/lib/settings/notifications";
import {
  isNotifEnabled,
  normalizeNotifPrefs,
} from "@/lib/settings/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

interface NotifyInput {
  userId: string;
  buildingId: string;
  category: NotifCategory;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  /** Also send an email (best-effort). Defaults to true. */
  email?: boolean;
}

function emailHtml(title: string, body: string | null, url: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0">WCV</p>
    <h1 style="font-size:18px;margin:4px 0 12px">${title}</h1>
    ${body ? `<p style="color:#444;line-height:1.5">${body}</p>` : ""}
    <p style="margin:20px 0"><a href="${url}" style="background:#111;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;display:inline-block">Open WCV</a></p>
    <p style="color:#aaa;font-size:12px;margin-top:20px">Manage what you're emailed about in Settings → Notifications.</p>
  </div>`;
}

/**
 * Delivers a notification to one user, honoring their per-category preferences:
 * writes an in-app row (streamed via Realtime) and, unless opted out, emails
 * them via Resend. Email is best-effort — a send failure never breaks the
 * caller's mutation. Skips entirely if the user disabled the category.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("user_settings")
    .select("notif_prefs")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (
    !isNotifEnabled(normalizeNotifPrefs(settings?.notif_prefs), input.category)
  ) {
    return;
  }

  await admin.from("notifications").insert({
    building_id: input.buildingId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });

  if (input.email === false) return;
  try {
    const { data } = await admin.auth.admin.getUserById(input.userId);
    const to = data?.user?.email;
    if (!to) return;
    const url = input.link ? `${env.siteUrl}${input.link}` : env.siteUrl;
    await sendEmail({
      to,
      subject: input.title,
      html: emailHtml(input.title, input.body ?? null, url),
      text: `${input.title}\n\n${input.body ?? ""}\n\n${url}`,
    });
  } catch {
    // Email is best-effort (e.g. RESEND_API_KEY unset); the in-app row stands.
  }
}

/** Fan-out helper: notify several users, skipping any falsy ids and de-duping. */
export async function notifyMany(
  userIds: (string | null | undefined)[],
  input: Omit<NotifyInput, "userId">
): Promise<void> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  await Promise.all(ids.map((userId) => notify({ ...input, userId })));
}

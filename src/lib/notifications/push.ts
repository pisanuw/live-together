import "server-only";

import webpush from "web-push";

import { env, isPushConfigured, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

/** Lazily set the VAPID identity once (only if both keys are present). */
function ensureVapid(): boolean {
  if (!isPushConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      env.siteUrl,
      env.vapidPublicKey!,
      serverEnv.vapidPrivateKey!
    );
    configured = true;
  }
  return true;
}

interface PushPayload {
  title: string;
  body?: string | null;
  url?: string | null;
}

interface SubRow {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Sends a Web Push to every subscription a user has. No-ops if VAPID keys
 * aren't configured. Expired subscriptions (404/410) are pruned. Best-effort —
 * never throws, so callers (notify()) aren't affected by push failures.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!ensureVapid()) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, keys")
    .eq("user_id", userId);
  const subs = (data as SubRow[] | null) ?? [];
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}

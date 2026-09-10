"use server";

import { getViewer } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

interface PushSubInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Stores (or refreshes) a Web Push subscription for the signed-in user. */
export async function savePushSubscription(
  sub: PushSubInput,
  userAgent?: string
) {
  const viewer = await getViewer();
  if (!viewer.userId) return;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return;

  const admin = createAdminClient();
  await admin.from("push_subscriptions").upsert(
    {
      user_id: viewer.userId,
      endpoint: sub.endpoint,
      keys: sub.keys,
      user_agent: userAgent ?? null,
    },
    { onConflict: "endpoint" }
  );
}

/** Removes a subscription (this device opted out). */
export async function removePushSubscription(endpoint: string) {
  const viewer = await getViewer();
  if (!viewer.userId || !endpoint) return;

  const admin = createAdminClient();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", viewer.userId);
}

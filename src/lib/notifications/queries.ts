import "server-only";

import type { Notification } from "@/lib/notifications/types";
import { createAdminClient } from "@/lib/supabase/admin";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** The user's most recent notifications (newest first). */
export async function listNotifications(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data as NotificationRow[] | null) ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
}

/** Count of unread notifications, for the header badge. */
export async function unreadCount(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

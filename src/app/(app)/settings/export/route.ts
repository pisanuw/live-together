import { getViewer } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Exports the signed-in user's WCV data as a JSON download. Only ever returns
 * the caller's own rows (keyed by their user id), derived from the session.
 */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer.userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const uid = viewer.userId;
  const admin = createAdminClient();

  const [posts, comments, signups, requests] = await Promise.all([
    admin
      .from("posts")
      .select("id, title, body, created_at, deleted_at")
      .eq("author_id", uid),
    admin
      .from("comments")
      .select("id, post_id, body, created_at, deleted_at")
      .eq("author_id", uid),
    admin
      .from("event_signups")
      .select("event_id, status, guests_count, created_at")
      .eq("user_id", uid),
    admin
      .from("maintenance_requests")
      .select("id, title, category, priority, status, created_at")
      .eq("created_by", uid),
  ]);

  const data = {
    exported_at: new Date().toISOString(),
    profile: viewer.profile,
    settings: {
      theme: viewer.theme,
      accent: viewer.accent,
      notif_prefs: viewer.notifPrefs,
    },
    memberships: viewer.memberships.map((m) => ({
      building_id: m.building_id,
      role: m.role,
      status: m.status,
    })),
    forum_posts: posts.data ?? [],
    forum_comments: comments.data ?? [],
    event_signups: signups.data ?? [],
    maintenance_requests: requests.data ?? [],
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="wcv-my-data.json"',
    },
  });
}

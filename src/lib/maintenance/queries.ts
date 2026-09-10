import "server-only";

import type { Membership, Profile } from "@/lib/auth/types";
import { displayName } from "@/lib/auth/types";
import type { Author } from "@/lib/forum/types";
import { signMaintenanceUrls } from "@/lib/maintenance/media";
import type {
  MaintenanceRequestRow,
  MaintenanceUpdateRow,
  RequestDetail,
  RequestListItem,
} from "@/lib/maintenance/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAvatarUrl } from "@/lib/storage/avatars";

type Admin = ReturnType<typeof createAdminClient>;
export type RequestScope = "open" | "closed" | "all";

const OPEN_STATUSES = ["open", "in_progress"];
const CLOSED_STATUSES = ["resolved", "closed", "cancelled"];

async function resolveAuthors(
  admin: Admin,
  userIds: (string | null)[]
): Promise<Map<string, Author>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  const map = new Map<string, Author>();
  if (ids.length === 0) return map;

  const { data } = await admin.from("profiles").select("*").in("id", ids);
  const profiles = new Map(
    ((data as Profile[] | null) ?? []).map((p) => [p.id, p])
  );
  await Promise.all(
    ids.map(async (id) => {
      const profile = profiles.get(id) ?? null;
      map.set(id, {
        id,
        name: displayName(profile, "Resident"),
        avatarUrl: await resolveAvatarUrl(profile?.avatar_url),
      });
    })
  );
  return map;
}

function tally(rows: { request_id: string }[] | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(row.request_id, (counts.get(row.request_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Maintenance requests for a building. Residents see only their own; managers
 * see everyone's. Filtered by `scope` (open / closed / all) and ordered
 * newest-first, each with creator, assignee, and comment/photo counts.
 */
export async function listRequests(
  buildingId: string,
  viewerId: string,
  isManager: boolean,
  scope: RequestScope
): Promise<RequestListItem[]> {
  const admin = createAdminClient();

  let query = admin
    .from("maintenance_requests")
    .select("*")
    .eq("building_id", buildingId)
    .order("created_at", { ascending: false });
  if (!isManager) query = query.eq("created_by", viewerId);
  if (scope === "open") query = query.in("status", OPEN_STATUSES);
  if (scope === "closed") query = query.in("status", CLOSED_STATUSES);

  const { data } = await query;
  const requests = (data as MaintenanceRequestRow[] | null) ?? [];
  if (requests.length === 0) return [];

  const ids = requests.map((r) => r.id);
  // Residents only count non-internal updates; managers count all.
  let commentQuery = admin
    .from("maintenance_updates")
    .select("request_id")
    .in("request_id", ids)
    .not("body", "is", null);
  if (!isManager) commentQuery = commentQuery.eq("is_internal", false);

  const [authors, commentRows, imageRows] = await Promise.all([
    resolveAuthors(admin, [
      ...requests.map((r) => r.created_by),
      ...requests.map((r) => r.assigned_to),
    ]),
    commentQuery,
    admin
      .from("attachments")
      .select("maintenance_request_id")
      .in("maintenance_request_id", ids),
  ]);

  const commentCounts = tally(commentRows.data as { request_id: string }[]);
  const imageCounts = new Map<string, number>();
  for (const row of (imageRows.data as { maintenance_request_id: string }[]) ??
    []) {
    const id = row.maintenance_request_id;
    imageCounts.set(id, (imageCounts.get(id) ?? 0) + 1);
  }

  const fallback = (id: string): Author => ({
    id,
    name: "Resident",
    avatarUrl: null,
  });

  return requests.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    priority: r.priority,
    status: r.status,
    createdAt: r.created_at,
    creator: authors.get(r.created_by) ?? fallback(r.created_by),
    assignee: r.assigned_to
      ? (authors.get(r.assigned_to) ?? fallback(r.assigned_to))
      : null,
    commentCount: commentCounts.get(r.id) ?? 0,
    imageCount: imageCounts.get(r.id) ?? 0,
  }));
}

/**
 * A single request with its photos and activity timeline. Residents may only
 * see their own requests (and non-internal updates); managers see everything.
 * Returns null if missing or not visible to the viewer.
 */
export async function getRequestDetail(
  buildingId: string,
  requestId: string,
  viewerId: string,
  isManager: boolean
): Promise<RequestDetail | null> {
  const admin = createAdminClient();

  const { data: reqData } = await admin
    .from("maintenance_requests")
    .select("*")
    .eq("building_id", buildingId)
    .eq("id", requestId)
    .maybeSingle();
  const request = reqData as MaintenanceRequestRow | null;
  if (!request) return null;
  if (!isManager && request.created_by !== viewerId) return null;

  let updatesQuery = admin
    .from("maintenance_updates")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (!isManager) updatesQuery = updatesQuery.eq("is_internal", false);

  const [{ data: updatesData }, { data: attachmentData }] = await Promise.all([
    updatesQuery,
    admin
      .from("attachments")
      .select("id, storage_path")
      .eq("maintenance_request_id", requestId)
      .order("created_at", { ascending: true }),
  ]);

  const updates = (updatesData as MaintenanceUpdateRow[] | null) ?? [];
  const attachmentRows =
    (attachmentData as { id: string; storage_path: string }[] | null) ?? [];

  const [authors, signedUrls] = await Promise.all([
    resolveAuthors(admin, [
      request.created_by,
      request.assigned_to,
      ...updates.map((u) => u.author_id),
    ]),
    signMaintenanceUrls(attachmentRows.map((a) => a.storage_path)),
  ]);

  const fallback = (id: string): Author => ({
    id,
    name: "Resident",
    avatarUrl: null,
  });

  return {
    id: request.id,
    title: request.title,
    description: request.description,
    category: request.category,
    priority: request.priority,
    status: request.status,
    createdAt: request.created_at,
    resolvedAt: request.resolved_at,
    creatorId: request.created_by,
    creator: authors.get(request.created_by) ?? fallback(request.created_by),
    assignee: request.assigned_to
      ? (authors.get(request.assigned_to) ?? fallback(request.assigned_to))
      : null,
    attachments: attachmentRows
      .map((a) => ({ id: a.id, url: signedUrls.get(a.storage_path) }))
      .filter((a): a is { id: string; url: string } => Boolean(a.url)),
    updates: updates.map((u) => ({
      id: u.id,
      body: u.body,
      statusFrom: u.status_from as RequestDetail["status"] | null,
      statusTo: u.status_to as RequestDetail["status"] | null,
      isInternal: u.is_internal,
      createdAt: u.created_at,
      author: authors.get(u.author_id) ?? fallback(u.author_id),
    })),
  };
}

/** Managers/admins in a building — candidates for assigning a request to. */
export async function listManagers(buildingId: string): Promise<Author[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select("user_id, role, status")
    .eq("building_id", buildingId)
    .eq("status", "approved")
    .in("role", ["manager", "admin"]);
  const rows = (data as Pick<Membership, "user_id">[] | null) ?? [];
  const authors = await resolveAuthors(
    admin,
    rows.map((r) => r.user_id)
  );
  return rows.map(
    (r) =>
      authors.get(r.user_id) ?? {
        id: r.user_id,
        name: "Manager",
        avatarUrl: null,
      }
  );
}

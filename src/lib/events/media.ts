import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "wcv-event-media";

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_COVER_BYTES = 8 * 1024 * 1024; // 8MB

/** True for the image mime types accepted as an event cover. */
export function isAcceptedImage(type: string): boolean {
  return type in EXT_BY_TYPE;
}

/**
 * Uploads an event cover to the private wcv-event-media bucket (service role)
 * under `building_id/event_id/cover.<ext>` and returns the storage path.
 */
export async function uploadEventCover(
  buildingId: string,
  eventId: string,
  file: File
): Promise<string> {
  const ext = EXT_BY_TYPE[file.type] ?? "png";
  const path = `${buildingId}/${eventId}/cover.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

/** Signs one cover path (short-lived URL), or null. */
export async function signEventCover(
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Signs many cover paths in one round trip, returned as path -> URL. */
export async function signEventCovers(
  paths: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(paths, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) result.set(item.path, item.signedUrl);
  }
  return result;
}

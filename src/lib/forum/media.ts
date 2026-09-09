import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "wcv-forum-media";

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_IMAGES_PER_POST = 6;

/** True for the image mime types the forum accepts. */
export function isAcceptedImage(type: string): boolean {
  return type in EXT_BY_TYPE;
}

/**
 * Uploads a forum image to the private wcv-forum-media bucket (service role)
 * under `building_id/post_id/<uuid>.<ext>` and returns the storage path to
 * record in `attachments.storage_path`.
 */
export async function uploadForumImage(
  buildingId: string,
  postId: string,
  file: File
): Promise<string> {
  const ext = EXT_BY_TYPE[file.type] ?? "png";
  const path = `${buildingId}/${postId}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/**
 * Turns stored forum-media paths into short-lived signed URLs (one round trip),
 * returning them in the same order and dropping any that fail to sign.
 */
export async function signForumUrls(
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

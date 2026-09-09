import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "wcv-avatars";

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Uploads an avatar to the private wcv-avatars bucket (service role) and returns
 * the storage path to store in profiles.avatar_url.
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const ext = EXT_BY_TYPE[file.type] ?? "png";
  const path = `${userId}/avatar.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

/**
 * Resolves a stored avatar reference to a usable URL. External URLs (e.g. a
 * Google profile picture) are returned as-is; storage paths are turned into a
 * short-lived signed URL.
 */
export async function resolveAvatarUrl(
  avatar: string | null | undefined
): Promise<string | null> {
  if (!avatar) return null;
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(avatar, 60 * 60);
  return data?.signedUrl ?? null;
}

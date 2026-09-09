"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth/context";
import { isTheme } from "@/lib/settings/theme";
import { uploadAvatar } from "@/lib/storage/avatars";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveTheme(theme: string) {
  if (!isTheme(theme)) return;
  const viewer = await getViewer();
  if (!viewer.userId) return;

  const admin = createAdminClient();
  await admin
    .from("user_settings")
    .upsert({ user_id: viewer.userId, theme }, { onConflict: "user_id" });
  revalidatePath("/", "layout");
}

export async function updateProfile(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/login");

  const preferred = String(formData.get("preferred_name") ?? "").trim() || null;
  const full = String(formData.get("full_name") ?? "").trim() || null;

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ preferred_name: preferred, full_name: full })
    .eq("id", viewer.userId);
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

export async function uploadAvatarAction(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/login");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/settings?error=Choose+an+image+file");
  }
  if (!file.type.startsWith("image/")) {
    redirect("/settings?error=File+must+be+an+image");
  }
  if (file.size > 3 * 1024 * 1024) {
    redirect("/settings?error=Image+must+be+under+3MB");
  }

  const path = await uploadAvatar(viewer.userId, file);
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", viewer.userId);
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

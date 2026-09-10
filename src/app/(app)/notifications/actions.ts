"use server";

import { revalidatePath } from "next/cache";

import { getViewer } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

function nowIso() {
  return new Date().toISOString();
}

export async function markRead(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.userId) return;
  const id = String(formData.get("id") ?? "");

  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ read_at: nowIso() })
    .eq("id", id)
    .eq("user_id", viewer.userId)
    .is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const viewer = await getViewer();
  if (!viewer.userId) return;

  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ read_at: nowIso() })
    .eq("user_id", viewer.userId)
    .is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { createAdminClient } from "@/lib/supabase/admin";

/** Approved admin of the active building, or redirect. */
async function requireAdmin() {
  const viewer = await getViewer();
  if (viewerStatus(viewer) !== "approved" || !viewer.userId) redirect("/");
  const membership = viewer.activeMembership!;
  if (membership.role !== "admin") redirect("/manage");
  return { admin: createAdminClient(), buildingId: membership.building_id };
}

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  address: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
  timezone: z.string().trim().min(1, "Timezone is required").max(60),
});

export async function updateBuilding(formData: FormData) {
  const { admin, buildingId } = await requireAdmin();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    timezone: formData.get("timezone") ?? "",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid settings";
    redirect(`/manage/building?error=${encodeURIComponent(msg)}`);
  }

  await admin.from("buildings").update(parsed.data).eq("id", buildingId);
  revalidatePath("/manage/building");
  revalidatePath("/", "layout");
}

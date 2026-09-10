"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { isManagerRole } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";

const MANAGE = "/info/manage";

/** Approved manager/admin, or redirect. Info desk is edited by managers only. */
async function requireManager() {
  const viewer = await getViewer();
  if (viewerStatus(viewer) !== "approved" || !viewer.userId) redirect("/");
  const membership = viewer.activeMembership!;
  if (!isManagerRole(membership.role)) redirect("/info");
  return {
    admin: createAdminClient(),
    viewerId: viewer.userId,
    buildingId: membership.building_id,
  };
}

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Slug is only used for the (building_id, slug) uniqueness constraint, not in
  // URLs, so a short random suffix keeps inserts collision-free.
  return `${base || "section"}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Normalizes a user-entered URL to an absolute http(s) URL, or null. */
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function nextOrder(
  admin: ReturnType<typeof createAdminClient>,
  table: "info_sections" | "info_items",
  column: "building_id" | "section_id",
  value: string
): Promise<number> {
  const { data } = await admin
    .from(table)
    .select("sort_order")
    .eq(column, value)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.sort_order as number | undefined) ?? -1) + 1;
}

const itemSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(200),
  body: z.string().max(5000),
  phone: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v || null),
});

// -------------------------------------------------------------- sections ----

export async function createSection(formData: FormData) {
  const { admin, buildingId } = await requireManager();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`${MANAGE}?error=${encodeURIComponent("Add a title")}`);

  await admin.from("info_sections").insert({
    building_id: buildingId,
    slug: slugify(title),
    title: title.slice(0, 120),
    sort_order: await nextOrder(
      admin,
      "info_sections",
      "building_id",
      buildingId
    ),
  });
  revalidatePath("/info");
  revalidatePath(MANAGE);
}

export async function renameSection(formData: FormData) {
  const { admin, buildingId } = await requireManager();
  const sectionId = String(formData.get("sectionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`${MANAGE}?error=${encodeURIComponent("Add a title")}`);

  await admin
    .from("info_sections")
    .update({ title: title.slice(0, 120) })
    .eq("id", sectionId)
    .eq("building_id", buildingId);
  revalidatePath("/info");
  revalidatePath(MANAGE);
}

export async function deleteSection(formData: FormData) {
  const { admin, buildingId } = await requireManager();
  const sectionId = String(formData.get("sectionId") ?? "");
  await admin
    .from("info_sections")
    .delete()
    .eq("id", sectionId)
    .eq("building_id", buildingId);
  revalidatePath("/info");
  revalidatePath(MANAGE);
}

// ----------------------------------------------------------------- items ----

export async function createItem(formData: FormData) {
  const { admin, viewerId, buildingId } = await requireManager();
  const sectionId = String(formData.get("sectionId") ?? "");

  // Confirm the section belongs to this building before attaching an item.
  const { data: section } = await admin
    .from("info_sections")
    .select("id")
    .eq("id", sectionId)
    .eq("building_id", buildingId)
    .maybeSingle();
  if (!section) redirect(MANAGE);

  const parsed = itemSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid item";
    redirect(`${MANAGE}?error=${encodeURIComponent(msg)}`);
  }

  await admin.from("info_items").insert({
    building_id: buildingId,
    section_id: sectionId,
    ...parsed.data,
    url: normalizeUrl(String(formData.get("url") ?? "")),
    updated_by: viewerId,
    sort_order: await nextOrder(admin, "info_items", "section_id", sectionId),
  });
  revalidatePath("/info");
  revalidatePath(MANAGE);
}

export async function updateItem(formData: FormData) {
  const { admin, viewerId, buildingId } = await requireManager();
  const itemId = String(formData.get("itemId") ?? "");

  const parsed = itemSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid item";
    redirect(`${MANAGE}?error=${encodeURIComponent(msg)}`);
  }

  await admin
    .from("info_items")
    .update({
      ...parsed.data,
      url: normalizeUrl(String(formData.get("url") ?? "")),
      updated_by: viewerId,
    })
    .eq("id", itemId)
    .eq("building_id", buildingId);
  revalidatePath("/info");
  revalidatePath(MANAGE);
}

export async function deleteItem(formData: FormData) {
  const { admin, buildingId } = await requireManager();
  const itemId = String(formData.get("itemId") ?? "");
  await admin
    .from("info_items")
    .delete()
    .eq("id", itemId)
    .eq("building_id", buildingId);
  revalidatePath("/info");
  revalidatePath(MANAGE);
}

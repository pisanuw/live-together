"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { createAdminClient } from "@/lib/supabase/admin";

const PATH = "/manage/categories";

async function requireAdmin() {
  const viewer = await getViewer();
  if (viewerStatus(viewer) !== "approved" || !viewer.userId) redirect("/");
  const membership = viewer.activeMembership!;
  if (membership.role !== "admin") redirect("/manage");
  return { admin: createAdminClient(), buildingId: membership.building_id };
}

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "category"}-${crypto.randomUUID().slice(0, 6)}`;
}

const schema = z.object({
  label: z.string().trim().min(1, "Add a label").max(60),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a color")
    .catch("#64748b"),
});

export async function createCategory(formData: FormData) {
  const { admin, buildingId } = await requireAdmin();
  const parsed = schema.safeParse({
    label: formData.get("label"),
    color: formData.get("color") ?? "#64748b",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid category";
    redirect(`${PATH}?error=${encodeURIComponent(msg)}`);
  }

  const { data: last } = await admin
    .from("categories")
    .select("sort_order")
    .eq("building_id", buildingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("categories").insert({
    building_id: buildingId,
    slug: slugify(parsed.data.label),
    label: parsed.data.label,
    color: parsed.data.color,
    sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
  });
  revalidatePath(PATH);
  revalidatePath("/forum");
}

export async function updateCategory(formData: FormData) {
  const { admin, buildingId } = await requireAdmin();
  const id = String(formData.get("categoryId") ?? "");
  const parsed = schema.safeParse({
    label: formData.get("label"),
    color: formData.get("color") ?? "#64748b",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid category";
    redirect(`${PATH}?error=${encodeURIComponent(msg)}`);
  }

  await admin
    .from("categories")
    .update({ label: parsed.data.label, color: parsed.data.color })
    .eq("id", id)
    .eq("building_id", buildingId);
  revalidatePath(PATH);
  revalidatePath("/forum");
}

export async function deleteCategory(formData: FormData) {
  const { admin, buildingId } = await requireAdmin();
  const id = String(formData.get("categoryId") ?? "");
  await admin
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("building_id", buildingId);
  revalidatePath(PATH);
  revalidatePath("/forum");
}

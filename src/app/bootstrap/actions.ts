"use server";

import { redirect } from "next/navigation";

import { DEFAULT_BUILDING_SLUG, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * One-time bootstrap: promote the current user to an approved admin of the
 * default building, gated by SUPERADMIN_SECRET. Used to create the first
 * manager who can then approve/invite everyone else.
 */
export async function claimAdmin(formData: FormData) {
  const secret = String(formData.get("secret") ?? "");
  if (!serverEnv.superadminSecret || secret !== serverEnv.superadminSecret) {
    redirect("/bootstrap?error=Invalid+secret");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: building } = await admin
    .from("buildings")
    .select("id")
    .eq("slug", DEFAULT_BUILDING_SLUG)
    .maybeSingle();
  if (!building) redirect("/bootstrap?error=No+building+seeded");

  await admin.from("memberships").upsert(
    {
      building_id: building.id,
      user_id: user!.id,
      role: "admin",
      status: "approved",
      approved_by: user!.id,
    },
    { onConflict: "building_id,user_id" }
  );

  redirect("/");
}

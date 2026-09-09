"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getManagedMembership } from "@/lib/auth/context";
import { DEFAULT_BUILDING_SLUG } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const MEMBERS_PATH = "/manage/members";

/** Loads the target membership and verifies the caller manages its building. */
async function authorizeForMembership(membershipId: string) {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("memberships")
    .select("id, building_id")
    .eq("id", membershipId)
    .maybeSingle();
  if (!target) redirect(MEMBERS_PATH);

  const manager = await getManagedMembership(target!.building_id);
  if (!manager) redirect("/");

  return { admin, target: target!, manager: manager! };
}

export async function approveMember(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "");
  const { admin, manager } = await authorizeForMembership(membershipId);
  await admin
    .from("memberships")
    .update({ status: "approved", approved_by: manager.user_id })
    .eq("id", membershipId);
  revalidatePath(MEMBERS_PATH);
}

export async function rejectMember(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "");
  const { admin } = await authorizeForMembership(membershipId);
  await admin
    .from("memberships")
    .update({ status: "rejected" })
    .eq("id", membershipId);
  revalidatePath(MEMBERS_PATH);
}

export async function createInvite(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const requestedRole = String(formData.get("role") ?? "resident");

  const admin = createAdminClient();
  const { data: building } = await admin
    .from("buildings")
    .select("id")
    .eq("slug", DEFAULT_BUILDING_SLUG)
    .maybeSingle();
  if (!building) redirect(`${MEMBERS_PATH}?error=No+building`);

  const manager = await getManagedMembership(building!.id);
  if (!manager) redirect("/");
  if (!email) redirect(`${MEMBERS_PATH}?error=Enter+an+email`);

  // Only admins may invite elevated roles; managers can only invite residents.
  let role = requestedRole;
  if ((role === "manager" || role === "admin") && manager!.role !== "admin") {
    role = "resident";
  }

  const { data: existing } = await admin
    .from("invites")
    .select("id")
    .eq("building_id", building!.id)
    .is("accepted_at", null)
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    await admin
      .from("invites")
      .update({ role, invited_by: manager!.user_id })
      .eq("id", existing.id);
  } else {
    await admin.from("invites").insert({
      building_id: building!.id,
      email,
      role,
      invited_by: manager!.user_id,
    });
  }

  revalidatePath(MEMBERS_PATH);
}

import "server-only";

import type { User } from "@supabase/supabase-js";

import { DEFAULT_BUILDING_SLUG } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ensures a freshly authenticated user has a profile and a membership.
 * Idempotent — safe to call on every login / page load.
 *
 * Stage 1 policy (single default building):
 *   - matching outstanding invite (by email) -> APPROVED membership with the
 *     invited role, and the invite is marked accepted;
 *   - otherwise -> PENDING resident membership (an access request a manager
 *     must approve). This realizes "a stranger is held at pending".
 */
export async function provisionUser(user: User): Promise<void> {
  const admin = createAdminClient();
  const email = user.email?.toLowerCase() ?? null;

  // 1. Ensure a profile row (do not clobber a user-edited profile).
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const meta = user.user_metadata ?? {};
    await admin.from("profiles").insert({
      id: user.id,
      full_name: meta.full_name ?? meta.name ?? null,
      avatar_url: meta.avatar_url ?? meta.picture ?? null,
    });
  }

  // 2. Ensure a membership in the default building.
  const { data: building } = await admin
    .from("buildings")
    .select("id")
    .eq("slug", DEFAULT_BUILDING_SLUG)
    .maybeSingle();
  if (!building) return;

  const { data: membership } = await admin
    .from("memberships")
    .select("id")
    .eq("building_id", building.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership) return;

  let role = "resident";
  let status = "pending";
  let invitedBy: string | null = null;

  if (email) {
    const { data: invite } = await admin
      .from("invites")
      .select("id, role, invited_by")
      .eq("building_id", building.id)
      .is("accepted_at", null)
      .ilike("email", email)
      .maybeSingle();

    if (invite) {
      role = invite.role;
      status = "approved";
      invitedBy = invite.invited_by;
      await admin
        .from("invites")
        .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
        .eq("id", invite.id);
    }
  }

  await admin.from("memberships").insert({
    building_id: building.id,
    user_id: user.id,
    role,
    status,
    invited_by: invitedBy,
    approved_by: status === "approved" ? invitedBy : null,
  });
}

import "server-only";

import type { User } from "@supabase/supabase-js";

import { provisionUser } from "@/lib/auth/provision";
import type { Membership, MembershipRole, Profile } from "@/lib/auth/types";
import { isManagerRole } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  user: User | null;
  userId: string | null;
  profile: Profile | null;
  memberships: Membership[];
  activeMembership: Membership | null;
}

const EMPTY: Viewer = {
  user: null,
  userId: null,
  profile: null,
  memberships: [],
  activeMembership: null,
};

/**
 * Resolves the current viewer: authenticated user (verified via Supabase),
 * their profile, and building memberships. Auto-provisions on first sight so
 * a logged-in user always has at least a pending membership.
 */
export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const admin = createAdminClient();

  const loadMemberships = async () =>
    (
      await admin
        .from("memberships")
        .select("*, building:buildings(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
    ).data as Membership[] | null;

  let memberships = (await loadMemberships()) ?? [];
  if (memberships.length === 0) {
    // Fallback provisioning for sessions predating provisioning at login.
    await provisionUser(user);
    memberships = (await loadMemberships()) ?? [];
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const activeMembership =
    memberships.find((m) => m.status === "approved") ?? memberships[0] ?? null;

  return {
    user,
    userId: user.id,
    profile: (profile as Profile) ?? null,
    memberships,
    activeMembership,
  };
}

/**
 * Returns the viewer's approved membership for `buildingId` if they manage it
 * (manager/admin), else null. Use for authorizing manager-only server actions.
 */
export async function getManagedMembership(
  buildingId: string
): Promise<Membership | null> {
  const viewer = await getViewer();
  const m = viewer.memberships.find(
    (x) => x.building_id === buildingId && x.status === "approved"
  );
  return m && isManagerRole(m.role as MembershipRole) ? m : null;
}

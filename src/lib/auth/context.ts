import "server-only";

import { cache } from "react";

import type { User } from "@supabase/supabase-js";

import { provisionUser } from "@/lib/auth/provision";
import type { Membership, MembershipRole, Profile } from "@/lib/auth/types";
import { isManagerRole } from "@/lib/auth/types";
import type { Accent } from "@/lib/settings/accent";
import { isAccent } from "@/lib/settings/accent";
import type { NotifPrefs } from "@/lib/settings/notifications";
import { normalizeNotifPrefs } from "@/lib/settings/notifications";
import type { Theme } from "@/lib/settings/theme";
import { isTheme } from "@/lib/settings/theme";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  user: User | null;
  userId: string | null;
  profile: Profile | null;
  memberships: Membership[];
  activeMembership: Membership | null;
  theme: Theme;
  accent: Accent;
  notifPrefs: NotifPrefs;
}

const EMPTY: Viewer = {
  user: null,
  userId: null,
  profile: null,
  memberships: [],
  activeMembership: null,
  theme: "system",
  accent: "default",
  notifPrefs: {},
};

/**
 * Resolves the current viewer: authenticated user (verified via Supabase),
 * their profile, memberships, and settings. Auto-provisions on first sight so
 * a logged-in user always has at least a pending membership.
 *
 * Wrapped in React `cache` so layout + page in the same request share one call.
 */
export const getViewer = cache(async function getViewer(): Promise<Viewer> {
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

  const [{ data: profile }, { data: settings }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin
      .from("user_settings")
      .select("theme, accent, notif_prefs")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const activeMembership =
    memberships.find((m) => m.status === "approved") ?? memberships[0] ?? null;

  const themeValue = settings?.theme;
  const accentValue = settings?.accent;
  return {
    user,
    userId: user.id,
    profile: (profile as Profile) ?? null,
    memberships,
    activeMembership,
    theme: themeValue && isTheme(themeValue) ? themeValue : "system",
    accent: accentValue && isAccent(accentValue) ? accentValue : "default",
    notifPrefs: normalizeNotifPrefs(settings?.notif_prefs),
  };
});

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

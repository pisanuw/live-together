export type MembershipRole = "resident" | "manager" | "admin";
export type MembershipStatus =
  "pending" | "approved" | "rejected" | "suspended";

export interface Building {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  timezone: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
}

export interface Membership {
  id: string;
  building_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
  building?: Building | null;
}

export function isManagerRole(
  role: MembershipRole | undefined | null
): boolean {
  return role === "manager" || role === "admin";
}

export function displayName(
  profile: Pick<Profile, "preferred_name" | "full_name"> | null,
  fallback: string
): string {
  return profile?.preferred_name || profile?.full_name || fallback;
}

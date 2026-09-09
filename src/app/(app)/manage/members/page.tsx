import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import type { Membership, Profile } from "@/lib/auth/types";
import { displayName, isManagerRole } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";

import { approveMember, createInvite, rejectMember } from "./actions";

export default async function MembersPage() {
  const viewer = await getViewer();
  if (viewerStatus(viewer) !== "approved") redirect("/");
  const active = viewer.activeMembership!;
  if (!isManagerRole(active.role)) redirect("/");

  const admin = createAdminClient();
  const { data: membersData } = await admin
    .from("memberships")
    .select("*")
    .eq("building_id", active.building_id)
    .order("created_at", { ascending: true });
  const members = (membersData as Membership[] | null) ?? [];

  const userIds = members.map((m) => m.user_id);
  const { data: profilesData } = userIds.length
    ? await admin.from("profiles").select("*").in("id", userIds)
    : { data: [] };
  const profiles = new Map(
    ((profilesData as Profile[] | null) ?? []).map((p) => [p.id, p])
  );

  const { data: invitesData } = await admin
    .from("invites")
    .select("*")
    .eq("building_id", active.building_id)
    .is("accepted_at", null)
    .order("created_at", { ascending: true });
  const invites =
    (invitesData as { id: string; email: string; role: string }[] | null) ?? [];

  const pending = members.filter((m) => m.status === "pending");
  const approved = members.filter((m) => m.status === "approved");
  const isAdmin = active.role === "admin";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back</Link>
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Awaiting approval ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending requests.</p>
        ) : (
          <ul className="divide-border divide-y rounded-lg border">
            {pending.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <span className="text-sm">
                  {displayName(profiles.get(m.user_id) ?? null, "New resident")}
                </span>
                <div className="flex gap-2">
                  <form action={approveMember}>
                    <input type="hidden" name="membershipId" value={m.id} />
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectMember}>
                    <input type="hidden" name="membershipId" value={m.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Reject
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Approved ({approved.length})</h2>
        <ul className="divide-border divide-y rounded-lg border">
          {approved.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <span className="text-sm">
                {displayName(profiles.get(m.user_id) ?? null, "Resident")}
              </span>
              <span className="text-muted-foreground text-xs capitalize">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Invite a resident</h2>
        <p className="text-muted-foreground text-xs">
          Invited people are auto-approved when they first sign in with this
          email. (Email delivery arrives in a later stage.)
        </p>
        <form
          action={createInvite}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="resident@example.com"
            className="border-input bg-background focus-visible:ring-ring h-9 min-w-56 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          />
          <select
            name="role"
            defaultValue="resident"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          >
            <option value="resident">Resident</option>
            {isAdmin ? <option value="manager">Manager</option> : null}
            {isAdmin ? <option value="admin">Admin</option> : null}
          </select>
          <Button type="submit" size="sm">
            Invite
          </Button>
        </form>

        {invites.length > 0 ? (
          <ul className="divide-border divide-y rounded-lg border">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <span>{inv.email}</span>
                <span className="text-muted-foreground text-xs capitalize">
                  {inv.role}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}

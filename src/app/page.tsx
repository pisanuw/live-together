import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { displayName, isManagerRole } from "@/lib/auth/types";

const SECTIONS = [
  { label: "Forum", stage: "Stage 3" },
  { label: "Info Desk", stage: "Stage 6" },
  { label: "Events", stage: "Stage 4" },
  { label: "My Events", stage: "Stage 4" },
  { label: "Maintenance", stage: "Stage 5" },
  { label: "Settings", stage: "Stage 7" },
];

export default async function Home() {
  const viewer = await getViewer();
  const status = viewerStatus(viewer);
  if (status === "unauthenticated") redirect("/login");
  if (status !== "approved") redirect("/pending");

  const active = viewer.activeMembership!;
  const building = active.building;
  const canManage = isManagerRole(active.role);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            {building?.name ?? "West Complex Village"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {displayName(viewer.profile, "resident")}
          </h1>
          <p className="text-muted-foreground text-sm capitalize">
            Role: {active.role}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/manage/members">Manage members</Link>
            </Button>
          ) : null}
          <SignOutButton />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <div
            key={s.label}
            className="bg-card text-card-foreground flex flex-col gap-1 rounded-lg border p-4 opacity-70"
          >
            <span className="font-medium">{s.label}</span>
            <span className="text-muted-foreground text-xs">
              Coming in {s.stage}
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}

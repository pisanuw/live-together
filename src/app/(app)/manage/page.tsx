import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { isManagerRole } from "@/lib/auth/types";

function Card({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted/40 focus-visible:ring-ring flex items-start gap-3 rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </Link>
  );
}

export default async function ManageHubPage() {
  const viewer = await getViewer();
  if (viewerStatus(viewer) !== "approved") redirect("/");
  const active = viewer.activeMembership!;
  if (!isManagerRole(active.role)) redirect("/");
  const isAdmin = active.role === "admin";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage</h1>
        <p className="text-muted-foreground text-sm">
          Run {active.building?.name ?? "your building"} without touching the
          database.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          href="/manage/members"
          icon={Users}
          title="Members"
          description="Approve, invite, suspend, and set roles."
        />
        <Card
          href="/manage/moderation"
          icon={ShieldCheck}
          title="Moderation"
          description="Pin or remove forum posts."
        />
        {isAdmin ? (
          <Card
            href="/manage/categories"
            icon={Tags}
            title="Forum categories"
            description="Add, rename, recolor, or remove categories."
          />
        ) : null}
        {isAdmin ? (
          <Card
            href="/manage/building"
            icon={Building2}
            title="Building settings"
            description="Name, address, and timezone."
          />
        ) : null}
      </div>
    </div>
  );
}

import Link from "next/link";

import { getViewer } from "@/lib/auth/context";
import { displayName } from "@/lib/auth/types";

const SECTIONS = [
  { href: "/forum", label: "Forum", blurb: "Talk with your neighbors" },
  { href: "/info", label: "Info Desk", blurb: "Management & contacts" },
  { href: "/events", label: "Events", blurb: "What's happening" },
  { href: "/my-events", label: "My Events", blurb: "Your sign-ups" },
  { href: "/maintenance", label: "Maintenance", blurb: "Report an issue" },
  { href: "/settings", label: "Settings", blurb: "Profile & appearance" },
];

export default async function Home() {
  const viewer = await getViewer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {displayName(viewer.profile, "resident")}
        </h1>
        <p className="text-muted-foreground text-sm capitalize">
          {viewer.activeMembership?.role ?? "resident"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-card text-card-foreground hover:bg-muted/50 flex flex-col gap-1 rounded-lg border p-4 transition-colors"
          >
            <span className="font-medium">{s.label}</span>
            <span className="text-muted-foreground text-xs">{s.blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

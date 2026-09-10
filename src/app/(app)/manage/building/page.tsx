import Link from "next/link";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

import { updateBuilding } from "./actions";

const inputClass =
  "border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2";

export default async function BuildingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  const active = viewer.activeMembership!;
  if (active.role !== "admin") redirect("/manage");

  const admin = createAdminClient();
  const { data: building } = await admin
    .from("buildings")
    .select("name, address, timezone")
    .eq("id", active.building_id)
    .maybeSingle();

  return (
    <div className="max-w-lg space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Building settings</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/manage">Back</Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <form action={updateBuilding} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            defaultValue={building?.name ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="address" className="text-sm font-medium">
            Address
          </label>
          <input
            id="address"
            name="address"
            maxLength={300}
            defaultValue={building?.address ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </label>
          <input
            id="timezone"
            name="timezone"
            required
            maxLength={60}
            defaultValue={building?.timezone ?? "America/Los_Angeles"}
            placeholder="America/Los_Angeles"
            className={inputClass}
          />
        </div>
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </form>
    </div>
  );
}

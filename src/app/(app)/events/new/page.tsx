import Link from "next/link";
import { redirect } from "next/navigation";

import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";

import { createEvent } from "../actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  if (!isManagerRole(viewer.activeMembership!.role)) redirect("/events");

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">New event</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/events">Cancel</Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <EventForm action={createEvent} submitLabel="Create event" />
    </div>
  );
}

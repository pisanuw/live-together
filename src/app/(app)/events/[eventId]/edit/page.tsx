import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { getEventDetail } from "@/lib/events/queries";

import { updateEvent } from "../../actions";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const { error } = await searchParams;
  const viewer = await getViewer();
  const membership = viewer.activeMembership!;
  if (!isManagerRole(membership.role)) redirect("/events");

  const event = await getEventDetail(
    membership.building_id,
    eventId,
    viewer.userId,
    true
  );
  if (!event) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit event</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/events/${eventId}`}>Cancel</Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <EventForm
        action={updateEvent}
        event={event!}
        timezone={event!.timezone}
        submitLabel="Save changes"
      />
    </div>
  );
}

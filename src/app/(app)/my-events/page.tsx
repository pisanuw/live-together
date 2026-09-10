import Link from "next/link";

import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { listMyEvents } from "@/lib/events/queries";
import type { EventListItem } from "@/lib/events/types";
import { nowMs } from "@/lib/time";

function EventList({ events }: { events: EventListItem[] }) {
  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}

export default async function MyEventsPage() {
  const viewer = await getViewer();
  const { upcoming, past } = await listMyEvents(
    viewer.activeMembership!.building_id,
    viewer.userId!,
    nowMs()
  );

  const empty = upcoming.length === 0 && past.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Events</h1>
        <p className="text-muted-foreground text-sm">
          Events you&apos;ve signed up for.
        </p>
      </div>

      {empty ? (
        <div className="bg-muted/40 text-muted-foreground space-y-3 rounded-lg border border-dashed p-10 text-center text-sm">
          <p>You haven&apos;t signed up for any events yet.</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/events">Browse events</Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length ? (
              <EventList events={upcoming} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Nothing coming up.
              </p>
            )}
          </section>

          {past.length ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Past ({past.length})</h2>
              <EventList events={past} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

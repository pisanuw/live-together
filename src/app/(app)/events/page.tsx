import Link from "next/link";
import { Plus } from "lucide-react";

import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { isPastEvent } from "@/lib/events/helpers";
import { listEvents } from "@/lib/events/queries";
import { nowMs } from "@/lib/time";

export default async function EventsPage() {
  const viewer = await getViewer();
  const membership = viewer.activeMembership!;
  const isManager = isManagerRole(membership.role);

  const now = nowMs();
  const all = await listEvents(membership.building_id, viewer.userId, {
    includeDrafts: isManager,
  });
  const upcoming = all.filter((e) => !isPastEvent(e, now));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-sm">
            Discover what&apos;s happening and sign up to attend.
          </p>
        </div>
        {isManager ? (
          <Button asChild size="sm">
            <Link href="/events/new">
              <Plus data-icon="inline-start" />
              New event
            </Link>
          </Button>
        ) : null}
      </header>

      {upcoming.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          No upcoming events{isManager ? " — create one to get started." : "."}
        </div>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

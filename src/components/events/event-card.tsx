import Link from "next/link";
import { CalendarClock, MapPin, Users } from "lucide-react";

import { formatEventWhen } from "@/lib/events/format";
import { capacityLabel, signupStatusLabel } from "@/lib/events/helpers";
import type { EventListItem } from "@/lib/events/types";

/** A card in the events list / My Events. Links to the event detail page. */
export function EventCard({ event }: { event: EventListItem }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="hover:bg-muted/40 focus-visible:ring-ring flex gap-4 rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {event.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverUrl}
          alt=""
          className="hidden size-20 shrink-0 rounded-md border object-cover sm:block"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold">{event.title}</h3>
          <div className="flex shrink-0 gap-1.5">
            {event.cancelledAt ? (
              <span className="text-destructive rounded-full border border-red-500/40 px-2 py-0.5 text-xs font-medium">
                Cancelled
              </span>
            ) : null}
            {!event.isPublished ? (
              <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
                Draft
              </span>
            ) : null}
            {event.viewerStatus && event.viewerStatus !== "cancelled" ? (
              <span className="border-foreground/30 bg-muted rounded-full border px-2 py-0.5 text-xs font-medium">
                {signupStatusLabel(event.viewerStatus)}
              </span>
            ) : null}
          </div>
        </div>

        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
          <CalendarClock className="size-3.5 shrink-0" />
          {formatEventWhen(event.startsAt, event.endsAt)}
        </p>
        {event.location ? (
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
            <MapPin className="size-3.5 shrink-0" />
            {event.location}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
          <Users className="size-3.5 shrink-0" />
          {capacityLabel(event.capacity, event.registeredSeats)}
          {event.waitlistCount > 0
            ? ` · ${event.waitlistCount} waitlisted`
            : ""}
        </p>
      </div>
    </Link>
  );
}

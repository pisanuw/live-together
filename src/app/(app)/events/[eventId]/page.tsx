import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, Users } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { SignupControls } from "@/components/events/signup-controls";
import { ConfirmSubmitButton } from "@/components/forum/confirm-submit-button";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/context";
import { isManagerRole } from "@/lib/auth/types";
import { formatEventWhen } from "@/lib/events/format";
import {
  canSignUp,
  capacityLabel,
  isFull,
  isPastEvent,
  signupStatusLabel,
} from "@/lib/events/helpers";
import { getEventDetail } from "@/lib/events/queries";
import { nowMs } from "@/lib/time";

import { cancelEvent, setPublished } from "../actions";

export default async function EventDetailPage({
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
  const isManager = isManagerRole(membership.role);

  const event = await getEventDetail(
    membership.building_id,
    eventId,
    viewer.userId,
    isManager
  );
  if (!event) notFound();

  const now = nowMs();
  const canSignUpNow = canSignUp(event!, now);
  const full = isFull(event!.capacity, event!.registeredSeats);
  const closedReason = event!.cancelledAt
    ? "This event has been cancelled."
    : !event!.isPublished
      ? "This event isn't published yet."
      : isPastEvent(event!, now)
        ? "This event has already happened."
        : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/events">
          <ArrowLeft data-icon="inline-start" />
          Back to events
        </Link>
      </Button>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {event!.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event!.coverUrl}
          alt=""
          className="max-h-64 w-full rounded-lg border object-cover"
        />
      ) : null}

      <article className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {event!.title}
            </h1>
            {event!.cancelledAt ? (
              <span className="text-destructive rounded-full border border-red-500/40 px-2 py-0.5 text-xs font-medium">
                Cancelled
              </span>
            ) : null}
            {!event!.isPublished ? (
              <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
                Draft
              </span>
            ) : null}
          </div>

          <div className="text-muted-foreground space-y-1 text-sm">
            <p className="flex items-center gap-1.5">
              <CalendarClock className="size-4 shrink-0" />
              {formatEventWhen(event!.startsAt, event!.endsAt, event!.timezone)}
            </p>
            {event!.location ? (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0" />
                {event!.location}
              </p>
            ) : null}
            <p className="flex items-center gap-1.5">
              <Users className="size-4 shrink-0" />
              {capacityLabel(event!.capacity, event!.registeredSeats)}
              {event!.waitlistCount > 0
                ? ` · ${event!.waitlistCount} waitlisted`
                : ""}
            </p>
          </div>
        </div>

        {event!.description ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {event!.description}
          </p>
        ) : null}

        <SignupControls
          event={event!}
          canSignUpNow={canSignUpNow}
          full={full}
          closedReason={closedReason}
        />

        {isManager ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/events/${event!.id}/edit`}>Edit</Link>
            </Button>
            <form action={setPublished}>
              <input type="hidden" name="eventId" value={event!.id} />
              <input
                type="hidden"
                name="publish"
                value={String(!event!.isPublished)}
              />
              <SubmitButton variant="outline" size="sm">
                {event!.isPublished ? "Unpublish" : "Publish"}
              </SubmitButton>
            </form>
            {!event!.cancelledAt ? (
              <ConfirmSubmitButton
                action={cancelEvent}
                fields={{ eventId: event!.id }}
                confirm="Cancel this event? Attendees keep their spot in the list but it will show as cancelled."
                variant="destructive"
                size="sm"
                pendingText="Cancelling…"
              >
                Cancel event
              </ConfirmSubmitButton>
            ) : null}
          </div>
        ) : null}
      </article>

      {isManager && event!.attendees.length ? (
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-sm font-semibold">
            Attendees ({event!.attendees.length})
          </h2>
          <ul className="divide-border divide-y rounded-lg border">
            {event!.attendees.map((a) => (
              <li
                key={a.user.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Avatar url={a.user.avatarUrl} name={a.user.name} size={22} />
                  {a.user.name}
                  {a.guestsCount > 0 ? (
                    <span className="text-muted-foreground text-xs">
                      +{a.guestsCount}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-xs capitalize">
                  {signupStatusLabel(a.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

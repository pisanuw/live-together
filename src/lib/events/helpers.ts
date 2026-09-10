// Pure events logic — no I/O, so it is unit-testable (see __tests__/events.test.ts).

import type { SignupStatus } from "@/lib/events/types";

/** Minimal timing shape shared by list items, details, and raw rows. */
interface EventTiming {
  startsAt: string;
  endsAt: string | null;
}

interface EventState extends EventTiming {
  isPublished: boolean;
  cancelledAt: string | null;
}

/** Seats consumed by a registration = the member plus their guests. */
export function seatsFor(guestsCount: number): number {
  return 1 + Math.max(0, guestsCount);
}

/** Total registered seats across a set of sign-ups (ignores waitlist/cancelled). */
export function registeredSeats(
  signups: { status: SignupStatus; guestsCount: number }[]
): number {
  return signups
    .filter((s) => s.status === "registered")
    .reduce((sum, s) => sum + seatsFor(s.guestsCount), 0);
}

/** Remaining spots, or null when capacity is unlimited. Never negative. */
export function spotsRemaining(
  capacity: number | null,
  usedSeats: number
): number | null {
  if (capacity == null) return null;
  return Math.max(0, capacity - usedSeats);
}

/** True when a capacity-limited event has no seats left. */
export function isFull(capacity: number | null, usedSeats: number): boolean {
  return capacity != null && usedSeats >= capacity;
}

/** The event's effective end instant (falls back to its start), in ms. */
function endInstant(event: EventTiming): number {
  return Date.parse(event.endsAt ?? event.startsAt);
}

/** True once the event has finished (its end, or start if open-ended, passed). */
export function isPastEvent(event: EventTiming, now: number): boolean {
  return endInstant(event) < now;
}

/** A member may sign up only for a published, non-cancelled, future event. */
export function canSignUp(event: EventState, now: number): boolean {
  return (
    event.isPublished && event.cancelledAt == null && !isPastEvent(event, now)
  );
}

const STATUS_LABELS: Record<SignupStatus, string> = {
  registered: "Going",
  waitlisted: "Waitlisted",
  cancelled: "Not going",
};

export function signupStatusLabel(status: SignupStatus): string {
  return STATUS_LABELS[status];
}

/** Short capacity summary, e.g. "3 / 10 spots" or "Unlimited". */
export function capacityLabel(
  capacity: number | null,
  usedSeats: number
): string {
  if (capacity == null) return "Unlimited";
  return `${usedSeats} / ${capacity} spots`;
}

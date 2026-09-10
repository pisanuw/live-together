// Event times are treated as a UTC "wall clock": what a manager types into the
// datetime-local input is stored and displayed verbatim, independent of the
// server's timezone. Building-timezone-aware display is deferred polish.

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

/** e.g. "Sat, Sep 16, 2026 · 6:00 PM – 8:00 PM" (end optional). */
export function formatEventWhen(
  startsAt: string,
  endsAt: string | null
): string {
  const start = new Date(startsAt);
  const startDate = dateFmt.format(start);
  const startTime = timeFmt.format(start);
  if (!endsAt) return `${startDate} · ${startTime}`;

  const end = new Date(endsAt);
  const sameDay = startsAt.slice(0, 10) === endsAt.slice(0, 10);
  if (sameDay) {
    return `${startDate} · ${startTime} – ${timeFmt.format(end)}`;
  }
  return `${startDate} ${startTime} – ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

/** Stored ISO -> the "YYYY-MM-DDTHH:mm" a datetime-local input expects. */
export function toDatetimeLocalValue(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

/** datetime-local value -> ISO instant (interpreted as UTC), or null. */
export function parseDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

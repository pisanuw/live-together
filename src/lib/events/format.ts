// Event times are stored as real UTC instants and shown in the building's IANA
// timezone. The datetime-local form input is a naive wall-clock the manager
// means in that timezone, so we convert both ways using Intl (DST-aware, no
// external library). Pure — the conversions are unit-tested.

const DEFAULT_TZ = "America/Los_Angeles";

/** How far ahead of UTC the timezone is, in ms, at the given instant. */
function offsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const f: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") f[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(
    f.year,
    f.month - 1,
    f.day,
    f.hour,
    f.minute,
    f.second
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Naive "YYYY-MM-DDTHH:mm" (meant in `timeZone`) → UTC ISO instant, or null. */
export function parseDatetimeLocal(
  value: string,
  timeZone: string = DEFAULT_TZ
): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const naiveAsUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0);
  // Subtract the zone offset; refine once so DST transition days resolve.
  let ts = naiveAsUtc - offsetMs(timeZone, new Date(naiveAsUtc));
  ts = naiveAsUtc - offsetMs(timeZone, new Date(ts));
  return new Date(ts).toISOString();
}

/** UTC ISO → "YYYY-MM-DDTHH:mm" wall-clock in `timeZone` (datetime-local value). */
export function toDatetimeLocalValue(
  iso: string | null,
  timeZone: string = DEFAULT_TZ
): string {
  if (!iso) return "";
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const f: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(iso))) {
    if (part.type !== "literal") f[part.type] = part.value;
  }
  return `${f.year}-${f.month}-${f.day}T${f.hour}:${f.minute}`;
}

function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** e.g. "Sat, Sep 16, 2026 · 6:00 PM – 8:00 PM PDT" in the building timezone. */
export function formatEventWhen(
  startsAt: string,
  endsAt: string | null,
  timeZone: string = DEFAULT_TZ
): string {
  const start = new Date(startsAt);
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  const timeZoneFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    timeZoneName: "short",
  });
  const zoneLabel =
    timeZoneFmt.formatToParts(start).find((p) => p.type === "timeZoneName")
      ?.value ?? "";

  const startDate = dateFmt.format(start);
  const startTime = timeFmt.format(start);
  if (!endsAt) return `${startDate} · ${startTime} ${zoneLabel}`.trim();

  const end = new Date(endsAt);
  const sameDay = dayKey(start, timeZone) === dayKey(end, timeZone);
  if (sameDay) {
    return `${startDate} · ${startTime} – ${timeFmt.format(end)} ${zoneLabel}`.trim();
  }
  return `${startDate} ${startTime} – ${dateFmt.format(end)} ${timeFmt.format(end)} ${zoneLabel}`.trim();
}

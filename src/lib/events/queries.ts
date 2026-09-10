import "server-only";

import type { Profile } from "@/lib/auth/types";
import { displayName } from "@/lib/auth/types";
import { registeredSeats, spotsRemaining } from "@/lib/events/helpers";
import { signEventCover, signEventCovers } from "@/lib/events/media";
import type {
  Attendee,
  EventDetail,
  EventListItem,
  EventRow,
  EventSignupRow,
  SignupStatus,
} from "@/lib/events/types";
import type { Author } from "@/lib/forum/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAvatarUrl } from "@/lib/storage/avatars";

type Admin = ReturnType<typeof createAdminClient>;
type CountableSignup = { status: SignupStatus; guestsCount: number };

/** Registered seats + waitlist headcount for a set of sign-up rows. */
function tallySignups(signups: CountableSignup[]) {
  return {
    registered: registeredSeats(signups),
    waitlist: signups.filter((s) => s.status === "waitlisted").length,
  };
}

function toCountable(rows: EventSignupRow[] | null): CountableSignup[] {
  return (rows ?? []).map((s) => ({
    status: s.status,
    guestsCount: s.guests_count,
  }));
}

/** Resolves distinct author profiles to display-ready Authors (signed avatars). */
async function resolveAuthors(
  admin: Admin,
  userIds: string[]
): Promise<Map<string, Author>> {
  const ids = [...new Set(userIds)];
  const map = new Map<string, Author>();
  if (ids.length === 0) return map;

  const { data } = await admin.from("profiles").select("*").in("id", ids);
  const profiles = new Map(
    ((data as Profile[] | null) ?? []).map((p) => [p.id, p])
  );
  await Promise.all(
    ids.map(async (id) => {
      const profile = profiles.get(id) ?? null;
      map.set(id, {
        id,
        name: displayName(profile, "Resident"),
        avatarUrl: await resolveAvatarUrl(profile?.avatar_url),
      });
    })
  );
  return map;
}

/**
 * Events for a building. Residents see published events; managers also see
 * drafts (`includeDrafts`). Ordered soonest-first, each with seat/waitlist
 * counts and the viewer's own sign-up status.
 */
export async function listEvents(
  buildingId: string,
  viewerId: string | null,
  options: { includeDrafts?: boolean } = {}
): Promise<EventListItem[]> {
  const admin = createAdminClient();

  let query = admin
    .from("events")
    .select("*")
    .eq("building_id", buildingId)
    .order("starts_at", { ascending: true });
  if (!options.includeDrafts) query = query.eq("is_published", true);

  const { data: eventsData } = await query;
  const events = (eventsData as EventRow[] | null) ?? [];
  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.id);
  const { data: signupsData } = await admin
    .from("event_signups")
    .select("event_id, user_id, status, guests_count")
    .in("event_id", eventIds)
    .neq("status", "cancelled");
  const signups =
    (signupsData as (EventSignupRow & { event_id: string })[] | null) ?? [];

  const byEvent = new Map<string, CountableSignup[]>();
  const viewerByEvent = new Map<string, SignupStatus>();
  for (const s of signups) {
    const list = byEvent.get(s.event_id) ?? [];
    list.push({ status: s.status, guestsCount: s.guests_count });
    byEvent.set(s.event_id, list);
    if (viewerId && s.user_id === viewerId) {
      viewerByEvent.set(s.event_id, s.status);
    }
  }

  const covers = await signEventCovers(
    events.map((e) => e.cover_path).filter((p): p is string => Boolean(p))
  );

  return events.map((e) => {
    const { registered, waitlist } = tallySignups(byEvent.get(e.id) ?? []);
    return {
      id: e.id,
      title: e.title,
      location: e.location,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      capacity: e.capacity,
      isPublished: e.is_published,
      cancelledAt: e.cancelled_at,
      coverUrl: e.cover_path ? (covers.get(e.cover_path) ?? null) : null,
      registeredSeats: registered,
      waitlistCount: waitlist,
      spotsRemaining: spotsRemaining(e.capacity, registered),
      viewerStatus: viewerByEvent.get(e.id) ?? null,
    };
  });
}

/**
 * A single event with seat/waitlist counts, the viewer's sign-up, and (for
 * managers) the attendee list. Returns null if the event is missing, in another
 * building, or a draft the viewer may not see.
 */
export async function getEventDetail(
  buildingId: string,
  eventId: string,
  viewerId: string | null,
  isManager: boolean
): Promise<EventDetail | null> {
  const admin = createAdminClient();

  const { data: eventData } = await admin
    .from("events")
    .select("*")
    .eq("building_id", buildingId)
    .eq("id", eventId)
    .maybeSingle();
  const event = eventData as EventRow | null;
  if (!event) return null;
  if (!event.is_published && !isManager) return null;

  const { data: signupsData } = await admin
    .from("event_signups")
    .select("user_id, status, guests_count, created_at")
    .eq("event_id", eventId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });
  const signups =
    (signupsData as (EventSignupRow & { created_at: string })[] | null) ?? [];

  const { registered, waitlist } = tallySignups(toCountable(signups));

  const viewerRow = viewerId
    ? signups.find((s) => s.user_id === viewerId)
    : undefined;

  // Managers see who's coming; residents just see counts.
  let attendees: Attendee[] = [];
  if (isManager && signups.length) {
    const authors = await resolveAuthors(
      admin,
      signups.map((s) => s.user_id)
    );
    attendees = signups.map((s) => ({
      user: authors.get(s.user_id) ?? {
        id: s.user_id,
        name: "Resident",
        avatarUrl: null,
      },
      status: s.status,
      guestsCount: s.guests_count,
    }));
  }

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    capacity: event.capacity,
    coverUrl: await signEventCover(event.cover_path),
    isPublished: event.is_published,
    cancelledAt: event.cancelled_at,
    createdBy: event.created_by,
    registeredSeats: registered,
    waitlistCount: waitlist,
    spotsRemaining: spotsRemaining(event.capacity, registered),
    viewerSignup: viewerRow
      ? { status: viewerRow.status, guestsCount: viewerRow.guests_count }
      : null,
    attendees,
  };
}

/** The viewer's active sign-ups, split into upcoming and past by event time. */
export async function listMyEvents(
  buildingId: string,
  viewerId: string,
  now: number
): Promise<{ upcoming: EventListItem[]; past: EventListItem[] }> {
  const admin = createAdminClient();

  const { data: mine } = await admin
    .from("event_signups")
    .select("event_id, status, guests_count")
    .eq("building_id", buildingId)
    .eq("user_id", viewerId)
    .neq("status", "cancelled");
  const rows = (mine as (EventSignupRow & { event_id: string })[] | null) ?? [];
  if (rows.length === 0) return { upcoming: [], past: [] };

  const statusByEvent = new Map(rows.map((r) => [r.event_id, r.status]));
  const eventIds = [...statusByEvent.keys()];

  const { data: eventsData } = await admin
    .from("events")
    .select("*")
    .in("id", eventIds)
    .order("starts_at", { ascending: true });
  const events = (eventsData as EventRow[] | null) ?? [];

  // Seat/waitlist counts across all attendees of these events.
  const { data: allSignups } = await admin
    .from("event_signups")
    .select("event_id, status, guests_count")
    .in("event_id", eventIds)
    .neq("status", "cancelled");
  const byEvent = new Map<string, CountableSignup[]>();
  for (const s of (allSignups as (EventSignupRow & { event_id: string })[]) ??
    []) {
    const list = byEvent.get(s.event_id) ?? [];
    list.push({ status: s.status, guestsCount: s.guests_count });
    byEvent.set(s.event_id, list);
  }

  const covers = await signEventCovers(
    events.map((e) => e.cover_path).filter((p): p is string => Boolean(p))
  );

  const upcoming: EventListItem[] = [];
  const past: EventListItem[] = [];
  for (const e of events) {
    const { registered, waitlist } = tallySignups(byEvent.get(e.id) ?? []);
    const item: EventListItem = {
      id: e.id,
      title: e.title,
      location: e.location,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      capacity: e.capacity,
      isPublished: e.is_published,
      cancelledAt: e.cancelled_at,
      coverUrl: e.cover_path ? (covers.get(e.cover_path) ?? null) : null,
      registeredSeats: registered,
      waitlistCount: waitlist,
      spotsRemaining: spotsRemaining(e.capacity, registered),
      viewerStatus: statusByEvent.get(e.id) ?? null,
    };
    const ended = Date.parse(e.ends_at ?? e.starts_at) < now;
    (ended ? past : upcoming).push(item);
  }
  // Past events read best most-recent-first.
  past.reverse();
  return { upcoming, past };
}

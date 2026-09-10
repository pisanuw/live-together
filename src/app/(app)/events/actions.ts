"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { isManagerRole } from "@/lib/auth/types";
import { parseDatetimeLocal } from "@/lib/events/format";
import {
  isAcceptedImage,
  MAX_COVER_BYTES,
  uploadEventCover,
} from "@/lib/events/media";
import { notifyMany } from "@/lib/notifications/notify";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireActor() {
  const viewer = await getViewer();
  if (viewerStatus(viewer) !== "approved" || !viewer.userId) redirect("/");
  const membership = viewer.activeMembership!;
  return {
    admin: createAdminClient(),
    viewerId: viewer.userId,
    buildingId: membership.building_id,
    isManager: isManagerRole(membership.role),
  };
}

const eventSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(200),
  description: z.string().max(10_000),
  location: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
});

/** Parses the shared event form fields (title/desc/location/times/capacity). */
function parseEventForm(formData: FormData) {
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event" };
  }

  const startsAt = parseDatetimeLocal(String(formData.get("starts_at") ?? ""));
  if (!startsAt) return { error: "Choose a start date and time" };
  const endsAt = parseDatetimeLocal(String(formData.get("ends_at") ?? ""));
  if (endsAt && endsAt < startsAt) {
    return { error: "End time must be after the start time" };
  }

  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  let capacity: number | null = null;
  if (capacityRaw) {
    const n = Number(capacityRaw);
    if (!Number.isInteger(n) || n < 1) {
      return { error: "Capacity must be a positive whole number" };
    }
    capacity = n;
  }

  return {
    values: { ...parsed.data, starts_at: startsAt, ends_at: endsAt, capacity },
  };
}

/** Validates + uploads a cover image if one was provided; returns its path. */
async function maybeUploadCover(
  buildingId: string,
  eventId: string,
  formData: FormData
): Promise<string | null> {
  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!isAcceptedImage(file.type) || file.size > MAX_COVER_BYTES) return null;
  try {
    return await uploadEventCover(buildingId, eventId, file);
  } catch {
    return null;
  }
}

// --------------------------------------------------------- manager: CRUD ----

export async function createEvent(formData: FormData) {
  const { admin, viewerId, buildingId, isManager } = await requireActor();
  if (!isManager) redirect("/events");

  const result = parseEventForm(formData);
  if (result.error) {
    redirect(`/events/new?error=${encodeURIComponent(result.error)}`);
  }
  const publish = formData.get("publish") != null;

  const { data: event, error } = await admin
    .from("events")
    .insert({
      building_id: buildingId,
      created_by: viewerId,
      ...result.values,
      is_published: publish,
    })
    .select("id")
    .single();
  if (error || !event) {
    redirect(
      `/events/new?error=${encodeURIComponent("Could not create event")}`
    );
  }
  const eventId = event!.id as string;

  const coverPath = await maybeUploadCover(buildingId, eventId, formData);
  if (coverPath) {
    await admin
      .from("events")
      .update({ cover_path: coverPath })
      .eq("id", eventId);
  }

  revalidatePath("/events");
  redirect(`/events/${eventId}`);
}

export async function updateEvent(formData: FormData) {
  const { admin, buildingId, isManager } = await requireActor();
  if (!isManager) redirect("/events");
  const eventId = String(formData.get("eventId") ?? "");

  const { data: existing } = await admin
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("building_id", buildingId)
    .maybeSingle();
  if (!existing) redirect("/events");

  const result = parseEventForm(formData);
  if (result.error) {
    redirect(
      `/events/${eventId}/edit?error=${encodeURIComponent(result.error)}`
    );
  }

  const coverPath = await maybeUploadCover(buildingId, eventId, formData);
  await admin
    .from("events")
    .update({
      ...result.values,
      ...(coverPath ? { cover_path: coverPath } : {}),
    })
    .eq("id", eventId);

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function setPublished(formData: FormData) {
  const { admin, buildingId, isManager } = await requireActor();
  if (!isManager) redirect("/events");
  const eventId = String(formData.get("eventId") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";

  await admin
    .from("events")
    .update({ is_published: publish })
    .eq("id", eventId)
    .eq("building_id", buildingId);
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function cancelEvent(formData: FormData) {
  const { admin, buildingId, isManager } = await requireActor();
  if (!isManager) redirect("/events");
  const eventId = String(formData.get("eventId") ?? "");

  const { data: event } = await admin
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("building_id", buildingId)
    .maybeSingle();
  if (!event) redirect("/events");

  await admin
    .from("events")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("building_id", buildingId);
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);

  // Let everyone who signed up know the event was cancelled.
  const { data: signups } = await admin
    .from("event_signups")
    .select("user_id")
    .eq("event_id", eventId)
    .neq("status", "cancelled");
  await notifyMany(
    (signups ?? []).map((s) => s.user_id as string),
    {
      buildingId,
      category: "events",
      type: "event_cancelled",
      title: `Event cancelled: ${event!.title}`,
      body: "An event you signed up for has been cancelled.",
      link: `/events/${eventId}`,
    }
  );
}

// ------------------------------------------------- resident: sign up flow ----

export async function signUp(formData: FormData) {
  const { admin, viewerId } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");
  const guests = Math.max(0, Math.min(10, Number(formData.get("guests") ?? 0)));

  const { error } = await admin.rpc("signup_for_event", {
    p_event_id: eventId,
    p_user_id: viewerId,
    p_guests: Number.isFinite(guests) ? guests : 0,
  });
  if (error) {
    const map: Record<string, string> = {
      event_cancelled: "This event has been cancelled",
      event_not_published: "This event isn't open for sign-ups",
      event_past: "This event has already happened",
      event_not_found: "Event not found",
    };
    const key = Object.keys(map).find((k) => error.message.includes(k));
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(
        key ? map[key] : "Could not sign up"
      )}`
    );
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
}

export async function cancelSignup(formData: FormData) {
  const { admin, viewerId } = await requireActor();
  const eventId = String(formData.get("eventId") ?? "");

  await admin.rpc("cancel_event_signup", {
    p_event_id: eventId,
    p_user_id: viewerId,
  });

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-events");
}

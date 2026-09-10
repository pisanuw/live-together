"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer } from "@/lib/auth/context";
import { viewerStatus } from "@/lib/auth/routing";
import { isManagerRole } from "@/lib/auth/types";
import { isValidTransition, statusLabel } from "@/lib/maintenance/helpers";
import { notify } from "@/lib/notifications/notify";
import {
  isAcceptedImage,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_REQUEST,
  uploadMaintenanceImage,
} from "@/lib/maintenance/media";
import type {
  MaintenanceRequestRow,
  MaintenanceStatus,
} from "@/lib/maintenance/types";
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

const requestSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(200),
  description: z.string().max(10_000),
  category: z.enum([
    "plumbing",
    "electrical",
    "appliance",
    "common-area",
    "other",
  ]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

const STATUSES: MaintenanceStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
];

function nowIso() {
  return new Date().toISOString();
}

/** Loads a request in the actor's building, or null. */
async function loadRequest(
  admin: ReturnType<typeof createAdminClient>,
  buildingId: string,
  requestId: string
) {
  const { data } = await admin
    .from("maintenance_requests")
    .select("id, created_by, status, priority, assigned_to")
    .eq("id", requestId)
    .eq("building_id", buildingId)
    .maybeSingle();
  return data as Pick<
    MaintenanceRequestRow,
    "id" | "created_by" | "status" | "priority" | "assigned_to"
  > | null;
}

// -------------------------------------------------------------- resident ----

export async function createRequest(formData: FormData) {
  const { admin, viewerId, buildingId } = await requireActor();

  const parsed = requestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    priority: formData.get("priority") ?? "normal",
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid request";
    redirect(`/maintenance/new?error=${encodeURIComponent(msg)}`);
  }

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length > MAX_IMAGES_PER_REQUEST) {
    redirect(
      `/maintenance/new?error=${encodeURIComponent(
        `Up to ${MAX_IMAGES_PER_REQUEST} photos`
      )}`
    );
  }
  for (const file of images) {
    if (!isAcceptedImage(file.type) || file.size > MAX_IMAGE_BYTES) {
      redirect(
        `/maintenance/new?error=${encodeURIComponent(
          "Photos must be images under 8MB"
        )}`
      );
    }
  }

  const { data: request, error } = await admin
    .from("maintenance_requests")
    .insert({ building_id: buildingId, created_by: viewerId, ...parsed.data })
    .select("id")
    .single();
  if (error || !request) {
    redirect(
      `/maintenance/new?error=${encodeURIComponent("Could not file the request")}`
    );
  }
  const requestId = request!.id as string;

  for (const file of images) {
    try {
      const path = await uploadMaintenanceImage(buildingId, requestId, file);
      await admin.from("attachments").insert({
        building_id: buildingId,
        owner_id: viewerId,
        storage_path: path,
        mime_type: file.type,
        kind: "image",
        byte_size: file.size,
        maintenance_request_id: requestId,
      });
    } catch {
      // Skip a photo that fails to upload rather than lose the request.
    }
  }

  revalidatePath("/maintenance");
  redirect(`/maintenance/${requestId}`);
}

export async function cancelRequest(formData: FormData) {
  const { admin, viewerId, buildingId, isManager } = await requireActor();
  const requestId = String(formData.get("requestId") ?? "");

  const request = await loadRequest(admin, buildingId, requestId);
  if (!request) redirect("/maintenance");
  const isOwner = request!.created_by === viewerId;
  if (!isManager && !isOwner) redirect("/maintenance");
  if (["resolved", "closed", "cancelled"].includes(request!.status)) {
    redirect(`/maintenance/${requestId}`);
  }

  await admin
    .from("maintenance_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);
  await admin.from("maintenance_updates").insert({
    building_id: buildingId,
    request_id: requestId,
    author_id: viewerId,
    status_from: request!.status,
    status_to: "cancelled",
  });

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${requestId}`);
}

// -------------------------------------------------- comments (both roles) ----

export async function postComment(formData: FormData) {
  const { admin, viewerId, buildingId, isManager } = await requireActor();
  const requestId = String(formData.get("requestId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const internal = isManager && formData.get("internal") != null;

  if (!body) redirect(`/maintenance/${requestId}`);

  const request = await loadRequest(admin, buildingId, requestId);
  if (!request) redirect("/maintenance");
  if (!isManager && request!.created_by !== viewerId) {
    redirect("/maintenance");
  }

  await admin.from("maintenance_updates").insert({
    building_id: buildingId,
    request_id: requestId,
    author_id: viewerId,
    body: body.slice(0, 5000),
    is_internal: internal,
  });

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${requestId}`);

  // A public comment from someone else notifies the request's owner.
  if (!internal && request!.created_by !== viewerId) {
    await notify({
      userId: request!.created_by,
      buildingId,
      category: "maintenance",
      type: "maintenance_comment",
      title: "New comment on your maintenance request",
      body: body.slice(0, 140),
      link: `/maintenance/${requestId}`,
    });
  }
}

// -------------------------------------------------------- manager: triage ----

export async function triageRequest(formData: FormData) {
  const { admin, viewerId, buildingId, isManager } = await requireActor();
  if (!isManager) redirect("/maintenance");
  const requestId = String(formData.get("requestId") ?? "");

  const request = await loadRequest(admin, buildingId, requestId);
  if (!request) redirect("/maintenance");

  const rawStatus = String(formData.get("status") ?? "");
  const status =
    STATUSES.includes(rawStatus as MaintenanceStatus) &&
    isValidTransition(request!.status, rawStatus as MaintenanceStatus)
      ? (rawStatus as MaintenanceStatus)
      : request!.status;

  const rawPriority = String(formData.get("priority") ?? request!.priority);
  const priority = ["low", "normal", "high", "urgent"].includes(rawPriority)
    ? rawPriority
    : request!.priority;

  // Validate the assignee is an approved manager/admin in this building.
  let assignedTo: string | null = null;
  const rawAssignee = String(formData.get("assignedTo") ?? "").trim();
  if (rawAssignee) {
    const { data: mgr } = await admin
      .from("memberships")
      .select("user_id")
      .eq("building_id", buildingId)
      .eq("user_id", rawAssignee)
      .eq("status", "approved")
      .in("role", ["manager", "admin"])
      .maybeSingle();
    assignedTo = mgr ? rawAssignee : null;
  }

  const note = String(formData.get("note") ?? "").trim();
  const internal = formData.get("internal") != null;
  const statusChanged = status !== request!.status;

  const resolvedAt =
    status === "resolved"
      ? nowIso()
      : status === "open" || status === "in_progress" || status === "cancelled"
        ? null
        : undefined; // 'closed' keeps whatever resolved_at was

  await admin
    .from("maintenance_requests")
    .update({
      status,
      priority,
      assigned_to: assignedTo,
      ...(resolvedAt === undefined ? {} : { resolved_at: resolvedAt }),
    })
    .eq("id", requestId);

  if (statusChanged || note) {
    await admin.from("maintenance_updates").insert({
      building_id: buildingId,
      request_id: requestId,
      author_id: viewerId,
      body: note || null,
      status_from: statusChanged ? request!.status : null,
      status_to: statusChanged ? status : null,
      is_internal: internal,
    });
  }

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${requestId}`);

  // Notify the owner when their request's status changes (not for self-edits).
  if (statusChanged && request!.created_by !== viewerId) {
    await notify({
      userId: request!.created_by,
      buildingId,
      category: "maintenance",
      type: "maintenance_status",
      title: "Your maintenance request was updated",
      body: `Status changed to ${statusLabel(status)}.`,
      link: `/maintenance/${requestId}`,
    });
  }
}

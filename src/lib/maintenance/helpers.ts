// Pure maintenance logic — no I/O, so it is unit-testable
// (see __tests__/maintenance.test.ts).

import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/maintenance/types";

export const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliance: "Appliance",
  "common-area": "Common area",
  other: "Other",
};

export const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const CATEGORY_OPTIONS = Object.keys(
  CATEGORY_LABELS
) as MaintenanceCategory[];
export const PRIORITY_OPTIONS = Object.keys(
  PRIORITY_LABELS
) as MaintenancePriority[];

export function categoryLabel(category: MaintenanceCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}
export function priorityLabel(priority: MaintenancePriority): string {
  return PRIORITY_LABELS[priority] ?? priority;
}
export function statusLabel(status: MaintenanceStatus): string {
  return STATUS_LABELS[status] ?? status;
}

const CLOSED: ReadonlySet<MaintenanceStatus> = new Set([
  "resolved",
  "closed",
  "cancelled",
]);

/** Resolved / closed / cancelled requests are "closed" (inactive). */
export function isClosedStatus(status: MaintenanceStatus): boolean {
  return CLOSED.has(status);
}
export function isOpenStatus(status: MaintenanceStatus): boolean {
  return !isClosedStatus(status);
}

const PRIORITY_RANK: Record<MaintenancePriority, number> = {
  urgent: 3,
  high: 2,
  normal: 1,
  low: 0,
};

/** Higher number = more urgent. For sorting a queue of requests. */
export function priorityRank(priority: MaintenancePriority): number {
  return PRIORITY_RANK[priority] ?? 0;
}

const TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  open: ["in_progress", "resolved", "closed", "cancelled"],
  in_progress: ["resolved", "closed", "cancelled", "open"],
  resolved: ["closed", "in_progress"],
  closed: ["in_progress"],
  cancelled: ["open"],
};

/** Statuses a manager may move a request to from its current status. */
export function allowedNextStatuses(
  current: MaintenanceStatus
): MaintenanceStatus[] {
  return TRANSITIONS[current] ?? [];
}

/** True if `next` is the current status or a permitted transition from it. */
export function isValidTransition(
  current: MaintenanceStatus,
  next: MaintenanceStatus
): boolean {
  return next === current || allowedNextStatuses(current).includes(next);
}

// Domain types for maintenance requests (Stage 5). Row types mirror the `wcv`
// tables; view types are the composed shapes the UI renders.

import type { Author, AttachmentView } from "@/lib/forum/types";

export type MaintenanceCategory =
  "plumbing" | "electrical" | "appliance" | "common-area" | "other";
export type MaintenancePriority = "low" | "normal" | "high" | "urgent";
export type MaintenanceStatus =
  "open" | "in_progress" | "resolved" | "closed" | "cancelled";

export interface MaintenanceRequestRow {
  id: string;
  building_id: string;
  created_by: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  unit_id: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceUpdateRow {
  id: string;
  request_id: string;
  author_id: string;
  body: string | null;
  status_from: string | null;
  status_to: string | null;
  is_internal: boolean;
  created_at: string;
}

/** A row in the maintenance list. */
export interface RequestListItem {
  id: string;
  title: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  createdAt: string;
  creator: Author;
  assignee: Author | null;
  commentCount: number;
  imageCount: number;
}

/** One entry in a request's activity timeline. */
export interface UpdateEntry {
  id: string;
  body: string | null;
  statusFrom: MaintenanceStatus | null;
  statusTo: MaintenanceStatus | null;
  isInternal: boolean;
  createdAt: string;
  author: Author;
}

/** Everything the request detail page renders. */
export interface RequestDetail {
  id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  createdAt: string;
  resolvedAt: string | null;
  creatorId: string;
  creator: Author;
  assignee: Author | null;
  attachments: AttachmentView[];
  updates: UpdateEntry[];
}

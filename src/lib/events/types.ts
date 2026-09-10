// Domain types for events + sign-ups (Stage 4). Row types mirror the `wcv`
// tables; view types are the composed shapes the UI renders.

import type { Author } from "@/lib/forum/types";

export type SignupStatus = "registered" | "waitlisted" | "cancelled";

export interface EventRow {
  id: string;
  building_id: string;
  created_by: string;
  title: string;
  description: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  cover_path: string | null;
  is_published: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventSignupRow {
  id: string;
  event_id: string;
  user_id: string;
  status: SignupStatus;
  guests_count: number;
  created_at: string;
}

/** The viewer's own sign-up on an event, if any active one exists. */
export interface ViewerSignup {
  status: SignupStatus;
  guestsCount: number;
}

/** A row in the events list. */
export interface EventListItem {
  id: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  isPublished: boolean;
  cancelledAt: string | null;
  coverUrl: string | null;
  timezone: string;
  registeredSeats: number;
  waitlistCount: number;
  spotsRemaining: number | null;
  viewerStatus: SignupStatus | null;
}

/** An attendee shown to managers on the event detail page. */
export interface Attendee {
  user: Author;
  status: SignupStatus;
  guestsCount: number;
}

/** Everything the event detail page renders. */
export interface EventDetail {
  id: string;
  title: string;
  description: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  coverUrl: string | null;
  timezone: string;
  isPublished: boolean;
  cancelledAt: string | null;
  createdBy: string;
  registeredSeats: number;
  waitlistCount: number;
  spotsRemaining: number | null;
  viewerSignup: ViewerSignup | null;
  attendees: Attendee[];
}

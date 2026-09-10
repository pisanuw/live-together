// Per-user notification preferences. Stored as jsonb in wcv.user_settings and
// consulted before sending any notification (Stage 8 honors these). Pure +
// unit-tested; categories default to ON when unset.

export type NotifCategory =
  "forum" | "events" | "maintenance" | "announcements";

export const NOTIF_CATEGORIES: NotifCategory[] = [
  "forum",
  "events",
  "maintenance",
  "announcements",
];

export const NOTIF_LABELS: Record<NotifCategory, string> = {
  forum: "Forum replies",
  events: "Event updates",
  maintenance: "Maintenance updates",
  announcements: "Announcements",
};

export const NOTIF_DESCRIPTIONS: Record<NotifCategory, string> = {
  forum: "Replies to your posts and comments.",
  events: "Cancellations and waitlist promotions for events you joined.",
  maintenance: "Status changes and comments on your requests.",
  announcements: "Building-wide announcements from management.",
};

export type NotifPrefs = Partial<Record<NotifCategory, boolean>>;

/** Whether a category is enabled. Absent/invalid preferences default to ON. */
export function isNotifEnabled(
  prefs: NotifPrefs | null | undefined,
  category: NotifCategory
): boolean {
  return prefs?.[category] !== false;
}

/** Keeps only known categories, coercing values to booleans. */
export function normalizeNotifPrefs(raw: unknown): NotifPrefs {
  const prefs: NotifPrefs = {};
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const category of NOTIF_CATEGORIES) {
      if (category in record) prefs[category] = Boolean(record[category]);
    }
  }
  return prefs;
}

import { SubmitButton } from "@/components/submit-button";
import {
  isNotifEnabled,
  NOTIF_CATEGORIES,
  NOTIF_DESCRIPTIONS,
  NOTIF_LABELS,
  type NotifPrefs,
} from "@/lib/settings/notifications";

import { saveNotifPrefs } from "./actions";

/** Per-category notification toggles. These gate emails/in-app sends (Stage 8). */
export function NotifPrefsForm({ prefs }: { prefs: NotifPrefs }) {
  return (
    <form action={saveNotifPrefs} className="space-y-3">
      <ul className="divide-border divide-y rounded-lg border">
        {NOTIF_CATEGORIES.map((category) => (
          <li key={category} className="flex items-start gap-3 p-3">
            <input
              id={`notif-${category}`}
              type="checkbox"
              name={category}
              defaultChecked={isNotifEnabled(prefs, category)}
              className="accent-primary mt-0.5 size-4"
            />
            <label htmlFor={`notif-${category}`} className="flex-1">
              <span className="block text-sm font-medium">
                {NOTIF_LABELS[category]}
              </span>
              <span className="text-muted-foreground block text-xs">
                {NOTIF_DESCRIPTIONS[category]}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <SubmitButton size="sm" pendingText="Saving…">
        Save preferences
      </SubmitButton>
    </form>
  );
}

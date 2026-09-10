import { SubmitButton } from "@/components/submit-button";
import { toDatetimeLocalValue } from "@/lib/events/format";
import type { EventDetail } from "@/lib/events/types";

const inputClass =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

/**
 * Shared create/edit event form. In edit mode (`event` provided) it carries a
 * hidden id and prefills fields; in create mode it offers a "publish now"
 * toggle. Publish state on an existing event is managed from the detail page.
 */
export function EventForm({
  action,
  event,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  event?: EventDetail;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={event?.title ?? ""}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={10000}
          defaultValue={event?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="text-sm font-medium">
          Location
        </label>
        <input
          id="location"
          name="location"
          maxLength={200}
          defaultValue={event?.location ?? ""}
          placeholder="e.g. Community room"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="starts_at" className="text-sm font-medium">
            Starts
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocalValue(event?.startsAt ?? null)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ends_at" className="text-sm font-medium">
            Ends{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(event?.endsAt ?? null)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="capacity" className="text-sm font-medium">
          Capacity{" "}
          <span className="text-muted-foreground font-normal">
            (leave blank for unlimited)
          </span>
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          defaultValue={event?.capacity ?? ""}
          className={`${inputClass} max-w-40`}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="cover" className="text-sm font-medium">
          Cover image{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="cover"
          type="file"
          name="cover"
          accept="image/*"
          className="text-muted-foreground block text-sm file:mr-2 file:rounded-md file:border file:px-2 file:py-1 file:text-xs"
        />
      </div>

      {!event ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="publish"
            defaultChecked
            className="accent-foreground size-4"
          />
          Publish now (visible to residents)
        </label>
      ) : null}

      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}

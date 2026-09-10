import { triageRequest } from "@/app/(app)/maintenance/actions";
import { SubmitButton } from "@/components/submit-button";
import {
  allowedNextStatuses,
  PRIORITY_OPTIONS,
  priorityLabel,
  statusLabel,
} from "@/lib/maintenance/helpers";
import type { Author } from "@/lib/forum/types";
import type { RequestDetail } from "@/lib/maintenance/types";

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";

/** Manager panel: change status/priority/assignee and optionally add a note. */
export function TriagePanel({
  request,
  managers,
}: {
  request: RequestDetail;
  managers: Author[];
}) {
  const statusOptions = [
    request.status,
    ...allowedNextStatuses(request.status),
  ];

  return (
    <form
      action={triageRequest}
      className="bg-muted/30 space-y-4 rounded-lg border p-4"
    >
      <h2 className="text-sm font-semibold">Manage request</h2>
      <input type="hidden" name="requestId" value={request.id} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="status" className="text-xs font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={request.status}
            className={selectClass}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="priority" className="text-xs font-medium">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={request.priority}
            className={selectClass}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {priorityLabel(p)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="assignedTo" className="text-xs font-medium">
            Assigned to
          </label>
          <select
            id="assignedTo"
            name="assignedTo"
            defaultValue={request.assignee?.id ?? ""}
            className={selectClass}
          >
            <option value="">Unassigned</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="note" className="text-xs font-medium">
          Note{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={5000}
          placeholder="Add a note with this change…"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            name="internal"
            className="accent-foreground size-3.5"
          />
          Internal note (managers only)
        </label>
        <SubmitButton size="sm" pendingText="Saving…">
          Update request
        </SubmitButton>
      </div>
    </form>
  );
}

import { SubmitButton } from "@/components/submit-button";
import { cancelSignup, signUp } from "@/app/(app)/events/actions";
import { signupStatusLabel } from "@/lib/events/helpers";
import type { EventDetail } from "@/lib/events/types";

/**
 * Sign-up / cancel controls on the event detail page. Server-rendered: the
 * actual capacity + waitlist decision happens in the DB RPC the actions call.
 */
export function SignupControls({
  event,
  canSignUpNow,
  full,
  closedReason,
}: {
  event: EventDetail;
  canSignUpNow: boolean;
  full: boolean;
  closedReason: string | null;
}) {
  const signup = event.viewerSignup;

  if (signup && signup.status !== "cancelled") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
        <div className="flex-1 text-sm">
          You&apos;re{" "}
          <span className="font-semibold">
            {signupStatusLabel(signup.status)}
          </span>
          {signup.guestsCount > 0
            ? ` with ${signup.guestsCount} guest${signup.guestsCount > 1 ? "s" : ""}`
            : ""}
          .
          {signup.status === "waitlisted"
            ? " We'll move you up if a spot opens."
            : ""}
        </div>
        <form action={cancelSignup}>
          <input type="hidden" name="eventId" value={event.id} />
          <SubmitButton variant="outline" size="sm" pendingText="Cancelling…">
            Cancel sign-up
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (!canSignUpNow) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
        {closedReason ?? "Sign-ups are closed."}
      </p>
    );
  }

  return (
    <form
      action={signUp}
      className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
    >
      <input type="hidden" name="eventId" value={event.id} />
      <div className="space-y-1">
        <label htmlFor="guests" className="text-sm font-medium">
          Guests
        </label>
        <select
          id="guests"
          name="guests"
          defaultValue="0"
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton pendingText="Saving…">
        {full ? "Join waitlist" : "Sign up"}
      </SubmitButton>
      {full ? (
        <p className="text-muted-foreground w-full text-xs">
          This event is full — you&apos;ll join the waitlist.
        </p>
      ) : null}
    </form>
  );
}

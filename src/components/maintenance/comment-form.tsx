"use client";

import { useRef, useTransition } from "react";

import { postComment } from "@/app/(app)/maintenance/actions";
import { Button } from "@/components/ui/button";

/**
 * Adds a comment to a maintenance request. Managers can mark a comment internal
 * (visible only to other managers). Clears on success.
 */
export function CommentForm({
  requestId,
  canBeInternal,
}: {
  requestId: string;
  canBeInternal: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value.trim();
    if (!body) return;
    const fd = new FormData();
    fd.set("requestId", requestId);
    fd.set("body", body);
    if (canBeInternal && internalRef.current?.checked) fd.set("internal", "on");
    startTransition(async () => {
      await postComment(fd);
      if (ref.current) ref.current.value = "";
      if (internalRef.current) internalRef.current.checked = false;
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        ref={ref}
        rows={3}
        maxLength={5000}
        required
        placeholder="Add a comment…"
        className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Sending…" : "Comment"}
        </Button>
        {canBeInternal ? (
          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <input
              ref={internalRef}
              type="checkbox"
              className="accent-foreground size-3.5"
            />
            Internal note (managers only)
          </label>
        ) : null}
      </div>
    </form>
  );
}

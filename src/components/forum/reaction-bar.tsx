"use client";

import { useState, useTransition } from "react";
import { SmilePlus } from "lucide-react";
import { cn } from "cn";

import { toggleReaction } from "@/app/(app)/forum/actions";
import { REACTION_EMOJIS } from "@/lib/forum/helpers";
import type { ReactionSummary, ReactionTargetType } from "@/lib/forum/types";

/**
 * Emoji reactions for a post or comment. Existing tallies render as toggle
 * pills; the "+" opens the full palette. Each toggle calls the server action,
 * whose revalidation re-renders the summary.
 */
export function ReactionBar({
  targetType,
  targetId,
  reactions,
}: {
  targetType: ReactionTargetType;
  targetId: string;
  reactions: ReactionSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function react(emoji: string) {
    setOpen(false);
    const fd = new FormData();
    fd.set("targetType", targetType);
    fd.set("targetId", targetId);
    fd.set("emoji", emoji);
    startTransition(() => toggleReaction(fd));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-busy={pending}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => react(r.emoji)}
          aria-pressed={r.reacted}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            r.reacted
              ? "border-foreground/30 bg-muted font-medium"
              : "text-muted-foreground hover:bg-muted/60"
          )}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Add reaction"
          className="text-muted-foreground hover:bg-muted/60 inline-flex size-6 items-center justify-center rounded-full border transition-colors"
        >
          <SmilePlus className="size-3.5" />
        </button>
        {open ? (
          <div className="bg-popover absolute z-10 mt-1 flex gap-1 rounded-lg border p-1 shadow-md">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                className="hover:bg-muted rounded-md px-1.5 py-1 text-base leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

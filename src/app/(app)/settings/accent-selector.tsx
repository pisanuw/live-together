"use client";

import { useTransition } from "react";
import { cn } from "cn";

import {
  ACCENTS,
  ACCENT_LABELS,
  ACCENT_VARS,
  accentSwatch,
  type Accent,
} from "@/lib/settings/accent";

import { saveAccent } from "./actions";

/** Applies the accent to the live document immediately, then persists it. */
function applyAccent(accent: Accent) {
  const root = document.documentElement;
  const vars = ["--primary", "--primary-foreground", "--ring"] as const;
  if (accent === "default") {
    vars.forEach((v) => root.style.removeProperty(v));
    return;
  }
  const { primary, foreground } = ACCENT_VARS[accent];
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--ring", primary);
}

export function AccentSelector({ current }: { current: Accent }) {
  const [pending, startTransition] = useTransition();

  function choose(accent: Accent) {
    applyAccent(accent);
    startTransition(() => saveAccent(accent));
  }

  return (
    <div className="flex flex-wrap gap-2" aria-busy={pending}>
      {ACCENTS.map((accent) => (
        <button
          key={accent}
          type="button"
          onClick={() => choose(accent)}
          aria-pressed={current === accent}
          title={ACCENT_LABELS[accent]}
          className={cn(
            "flex size-9 items-center justify-center rounded-full border-2 transition-colors",
            current === accent ? "border-foreground" : "border-transparent"
          )}
        >
          <span
            className="size-6 rounded-full"
            style={{ backgroundColor: accentSwatch(accent) }}
          />
          <span className="sr-only">{ACCENT_LABELS[accent]}</span>
        </button>
      ))}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { cn } from "cn";

import { THEME_LABELS, THEMES, type Theme } from "@/lib/settings/theme";

import { saveTheme } from "./actions";

export function ThemeSelector({ current }: { current: Theme }) {
  const [pending, startTransition] = useTransition();

  function choose(theme: Theme) {
    // Apply immediately for snappy feedback; persist in the background.
    const prefersDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", prefersDark);
    startTransition(async () => {
      await saveTheme(theme);
    });
  }

  return (
    <div
      className="inline-flex gap-1 rounded-lg border p-1"
      aria-busy={pending}
    >
      {THEMES.map((theme) => (
        <button
          key={theme}
          type="button"
          onClick={() => choose(theme)}
          aria-pressed={current === theme}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            current === theme
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/60"
          )}
        >
          {THEME_LABELS[theme]}
        </button>
      ))}
    </div>
  );
}

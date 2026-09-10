// Accent color: overrides the neutral --primary with a hue, applied server-side
// in the root layout (no flash). Pure + unit-tested; the actual CSS override
// lives entirely in accentStyle so both the picker and the layout stay in sync.

export type Accent = "default" | "blue" | "green" | "violet" | "rose" | "amber";

export const ACCENTS: Accent[] = [
  "default",
  "blue",
  "green",
  "violet",
  "rose",
  "amber",
];

export const ACCENT_LABELS: Record<Accent, string> = {
  default: "Neutral",
  blue: "Blue",
  green: "Green",
  violet: "Violet",
  rose: "Rose",
  amber: "Amber",
};

export function isAccent(value: unknown): value is Accent {
  return typeof value === "string" && (ACCENTS as string[]).includes(value);
}

/** The oklch primary + readable foreground for each non-default accent. */
export const ACCENT_VARS: Record<
  Exclude<Accent, "default">,
  { primary: string; foreground: string }
> = {
  blue: { primary: "oklch(0.55 0.17 255)", foreground: "oklch(0.98 0 0)" },
  green: { primary: "oklch(0.54 0.14 155)", foreground: "oklch(0.98 0 0)" },
  violet: { primary: "oklch(0.55 0.2 290)", foreground: "oklch(0.98 0 0)" },
  rose: { primary: "oklch(0.58 0.2 15)", foreground: "oklch(0.98 0 0)" },
  amber: { primary: "oklch(0.72 0.16 70)", foreground: "oklch(0.24 0.02 70)" },
};

/** A CSS swatch color for the picker dots. Neutral falls back to a gray. */
export function accentSwatch(accent: Accent): string {
  return accent === "default" ? "oklch(0.55 0 0)" : ACCENT_VARS[accent].primary;
}

/**
 * Returns a `:root` override string that recolors --primary/--ring, or "" for
 * the neutral default. Placed after globals.css so it wins for both light and
 * dark (equal specificity, later source order).
 */
export function accentStyle(accent: Accent): string {
  if (accent === "default" || !isAccent(accent)) return "";
  const { primary, foreground } = ACCENT_VARS[accent];
  return `:root{--primary:${primary};--primary-foreground:${foreground};--ring:${primary};}`;
}

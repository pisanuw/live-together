export type Theme = "system" | "light" | "dark";

export const THEMES: Theme[] = ["system", "light", "dark"];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as string[]).includes(value);
}

export const THEME_LABELS: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * Inline script (run before paint) that applies the `dark` class for the
 * `system` theme based on the OS preference, avoiding a flash. For explicit
 * light/dark the server already sets the class, so this only acts on `system`.
 */
export function themeInitScript(theme: Theme): string {
  if (theme !== "system") return "";
  return `try{if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}`;
}

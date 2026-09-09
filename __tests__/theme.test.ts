import { describe, expect, test } from "vitest";

import { THEMES, isTheme, themeInitScript } from "@/lib/settings/theme";

describe("isTheme", () => {
  test("accepts valid themes", () => {
    for (const t of THEMES) expect(isTheme(t)).toBe(true);
  });
  test("rejects anything else", () => {
    expect(isTheme("neon")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe("themeInitScript", () => {
  test("emits a script only for the system theme", () => {
    expect(themeInitScript("system")).toContain("prefers-color-scheme");
    expect(themeInitScript("light")).toBe("");
    expect(themeInitScript("dark")).toBe("");
  });
});

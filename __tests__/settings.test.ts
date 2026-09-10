import { describe, expect, test } from "vitest";

import { accentStyle, isAccent } from "@/lib/settings/accent";
import {
  isNotifEnabled,
  normalizeNotifPrefs,
} from "@/lib/settings/notifications";

describe("accent", () => {
  test("isAccent validates known values", () => {
    expect(isAccent("blue")).toBe(true);
    expect(isAccent("default")).toBe(true);
    expect(isAccent("chartreuse")).toBe(false);
    expect(isAccent(42)).toBe(false);
  });

  test("accentStyle returns empty for default/invalid, CSS for a hue", () => {
    expect(accentStyle("default")).toBe("");
    expect(accentStyle("nope" as never)).toBe("");
    const css = accentStyle("blue");
    expect(css).toContain("--primary:");
    expect(css).toContain("--ring:");
    expect(css.startsWith(":root{")).toBe(true);
  });
});

describe("notification preferences", () => {
  test("categories default to enabled when unset", () => {
    expect(isNotifEnabled(undefined, "forum")).toBe(true);
    expect(isNotifEnabled({}, "events")).toBe(true);
  });

  test("explicit false disables, explicit true enables", () => {
    expect(isNotifEnabled({ forum: false }, "forum")).toBe(false);
    expect(isNotifEnabled({ forum: true }, "forum")).toBe(true);
  });

  test("normalizeNotifPrefs keeps only known keys as booleans", () => {
    expect(normalizeNotifPrefs({ forum: false, events: 1, junk: "x" })).toEqual(
      { forum: false, events: true }
    );
    expect(normalizeNotifPrefs(null)).toEqual({});
    expect(normalizeNotifPrefs("bad")).toEqual({});
  });
});

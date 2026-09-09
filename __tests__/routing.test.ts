import { describe, expect, test } from "vitest";

import { destinationFor, viewerStatus } from "@/lib/auth/routing";
import { displayName, isManagerRole } from "@/lib/auth/types";

describe("viewerStatus", () => {
  test("unauthenticated when there is no user", () => {
    expect(viewerStatus({ userId: null, activeMembership: null })).toBe(
      "unauthenticated"
    );
  });
  test("none when authed but no membership", () => {
    expect(viewerStatus({ userId: "u1", activeMembership: null })).toBe("none");
  });
  test("pending when the membership is pending", () => {
    expect(
      viewerStatus({ userId: "u1", activeMembership: { status: "pending" } })
    ).toBe("pending");
  });
  test("approved when the membership is approved", () => {
    expect(
      viewerStatus({ userId: "u1", activeMembership: { status: "approved" } })
    ).toBe("approved");
  });
});

describe("destinationFor", () => {
  test("sends unauthenticated to /login", () => {
    expect(destinationFor("unauthenticated")).toBe("/login");
  });
  test("keeps approved users in place", () => {
    expect(destinationFor("approved")).toBeNull();
  });
  test("sends pending and none to /pending", () => {
    expect(destinationFor("pending")).toBe("/pending");
    expect(destinationFor("none")).toBe("/pending");
  });
});

describe("type helpers", () => {
  test("isManagerRole", () => {
    expect(isManagerRole("manager")).toBe(true);
    expect(isManagerRole("admin")).toBe(true);
    expect(isManagerRole("resident")).toBe(false);
    expect(isManagerRole(null)).toBe(false);
  });
  test("displayName prefers preferred, then full, then fallback", () => {
    expect(
      displayName({ preferred_name: "Yus", full_name: "Yusuf P" }, "x")
    ).toBe("Yus");
    expect(
      displayName({ preferred_name: null, full_name: "Yusuf P" }, "x")
    ).toBe("Yusuf P");
    expect(displayName(null, "resident")).toBe("resident");
  });
});

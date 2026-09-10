import { describe, expect, test } from "vitest";

import {
  allowedNextStatuses,
  categoryLabel,
  isClosedStatus,
  isOpenStatus,
  isValidTransition,
  priorityLabel,
  priorityRank,
  statusLabel,
} from "@/lib/maintenance/helpers";
import type { MaintenancePriority } from "@/lib/maintenance/types";

describe("labels", () => {
  test("map enum values to friendly text", () => {
    expect(categoryLabel("common-area")).toBe("Common area");
    expect(priorityLabel("urgent")).toBe("Urgent");
    expect(statusLabel("in_progress")).toBe("In progress");
  });
});

describe("open vs closed", () => {
  test("open and in_progress are open", () => {
    expect(isOpenStatus("open")).toBe(true);
    expect(isOpenStatus("in_progress")).toBe(true);
  });
  test("resolved, closed, cancelled are closed", () => {
    expect(isClosedStatus("resolved")).toBe(true);
    expect(isClosedStatus("closed")).toBe(true);
    expect(isClosedStatus("cancelled")).toBe(true);
    expect(isOpenStatus("closed")).toBe(false);
  });
});

describe("priorityRank", () => {
  test("orders urgent > high > normal > low", () => {
    const order: MaintenancePriority[] = ["low", "urgent", "normal", "high"];
    const sorted = [...order].sort((a, b) => priorityRank(b) - priorityRank(a));
    expect(sorted).toEqual(["urgent", "high", "normal", "low"]);
  });
});

describe("status transitions", () => {
  test("open can progress, resolve, close, or cancel", () => {
    expect(allowedNextStatuses("open")).toEqual([
      "in_progress",
      "resolved",
      "closed",
      "cancelled",
    ]);
  });

  test("closed can only be reopened to in_progress", () => {
    expect(allowedNextStatuses("closed")).toEqual(["in_progress"]);
  });

  test("isValidTransition allows staying put or a permitted move", () => {
    expect(isValidTransition("open", "open")).toBe(true);
    expect(isValidTransition("open", "in_progress")).toBe(true);
    expect(isValidTransition("resolved", "in_progress")).toBe(true);
    // resolved cannot jump straight back to open
    expect(isValidTransition("resolved", "open")).toBe(false);
    // cannot cancel an already-closed request
    expect(isValidTransition("closed", "cancelled")).toBe(false);
  });
});

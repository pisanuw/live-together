import { describe, expect, test } from "vitest";

import {
  canSignUp,
  capacityLabel,
  isFull,
  isPastEvent,
  registeredSeats,
  seatsFor,
  signupStatusLabel,
  spotsRemaining,
} from "@/lib/events/helpers";

const NOW = Date.parse("2026-09-09T12:00:00Z");
const FUTURE = "2026-09-16T18:00:00Z";
const PAST = "2026-09-02T18:00:00Z";

describe("seat math", () => {
  test("seatsFor counts the member plus guests, clamping negatives", () => {
    expect(seatsFor(0)).toBe(1);
    expect(seatsFor(2)).toBe(3);
    expect(seatsFor(-5)).toBe(1);
  });

  test("registeredSeats sums only registered sign-ups", () => {
    const signups = [
      { status: "registered" as const, guestsCount: 0 },
      { status: "registered" as const, guestsCount: 2 },
      { status: "waitlisted" as const, guestsCount: 1 },
      { status: "cancelled" as const, guestsCount: 3 },
    ];
    expect(registeredSeats(signups)).toBe(1 + 3);
  });

  test("spotsRemaining is null for unlimited, clamped at zero otherwise", () => {
    expect(spotsRemaining(null, 5)).toBeNull();
    expect(spotsRemaining(10, 4)).toBe(6);
    expect(spotsRemaining(10, 12)).toBe(0);
  });

  test("isFull only for capped events at or over capacity", () => {
    expect(isFull(null, 100)).toBe(false);
    expect(isFull(10, 9)).toBe(false);
    expect(isFull(10, 10)).toBe(true);
    expect(isFull(10, 11)).toBe(true);
  });
});

describe("timing", () => {
  test("isPastEvent uses end, falling back to start", () => {
    expect(isPastEvent({ startsAt: PAST, endsAt: null }, NOW)).toBe(true);
    expect(isPastEvent({ startsAt: FUTURE, endsAt: null }, NOW)).toBe(false);
    // Started in the past but ends in the future => not past.
    expect(isPastEvent({ startsAt: PAST, endsAt: FUTURE }, NOW)).toBe(false);
  });

  test("canSignUp requires published, not cancelled, and not past", () => {
    const base = {
      startsAt: FUTURE,
      endsAt: null,
      isPublished: true,
      cancelledAt: null,
    };
    expect(canSignUp(base, NOW)).toBe(true);
    expect(canSignUp({ ...base, isPublished: false }, NOW)).toBe(false);
    expect(
      canSignUp({ ...base, cancelledAt: "2026-09-08T00:00:00Z" }, NOW)
    ).toBe(false);
    expect(canSignUp({ ...base, startsAt: PAST, endsAt: PAST }, NOW)).toBe(
      false
    );
  });
});

describe("labels", () => {
  test("signupStatusLabel maps statuses to friendly text", () => {
    expect(signupStatusLabel("registered")).toBe("Going");
    expect(signupStatusLabel("waitlisted")).toBe("Waitlisted");
    expect(signupStatusLabel("cancelled")).toBe("Not going");
  });

  test("capacityLabel summarizes usage", () => {
    expect(capacityLabel(null, 4)).toBe("Unlimited");
    expect(capacityLabel(10, 3)).toBe("3 / 10 spots");
  });
});

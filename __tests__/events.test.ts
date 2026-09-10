import { describe, expect, test } from "vitest";

import { parseDatetimeLocal, toDatetimeLocalValue } from "@/lib/events/format";
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

describe("timezone conversion", () => {
  const LA = "America/Los_Angeles";

  test("interprets the wall-clock in the building tz, honoring DST", () => {
    // Summer → PDT (UTC-7)
    expect(parseDatetimeLocal("2026-07-01T12:00", LA)).toBe(
      "2026-07-01T19:00:00.000Z"
    );
    // Winter → PST (UTC-8)
    expect(parseDatetimeLocal("2026-01-01T12:00", LA)).toBe(
      "2026-01-01T20:00:00.000Z"
    );
    // UTC zone is a no-op on the wall clock
    expect(parseDatetimeLocal("2026-07-01T12:00", "UTC")).toBe(
      "2026-07-01T12:00:00.000Z"
    );
  });

  test("invalid input yields null", () => {
    expect(parseDatetimeLocal("nope", LA)).toBeNull();
  });

  test("formats a UTC instant back to a zoned datetime-local value", () => {
    expect(toDatetimeLocalValue("2026-07-01T19:00:00.000Z", LA)).toBe(
      "2026-07-01T12:00"
    );
    expect(toDatetimeLocalValue(null, LA)).toBe("");
  });

  test("round-trips wall-clock → UTC → wall-clock", () => {
    const local = "2026-09-16T18:30";
    const utc = parseDatetimeLocal(local, LA)!;
    expect(toDatetimeLocalValue(utc, LA)).toBe(local);
  });
});

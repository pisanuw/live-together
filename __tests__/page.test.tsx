import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("home page renders the WCV heading", () => {
  render(<Home />);
  expect(
    screen.getByRole("heading", { level: 1, name: "West Complex Village" })
  ).toBeInTheDocument();
});

test("home page shows Supabase as not-yet-configured without env vars", () => {
  render(<Home />);
  expect(screen.getByText("Supabase configuration")).toBeInTheDocument();
  expect(screen.getByText(/Set NEXT_PUBLIC_SUPABASE_URL/)).toBeInTheDocument();
});

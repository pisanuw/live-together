import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { HealthStatus, type HealthCheck } from "@/components/health-status";

const checks: HealthCheck[] = [
  { label: "App server", status: "ok", detail: "Next.js is running" },
  {
    label: "Supabase configuration",
    status: "pending",
    detail: "Set env vars",
  },
];

test("renders each check with its label and detail", () => {
  render(<HealthStatus checks={checks} />);

  expect(screen.getByText("App server")).toBeInTheDocument();
  expect(screen.getByText("Next.js is running")).toBeInTheDocument();
  expect(screen.getByText("Supabase configuration")).toBeInTheDocument();
});

test("exposes status via data-status for each row", () => {
  render(<HealthStatus checks={checks} />);

  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveAttribute("data-status", "ok");
  expect(rows[1]).toHaveAttribute("data-status", "pending");
});

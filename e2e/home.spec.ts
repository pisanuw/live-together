import { expect, test } from "@playwright/test";

test("home page loads and shows the readiness checks", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "West Complex Village" })
  ).toBeVisible();

  await expect(page.getByText("App server")).toBeVisible();
  await expect(page.getByText("Supabase configuration")).toBeVisible();
});

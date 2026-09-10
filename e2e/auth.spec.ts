import { expect, test } from "@playwright/test";

// These flows require no session, so they run against a build with only the
// public Supabase env set. Authenticated flows need a seeded test user and are
// left for a future harness (see docs/LAUNCH.md).

test("unauthenticated visitors are sent to the login page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { level: 1, name: "West Complex Village" })
  ).toBeVisible();
});

test("login page offers Google and magic-link sign-in", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: /continue with google/i })
  ).toBeVisible();
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: /magic link/i })).toBeVisible();
});

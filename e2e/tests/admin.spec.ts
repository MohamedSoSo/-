import { test, expect } from "@playwright/test";

test("root page renders and links to the Developer Portal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await expect(page.getByRole("link", { name: "/admin/developer" })).toBeVisible();
});

test("Developer Portal redirects unauthenticated visitors to login", async ({ page }) => {
  await page.goto("/admin/developer");
  await expect(page).toHaveURL(/\/login/);
});

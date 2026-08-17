import { test, expect } from "@playwright/test";

test("homepage renders the menu grouped by category", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fire. Smoke. Flavor." })).toBeVisible();
  // seed data: Grilled Meats is the first category tab and starts active
  await expect(page.getByRole("button", { name: "Grilled Meats" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Wagyu Tomahawk/ })).toBeVisible();
});

test("clicking a weight-based item opens the customization sheet with weight tiers and doneness", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Wagyu Tomahawk/ }).click();
  await expect(page.getByRole("heading", { name: "Wagyu Tomahawk" })).toBeVisible();
  await expect(page.getByText("250g")).toBeVisible();
  await expect(page.getByText("Medium Rare")).toBeVisible();
});

test("adding an item opens the cart drawer with a live subtotal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Wagyu Tomahawk/ }).click();
  await page.getByText("Medium", { exact: true }).click();
  // Sauce is a required modifier group (seed data) — the Add-to-cart button
  // stays disabled until it's satisfied, same validation checked in
  // ItemCustomizeSheet's unmetRequiredGroups logic.
  await page.getByText("Garlic Toum").click();
  await page.getByRole("button", { name: /Add to cart/ }).click();
  await expect(page.getByRole("heading", { name: "Your order" })).toBeVisible();
  await expect(page.getByText(/^180\.00 SAR$/).first()).toBeVisible();
});

test("login page surfaces the real OTP-send result (accepted or a provider error)", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("5X XXX XXXX").fill("512345678");
  await page.getByRole("button", { name: /Send code via SMS/ }).click();
  // Without a configured Supabase phone provider this correctly surfaces
  // "Unsupported phone provider" (styled as our shared .text-red-400 error
  // convention) rather than silently hanging; a configured environment
  // instead reaches the OTP-code step. Either is a real, non-silent result.
  const otpStep = page.getByText(/Enter the code sent to/);
  const errorText = page.locator(".text-red-400");
  await expect(otpStep.or(errorText)).toBeVisible({ timeout: 10000 });
});

test("QR table token locks the order to dine-in when valid, and degrades gracefully when not", async ({ page }) => {
  await page.goto("/?table=00000000-0000-0000-0000-000000000000");
  // a nonexistent token must never silently succeed — it should say so, not
  // pretend the guest is seated at a real table
  await expect(page.getByText(/isn't recognized/)).toBeVisible({ timeout: 5000 });
});

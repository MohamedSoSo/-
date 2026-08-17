import { test, expect } from "@playwright/test";

test("unauthenticated visitors are redirected to the terminal login, never see staff data", async ({ page }) => {
  await page.goto("/floor");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Terminal login" })).toBeVisible();
});

test("login page surfaces the real OTP-send result (accepted or a provider error)", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("5X XXX XXXX").fill("512345678");
  await page.getByRole("button", { name: /Send code/ }).click();
  const otpStep = page.getByText(/Enter the code sent to/);
  const errorText = page.locator(".text-red-400");
  await expect(otpStep.or(errorText)).toBeVisible({ timeout: 10000 });
});

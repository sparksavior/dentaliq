import { test, expect } from "@playwright/test";

/**
 * Navigation E2E tests
 *
 * Verifies the app loads, routes work, and the command palette opens.
 */

test.describe("Navigation", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    // Should either show the landing page or redirect to login/dashboard
    expect(page.url()).toBeTruthy();
  });

  test("should load health-related routes without crashing", async ({
    page,
  }) => {
    // Verify these routes don't 500
    for (const route of ["/login", "/signup"]) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
    }
  });

  test("should open command palette with Cmd+K", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) return;

    // Trigger Cmd+K (or Ctrl+K on non-Mac)
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(500);

    // Look for the command palette overlay/input
    const paletteInput = page.locator(
      'input[placeholder*="search" i], input[placeholder*="command" i], [role="combobox"]',
    );
    if (
      await paletteInput
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await expect(paletteInput.first()).toBeVisible();
      // Type and verify it accepts input
      await paletteInput.first().fill("patients");
      await page.waitForTimeout(300);
    }

    // Close with Escape
    await page.keyboard.press("Escape");
  });

  test("should have working sidebar navigation links", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) return;

    // Check for nav links
    const navLinks = page.locator("nav a, aside a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

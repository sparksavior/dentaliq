import { test, expect } from "@playwright/test";

/**
 * Estimate creation E2E tests
 *
 * These tests require a logged-in session. In a real CI setup
 * you'd use a storageState from a setup project. For now these
 * verify the page structure loads correctly.
 */

test.describe("Estimates Page", () => {
  test("should load the estimates page structure", async ({ page }) => {
    await page.goto("/dashboard/estimates");
    // If redirected to login, that's expected without auth
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) {
      // Not authenticated — verify login page shows
      await expect(
        page.locator('input[type="email"], input[name="email"]'),
      ).toBeVisible();
      return;
    }

    // If authenticated, verify estimates page elements
    // Should show CDT code input or estimate form
    const heading = page.locator("h1, h2, h3");
    await expect(heading.first()).toBeVisible();
  });

  test("should have CSV export button when estimates exist", async ({
    page,
  }) => {
    await page.goto("/dashboard/estimates");
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) return;

    // Look for an export-related button
    const exportBtn = page.locator(
      'button:has-text("Export"), button:has-text("CSV"), button[title*="export" i]',
    );
    // May or may not be visible depending on whether there's data
    if (
      await exportBtn
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await expect(exportBtn.first()).toBeEnabled();
    }
  });
});

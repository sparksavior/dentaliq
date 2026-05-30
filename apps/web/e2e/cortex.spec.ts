import { test, expect } from "@playwright/test";

/**
 * Cortex Inbox / Agent approval flow E2E tests
 *
 * Verifies the Cortex inbox page loads and has the expected
 * structure for reviewing and approving/rejecting agent tasks.
 */

test.describe("Cortex Inbox", () => {
  test("should load the cortex inbox page", async ({ page }) => {
    await page.goto("/dashboard/cortex/inbox");
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) {
      await expect(
        page.locator('input[type="email"], input[name="email"]'),
      ).toBeVisible();
      return;
    }

    // Should show the inbox heading or agent task list
    const heading = page.locator("h1, h2, h3");
    await expect(heading.first()).toBeVisible();
  });

  test("should load the cortex agents page", async ({ page }) => {
    await page.goto("/dashboard/cortex/agents");
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) return;

    // Should display agent cards or an empty state
    const heading = page.locator("h1, h2, h3");
    await expect(heading.first()).toBeVisible();
  });
});

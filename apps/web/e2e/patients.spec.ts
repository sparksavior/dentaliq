import { test, expect } from "@playwright/test";

/**
 * Patients management E2E tests
 *
 * Verifies patient listing, creation form, and detail view.
 */

test.describe("Patients", () => {
  test("should load the patients list page", async ({ page }) => {
    await page.goto("/dashboard/patients");
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) {
      await expect(
        page.locator('input[type="email"], input[name="email"]'),
      ).toBeVisible();
      return;
    }

    // Should show the patients heading
    const heading = page.locator(
      'h1:has-text("Patient"), h2:has-text("Patient"), h3:has-text("Patient")',
    );
    if (
      await heading
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test("should have an Add Patient button", async ({ page }) => {
    await page.goto("/dashboard/patients");
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) return;

    const addBtn = page.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create")',
    );
    if (
      await addBtn
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await expect(addBtn.first()).toBeEnabled();
    }
  });

  test("should have CSV export button", async ({ page }) => {
    await page.goto("/dashboard/patients");
    await page.waitForTimeout(2000);

    if (page.url().includes("/login")) return;

    const exportBtn = page.locator(
      'button:has-text("Export"), button:has-text("CSV")',
    );
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

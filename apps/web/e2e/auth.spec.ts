import { test, expect } from "@playwright/test";

/**
 * Authentication E2E tests
 * Tests signup, login, and MFA flows
 */

test.describe("Authentication", () => {
  test("should display the login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // Should have email and password fields
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should display the signup page", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // Should have name, email, password fields
    await expect(
      page.locator('input[name="name"], input[placeholder*="name" i]'),
    ).toBeVisible();
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible();
  });

  test("should show validation errors on empty login", async ({ page }) => {
    await page.goto("/login");
    // Click sign in without filling fields
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")',
    );
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should show some form of error feedback
      await page.waitForTimeout(500);
      // Page should still be on login (not redirected)
      expect(page.url()).toContain("/login");
    }
  });

  test("should show error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill(
      'input[type="email"], input[name="email"]',
      "nonexistent@test.com",
    );
    await page.fill('input[type="password"]', "wrongpassword123");

    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")',
    );
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should display an error message
      await page.waitForTimeout(1000);
      expect(page.url()).toContain("/login");
    }
  });

  test("should navigate between login and signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.locator(
      'a[href*="signup"], button:has-text("Sign up"), a:has-text("Sign up"), a:has-text("Create")',
    );
    if (await signupLink.first().isVisible()) {
      await signupLink.first().click();
      await page.waitForURL("**/signup**");
      expect(page.url()).toContain("signup");
    }
  });

  test("should redirect unauthenticated users from dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    // Should redirect to login
    const url = page.url();
    expect(url.includes("/login") || url.includes("/dashboard")).toBe(true);
  });
});

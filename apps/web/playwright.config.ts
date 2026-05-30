import { defineConfig, devices } from "@playwright/test";

/**
 * DentalIQ — Playwright E2E configuration
 *
 * Run all tests:   pnpm exec playwright test
 * Run with UI:     pnpm exec playwright test --ui
 * Run one file:    pnpm exec playwright test e2e/auth.spec.ts
 *
 * Prerequisites:
 *   - All backend services running (auth:3001, tenant:3002, estimate:3004)
 *   - Next.js dev server running on :3000
 *   OR set BASE_URL to a deployed environment
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // run sequentially — auth state matters
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Optionally start the dev server before tests */
  // webServer: {
  //   command: "pnpm dev",
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 60_000,
  // },
});

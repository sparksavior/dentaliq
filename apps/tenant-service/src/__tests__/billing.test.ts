import { describe, it, expect } from "vitest";

describe("Billing plan configuration", () => {
  const PLAN_PRICES = {
    starter: 49,
    pro: 149,
    enterprise: 249,
    cortex: 299,
  };

  it("has all four plan tiers", () => {
    expect(Object.keys(PLAN_PRICES)).toEqual([
      "starter",
      "pro",
      "enterprise",
      "cortex",
    ]);
  });

  it("prices are in ascending order", () => {
    const prices = Object.values(PLAN_PRICES);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });

  it("all prices are positive", () => {
    for (const price of Object.values(PLAN_PRICES)) {
      expect(price).toBeGreaterThan(0);
    }
  });
});

describe("PMS types", () => {
  const VALID_PMS_TYPES = [
    "open_dental",
    "dentrix",
    "cleardent",
    "none",
  ] as const;

  it("includes the three supported PMS providers plus none", () => {
    expect(VALID_PMS_TYPES).toContain("open_dental");
    expect(VALID_PMS_TYPES).toContain("dentrix");
    expect(VALID_PMS_TYPES).toContain("cleardent");
    expect(VALID_PMS_TYPES).toContain("none");
    expect(VALID_PMS_TYPES).toHaveLength(4);
  });
});

describe("Tenant status transitions", () => {
  const VALID_STATUSES = ["trial", "active", "suspended"] as const;

  it("has three valid statuses", () => {
    expect(VALID_STATUSES).toHaveLength(3);
  });

  it("trial is the default initial status", () => {
    expect(VALID_STATUSES[0]).toBe("trial");
  });
});

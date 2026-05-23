import { describe, it, expect } from "vitest";
import {
  applyCoverageRules,
  getPlanFromInsurerName,
  DEFAULT_PLAN,
  INSURER_DEFAULTS,
  type InsurancePlan,
} from "../data/coverage-rules";

describe("applyCoverageRules", () => {
  describe("diagnostic/preventive categories", () => {
    it("covers diagnostic at preventive rate (100% for default plan)", () => {
      const result = applyCoverageRules("diagnostic", 100, DEFAULT_PLAN);
      expect(result.coveragePercent).toBe(100);
      expect(result.insurerPays).toBe(100);
      expect(result.patientCost).toBe(0);
    });

    it("covers preventive at preventive rate", () => {
      const result = applyCoverageRules("preventive", 115, DEFAULT_PLAN);
      expect(result.coveragePercent).toBe(100);
      expect(result.insurerPays).toBe(115);
      expect(result.patientCost).toBe(0);
    });
  });

  describe("basic category", () => {
    it("covers basic at 80% for default plan", () => {
      const result = applyCoverageRules("basic", 200, DEFAULT_PLAN);
      expect(result.coveragePercent).toBe(80);
      expect(result.insurerPays).toBe(160);
      expect(result.patientCost).toBe(40);
    });
  });

  describe("major category", () => {
    it("covers major at 50% for default plan", () => {
      const result = applyCoverageRules("major", 1000, DEFAULT_PLAN);
      expect(result.coveragePercent).toBe(50);
      expect(result.insurerPays).toBe(500);
      expect(result.patientCost).toBe(500);
    });
  });

  describe("ortho category", () => {
    it("covers ortho at 50% for default plan", () => {
      const result = applyCoverageRules("ortho", 5800, DEFAULT_PLAN);
      expect(result.coveragePercent).toBe(50);
      // Capped at annual max of 1500
      expect(result.insurerPays).toBe(1500);
      expect(result.patientCost).toBe(4300);
    });
  });

  describe("implant category", () => {
    it("always returns 0% coverage for implants", () => {
      const result = applyCoverageRules("implant", 2800, DEFAULT_PLAN);
      expect(result.coveragePercent).toBe(0);
      expect(result.insurerPays).toBe(0);
      expect(result.patientCost).toBe(2800);
      expect(result.annualMaxNote).toContain("Implants");
    });

    it("excludes implants even with a generous plan", () => {
      const generousPlan: InsurancePlan = {
        ...DEFAULT_PLAN,
        annualMax: 100000,
        majorCoverage: 100,
      };
      const result = applyCoverageRules("implant", 2800, generousPlan);
      expect(result.coveragePercent).toBe(0);
      expect(result.insurerPays).toBe(0);
    });
  });

  describe("annual maximum", () => {
    it("caps insurer payment at annual max", () => {
      const result = applyCoverageRules("major", 5000, DEFAULT_PLAN);
      // 50% of 5000 = 2500, but annual max is 1500
      expect(result.insurerPays).toBe(1500);
      expect(result.patientCost).toBe(3500);
      expect(result.annualMaxNote).toBeDefined();
    });

    it("does not cap when under annual max", () => {
      const result = applyCoverageRules("basic", 200, DEFAULT_PLAN);
      // 80% of 200 = 160, under 1500 max
      expect(result.insurerPays).toBe(160);
      expect(result.annualMaxNote).toBeUndefined();
    });

    it("handles plan with no annual max", () => {
      const noMaxPlan: InsurancePlan = {
        ...DEFAULT_PLAN,
        annualMax: undefined,
      };
      const result = applyCoverageRules("major", 10000, noMaxPlan);
      expect(result.insurerPays).toBe(5000);
      expect(result.annualMaxNote).toBeUndefined();
    });
  });

  describe("rounding", () => {
    it("rounds insurer payment to nearest dollar", () => {
      const plan: InsurancePlan = { ...DEFAULT_PLAN, basicCoverage: 80 };
      const result = applyCoverageRules("basic", 155, plan);
      // 80% of 155 = 124
      expect(result.insurerPays).toBe(124);
      expect(result.patientCost).toBe(31);
    });
  });
});

describe("getPlanFromInsurerName", () => {
  it("returns default plan for unknown insurer", () => {
    const plan = getPlanFromInsurerName("Unknown Insurance Co");
    expect(plan.insurerName).toBe("Unknown Insurance Co");
    expect(plan.preventiveCoverage).toBe(DEFAULT_PLAN.preventiveCoverage);
    expect(plan.basicCoverage).toBe(DEFAULT_PLAN.basicCoverage);
    expect(plan.annualMax).toBe(DEFAULT_PLAN.annualMax);
  });

  it("returns Sun Life defaults", () => {
    const plan = getPlanFromInsurerName("Sun Life Financial");
    expect(plan.insurerName).toBe("Sun Life Financial");
    expect(plan.annualMax).toBe(1500);
  });

  it("returns Canada Life defaults with higher annual max", () => {
    const plan = getPlanFromInsurerName("Canada Life");
    expect(plan.annualMax).toBe(2000);
  });

  it("returns Green Shield with 60% major coverage", () => {
    const plan = getPlanFromInsurerName("Green Shield Canada");
    expect(plan.majorCoverage).toBe(60);
    expect(plan.annualMax).toBe(2000);
  });

  it("returns OTIP with high major coverage and annual max", () => {
    const plan = getPlanFromInsurerName("OTIP/RAEO");
    expect(plan.majorCoverage).toBe(80);
    expect(plan.orthoCoverage).toBe(60);
    expect(plan.annualMax).toBe(3000);
  });

  it("returns Empire Life with no ortho coverage", () => {
    const plan = getPlanFromInsurerName("Empire Life");
    expect(plan.orthoCoverage).toBe(0);
    expect(plan.annualMax).toBe(1000);
  });

  it("is case-insensitive", () => {
    const plan1 = getPlanFromInsurerName("MANULIFE");
    const plan2 = getPlanFromInsurerName("manulife");
    expect(plan1.basicCoverage).toBe(plan2.basicCoverage);
    expect(plan1.annualMax).toBe(plan2.annualMax);
  });

  it("trims whitespace", () => {
    const plan = getPlanFromInsurerName("  Blue Cross  ");
    expect(plan.majorCoverage).toBe(60);
    expect(plan.annualMax).toBe(2000);
  });
});

describe("INSURER_DEFAULTS", () => {
  it("has all expected Canadian insurers", () => {
    const expectedInsurers = [
      "sun life financial",
      "manulife",
      "canada life",
      "green shield canada",
      "desjardins",
      "otip/raeo",
      "empire life",
      "blue cross",
    ];
    for (const insurer of expectedInsurers) {
      expect(INSURER_DEFAULTS[insurer]).toBeDefined();
    }
  });

  it("all insurers have preventive coverage at 100%", () => {
    for (const [, plan] of Object.entries(INSURER_DEFAULTS)) {
      expect(plan.preventiveCoverage).toBe(100);
    }
  });

  it("all insurers have basic coverage at 80%", () => {
    for (const [, plan] of Object.entries(INSURER_DEFAULTS)) {
      expect(plan.basicCoverage).toBe(80);
    }
  });
});

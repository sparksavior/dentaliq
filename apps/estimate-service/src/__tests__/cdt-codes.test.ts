import { describe, it, expect } from "vitest";
import {
  CDT_DATABASE,
  getCdtCode,
  getAllCdtCodes,
  getCdtCodesByCategory,
  type ProcedureCategory,
} from "../data/cdt-codes";

describe("CDT_DATABASE", () => {
  it("contains codes across all categories", () => {
    const categories = new Set(
      Object.values(CDT_DATABASE).map((c) => c.category),
    );
    expect(categories).toContain("diagnostic");
    expect(categories).toContain("preventive");
    expect(categories).toContain("basic");
    expect(categories).toContain("major");
    expect(categories).toContain("ortho");
    expect(categories).toContain("implant");
  });

  it("has matching key and code field for each entry", () => {
    for (const [key, code] of Object.entries(CDT_DATABASE)) {
      expect(code.code).toBe(key);
    }
  });

  it("all fees are positive numbers", () => {
    for (const code of Object.values(CDT_DATABASE)) {
      expect(code.typicalFee).toBeGreaterThan(0);
    }
  });

  it("all frequency limits are positive when present", () => {
    for (const code of Object.values(CDT_DATABASE)) {
      if (code.frequencyLimitMonths !== undefined) {
        expect(code.frequencyLimitMonths).toBeGreaterThan(0);
      }
    }
  });
});

describe("getCdtCode", () => {
  it("returns code by exact key", () => {
    const code = getCdtCode("D0120");
    expect(code).toBeDefined();
    expect(code!.description).toContain("Periodic oral evaluation");
  });

  it("is case-insensitive", () => {
    const code = getCdtCode("d0120");
    expect(code).toBeDefined();
    expect(code!.code).toBe("D0120");
  });

  it("returns undefined for unknown code", () => {
    expect(getCdtCode("D9999")).toBeUndefined();
    expect(getCdtCode("")).toBeUndefined();
  });
});

describe("getAllCdtCodes", () => {
  it("returns all codes as an array", () => {
    const codes = getAllCdtCodes();
    expect(codes.length).toBe(Object.keys(CDT_DATABASE).length);
    expect(codes.length).toBeGreaterThan(40);
  });
});

describe("getCdtCodesByCategory", () => {
  it("filters codes by category", () => {
    const diagnostic = getCdtCodesByCategory("diagnostic");
    expect(diagnostic.length).toBeGreaterThan(0);
    expect(diagnostic.every((c) => c.category === "diagnostic")).toBe(true);
  });

  it("returns empty array for category with no codes", () => {
    const codes = getCdtCodesByCategory("nonexistent" as ProcedureCategory);
    expect(codes).toEqual([]);
  });

  const categories: ProcedureCategory[] = [
    "diagnostic",
    "preventive",
    "basic",
    "major",
    "ortho",
    "implant",
  ];
  for (const cat of categories) {
    it(`has at least one ${cat} code`, () => {
      expect(getCdtCodesByCategory(cat).length).toBeGreaterThan(0);
    });
  }
});

describe("CDT code clinical properties", () => {
  it("D2750 (PFM crown) requires xray and pre-auth", () => {
    const code = getCdtCode("D2750")!;
    expect(code.requiresXray).toBe(true);
    expect(code.requiresPreAuth).toBe(true);
    expect(code.category).toBe("major");
  });

  it("D0120 (periodic eval) does not require xray or pre-auth", () => {
    const code = getCdtCode("D0120")!;
    expect(code.requiresXray).toBe(false);
    expect(code.requiresPreAuth).toBe(false);
    expect(code.frequencyLimitMonths).toBe(6);
  });

  it("D6010 (implant) is categorized as implant", () => {
    const code = getCdtCode("D6010")!;
    expect(code.category).toBe("implant");
    expect(code.requiresPreAuth).toBe(true);
  });

  it("D8080 (ortho adolescent) is categorized as ortho", () => {
    const code = getCdtCode("D8080")!;
    expect(code.category).toBe("ortho");
    expect(code.typicalFee).toBe(5800);
  });

  it("D1110 (adult cleaning) has 6 month frequency limit", () => {
    const code = getCdtCode("D1110")!;
    expect(code.category).toBe("preventive");
    expect(code.frequencyLimitMonths).toBe(6);
  });
});

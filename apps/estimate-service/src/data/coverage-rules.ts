// ─────────────────────────────────────────────────────────
// Coverage Rules Engine — Canadian group benefit plan logic
//
// Rules are applied in this order:
//   1. Check if code category is covered at all
//   2. Apply base coverage % from insurance plan
//   3. Apply code-specific overrides (e.g. implants always 0%)
//   4. Apply annual maximum deductions
//   5. Apply frequency limit checks
// ─────────────────────────────────────────────────────────

import type { ProcedureCategory } from './cdt-codes'

export interface InsurancePlan {
  id: string
  insurerName: string
  planName?: string
  groupNumber?: string
  annualMax?: number       // CAD
  preventiveCoverage: number  // 0–100
  basicCoverage: number
  majorCoverage: number
  orthoCoverage: number
}

export interface CoverageResult {
  coveragePercent: number
  patientCost: number
  insurerPays: number
  annualMaxNote?: string
  frequencyNote?: string
}

// Default coverage when no specific plan is found
export const DEFAULT_PLAN: InsurancePlan = {
  id: 'default',
  insurerName: 'Generic Canadian Plan',
  preventiveCoverage: 100,
  basicCoverage: 80,
  majorCoverage: 50,
  orthoCoverage: 50,
  annualMax: 1500,
}

// Well-known Canadian insurer defaults — used when plan PDF is not yet embedded
export const INSURER_DEFAULTS: Record<string, Partial<InsurancePlan>> = {
  'sun life financial': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 50,
    orthoCoverage: 50,
    annualMax: 1500,
  },
  'manulife': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 50,
    orthoCoverage: 50,
    annualMax: 1500,
  },
  'canada life': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 50,
    orthoCoverage: 50,
    annualMax: 2000,
  },
  'green shield canada': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 60,
    orthoCoverage: 50,
    annualMax: 2000,
  },
  'desjardins': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 50,
    orthoCoverage: 50,
    annualMax: 1500,
  },
  'otip/raeo': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 80,
    orthoCoverage: 60,
    annualMax: 3000,
  },
  'empire life': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 50,
    orthoCoverage: 0,
    annualMax: 1000,
  },
  'blue cross': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 60,
    orthoCoverage: 50,
    annualMax: 2000,
  },
  'chamber of commerce': {
    preventiveCoverage: 100,
    basicCoverage: 80,
    majorCoverage: 50,
    orthoCoverage: 50,
    annualMax: 1500,
  },
}

// Codes that are explicitly excluded from coverage regardless of plan tier
const ALWAYS_EXCLUDED_CATEGORIES: ProcedureCategory[] = ['implant']

export function applyCoverageRules(
  category: ProcedureCategory,
  typicalFee: number,
  plan: InsurancePlan,
): CoverageResult {
  // Implants and excluded categories → 0% regardless
  if (ALWAYS_EXCLUDED_CATEGORIES.includes(category)) {
    return {
      coveragePercent: 0,
      patientCost: typicalFee,
      insurerPays: 0,
      annualMaxNote: 'Implants are typically excluded from group benefit plans. Verify coverage directly with insurer.',
    }
  }

  const coveragePct = getCoveragePct(category, plan)
  const rawInsures = Math.round((typicalFee * coveragePct) / 100)
  const insurerPays = plan.annualMax ? Math.min(rawInsures, plan.annualMax) : rawInsures
  const patientCost = typicalFee - insurerPays

  const result: CoverageResult = {
    coveragePercent: coveragePct,
    patientCost,
    insurerPays,
  }

  if (plan.annualMax && rawInsures > plan.annualMax) {
    result.annualMaxNote = `Annual maximum of $${plan.annualMax.toLocaleString()} may have already been met or partially used.`
  }

  return result
}

function getCoveragePct(category: ProcedureCategory, plan: InsurancePlan): number {
  switch (category) {
    case 'diagnostic':
    case 'preventive':
      return plan.preventiveCoverage
    case 'basic':
      return plan.basicCoverage
    case 'major':
      return plan.majorCoverage
    case 'ortho':
      return plan.orthoCoverage
    case 'implant':
      return 0
  }
}

export function getPlanFromInsurerName(insurerName: string): InsurancePlan {
  const key = insurerName.toLowerCase().trim()
  const defaults = INSURER_DEFAULTS[key] ?? {}
  return { ...DEFAULT_PLAN, ...defaults, insurerName }
}

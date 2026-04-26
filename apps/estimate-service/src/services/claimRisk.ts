// ─────────────────────────────────────────────────────────
// Claim Risk Detector — pre-submission checklist
//
// Returns a risk level + list of actionable reasons.
// Rules-based: no LLM needed, runs in <1ms.
// ─────────────────────────────────────────────────────────

import type { ClaimRisk } from '@dentaliq/types'
import type { CdtCode } from '../data/cdt-codes'
import type { InsurancePlan } from '../data/coverage-rules'

export interface RiskAssessment {
  risk: ClaimRisk
  reasons: string[]
  confidence: number   // 0–1, how confident we are in the estimate
}

interface RiskInput {
  code: CdtCode
  plan: InsurancePlan
  patientAge?: number
  codesOnSameVisit?: string[]  // other CDT codes billed on the same date
}

// Pairs of codes that frequently cause rejections when billed together
const CONFLICTING_PAIRS: Array<[string, string, string]> = [
  ['D1110', 'D4910', 'Prophylaxis (D1110) and periodontal maintenance (D4910) should not be billed on the same visit.'],
  ['D0120', 'D0150', 'Periodic exam (D0120) and comprehensive exam (D0150) should not be billed together.'],
  ['D3310', 'D7140', 'Root canal (D33xx) and extraction of the same tooth on the same date is contradictory — insurers will reject.'],
  ['D3320', 'D7140', 'Root canal (D33xx) and extraction of the same tooth on the same date is contradictory — insurers will reject.'],
  ['D3330', 'D7140', 'Root canal (D33xx) and extraction of the same tooth on the same date is contradictory — insurers will reject.'],
  ['D2750', 'D2391', 'Crown and filling on the same tooth on the same date will typically be rejected.'],
  ['D2750', 'D2392', 'Crown and filling on the same tooth on the same date will typically be rejected.'],
  ['D2750', 'D2393', 'Crown and filling on the same tooth on the same date will typically be rejected.'],
]

// Codes with known high rejection rates industry-wide
const HIGH_REJECTION_CODES = new Set(['D6010', 'D6012', 'D6056', 'D6059', 'D6065', 'D8090'])

// Codes that require an X-ray to be attached to the claim
const XRAY_REQUIRED_CODES = new Set([
  'D2750', 'D2720', 'D2740', 'D3310', 'D3320', 'D3330',
  'D3346', 'D3347', 'D3348', 'D4341', 'D4342',
  'D7220', 'D7230', 'D7240',
])

export function assessClaimRisk(input: RiskInput): RiskAssessment {
  const { code, plan, patientAge, codesOnSameVisit = [] } = input
  const reasons: string[] = []
  let riskScore = 0

  // 1. Pre-auth required but not flagged
  if (code.requiresPreAuth) {
    reasons.push(`Pre-authorization is required for ${code.code} — submit request to ${plan.insurerName} before treatment.`)
    riskScore += 30
  }

  // 2. X-ray required for claim
  if (code.requiresXray || XRAY_REQUIRED_CODES.has(code.code)) {
    reasons.push(`Radiograph required — attach current X-ray (taken within 6 months) to the claim.`)
    riskScore += 15
  }

  // 3. High rejection category
  if (HIGH_REJECTION_CODES.has(code.code)) {
    reasons.push(`${code.code} has a high baseline rejection rate — verify patient plan documents explicitly cover this procedure.`)
    riskScore += 40
  }

  // 4. Implant category → explicitly excluded
  if (code.category === 'implant') {
    reasons.push(`Implants are excluded from most group benefit plans. Obtain written confirmation of coverage before proceeding.`)
    riskScore += 50
  }

  // 5. Zero ortho coverage
  if (code.category === 'ortho' && plan.orthoCoverage === 0) {
    reasons.push(`${plan.insurerName} plan shows 0% orthodontic coverage. Confirm lifetime ortho maximum hasn't been exhausted.`)
    riskScore += 40
  }

  // 6. Adult ortho — many plans exclude
  if (code.code === 'D8090') {
    reasons.push(`Adult orthodontics (D8090) is excluded from many Canadian group plans. Verify before proceeding.`)
    riskScore += 20
  }

  // 7. Age-based rules
  if (patientAge !== undefined) {
    if (code.code === 'D1120' && patientAge >= 13) {
      reasons.push(`D1120 (child prophylaxis) is typically only covered for patients under 13. Consider D1110 for adults.`)
      riskScore += 25
    }
    if (code.code === 'D1351' && patientAge >= 18) {
      reasons.push(`Sealants (D1351) are typically only covered for patients under 18.`)
      riskScore += 20
    }
    if (code.category === 'ortho' && patientAge >= 18) {
      reasons.push(`Adult orthodontic coverage varies significantly by plan — confirm benefits before starting treatment.`)
      riskScore += 15
    }
  }

  // 8. Conflicting code combinations
  for (const [codeA, codeB, reason] of CONFLICTING_PAIRS) {
    if (
      (code.code === codeA && codesOnSameVisit.includes(codeB)) ||
      (code.code === codeB && codesOnSameVisit.includes(codeA))
    ) {
      reasons.push(reason)
      riskScore += 35
    }
  }

  // 9. High fee — likely near or over annual max
  if (plan.annualMax && code.typicalFee > plan.annualMax * 0.6) {
    reasons.push(`Procedure fee ($${code.typicalFee}) represents more than 60% of the plan's annual maximum ($${plan.annualMax.toLocaleString()}). Verify remaining annual balance before billing.`)
    riskScore += 10
  }

  const risk: ClaimRisk =
    riskScore >= 50 ? 'high' :
    riskScore >= 20 ? 'medium' :
    'low'

  const confidence = Math.max(0.4, Math.min(0.95, 1 - riskScore / 150))

  return { risk, reasons, confidence }
}

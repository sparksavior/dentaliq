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
  confidence: number
}

export interface RiskInput {
  code: CdtCode
  plan: InsurancePlan
  patientAge?: number
  codesOnSameVisit?: string[]
  serviceDate?: string // ISO date string, defaults to today
}

// ─────────────────────────────────────────────────────────
// Data-Driven Rules Matrix
// In Phase 3, this array is loaded directly from PostgreSQL (t_tenant_risk_rules).
// This enables dynamic updates for CDCP or provincial fee guides without code changes.
// ─────────────────────────────────────────────────────────

type RuleType = 'conflict' | 'exclusion' | 'age_limit' | 'xray_required' | 'high_risk' | 'custom'

interface RiskRule {
  id: string
  type: RuleType
  description: string
  effectiveDate: string
  expirationDate: string | null
  riskWeight: number
  conditions: {
    targetCodes?: string[]        // Codes this rule applies to
    conflictingCodes?: string[]   // Codes that cannot be billed on the same visit
    minAge?: number
    maxAge?: number
    excludedCategories?: string[]
    insurers?: string[]           // If empty, applies to all
  }
}

const REGULATORY_RULES: RiskRule[] = [
  {
    id: 'rule_conflict_cleaning',
    type: 'conflict',
    description: 'Prophylaxis (D1110) and periodontal maintenance (D4910) cannot be billed on the same visit.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 35,
    conditions: { targetCodes: ['D1110'], conflictingCodes: ['D4910'] }
  },
  {
    id: 'rule_conflict_exams',
    type: 'conflict',
    description: 'Periodic exam (D0120) and comprehensive exam (D0150) should not be billed together.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 35,
    conditions: { targetCodes: ['D0120'], conflictingCodes: ['D0150'] }
  },
  {
    id: 'rule_conflict_endo_ext',
    type: 'conflict',
    description: 'Root canal and extraction of the same tooth on the same date is contradictory.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 45,
    conditions: { targetCodes: ['D3310', 'D3320', 'D3330'], conflictingCodes: ['D7140'] }
  },
  {
    id: 'rule_cdcp_fluoride',
    type: 'age_limit',
    description: 'Fluoride (D1208) is typically covered only for patients under 18 under modern regulations.',
    effectiveDate: '2024-05-01', // Example: CDCP phase 1 launch date
    expirationDate: null,
    riskWeight: 20,
    conditions: { targetCodes: ['D1208'], maxAge: 17 }
  },
  {
    id: 'rule_child_prophy',
    type: 'age_limit',
    description: 'Child prophylaxis (D1120) is typically only covered for patients under 13.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 25,
    conditions: { targetCodes: ['D1120'], maxAge: 12 }
  },
  {
    id: 'rule_sealants',
    type: 'age_limit',
    description: 'Sealants (D1351) are typically covered for patients under 18 only.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 20,
    conditions: { targetCodes: ['D1351'], maxAge: 17 }
  },
  {
    id: 'rule_implant_exclusion',
    type: 'exclusion',
    description: 'Implants are excluded from most group benefit plans. Obtain written confirmation.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 50,
    conditions: { excludedCategories: ['implant'] }
  },
  {
    id: 'rule_adult_ortho',
    type: 'exclusion',
    description: 'Adult orthodontics (D8090) is excluded from many Canadian group plans.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 20,
    conditions: { targetCodes: ['D8090'] }
  },
  {
    id: 'rule_high_rejection_codes',
    type: 'high_risk',
    description: 'This code has a high baseline rejection rate — verify plan documents explicitly cover it.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 40,
    conditions: { targetCodes: ['D6010', 'D6012', 'D6056', 'D6059', 'D6065'] }
  },
  {
    id: 'rule_xray_required',
    type: 'xray_required',
    description: 'Radiograph required — attach current X-ray (taken within 6 months) to the claim.',
    effectiveDate: '2010-01-01',
    expirationDate: null,
    riskWeight: 15,
    conditions: { targetCodes: ['D2750', 'D2720', 'D2740', 'D3310', 'D3320', 'D3330', 'D4341', 'D7240'] }
  }
]

export function assessClaimRisk(input: RiskInput): RiskAssessment {
  const { code, plan, patientAge, codesOnSameVisit = [] } = input
  const serviceDate = input.serviceDate ? new Date(input.serviceDate) : new Date()
  
  const reasons: string[] = []
  let riskScore = 0

  // 1. Built-in hard requirements
  if (code.requiresPreAuth) {
    reasons.push(`Pre-authorization is required for ${code.code} — submit request to ${plan.insurerName} before treatment.`)
    riskScore += 30
  }
  
  if (code.category === 'ortho' && plan.orthoCoverage === 0) {
    reasons.push(`${plan.insurerName} plan shows 0% orthodontic coverage. Confirm lifetime maximum hasn't been exhausted.`)
    riskScore += 40
  }

  // 2. Evaluate Dynamic Rules Matrix
  for (const rule of REGULATORY_RULES) {
    // Versioning Check: Skip if rule is not active on serviceDate
    const effective = new Date(rule.effectiveDate)
    if (serviceDate < effective) continue
    if (rule.expirationDate) {
      const expired = new Date(rule.expirationDate)
      if (serviceDate >= expired) continue
    }

    // Insurer Check
    if (rule.conditions.insurers && rule.conditions.insurers.length > 0) {
      if (!rule.conditions.insurers.includes(plan.insurerName)) continue
    }

    let isTriggered = false

    // Target Codes / Categories
    const matchesTargetCode = rule.conditions.targetCodes?.includes(code.code)
    const matchesCategory = rule.conditions.excludedCategories?.includes(code.category)

    if (rule.type === 'conflict' && matchesTargetCode) {
      isTriggered = rule.conditions.conflictingCodes?.some(c => codesOnSameVisit.includes(c)) ?? false
    } 
    else if (rule.type === 'age_limit' && matchesTargetCode && patientAge !== undefined) {
      if (rule.conditions.maxAge !== undefined && patientAge > rule.conditions.maxAge) isTriggered = true
      if (rule.conditions.minAge !== undefined && patientAge < rule.conditions.minAge) isTriggered = true
    }
    else if (rule.type === 'exclusion') {
      if (matchesTargetCode || matchesCategory) isTriggered = true
      // Extra age check for adult ortho
      if (code.code === 'D8090' && patientAge !== undefined && patientAge < 18) {
        isTriggered = false // Exemption for minors
      }
    }
    else if ((rule.type === 'high_risk' || rule.type === 'xray_required') && matchesTargetCode) {
      isTriggered = true
    }

    if (isTriggered) {
      reasons.push(rule.description)
      riskScore += rule.riskWeight
    }
  }

  // 3. High fee ratio check
  if (plan.annualMax && code.typicalFee > plan.annualMax * 0.6) {
    reasons.push(`Procedure fee ($${code.typicalFee}) represents >60% of the plan's annual maximum ($${plan.annualMax.toLocaleString()}). Verify remaining balance.`)
    riskScore += 10
  }

  const risk: ClaimRisk =
    riskScore >= 50 ? 'high' :
    riskScore >= 20 ? 'medium' :
    'low'

  const confidence = Math.max(0.4, Math.min(0.95, 1 - riskScore / 150))

  return { risk, reasons, confidence }
}

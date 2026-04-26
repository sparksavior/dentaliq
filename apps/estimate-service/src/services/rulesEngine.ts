// ─────────────────────────────────────────────────────────
// Rules Engine — orchestrates coverage + risk + LLM
// ─────────────────────────────────────────────────────────

import { createId } from '@paralleldrive/cuid2'
import { createLogger } from '@dentaliq/logger'
import { getCdtCode } from '../data/cdt-codes'
import { applyCoverageRules, getPlanFromInsurerName } from '../data/coverage-rules'
import { assessClaimRisk } from './claimRisk'
import { generateExplanation } from './llmExplainer'
import type { EstimateRequest, EstimateResult } from '@dentaliq/types'

const logger = createLogger('rules-engine')

export interface FullEstimateRequest extends EstimateRequest {
  insurerName: string      // free-text insurer name from request
  patientAge?: number
  codesOnSameVisit?: string[]
  skipLlm?: boolean        // true in tests or if caller wants rules-only
}

export async function runEstimate(req: FullEstimateRequest): Promise<EstimateResult & { id: string }> {
  const code = getCdtCode(req.cdtCode)
  if (!code) {
    throw Object.assign(new Error(`Unknown CDT code: ${req.cdtCode}`), { statusCode: 400 })
  }

  const plan = getPlanFromInsurerName(req.insurerName)
  const coverage = applyCoverageRules(code.category, code.typicalFee, plan)
  const riskAssessment = assessClaimRisk({
    code,
    plan,
    patientAge: req.patientAge,
    codesOnSameVisit: req.codesOnSameVisit,
  })

  let explanation: string
  if (req.skipLlm) {
    explanation = buildFallback(code.description, coverage.coveragePercent, coverage.patientCost, plan.insurerName)
  } else {
    explanation = await generateExplanation({ code, plan, coverage, risk: riskAssessment })
  }

  logger.info(
    { cdtCode: req.cdtCode, risk: riskAssessment.risk, coverage: coverage.coveragePercent },
    'Estimate complete',
  )

  return {
    id: createId(),
    cdtCode: code.code,
    coveragePercent: coverage.coveragePercent,
    patientCost: coverage.patientCost,
    insurerPays: coverage.insurerPays,
    plainExplanation: explanation,
    claimRisk: riskAssessment.risk,
    riskReasons: riskAssessment.reasons,
    confidenceScore: riskAssessment.confidence,
  }
}

function buildFallback(description: string, pct: number, cost: number, insurer: string): string {
  if (pct === 0) return `${description} is not covered — full cost of $${cost} applies.`
  if (pct === 100) return `${description} is fully covered by ${insurer}.`
  return `${insurer} covers ${pct}% of ${description}. Your cost: $${cost}.`
}

// ─────────────────────────────────────────────────────────
// LLM Explainer — plain-language patient explanations
//
// The system prompt is large + static → cached by Claude
// (saves ~75% on input tokens for repeated calls).
// Falls back gracefully to a rule-generated sentence if
// no LLM provider is available.
// ─────────────────────────────────────────────────────────

import { getLLMWithFallback } from '@dentaliq/llm-interface'
import { createLogger } from '@dentaliq/logger'
import type { CdtCode } from '../data/cdt-codes'
import type { InsurancePlan, CoverageResult } from '../data/coverage-rules'
import type { RiskAssessment } from './claimRisk'

const logger = createLogger('llm-explainer')

// This system prompt is sent with cache_control: ephemeral on every Claude call.
// On cache hit (~$0.30/MTok vs $3.00/MTok), this costs ~90% less.
const SYSTEM_PROMPT = `You are DentalIQ, an AI assistant embedded in a Canadian dental practice management platform.
Your job is to generate a clear, friendly, one-to-two sentence explanation of a dental cost estimate for the patient.

Rules:
- Write for the patient, not the dentist. Assume no dental knowledge.
- Always mention: what the procedure is, what their insurance covers, and what they will pay out-of-pocket.
- If pre-authorization is needed, mention it briefly and simply.
- Use plain Canadian English. No jargon.
- Be concise — 1 to 2 sentences maximum.
- Do not include disclaimers, hedge excessively, or mention "AI".
- Round dollar amounts to the nearest dollar.
- Use "you" and "your" to address the patient directly.

Examples of good explanations:
- "Your insurance covers 80% of this filling, so you'll pay approximately $45 out of pocket today."
- "This crown requires pre-approval from your insurer — once approved, your plan covers 50%, leaving you with about $675 to pay."
- "This cleaning is fully covered by your plan, so there's no charge to you."
- "Implants are typically not covered by group dental plans, so the estimated cost of $2,800 would be your full responsibility."

Respond with ONLY the explanation sentence(s). No labels, no JSON, no preamble.`

export interface ExplanationInput {
  code: CdtCode
  plan: InsurancePlan
  coverage: CoverageResult
  risk: RiskAssessment
}

export async function generateExplanation(input: ExplanationInput): Promise<string> {
  try {
    const llm = await getLLMWithFallback()

    const prompt = buildPrompt(input)
    const response = await llm.complete({
      system: SYSTEM_PROMPT,
      prompt,
      maxTokens: 150,
      temperature: 0.3,
    })

    const explanation = response.content.trim()
    logger.debug(
      { code: input.code.code, model: response.model, cacheRead: response.cacheReadTokens },
      'LLM explanation generated',
    )
    return explanation
  } catch (err) {
    logger.warn({ err, code: input.code.code }, 'LLM unavailable — using fallback explanation')
    return buildFallbackExplanation(input)
  }
}

function buildPrompt(input: ExplanationInput): string {
  const { code, plan, coverage, risk } = input
  return [
    `Procedure: ${code.code} — ${code.description}`,
    `Insurer: ${plan.insurerName}`,
    `Coverage: ${coverage.coveragePercent}%`,
    `Insurer pays: $${coverage.insurerPays}`,
    `Patient pays: $${coverage.patientCost}`,
    `Procedure fee: $${code.typicalFee}`,
    risk.reasons.length > 0 ? `Notes: ${risk.reasons[0]}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildFallbackExplanation(input: ExplanationInput): string {
  const { code, plan, coverage } = input

  if (coverage.coveragePercent === 0) {
    return `${code.description} is typically not covered by ${plan.insurerName} plans, so the estimated cost of $${coverage.patientCost.toLocaleString()} would be your full responsibility.`
  }

  if (coverage.coveragePercent === 100) {
    return `Your ${plan.insurerName} plan fully covers this ${code.description.toLowerCase()}, so there is no charge to you today.`
  }

  const preAuthNote = code.requiresPreAuth
    ? ' Pre-authorization from your insurer is required before this treatment.'
    : ''

  return `Your ${plan.insurerName} plan covers ${coverage.coveragePercent}% of this ${code.description.toLowerCase()}, leaving you with an estimated out-of-pocket cost of $${coverage.patientCost.toLocaleString()}.${preAuthNote}`
}

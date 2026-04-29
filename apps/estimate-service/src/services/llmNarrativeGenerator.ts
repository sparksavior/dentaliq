import { getLLMWithFallback } from '@dentaliq/llm-interface'
import { createLogger } from '@dentaliq/logger'
import { getCdtCode } from '../data/cdt-codes'

const logger = createLogger('llm-narrative')

const SYSTEM_PROMPT = `You are a professional dental insurance coordinator writing a pre-authorization narrative letter to an insurance company.
Your goal is to convince the insurance company that the requested dental procedure is medically necessary.

Rules:
1. Write a professional, formal letter.
2. Address it "To the Claims Department,".
3. Be concise but extremely clear about medical necessity.
4. Do not make up patient names or dates, use [Patient Name] if not provided.
5. Emphasize why standard alternative treatments (like fillings) are insufficient and why this major procedure is required.
6. Do not include placeholders for addresses or signatures. End with "Sincerely, The Dental Team".`

export interface NarrativeInput {
  cdtCode: string
  insurerName: string
  patientName?: string
  clinicalNotes?: string
  previousNarrative?: string
  revisionInstructions?: string
}

export async function generateNarrative(input: NarrativeInput): Promise<string> {
  const code = getCdtCode(input.cdtCode)
  if (!code) throw new Error(`Unknown CDT code: ${input.cdtCode}`)

  const patient = input.patientName || 'the patient'
  
  let prompt = ''
  
  if (input.previousNarrative && input.revisionInstructions) {
    prompt = `
You are revising a previously written pre-authorization dental narrative.
Original Narrative:
"""
${input.previousNarrative}
"""

User Revision Instructions:
"""
${input.revisionInstructions}
"""

Please rewrite the narrative letter to incorporate these changes while maintaining a professional, formal tone. Ensure the patient name (${patient}) and procedure (${code.code} - ${code.description}) are still correctly mentioned.
`
  } else {
    prompt = `
Please write a pre-authorization narrative for:
Procedure: ${code.code} - ${code.description}
Insurance: ${input.insurerName}
Patient: ${patient}
Clinical Notes to incorporate (if any): ${input.clinicalNotes || 'Tooth has extensive decay and fractures, standard restorative options are insufficient to restore form and function.'}
`
  }

  try {
    const llm = await getLLMWithFallback()
    const response = await llm.complete({
      system: SYSTEM_PROMPT,
      prompt,
      maxTokens: 300,
      temperature: 0.4,
    })
    
    logger.debug({ code: input.cdtCode }, 'Narrative generated successfully')
    return response.content.trim()
  } catch (err) {
    logger.error({ err }, 'Failed to generate narrative')
    return `To the Claims Department,\n\nWe are submitting a pre-authorization request for procedure ${code.code} (${code.description}) for ${patient}. \n\nThis procedure is medically necessary due to extensive damage that cannot be resolved with basic restorative care. Please review the attached radiographs.\n\nSincerely,\nThe Dental Team`
  }
}

import { getEnv } from '@dentaliq/config'
import { createLogger } from '@dentaliq/logger'
import { OllamaProvider } from './providers/ollama'
import { ClaudeProvider } from './providers/claude'

// ─────────────────────────────────────────────────────────
// DentalIQ — LLM Abstraction Layer
//
// Priority:
//   1. Explicit provider in request
//   2. LLM_PROVIDER env var (default: ollama)
//   3. Auto-fallback: if ollama unavailable → claude
//
// Usage:
//   const llm = getLLM()
//   const res = await llm.complete({ prompt: '...', system: '...' })
//   for await (const chunk of llm.stream({ prompt: '...' })) { ... }
// ─────────────────────────────────────────────────────────

export interface CompletionRequest {
  prompt: string
  system?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface CompletionResponse {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  durationMs?: number
}

export interface StreamChunk {
  text: string
  done: boolean
}

export interface LLMProvider {
  readonly name: string
  complete(req: CompletionRequest): Promise<CompletionResponse>
  stream(req: CompletionRequest): AsyncGenerator<StreamChunk>
  isAvailable(): Promise<boolean>
}

const logger = createLogger('llm-interface')

let _providers: Map<string, LLMProvider> | undefined

function getProviders(): Map<string, LLMProvider> {
  if (_providers) return _providers
  _providers = new Map([
    ['ollama', new OllamaProvider()],
    ['claude', new ClaudeProvider()],
  ])
  return _providers
}

export function getLLM(preferredProvider?: string): LLMProvider {
  const env = getEnv()
  const name = preferredProvider ?? env.LLM_PROVIDER
  const providers = getProviders()

  const provider = providers.get(name)
  if (!provider) throw new Error(`Unknown LLM provider: ${name}. Available: ${[...providers.keys()].join(', ')}`)

  return provider
}

export async function getLLMWithFallback(): Promise<LLMProvider> {
  const env = getEnv()
  const providers = getProviders()

  const primary = providers.get(env.LLM_PROVIDER)
  if (primary && await primary.isAvailable()) return primary

  logger.warn({ primary: env.LLM_PROVIDER }, 'Primary LLM provider unavailable, trying fallback')

  // Fallback order: ollama → claude
  const fallbackOrder = ['ollama', 'claude'].filter((n) => n !== env.LLM_PROVIDER)
  for (const name of fallbackOrder) {
    const fb = providers.get(name)
    if (fb && await fb.isAvailable()) {
      logger.info({ fallback: name }, 'Using fallback LLM provider')
      return fb
    }
  }

  throw new Error('No LLM providers available. Start Ollama or set ANTHROPIC_API_KEY.')
}

export { OllamaProvider, ClaudeProvider }

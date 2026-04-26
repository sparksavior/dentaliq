import { getEnv } from '@dentaliq/config'
import type { LLMProvider, CompletionRequest, CompletionResponse, StreamChunk } from '../index'

// ─────────────────────────────────────────────────────────
// Ollama provider — local inference, zero API cost
// Requires: ollama running at OLLAMA_BASE_URL (default: http://localhost:11434)
// ─────────────────────────────────────────────────────────

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama'
  private baseUrl: string
  private model: string

  constructor() {
    const env = getEnv()
    this.baseUrl = env.OLLAMA_BASE_URL
    this.model = env.OLLAMA_MODEL
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const body = {
      model: req.model ?? this.model,
      prompt: buildPrompt(req),
      stream: false,
      options: {
        temperature: req.temperature ?? 0.2,
        num_predict: req.maxTokens ?? 1024,
      },
    }

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Ollama error ${res.status}: ${text}`)
    }

    const data = await res.json() as OllamaGenerateResponse
    return {
      content: data.response,
      model: data.model,
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
      durationMs: Math.round((data.total_duration ?? 0) / 1_000_000),
    }
  }

  async *stream(req: CompletionRequest): AsyncGenerator<StreamChunk> {
    const body = {
      model: req.model ?? this.model,
      prompt: buildPrompt(req),
      stream: true,
      options: { temperature: req.temperature ?? 0.2 },
    }

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok || !res.body) throw new Error(`Ollama stream error ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        const chunk = JSON.parse(line) as OllamaStreamChunk
        yield { text: chunk.response, done: chunk.done }
        if (chunk.done) return
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3_000) })
      return res.ok
    } catch {
      return false
    }
  }
}

function buildPrompt(req: CompletionRequest): string {
  if (!req.system) return req.prompt
  return `${req.system}\n\n${req.prompt}`
}

interface OllamaGenerateResponse {
  model: string
  response: string
  done: boolean
  prompt_eval_count?: number
  eval_count?: number
  total_duration?: number
}

interface OllamaStreamChunk {
  response: string
  done: boolean
}

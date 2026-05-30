import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
} from "../index";

// ─────────────────────────────────────────────────────────
// Anthropic Claude provider — cloud inference with caching
// Uses prompt caching for system prompts (saves ~75% on repeat calls)
// Default model: claude-haiku-4-5-20251001 (fast + cheap for insurance lookups)
// Upgrade to claude-sonnet-4-6 for complex claim analysis
// ─────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-haiku-4-5-20251001"; // fast + cheap for insurance lookups; upgrade to claude-sonnet-4-6 for complex analysis

export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = req.model ?? DEFAULT_MODEL;
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: req.prompt },
    ];

    // Enable prompt caching for the system prompt — CDT rules are large + static
    const systemBlocks: any[] = req.system
      ? [
          {
            type: "text",
            text: req.system,
            cache_control: { type: "ephemeral" },
          },
        ]
      : [];

    const response = await this.client.messages.create({
      model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.2,
      system: systemBlocks.length ? systemBlocks : undefined,
      messages,
    });

    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      content,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: (response.usage as any).cache_read_input_tokens ?? 0,
      cacheWriteTokens:
        (response.usage as any).cache_creation_input_tokens ?? 0,
    };
  }

  async *stream(req: CompletionRequest): AsyncGenerator<StreamChunk> {
    const model = req.model ?? DEFAULT_MODEL;
    const systemBlocks: any[] = req.system
      ? [
          {
            type: "text",
            text: req.system,
            cache_control: { type: "ephemeral" },
          },
        ]
      : [];

    const stream = await this.client.messages.stream({
      model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.2,
      system: systemBlocks.length ? systemBlocks : undefined,
      messages: [{ role: "user", content: req.prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { text: event.delta.text, done: false };
      }
    }
    yield { text: "", done: true };
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }
}

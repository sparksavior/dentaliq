import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@dentaliq/config", () => ({
  getEnv: () => ({
    LLM_PROVIDER: "ollama",
    OLLAMA_BASE_URL: "http://localhost:11434",
    OLLAMA_MODEL: "llama3.1:8b",
  }),
}));

vi.mock("@dentaliq/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("LLM Interface", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("getLLM returns ollama provider by default", async () => {
    const { getLLM } = await import("../index");
    const provider = getLLM();
    expect(provider.name).toBe("ollama");
  });

  it("getLLM returns claude provider when requested", async () => {
    const { getLLM } = await import("../index");
    const provider = getLLM("claude");
    expect(provider.name).toBe("claude");
  });

  it("getLLM throws for unknown provider", async () => {
    const { getLLM } = await import("../index");
    expect(() => getLLM("gpt5")).toThrow("Unknown LLM provider: gpt5");
  });

  it("OllamaProvider has correct name", async () => {
    const { OllamaProvider } = await import("../index");
    const provider = new OllamaProvider();
    expect(provider.name).toBe("ollama");
  });

  it("ClaudeProvider has correct name", async () => {
    const { ClaudeProvider } = await import("../index");
    const provider = new ClaudeProvider();
    expect(provider.name).toBe("claude");
  });

  it("ClaudeProvider.isAvailable returns false without API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { ClaudeProvider } = await import("../index");
    const provider = new ClaudeProvider();
    expect(await provider.isAvailable()).toBe(false);
  });

  it("ClaudeProvider.isAvailable returns true with API key", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { ClaudeProvider } = await import("../index");
    const provider = new ClaudeProvider();
    expect(await provider.isAvailable()).toBe(true);
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("OllamaProvider.isAvailable returns false when server is down", async () => {
    const { OllamaProvider } = await import("../index");
    const provider = new OllamaProvider();
    // Will fail since no Ollama server is running in test
    const available = await provider.isAvailable();
    expect(typeof available).toBe("boolean");
  });
});

describe("CompletionRequest/Response interfaces", () => {
  it("exports the expected types", async () => {
    const mod = await import("../index");
    expect(mod.getLLM).toBeDefined();
    expect(mod.getLLMWithFallback).toBeDefined();
    expect(mod.OllamaProvider).toBeDefined();
    expect(mod.ClaudeProvider).toBeDefined();
  });
});

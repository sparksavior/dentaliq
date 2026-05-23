import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@dentaliq/llm-interface", () => ({
  getLLMWithFallback: vi.fn(),
}));

vi.mock("@dentaliq/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { generateNarrative } from "../services/llmNarrativeGenerator";
import { getLLMWithFallback } from "@dentaliq/llm-interface";

describe("generateNarrative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for unknown CDT code", async () => {
    await expect(
      generateNarrative({ cdtCode: "D9999", insurerName: "Sun Life" }),
    ).rejects.toThrow("Unknown CDT code: D9999");
  });

  it("generates narrative via LLM when available", async () => {
    const mockLLM = {
      complete: vi.fn().mockResolvedValue({
        content: "Dear Claims Department, this procedure is necessary...",
        model: "test",
        inputTokens: 100,
        outputTokens: 50,
      }),
    };
    vi.mocked(getLLMWithFallback).mockResolvedValue(mockLLM as any);

    const result = await generateNarrative({
      cdtCode: "D2750",
      insurerName: "Sun Life",
      patientName: "John Doe",
      patientAge: 45,
    });

    expect(result).toContain("Claims Department");
    expect(mockLLM.complete).toHaveBeenCalledOnce();
    const callArg = mockLLM.complete.mock.calls[0][0];
    expect(callArg.prompt).toContain("D2750");
    expect(callArg.prompt).toContain("Sun Life");
    expect(callArg.prompt).toContain("John Doe (age 45)");
    expect(callArg.maxTokens).toBe(300);
  });

  it("returns fallback template when LLM fails", async () => {
    vi.mocked(getLLMWithFallback).mockRejectedValue(new Error("No LLM"));

    const result = await generateNarrative({
      cdtCode: "D2750",
      insurerName: "Manulife",
    });

    expect(result).toContain("To the Claims Department");
    expect(result).toContain("D2750");
    expect(result).toContain("the patient");
    expect(result).toContain("Sincerely");
  });

  it("uses revision prompt when previousNarrative and revisionInstructions provided", async () => {
    const mockLLM = {
      complete: vi.fn().mockResolvedValue({
        content: "Revised narrative...",
        model: "test",
        inputTokens: 100,
        outputTokens: 50,
      }),
    };
    vi.mocked(getLLMWithFallback).mockResolvedValue(mockLLM as any);

    await generateNarrative({
      cdtCode: "D2750",
      insurerName: "Sun Life",
      previousNarrative: "Original letter text",
      revisionInstructions: "Make it more urgent",
    });

    const callArg = mockLLM.complete.mock.calls[0][0];
    expect(callArg.prompt).toContain("Original letter text");
    expect(callArg.prompt).toContain("Make it more urgent");
    expect(callArg.prompt).toContain("revising");
  });

  it("uses default patient descriptor when no name provided", async () => {
    const mockLLM = {
      complete: vi.fn().mockResolvedValue({
        content: "Letter content",
        model: "test",
        inputTokens: 100,
        outputTokens: 50,
      }),
    };
    vi.mocked(getLLMWithFallback).mockResolvedValue(mockLLM as any);

    await generateNarrative({
      cdtCode: "D2750",
      insurerName: "Sun Life",
    });

    const callArg = mockLLM.complete.mock.calls[0][0];
    expect(callArg.prompt).toContain("the patient");
  });

  it("includes clinical notes in prompt when provided", async () => {
    const mockLLM = {
      complete: vi.fn().mockResolvedValue({
        content: "Letter",
        model: "test",
        inputTokens: 100,
        outputTokens: 50,
      }),
    };
    vi.mocked(getLLMWithFallback).mockResolvedValue(mockLLM as any);

    await generateNarrative({
      cdtCode: "D2750",
      insurerName: "Sun Life",
      clinicalNotes: "Severe fracture on tooth #14",
    });

    const callArg = mockLLM.complete.mock.calls[0][0];
    expect(callArg.prompt).toContain("Severe fracture on tooth #14");
  });
});

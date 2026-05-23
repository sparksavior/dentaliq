import { describe, it, expect, vi } from "vitest";
import { CycleEventBus } from "@dentaliq/agent-core";
import type { AgentContext } from "@dentaliq/agent-core";

vi.mock("@dentaliq/db", () => ({
  getDb: () => ({
    all: vi.fn().mockResolvedValue([]),
    insert: vi
      .fn()
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  }),
  agentTasks: { name: "agent_tasks" },
}));

vi.mock("@dentaliq/llm-interface", () => ({
  getLLMWithFallback: vi.fn().mockRejectedValue(new Error("No LLM")),
}));

import { recallAgent } from "../agents/RecallAgent";

describe("RecallAgent", () => {
  it("has correct agent definition", () => {
    expect(recallAgent.id).toBe("recall");
    expect(recallAgent.name).toBe("Recall Agent");
    expect(recallAgent.version).toBe("1.0.0");
    expect(recallAgent.priority).toBe(30);
    expect(recallAgent.triggers).toContain("overdue_hygiene_patients");
    expect(recallAgent.emits).toContain("patient_recalled");
  });

  it("returns 0 tasks when no overdue patients exist", async () => {
    const bus = new CycleEventBus();
    const ctx: AgentContext = {
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      tablePrefix: "t_test",
      db: null,
      llm: null,
      emit: (type, payload) =>
        bus.emit(type, "recall", "tenant-1", "clinic-1", payload),
      getEvents: (type) => bus.getEvents(type),
    };

    const result = await recallAgent.run(ctx);
    expect(result.tasksCreated).toBe(0);
  });

  it("uses hygienist events when available", async () => {
    const bus = new CycleEventBus();
    // Simulate HygienistAgent emitting overdue patients
    bus.emit("overdue_hygiene_patients", "hygienist", "tenant-1", "clinic-1", {
      patients: [],
    });

    const ctx: AgentContext = {
      tenantId: "tenant-1",
      clinicId: "clinic-1",
      tablePrefix: "t_test",
      db: null,
      llm: null,
      emit: (type, payload) =>
        bus.emit(type, "recall", "tenant-1", "clinic-1", payload),
      getEvents: (type) => bus.getEvents(type),
    };

    const result = await recallAgent.run(ctx);
    expect(result.tasksCreated).toBe(0);
  });
});

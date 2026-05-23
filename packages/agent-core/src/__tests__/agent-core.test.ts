import { describe, it, expect, beforeEach } from "vitest";
import {
  CycleEventBus,
  AgentRegistry,
  type AgentDefinition,
  type AgentContext,
} from "../index";

describe("CycleEventBus", () => {
  let bus: CycleEventBus;

  beforeEach(() => {
    bus = new CycleEventBus();
  });

  it("starts with no events", () => {
    expect(bus.all()).toEqual([]);
    expect(bus.getEvents("anything")).toEqual([]);
  });

  it("emits and retrieves events by type", () => {
    bus.emit("patient_recalled", "recall", "tenant-1", "clinic-1", {
      patientIds: ["p1"],
    });
    bus.emit("high_risk", "billing", "tenant-1", "clinic-1", { count: 3 });
    bus.emit("patient_recalled", "recall", "tenant-1", "clinic-1", {
      patientIds: ["p2"],
    });

    const recalled = bus.getEvents("patient_recalled");
    expect(recalled).toHaveLength(2);
    expect(recalled[0].sourceAgentId).toBe("recall");
    expect(recalled[0].payload).toEqual({ patientIds: ["p1"] });
    expect(recalled[1].payload).toEqual({ patientIds: ["p2"] });

    const highRisk = bus.getEvents("high_risk");
    expect(highRisk).toHaveLength(1);
    expect(highRisk[0].sourceAgentId).toBe("billing");
  });

  it("all() returns a copy", () => {
    bus.emit("test", "agent-1", "t1", "c1", {});
    const allEvents = bus.all();
    expect(allEvents).toHaveLength(1);
    allEvents.push({} as any);
    expect(bus.all()).toHaveLength(1);
  });

  it("includes timestamp on emitted events", () => {
    bus.emit("test", "agent-1", "t1", "c1", {});
    const event = bus.all()[0];
    expect(event.timestamp).toBeDefined();
    expect(new Date(event.timestamp).getTime()).not.toBeNaN();
  });

  it("preserves tenantId and clinicId", () => {
    bus.emit("test", "agent-1", "my-tenant", "my-clinic", { data: true });
    const event = bus.all()[0];
    expect(event.tenantId).toBe("my-tenant");
    expect(event.clinicId).toBe("my-clinic");
  });
});

describe("AgentRegistry", () => {
  let registry: AgentRegistry;

  const makeAgent = (id: string, priority?: number): AgentDefinition => ({
    id,
    name: `${id} Agent`,
    version: "1.0.0",
    priority,
    run: async () => ({ tasksCreated: 0 }),
  });

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it("registers and retrieves agents by id", () => {
    const agent = makeAgent("billing", 20);
    registry.register(agent);

    expect(registry.get("billing")).toBe(agent);
    expect(registry.has("billing")).toBe(true);
    expect(registry.get("nonexistent")).toBeUndefined();
    expect(registry.has("nonexistent")).toBe(false);
  });

  it("returns chained this from register()", () => {
    const result = registry.register(makeAgent("a")).register(makeAgent("b"));
    expect(result).toBe(registry);
    expect(registry.has("a")).toBe(true);
    expect(registry.has("b")).toBe(true);
  });

  it("all() returns agents sorted by priority ascending", () => {
    registry.register(makeAgent("recall", 30));
    registry.register(makeAgent("billing", 20));
    registry.register(makeAgent("review", 40));

    const all = registry.all();
    expect(all.map((a) => a.id)).toEqual(["billing", "recall", "review"]);
  });

  it("defaults priority to 50 for sorting", () => {
    registry.register(makeAgent("low", 10));
    registry.register(makeAgent("default")); // priority undefined → 50
    registry.register(makeAgent("high", 90));

    const all = registry.all();
    expect(all.map((a) => a.id)).toEqual(["low", "default", "high"]);
  });

  it("getOrdered() returns subset sorted by priority", () => {
    registry.register(makeAgent("recall", 30));
    registry.register(makeAgent("billing", 20));
    registry.register(makeAgent("review", 40));
    registry.register(makeAgent("supply", 50));

    const ordered = registry.getOrdered(["review", "billing"]);
    expect(ordered.map((a) => a.id)).toEqual(["billing", "review"]);
  });

  it("getOrdered() skips unknown ids", () => {
    registry.register(makeAgent("billing", 20));
    const ordered = registry.getOrdered(["billing", "nonexistent"]);
    expect(ordered).toHaveLength(1);
    expect(ordered[0].id).toBe("billing");
  });

  it("overwrites agent with same id", () => {
    registry.register(makeAgent("billing", 20));
    const replacement = makeAgent("billing", 10);
    registry.register(replacement);
    expect(registry.get("billing")).toBe(replacement);
  });
});

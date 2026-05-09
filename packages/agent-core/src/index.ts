// ─────────────────────────────────────────────────────────
// @dentaliq/agent-core
//
// Plug-and-play agent primitives for the Cortex platform.
// Agents register themselves; the orchestrator iterates the
// registry in priority order and passes a shared CycleEventBus
// so agents can communicate without direct imports.
// ─────────────────────────────────────────────────────────

export interface AgentEvent {
  type: string;
  sourceAgentId: string;
  tenantId: string;
  clinicId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface AgentContext {
  tenantId: string;
  clinicId: string;
  tablePrefix: string;
  db: any;
  llm: any;
  /** Broadcast an event to other agents in this cycle */
  emit: (type: string, payload: Record<string, unknown>) => void;
  /** Read events emitted earlier in this cycle */
  getEvents: (type: string) => AgentEvent[];
}

export interface AgentResult {
  tasksCreated: number;
}

export interface AgentDefinition {
  id: string;
  name: string;
  version: string;
  /** Lower number = runs earlier in the cycle. Default 50. */
  priority?: number;
  /** Event types this agent emits (documentation only) */
  emits?: string[];
  /** Event types this agent consumes from earlier agents */
  triggers?: string[];
  run: (ctx: AgentContext) => Promise<AgentResult>;
}

// ── CycleEventBus ─────────────────────────────────────────

export class CycleEventBus {
  private events: AgentEvent[] = [];

  emit(
    type: string,
    sourceAgentId: string,
    tenantId: string,
    clinicId: string,
    payload: Record<string, unknown>,
  ): void {
    this.events.push({
      type,
      sourceAgentId,
      tenantId,
      clinicId,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  getEvents(type: string): AgentEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  all(): AgentEvent[] {
    return [...this.events];
  }
}

// ── AgentRegistry ─────────────────────────────────────────

export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();

  register(agent: AgentDefinition): this {
    this.agents.set(agent.id, agent);
    return this;
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }

  /** Returns agents whose IDs are in `ids`, sorted by priority asc. */
  getOrdered(ids: string[]): AgentDefinition[] {
    return ids
      .map((id) => this.agents.get(id))
      .filter((a): a is AgentDefinition => a !== undefined)
      .sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));
  }

  all(): AgentDefinition[] {
    return [...this.agents.values()].sort(
      (a, b) => (a.priority ?? 50) - (b.priority ?? 50),
    );
  }
}

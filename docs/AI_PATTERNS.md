# AI & Agent Patterns

DentalIQ integrates AI at multiple levels — from instant LLM-generated insurance explanations to fully autonomous overnight agents. This document covers the implementation patterns used across the platform.

---

## 1. LLM Provider Strategy

### The `llm-interface` Package

All AI calls go through `packages/llm-interface`, which wraps multiple providers behind a single interface:

```typescript
import { getLLMWithFallback } from '@dentaliq/llm-interface'

const llm = getLLMWithFallback()
const result = await llm.generateText(prompt, systemPrompt)
```

This means switching from Ollama to Claude in production is a single env var change (`LLM_PROVIDER=claude`) — no code changes.

### Automatic Fallback Chain

If the configured provider fails (network error, API key issue, model not loaded), the system automatically tries the next option:

```
Primary (LLM_PROVIDER)
  → Ollama (if localhost:11434 reachable)
    → Claude (if ANTHROPIC_API_KEY set)
      → Static template (always works, rule-based output)
```

The static template fallback means estimates and pre-auth letters always return a result, even if every AI provider is down. Staff see a note indicating the response was generated without AI.

### Supported Providers

| Provider  | `LLM_PROVIDER` value | Key Required        | Recommended For                     |
| --------- | -------------------- | ------------------- | ----------------------------------- |
| Ollama    | `ollama`             | None                | Local dev, privacy-sensitive clinics|
| OpenAI    | `openai`             | `OPENAI_API_KEY`    | Consistent cloud inference          |
| Claude    | `claude`             | `ANTHROPIC_API_KEY` | High-quality, long-context output   |
| Gemini    | `gemini`             | `GOOGLE_API_KEY`    | Alternative cloud option            |

---

## 2. Local LLM with Ollama

### Why Local First

By running inference locally, patient data never leaves the clinic's infrastructure — which directly supports PHIPA compliance obligations. There is no third-party data processing agreement required for Ollama-based deployments.

### Setup (handled by `setup.js`)

```bash
# The setup wizard handles this automatically when you answer "Enable AI? Y"
node setup.js

# Manual setup:
# 1. Install Ollama: https://ollama.com
# 2. Start the daemon:
ollama serve
# 3. Pull the default model (~5 GB, one-time download):
ollama pull llama3.1:8b
```

### Model Selection

| Model          | RAM Needed | Quality   | Speed     | Use Case             |
| -------------- | ---------- | --------- | --------- | -------------------- |
| `llama3.1:8b`  | 8 GB       | Good      | Fast      | Default, dev + prod  |
| `llama3.1:70b` | 40 GB      | Excellent | Slow      | High-accuracy prod   |
| `mistral:7b`   | 8 GB       | Good      | Fast      | Alternative to llama |
| `phi3:mini`    | 4 GB       | Fair      | Very fast | Low-RAM machines     |

Change the model by setting `OLLAMA_MODEL=<model-name>` in `.env`.

### No-AI Mode

If AI is not needed, simply don't install or run Ollama. Leave `LLM_PROVIDER=ollama` in `.env` — services will detect the connection failure and use the static template fallback. The app functions fully; only AI-generated content (explanations, letters, agent summaries) is unavailable.

---

## 3. Context-Aware AI Copilot (Pro+)

The AI Copilot in the Pro dashboard implements **RAG-like context injection** without a vector database:

### How Context Is Built

When a user opens the chat panel, the frontend collects real-time state:

```typescript
const context = {
  clinicName: clinic.name,
  plan: tenant.plan,
  patientCount: patients.length,
  recentClaims: claims.slice(0, 5),
  highRiskCount: claims.filter(c => c.riskLevel === 'high').length,
  pendingTasks: agentTasks.filter(t => t.status === 'pending').length,
  // ...
}
```

This context is serialized and injected into the LLM's **system prompt**:

```typescript
const systemPrompt = `
You are DentalIQ Assistant for ${context.clinicName}.
Current status: ${context.patientCount} patients, 
${context.highRiskCount} high-risk claims pending review,
${context.pendingTasks} Cortex tasks awaiting approval.
...
`
```

This allows the copilot to give specific, actionable answers ("You have 3 high-risk claims that need pre-auth letters this week") rather than generic responses.

### Why No Vector DB

The clinic's relevant context fits within a single LLM context window (~10K tokens). A full vector database would add operational complexity without measurable benefit at this scale. The pattern is revisited once a clinic's data grows beyond what fits in one prompt.

---

## 4. Pre-Authorization Narrative Generation

### Pattern: Task-Specific Zero-Shot Prompting

When a dentist requests a pre-auth letter, the `estimate-service` constructs a highly specific prompt:

```typescript
const prompt = `
Write a formal dental pre-authorization request letter for the following procedure.
Write in the style of a Canadian dental clinic addressing a Canadian insurer.
Be medically accurate and use the correct CDT code terminology.

Procedure: ${cdt.code} — ${cdt.description}
Patient: ${patient.firstName} ${patient.lastName}, Age ${patient.age}
Insurer: ${claim.insurerName}
Clinical notes: ${claim.clinicalNotes || 'Not provided'}
`
```

### Human-in-the-Loop Review

The generated narrative is **never submitted automatically**. It is:

1. Returned to the browser in an editable `<textarea>`
2. Reviewed and modified by the dentist
3. Saved to the estimate record only when the dentist explicitly saves
4. Optionally exported to PDF or copied into their PMS

This design means the LLM is a drafting assistant, not an automated submitter.

---

## 5. Autonomous Agent Architecture (Cortex)

### The Agent Base Class (`packages/agent-core`)

Every Cortex agent extends `BaseAgent`:

```typescript
export abstract class BaseAgent {
  abstract name: string
  abstract codename: string

  abstract scan(tenantId: string): Promise<AgentTask[]>
  // scan() reads tenant data and returns proposed tasks

  async run(tenantId: string): Promise<void> {
    const tasks = await this.scan(tenantId)
    for (const task of tasks) {
      await createAgentTask({ ...task, status: 'pending', tenantId })
    }
  }
}
```

Each agent implements `scan()` — it queries the database, decides what actions are worth proposing, calls the LLM to draft the action content, and returns structured task objects.

### The Agent Manager (`apps/agent-manager`)

Responsibilities:
- **Cron scheduler**: Runs all active agents at 2:00 AM daily via `node-cron`
- **Manual trigger API**: `POST /scan` and `POST /scan/:tenantId` for development/testing
- **Task status API**: `GET /tasks/:tenantId` for the Approval Inbox UI
- **Approval handler**: `PATCH /tasks/:id` — updates status, triggers downstream execution on approval

### Approval Execution

When a task is approved, the agent manager routes the task to its execution handler:

```
BillingAgent task approved → email/export the pre-auth letter
RecallAgent task approved  → queue the SMS/email via emailService
ReviewAgent task approved  → send the review request message
SupplyAgent task approved  → flag the shortage in the supplies view
```

Execution handlers are intentionally conservative — they produce artifacts (letters, messages) or internal flags, not direct external API calls in v1.

### Task Data Model

```typescript
interface AgentTask {
  id: string
  tenantId: string
  agentName: string       // 'BillingAgent', 'RecallAgent', etc.
  agentCodename: string   // 'CORTEX-01', 'CORTEX-02', etc.
  title: string           // Short description shown in inbox
  description: string     // Full generated content (letter, message, etc.)
  metadata: Record<string, unknown>  // Patient ID, CDT code, etc.
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
  resolvedAt?: Date
  resolvedBy?: string     // userId of the staff member who acted
}
```

---

## 6. Prompt Engineering Guidelines

When adding new AI features or modifying existing prompts:

### Be Specific About Output Format

```typescript
// ✅ Good — tells the model exactly what to produce
const prompt = `
Write a 3-paragraph pre-authorization letter. 
Paragraph 1: medical necessity. 
Paragraph 2: clinical findings. 
Paragraph 3: requested authorization and contact.
Do not include salutations or sign-offs — the clinic will add those.
`

// ❌ Bad — too vague
const prompt = `Write a pre-auth letter for this patient.`
```

### Include Canadian Context

All dental prompts should specify Canadian context to avoid US-centric insurance terminology:

```typescript
systemPrompt = `
You assist a Canadian dental clinic. 
Use Canadian spelling (e.g., "favour", "colour"). 
Reference CDCP (Canadian Dental Care Plan) where relevant, not US Medicare/Medicaid.
`
```

### Test the Static Fallback

Every feature using the LLM must have a static fallback. Test it by setting `OLLAMA_BASE_URL=http://localhost:9999` (unreachable) to verify the app degrades gracefully.

---

## 7. LLM Latency Expectations

| Operation                   | Provider         | Typical Latency |
| --------------------------- | ---------------- | --------------- |
| Insurance explanation        | Ollama 8b        | 3–8 seconds     |
| Insurance explanation        | Claude / OpenAI  | 1–3 seconds     |
| Pre-auth letter (full)       | Ollama 8b        | 15–45 seconds   |
| Pre-auth letter (full)       | Claude / OpenAI  | 5–10 seconds    |
| Agent task generation (each) | Ollama 8b        | 5–20 seconds    |
| Agent task generation (each) | Claude / OpenAI  | 2–5 seconds     |

Ollama latency depends heavily on available RAM and whether the model fits in VRAM. On Apple Silicon (M-series), `llama3.1:8b` typically lands in the faster range above.

For production deployments requiring fast AI responses, use a cloud provider (`LLM_PROVIDER=claude` or `LLM_PROVIDER=openai`).

# AI & Agent Patterns

DentalIQ heavily leverages Artificial Intelligence, moving from simple text-generation to full autonomous agent orchestration. This document outlines the patterns used.

## 1. Local LLM Strategy (Ollama)

To ensure strict compliance with HIPAA/PHIPA regulations regarding Patient Health Information (PHI), DentalIQ defaults to using a local LLM via [Ollama](https://ollama.com/).

- **Model Selection**: We default to `phi3` or `llama3` for fast, local inference.
- **Data Privacy**: By running the model locally on the clinic's server or a secure private cloud, patient data never leaves the network, eliminating the risk of third-party API data leaks.
- **Implementation**: The `setup.js` script in the root directory ensures the Ollama daemon is running and the correct model is pulled before the application starts.

## 2. Generative UI (Copilot)

The Pro tier includes an "AI Copilot". This isn't just a generic chatbot; it implements a **Context-Aware RAG (Retrieval-Augmented Generation)** pattern.

- **Context Injection**: When the user opens the chat, the frontend aggregates local state (current clinic, recent patients, high-risk claims count) and injects it into the system prompt.
- **Dynamic Responses**: The AI can reference specific patients or operational bottlenecks dynamically because it has been fed the current dashboard state.

## 3. Task-Specific Generation (Pre-Auth Narratives)

In the Claims and Estimates views, users can generate "Pre-Authorization Narratives".

- **Pattern**: Zero-shot or Few-shot prompting.
- **Execution**: The `estimate-service` takes the CDT Code, Patient Name, and Insurer, and constructs a highly specific prompt asking the LLM to write a formal medical justification letter.
- **Human-in-the-Loop**: The generated text is presented in an editable `textarea` so the dentist can review and modify the clinical reasoning before saving or exporting to PDF.

## 4. Autonomous Agents (Cortex Architecture)

The most advanced implementation is the **Cortex Agent System**, managed by `apps/agent-manager`.

### The Agent Lifecycle

1. **Instantiation**: A clinic "hires" an agent (e.g., Billing Agent). The `agent-manager` registers a new worker process for this tenant.
2. **Polling/Event Listening**: The agent monitors the tenant's data stream (e.g., watching for newly created high-risk estimates without a pre-auth letter).
3. **Execution**: The agent autonomously contacts the LLM to generate the required asset or make a decision.
4. **Approval Inbox (Human-in-the-Loop)**: Rather than executing destructive or external actions directly (like sending an email or submitting a claim), the agent creates a "Task" in the `Approval Inbox`.
5. **Resolution**: The clinic administrator reviews the Inbox, clicks "Approve", and the system executes the final action.

### The Command Center UI

To build trust in the autonomous system, the Cortex Command Center provides a "Live Terminal". This uses a real-time event stream (or simulated frontend polling) to display exactly what the agents are "thinking" and "doing" in the background, creating a transparent and highly engaging user experience.

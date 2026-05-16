# DentalIQ Platform Documentation

Welcome to the DentalIQ developer documentation. DentalIQ is a multi-tenant, AI-powered SaaS platform for dental clinics — providing intelligent insurance estimation, autonomous AI agents (Cortex), and a full clinic management dashboard.

## Documentation Index

### 1. [System Architecture](./ARCHITECTURE.md)

Deep-dive into the monorepo structure, service topology, data flow, database schema, authentication architecture, and Cortex agent lifecycle. Start here if you're onboarding to the codebase.

### 2. [Platform Features](./FEATURES.md)

Complete breakdown of the four pricing tiers (Starter, Pro, Cortex, Enterprise), feature gating, the Demo Engine, Stripe billing, Cortex agent roster, and analytics.

### 3. [AI & Agent Patterns](./AI_PATTERNS.md)

How AI is integrated across the platform: the `llm-interface` package, automatic provider fallback chain, local Ollama setup, context-aware AI Copilot, pre-auth narrative generation, and autonomous agent architecture.

---

## Getting Started

If you're setting up the project for the first time, run the interactive setup wizard:

```bash
git clone <repo-url>
cd dentaliq
node setup.js
```

The wizard will:
1. Ask if you want AI features enabled
2. Check Node.js version and install pnpm if needed
3. Create `.env` from `.env.example` with auto-generated secrets
4. Start Mailpit (email preview UI) via Docker
5. Install and start Ollama + pull the AI model (if AI enabled)
6. Run `pnpm install` and `pnpm db:push`
7. Seed the database with demo data
8. Launch `pnpm dev`

For full documentation including production deployment, environment variables, and troubleshooting, see the root [README.md](../README.md).

---

## Design Principles

1. **Human-in-the-loop AI** — Agents propose, humans approve. No automated actions without explicit staff approval.

2. **Privacy by default** — Defaults to local Ollama inference. Patient data never leaves the clinic's infrastructure unless you explicitly configure a cloud LLM.

3. **Graceful degradation** — Every AI feature has a working non-AI fallback. The platform is fully functional without any LLM running.

4. **Single database, shared schema** — One `dentaliq.db` file in development. Same Drizzle schema targets PostgreSQL in production with no code changes.

5. **No build step for packages** — Internal packages run TypeScript directly via `tsx`. No compiled artifacts to maintain.

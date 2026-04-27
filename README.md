# DentalIQ — Phase 2

AI Insurance Copilot for Dental Clinics.

This project uses a monorepo setup with Turborepo, Fastify microservices, and a Next.js React frontend. It leverages local, privacy-first LLMs via Ollama to ensure patient data (PHI) never leaves the server.

## Features Implemented
- **Multi-tenant Architecture:** Fastify services (`auth-service`, `tenant-service`, `estimate-service`) backed by SQLite.
- **Data-Driven Rules Engine:** Versioned, deterministic CDT code calculation based on patient age and insurance logic.
- **LLM Explanation Layer:** Deterministic math is passed to an AI to generate patient-friendly plain text explanations.
- **AI Narrative Generator:** Generates legally-sound pre-authorization narratives for major procedures.
- **Smart Patient Dashboard:** Comboboxes, real-time fetching, patient CRUD.

## Quick start for new users

### 1. Install Dependencies
You need Node 20+ and `pnpm`.
```bash
npm install -g pnpm
pnpm install
```

### 2. Setup Ollama (Local LLM)
To ensure HIPAA/PIPEDA compliance, we run the Phi-3 model locally.
1. Download and install [Ollama](https://ollama.com/).
2. Pull the model and leave it running:
```bash
ollama run phi3
```

### 3. Setup the Environment
```bash
cp .env.example .env
# Ensure you update JWT_SECRET in .env if running in production
```

### 4. Start all services
Open a new terminal tab and run:
```bash
pnpm dev
```

### 5. Access the app
Open your browser to: [http://localhost:3000](http://localhost:3000)
- Register a new clinic from the login page, then navigate to the Dashboard.

## Services

| Service | Port | Description |
|---|---|---|
| `apps/web` | 3000 | Next.js frontend Dashboard |
| `apps/auth-service` | 3001 | JWT, MFA, RBAC |
| `apps/tenant-service` | 3002 | Clinic provisioning & Patient CRUD |
| `apps/estimate-service` | 3004 | Rules engine, AI Narratives, Ollama integration |

## Tech stack
- **Runtime**: Node.js 20, TypeScript
- **Framework**: Fastify
- **Database**: SQLite (local dev) + Drizzle ORM
- **Auth**: JWT
- **Build**: Turborepo + pnpm workspaces
- **LLM**: Ollama (Phi-3) + Claude fallback

## Phase roadmap
- ✅ **Phase 1** — Foundation (Auth, Tenants)
- ✅ **Phase 2** — Insurance engine + LLM service + AI Narratives
- ⬜ **Phase 3** — Open Dental connector + Vector RAG
- ⬜ **Phase 4** — Cloud Deployment

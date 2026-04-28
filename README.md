# DentalIQ — AI Insurance Copilot

AI-powered cost estimates, claim risk detection, and pre-authorization drafting for Ontario dental clinics. Built as a PHIPA-compliant microservices monorepo.

> **Branch:** `release/phase-2` — Multi-clinic management, AI copilot, interactive landing page, 5-step onboarding wizard.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [What's New in Phase 2](#whats-new-in-phase-2)
3. [Folder Structure](#folder-structure)
4. [Running Locally](#running-locally)
5. [Environment Variables](#environment-variables)
6. [Service Ports](#service-ports)
7. [API Reference](#api-reference)
8. [Dashboard Features](#dashboard-features)
9. [Frontend Pages](#frontend-pages)
10. [Architecture](#architecture)
11. [Database](#database)
12. [AI / LLM Integration](#ai--llm-integration)
13. [Shared Packages](#shared-packages)
14. [Useful Commands](#useful-commands)
15. [Troubleshooting](#troubleshooting)

---

## Project Overview

DentalIQ is a full-stack TypeScript monorepo targeting Ontario dental clinics. It provides:

- **Real-time cost estimates** — enter a CDT code + insurer, get coverage %, patient cost, and insurer payout instantly
- **Claim risk detection** — LOW / MEDIUM / HIGH risk scoring with explanations
- **Pre-auth narrative drafting** — AI-generated pre-authorization letters via local Ollama LLM
- **Patient & insurance management** — per-tenant isolated data
- **Multi-clinic support** — manage multiple locations from one dashboard
- **5-step onboarding wizard** — account creation, email verify, PMS connect, MFA setup, done
- **PHIPA compliance** — data stored in Canada, AES-256 encryption, full audit logs, RBAC

**Stack:** Next.js 16 · Fastify · SQLite + Drizzle ORM · Ollama (local LLM) · Turborepo · pnpm workspaces

---

## What's New in Phase 2

| Feature | Description |
|---|---|
| **Multi-clinic management** | Add/edit/delete clinic locations per tenant with per-location dashboards |
| **Interactive landing page** | Marketing page with live feature demos, pricing cards, security badges |
| **5-step signup wizard** | Account → Verify Email → Connect PMS → MFA Setup → Dashboard |
| **AI Copilot** | Chat-style AI assistant powered by local Ollama (phi3 or llama3.2) |
| **Claim notifications** | Real-time approval/denial/pre-auth notification feed |
| **Dashboard overhaul** | KPI stat cards, recent activity feed, quick action shortcuts |
| **MFA (TOTP)** | Two-factor authentication with QR code + backup codes |
| **Estimate Service** | Full rules engine with 64 CDT codes, coverage rules, risk assessment |

---

## Folder Structure

```
dentaliq/
├── apps/
│   ├── web/                        # Next.js frontend (port 3000)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx            # Marketing landing page
│   │       │   ├── globals.css         # Global styles
│   │       │   ├── layout.tsx          # Root layout
│   │       │   ├── (auth)/
│   │       │   │   ├── login/          # Login page
│   │       │   │   └── signup/         # 5-step onboarding wizard
│   │       │   └── (dashboard)/
│   │       │       ├── layout.tsx      # Dashboard sidebar + nav
│   │       │       └── dashboard/      # Main dashboard overview
│   │       ├── contexts/
│   │       │   └── auth-context.tsx    # JWT auth context provider
│   │       └── lib/
│   │           └── api.ts             # API client (auth, patients, estimates)
│   │
│   ├── auth-service/               # Fastify auth API (port 3001)
│   │   └── src/
│   │       ├── index.ts            # Server entrypoint
│   │       ├── routes/
│   │       │   ├── auth.ts         # Register, login, refresh, logout, password reset
│   │       │   ├── users.ts        # User profile, tenant user list, role management
│   │       │   └── mfa.ts          # TOTP setup, verify, disable, backup codes
│   │       ├── controllers/
│   │       │   ├── authController.ts
│   │       │   └── mfaController.ts
│   │       ├── middleware/
│   │       │   └── requireAuth.ts  # JWT verification middleware
│   │       └── scripts/
│   │           └── seed-demo.ts    # Seeds demo clinic + admin user
│   │
│   ├── tenant-service/             # Fastify tenant API (port 3002)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── routes/
│   │       │   ├── tenants.ts          # Clinic settings, PMS connections, usage
│   │       │   ├── patients.ts         # Patient CRUD (tenant-isolated)
│   │       │   ├── clinics.ts          # Multi-location clinic management
│   │       │   └── insurance-plans.ts  # Insurance plan templates
│   │       └── middleware/
│   │           └── requireAuth.ts
│   │
│   └── estimate-service/           # Fastify estimate API (port 3004)
│       └── src/
│           ├── index.ts
│           ├── routes/
│           │   └── estimate.ts     # Cost estimates, narratives, CDT codes, history
│           ├── services/
│           │   ├── rulesEngine.ts           # Coverage rules orchestrator
│           │   ├── claimRisk.ts             # Risk assessment engine
│           │   ├── llmExplainer.ts          # AI-powered estimate explanations
│           │   └── llmNarrativeGenerator.ts # Pre-auth letter generator
│           ├── middleware/
│           │   └── requireAuth.ts
│           └── data/
│               ├── cdt-codes.ts        # 64 CDT procedure code definitions
│               └── coverage-rules.ts   # Insurer coverage rule definitions
│
├── packages/
│   ├── config/                     # Env variable schema & validation (Zod)
│   ├── db/                         # Drizzle ORM client + schema (SQLite/Postgres)
│   ├── logger/                     # Structured logging (Pino)
│   ├── llm-interface/              # LLM abstraction (Ollama / Claude fallback)
│   └── types/                      # Shared TypeScript types
│
├── infra/docker/                   # Docker init scripts
├── docker-compose.yml              # Local dev stack (Postgres, Redis, Ollama, Mailpit)
├── setup.js                        # First-time setup script
├── turbo.json                      # Turborepo pipeline
├── pnpm-workspace.yaml
└── .env.example                    # Environment variable template
```

---

## Running Locally

### Prerequisites

- **Node.js 20+** — check with `node --version`
- **pnpm 9+** — install: `npm install -g pnpm@9`
- **Ollama** *(optional)* — for AI features: [ollama.com](https://ollama.com) or `brew install ollama`

> **Note:** Docker is optional. The default setup uses SQLite (no Docker needed). Docker is only required if you want Postgres, Redis, or Mailpit.

### Option A — Automated setup (recommended)

```bash
node setup.js
```

This will:
1. Check Node.js & pnpm versions
2. Create `.env` from `.env.example`
3. Install all dependencies via `pnpm install`
4. Start Docker services if Docker is available
5. Push database schema via Drizzle

Then start everything:

```bash
pnpm dev
```

### Option B — Manual setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and configure env
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET to a random 32+ char string

# 3. Start all services
pnpm dev
```

### Option C — Frontend only (no backend needed)

```bash
pnpm install
cp .env.example .env
cd apps/web && pnpm dev
```

Opens at `http://localhost:3000`. API calls won't work, but you can browse the UI.

### Seed demo data (optional)

After services are running:

```bash
pnpm seed
```

This creates:
- **Clinic:** Riverside Dental Group
- **Admin login:** `demo@dentaliq.dev` / `Demo1234!`
- **Insurance plans:** Sun Life, Manulife, Canada Life, Green Shield

### AI features (optional)

Install and start Ollama, then pull a model:

```bash
# Start the Ollama server
ollama serve

# Pull a lightweight model (~2GB) — recommended for local dev
ollama pull phi3

# Alternative: larger model (~4.7GB) for better quality
# ollama pull llama3.2:3b
# ollama pull llama3.1:8b
```

Update `OLLAMA_MODEL` in `.env` to match whichever model you pulled:

```env
OLLAMA_MODEL=phi3
```

The estimate service falls back to static templates if Ollama is unavailable — nothing breaks without it.

### Stopping all services

```bash
# Stop pnpm dev: press Ctrl+C in the terminal

# Stop Docker containers (if running):
pnpm docker:down
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Key variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | **Must be 32+ chars — change before running** | `change-me-...` |
| `DB_TYPE` | `sqlite` (no Docker) or `postgres` | `sqlite` |
| `DATABASE_PATH` | SQLite file path (when DB_TYPE=sqlite) | `dentaliq.db` |
| `DATABASE_URL` | Postgres connection string (when DB_TYPE=postgres) | — |
| `OLLAMA_BASE_URL` | Local Ollama server | `http://localhost:11434` |
| `OLLAMA_MODEL` | LLM model to use | `phi3` |
| `LLM_PROVIDER` | `ollama` \| `openai` \| `claude` \| `gemini` | `ollama` |
| `AUTH_PORT` | Auth service port | `3001` |
| `TENANT_PORT` | Tenant service port | `3002` |
| `ESTIMATE_PORT` | Estimate service port | `3004` |
| `EMAIL_MODE` | `console` (prints to terminal) or `smtp` | `console` |
| `SMTP_HOST` | SMTP server (use Mailpit for dev) | `localhost` |
| `NEXT_PUBLIC_API_URL` | Auth service URL for frontend | `http://localhost:3001` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |

---

## Service Ports

| Service | Port | URL |
|---|---|---|
| Next.js Web | 3000 | http://localhost:3000 |
| Auth Service | 3001 | http://localhost:3001 |
| Tenant Service | 3002 | http://localhost:3002 |
| Estimate Service | 3004 | http://localhost:3004 |
| Postgres | 5432 | — |
| Redis | 6379 | — |
| Mailpit (dev email) | 8025 | http://localhost:8025 |
| Ollama (LLM) | 11434 | http://localhost:11434 |
| pgAdmin (optional) | 5050 | http://localhost:5050 |

---

## API Reference

### Auth Service — `http://localhost:3001`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account + tenant + send verification email |
| POST | `/auth/login` | — | Issue JWT + refresh token (MFA supported) |
| POST | `/auth/refresh` | — | Rotate access token from refresh cookie |
| POST | `/auth/logout` | — | Revoke refresh token + clear cookie |
| POST | `/auth/verify-email` | — | Confirm email with token |
| POST | `/auth/forgot-password` | — | Send password reset email |
| POST | `/auth/reset-password` | — | Reset password with token |
| POST | `/auth/mfa/setup` | ✅ | Generate TOTP secret + QR code + backup codes |
| POST | `/auth/mfa/verify` | ✅ | Verify TOTP code and enable MFA |
| POST | `/auth/mfa/disable` | ✅ | Disable MFA (requires password + code) |
| GET | `/users/me` | ✅ | Get current user profile |
| GET | `/users` | ✅ admin | List all users in tenant |
| PATCH | `/users/:id/role` | ✅ admin | Change user role |
| GET | `/health` | — | Service status |

**Registration body:**
```json
{
  "name": "Dr. Sarah Chen",
  "email": "sarah@clinic.ca",
  "password": "SecurePass123!",
  "clinicName": "Lakeview Dental",
  "plan": "pro"
}
```

**Login body:**
```json
{
  "email": "sarah@clinic.ca",
  "password": "SecurePass123!",
  "totpCode": "123456"  // only if MFA enabled
}
```

### Tenant Service — `http://localhost:3002`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tenants/me` | ✅ | Get current tenant details + member count |
| PATCH | `/tenants/me` | ✅ admin | Update clinic name |
| GET | `/tenants/me/usage` | ✅ | API usage metrics |
| POST | `/tenants/me/pms` | ✅ | Connect PMS (open_dental, dentrix, cleardent) |
| DELETE | `/tenants/me/pms` | ✅ | Disconnect PMS |
| GET | `/patients` | ✅ | List all patients (tenant-isolated) |
| POST | `/patients` | ✅ | Create patient |
| PATCH | `/patients/:id` | ✅ | Update patient |
| DELETE | `/patients/:id` | ✅ | Delete patient |
| GET | `/clinics` | ✅ | List clinic locations |
| POST | `/clinics` | ✅ | Create clinic location |
| PATCH | `/clinics/:id` | ✅ | Update clinic location |
| DELETE | `/clinics/:id` | ✅ | Delete clinic location |
| GET | `/insurance-plans` | ✅ | List insurance plan templates |
| POST | `/insurance-plans` | ✅ | Create insurance plan |
| PATCH | `/insurance-plans/:id` | ✅ | Update insurance plan |
| DELETE | `/insurance-plans/:id` | ✅ | Delete insurance plan |
| GET | `/health` | — | Service status |

### Estimate Service — `http://localhost:3004`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/estimate` | ✅ | CDT code + insurer → coverage %, patient cost, risk score, AI explanation |
| POST | `/estimate/narrative` | ✅ | Generate pre-auth letter from CDT code via LLM |
| GET | `/estimate/codes` | ✅ | List all 64 CDT codes with categories, fees, pre-auth flags |
| GET | `/estimate/history` | ✅ | Last 50 estimates for this tenant |
| GET | `/health` | — | Service status + LLM provider + CDT codes loaded |

**Estimate request body:**
```json
{
  "cdtCode": "D2750",
  "insurerName": "Sun Life",
  "patientAge": 45,
  "skipLlm": false
}
```

**Estimate response:**
```json
{
  "id": "clx...",
  "cdtCode": "D2750",
  "coveragePercent": 80,
  "patientCost": 190,
  "insurerPays": 760,
  "claimRisk": "low",
  "riskReasons": ["Standard procedure, well-covered"],
  "confidenceScore": 0.92,
  "plainExplanation": "Sun Life covers 80% of Crown — Porcelain..."
}
```

---

## Dashboard Features

The dashboard at `/dashboard` includes:

**Overview**
- Stat cards: Total Patients, Estimates This Month, Revenue Recovered, High-Risk Claims
- Recent activity feed (last 8 estimates with CDT code, risk level, coverage %, cost)
- Quick action shortcuts (Run estimate, Add patient, Review claims, Settings)
- Getting started banner for new clinics

**Cost Estimator**
- CDT code search/select from 64 procedures
- Insurer dropdown (Sun Life, Manulife, Canada Life, Green Shield)
- Returns: coverage %, insurer payout, patient cost, claim risk (LOW/MEDIUM/HIGH), AI explanation

**Patient Directory**
- Add, edit, search, delete patients
- Assign insurance plans per patient

**Claims Tracking**
- Filter by status (pending / approved / denied)
- Pre-auth requirements and claim timeline

**Clinic Settings**
- Clinic name and address
- PMS integration (Open Dental, Dentrix, Cleardent)
- Team members and role management
- Usage limits and plan info

**Multi-Clinic Management**
- Add and manage multiple clinic locations
- Per-location status (active/inactive)

---

## Frontend Pages

| Route | Description |
|---|---|
| `/` | Marketing landing page with feature demos, pricing, security badges |
| `/login` | Login form with MFA support |
| `/signup` | 5-step onboarding wizard (Account → Verify → PMS → MFA → Done) |
| `/dashboard` | Main dashboard with KPIs, activity, quick actions |
| `/dashboard/estimates` | Cost estimator tool |
| `/dashboard/patients` | Patient directory |
| `/dashboard/claims` | Claims tracking |
| `/dashboard/clinics` | Multi-clinic management |
| `/dashboard/settings` | Clinic settings and integrations |

---

## Architecture

```
Browser (Next.js :3000)
│
├── /                   Marketing landing page (interactive demos)
├── /login              → Auth Service :3001
├── /signup             → Auth Service :3001 (5-step wizard)
└── /dashboard
    ├── Overview         KPI stats from tenant data
    ├── Cost Estimator   → Estimate Service :3004
    │                      ├── Rules Engine (coverage + risk)
    │                      └── Ollama :11434 (explanations + narratives)
    ├── Patients         → Tenant Service :3002
    ├── Claims           → Tenant Service :3002
    ├── Clinics          → Tenant Service :3002
    └── Settings         → Tenant Service :3002 + Auth Service :3001
```

### Data Flow — Cost Estimate

```
Frontend → POST /estimate → Estimate Service
                              ├── 1. Validate CDT code (64 codes loaded)
                              ├── 2. Look up insurer coverage rules
                              ├── 3. Calculate coverage %, patient cost, insurer pays
                              ├── 4. Assess claim risk (LOW/MEDIUM/HIGH)
                              ├── 5. Generate AI explanation via Ollama (or fallback)
                              ├── 6. Persist to per-tenant estimates table
                              └── 7. Return full result
```

### Authentication Flow

```
Register → Create user + tenant + schema tables → Send verify email
Login    → Verify password → Check MFA → Issue JWT (15m) + Refresh token (7d cookie)
Refresh  → Validate refresh cookie → Rotate both tokens
```

---

## Database

### Default: SQLite (no Docker needed)

By default, DentalIQ uses SQLite via `@libsql/client`. The database file is created automatically at the project root as `dentaliq.db`.

```env
DB_TYPE=sqlite
DATABASE_PATH=dentaliq.db
```

### Optional: PostgreSQL (requires Docker)

```env
DB_TYPE=postgres
DATABASE_URL=postgresql://dentaliq:localdev@localhost:5432/dentaliq
```

Then start the Docker Postgres container:

```bash
pnpm docker:up
```

### Per-Tenant Data Isolation

Each tenant gets its own set of tables prefixed with a schema name:

```
{slug}_patients
{slug}_insurance_plans
{slug}_estimates
{slug}_clinic_locations
```

Core tables (shared):
- `tenants` — clinic organizations
- `users` — user accounts with tenant association
- `audit_logs` — access trail for PHIPA compliance

---

## AI / LLM Integration

DentalIQ uses a local LLM for two features:

1. **Cost estimate explanations** — plain-English explanation of coverage breakdown
2. **Pre-auth narrative drafting** — formal letters to insurance companies

### Supported Models

| Model | Size | Command | Best for |
|---|---|---|---|
| **phi3** (recommended) | ~2 GB | `ollama pull phi3` | Local dev, fast responses |
| llama3.2:3b | ~2 GB | `ollama pull llama3.2:3b` | Good balance |
| llama3.1:8b | ~4.7 GB | `ollama pull llama3.1:8b` | Best quality |

### Configuration

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3
```

### Fallback Chain

The LLM interface supports automatic fallback:

```
Ollama (primary) → Claude API (if ANTHROPIC_API_KEY set) → Static templates
```

If Ollama is not running, the estimate service returns static template responses — AI features degrade gracefully but nothing breaks.

### Running Ollama

```bash
# Install
brew install ollama

# Start server (runs on port 11434)
ollama serve

# Pull model (in a separate terminal)
ollama pull phi3

# Verify
curl http://localhost:11434/api/tags
```

> **Tip:** `ollama run phi3` both downloads the model and opens an interactive chat. The server stays running in the background. Exit the chat with `/bye`.

---

## Shared Packages

| Package | Purpose | Key Export |
|---|---|---|
| `@dentaliq/config` | Zod-validated env schema | `getEnv()` |
| `@dentaliq/db` | Drizzle ORM client + schema (SQLite/Postgres) | `getDb()` |
| `@dentaliq/logger` | Pino structured logger | `createLogger(service)` |
| `@dentaliq/llm-interface` | LLM abstraction with fallback chain | `getLLM()`, `getLLMWithFallback()` |
| `@dentaliq/types` | Shared TypeScript interfaces | `EstimateRequest`, `EstimateResult`, etc. |

### @dentaliq/config

Zod schema validates all environment variables at startup. If any required variable is missing or invalid, the service fails fast with a clear error message listing exactly what's wrong.

### @dentaliq/db

Supports both SQLite (default, zero-config) and PostgreSQL. Toggle with `DB_TYPE` env var. Per-tenant table isolation via dynamic table prefixes.

### @dentaliq/llm-interface

Abstraction layer over LLM providers. Supports:
- `complete()` — single-shot completion
- `stream()` — streaming responses (async generator)
- `isAvailable()` — health check

---

## Useful Commands

```bash
pnpm dev              # Start all services (frontend + 3 backends)
pnpm build            # Build all apps for production
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript type checking
pnpm seed             # Seed demo data (clinic + patients + plans)
pnpm docker:up        # Start Docker services (Postgres, Redis, Mailpit)
pnpm docker:down      # Stop Docker services
pnpm db:push          # Push Drizzle schema to database
pnpm db:migrate       # Run Drizzle migrations

# Run individual services
pnpm turbo run dev --filter=web                      # Frontend only
pnpm turbo run dev --filter=@dentaliq/auth-service   # Auth service only
pnpm turbo run dev --filter=@dentaliq/tenant-service # Tenant service only
```

---

## Troubleshooting

### "JWT_SECRET must be at least 32 characters"

Edit `.env` and replace the default `JWT_SECRET` with a random 32+ character string.

### Drizzle config error: "Invalid enum value 'turso'"

The `drizzle.config.ts` uses the `turso` dialect which requires `drizzle-kit` v0.23+. Run:

```bash
pnpm update drizzle-kit --latest --filter=@dentaliq/db
```

### "Docker not found"

Docker is optional. The default setup uses SQLite — no Docker needed. Just make sure `DB_TYPE=sqlite` in `.env`.

### Ollama not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start it
ollama serve

# Check which models are installed
ollama list
```

### Port already in use

Kill the process using the port:

```bash
lsof -ti:3000 | xargs kill -9   # Frontend
lsof -ti:3001 | xargs kill -9   # Auth service
lsof -ti:3002 | xargs kill -9   # Tenant service
lsof -ti:3004 | xargs kill -9   # Estimate service
```

---

*DentalIQ · Built for Ontario dental clinics · PHIPA compliant · Data stored in Canada*

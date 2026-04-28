# DentalIQ — AI Insurance Copilot

AI-powered cost estimates, claim risk detection, and pre-authorization drafting for Ontario dental clinics. Built as a PHIPA-compliant microservices monorepo.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Running Locally](#running-locally)
4. [Environment Variables](#environment-variables)
5. [Service Ports](#service-ports)
6. [API Reference](#api-reference)
7. [Dashboard Features](#dashboard-features)
8. [Architecture](#architecture)
9. [Shared Packages](#shared-packages)

---

## Project Overview

DentalIQ is a full-stack TypeScript monorepo targeting Ontario dental clinics. It provides:

- **Real-time cost estimates** — enter a CDT code + insurer, get coverage %, patient cost, and insurer payout instantly
- **Claim risk detection** — LOW / MEDIUM / HIGH risk scoring with explanations
- **Pre-auth narrative drafting** — AI-generated pre-authorization letters via local Ollama LLM
- **Patient & insurance management** — per-tenant isolated data
- **Multi-clinic support** — manage multiple locations from one dashboard
- **PHIPA compliance** — data stored in Canada, AES-256 encryption, full audit logs, RBAC

**Stack:** Next.js 16 · Fastify · SQLite + Drizzle ORM · Ollama (local LLM) · Turborepo · pnpm workspaces

---

## Folder Structure

```
dentaliq/
├── apps/
│   ├── web/                        # Next.js frontend (port 3000)
│   │   └── src/app/
│   │       ├── page.tsx            # Marketing landing page
│   │       ├── (auth)/
│   │       │   ├── login/          # Login page
│   │       │   └── signup/         # 5-step onboarding wizard
│   │       └── (dashboard)/
│   │           └── dashboard/      # Main app dashboard
│   │
│   ├── auth-service/               # Fastify auth API (port 3001)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # Register, login, refresh, logout, password reset
│   │   │   │   ├── users.ts        # User profile, tenant user list, role management
│   │   │   │   └── mfa.ts          # TOTP setup, verify, disable, backup codes
│   │   │   ├── controllers/
│   │   │   └── middleware/
│   │   └── scripts/
│   │       └── seed-demo.ts        # Seeds demo clinic + admin user
│   │
│   ├── tenant-service/             # Fastify tenant API (port 3002)
│   │   └── src/routes/
│   │       ├── tenants.ts          # Clinic settings, PMS connections, usage metrics
│   │       ├── patients.ts         # Patient CRUD (tenant-isolated)
│   │       ├── clinics.ts          # Multi-location clinic management
│   │       └── insurance-plans.ts  # Insurance plan templates
│   │
│   └── estimate-service/           # Fastify estimate API (port 3004)
│       └── src/
│           ├── routes/
│           │   └── estimate.ts     # Cost estimates, narratives, CDT codes, history
│           ├── services/
│           │   ├── rulesEngine.ts  # Coverage rules processor
│           │   └── llmNarrativeGenerator.ts  # Pre-auth letter generator
│           └── data/
│               └── cdt-codes.ts    # 64 CDT procedure code definitions
│
├── packages/
│   ├── config/                     # Env variable schema & validation (Zod)
│   ├── db/                         # Drizzle ORM client + schema
│   ├── logger/                     # Structured logging (Pino)
│   ├── llm-interface/              # LLM abstraction (Ollama / Claude / OpenAI)
│   └── types/                      # Shared TypeScript types
│
├── infra/                          # Docker configs
├── docker-compose.yml              # Local dev stack (Postgres, Redis, Mailpit)
├── setup.js                        # First-time setup script
├── turbo.json                      # Turborepo pipeline
└── pnpm-workspace.yaml
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- pnpm 9+ — `npm install -g pnpm@9`
- [Ollama](https://ollama.com) — for AI features

### Option A — Automated setup (recommended)

```bash
node setup.js
```

This will: create `.env`, install dependencies, start Docker services (Postgres, Redis, Mailpit), and run DB migrations.

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

### Option C — Frontend only (no Docker needed)

```bash
pnpm install
cp .env.example .env
cd apps/web && pnpm dev
```

Opens at `http://localhost:3000`. API calls to backend services will not work without the full stack running.

### Seed demo data (optional)

After services are running, seed a demo clinic with patients and estimates:

```bash
cd apps/auth-service && npx tsx scripts/seed-demo.ts
```

This creates:
- Clinic: **Riverside Dental Group**
- Admin login: `demo@dentaliq.dev` / `Demo1234!`
- 4 insurance plans (Sun Life, Manulife, Canada Life, Green Shield)

### AI features (optional)

For cost estimate explanations and pre-auth narrative drafting, pull the LLM model:

```bash
ollama pull llama3.1:8b
```

The estimate service falls back to static templates if Ollama is unavailable.

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key variables to set:

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | Must be 32+ chars — change before running | `change-me-...` |
| `DATABASE_URL` | Postgres connection string | `postgresql://dentaliq:localdev@localhost:5432/dentaliq` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `OLLAMA_BASE_URL` | Local Ollama server | `http://localhost:11434` |
| `OLLAMA_MODEL` | LLM model to use | `llama3.1:8b` |
| `LLM_PROVIDER` | `ollama` \| `openai` \| `claude` | `ollama` |
| `SMTP_HOST` | Email server (use Mailpit in dev) | `localhost` |
| `NEXT_PUBLIC_API_URL` | Auth service URL for frontend | `http://localhost:3001` |

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
| Mailpit (dev email viewer) | 8025 | http://localhost:8025 |
| Ollama (LLM) | 11434 | http://localhost:11434 |

---

## API Reference

### Auth Service — `http://localhost:3001`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account + send verification email |
| POST | `/auth/login` | — | Issue JWT + refresh token (MFA supported) |
| POST | `/auth/refresh` | — | Rotate access token from refresh cookie |
| POST | `/auth/logout` | — | Revoke refresh token |
| POST | `/auth/verify-email` | — | Confirm email with OTP |
| POST | `/auth/forgot-password` | — | Send password reset email |
| POST | `/auth/reset-password` | — | Reset password with token |
| POST | `/auth/mfa/setup` | ✅ | Generate TOTP secret + QR code + backup codes |
| POST | `/auth/mfa/verify` | ✅ | Verify TOTP and enable MFA |
| POST | `/auth/mfa/disable` | ✅ | Disable MFA |
| GET | `/users/me` | ✅ | Get current user profile |
| GET | `/users` | ✅ admin | List all users in tenant |
| PATCH | `/users/:id/role` | ✅ admin | Change user role |
| GET | `/health` | — | Service status |

### Tenant Service — `http://localhost:3002`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tenants/me` | ✅ | Get current tenant details + member count |
| PATCH | `/tenants/me` | ✅ admin | Update clinic name |
| GET | `/tenants/me/usage` | ✅ | API usage metrics |
| POST | `/tenants/me/pms` | ✅ | Connect PMS (open_dental, dentrix, cleardent) |
| DELETE | `/tenants/me/pms` | ✅ | Disconnect PMS |
| GET | `/patients` | ✅ | List all patients |
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
| POST | `/estimate/narrative` | ✅ | Generate pre-auth letter from CDT code |
| GET | `/estimate/codes` | ✅ | List all 64 CDT codes with categories, fees, pre-auth flags |
| GET | `/estimate/history` | ✅ | Last 50 estimates for this tenant |
| GET | `/health` | — | Service status + LLM provider + CDT codes loaded |

---

## Dashboard Features

The dashboard at `/dashboard` includes:

**Overview**
- Stat cards: Total Patients, Estimates This Month, Revenue Recovered, High-Risk Claims
- Recent activity feed (last 8 estimates with CDT code, risk level, coverage %, cost)
- Quick action shortcuts

**Cost Estimator**
- CDT code + insurer dropdown
- Returns: coverage %, insurer payout, patient cost, claim risk (LOW/MEDIUM/HIGH), AI explanation

**Patient Directory**
- Add, edit, search patients
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
- Per-location dashboards and settings

---

## Architecture

```
Browser (Next.js :3000)
│
├── /                   Marketing landing page
├── /login              → Auth Service :3001
├── /signup             → Auth Service :3001 (5-step wizard)
└── /dashboard
    ├── Overview         KPI stats from tenant data
    ├── Cost Estimator   → Estimate Service :3004
    │                      └── Ollama :11434 (explanations + narratives)
    ├── Patients         → Tenant Service :3002
    ├── Claims           → Tenant Service :3002
    ├── Clinics          → Tenant Service :3002
    └── Settings         → Tenant Service :3002 + Auth Service :3001

SQLite per-tenant tables (managed by Drizzle ORM):
  {slug}_patients
  {slug}_insurance_plans
  {slug}_estimates
  {slug}_clinic_locations
```

---

## Shared Packages

| Package | Purpose |
|---|---|
| `@dentaliq/config` | Zod-validated env schema, `getEnv()` |
| `@dentaliq/db` | Drizzle ORM client + schema, `getDb()` |
| `@dentaliq/logger` | Pino structured logger, `createLogger(service)` |
| `@dentaliq/llm-interface` | LLM abstraction with Ollama → Claude → static fallback chain |
| `@dentaliq/types` | Shared TypeScript interfaces across all apps |

---

## Useful Commands

```bash
pnpm dev          # Start all services
pnpm build        # Build all apps
pnpm db:push      # Run Drizzle migrations
pnpm db:studio    # Open Drizzle Studio (DB GUI)
pnpm docker:up    # Start Docker services
pnpm docker:down  # Stop Docker services
pnpm seed         # Seed demo data
```

---

*DentalIQ · Built for Ontario dental clinics · PHIPA compliant · Data stored in Canada*

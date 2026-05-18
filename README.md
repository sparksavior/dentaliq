# DentalIQ — AI Insurance Intelligence Platform

> A production-grade, multi-tenant SaaS platform for Canadian dental clinics. DentalIQ provides AI-powered insurance cost estimation, automated pre-authorization drafting, claim risk detection, and an autonomous "Cortex" digital workforce that runs overnight to recover revenue and re-engage patients.

---

## Table of Contents

1. [What This Is](#1-what-this-is)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Prerequisites — Read Before Anything Else](#4-prerequisites)
5. [First-Time Setup (Local Development)](#5-first-time-setup)
6. [Environment Variables — Complete Reference](#6-environment-variables)
7. [Running the Application](#7-running-the-application)
8. [Demo Mode (No Account Required)](#8-demo-mode)
9. [Database Guide](#9-database-guide)
10. [LLM / AI Provider Guide](#10-llm-provider-guide)
11. [Email Setup](#11-email-setup)
12. [Stripe / Payments Setup](#12-stripe-setup)
13. [Production Deployment — Step by Step](#13-production-deployment)
14. [Docker Deployment](#14-docker-deployment)
15. [Kubernetes / Helm Deployment](#15-kubernetes-helm)
16. [Security Checklist](#16-security-checklist)
17. [Monitoring & Health Checks](#17-monitoring)
18. [Troubleshooting](#18-troubleshooting)
19. [Project Structure Reference](#19-project-structure)
20. [Contributing](#20-contributing)

---

## 1. What This Is

DentalIQ is a **multi-tenant B2B SaaS** platform. Each dental clinic that signs up gets their own isolated account (tenant) with their own data, users, and billing.

### Core Features

| Feature                      | Plans       | Description                                                     |
| ---------------------------- | ----------- | --------------------------------------------------------------- |
| **Insurance Cost Estimator** | All plans   | Instant CDT-code-based fee estimates with insurer breakdowns    |
| **AI Explanations**          | Pro, Cortex | LLM-generated plain-language explanations of coverage decisions |
| **Pre-Auth Letter Drafting** | Pro, Cortex | AI drafts clinical justification narratives in ~90 seconds      |
| **Claim Risk Detection**     | Pro, Cortex | Flags submissions likely to be denied before sending            |
| **Cortex Agents**            | Cortex only | 6 autonomous AI agents that run overnight                       |
| **Multi-Location**           | Pro, Cortex | Manage multiple clinic locations under one account              |
| **Admin Portal**             | Internal    | System-wide tenant, user, and health management                 |

### The Cortex Agents (Autonomous AI Workforce)

The "Cortex" tier activates 6 AI agents that run automatically every night at 2:00 AM. Each agent generates tasks that a human reviews and approves before any action is taken (human-in-the-loop design).

| Agent                     | What It Does                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- |
| **Billing Agent**         | Scans for unpaid invoices, drafts pre-auth narratives, prevents CDCP denials |
| **Recall Agent**          | Sends hygiene recall messages to overdue patients                            |
| **Review Agent**          | Requests online reviews from satisfied patients post-visit                   |
| **Supply Agent**          | Monitors inventory levels, flags shortages                                   |
| **Treatment Coordinator** | Follows up on high-value unscheduled treatment cases                         |
| **Hygienist Agent**       | Fills last-minute appointment cancellations from a waitlist                  |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                          │
│                                                                   │
│  ┌──────────────────────┐    ┌────────────────────────────────┐ │
│  │   Web App (port 3000) │    │  Admin Portal (port 3005)      │ │
│  │   Next.js 16 App Router│   │  Next.js 16 (internal only)    │ │
│  └──────────┬───────────┘    └───────────────┬────────────────┘ │
└─────────────┼───────────────────────────────┼───────────────────┘
              │ HTTPS / REST                   │ HTTPS + ADMIN_SECRET
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND MICROSERVICES                        │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Auth Service    │  │ Tenant Service  │  │Estimate Service │ │
│  │  port 3001       │  │  port 3002      │  │  port 3004      │ │
│  │  Fastify + JWT   │  │  Fastify        │  │  Fastify + LLM  │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                      │          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 Agent Manager (port 3006)                    ││
│  │          Node.js HTTP — Cortex agent orchestration           ││
│  └─────────────────────────────────────────────────────────────┘│
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                │
│                                                                   │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │ SQLite (development)  │    │  PostgreSQL (production)      │  │
│  │ Zero-config, file-    │    │  Full ACID, multi-instance    │  │
│  │ based, auto-created   │    │  connection pooling           │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  Ollama (local LLM)   │    │  Claude / OpenAI (cloud LLM) │  │
│  │  port 11434           │    │  Automatic fallback chain     │  │
│  │  llama3.1:8b default  │    │  if Ollama unavailable        │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Service Port Map

| Service          | Port     | Purpose                                   |
| ---------------- | -------- | ----------------------------------------- |
| Web Frontend     | **3000** | Patient-facing + clinic dashboard         |
| Auth Service     | **3001** | Registration, login, JWT, MFA             |
| Tenant Service   | **3002** | Clinic data, patients, PMS integration    |
| Estimate Service | **3004** | CDT cost engine + AI narrative generation |
| Admin Portal     | **3005** | Internal operations dashboard             |
| Agent Manager    | **3006** | Cortex agent scheduling + task queue      |

### How Data Flows (Estimate Request Example)

```
1. Clinic staff enters patient procedure code (e.g. D2750 — Crown)
2. POST /estimate → estimate-service
3. Rules engine: instant fee lookup from CDT database (<1ms)
4. LLM layer (Pro+): generate plain-language explanation
5. Pre-auth letter (Pro+): AI drafts clinical justification
6. Response returned with cost breakdown, AI narrative, risk flags
```

---

## 3. Tech Stack

| Layer               | Technology                                 | Why                                                                                  |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Frontend**        | Next.js 16.2.4 (App Router)                | SSR, file-based routing, React Server Components                                     |
| **Monorepo**        | Turborepo + pnpm workspaces                | Parallel builds, shared packages, incremental caching                                |
| **Backend**         | Fastify 4 (Node.js)                        | 2-3× faster than Express, schema validation, plugin ecosystem                        |
| **Database ORM**    | Drizzle ORM                                | Type-safe SQL, SQLite and PostgreSQL with same codebase                              |
| **Database (dev)**  | SQLite via libsql                          | Zero-config, file-based, no Docker required                                          |
| **Database (prod)** | PostgreSQL 16                              | ACID compliant, connection pooling, multi-instance safe                              |
| **AI / LLM**        | Ollama (local) + Claude/OpenAI fallback    | Offline-capable, no API key required to develop                                      |
| **Auth**            | JWT + Refresh tokens + multi-method MFA    | TOTP (authenticator app), email OTP, and SMS OTP (Twilio). PHIPA-suitable, stateless |
| **Styling**         | CSS custom properties + Tailwind utilities | Design token system, dark mode, no CSS-in-JS overhead                                |
| **Icons**           | Lucide React                               | Consistent, tree-shakeable icon set                                                  |
| **Charts**          | Recharts                                   | Composable, React-native chart library                                               |
| **Payments**        | Stripe (optional)                          | SetupIntents + Subscriptions, PCI-safe card tokenization                             |
| **Email**           | Nodemailer / Resend                        | Pluggable, console mode for development                                              |
| **Logging**         | Pino                                       | Structured JSON logs, sub-millisecond overhead                                       |
| **Validation**      | Zod                                        | Runtime + compile-time type safety for env vars and API payloads                     |
| **Testing**         | Vitest                                     | Fast, ESM-native, compatible with Node and jsdom                                     |
| **Container**       | Docker multi-stage builds                  | Minimal image size, non-root user, health checks                                     |

---

## 4. Prerequisites

You need these installed before anything else. Each one is linked to its installer.

### Required

| Tool        | Version    | How to Check     | Install                                         |
| ----------- | ---------- | ---------------- | ----------------------------------------------- |
| **Node.js** | ≥ 20.0.0   | `node --version` | [nodejs.org](https://nodejs.org) — download LTS |
| **pnpm**    | ≥ 9.0.0    | `pnpm --version` | `npm install -g pnpm`                           |
| **Git**     | Any recent | `git --version`  | [git-scm.com](https://git-scm.com)              |

### AI Features (Optional — the app works fully without AI)

| Tool       | Version | How to Check       | Install                          |
| ---------- | ------- | ------------------ | -------------------------------- |
| **Ollama** | Any     | `ollama --version` | [ollama.com](https://ollama.com) |

> **AI is entirely optional.** The setup wizard will ask "Enable AI features?" upfront. If you say No, Ollama is never downloaded and the app runs without any AI model. Estimates return results via the rules engine, and pre-auth letters are unavailable. You can enable AI at any time later.
>
> **What is Ollama?** It runs large language models locally on your machine. Patient data never leaves your infrastructure. Alternatively, use `LLM_PROVIDER=claude` or `LLM_PROVIDER=openai` with a cloud API key for faster responses.

### Optional (only needed for specific features)

| Tool               | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| **Docker Desktop** | Needed only to run PostgreSQL, Redis, or Mailpit locally |
| **Stripe CLI**     | Needed only to test webhook events locally               |

---

## 5. First-Time Setup

The easiest way to set up is the interactive setup wizard, which handles everything automatically.

### Automated Setup (Recommended)

```bash
git clone <your-repo-url>
cd dentaliq
node setup.js
```

The wizard will guide you through:

1. **AI choice** — "Enable AI features? [y/N]" — if No, Ollama is never downloaded
2. **Dependency checks** — Node ≥ 20, pnpm, Docker status
3. **Environment file** — Creates `.env` from `.env.example`, auto-generates `JWT_SECRET` and `ADMIN_SECRET`
4. **Dependencies** — Runs `pnpm install`
5. **Mailpit** — Starts email preview UI via Docker (if Docker is running)
6. **Ollama** — Installs Ollama and pulls `llama3.1:8b` (only if AI was enabled in step 1)
7. **Database** — Runs `pnpm db:push` to create the schema, then `pnpm seed`
8. **Launch** — Starts `pnpm dev` automatically

> **Node.js ≥ 20 required.** Check with `node --version`. Use [nvm](https://github.com/nvm-sh/nvm) to install: `nvm install 20 && nvm use 20`

### Manual Setup

If you prefer to set up step by step:

```bash
# 1. Clone and enter the repo
git clone <your-repo-url>
cd dentaliq

# 2. Install dependencies
pnpm install

# 3. Create environment file
cp .env.example .env

# 4. Generate secrets (paste output into .env)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('ADMIN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# 5. Create the database schema
pnpm db:push

# 6. Seed demo data
pnpm seed

# 7. Start all services
pnpm dev
```

> **Security note:** `.env` is listed in `.gitignore` and will never be committed. Never share your `.env` file.

### Create Your First Account

1. Go to http://localhost:3000/signup
2. Fill in your name, clinic name, email, and password
3. Click **Continue** through the signup wizard
4. You'll land on the dashboard

The database (`dentaliq.db`) is created automatically. No migrations are needed in development.

### Verify Everything is Working

| Check                              | Expected                                       |
| ---------------------------------- | ---------------------------------------------- |
| http://localhost:3000              | DentalIQ landing page                          |
| http://localhost:3000/demo/starter | Interactive demo (no login)                    |
| http://localhost:3001/health       | `{"status":"ok","service":"auth-service"}`     |
| http://localhost:3002/health       | `{"status":"ok","service":"tenant-service"}`   |
| http://localhost:3004/health       | `{"status":"ok","service":"estimate-service"}` |
| http://localhost:3006/health       | `{"status":"ok"}`                              |
| http://localhost:3005              | Admin portal                                   |

---

## 6. Environment Variables

The full reference lives in `.env.example`. Here is what each variable does and when you need it.

### Core (Always Required)

| Variable                   | Default        | Description                                                                                                                      |
| -------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                 | `development`  | Set to `production` for deployed builds                                                                                          |
| `JWT_SECRET`               | **(required)** | Secret key for signing JWT tokens. **Must be ≥ 32 characters. Must be unique per deployment. Never reuse between environments.** |
| `JWT_EXPIRES_IN`           | `15m`          | How long access tokens are valid                                                                                                 |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d`           | How long refresh tokens are valid                                                                                                |

### Service Ports

| Variable             | Default | Description           |
| -------------------- | ------- | --------------------- |
| `AUTH_PORT`          | `3001`  | Auth service port     |
| `TENANT_PORT`        | `3002`  | Tenant service port   |
| `ESTIMATE_PORT`      | `3004`  | Estimate service port |
| `AGENT_MANAGER_PORT` | `3006`  | Agent manager port    |

### Database

| Variable        | Default       | Description                                         |
| --------------- | ------------- | --------------------------------------------------- |
| `DB_TYPE`       | `sqlite`      | `sqlite` for development, `postgres` for production |
| `DATABASE_PATH` | `dentaliq.db` | SQLite file path (SQLite only)                      |
| `DATABASE_URL`  | _(none)_      | PostgreSQL connection string (PostgreSQL only)      |

Example PostgreSQL URL:

```
DATABASE_URL=postgresql://dentaliq:yourpassword@your-db-host:5432/dentaliq
```

### LLM / AI

| Variable            | Default                  | Description                               |
| ------------------- | ------------------------ | ----------------------------------------- |
| `LLM_PROVIDER`      | `ollama`                 | `ollama`, `openai`, `claude`, or `gemini` |
| `OLLAMA_BASE_URL`   | `http://localhost:11434` | Ollama server URL                         |
| `OLLAMA_MODEL`      | `llama3.1:8b`            | Ollama model to use                       |
| `OPENAI_API_KEY`    | _(none)_                 | Required when `LLM_PROVIDER=openai`       |
| `ANTHROPIC_API_KEY` | _(none)_                 | Required when `LLM_PROVIDER=claude`       |

### Email

| Variable         | Default             | Description                                 |
| ---------------- | ------------------- | ------------------------------------------- |
| `EMAIL_MODE`     | `console`           | `console` (print only), `smtp`, or `resend` |
| `EMAIL_FROM`     | `hello@dentaliq.ca` | Sender address                              |
| `SMTP_HOST`      | _(none)_            | SMTP server hostname                        |
| `SMTP_PORT`      | `587`               | SMTP port                                   |
| `SMTP_USER`      | _(none)_            | SMTP username                               |
| `SMTP_PASS`      | _(none)_            | SMTP password                               |
| `RESEND_API_KEY` | _(none)_            | Resend API key (when `EMAIL_MODE=resend`)   |

### Twilio (SMS 2FA — Optional)

Required only if you want SMS text-message two-factor authentication. If these variables are not set, the SMS option is hidden in settings and users can still use authenticator-app or email 2FA.

| Variable             | Default  | Description                                                       |
| -------------------- | -------- | ----------------------------------------------------------------- |
| `TWILIO_ACCOUNT_SID` | _(none)_ | Account SID from [console.twilio.com](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN`  | _(none)_ | Auth token from Twilio console                                    |
| `TWILIO_FROM_NUMBER` | _(none)_ | Twilio phone number in E.164 format, e.g. `+16475550100`          |

### Stripe (Payments — Optional)

| Variable                  | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `STRIPE_SECRET_KEY`       | `sk_test_...` from Stripe dashboard                 |
| `STRIPE_PUBLISHABLE_KEY`  | `pk_test_...` shown to the browser (safe to expose) |
| `STRIPE_WEBHOOK_SECRET`   | `whsec_...` from your webhook endpoint              |
| `STRIPE_PRICE_STARTER`    | Price ID for Starter plan                           |
| `STRIPE_PRICE_PRO`        | Price ID for Pro plan                               |
| `STRIPE_PRICE_ENTERPRISE` | Price ID for Enterprise plan                        |
| `STRIPE_PRICE_CORTEX`     | Price ID for Cortex plan                            |

> Stripe is fully optional. If you leave these variables unset, the billing UI shows "Payment not configured" and no charges can be made.

### Security & CORS

| Variable          | Default                                       | Description                                                                                                                                     |
| ----------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3005` | Comma-separated list of allowed CORS origins. In production, set to your exact domain(s).                                                       |
| `ADMIN_SECRET`    | _(required for admin)_                        | Long random token required to access the admin portal. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Frontend

| Variable                        | Default                 | Description                                         |
| ------------------------------- | ----------------------- | --------------------------------------------------- |
| `APP_URL`                       | `http://localhost:3000` | Full URL of the web app (used in emails, redirects) |
| `NEXT_PUBLIC_APP_URL`           | `http://localhost:3000` | App URL exposed to the browser                      |
| `NEXT_PUBLIC_API_URL`           | `http://localhost:3001` | Auth service URL (browser-side API calls)           |
| `NEXT_PUBLIC_AUTH_URL`          | `http://localhost:3001` | Auth service URL (same as `API_URL`)                |
| `NEXT_PUBLIC_TENANT_URL`        | `http://localhost:3002` | Tenant service URL visible to the browser           |
| `NEXT_PUBLIC_ESTIMATE_URL`      | `http://localhost:3004` | Estimate service URL visible to the browser         |
| `NEXT_PUBLIC_AGENT_MANAGER_URL` | `http://localhost:3006` | Agent manager URL visible to the browser            |
| `NEXT_PUBLIC_ENABLE_DEMO`       | _(unset)_               | Set to `true` to enable `/demo/*` routes            |

---

## 7. Running the Application

### Start Everything (Recommended)

```bash
pnpm dev
```

Starts all 6 services in parallel via Turborepo. Each service has hot-reload enabled.

### Start a Single Service

```bash
# Web frontend only
pnpm --filter web dev

# Auth service only
pnpm --filter @dentaliq/auth-service dev

# Estimate service only
pnpm --filter @dentaliq/estimate-service dev

# Admin portal only
pnpm --filter admin dev

# Agent manager only
pnpm --filter agent-manager dev
```

### Build for Production

```bash
pnpm build
```

Builds all services in dependency order. Outputs go to `.next/` (Next.js apps) and `dist/` (Node.js services).

### Run Type Checks

```bash
pnpm typecheck
```

### Run Tests

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

---

## 8. Demo Mode

The demo routes let anyone explore a fully interactive version of the dashboard without creating an account or running a database. All data is static/simulated.

**Enable demo routes** by adding to your `.env`:

```bash
NEXT_PUBLIC_ENABLE_DEMO=true
```

Then visit:

| URL                                | Plan Demonstrated                    |
| ---------------------------------- | ------------------------------------ |
| http://localhost:3000/demo/starter | Starter — cost estimator only        |
| http://localhost:3000/demo/pro     | Pro — estimates + AI explanations    |
| http://localhost:3000/demo/cortex  | Cortex — full AI workforce dashboard |

> **Production note:** Leave `NEXT_PUBLIC_ENABLE_DEMO` unset (or set to `false`) in production deployments that serve real clinics. Demo routes expose simulated but realistic-looking clinical data and should only be enabled on dedicated marketing demo deployments.

---

## 9. Database Guide

### Development: SQLite (Default, Recommended)

No setup required. The database file (`dentaliq.db`) is created automatically at the project root when you first start any service.

```bash
# Schema is auto-applied on startup — no manual migrations needed in dev
DB_TYPE=sqlite
DATABASE_PATH=dentaliq.db
```

The SQLite file is excluded from git via `.gitignore`. Each developer gets their own clean database.

### Seeding Demo Data

```bash
pnpm seed
```

Creates a demo tenant account you can log into immediately:

| Field    | Value              |
| -------- | ------------------ |
| Email    | `demo@dentaliq.ca` |
| Password | `DentalDemo2024!`  |
| Plan     | Pro                |

### Viewing the Database

```bash
pnpm --filter @dentaliq/db db:studio
```

Opens Drizzle Studio — a web-based GUI at http://localhost:4983 showing all tables and their contents.

### Production: PostgreSQL

For production, switch to PostgreSQL. It supports multiple simultaneous service instances, proper connection pooling, and production-grade backup/restore.

**Step 1 — Provision a PostgreSQL database.** Options:

| Provider                    | Notes                                                           |
| --------------------------- | --------------------------------------------------------------- |
| **Neon** (neon.tech)        | Serverless PostgreSQL, generous free tier, instant provisioning |
| **Supabase**                | PostgreSQL with extras (auth, realtime), free tier available    |
| **AWS RDS**                 | Managed PostgreSQL, best for compliance-sensitive workloads     |
| **DigitalOcean Managed DB** | Simple, affordable, Canadian regions available                  |
| **Self-hosted via Docker**  | Use the included `docker-compose.yml`                           |

**Step 2 — Set environment variables:**

```bash
DB_TYPE=postgres
DATABASE_URL=postgresql://user:password@hostname:5432/dentaliq
```

**Step 3 — Apply schema:**

```bash
pnpm db:push
```

This reads your Drizzle schema definitions and creates all tables in PostgreSQL. Run this once per environment.

**Step 4 — Seed data (optional):**

```bash
pnpm seed
```

### Database Schema Summary

| Table              | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `tenants`          | Clinic accounts, plan, PMS connection, billing          |
| `users`            | Clinic staff — roles: admin, dentist, front_desk        |
| `refresh_tokens`   | JWT refresh token revocation                            |
| `audit_logs`       | Append-only PHIPA compliance log                        |
| `procedures`       | CDT dental code definitions (fee, limits, requirements) |
| `agent_tasks`      | Cortex agent output queue (pending/approved/rejected)   |
| `support_tickets`  | Help desk tickets                                       |
| `support_messages` | Ticket conversation threads                             |

---

## 10. LLM Provider Guide

DentalIQ uses LLMs to generate:

- Plain-language insurance explanations (Pro+)
- Pre-authorization letter narratives (Pro+)
- Agent task summaries (Cortex)

### Option A: Ollama (Local, No API Key, Default)

Best for: Development, privacy-sensitive deployments, air-gapped environments.

```bash
# 1. Install Ollama from https://ollama.com
# 2. Pull the model (one-time, ~5 GB):
ollama pull llama3.1:8b
# 3. Set in .env:
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

**Choosing a model:**

| Model          | RAM Required | Quality   | Speed     |
| -------------- | ------------ | --------- | --------- |
| `llama3.1:8b`  | 8 GB         | Good      | Fast      |
| `llama3.1:70b` | 40 GB        | Excellent | Slow      |
| `mistral:7b`   | 8 GB         | Good      | Fast      |
| `phi3:mini`    | 4 GB         | Fair      | Very fast |

### Option B: Anthropic Claude (Cloud)

Best for: Production deployments where you want consistent, high-quality output.

```bash
# Get key from https://console.anthropic.com
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Option C: OpenAI

```bash
# Get key from https://platform.openai.com/api-keys
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### Fallback Chain

If the configured provider is unavailable, DentalIQ automatically tries:

1. Primary provider (configured by `LLM_PROVIDER`)
2. Ollama (if running locally)
3. Claude (if `ANTHROPIC_API_KEY` is set)
4. Static template (always works, no AI — used as last resort)

This means even if your primary LLM goes down, estimates still return results.

### Running Ollama in Docker (for Docker Compose deployments)

```bash
docker-compose up ollama -d
```

The `ollama` service in `docker-compose.yml` automatically pulls `llama3.1:8b` on first start. It may take 10–15 minutes on a slow connection.

---

## 11. Email Setup

### Development: Console Mode (Default)

No setup required. All emails (verification, password reset) are printed to the terminal instead of sent.

```bash
EMAIL_MODE=console
```

Watch the `auth-service` logs when a user registers to see the verification link.

### Local Email Testing with Mailpit

Mailpit is a local SMTP server with a web UI that catches all emails before they leave your machine.

```bash
docker-compose up mailpit -d
```

Then set:

```bash
EMAIL_MODE=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
```

View captured emails at http://localhost:8025

### Production: Resend (Recommended)

[Resend](https://resend.com) is a developer-friendly email API with a generous free tier (3,000 emails/month).

1. Create a free account at resend.com
2. Add and verify your sending domain
3. Create an API key

```bash
EMAIL_MODE=resend
EMAIL_FROM=hello@yourdomain.com
RESEND_API_KEY=re_...
```

### Production: SMTP (Mailgun, SendGrid, Postmark, etc.)

```bash
EMAIL_MODE=smtp
EMAIL_FROM=hello@yourdomain.com
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.yourdomain.com
SMTP_PASS=your-smtp-password
```

---

## 12. Stripe Setup

Stripe is optional. Skip this section if you are not charging users.

### Setting Up Stripe (Test Mode)

1. Create a free account at [stripe.com](https://stripe.com)
2. Go to **Developers → API Keys**
3. Copy your `pk_test_...` (publishable) and `sk_test_...` (secret) keys

### Create Products and Price IDs

In the Stripe Dashboard:

1. Go to **Product catalog → Add product**
2. Create four products (Starter, Pro, Enterprise, Cortex) with monthly recurring prices
3. Copy each price's ID (`price_...`) into your `.env`

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
STRIPE_PRICE_CORTEX=price_...
```

### Setting Up Webhooks for Local Development

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3002/billing/webhook
```

The CLI will print a `whsec_...` — paste that as `STRIPE_WEBHOOK_SECRET`.

### Switching to Live Mode for Production

1. Toggle from **Test** to **Live** in the Stripe dashboard
2. Replace all `sk_test_`, `pk_test_`, and `price_` values with their live equivalents
3. Create a new webhook endpoint pointing at your production domain
4. Update `STRIPE_WEBHOOK_SECRET` with the live webhook secret

### Test Cards

Use these Stripe test card numbers (no real money charged):

| Card Number           | Scenario                            |
| --------------------- | ----------------------------------- |
| `4242 4242 4242 4242` | Successful payment                  |
| `4000 0000 0000 9995` | Card declined                       |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

Use any future expiry date and any 3-digit CVC.

---

## 13. Production Deployment

This section walks through deploying DentalIQ to a production server. We will cover:

- Choosing a hosting environment
- Environment configuration
- Database migration
- Building and starting services
- Reverse proxy (Nginx/Caddy)
- SSL certificates

### Choosing a Hosting Approach

| Approach                                     | Best For                                         | Complexity |
| -------------------------------------------- | ------------------------------------------------ | ---------- |
| **Single VPS (e.g. DigitalOcean, Hetzner)**  | Startups, MVPs, cost-sensitive deployments       | Low        |
| **Docker Compose on a VPS**                  | Same as above but with easier service management | Low-Medium |
| **Kubernetes (EKS/GKE/AKS)**                 | Scale-out, multi-region, enterprise              | High       |
| **Platform-as-a-Service (Vercel + Railway)** | Frontend on Vercel, backend services on Railway  | Medium     |

### Recommended Production Stack (Single VPS)

For most early-stage deployments, a single VPS running Docker Compose is the best balance of cost, simplicity, and capability.

**Minimum server requirements:**

| Spec | Without Ollama   | With Ollama (8b model) |
| ---- | ---------------- | ---------------------- |
| CPU  | 2 vCPU           | 4+ vCPU                |
| RAM  | 2 GB             | 12 GB                  |
| Disk | 20 GB SSD        | 40 GB SSD              |
| OS   | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS       |

### Production Deployment Steps

#### Step 1 — Provision Your Server

Recommended providers (all have Canadian regions):

- [DigitalOcean](https://digitalocean.com) — $24/mo for 4 vCPU / 8 GB (Toronto region)
- [Hetzner](https://hetzner.com) — Cheapest per-spec, European company
- [Vultr](https://vultr.com) — Toronto region available

#### Step 2 — Install Server Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install Caddy (reverse proxy + automatic HTTPS)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

#### Step 3 — Clone the Repository and Configure

```bash
git clone <your-repo-url> /opt/dentaliq
cd /opt/dentaliq
pnpm install --frozen-lockfile
cp .env.example .env
nano .env  # Edit with production values (see below)
```

**Critical production `.env` values:**

```bash
NODE_ENV=production
LOG_LEVEL=info

# Generate a strong secret — run this on the server:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-char hex string>

# Use PostgreSQL in production
DB_TYPE=postgres
DATABASE_URL=postgresql://dentaliq:STRONG_PASSWORD@localhost:5432/dentaliq

# Your actual domain
APP_URL=https://app.yourdomain.com
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com

# Generate admin secret
ADMIN_SECRET=<32-char hex string>

# Cloud LLM (recommended over Ollama for production reliability)
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...

# Real email delivery
EMAIL_MODE=resend
EMAIL_FROM=hello@yourdomain.com
RESEND_API_KEY=re_...

# Demo routes OFF in production
# NEXT_PUBLIC_ENABLE_DEMO=true  ← leave this commented out
```

#### Step 4 — Start the Database

```bash
# Start only PostgreSQL
docker-compose up postgres -d

# Wait for it to be healthy (check with):
docker-compose ps

# Apply schema to the new database
pnpm db:push

# Seed an initial admin user (optional)
pnpm seed
```

#### Step 5 — Build the Application

```bash
pnpm build
```

This compiles all TypeScript and builds the Next.js bundles. Takes 3–5 minutes on first run.

#### Step 6 — Configure the Process Manager

Use PM2 to keep services running after you disconnect and auto-restart on crash:

```bash
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'web',
      cwd: '/opt/dentaliq/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: { PORT: 3000, NODE_ENV: 'production' }
    },
    {
      name: 'admin',
      cwd: '/opt/dentaliq/apps/admin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3005',
      env: { PORT: 3005, NODE_ENV: 'production' }
    },
    {
      name: 'auth-service',
      cwd: '/opt/dentaliq/apps/auth-service',
      script: 'dist/index.js',
      env_file: '/opt/dentaliq/.env'
    },
    {
      name: 'tenant-service',
      cwd: '/opt/dentaliq/apps/tenant-service',
      script: 'dist/index.js',
      env_file: '/opt/dentaliq/.env'
    },
    {
      name: 'estimate-service',
      cwd: '/opt/dentaliq/apps/estimate-service',
      script: 'dist/index.js',
      env_file: '/opt/dentaliq/.env'
    },
    {
      name: 'agent-manager',
      cwd: '/opt/dentaliq/apps/agent-manager',
      script: 'dist/index.js',
      env_file: '/opt/dentaliq/.env'
    }
  ]
}
EOF

# Start all services
pm2 start ecosystem.config.js

# Save so they restart on server reboot
pm2 save
pm2 startup  # Follow the printed instructions
```

#### Step 7 — Configure Reverse Proxy (Caddy)

Caddy automatically obtains and renews SSL certificates via Let's Encrypt.

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
# Main web app
app.yourdomain.com {
    reverse_proxy localhost:3000
}

# Admin portal — restrict to your IP or a VPN
admin.yourdomain.com {
    # Uncomment to restrict by IP:
    # @allowed remote_ip 1.2.3.4
    # handle @allowed {
    #     reverse_proxy localhost:3005
    # }
    # respond 403
    reverse_proxy localhost:3005
}

# API services (if you want them accessible externally)
# auth.yourdomain.com {
#     reverse_proxy localhost:3001
# }
```

```bash
sudo systemctl reload caddy
```

Your app is now live at `https://app.yourdomain.com` with automatic HTTPS.

#### Step 8 — Configure DNS

In your DNS provider (Cloudflare, Route 53, etc.), add A records:

```
app.yourdomain.com    →  <your-server-ip>
admin.yourdomain.com  →  <your-server-ip>
```

DNS propagation takes up to 48 hours, but usually completes within 5 minutes with Cloudflare.

#### Step 9 — Verify the Deployment

```bash
# Check all processes are running
pm2 list

# Check health endpoints
curl https://app.yourdomain.com  # Should return HTML
curl https://app.yourdomain.com/api/health  # If you add a Next.js health route

# Check service health directly
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3004/health
curl http://localhost:3006/health
```

### Updating the Application

```bash
cd /opt/dentaliq
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 restart all
```

---

## 14. Docker Deployment

The production Dockerfile supports building any service via the `APP_NAME` build argument.

### Building a Single Service Image

```bash
# Build the web frontend
docker build \
  --build-arg APP_NAME=web \
  -f infra/docker/Dockerfile.production \
  -t dentaliq/web:latest \
  .

# Build the auth service
docker build \
  --build-arg APP_NAME=auth-service \
  -f infra/docker/Dockerfile.production \
  -t dentaliq/auth-service:latest \
  .
```

### Running with Docker Compose (Full Stack)

```bash
# Start infrastructure (database, Redis, Ollama, mail)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Stop and delete volumes (WARNING: deletes all data)
docker-compose down -v
```

### Services in docker-compose.yml

| Service        | Port                   | Start Command                                  |
| -------------- | ---------------------- | ---------------------------------------------- |
| **PostgreSQL** | 5432                   | Always starts                                  |
| **Redis**      | 6379                   | Always starts                                  |
| **Ollama**     | 11434                  | Always starts (pulls llama3.1:8b on first run) |
| **Mailpit**    | 1025 (SMTP), 8025 (UI) | Always starts                                  |
| **pgAdmin**    | 5050                   | Only with `--profile tools`                    |

### Start Only Selected Services

```bash
# Just PostgreSQL and Redis
docker-compose up postgres redis -d

# With pgAdmin for database inspection
docker-compose --profile tools up -d
```

---

## 15. Kubernetes / Helm Deployment

A base Helm chart is provided in `infra/helm/base-service/`. It is designed to be used as a parent chart for each service.

### Prerequisites

- A Kubernetes cluster (EKS, GKE, AKS, or local k3s/minikube)
- `kubectl` configured to talk to your cluster
- `helm` v3 installed
- Your container images pushed to a registry (Docker Hub, ECR, GCR, etc.)

### Deploying a Service

```bash
# Build and push image (example for auth-service)
docker build --build-arg APP_NAME=auth-service \
  -f infra/docker/Dockerfile.production \
  -t your-registry/dentaliq-auth:$(git rev-parse --short HEAD) .

docker push your-registry/dentaliq-auth:$(git rev-parse --short HEAD)

# Deploy with Helm
helm upgrade --install dentaliq-auth ./infra/helm/base-service \
  --set image.repository=your-registry/dentaliq-auth \
  --set image.tag=$(git rev-parse --short HEAD) \
  --set env.PORT=3001 \
  --set env.DB_TYPE=postgres \
  --set env.DATABASE_URL="postgresql://..." \
  --namespace dentaliq \
  --create-namespace
```

### Helm Chart Values Reference

See `infra/helm/base-service/values.yaml` for all configurable values:

- `replicaCount` — Number of pods (default: 2)
- `image.repository` — Container image repository
- `image.tag` — Image tag (pin to a git SHA in production, never use `latest`)
- `resources.limits` — CPU and memory limits
- `autoscaling.enabled` — Enable HPA (default: true, min 1, max 10 pods)
- `livenessProbe` + `readinessProbe` — Both point to `/health` endpoint

### Kubernetes Secrets

Never put secrets in Helm values. Use Kubernetes secrets:

```bash
kubectl create secret generic dentaliq-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -hex 64)" \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=ANTHROPIC_API_KEY="sk-ant-..." \
  --namespace dentaliq
```

Then reference in your deployment manifest:

```yaml
envFrom:
  - secretRef:
      name: dentaliq-secrets
```

---

## 16. Security Checklist

Complete every item before going live with real clinic data.

### Authentication & Access

- [ ] `JWT_SECRET` is ≥ 64 characters, randomly generated, unique to this deployment
- [ ] `ADMIN_SECRET` is set — without it the admin portal is unprotected
- [ ] `ALLOWED_ORIGINS` is set to your exact production domain(s) only
- [ ] Admin portal (`port 3005`) is NOT exposed to the public internet (restrict by IP or VPN)
- [ ] MFA is required for all users who access PHI — users can choose TOTP (authenticator app), email OTP, or SMS OTP (requires Twilio)
- [ ] If using SMS 2FA, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` are set in production

### Network

- [ ] All services run behind a reverse proxy (Nginx, Caddy, or a load balancer)
- [ ] Backend services (3001, 3002, 3004, 3006) are NOT directly accessible from the internet — only the reverse proxy should reach them
- [ ] SSL/TLS is enforced (HTTPS only)
- [ ] HTTP → HTTPS redirect is configured

### Secrets Management

- [ ] `.env` is never committed to git (verify: `git log -- .env` shows nothing)
- [ ] Production secrets are stored in a secrets manager (AWS Secrets Manager, Vault, or at minimum Kubernetes Secrets)
- [ ] Stripe keys are set to **live mode** values (not `sk_test_...`)
- [ ] Different secrets are used for staging vs. production

### Data

- [ ] `DB_TYPE=postgres` in production (not SQLite)
- [ ] Daily automated database backups are configured
- [ ] Database is not exposed on a public IP
- [ ] `NEXT_PUBLIC_ENABLE_DEMO` is NOT set (or set to `false`) in production

### PHIPA Compliance (Canadian Health Data)

DentalIQ's architecture is designed to support PHIPA compliance. **Your deployment choices also matter:**

- [ ] Database server is in a Canadian data centre (AWS ca-central-1, or DigitalOcean Toronto)
- [ ] Ollama is used for LLM (zero patient data leaves your infrastructure) OR your cloud LLM provider has a BAA (Business Associate Agreement) for Canadian data
- [ ] Audit logs (`audit_logs` table) are retained for at least 10 years per PHIPA guidelines
- [ ] Access to the server and database is logged
- [ ] Users are required to enable MFA (can be enforced at tenant level)
- [ ] A Privacy Impact Assessment (PIA) has been conducted for your province

---

## 17. Monitoring & Health Checks

### Health Endpoints

Every service exposes a `/health` endpoint. Use these to configure your load balancer, uptime monitors, and alerts.

| Service       | Health URL                     | Expected Response                          |
| ------------- | ------------------------------ | ------------------------------------------ |
| Auth          | `http://localhost:3001/health` | `{"status":"ok","service":"auth-service"}` |
| Tenant        | `http://localhost:3002/health` | `{"status":"ok"}`                          |
| Estimate      | `http://localhost:3004/health` | `{"status":"ok","llmProvider":"..."}`      |
| Agent Manager | `http://localhost:3006/health` | `{"status":"ok"}`                          |

### Recommended External Monitoring

Use a free tier of any of these to get instant alerts if your app goes down:

- [Better Uptime](https://betteruptime.com) — Free tier, nice status pages
- [UptimeRobot](https://uptimerobot.com) — Widely used, free for up to 50 monitors
- [Checkly](https://checklyhq.com) — Synthetics monitoring for API flows

Configure a monitor for each health endpoint + the main web URL.

### Log Aggregation

All services use [Pino](https://github.com/pinojs/pino) structured JSON logging. In production, pipe logs to a centralized service:

- **Axiom** — Generous free tier, instant setup
- **Logtail** (Better Stack) — Developer-friendly, affordable
- **Datadog** — Enterprise-grade, expensive
- **ELK Stack (Elasticsearch + Logstash + Kibana)** — Self-hosted, free, complex

Configure via PM2:

```bash
# Stream logs to a file and your aggregation service
pm2 logs --lines 100
```

### Key Metrics to Track

| Metric              | Warning Threshold | Description               |
| ------------------- | ----------------- | ------------------------- |
| Response time (p99) | > 2 seconds       | Slow estimates hurt UX    |
| Error rate          | > 1%              | Backend errors            |
| LLM latency         | > 10 seconds      | AI explanation generation |
| DB connection pool  | > 80% utilized    | Scale up DB               |
| Memory per service  | > 400 MB          | Memory leak indicator     |

---

## 18. Troubleshooting

### "Port 3000 is already in use"

Another instance of the dev server is running.

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill
```

### "Cannot find module '@dentaliq/db'"

The packages haven't been built yet. Run:

```bash
pnpm build
```

Or start all services with `pnpm dev` which builds dependencies automatically.

### "JWT_SECRET is not set" / "env validation failed"

You haven't created a `.env` file, or `JWT_SECRET` is still the placeholder value.

```bash
# Ensure .env exists
cp .env.example .env

# Generate a real JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Paste the output as JWT_SECRET= in your .env
```

### "Ollama connection refused" / LLM features not working

Ollama isn't running, or the model hasn't been pulled.

```bash
# Start Ollama (macOS — it runs as a background service)
ollama serve

# Pull the model if not done yet
ollama pull llama3.1:8b

# Check it's working
curl http://localhost:11434/api/tags
```

The app gracefully falls back to static templates if Ollama is unavailable. You will see estimates without AI explanations.

### "ECONNREFUSED" errors in services

A service is trying to talk to another service that isn't running. Make sure you started everything with `pnpm dev` instead of starting services individually.

```bash
# Verify all services are up
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3004/health
curl http://localhost:3006/health
```

### Database errors / "no such table"

The schema wasn't applied. Run:

```bash
pnpm db:push
```

Or restart the services — they apply the schema automatically on startup in development mode.

### Signup / Login not working

1. Check that the auth-service is running: `curl http://localhost:3001/health`
2. Check `NEXT_PUBLIC_AUTH_URL` and `NEXT_PUBLIC_API_URL` in your `.env` both point to `http://localhost:3001`
3. Check browser developer tools → Network tab for the failing request and the error message

### Cortex Agents not generating tasks

The agent manager runs on a schedule (2:00 AM daily). To trigger immediately:

```bash
curl -X POST http://localhost:3006/scan
```

Or for a specific tenant:

```bash
curl -X POST http://localhost:3006/scan/<tenantId>
```

---

## 19. Project Structure Reference

```
dentaliq/
│
├── apps/                           # Deployable applications
│   ├── web/                        # Next.js 16 web app (port 3000)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx            # Public landing page
│   │       │   ├── pricing/            # Pricing plans + comparison table
│   │       │   ├── cortex/             # Cortex AI marketing page
│   │       │   ├── legal/              # Legal hub, privacy, terms
│   │       │   ├── (auth)/             # Login, signup, forgot/reset password
│   │       │   ├── (dashboard)/        # Protected clinic dashboard
│   │       │   │   └── dashboard/
│   │       │   │       ├── cortex/     # AI agent command center + inbox
│   │       │   │       ├── estimates/  # CDT cost estimator
│   │       │   │       ├── patients/   # Patient management
│   │       │   │       ├── billing/    # Subscription management
│   │       │   │       ├── settings/   # Clinic configuration
│   │       │   │       └── support/    # Help desk + live chat
│   │       │   └── demo/[plan]/        # Marketing demos (no auth, static data)
│   │       ├── contexts/               # AuthContext, NotificationContext
│   │       ├── components/             # ThemeToggle, shared components
│   │       └── lib/api.ts              # Typed fetch wrapper for all services
│   │
│   ├── admin/                      # Admin portal (port 3005)
│   │
│   ├── auth-service/               # Fastify — JWT, MFA, email (port 3001)
│   │   └── src/
│   │       ├── routes/             # auth, admin, support, users, mfa
│   │       ├── controllers/        # authController, mfaController
│   │       ├── middleware/         # requireAuth, errorHandler
│   │       └── services/           # emailService, auditService
│   │
│   ├── tenant-service/             # Fastify — clinics, patients, billing (port 3002)
│   │   └── src/routes/             # tenants, patients, billing, agents, clinics
│   │
│   ├── estimate-service/           # Fastify — CDT engine + LLM (port 3004)
│   │   └── src/routes/             # estimate, narrative, codes, history
│   │
│   └── agent-manager/              # Node HTTP — Cortex orchestration (port 3006)
│       └── src/
│           ├── agents/             # BillingAgent, RecallAgent, ReviewAgent, etc.
│           └── index.ts            # Cron scheduler + HTTP API
│
├── packages/                       # Shared internal libraries (no build step)
│   ├── db/                         # Drizzle ORM + schema (single dentaliq.db)
│   │   └── src/schema/             # tenants, users, audit, procedures, agentTasks, support
│   ├── config/                     # Zod-validated env var schemas
│   ├── logger/                     # Pino structured logging factory
│   ├── llm-interface/              # LLM abstraction (Ollama/Claude/OpenAI/Gemini)
│   ├── agent-core/                 # BaseAgent class + task helpers
│   └── types/                      # Shared TypeScript types
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.production   # Multi-stage, APP_NAME parameterized build
│   │   └── postgres-init.sql       # PostgreSQL initialization
│   ├── helm/base-service/          # Kubernetes Helm chart (HPA, probes)
│   └── terraform/modules/          # Infrastructure as code (networking)
│
├── docs/
│   ├── ARCHITECTURE.md             # System architecture deep-dive
│   ├── FEATURES.md                 # Plan tiers + feature specifications
│   └── AI_PATTERNS.md              # LLM integration patterns + prompt guidelines
│
├── docker-compose.yml              # Local dev infrastructure (Mailpit)
├── turbo.json                      # Turborepo task pipeline
├── pnpm-workspace.yaml             # pnpm monorepo configuration
├── .env.example                    # Environment variable reference (copy to .env)
├── setup.js                        # Interactive first-run setup wizard (AI/no-AI choice)
└── package.json                    # Root scripts and dev dependencies
```

---

## 20. Contributing

### Branch Strategy

| Branch       | Purpose                                   |
| ------------ | ----------------------------------------- |
| `main`       | Production-ready code                     |
| `feature/*`  | New features                              |
| `fix/*`      | Bug fixes                                 |
| `prod-fix/*` | Production hardening and deployment fixes |

### Code Standards

- **TypeScript everywhere** — No untyped JavaScript
- **No raw SQL** — Use Drizzle ORM for all database access
- **No `(env as any)`** — All environment variables must be in the Zod schema in `packages/config/src/index.ts`
- **No hardcoded secrets** — All configuration via environment variables
- **Structured logging** — Use `createLogger()` from `@dentaliq/logger`, not `console.log`
- **Zod validation** — All API request bodies validated with Zod schemas
- **Health checks** — Every service must expose `GET /health`

### Pre-commit Hooks

Prettier runs automatically on every commit via Husky + lint-staged. If your commit fails, run:

```bash
pnpm --filter prettier -- --write "**/*.{ts,tsx,json,css,md}"
```

### Running a Single Service in Watch Mode

```bash
pnpm --filter @dentaliq/auth-service dev
```

---

## Production Readiness Summary

This section explains how DentalIQ meets production-grade SaaS criteria out of the box.

| Criteria                     | Implementation                                                                                                  | Status |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| **Multi-tenancy**            | Per-tenant JWT, rate limiting keyed by tenantId, isolated data access                                           | ✅     |
| **Authentication**           | JWT + refresh token rotation, multi-method MFA (TOTP / email OTP / SMS OTP), email verification, password reset | ✅     |
| **Authorization**            | Role-based (admin, dentist, front_desk), per-route middleware                                                   | ✅     |
| **Input validation**         | Zod schemas on all API endpoints, typed env vars                                                                | ✅     |
| **SQL injection prevention** | Drizzle ORM parameterized queries — no raw SQL anywhere                                                         | ✅     |
| **XSS prevention**           | React's built-in escaping, Helmet security headers                                                              | ✅     |
| **CSRF prevention**          | SameSite cookie policy, CORS allowlist                                                                          | ✅     |
| **Rate limiting**            | Per-tenant rate limiting on all backend services                                                                | ✅     |
| **Security headers**         | Fastify Helmet on all services (CSP, HSTS, X-Frame-Options, etc.)                                               | ✅     |
| **Structured logging**       | Pino JSON logging on all services                                                                               | ✅     |
| **Health checks**            | `/health` endpoint on every service, Docker HEALTHCHECK configured                                              | ✅     |
| **Graceful shutdown**        | SIGINT/SIGTERM handlers — no abrupt connection drops                                                            | ✅     |
| **Environment validation**   | Zod schema validates all env vars on startup                                                                    | ✅     |
| **PCI compliance**           | Stripe.js card tokenization — no raw card data touches the server                                               | ✅     |
| **PHIPA audit logging**      | Append-only `audit_logs` table captures all user actions                                                        | ✅     |
| **Database flexibility**     | SQLite for development, PostgreSQL for production — same codebase                                               | ✅     |
| **LLM resilience**           | Automatic fallback chain ensures estimates work even if AI is down                                              | ✅     |
| **Container support**        | Multi-stage Dockerfile, non-root user, HEALTHCHECK                                                              | ✅     |
| **Kubernetes ready**         | Helm chart with HPA, liveness/readiness probes                                                                  | ✅     |
| **CI/CD ready**              | Turborepo caching, build outputs defined, image tag parameterized                                               | ✅     |
| **Human-in-the-loop AI**     | Cortex agents generate pending tasks — no automated actions without approval                                    | ✅     |

---

_DentalIQ is built for Canadian dental practices with PHIPA compliance in mind. All patient data processing happens within your infrastructure when using Ollama. For regulatory questions specific to your province, consult a healthcare privacy lawyer._

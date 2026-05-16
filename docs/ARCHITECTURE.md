# System Architecture

DentalIQ is a modern full-stack monorepo managed by **Turborepo** with **pnpm workspaces**. All services share internal TypeScript packages for type safety, logging, and database access without any compiled build step — packages expose their `src/index.ts` directly and are run via `tsx`.

---

## High-Level Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                          │
│  ┌───────────────────────┐    ┌────────────────────────────┐   │
│  │  Web App (port 3000)  │    │  Admin Portal (port 3005)  │   │
│  │  Next.js 16 App Router│    │  Next.js 16 (internal)     │   │
│  └──────────┬────────────┘    └──────────────┬─────────────┘   │
└─────────────┼─────────────────────────────────┼─────────────────┘
              │ HTTPS / REST                     │ HTTPS + ADMIN_SECRET
              ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND MICROSERVICES                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  Auth Service  │  │ Tenant Service │  │Estimate Service│    │
│  │   port 3001    │  │   port 3002    │  │   port 3004    │    │
│  │  Fastify + JWT │  │    Fastify     │  │  Fastify + LLM │    │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘    │
│           │                   │                    │             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               Agent Manager (port 3006)                   │   │
│  │       Node.js HTTP — Cortex agent scheduling + queue      │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                               │
│  ┌──────────────────────┐    ┌─────────────────────────────┐   │
│  │  SQLite (dev)         │    │  PostgreSQL (production)     │   │
│  │  dentaliq.db at root  │    │  ACID, multi-instance, pool  │   │
│  └──────────────────────┘    └─────────────────────────────┘   │
│  ┌──────────────────────┐    ┌─────────────────────────────┐   │
│  │  Ollama (local LLM)   │    │  Claude / OpenAI (cloud LLM)│   │
│  │  port 11434           │    │  Automatic fallback chain    │   │
│  └──────────────────────┘    └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Service Port Map

| Service          | Port     | Purpose                                     |
| ---------------- | -------- | ------------------------------------------- |
| Web Frontend     | **3000** | Public landing page + clinic dashboard      |
| Auth Service     | **3001** | Registration, login, JWT, MFA, email        |
| Tenant Service   | **3002** | Clinic data, patients, billing, PMS         |
| Billing Service  | **3003** | Stripe subscription management              |
| Estimate Service | **3004** | CDT cost engine + AI narrative generation   |
| Admin Portal     | **3005** | Internal operations dashboard               |
| Agent Manager    | **3006** | Cortex agent scheduling + task approval queue|

---

## Monorepo Structure

```
dentaliq/
├── apps/
│   ├── web/                    # Next.js 16 — public site + dashboard (port 3000)
│   ├── admin/                  # Next.js 16 — internal admin portal (port 3005)
│   ├── auth-service/           # Fastify — JWT, MFA, email verification (port 3001)
│   ├── tenant-service/         # Fastify — clinics, patients, billing (port 3002)
│   ├── estimate-service/       # Fastify — CDT engine + LLM integration (port 3004)
│   └── agent-manager/          # Node.js HTTP — Cortex orchestration (port 3006)
│
├── packages/                   # Shared internal libraries (no build step)
│   ├── db/                     # Drizzle ORM schemas + database client
│   ├── config/                 # Zod-validated environment variable schemas
│   ├── logger/                 # Pino structured logging factory
│   ├── llm-interface/          # LLM abstraction (Ollama / Claude / OpenAI / Gemini)
│   ├── types/                  # Shared TypeScript types across services
│   └── agent-core/             # Base agent class + task helpers
│
├── infra/
│   ├── docker/                 # Multi-stage Dockerfile for production
│   ├── helm/base-service/      # Kubernetes Helm chart
│   └── terraform/modules/      # Network infrastructure
│
├── docs/                       # You are here
├── setup.js                    # Interactive first-run setup wizard
├── docker-compose.yml          # Local dev infrastructure (Mailpit)
├── turbo.json                  # Turborepo build pipeline
└── pnpm-workspace.yaml         # pnpm monorepo configuration
```

> **No build step for packages.** Each package sets `"main": "./src/index.ts"` in its `package.json`. The `tsx` runtime used by all services executes TypeScript directly. There are no compiled `.js` files to maintain.

---

## Frontend Architecture (Next.js 16)

The web app uses the Next.js **App Router** with React Server Components where possible and `"use client"` for interactive pages.

### Route Groups

| Route Group        | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `/`                | Public landing page (homepage, pricing, Cortex marketing page) |
| `/(auth)/`         | Login, signup, forgot/reset password, email verify             |
| `/(dashboard)/`    | Protected clinic dashboard — requires valid JWT                |
| `/demo/[plan]/`    | Fully static demo — no auth, no database, pure React state     |
| `/cortex/`         | Public Cortex AI marketing page                                |
| `/pricing/`        | Public pricing page with plan comparison table                 |
| `/legal/`, etc.    | Terms of service, privacy policy, legal pages                  |

### State Management

- **AuthContext** (`contexts/auth-context.tsx`) — Stores the JWT access token and user in React state + `localStorage`. Automatically restores the session on page load. Runs a proactive 14-minute refresh interval (tokens expire after 15 minutes) to prevent mid-session 401 errors.
- **NotificationContext** (`contexts/notification-context.tsx`) — Global toast notification system.
- **Local state** — `useState` / `useEffect` for component-level interactions.

### API Client

`lib/api.ts` is a fully typed `fetch` wrapper that:
- Injects `Authorization: Bearer <token>` on every request
- Injects `x-clinic-id` for tenant isolation
- Throws typed `ApiError` instances for non-2xx responses
- Exposes domain-specific namespaces: `authApi`, `tenantApi`, `estimateApi`, `agentApi`

### Styling

Inline styles with CSS custom properties only — no Tailwind classes in production pages, no CSS modules. Design tokens defined in `globals.css` cover colors, spacing, radius, and shadows for both light and dark themes.

---

## Backend Architecture (Fastify)

All backend services use **Fastify 4** (not Express) for:
- Schema-based request validation (JSON Schema / Zod)
- 2–3× better throughput than Express
- Plugin-based architecture (CORS, Helmet, JWT, rate-limit)

### Shared Patterns Across Services

```typescript
// Every service follows this pattern:
import Fastify from 'fastify'
import { requireAuth } from './middleware/requireAuth'
import { errorHandler } from './middleware/errorHandler'

const app = Fastify({ logger: createLogger('service-name') })
app.register(cors, { origin: getAllowedOrigins() })
app.register(helmet)
app.setErrorHandler(errorHandler)

// Health check (required by Kubernetes probes)
app.get('/health', async () => ({ status: 'ok' }))
```

### Tenant Isolation

Every authenticated request must carry:
1. `Authorization: Bearer <accessToken>` — signed JWT containing `userId` and `tenantId`
2. `x-clinic-id` header — verified against `tenantId` in the JWT

The `requireAuth` middleware rejects requests where these don't match, making cross-tenant data access impossible even with a valid token.

### Database Access

All services import from `@dentaliq/db`:
```typescript
import { getDb, schema } from '@dentaliq/db'
const db = getDb() // Returns the Drizzle instance for dentaliq.db
```

A single `dentaliq.db` file at the repo root is shared by all services in development. In production (PostgreSQL), the same Drizzle schema targets the cloud database — no code changes required.

---

## Database Schema

Managed by **Drizzle ORM** in `packages/db/src/schema/`. All tables live in a single SQLite file (`dentaliq.db`) in development.

| Table              | Purpose                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `tenants`          | Clinic accounts — plan, PMS config, Stripe subscription          |
| `users`            | Clinic staff — roles: `admin`, `dentist`, `front_desk`           |
| `refresh_tokens`   | JWT refresh token store (for rotation + revocation)              |
| `audit_logs`       | Append-only PHIPA compliance log (every user action is recorded) |
| `procedures`       | CDT dental code library (fee schedules, coverage limits)         |
| `agent_tasks`      | Cortex agent output queue — `pending`, `approved`, `rejected`    |
| `support_tickets`  | Help desk tickets                                                |
| `support_messages` | Ticket conversation threads                                      |
| `cdt_uploads`      | Bulk CDT code upload records                                     |
| `cdt_supply_map`   | CDT code to supply item mappings (for Supply Agent)              |

### Schema Application

```bash
# Dev: auto-applied on service startup
# Manual apply (or after schema changes):
pnpm db:push

# Visual database GUI:
pnpm --filter @dentaliq/db db:studio
# → opens Drizzle Studio at http://localhost:4983
```

---

## LLM / AI Architecture

### The `llm-interface` Package

All AI calls go through `packages/llm-interface`, which provides a unified `generateText(prompt, systemPrompt)` interface regardless of the underlying provider.

```typescript
// Usage in any service:
import { getLLMWithFallback } from '@dentaliq/llm-interface'

const llm = getLLMWithFallback()
const narrative = await llm.generateText(prompt, systemPrompt)
```

### Automatic Fallback Chain

```
1. Primary provider (configured by LLM_PROVIDER env var)
   ↓ if unavailable
2. Ollama (if localhost:11434 is reachable)
   ↓ if unavailable
3. Claude (if ANTHROPIC_API_KEY is set)
   ↓ if unavailable
4. Static template (always works — no AI, rule-based output)
```

This means estimates always return results even if every AI provider is down.

### Provider Configuration

| `LLM_PROVIDER` | Required Env Var      | Notes                                    |
| -------------- | --------------------- | ---------------------------------------- |
| `ollama`       | _(none)_              | Default. Requires Ollama running locally |
| `openai`       | `OPENAI_API_KEY`      | gpt-4o-mini by default                   |
| `claude`       | `ANTHROPIC_API_KEY`   | claude-3-5-haiku by default              |
| `gemini`       | `GOOGLE_API_KEY`      | gemini-1.5-flash by default              |

---

## Authentication Architecture

### Token Flow

```
1. POST /auth/login → returns { accessToken, user }
   └── accessToken: JWT signed with JWT_SECRET, expires in 15 min
   └── refreshToken: stored in httpOnly cookie, expires in 7 days

2. Client stores accessToken in localStorage (AuthContext)

3. Every API request: Authorization: Bearer <accessToken>

4. AuthContext proactive refresh (every 14 min):
   POST /auth/refresh (sends httpOnly cookie automatically)
   └── returns new accessToken
   └── AuthContext updates localStorage + React state

5. On refresh failure → clearSession() → redirect to /logout
```

### JWT Payload

```typescript
{
  userId: string,
  tenantId: string,
  email: string,
  role: 'admin' | 'dentist' | 'front_desk',
  iat: number,
  exp: number
}
```

### MFA (TOTP)

Optional TOTP-based MFA backed by `otpauth`. Users can enroll by scanning a QR code in Settings. Once enrolled, every login requires a 6-digit code after password verification.

---

## Cortex Agent Architecture

### Agent Lifecycle

```
1. Hire:     Clinic enables an agent via dashboard
             → tenant record updated with active agents list

2. Schedule: Agent Manager runs a cron at 2:00 AM daily
             → scans all tenants with that agent enabled

3. Scan:     Agent queries tenant data for actionable items
             (e.g., BillingAgent finds unpaid invoices > 30 days)

4. Generate: Agent calls LLM to draft the action
             (e.g., pre-auth letter, recall message, review request)

5. Queue:    Agent creates an agent_task record: status = 'pending'

6. Review:   Clinic staff sees pending tasks in Cortex Approval Inbox

7. Approve:  Staff clicks Approve → task status = 'approved'
             → downstream action executes (email sent, letter exported, etc.)

8. Reject:   Staff clicks Reject → task status = 'rejected', no action taken
```

### Manual Trigger (Development)

```bash
# Trigger all agents for all tenants
curl -X POST http://localhost:3006/scan

# Trigger for a specific tenant
curl -X POST http://localhost:3006/scan/<tenantId>
```

### Agent Roster

| Agent            | Code      | What It Monitors                              |
| ---------------- | --------- | --------------------------------------------- |
| Billing Agent    | CORTEX-01 | Unpaid invoices, pre-auth gaps, CDCP denials  |
| Recall Agent     | CORTEX-02 | Patients overdue for hygiene appointments     |
| Review Agent     | CORTEX-03 | Satisfied patients who haven't left a review  |
| Supply Agent     | CORTEX-04 | Inventory levels vs. upcoming procedure load  |
| Treatment Coord. | CORTEX-05 | High-value unscheduled treatment plans        |
| Hygienist Agent  | CORTEX-06 | Last-minute cancellations + waitlist matching |

---

## Deployment Architecture

### Development

```bash
node setup.js   # Interactive first-run: installs deps, sets up .env, seeds DB
pnpm dev        # Starts all 6 services in parallel via Turborepo
```

### Production Options

| Approach                      | Best For                            | Guide                     |
| ----------------------------- | ----------------------------------- | ------------------------- |
| Single VPS + Docker Compose   | MVPs, startups, cost-sensitive      | README §13                |
| PM2 on a VPS                  | Simple, no Docker dependency        | README §13                |
| Kubernetes + Helm             | Scale-out, multi-region, enterprise | README §15, `infra/helm/` |
| Vercel (web) + Railway (APIs) | Easiest PaaS deployment             | —                         |

### Container Build

```bash
# Build any service using APP_NAME build arg
docker build \
  --build-arg APP_NAME=auth-service \
  -f infra/docker/Dockerfile.production \
  -t dentaliq/auth-service:latest .
```

The Dockerfile uses multi-stage builds with a non-root user and HEALTHCHECK configured on the `/health` endpoint.

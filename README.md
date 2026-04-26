# DentalIQ — Phase 1

AI Insurance Copilot for Ontario Dental Clinics

## Quick start

```bash
# 1. Run setup (installs deps, starts Docker, pushes DB schema)
node setup.js

# 2. Start all services
pnpm dev

# 3. Test auth service
curl http://localhost:3001/health
```

## Services

| Service | Port | Description |
|---|---|---|
| `apps/web` | 3000 | Next.js frontend |
| `apps/auth-service` | 3001 | JWT, MFA, RBAC |
| `apps/tenant-service` | 3002 | Clinic provisioning |
| `apps/billing-service` | 3003 | Stripe integration |

## Dev tools

| Tool | URL |
|---|---|
| Mailpit (emails) | http://localhost:8025 |
| DB Studio | `pnpm db:studio` |
| pgAdmin | `docker-compose --profile tools up` → http://localhost:5050 |

## API reference

### Register (creates clinic + admin user)
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Sarah Chen",
    "email": "sarah@lakeviewdental.ca",
    "password": "SecurePass123!",
    "clinicName": "Lakeview Dental Group",
    "plan": "pro"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sarah@lakeviewdental.ca", "password": "SecurePass123!"}'
```

### Setup MFA
```bash
curl -X POST http://localhost:3001/auth/mfa/setup \
  -H "Authorization: Bearer <access_token>"
```

### Get current user
```bash
curl http://localhost:3001/users/me \
  -H "Authorization: Bearer <access_token>"
```

## Environment

Copy `.env.example` to `.env` and fill in values.
The most important one to change: `JWT_SECRET` (must be 32+ chars).

## Tech stack

- **Runtime**: Node.js 20, TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Cache/sessions**: Redis
- **Auth**: JWT + TOTP (MFA) + bcrypt
- **Validation**: Zod
- **Logging**: Pino
- **Build**: Turborepo + pnpm workspaces
- **Local dev**: Docker Compose

## Phase roadmap

- ✅ **Phase 1** — Foundation (this)
- ⬜ **Phase 2** — Insurance engine + LLM service + Open Dental connector
- ⬜ **Phase 3** — Kubernetes + Helm + ArgoCD
- ⬜ **Phase 4** — LangGraph agent orchestrator + MCP server
- ⬜ **Phase 5** — Scale, fine-tuning, partner APIs

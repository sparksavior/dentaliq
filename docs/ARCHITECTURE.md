# System Architecture

DentalIQ is built as a modern full-stack monorepo managed by **Turborepo**. This structure allows us to share TypeScript configurations, UI components, and utility functions across multiple specialized services.

## High-Level Topology

1. **Frontend (`apps/web`)**: A Next.js 14 App Router application. Handles the landing page, authentication flows, the main dashboard, and the isolated demo engine.
2. **Microservices (`apps/auth-service`, `apps/tenant-service`, `apps/estimate-service`)**: Express.js APIs running on specific ports (3001, 3002, 3004). They handle domain-specific logic.
3. **Agent Manager (`apps/agent-manager`)**: A dedicated Node.js service (port 3005) responsible for orchestrating background AI tasks (Cortex Agents) and interfacing with the local LLM (Ollama).
4. **Database (`packages/db`)**: SQLite databases managed via Drizzle ORM. We use separate databases (`auth.db`, `tenant.db`, `estimate.db`) to simulate a microservice-oriented data architecture, connected via shared schema definitions.

## The Monorepo Structure

```text
dentaliq/
├── apps/
│   ├── web/                # Next.js UI (Port 3000)
│   ├── auth-service/       # Express API (Port 3001)
│   ├── tenant-service/     # Express API (Port 3002)
│   ├── estimate-service/   # Express API (Port 3004)
│   └── agent-manager/      # Autonomous Agents API (Port 3005)
├── packages/
│   ├── db/                 # Drizzle ORM schemas & SQLite db files
│   ├── ui/                 # Shared React components (future extraction)
│   ├── config-typescript/  # Shared tsconfig
│   └── config-eslint/      # Shared linting rules
├── docs/                   # You are here
└── turbo.json              # Turborepo build orchestration
```

## Frontend Architecture (Next.js)

The frontend utilizes the Next.js **App Router**.

- **Routing Strategy**:
  - `(marketing)`: Public pages like the landing page.
  - `(auth)`: Login and Signup flows.
  - `(dashboard)`: The authenticated application. Wrapped in `AuthContext` and `ClinicContext` to ensure data isolation and state management.
  - `demo/[plan]`: A completely isolated, static replica of the dashboard used for marketing purposes without hitting the database.

- **State Management**: React Context (`contexts/`) is used for global state like authentication tokens and selected clinic. Local component state is handled via `useState` and `useEffect`.
- **API Client**: `lib/api.ts` provides a fully typed wrapper around `fetch`, automatically injecting auth tokens and the `x-clinic-id` header for tenant isolation.

## Backend Architecture (Express + Drizzle)

We use Express.js for our microservices due to its simplicity and robust middleware ecosystem.

- **Drizzle ORM**: Selected for its type-safety and SQL-like syntax. We use `better-sqlite3` as the driver. Database instances are localized to their respective services but share schemas from `packages/db`.
- **Tenant Isolation**: Every API request that deals with clinic data requires a valid JWT (`Authorization: Bearer <token>`) and an `x-clinic-id` header. The services verify that the user belongs to the requested tenant before proceeding.
- **Cross-Service Communication**: Services communicate via HTTP. For example, `tenant-service` might call `auth-service` to verify a token, or the web app stitches data together from multiple services.

## Deployment Strategy

Currently, the platform is designed to run locally using `pnpm dev`, which uses `turbo run dev` to start all services concurrently. The underlying architecture is container-ready, allowing each `app/` to be containerized using Docker and orchestrated via Kubernetes or a PaaS (like Vercel for web, and Render/Railway for services) in a production environment.

# DentalIQ Insurance Copilot — Feature Branch Documentation

> **Branch:** `feature/phase-3-open-dental`
> **Base:** `main` (commit `e509ebd`)
> **Status:** Active development — Phase 3 AI Copilot & Multi-Clinic Management

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [New Features vs Main](#new-features-vs-main)
   - [1. AI Copilot Chatbot with Live Clinic Context](#1-ai-copilot-chatbot-with-live-clinic-context)
   - [2. Multi-Clinic Location Management](#2-multi-clinic-location-management)
   - [3. Interactive Notification System](#3-interactive-notification-system)
   - [4. User Settings](#4-user-settings)
   - [5. Login / Auth Page Dark-Mode Parity](#5-login--auth-page-dark-mode-parity)
   - [6. Wider Signup Wizard](#6-wider-signup-wizard)
   - [7. Redesigned Landing Page with Product Demos](#7-redesigned-landing-page-with-product-demos)
4. [Backend API Reference](#backend-api-reference)
5. [Database Schema Changes](#database-schema-changes)
6. [Environment Variables](#environment-variables)
7. [Running Locally](#running-locally)
8. [Architecture Diagram](#architecture-diagram)
9. [Phase 3 Roadmap](#phase-3-roadmap)

---

## Project Overview

DentalIQ is an AI-powered insurance intelligence platform for Ontario dental clinics. It provides real-time cost estimates, claim risk detection, pre-authorization drafting, and an intelligent AI copilot — all from a single dashboard.

This branch (`feature/phase-3-open-dental`) builds on the Phase 2 core with:

- A context-aware **AI Copilot** grounded in live patient/claim data
- A fully functional **multi-clinic management** system backed by a real database
- An interactive, clickable **notification bell** with live claim alerts
- **Per-clinic dashboards and settings** accessible from the sidebar accordion
- A completely **redesigned marketing landing page** with interactive product demos
- **Dark/light mode** parity across all auth screens

---

## Folder Structure

```
dentaliq/
├── apps/
│   ├── auth-service/                    # Authentication microservice (port 3001)
│   │   ├── scripts/
│   │   │   └── seed-demo.ts             # Seeds demo tenant + patients
│   │   └── src/
│   │       ├── controllers/
│   │       │   ├── authController.ts    # Login, signup, token refresh logic
│   │       │   └── mfaController.ts     # TOTP MFA verify/setup
│   │       ├── middleware/
│   │       │   ├── errorHandler.ts      # Global error formatting
│   │       │   └── requireAuth.ts       # JWT verification middleware
│   │       ├── routes/
│   │       │   ├── auth.ts              # POST /login, /register, /refresh
│   │       │   ├── mfa.ts               # POST /mfa/setup, /mfa/verify
│   │       │   └── users.ts             # GET /users/me, PATCH /users/me
│   │       └── services/
│   │           ├── emailService.ts      # Nodemailer email verification
│   │           └── tenantService.ts     # ★ MODIFIED: creates clinic_locations table
│   │
│   ├── estimate-service/                # AI estimate microservice (port 3003)
│   │   └── src/
│   │       ├── data/
│   │       │   ├── cdt-codes.ts         # CDT procedure code definitions
│   │       │   └── coverage-rules.ts    # Insurer coverage rule engine data
│   │       ├── middleware/
│   │       │   └── requireAuth.ts
│   │       ├── routes/
│   │       │   └── estimate.ts          # POST /estimate — core estimation logic
│   │       └── services/
│   │           ├── claimRisk.ts         # Risk scoring (LOW/MEDIUM/HIGH)
│   │           ├── llmExplainer.ts      # Ollama LLM patient-facing explanations
│   │           ├── llmNarrativeGenerator.ts  # Ollama pre-auth narrative drafts
│   │           └── rulesEngine.ts       # Coverage rules processor
│   │
│   ├── tenant-service/                  # Tenant data microservice (port 3002)
│   │   └── src/
│   │       ├── middleware/
│   │       │   └── requireAuth.ts
│   │       ├── routes/
│   │       │   ├── clinics.ts           # ★ NEW: CRUD for clinic locations
│   │       │   ├── patients.ts          # ★ MODIFIED: added /ai-context endpoint
│   │       │   └── tenants.ts           # GET /tenants/me
│   │       └── index.ts                 # ★ MODIFIED: registers clinics route
│   │
│   └── web/                             # Next.js 15 frontend (port 3000)
│       └── src/
│           ├── app/
│           │   ├── (auth)/
│           │   │   ├── layout.tsx       # ★ MODIFIED: dark-mode aware background
│           │   │   ├── login/
│           │   │   │   └── page.tsx     # Login form (unchanged)
│           │   │   └── signup/
│           │   │       └── page.tsx     # ★ MODIFIED: wider container (860px)
│           │   ├── (dashboard)/
│           │   │   ├── layout.tsx       # Dashboard shell
│           │   │   └── dashboard/
│           │   │       └── page.tsx     # ★ HEAVILY MODIFIED: all new features
│           │   ├── globals.css          # ★ MODIFIED: scroll-behavior smooth
│           │   ├── layout.tsx           # Root layout
│           │   └── page.tsx             # ★ HEAVILY MODIFIED: new landing page
│           ├── contexts/
│           │   └── auth-context.tsx     # JWT session context
│           └── lib/
│               └── api.ts               # ★ MODIFIED: added clinicsApi + types
│
├── packages/                            # Shared packages (drizzle schema, db utils)
├── infra/                               # Docker / infra configs
├── docker-compose.yml
├── turbo.json                           # Turborepo pipeline
├── pnpm-workspace.yaml
└── README.md                            # ★ This file
```

---

## New Features vs Main

### 1. AI Copilot Chatbot with Live Clinic Context

**What it does:**
The dashboard includes a floating AI chat bubble (bottom-right) powered by a locally running **Ollama** model (`phi3`). Unlike a generic chatbot, every message is grounded in the clinic's **real-time data**: patient names, dates of birth, phone numbers, last visit dates, insurance plans, and claim histories. The AI can answer questions like:
- *"What is Sarah Chen's phone number?"*
- *"What is the status of Michael's latest claim?"*
- *"Which patients have Sun Life coverage?"*
- *"What's our total pending revenue?"*

**Implementation:**

| Layer | File | Detail |
|---|---|---|
| Backend endpoint | `apps/tenant-service/src/routes/patients.ts` | `GET /patients/ai-context` — performs a 3-table JOIN across `patients`, `estimates`, and `insurance_plans`, aggregating totals, risk distribution, and per-patient claim history into a single JSON snapshot |
| Frontend API client | `apps/web/src/lib/api.ts` | `patientsApi.getAiContext(token)` |
| Dashboard integration | `apps/web/src/app/(dashboard)/dashboard/page.tsx` | `handleSendChat()` — fetches `/ai-context` on every message, injects the JSON as a system prompt into the Ollama `phi3` model via `POST http://localhost:11434/api/chat` |
| Ollama model | Local | `phi3` via `ollama run phi3` — runs on port `11434` |

**System prompt pattern:**
```
You are DentalIQ Copilot, an expert dental insurance assistant.
CLINIC CONTEXT (live data):
<full JSON of patients, claims, insurance plans, revenue totals>
Answer the user's question based strictly on this data.
```

**Error handling:** If the `ai-context` endpoint is unreachable (expired token, service down), the chat degrades gracefully — the AI responds without clinic context rather than crashing the dashboard.

---

### 2. Multi-Clinic Location Management

**What it does:**
Clinics with multiple locations can now manage each one independently. Every clinic location has its own:
- Dashboard with KPI cards
- Settings form (name, address, phone, email, hours, PMS type)
- Delete functionality

**Implementation:**

#### Backend

| File | Change |
|---|---|
| `apps/auth-service/src/services/tenantService.ts` | Added `CREATE TABLE IF NOT EXISTS "${prefix}_clinic_locations"` to `createTenantTables()` — runs for every new tenant registration |
| `apps/tenant-service/src/routes/clinics.ts` | **NEW FILE** — full CRUD router: `GET /clinics`, `POST /clinics`, `PATCH /clinics/:id`, `DELETE /clinics/:id`. Also runs `CREATE TABLE IF NOT EXISTS` on first GET to backfill existing tenants |
| `apps/tenant-service/src/index.ts` | Registered `clinicsRoutes` at prefix `/clinics` |

#### Database Table: `{prefix}_clinic_locations`

```sql
CREATE TABLE IF NOT EXISTS "{prefix}_clinic_locations" (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'inactive'
  operating_hours TEXT,
  pms_type        TEXT DEFAULT 'none',
  pms_connected   INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
)
```

#### Frontend

| File | Change |
|---|---|
| `apps/web/src/lib/api.ts` | Added `ClinicLocation` interface, `ClinicLocationInput` interface, and `clinicsApi` object (`list`, `create`, `update`, `remove`) |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | `clinics` state array, `selectedClinicId`, `clinicsExpanded` accordion, `loadClinics()`, `saveClinicSettings()`, `addClinic()` |

#### UI Components added to dashboard:

1. **Sidebar Clinics section** (line ~676) — collapsible accordion under a "CLINICS" section label. Shows each location as a sub-tree with `Dashboard` and `Settings` sub-links. `+ Add Location` shortcut at the bottom.

2. **All Clinics tab** (`activeTab === 'clinics'`) — responsive card grid, each card shows: name, address, status badge, phone, PMS type, "View Dashboard" and "Settings" buttons.

3. **Clinic Dashboard tab** (`activeTab === 'clinic-dashboard'`) — per-clinic KPI cards (Total Patients, Pending Claims, Revenue), breadcrumb navigation, link to clinic settings.

4. **Clinic Settings tab** (`activeTab === 'clinic-settings'`) — editable form fields, Save (PATCH to DB) and Delete buttons.

5. **Add Clinic modal** — blurred backdrop modal with all fields, triggered from sidebar or the All Clinics card.

---

### 3. Interactive Notification System

**What it does:**
The notification bell (top-right nav) is now a fully interactive dropdown panel — clicking it reveals a real list of notifications with type-coded icons, timestamps, unread indicators, and actions.

**Before (main):** Simple integer counter that incremented every 25 seconds.

**After (this branch):** Rich typed notification objects with a full panel UI.

**Implementation:**

All in `apps/web/src/app/(dashboard)/dashboard/page.tsx`:

```typescript
interface Notification {
  id: number
  title: string
  body: string
  type: 'approval' | 'denial' | 'info' | 'warning'
  time: Date
  read: boolean
}
```

| Feature | Implementation |
|---|---|
| Notification state | `useState<Notification[]>` seeded with 1 real approval on load |
| Simulated live events | `useRef` + `setInterval(25s)` rotates through 5 realistic claim events and prepends them to the list |
| Bell badge | Shows **unread count only** — turns red with bounce animation. Cleared when panel is opened |
| Dropdown panel | `position: absolute`, `zIndex: 9000`, `fadeIn` animation, max-height `360px` scrollable |
| Type icons | ✅ approval (green bg), ❌ denial (red bg), ⚠️ warning (amber bg), ℹ️ info (indigo bg) |
| "Mark all read" | Button clears all unread dots |
| "Clear all" | Empties notification list |
| Unread dot | Teal 8px circle on each unread item |

---

### 4. User Settings

**What it does:**
A new **User Settings** tab accessible from the sidebar System section. Displays the logged-in user's profile with editable name/email fields and a read-only account info panel.

**Implementation:**

| File | Change |
|---|---|
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | New `activeTab === 'user-settings'` view, `userSettingsForm` state, `userSettingsSaved` feedback state |

**Sidebar item:** Added `<SidebarItem id="user-settings" icon={<UserCircle />} label="User Settings" />` under the System section (both expanded and collapsed sidebar states show the icon).

**Panel sections:**
1. **Profile card** — avatar circle with initials, name, role, email
2. **Editable fields** — Full Name, Email Address (frontend state only — backend `PATCH /users/me` hookup is Phase 3)
3. **Account Info** — read-only grid showing User ID, Tenant ID, Role (from JWT claims)
4. **Save confirmation** — green success banner appears on save

---

### 5. Login / Auth Page Dark-Mode Parity

**What it does:**
The login and signup screens previously had a hardcoded light blue/white gradient background (`from-slate-50 to-blue-50`) that never changed regardless of system dark mode. The background now matches the card's color tone in both light and dark mode.

**Implementation:**

`apps/web/src/app/(auth)/layout.tsx` — complete rewrite:

| Before | After |
|---|---|
| Tailwind `bg-gradient-to-br from-slate-50 to-blue-50` | `var(--color-background-primary)` CSS variable |
| Hardcoded `text-slate-900` logo | `var(--color-text-primary)` |
| Hardcoded `text-blue-600` accent | `#0f766e` (brand teal) |
| No dark mode support | Fully reactive via CSS variables + `prefers-color-scheme` |

The DentalIQ logo in the auth header was also updated to match the dashboard branding: teal `+` icon badge + teal `IQ` text.

---

### 6. Wider Signup Wizard

**What it does:**
The 5-step account creation wizard felt narrow on modern screens. The container was widened to give each step more breathing room.

**Implementation:**

`apps/web/src/app/(auth)/signup/page.tsx` — line 183:

```diff
- <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.5rem' }}>
+ <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 2rem' }}>
```

---

### 7. Redesigned Landing Page with Product Demos

**What it does:**
The marketing landing page (`/`) was a minimal text-only page (780px wide). It has been completely redesigned as a full product showcase with interactive live demos.

**Implementation:** `apps/web/src/app/page.tsx` — complete rewrite.

#### Key changes:

| Section | Details |
|---|---|
| **Layout** | Widened to `1100px` max-width, sticky nav, `scroll-behavior: smooth` |
| **Nav** | All 4 links (`Features`, `Demo`, `Pricing`, `Security`) now anchor-scroll to their sections with `#id` hash links + hover teal state |
| **Hero** | 58px headline, badge pill "✦ Now with multi-clinic & AI Copilot", teal CTA with box-shadow |
| **Stats row** | 3 KPI cards: `$6.4K` avg revenue recovered, `23%` fewer rejections, `94min` saved/week |
| **Features section** (`#features`) | 4-tab interactive switcher: **Cost Estimator**, **AI Copilot Chat**, **Live Notifications**, **Multi-Clinic**. Each tab renders a live UI mockup of that feature |
| **Demo section** (`#demo`) | 3-step "How it works" cards with numbered teal badges |
| **Pricing section** (`#pricing`) | 3 plan cards with per-plan CTA buttons, selected-plan highlight border, "Most popular" badge |
| **Security section** (`#security`) | 6 compliance cards in horizontal icon+text layout: PHIPA, Canadian data residency, AES-256, Audit Logs, RBAC, PIPEDA |
| **CTA block** | Teal gradient background with teal glow button |
| **Footer** | Copyright + Privacy/Terms/Security/Support links |

#### Interactive Demo Tabs (live UI mockups):

**Cost Estimator demo:**
```
CDT Code: D2750 Crown | Insurer: Sun Life
Coverage: 80% | Insurer Pays: $760 | Patient Owes: $190
✓ Low claim risk · Standard procedure, well-covered
```

**AI Copilot demo:**
Simulated chat conversation showing patient phone/last visit lookups and claim status queries.

**Notifications demo:**
Three sample notifications (approval ✅, denial ❌, warning ⚠️) rendered exactly as they appear in the real dashboard.

**Multi-Clinic demo:**
A 2×2 grid of clinic location cards (Downtown Toronto, Scarborough East, North York, Mississauga West) with patient counts.

#### Smooth scroll:
`apps/web/src/app/globals.css`:
```css
html { scroll-behavior: smooth; }
```
Each section has `scrollMarginTop: '80px'` to account for the sticky nav height.

---

## Backend API Reference

### Auth Service — `http://localhost:3001`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Create account, initiate email verify |
| POST | `/auth/login` | ❌ | Login, returns JWT + user |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/verify-email` | ❌ | Verify OTP from email |
| GET | `/users/me` | ✅ | Get current user profile |
| POST | `/mfa/setup` | ✅ | Generate TOTP secret + QR |
| POST | `/mfa/verify` | ✅ | Verify TOTP code |

### Tenant Service — `http://localhost:3002`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tenants/me` | ✅ | Get current tenant details |
| GET | `/patients` | ✅ | List all patients |
| POST | `/patients` | ✅ | Create patient |
| DELETE | `/patients/:id` | ✅ | Delete patient |
| **GET** | **`/patients/ai-context`** | ✅ | **★ NEW** — Full clinic snapshot for AI copilot |
| **GET** | **`/clinics`** | ✅ | **★ NEW** — List all clinic locations |
| **POST** | **`/clinics`** | ✅ | **★ NEW** — Create clinic location |
| **PATCH** | **`/clinics/:id`** | ✅ | **★ NEW** — Update clinic location |
| **DELETE** | **`/clinics/:id`** | ✅ | **★ NEW** — Delete clinic location |

### Estimate Service — `http://localhost:3003`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/cdt-codes` | ✅ | List available CDT codes |
| POST | `/estimate` | ✅ | Run cost estimate + risk score + AI explanation |

### AI (Ollama) — `http://localhost:11434`

| Method | Path | Description |
|---|---|---|
| POST | `/api/chat` | Stream chat completions (model: `phi3`) |

---

## Database Schema Changes

This branch adds one new table per tenant:

### `{tenant_slug}_clinic_locations`

```sql
CREATE TABLE IF NOT EXISTS "{prefix}_clinic_locations" (
  id              TEXT PRIMARY KEY,         -- cuid2
  name            TEXT NOT NULL,            -- Clinic display name
  address         TEXT,                     -- Street address
  phone           TEXT,                     -- Contact phone
  email           TEXT,                     -- Contact email
  status          TEXT DEFAULT 'active',    -- 'active' | 'inactive'
  operating_hours TEXT,                     -- e.g. 'Mon–Fri 9am–6pm'
  pms_type        TEXT DEFAULT 'none',      -- e.g. 'open-dental', 'none'
  pms_connected   INTEGER DEFAULT 0,        -- 0 | 1 boolean
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
)
```

> **Backfill:** The `GET /clinics` route runs `CREATE TABLE IF NOT EXISTS` on every request, so existing tenants registered before this migration automatically get the table on their first clinic API call.

### Existing tables (unchanged schema):

- `{prefix}_patients` — Patient directory
- `{prefix}_insurance_plans` — Insurer coverage rules
- `{prefix}_estimates` — Claim estimates + risk scores

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Auth Service
AUTH_SERVICE_PORT=3001
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Tenant Service
TENANT_SERVICE_PORT=3002

# Estimate Service
ESTIMATE_SERVICE_PORT=3003

# Database (SQLite — relative to root)
DATABASE_URL=./dentaliq.db

# Email (for OTP verification — use Ethereal for dev)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-user
SMTP_PASS=your-ethereal-pass

# AI (Ollama — local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi3
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Ollama](https://ollama.com) with `phi3` pulled: `ollama pull phi3`

### Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env
cp .env.example .env
# Edit .env as needed

# 3. Start all services (Turborepo)
pnpm dev
# Starts auth-service :3001, tenant-service :3002, estimate-service :3003, web :3000

# 4. In a separate terminal — start the AI engine
ollama run phi3

# 5. (Optional) Seed demo data
cd apps/auth-service && npx tsx scripts/seed-demo.ts
```

### Service Ports

| Service | Port | Description |
|---|---|---|
| Next.js Web | 3000 | Frontend dashboard + marketing site |
| Auth Service | 3001 | JWT auth, user management, tenant provisioning |
| Tenant Service | 3002 | Patient data, clinic locations, AI context |
| Estimate Service | 3003 | CDT estimation, claim risk, LLM explanations |
| Ollama | 11434 | Local AI model serving (phi3) |

---

## Architecture Diagram

```
Browser (Next.js :3000)
│
├── /                    Landing page (marketing)
├── /login               Auth flow → Auth Service :3001
├── /signup              5-step onboarding → Auth Service :3001
└── /dashboard           Main app
    │
    ├── Overview          KPI charts, stats (tenant data)
    ├── Cost Estimator    → Estimate Service :3003
    │                       └── Ollama phi3 :11434 (explanations)
    ├── Activity Logs     → Tenant Service :3002
    ├── Patient Directory → Tenant Service :3002
    ├── Clinics           → Tenant Service :3002 /clinics  ★ NEW
    │   ├── All Clinics
    │   ├── [Clinic] Dashboard
    │   └── [Clinic] Settings
    ├── AI Copilot (chat) → Tenant Service :3002 /patients/ai-context
    │                    → Ollama phi3 :11434 (chat)  ★ NEW
    ├── User Settings     (frontend state, Phase 3 backend)  ★ NEW
    └── Notifications     (simulated, Phase 3 clearinghouse)  ★ NEW

Tenant Service :3002
├── SQLite per-tenant tables (drizzle-orm)
│   ├── {slug}_patients
│   ├── {slug}_insurance_plans
│   ├── {slug}_estimates
│   └── {slug}_clinic_locations  ★ NEW
└── JWT auth via shared secret

Auth Service :3001
├── User registration + email OTP
├── JWT issue + refresh
├── TOTP/MFA setup + verify
└── Tenant provisioning (creates all DB tables on signup)
```

---

## Phase 3 Roadmap

The following items are scoped for the next sprint on this branch:

| Feature | Status | Notes |
|---|---|---|
| Telus eClaims API integration | 🔲 Planned | Real-time claim status push; replaces simulated notifications |
| Support Case System | 🔲 Planned | `POST /support/cases` → returns `CASE-XXXXXX`; AI copilot files cases automatically |
| Support Team Portal | 🔲 Planned | Separate `/support` dashboard for internal case management |
| User Settings — backend save | 🔲 Planned | Wire `PATCH /users/me` to the User Settings form |
| RAG Pipeline | 🔲 Planned | Replace full-context injection with vector-search retrieval for large clinics |
| Open Dental Connector | 🔲 Planned | Real-time sync of patient/appointment data from local OD instance |
| Token Refresh UX | 🔲 Planned | Auto-refresh session instead of forcing re-login on expiry |
| Production env migration | 🔲 Planned | Replace hardcoded `localhost` Ollama URL with `NEXT_PUBLIC_AI_ENGINE_URL` |

---

*Last updated: April 2025 · Branch: `feature/phase-3-open-dental`*

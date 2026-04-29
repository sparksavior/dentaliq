# 🦷 DentalIQ Insurance Copilot — Full Release Documentation

> **Branch:** `release-apr-28-final-v1`
> **Base:** `release/phase-2`
> **Status:** Production-Ready MVP — April 28 Release (Enhanced SaaS & AI Suite)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Core Feature Suite](#core-feature-suite)
   - [1. Dedicated Patient Dossier System](#1-dedicated-patient-dossier-system)
   - [2. AI Copilot Chatbot (Context-Aware)](#2-ai-copilot-chatbot-context-aware)
   - [3. AI Pre-Auth Narrative Generator](#3-ai-pre-auth-narrative-generator)
   - [4. Multi-Clinic Location Management](#4-multi-clinic-location-management)
   - [5. Interactive Claim Notification Center](#5-interactive-claim-notification-center)
   - [6. Claim Risk Detection (High/Med/Low)](#6-claim-risk-detection-highmedlow)
   - [7. Redesigned Marketing Landing Page](#7-redesigned-marketing-landing-page)
   - [8. Admin Portal & Clinic Management (SaaS)](#8-admin-portal--clinic-management-saas)
4. [Backend API Reference](#backend-api-reference)
5. [Database Architecture & Failsafe Logic](#database-architecture--failsafe-logic)
6. [Regulatory Compliance (PHIPA/PIPEDA)](#regulatory-compliance-phipapipeda)
7. [Running Locally (Universal Setup)](#running-locally-universal-setup)
8. [Architecture Diagram](#architecture-diagram)

---

## Project Overview

DentalIQ is a high-performance, AI-driven insurance intelligence platform for Canadian dental clinics. It solves administrative bottlenecks by automating clinical narrative writing, providing real-time claim risk analysis, and offering a context-aware AI copilot for office staff.

This branch (`release-apr-28-final-v1`) consolidates the full Phase 2 vision with enhanced SaaS portability, robust data persistence, and a premium clinical dossier experience.

---

## Folder Structure

```
dentaliq/
├── apps/
│   ├── auth-service/                    # Authentication & Tenant Provisioning (Port 3001)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   └── auth.ts              # Login, signup, token refresh
│   │   │   └── services/
│   │   │       └── tenantService.ts     # Provisions multi-tenant SQLite tables
│   │
│   ├── estimate-service/                # The Intelligence Microservice (Port 3004)
│   │   └── src/
│   │       ├── services/
│   │       │   ├── claimRisk.ts         # Risk scoring engine
│   │       │   └── llmNarrativeGenerator.ts # AI clinical writing (Ollama)
│   │       └── routes/
│   │           └── estimate.ts          # ★ CRITICAL: Failsafe direct-write update logic
│   │
│   ├── tenant-service/                  # Data & Clinical History Service (Port 3002)
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── clinics.ts           # ★ NEW: Multi-clinic CRUD (Toronto, Oakville, etc)
│   │       │   └── patients.ts          # ★ MODIFIED: History JOINs for full names
│   │
│   └── web/                             # Next.js 14 Premium Dashboard (Port 3000)
│       └── src/
│           ├── app/
│           │   ├── (dashboard)/
│           │   │   ├── dashboard/
│           │   │   │   ├── patients/
│           │   │   │   │   ├── [id]/    # ★ NEW: Full Patient Dossier Page
│           │   │   │   │   └── page.tsx # Patient Directory
│           │   │   │   └── estimates/   # One-click estimation UI
│           │   │   └── layout.tsx       # ★ MODIFIED: AI Copilot Chat Interface
│           │   ├── logout/               # ★ NEW: Premium Logout Page
│           │   └── page.tsx             # ★ HEAVILY REDESIGNED: Landing page with demos
│           ├── components/
│           │   └── PreAuthPdfModal.tsx  # Dynamic PDF generation & letter viewing
│           └── lib/
│               └── api.ts               # Unified API client & TypeScript interfaces
│
│   ├── admin/                           # ★ NEW: SaaS Admin Portal (Port 3005)
│   │   └── src/app/
│   │       ├── page.tsx                 # Clinic Registry & Status Overview
│   │       └── [id]/page.tsx            # Clinic-level Billing & Kill-switch
│
├── packages/                            # Shared DB schemas & Turborepo config
├── setup.js                             # ★ UNIVERSAL: Cross-platform setup script
└── README.md                            # ★ This file
```

---

## Core Feature Suite

### 1. Dedicated Patient Dossier System
Unlike legacy dental software that relies on limited modals, DentalIQ provides a dedicated clinical dossier for every patient.
*   **Location**: `/dashboard/patients/[id]`
*   **Features**:
    *   **Financial Summary**: Real-time aggregation of Insurer-Paid vs. Patient-Owed totals.
    *   **Clinical History**: A chronological feed of every procedure, risk level, and archived clinical narrative.
    *   **Archived Documents**: One-click access to generated Pre-Auth letters.

### 2. AI Copilot Chatbot (Context-Aware)
The dashboard includes a floating AI Copilot bubble (powered by Ollama `phi3`) that has live context of the clinic's environment.
*   **Context Grounding**: The AI is injected with patient counts, claim statuses, and clinic-specific stats via the system prompt.
*   **Capabilities**: Answer questions about claim statuses, provide clinical guidance, or summarize clinic performance.

### 3. AI Pre-Auth Narrative Generator
Automatically drafts professional medical justification letters for insurance companies.
*   **Automation**: Uses CDT codes (e.g., D3330 for Root Canal) to generate professional narratives.
*   **Customization**: Narratives are tailored to the specific procedure risk and clinical findings.

### 4. Multi-Clinic Location Management
Manage multiple clinic locations (e.g., Toronto Downtown, Scarborough, Mississauga) from a single login.
*   **CRUD Operations**: Create, update, and monitor settings for each location.
*   **Isolation**: Every clinic maintains its own settings for PMS integration and local contact details.

### 5. Interactive Claim Notification Center
A live notification bell that simulates real-time claim status updates (Approvals, Denials, and Risk Warnings).
*   **UI**: Premium dropdown with type-coded icons and unread status tracking.

### 6. Claim Risk Detection (High/Med/Low)
A proprietary risk engine that flags estimates before submission.
*   **Risk Scoring**: Evaluates procedure codes against common Canadian insurance denial rules.
*   **Visualization**: Red/Amber/Green status badges throughout the history and patient lists.

### 7. Redesigned Marketing Landing Page
A full-width, modern landing page (`/`) featuring interactive product demos, pricing cards, and security certifications.
*   **Interactive Demos**: Tabbed mockups for the Cost Estimator, Copilot, and Notifications.
*   **Compliance Showcase**: Highlights PHIPA, AES-256 encryption, and Canadian Data Residency.

### 8. Admin Portal & Clinic Management (SaaS)
A high-fidelity administrative interface for managing the entire DentalIQ ecosystem.
*   **Location**: `http://localhost:3005`
*   **Features**:
    *   **Clinic Registry**: Monitor all registered clinics, their plans, and trial expiration dates.
    *   **Billing Management**: Manually adjust billing cycles and plan tiers (Starter/Pro/Enterprise).
    *   **Trial Kill-switch**: Instantly suspend clinic access. Suspended clinics are met with a non-closable "Free Trial Ended" overlay.

---

## Backend API Reference

### Auth Service — `http://localhost:3001`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | ❌ | Login, returns JWT + Tenant Prefix |
| GET | `/users/me` | ✅ | Fetch current user role and clinic ID |
| GET | `/admin/tenants` | ✅ (Admin) | List all registered clinics |
| PATCH | `/admin/tenants/:id` | ✅ (Admin) | Update clinic plan, status, or billing |

### Tenant Service — `http://localhost:3002`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/patients` | ✅ | List patient directory |
| GET | `/patients/:id` | ✅ | **Dossier Data**: Returns patient + Full Clinical History |
| GET | `/clinics` | ✅ | List all clinic locations |

### Estimate Service — `http://localhost:3004`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/estimate` | ✅ | Run AI analysis + Risk assessment |
| POST | `/save-letter` | ✅ | **★ FAILSAFE**: Writes narrative directly to SQLite |

---

## Database Architecture & Failsafe Logic

### Multi-Tenant Strategy
DentalIQ uses a **Table-per-Tenant** architecture (e.g., `t_riverside_patients`). This ensures physical data isolation, making the system inherently ready for strict privacy audits.

### ★ Failsafe Direct Write Mechanism
To solve connection-pooling issues in local environments, we implemented a **Direct Write Logic** in the Estimate Service:
```typescript
// Uses child_process.execSync to run sqlite3 CLI directly
// Bypasses ORM transaction lag to ensure letter persistence
const cmd = `sqlite3 "${absDbPath}" "UPDATE \"${table}_estimates\" SET pre_auth_letter = '${letter}' WHERE id = '${id}';"`
```
This ensures that when a dentist clicks "Save Letter," the update is physically committed to the disk immediately.

---

## Regulatory Compliance (PHIPA/PIPEDA)

DentalIQ is designed to meet the rigorous standards of the **Royal College of Dental Surgeons of Ontario (RCDSO)**:

1.  **Canadian Data Residency**: Optimized for hosting in GCP Toronto/Montreal regions.
2.  **PHIPA Isolation**: Tenant-specific table prefixing ensures no data leakage between clinics.
3.  **Local AI**: Clinical data processing (Ollama) occurs on-premise or within the clinic's VPC, never sent to external US-based APIs.
4.  **Audit Ready**: Database architecture supports full access logging of PHI (Personal Health Information).

---

## Running Locally (Universal Setup)

The repository features a **Universal Setup Script** (`setup.js`) designed for "Zero-Config" deployment.

```bash
# 1. Clone & Enter
git clone https://github.com/sparksavior/dentaliq.git
cd dentaliq

# 2. Run Setup (Works on Mac, Windows, Linux)
node setup.js
```

### Credentials (Demo Admin)
*   **Email**: `admin@dentaliq.dev`
*   **Password**: `AdminPassword123!`

### Credentials (Clinic User)
*   **Email**: `demo@dentaliq.dev`
*   **Password**: `AdminPassword123!`

---

## Architecture Diagram

```
[ Frontend: Next.js 14 ] <───> [ Auth Service ] ─── [ SQLite ]
          ▲                            ▲
          │                            │
          ▼                            ▼
[ Estimate Service ] <───> [ Tenant Service ]
          ▲
          │
          ▼
[ Local AI Engine: Ollama / Phi-3 ]
```

---

*Last Updated: April 28, 2026 · Branch: `release-apr-28-final-v1`*

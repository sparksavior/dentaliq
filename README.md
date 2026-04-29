# 🦷 DentalIQ Insurance Copilot — Final Release Documentation

> **Branch:** `release-apr-28-final-v1`
> **Status:** Production-Ready MVP — April 28 Release
> **Universal Setup:** `node setup.js`

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Core Features & Innovation](#core-features--innovation)
   - [1. AI-Powered Pre-Auth Narratives](#1-ai-powered-pre-auth-narratives)
   - [2. Dedicated Patient Dossier System](#2-dedicated-patient-dossier-system)
   - [3. High-Reliability Failsafe Persistence](#3-high-reliability-failsafe-persistence)
   - [4. Claim Risk Detection Engine](#4-claim-risk-detection-engine)
   - [5. Universal OS Setup Script](#5-universal-os-setup-script)
4. [Backend Service Reference](#backend-service-reference)
5. [Database Schema & Architecture](#database-schema--architecture)
6. [Environment Configuration](#environment-configuration)
7. [Running Locally](#running-locally)
8. [Architecture Diagram](#architecture-diagram)
9. [Regulatory Compliance (PHIPA/PIPEDA)](#regulatory-compliance-phipapipeda)

---

## Project Overview

DentalIQ is a next-generation insurance intelligence platform for Canadian dental clinics. It solves the two biggest administrative bottlenecks in modern dentistry: **denied claims** and **manual pre-authorization writing**.

This branch (`release-apr-28-final-v1`) represents the "Phase 2 Complete" milestone, featuring:
- A fully automated **AI clinical writer** that drafts pre-auth letters in seconds.
- A **Patient Dossier** system that provides a 360-degree view of clinical and financial history.
- A **Failsafe Write Mechanism** that ensures data integrity even when standard drivers fail.
- **Universal Portability** for macOS, Windows, and Linux.

---

## Folder Structure

```
dentaliq/
├── apps/
│   ├── auth-service/                    # Auth & Tenant microservice (Port 3001)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   └── auth.ts              # Login/Register logic
│   │   │   └── services/
│   │   │       └── tenantService.ts     # Multi-tenant table provisioning
│   │
│   ├── estimate-service/                # AI & Intelligence microservice (Port 3004)
│   │   └── src/
│   │       ├── services/
│   │       │   ├── claimRisk.ts         # Risk scoring (LOW/MEDIUM/HIGH)
│   │       │   └── llmNarrativeGenerator.ts # Ollama-based clinical writing
│   │       └── routes/
│   │           └── estimate.ts          # ★ CRITICAL: Failsafe direct-write logic
│   │
│   ├── tenant-service/                  # Data & History microservice (Port 3002)
│   │   └── src/
│   │       └── routes/
│   │           └── patients.ts          # ★ MODIFIED: History JOINs for full names
│   │
│   └── web/                             # Next.js 14 Frontend (Port 3000)
│       └── src/
│           ├── app/
│           │   ├── (dashboard)/
│           │   │   ├── dashboard/
│           │   │   │   ├── patients/
│           │   │   │   │   ├── [id]/    # ★ NEW: Dedicated Patient Dossier Page
│           │   │   │   │   └── page.tsx # Patient Directory list
│           │   │   │   └── estimates/   # One-click estimate tool
│           │   │   └── layout.tsx       # Sidebar & Copilot shell
│           │   └── logout/               # ★ NEW: Premium "See you soon" page
│           ├── components/
│           │   └── PreAuthPdfModal.tsx  # Dynamic PDF generator/viewer
│           └── lib/
│               └── api.ts               # Frontend API client & shared interfaces
│
├── packages/                            # Shared Drizzle schemas & DB utils
├── setup.js                             # ★ UNIVERSAL: One-click installer
└── README.md                            # ★ This file
```

---

## Core Features & Innovation

### 1. AI-Powered Pre-Auth Narratives
**What it does:**
When a dentist plans a complex procedure (e.g., Molar Root Canal), they must justify it to the insurer. DentalIQ's AI analyzes the CDT code and findings to draft a professional medical narrative.
- **Location**: `apps/estimate-service/src/services/llmNarrativeGenerator.ts`
- **Output**: Professional PDFs generated on-the-fly via the `PreAuthPdfModal`.

### 2. Dedicated Patient Dossier System
**What it does:**
Replaces clunky popups with a dedicated dossier page for every patient. It aggregates clinical history, financial stats, and archived letters.
- **Route**: `/dashboard/patients/[id]`
- **View**: Includes a financial summary (Insurer Paid vs. Patient Paid) and a chronological feed of all past visits.

### 3. High-Reliability Failsafe Persistence
**What it does:**
Standard database drivers occasionally suffer from connection pooling lag in local development. We implemented a **direct SQLite3 CLI write mechanism** for clinical letters.
- **Implementation**: Found in `apps/estimate-service/src/routes/estimate.ts`.
- **Reliability**: It bypasses the ORM to write directly to the disk, ensuring that once a letter is "Saved," it is physically committed to the database file immediately.

### 4. Claim Risk Detection Engine
**What it does:**
Every estimate is assigned a risk score based on common insurance denial patterns in Ontario.
- **Low Risk**: Standard cleaning/exam (Auto-approved).
- **High Risk**: Major restorative without sufficient narrative documentation.
- **Visuals**: Color-coded badges (Red/Amber/Green) across the entire dashboard.

### 5. Universal OS Setup Script
**What it does:**
A robust `setup.js` script that handles the heavy lifting of environment configuration, dependency installation, and AI model pulling.
- **Compatibility**: Detects OS and handles prerequisites via Homebrew (Mac) or standard npm/cli (Windows/Linux).
- **AI Sync**: Automatically pulls the `phi3` model into the local Ollama instance.

---

## Backend Service Reference

### Auth Service (Port 3001)
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Returns JWT and tenant prefix |
| GET | `/users/me` | Fetches session-bound user info |

### Tenant Service (Port 3002)
| Method | Path | Description |
|---|---|---|
| GET | `/patients` | Lists patient directory |
| GET | `/patients/:id` | Returns full dossier + **Clinical History with Patient Names** |

### Estimate Service (Port 3004)
| Method | Path | Description |
|---|---|---|
| POST | `/estimate` | Runs AI analysis + Risk assessment |
| POST | `/save-letter` | **★ FAILSAFE**: Writes clinical letter via direct CLI |

---

## Database Schema & Architecture

DentalIQ uses a **Multi-Tenant Table Prefixing** strategy for data isolation.

### Key Tables (Per Tenant):
- `t_{tenant}_patients`: Demographics & Insurance IDs.
- `t_{tenant}_estimates`: The core clinical record. Stores `cdt_code`, `claim_risk`, and the critical `pre_auth_letter` BLOB.

**Data Integrity Improvement**: The history fetch now utilizes a SQL `JOIN` between estimates and patients to ensure that historical records are always associated with the correct names and timestamps.

---

## Running Locally

### Prerequisites
- Node.js 20+
- pnpm 9+
- [Ollama](https://ollama.com) (for AI features)

### One-Click Launch
```bash
node setup.js
```
This will:
1. Install all dependencies.
2. Create your `.env` file.
3. Start the Ollama AI engine.
4. Push the DB schema.
5. Launch the Dashboard (Port 3000).

---

## Architecture Diagram

```
[ Frontend: Next.js ] ◄───► [ Auth Service ] ─── [ SQLite ]
         ▲                        ▲
         │                        │
         ▼                        ▼
[ Estimate Service ] ◄───► [ Tenant Service ]
         ▲
         │
         ▼
[ Local AI: Ollama ]
```

---

## Regulatory Compliance (PHIPA/PIPEDA)

DentalIQ is architected to exceed the security standards required by the **Royal College of Dental Surgeons of Ontario (RCDSO)**:

1. **Data Sovereignty**: All patient data remains on Canadian soil when hosted in GCP's Toronto region.
2. **Local AI processing**: Clinical narratives are generated **locally** on the clinic's machine/server via Ollama. PHI (Personal Health Information) is never sent to external US-based AI APIs.
3. **Tenant Isolation**: Physical separation of data via table prefixing prevents "cross-clinic leakage."

---

*Last Updated: April 28, 2026 · Branch: `release-apr-28-final-v1`*

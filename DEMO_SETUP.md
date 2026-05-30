# DentalIQ Demo Data Setup Guide

## Overview

This guide explains how to set up DentalIQ with complete demo data including 800 realistic patients and thousands of procedure estimates, enabling you to see the dashboard with real, live data immediately.

---

## What Was Changed

### 1. Database Schema Update

- **File:** `packages/db/src/schema/users.ts`
- **Change:** Added `demoAccount` boolean column to the `users` table
- **Purpose:** Flags demo accounts so the email service skips sending notifications to them

### 2. Email Service Update

- **File:** `apps/auth-service/src/services/emailService.ts`
- **Change:** Added optional `isDemoAccount` parameter to all email methods
- **Purpose:** Prevents demo accounts from receiving any email notifications (welcome emails, password resets, etc.)

### 3. Demo Data Seed Script

- **File:** `scripts/seed-demo.ts` (NEW)
- **Purpose:** Clears the database and creates complete demo environment with:
  - Admin account (for port 3005 admin portal)
  - Demo Cortex client account (for port 3000 dashboard)
  - 800 realistic patients with diverse demographics
  - ~3,000-4,000 estimates spread across 6 months
  - Realistic insurance provider distribution
  - Mix of low, medium, and high-risk claims

### 4. Documentation Update

- **File:** `README.md`
- **Change:** Added new section "8.5. Test Account Credentials (Development & Demo)"
- **Includes:**
  - Admin account credentials and access instructions
  - Demo client account credentials and access instructions
  - Demo data characteristics
  - Important notes about email notifications and data persistence
  - How to reset/re-seed the data

### 5. Package Configuration

- **File:** `package.json` (root)
- **Changes:**
  - Added `pnpm seed:demo` npm script
  - Added `tsx` as dev dependency (for running TypeScript seed script)

---

## Quick Start

### Prerequisites

- DentalIQ development environment set up (see README.md)
- Node.js 20+ and pnpm 9+ installed

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Seed the Database

```bash
pnpm seed:demo
```

This will:

- Clear any existing data
- Create admin and demo accounts
- Generate 800 patients
- Generate ~3,500 estimates
- Print credentials to console

**Output Example:**

```
🎉 Demo seed complete!

═══════════════════════════════════════════════════════════
🔐 ADMIN CREDENTIALS (port 3005):
   Email:    admin@dentaliq.ca
   Password: admin
═══════════════════════════════════════════════════════════
🎭 DEMO CLIENT CREDENTIALS (port 3000):
   Email:    demo@dentaliq.ca
   Password: demo
   Plan:     Cortex
═══════════════════════════════════════════════════════════
📊 DEMO DATA STATS:
   Patients:  800
   Estimates: ~3500
   Date Range: Last 6 months
   Insurance Providers: 10+
   Age Range: 6-85 years
═══════════════════════════════════════════════════════════
```

### Step 3: Start the Application

```bash
# Start all services (from project root)
pnpm dev

# This starts:
# - Frontend (port 3000)
# - Admin portal (port 3005)
# - Auth service (port 3001)
# - Tenant service (port 3002)
# - Estimate service (port 3004)
# - Agent manager (port 3006)
```

### Step 4: Log In

- **Dashboard:** http://localhost:3000/login
  - Email: `demo@dentaliq.ca`
  - Password: `demo`
- **Admin Portal:** http://localhost:3005
  - Email: `admin@dentaliq.ca`
  - Password: `admin`

---

## Demo Data Characteristics

### Patients (800 Total)

- **Age Range:** 6-85 years (realistic distribution)
- **Names:** Diverse first and last names
- **Contact:** Phone numbers and email addresses
- **Insurance:** 10+ Canadian providers (Sun Life, Manulife, Green Shield, etc.)
- **Created Over:** 6-month period (for analytics trends)

### Estimates (~3,500 Total)

- **Procedures:** 60+ CDT codes (preventive, restorative, surgical, prosthetic)
- **Cost Range:** $100-$3,000 per procedure
- **Coverage:** 50-100% depending on procedure type
- **Risk Distribution:**
  - 60% low-risk
  - 30% medium-risk
  - 10% high-risk
- **Timeline:** Spread across 6 months for realistic analytics

### Insurance Providers

1. Sun Life Financial
2. Manulife
3. Canada Life
4. Green Shield Canada
5. Desjardins
6. OTIP/RAEO
7. Empire Life
8. Intact Insurance
9. Co-operators
10. TD Insurance

---

## What You Can Test

### Dashboard Features (Real Data)

✅ **Patients Page**

- Browse 800 patients with demographics
- View insurance coverage by provider
- Estimate history per patient
- Export patient list to CSV

✅ **Estimates Page**

- ~3,500 procedures with cost breakdown
- Risk indicators
- Insurance coverage percentages
- Export estimates to CSV
- Analytics on procedures

✅ **Analytics Dashboard**

- Case acceptance rates (real data from estimates)
- New patient trends (6-month history)
- A/R aging with real cost data
- Patient summary stats
- Date range filtering

✅ **Patient Detail View**

- Full estimate history
- Document management (upload/store files)
- Patient notes and timeline
- Insurance information

✅ **Cortex Agents** (if on Cortex plan)

- Agent approval inbox
- Real-time notifications (via SSE)
- Agent task management

---

## Important Notes

### Email Notifications

- Both demo accounts have `demoAccount=true` in the database
- The email service checks this flag and **skips sending emails** to demo accounts
- This prevents accidental emails from being sent during testing

### Data Persistence

- Once seeded, the data persists between restarts
- You can log in multiple times without re-running the seed
- To reset everything to fresh demo data, just run `pnpm seed:demo` again

### Real API Calls

- All dashboard data comes from actual API calls to backend services
- **NOT** static data or mock endpoints
- This tests the full stack: frontend → API layer → database → calculations

### Admin Portal

- **Different port:** 3005 (vs. 3000 for main app)
- **Restricted access:** Requires `admin@dentaliq.ca` login
- **Purpose:** Tenant and system-level management (not demo functionality)

---

## Resetting Demo Data

If you want to clear everything and create fresh demo accounts/data:

```bash
pnpm seed:demo
```

This is safe to run repeatedly—it will:

1. Delete all existing data (users, tenants, patients, estimates)
2. Create fresh admin and demo accounts
3. Generate new patient and estimate data
4. Print new credentials

---

## Troubleshooting

### "Database is locked" error

- SQLite locks during concurrent writes
- Make sure only one instance of the seed script is running
- Wait a few seconds and try again

### Seed script doesn't start

```bash
# Make sure dependencies are installed
pnpm install

# Try running directly with tsx
tsx scripts/seed-demo.ts
```

### Can't connect to services

- Ensure `pnpm dev` is running in another terminal
- Check that all services started: `http://localhost:3001/health` (auth service)
- Wait 5 seconds after starting `pnpm dev` for services to initialize

### Missing patients or estimates

- The seed script should create ~3,500 estimates
- If significantly fewer were created, check the logs for database errors
- You can re-run the seed to try again

---

## Architecture Notes

The seed script uses the same database and microservices architecture as production:

- Creates tenant-specific schemas (like a real clinic signup would)
- Uses the auth service's database design
- Stores estimates in the estimate service schema
- Respects all isolation boundaries

This makes the demo environment a realistic representation of how DentalIQ works in production.

---

## Next Steps

After seeding and logging in:

1. **Explore the Cortex plan features** on the demo account
2. **Test the admin portal** with the admin account
3. **Verify analytics calculations** are based on real estimate data
4. **Check CSV exports** for patients and estimates
5. **Review patient timelines** for multi-tab experience
6. **Test the command palette** (Cmd+K) for global search

---

**For support or questions**, check the main README.md or contact the development team.

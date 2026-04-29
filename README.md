# 🦷 DentalIQ — AI-Driven Clinical Copilot

DentalIQ is a high-performance, SaaS-ready platform designed for modern dental clinics. It automates the most time-consuming administrative tasks—clinical narrative writing and insurance claim risk assessment—allowing dental professionals to focus on patient care.

---

## 🚀 Quick Start (Universal Setup)

DentalIQ features a "One-Click" setup script that works across **macOS, Windows, and Linux**.

```bash
# 1. Clone the repository
git clone https://github.com/sparksavior/dentaliq.git
cd dentaliq

# 2. Run the universal setup
node setup.js
```

**What the setup script does:**
1.  **Prerequisites**: Checks for Node.js, pnpm, and Ollama.
2.  **Infrastructure**: Starts Docker containers (Postgres, Redis, Mailpit) if available; otherwise, falls back to local SQLite.
3.  **AI Engine**: Starts the Ollama server and pulls the `phi3` model automatically.
4.  **Database**: Initializes the schema and seeds the demo database.
5.  **Launch**: Starts the frontend and all backend services simultaneously.

---

## ✨ Key Features

### 1. AI-Powered Pre-Auth Narratives
Automatically generates professional clinical letters for insurance companies based on CDT codes and clinical findings.
*   **How it works**: Uses the `phi3` LLM via Ollama to generate medical justifications.
*   **Persistence**: Uses a high-reliability direct-write mechanism to ensure letters are saved even under heavy load.

### 2. Patient Dossier System
A dedicated, feature-rich profile for every patient.
*   **Dossier View**: Located at `/dashboard/patients/[id]`.
*   **Financial Tracking**: Real-time calculation of insurer vs. patient payments.
*   **Clinical Feed**: A chronological timeline of every visit, estimate, and archived letter.

### 3. Claim Risk Analysis
AI evaluates every estimate for "Claim Risk" (High/Medium/Low) before submission.
*   **High Risk**: Flagged if documentation is insufficient or CDT codes are commonly denied.
*   **Medium/Low Risk**: Indicates a high probability of immediate insurance approval.

### 4. Premium SaaS UI/UX
*   **Modern Aesthetics**: Built with a sleek, dark-mode-first design.
*   **Premium Logout**: A dedicated "See you soon!" flow at `/logout` for a professional finish.

---

## 📂 Project Structure

The project is a **pnpm Monorepo** with clear separation of concerns:

### 🏛️ Backend Services (`/apps`)
*   **`auth-service`**: Handles JWT authentication, session management, and tenant (clinic) isolation.
*   **`tenant-service`**: Manages clinic-specific data, patient records, and history retrieval.
*   **`estimate-service`**: The "Intelligence Layer." Contains the AI narrative generator and the high-reliability persistence logic.
    *   *Key File*: `src/routes/estimate.ts` (Handles direct SQLite writes).

### 🎨 Frontend (`/apps/web`)
*   **`src/app/(dashboard)`**: Contains the core application logic (Patients, Estimates, Claims).
    *   *Patient Dossier*: `src/app/(dashboard)/dashboard/patients/[id]/page.tsx`.
*   **`src/components`**: Shared UI components, including the `PreAuthPdfModal.tsx` for viewing saved letters.
*   **`src/contexts`**: State management via React Context (e.g., `auth-context.tsx`).

### 📦 Shared Packages (`/packages`)
*   **`db`**: Unified Drizzle ORM schema and database client.
*   **`config`**: Shared TypeScript and Tailwind configurations.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), TailwindCSS, Lucide Icons |
| **Backend** | Fastify (Node.js framework), JWT |
| **Database** | LibSQL / SQLite (Drizzle ORM) |
| **AI / LLM** | Ollama (Local Execution), Phi-3 Model |
| **Styling** | Vanilla CSS + Tailwind Utility Classes |

---

## 🛡️ Regulatory Compliance (PHIPA/PIPEDA)

DentalIQ is designed with Canadian health privacy laws in mind:
*   **Data Isolation**: Uses a "Table-per-Tenant" strategy (`t_clinicname_patients`). This ensures that one clinic's data is physically separated from another, a key requirement for PHIPA audits.
*   **Local AI**: By running Ollama locally, patient data never leaves the clinic's infrastructure for AI processing, significantly reducing privacy risk.
*   **Audit-Ready**: The architecture supports a centralized audit logging table to track all access to Personal Health Information (PHI).

---

## 📝 Demo Credentials

*   **URL**: `http://localhost:3000`
*   **Email**: `demo@dentaliq.dev`
*   **Password**: `Demo1234!`

---

*DentalIQ — Precision in every estimate, care in every interaction.*

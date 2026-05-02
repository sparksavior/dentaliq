# Platform Features Breakdown

DentalIQ offers a comprehensive suite of tools designed to modernize dental clinic operations. The platform is segmented into three distinct pricing tiers: Starter, Pro, and Cortex.

## 1. Multi-Tier Feature System

### Starter Plan (Core SaaS)

- **Dashboard Overview**: Basic analytics (total patients, recent activity).
- **Patient Management**: Directory of patients with basic demographic and insurance information.
- **Estimates Engine**: A fallback-rules-based engine to estimate out-of-pocket costs based on CDT codes and standard coverage percentages.
- **Claims**: Basic tracking of generated estimates and their risk levels.

### Pro Plan (AI Copilot & Multi-Clinic)

- **Multi-Clinic Support**: Ability to manage multiple clinic locations under a single tenant.
- **AI Copilot (Chat)**: A persistent, context-aware chatbot available in the dashboard that understands the clinic's current state (patients, claims, etc.) and can answer operational questions.
- **Pre-Auth Narrative Generation**: The ability to generate complex, medically accurate pre-authorization letters for high-risk claims using LLMs.

### Cortex Plan (Autonomous Agents)

- **Cortex Agents**: Access to hire specialized digital workers (Billing, Recall, Supply, etc.).
- **Cortex Command Center**: A real-time, dark-mode terminal UI that displays live simulated/actual operations performed by the autonomous agents.
- **Approval Inbox**: A streamlined UI where agents place "Pending" tasks (like drafted pre-auth narratives or SMS campaigns) that require human approval before execution.

## 2. The Demo Engine (`/demo/[plan]`)

To facilitate sales without requiring users to create accounts or risk exposing real PII data, DentalIQ includes a standalone Demo Engine.

- **1-to-1 UI Replication**: The demo pages visually replicate the exact React components used in the authenticated dashboard.
- **Stateless Execution**: The demo relies entirely on hardcoded `useState` variables and `setInterval` loops instead of backend database calls.
- **Plan Locking**: Demoing the Starter plan visually shades out Pro/Cortex features (like the AI Copilot and Multi-Clinic switcher), demonstrating the upgrade value proposition directly in the UI.

## 3. Stripe Integrated Billing

The platform includes a robust, production-ready billing system designed for multi-tenant SaaS.

- **Automated Usage Tracking**: Connects to the API to track rented Cortex agents.
- **Payment Methods**: Securely captures and stores credit card references (with visual dynamic card rendering based on the card brand).
- **Receipt Generation**: Historical billing records that open into detailed modal views, preparing the system for live Stripe webhook integrations.

## 4. Support & Ticketing System

A dual-pane support system that combines modern live-chat paradigms with traditional ticketing.

- **Live Chat**: Connects to a support bot (or human agent) for immediate triage.
- **Ticketing**: Tracks long-running issues, integration requests, or bug reports with status indicators.

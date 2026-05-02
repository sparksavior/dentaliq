# DentalIQ

An advanced, multi-tenant AI SaaS platform for dental clinics. DentalIQ provides intelligent cost estimation, automated pre-authorization drafting, and autonomous "Cortex Agents" that streamline clinic operations.

![DentalIQ Platform](https://via.placeholder.com/800x400?text=DentalIQ+AI+Platform)

## 📚 Documentation

We have comprehensive documentation available in the `docs/` directory to help you understand the system architecture and features.

- [System Architecture](./docs/ARCHITECTURE.md)
- [Features Overview](./docs/FEATURES.md)
- [AI & Agent Patterns](./docs/AI_PATTERNS.md)

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- `pnpm` package manager
- [Ollama](https://ollama.com/) (installed and running for local AI features)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Initialize the local AI models (Ensure Ollama is installed):
   ```bash
   node setup.js
   ```

### Running the Application

To start the entire monorepo (Frontend + All Microservices):

```bash
pnpm dev
```

The services will start on the following ports:

- **Web App (Next.js)**: `http://localhost:3000`
- **Auth Service**: `http://localhost:3001`
- **Tenant Service**: `http://localhost:3002`
- **Estimate Service**: `http://localhost:3004`
- **Agent Manager**: `http://localhost:3005`

## 🧪 Demo Mode

To view the platform without creating an account or running the database, navigate to the local Demo Engine:

- Starter Plan Demo: `http://localhost:3000/demo/starter`
- Pro Plan Demo: `http://localhost:3000/demo/pro`
- Cortex Plan Demo: `http://localhost:3000/demo/cortex`

These demo routes use isolated, static components that replicate the live dashboard 1-to-1.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Monorepo**: Turborepo
- **Styling**: Vanilla CSS (CSS Modules / Inline) & Lucide Icons
- **Backend**: Express.js Microservices
- **Database**: SQLite + Drizzle ORM
- **AI**: Local LLMs via Ollama

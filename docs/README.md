# DentalIQ Platform Documentation

Welcome to the DentalIQ developer documentation. DentalIQ is a multi-tenant, AI-powered SaaS platform designed specifically for dental clinics. It provides intelligent billing, patient scheduling, automated pre-authorization narratives, and autonomous "Cortex Agents" that act as a digital workforce for the clinic.

## Documentation Index

This `docs` folder contains comprehensive guides on the internal workings, architecture, and design patterns used across the DentalIQ platform. Whether you are a new engineer onboarding onto the team or a stakeholder reviewing the technical design, these documents provide the context you need.

### 1. [System Architecture](./ARCHITECTURE.md)

A high-level overview of the entire monorepo, including the Next.js frontend, Express microservices (Auth, Tenant, Estimate), the Agent Manager, database schema (Drizzle ORM), and deployment strategy.

### 2. [Features Overview](./FEATURES.md)

Detailed breakdown of the core platform features, including the multi-tier pricing plans (Starter, Pro, Cortex), the Demo Engine, Stripe Billing, and the real-time Cortex Command Center.

### 3. [AI & Agent Patterns](./AI_PATTERNS.md)

In-depth explanation of how AI is integrated into DentalIQ. Covers the local LLM setup (Ollama/Phi-3), generative UI patterns, streaming chat integrations, and the autonomous multi-agent system (Cortex Agents).

---

## Getting Started

If you are setting up the project for the first time, please refer to the root `README.md` for quickstart commands (e.g., `pnpm install`, `pnpm dev`, and `node setup.js` for Ollama).

## Design Philosophy

DentalIQ is built with a focus on:

1. **High-Fidelity UI**: Using "vibrant, modern, and dynamic" design principles with smooth gradients, glassmorphism, and micro-animations.
2. **Data Isolation**: Strict multi-tenant boundaries enforced at the API layer.
3. **Agentic Autonomy**: Moving beyond simple chat interfaces into autonomous background agents that execute tasks and request approval via an "Approval Inbox".

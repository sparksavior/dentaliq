# DentalIQ Web App (`apps/web`)

Next.js 16 App Router application. Serves both the public marketing site and the authenticated clinic dashboard.

## Port

`http://localhost:3000`

## Route Structure

```
src/app/
├── page.tsx                    # Public landing page
├── pricing/page.tsx            # Pricing plans + comparison table
├── cortex/page.tsx             # Cortex AI marketing page
├── legal/page.tsx              # Legal hub
├── privacy/page.tsx            # Privacy policy
├── terms/page.tsx              # Terms of service
│
├── (auth)/                     # Auth flow pages (no dashboard layout)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   └── verify-email/page.tsx
│
├── (dashboard)/                # Authenticated dashboard (requires JWT)
│   ├── layout.tsx              # Sidebar + nav + auth gate
│   └── dashboard/
│       ├── page.tsx            # Overview / home
│       ├── analytics/page.tsx  # Charts and metrics
│       ├── estimates/page.tsx  # CDT cost estimator
│       ├── claims/page.tsx     # Claims tracking
│       ├── patients/           # Patient management
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── billing/page.tsx    # Subscription management
│       ├── settings/page.tsx   # Clinic + user configuration
│       ├── support/page.tsx    # Live chat + ticketing
│       └── cortex/
│           ├── inbox/page.tsx  # Approval inbox (agent tasks)
│           └── hire/page.tsx   # Agent activation
│
├── demo/[plan]/page.tsx        # Static demo — no auth, no database
│
└── logout/page.tsx             # Clears session and redirects
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Typed fetch wrapper — auth token injection, error handling, all API calls |
| `src/contexts/auth-context.tsx` | JWT session management — localStorage restore, 14-min proactive refresh |
| `src/contexts/notification-context.tsx` | Global toast notifications |
| `src/components/ThemeToggle.tsx` | Light/dark mode toggle — requires `storageKey` and `variant` props |
| `src/app/globals.css` | Design tokens (CSS custom properties) for both themes |

## Running

```bash
# Start just this app (from repo root):
pnpm --filter web dev

# Start all services together (recommended):
pnpm dev
```

## Styling Conventions

- **Inline styles only** — No Tailwind, no CSS modules in production pages
- **CSS custom properties** — Colors, spacing, radius, shadows via `var(--color-*)` tokens from `globals.css`
- **CSS keyframes** — Animation keyframes injected via `<style dangerouslySetInnerHTML>` at the top of animated pages
- **Dark mode** — Handled by `[data-theme="dark"]` selector on `<html>`, toggled by `ThemeToggle`

## Environment Variables

The web app reads these `NEXT_PUBLIC_` vars at build time (must be set in `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Full app URL (used in meta tags, emails) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Auth service base URL |
| `NEXT_PUBLIC_AUTH_URL` | `http://localhost:3001` | Auth service (same as API_URL) |
| `NEXT_PUBLIC_TENANT_URL` | `http://localhost:3002` | Tenant service base URL |
| `NEXT_PUBLIC_ESTIMATE_URL` | `http://localhost:3004` | Estimate service base URL |
| `NEXT_PUBLIC_AGENT_MANAGER_URL` | `http://localhost:3006` | Agent manager base URL |
| `NEXT_PUBLIC_ENABLE_DEMO` | _(unset)_ | Set `true` to enable `/demo/*` routes |

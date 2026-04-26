# ─────────────────────────────────────────────────────────
# DentalIQ Auth Service — Dockerfile
# Multi-stage build: build → production
# ─────────────────────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types ./packages/types
COPY packages/config ./packages/config
COPY packages/logger ./packages/logger
COPY packages/db ./packages/db
COPY apps/auth-service ./apps/auth-service

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
WORKDIR /app/apps/auth-service
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm@9

COPY --from=builder /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/auth-service/dist ./apps/auth-service/dist
COPY --from=builder /app/apps/auth-service/package.json ./apps/auth-service/package.json

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

USER node

CMD ["node", "apps/auth-service/dist/index.js"]

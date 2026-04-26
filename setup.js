#!/usr/bin/env node
// ─────────────────────────────────────────────────────────
// DentalIQ — First-time setup script
// Run with: node setup.js
// ─────────────────────────────────────────────────────────

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const run = (cmd, opts = {}) => {
  console.log(`\n→ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', ...opts })
}

const log = (msg) => console.log(`\n✓ ${msg}`)
const warn = (msg) => console.log(`\n⚠ ${msg}`)

console.log('\n🦷 DentalIQ — Phase 1 Setup\n')

// 1. Check prerequisites
try {
  const nodeV = execSync('node --version').toString().trim()
  const pnpmV = execSync('pnpm --version').toString().trim()
  log(`Node ${nodeV}, pnpm ${pnpmV}`)
} catch {
  console.error('❌ Please install Node.js 20+ and pnpm 9+')
  console.error('  Install pnpm: npm install -g pnpm@9')
  process.exit(1)
}

// 2. Check Docker
try {
  execSync('docker --version', { stdio: 'pipe' })
  log('Docker found')
} catch {
  warn('Docker not found — you can still run services manually')
}

// 3. Copy .env
if (!fs.existsSync('.env')) {
  fs.copyFileSync('.env.example', '.env')
  log('Created .env from .env.example')
  warn('Edit .env and set a strong JWT_SECRET before running services')
} else {
  log('.env already exists — skipping')
}

// 4. Install dependencies
run('pnpm install')
log('Dependencies installed')

// 5. Start Docker services
try {
  run('docker-compose up -d postgres redis mailpit')
  log('Docker services started (postgres, redis, mailpit)')
  console.log('\n  Services:')
  console.log('  Postgres  → localhost:5432')
  console.log('  Redis     → localhost:6379')
  console.log('  Mailpit   → http://localhost:8025  (view dev emails)')
} catch {
  warn('Could not start Docker services — start them manually')
}

// 6. Wait for postgres and run migrations
setTimeout(() => {
  try {
    run('pnpm db:push', { cwd: path.join(process.cwd(), 'packages/db') })
    log('Database schema pushed')
  } catch {
    warn('Could not run DB migrations. Run manually: cd packages/db && pnpm db:push')
  }

  console.log('\n' + '─'.repeat(50))
  console.log('\n🚀 Setup complete!\n')
  console.log('Start development:\n')
  console.log('  pnpm dev              → start all services')
  console.log('  pnpm turbo run dev --filter=@dentaliq/auth-service')
  console.log('                        → start auth service only\n')
  console.log('Endpoints (once running):')
  console.log('  Auth service  → http://localhost:3001')
  console.log('  Tenant svc    → http://localhost:3002')
  console.log('  Frontend      → http://localhost:3000\n')
  console.log('Useful tools:')
  console.log('  Emails        → http://localhost:8025')
  console.log('  DB Studio     → pnpm db:studio\n')
}, 3000)

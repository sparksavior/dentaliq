#!/usr/bin/env node
// ─────────────────────────────────────────────────────────
// DentalIQ — All-in-one setup & launch script
// Run with: node setup.js
//
// What this does (in order):
//   1. Checks / installs prerequisites via Homebrew
//   2. Creates .env from .env.example (if missing)
//   3. Installs dependencies (pnpm install)
//   4. Starts Docker infra (Postgres, Redis, Mailpit)
//   5. Starts Ollama + pulls model for AI features
//   6. Pushes database schema via Drizzle
//   7. Seeds demo data
//   8. Starts all services (pnpm dev)
// ─────────────────────────────────────────────────────────

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// ── Helpers ──────────────────────────────────────────────

const ROOT = __dirname

const run = (cmd, opts = {}) => {
  console.log(`\n  → ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts })
}

const runQuiet = (cmd) => {
  try {
    return execSync(cmd, { stdio: 'pipe', cwd: ROOT }).toString().trim()
  } catch {
    return null
  }
}

const log = (msg) => console.log(`  ✅ ${msg}`)
const warn = (msg) => console.log(`  ⚠️  ${msg}`)
const info = (msg) => console.log(`  ℹ️  ${msg}`)
const header = (msg) => {
  console.log(`\n${'─'.repeat(55)}`)
  console.log(`  ${msg}`)
  console.log('─'.repeat(55))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Check if a command exists ────────────────────────────

const hasCmd = (cmd) => {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// ── Wait for a TCP port to be ready ──────────────────────

const waitForPort = async (port, label, maxWaitSec = 30) => {
  const { createConnection } = require('net')
  const start = Date.now()
  while (Date.now() - start < maxWaitSec * 1000) {
    const ok = await new Promise((resolve) => {
      const sock = createConnection({ port, host: '127.0.0.1' })
      sock.once('connect', () => { sock.destroy(); resolve(true) })
      sock.once('error', () => { sock.destroy(); resolve(false) })
    })
    if (ok) { log(`${label} ready on port ${port}`); return true }
    await sleep(1000)
  }
  warn(`${label} did not become ready on port ${port} within ${maxWaitSec}s`)
  return false
}

// ── Wait for Ollama API to respond ───────────────────────

const waitForOllama = async (baseUrl, maxWaitSec = 30) => {
  const start = Date.now()
  while (Date.now() - start < maxWaitSec * 1000) {
    try {
      const res = await fetch(`${baseUrl}/api/tags`)
      if (res.ok) return true
    } catch { /* not ready yet */ }
    await sleep(1000)
  }
  return false
}

// ═════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════

async function main() {
  console.log('\n🦷 DentalIQ — Full Setup & Launch\n')

  // ──────────────────────────────────────────────────────
  // 1. Prerequisites
  // ──────────────────────────────────────────────────────
  header('1 · Checking prerequisites')

  // Homebrew (Optional for non-Mac)
  const hasBrew = hasCmd('brew')
  if (hasBrew) {
    log('Homebrew found')
  } else {
    warn('Homebrew not found — automatic dependency installation may fail on non-Mac systems.')
  }

  // Node.js
  if (!hasCmd('node')) {
    if (hasBrew) {
      info('Installing Node.js via Homebrew...')
      run('brew install node')
    } else {
      console.error('❌ Node.js is missing. Please install it from https://nodejs.org')
      process.exit(1)
    }
  }
  const nodeV = runQuiet('node --version')
  log(`Node.js ${nodeV}`)

  // pnpm
  if (!hasCmd('pnpm')) {
    if (hasBrew) {
      info('Installing pnpm via Homebrew...')
      run('brew install pnpm')
    } else {
      info('Installing pnpm via npm...')
      run('npm install -g pnpm')
    }
  }
  const pnpmV = runQuiet('pnpm --version')
  log(`pnpm ${pnpmV}`)

  // Docker (optional but recommended)
  let hasDocker = hasCmd('docker')
  if (hasDocker) {
    const dockerRunning = runQuiet('docker info') !== null
    if (!dockerRunning) {
      warn('Docker daemon is not running. App will use SQLite.')
      hasDocker = false
    } else {
      log('Docker found and running')
    }
  } else {
    warn('Docker not found — app will use SQLite')
  }

  // Ollama
  if (!hasCmd('ollama')) {
    if (hasBrew) {
      info('Installing Ollama via Homebrew...')
      run('brew install ollama')
    } else {
      warn('Ollama not found. Please install it from https://ollama.com to use AI features.')
      // Don't exit, we can run without it (with fallbacks)
    }
  } else {
    log('Ollama found')
  }

  // ──────────────────────────────────────────────────────
  // 2. Environment file
  // ──────────────────────────────────────────────────────
  header('2 · Environment configuration')

  const envPath = path.join(ROOT, '.env')
  const envExamplePath = path.join(ROOT, '.env.example')

  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(envExamplePath, envPath)
    log('Created .env from .env.example')
  } else {
    log('.env already exists — keeping it')
  }

  // Read .env to determine config
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const getEnvVal = (key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return match ? match[1].trim() : null
  }

  const ollamaBaseUrl = getEnvVal('OLLAMA_BASE_URL') || 'http://localhost:11434'
  const ollamaModel = getEnvVal('OLLAMA_MODEL') || 'phi3'

  // Warn about default JWT secret
  const jwtSecret = getEnvVal('JWT_SECRET')
  if (jwtSecret && jwtSecret.startsWith('change-me')) {
    warn('JWT_SECRET is still the default — update it in .env for production use')
  }

  info(`Ollama model: ${ollamaModel}`)
  info(`Ollama URL:   ${ollamaBaseUrl}`)

  // ──────────────────────────────────────────────────────
  // 3. Install dependencies
  // ──────────────────────────────────────────────────────
  header('3 · Installing dependencies')

  run('pnpm install')
  log('Dependencies installed')

  // ──────────────────────────────────────────────────────
  // 4. Docker services (Postgres, Redis, Mailpit)
  // ──────────────────────────────────────────────────────
  header('4 · Docker infrastructure')

  if (hasDocker) {
    try {
      run('docker-compose up -d postgres redis mailpit')
      log('Docker services started (postgres, redis, mailpit)')
      info('Postgres  → localhost:5432')
      info('Redis     → localhost:6379')
      info('Mailpit   → http://localhost:8025')

      // Wait for Postgres to be ready before DB push
      await waitForPort(5432, 'Postgres')
    } catch (e) {
      warn(`Could not start Docker services: ${e.message}`)
      warn('Continuing without Docker — app will fall back to SQLite')
    }
  } else {
    info('Skipping Docker services (not available)')
    info('App will use SQLite for the database')
  }

  // ──────────────────────────────────────────────────────
  // 5. Ollama — start server + pull model
  // ──────────────────────────────────────────────────────
  header('5 · Ollama (local AI)')

  // Check if Ollama is already running
  let ollamaAlreadyRunning = false
  try {
    const res = await fetch(`${ollamaBaseUrl}/api/tags`)
    if (res.ok) ollamaAlreadyRunning = true
  } catch { /* not running */ }

  if (ollamaAlreadyRunning) {
    log('Ollama is already running')
  } else {
    info('Starting Ollama server...')

    // Spawn ollama serve as a detached background process
    const ollamaProc = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
      cwd: ROOT,
    })
    ollamaProc.unref()

    // Wait for it to be ready
    const ollamaReady = await waitForOllama(ollamaBaseUrl, 20)
    if (ollamaReady) {
      log('Ollama server started')
    } else {
      warn('Ollama did not start in time — AI features will use fallback templates')
    }
  }

  // Pull model if not already present
  try {
    const tagsRes = await fetch(`${ollamaBaseUrl}/api/tags`)
    if (tagsRes.ok) {
      const tags = await tagsRes.json()
      const models = (tags.models || []).map((m) => m.name)
      const modelInstalled = models.some(
        (m) => m === ollamaModel || m.startsWith(`${ollamaModel}:`)
      )

      if (modelInstalled) {
        log(`Model "${ollamaModel}" is already pulled`)
      } else {
        info(`Pulling model "${ollamaModel}" — this may take a few minutes on first run...`)
        run(`ollama pull ${ollamaModel}`)
        log(`Model "${ollamaModel}" pulled successfully`)
      }
    }
  } catch {
    warn('Could not check/pull Ollama model — AI features will use fallback templates')
  }

  // ──────────────────────────────────────────────────────
  // 6. Database schema
  // ──────────────────────────────────────────────────────
  header('6 · Database schema')

  try {
    run('pnpm db:push')
    log('Database schema pushed')
  } catch {
    warn('Could not push DB schema — run manually: pnpm db:push')
  }

  // ──────────────────────────────────────────────────────
  // 7. Seed demo data
  // ──────────────────────────────────────────────────────
  header('7 · Demo data')

  try {
    run('pnpm seed')
    log('Demo data seeded')
    info('Login: demo@dentaliq.dev / Demo1234!')
  } catch {
    warn('Could not seed demo data — run manually: pnpm seed')
  }

  // ──────────────────────────────────────────────────────
  // 8. Launch all services
  // ──────────────────────────────────────────────────────
  header('8 · Launching DentalIQ')

  console.log('')
  console.log('  🚀 Starting all services...')
  console.log('')
  console.log('  ┌──────────────────────────────────────────┐')
  console.log('  │  Frontend     → http://localhost:3000     │')
  console.log('  │  Auth API     → http://localhost:3001     │')
  console.log('  │  Tenant API   → http://localhost:3002     │')
  console.log('  │  Estimate API → http://localhost:3004     │')
  console.log('  │  Admin Portal → http://localhost:3005     │')
  console.log('  │  Ollama LLM   → http://localhost:11434    │')
  if (hasDocker) {
    console.log('  │  Mailpit      → http://localhost:8025     │')
  }
  console.log('  │                                          │')
  console.log('  │  Demo login: demo@dentaliq.dev            │')
  console.log('  │  Password:   Demo1234!                    │')
  console.log('  └──────────────────────────────────────────┘')
  console.log('')
  console.log('  Press Ctrl+C to stop all services.\n')

  // Run pnpm dev in the foreground so Ctrl+C stops everything
  const devProc = spawn('pnpm', ['dev'], {
    stdio: 'inherit',
    cwd: ROOT,
  })

  devProc.on('close', (code) => {
    console.log(`\n  DentalIQ stopped (exit code ${code}).`)
    process.exit(code)
  })

  // Forward Ctrl+C to the child process
  process.on('SIGINT', () => {
    devProc.kill('SIGINT')
  })
  process.on('SIGTERM', () => {
    devProc.kill('SIGTERM')
  })
}

// ── Run ──────────────────────────────────────────────────

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message)
  process.exit(1)
})

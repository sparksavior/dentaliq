#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// DentalIQ — Interactive Setup & Launch Script
//
//   node setup.js
//
// Steps:
//   0. Ask two questions upfront  (AI features? Docker email UI?)
//   1. Check / install prerequisites
//   2. Create .env (auto-generate secrets)
//   3. Install dependencies  (pnpm install)
//   4. Docker services       (mailpit only — app uses SQLite by default)
//   5. Ollama                (SKIPPED when user opts out of AI)
//   6. Push database schema
//   7. Seed demo data
//   8. Launch all services
// ─────────────────────────────────────────────────────────────────────────────

const readline  = require('readline')
const { execSync, spawn } = require('child_process')
const fs        = require('fs')
const path      = require('path')
const crypto    = require('crypto')
const net       = require('net')

const ROOT   = __dirname
const isWin  = process.platform === 'win32'
const isMac  = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

// ─── Colour helpers ───────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
}

const ok   = (msg) => console.log(`  ${c.green}✓${c.reset}  ${msg}`)
const warn = (msg) => console.log(`  ${c.yellow}⚠${c.reset}  ${msg}`)
const info = (msg) => console.log(`  ${c.cyan}→${c.reset}  ${msg}`)
const err  = (msg) => console.log(`  ${c.red}✗${c.reset}  ${msg}`)
const dim  = (msg) => console.log(`     ${c.gray}${msg}${c.reset}`)

function header(step, title) {
  const line = '─'.repeat(60)
  console.log(`\n${c.bold}${line}${c.reset}`)
  console.log(`${c.bold}  ${step}  ${title}${c.reset}`)
  console.log(`${c.bold}${line}${c.reset}`)
}

// ─── Shell helpers ────────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  info(cmd)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts })
}

function runQuiet(cmd) {
  try { return execSync(cmd, { stdio: 'pipe', cwd: ROOT }).toString().trim() }
  catch { return null }
}

function hasCmd(cmd) {
  try {
    execSync(isWin ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'pipe' })
    return true
  } catch { return false }
}

// ─── Async helpers ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForPort(port, label, maxSec = 40) {
  const start = Date.now()
  while (Date.now() - start < maxSec * 1000) {
    const ok = await new Promise((resolve) => {
      const s = net.createConnection({ port, host: '127.0.0.1' })
      s.once('connect', () => { s.destroy(); resolve(true) })
      s.once('error',   () => { s.destroy(); resolve(false) })
    })
    if (ok) { ok(`${label} ready on :${port}`); return true }
    await sleep(1200)
  }
  warn(`${label} not ready on :${port} after ${maxSec}s — continuing anyway`)
  return false
}

async function waitForHttp(url, maxSec = 40) {
  const start = Date.now()
  while (Date.now() - start < maxSec * 1000) {
    try { const r = await fetch(url); if (r.ok || r.status < 500) return true }
    catch { /* not up yet */ }
    await sleep(1200)
  }
  return false
}

// ─── Interactive prompt ───────────────────────────────────────────────────────
function ask(question) {
  // If stdin is not a TTY (CI, pipe, etc.) return empty string → defaults apply
  if (!process.stdin.isTTY) return Promise.resolve('')

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout,
      terminal: true,
    })
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function isYes(answer, defaultYes = false) {
  if (answer === '') return defaultYes
  return /^y(es)?$/i.test(answer)
}

// ─── .env helpers ─────────────────────────────────────────────────────────────
function getEnvVal(content, key) {
  const m = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return m ? m[1].trim() : null
}

function setEnvVal(content, key, value) {
  const re = new RegExp(`^(${key}=).*$`, 'm')
  if (re.test(content)) return content.replace(re, `$1${value}`)
  return content + `\n${key}=${value}\n`
}

function isPlaceholder(val) {
  return !val || val.startsWith('CHANGE_ME') || val.startsWith('sk_test_...') ||
         val.startsWith('price_...') || val.startsWith('re_...') ||
         val.startsWith('whsec_...') || val.startsWith('sk-ant-...') ||
         val.startsWith('sk-...')
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.clear()
  console.log(`
${c.bold}${c.green}  ██████╗ ███████╗███╗   ██╗████████╗ █████╗ ██╗     ██╗ ██████╗
  ██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██║     ██║██╔═══██╗
  ██║  ██║█████╗  ██╔██╗ ██║   ██║   ███████║██║     ██║██║   ██║
  ██║  ██║██╔══╝  ██║╚██╗██║   ██║   ██╔══██║██║     ██║██║▄▄ ██║
  ██████╔╝███████╗██║ ╚████║   ██║   ██║  ██║███████╗██║╚██████╔╝
  ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝ ╚══▀▀═╝ ${c.reset}
${c.dim}  AI Insurance Intelligence Platform — Setup & Launch${c.reset}
`)

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 0 — Ask upfront questions
  // ────────────────────────────────────────────────────────────────────────────
  header('0 ·', 'Configuration')

  console.log(`
  ${c.bold}AI Features${c.reset} (Ollama local LLM)
  ${c.gray}──────────────────────────────────────────────────${c.reset}
  Enables: pre-auth narrative drafting, claim explanations,
  and Cortex agent intelligence.

  ${c.yellow}Requires downloading a ~4 GB language model (llama3.1:8b).${c.reset}
  Skip this if you just want to explore the UI without AI.
`)

  const aiAnswer = await ask(`  ${c.bold}Enable AI features?${c.reset} [y/N] › `)
  const wantAI   = isYes(aiAnswer, false)

  console.log()

  if (wantAI) {
    ok('AI features ENABLED — Ollama will be installed and the model pulled')
  } else {
    ok(`AI features SKIPPED — UI works fully; AI endpoints return graceful fallbacks`)
    dim('You can enable AI later by installing Ollama and re-running: node setup.js')
  }

  console.log()

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 1 — Prerequisites
  // ────────────────────────────────────────────────────────────────────────────
  header('1 ·', 'Prerequisites')

  // Node.js ≥ 20
  if (!hasCmd('node')) {
    err('Node.js is required. Install from https://nodejs.org (v20+)')
    process.exit(1)
  }
  const nodeVer = runQuiet('node --version')
  const nodeMajor = parseInt((nodeVer || '').replace('v', '').split('.')[0], 10)
  if (nodeMajor < 20) {
    err(`Node.js v20+ required. Found: ${nodeVer}. Update at https://nodejs.org`)
    process.exit(1)
  }
  ok(`Node.js ${nodeVer}`)

  // pnpm
  if (!hasCmd('pnpm')) {
    info('Installing pnpm...')
    if (isMac && hasCmd('brew')) {
      run('brew install pnpm')
    } else {
      run('npm install -g pnpm@9')
    }
  }
  ok(`pnpm ${runQuiet('pnpm --version')}`)

  // Docker (optional — only used for mailpit email preview)
  const dockerCmd    = hasCmd('docker-compose') ? 'docker-compose' : 'docker compose'
  const dockerExists = hasCmd('docker')
  const dockerRunning = dockerExists && runQuiet('docker info') !== null
  if (dockerRunning) {
    ok('Docker running')
  } else {
    warn('Docker not running — email preview (Mailpit) will be unavailable')
    dim('Install Docker Desktop from https://docker.com to enable email preview')
  }

  // Ollama (only when AI is wanted)
  if (wantAI) {
    if (!hasCmd('ollama')) {
      info('Installing Ollama...')
      if (isMac && hasCmd('brew')) {
        run('brew install ollama')
      } else if (isLinux) {
        run('curl -fsSL https://ollama.com/install.sh | sh')
      } else if (isWin) {
        warn('Please install Ollama manually from https://ollama.com/download')
        warn('Then re-run this script.')
        process.exit(1)
      } else {
        warn('Could not auto-install Ollama. Get it at https://ollama.com')
      }
    }
    if (hasCmd('ollama')) {
      ok(`Ollama ${runQuiet('ollama --version') || 'found'}`)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 2 — Environment file
  // ────────────────────────────────────────────────────────────────────────────
  header('2 ·', 'Environment configuration')

  const envPath    = path.join(ROOT, '.env')
  const examplePath = path.join(ROOT, '.env.example')

  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath)
    info('Created .env from .env.example')
  } else {
    info('.env already exists — checking for missing values...')
  }

  let envContent = fs.readFileSync(envPath, 'utf-8')

  // Auto-generate JWT_SECRET if it's a placeholder
  const jwtSecret = getEnvVal(envContent, 'JWT_SECRET')
  if (isPlaceholder(jwtSecret)) {
    const generated = crypto.randomBytes(64).toString('hex')
    envContent = setEnvVal(envContent, 'JWT_SECRET', generated)
    ok('Generated JWT_SECRET (random 128-char hex)')
  } else {
    ok('JWT_SECRET already set')
  }

  // Auto-generate ADMIN_SECRET if placeholder
  const adminSecret = getEnvVal(envContent, 'ADMIN_SECRET')
  if (isPlaceholder(adminSecret) || !adminSecret) {
    const generated = crypto.randomBytes(32).toString('hex')
    envContent = setEnvVal(envContent, 'ADMIN_SECRET', generated)
    ok('Generated ADMIN_SECRET')
  }

  // Ensure ALLOWED_ORIGINS includes both ports
  if (!envContent.includes('3005')) {
    envContent = envContent.replace(
      /^ALLOWED_ORIGINS=.*$/m,
      'ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3005'
    )
    ok('Added port 3005 to ALLOWED_ORIGINS (Admin Portal)')
  }

  // Set LLM mode based on user's choice
  if (!wantAI) {
    // Keep LLM_PROVIDER=ollama (default) but Ollama won't be running.
    // Services fall back gracefully to static templates when Ollama is unreachable.
    dim('LLM_PROVIDER left as "ollama" — AI endpoints return fallback responses when Ollama is not running')
  } else {
    ok(`LLM_PROVIDER: ${getEnvVal(envContent, 'LLM_PROVIDER') || 'ollama'}`)
  }

  fs.writeFileSync(envPath, envContent)
  ok('.env saved')

  // Warn about any remaining placeholders
  const remaining = []
  for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'RESEND_API_KEY', 'ANTHROPIC_API_KEY']) {
    const val = getEnvVal(envContent, key)
    if (val && isPlaceholder(val)) remaining.push(key)
  }
  if (remaining.length > 0) {
    warn(`Optional keys still using placeholders (not required for dev):`)
    remaining.forEach((k) => dim(k))
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 3 — Install dependencies
  // ────────────────────────────────────────────────────────────────────────────
  header('3 ·', 'Installing dependencies')

  run('pnpm install')
  ok('All workspace dependencies installed')

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 4 — Docker (Mailpit email preview only)
  // ────────────────────────────────────────────────────────────────────────────
  header('4 ·', 'Email preview service (Mailpit)')

  if (dockerRunning) {
    try {
      run(`${dockerCmd} up -d mailpit`)
      ok('Mailpit started')
      dim('Email UI → http://localhost:8025')
      dim('Captured emails from all services appear here in dev mode')
    } catch {
      warn('Could not start Mailpit — emails will log to terminal instead')
    }
  } else {
    info('Docker not available — emails will be logged to terminal (EMAIL_MODE=console)')
    dim('This is fine for development. Open .env and set EMAIL_MODE=smtp to use Mailpit later.')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 5 — Ollama (skipped when user opted out)
  // ────────────────────────────────────────────────────────────────────────────
  header('5 ·', wantAI ? 'Ollama — Local AI' : 'Ollama — SKIPPED (no AI mode)')

  if (!wantAI) {
    info('Skipping Ollama setup. AI features will return static fallback responses.')
    dim('To enable AI later:')
    dim('  1. Install Ollama → https://ollama.com')
    dim('  2. Run: ollama pull llama3.1:8b')
    dim('  3. Run: ollama serve')
    dim('  4. Restart services: pnpm dev')
  } else {
    if (!hasCmd('ollama')) {
      warn('Ollama not found — skipping AI setup. Install from https://ollama.com')
    } else {
      // Read model from .env (re-read in case it changed)
      const freshEnv  = fs.readFileSync(envPath, 'utf-8')
      const ollamaUrl   = getEnvVal(freshEnv, 'OLLAMA_BASE_URL') || 'http://localhost:11434'
      const ollamaModel = getEnvVal(freshEnv, 'OLLAMA_MODEL')    || 'llama3.1:8b'

      info(`Model: ${ollamaModel}`)
      info(`URL:   ${ollamaUrl}`)

      // Check if Ollama is already running
      let ollamaUp = false
      try { const r = await fetch(`${ollamaUrl}/api/tags`); ollamaUp = r.ok } catch {}

      if (ollamaUp) {
        ok('Ollama already running')
      } else {
        info('Starting Ollama server in background...')
        const proc = spawn('ollama', ['serve'], {
          detached: true, stdio: 'ignore',
          shell: isWin, cwd: ROOT,
        })
        proc.unref()
        ollamaUp = await waitForHttp(`${ollamaUrl}/api/tags`, 25)
        if (!ollamaUp) {
          warn('Ollama did not start in time — AI will use fallback templates')
        }
      }

      if (ollamaUp) {
        // Pull model if not present
        try {
          const tagsRes = await fetch(`${ollamaUrl}/api/tags`)
          if (tagsRes.ok) {
            const { models = [] } = await tagsRes.json()
            const installed = models.some(
              (m) => m.name === ollamaModel || m.name.startsWith(`${ollamaModel}:`)
            )
            if (installed) {
              ok(`Model "${ollamaModel}" already downloaded`)
            } else {
              console.log()
              info(`Pulling model "${ollamaModel}" — this downloads ~4 GB on first run.`)
              info('Grab a coffee ☕ — this only happens once.')
              console.log()
              run(`ollama pull ${ollamaModel}`)
              ok(`Model "${ollamaModel}" ready`)
            }
          }
        } catch {
          warn('Could not verify/pull model — AI features may use fallback templates')
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 6 — Database schema
  // ────────────────────────────────────────────────────────────────────────────
  header('6 ·', 'Database schema')

  // Ensure drizzle config uses sqlite dialect (common migration issue)
  try {
    const drizzleCfg = path.join(ROOT, 'packages/db/drizzle.config.ts')
    if (fs.existsSync(drizzleCfg)) {
      let cfg = fs.readFileSync(drizzleCfg, 'utf-8')
      if (cfg.includes("dialect: 'turso'") || cfg.includes('dialect: "turso"')) {
        cfg = cfg.replace(/dialect:\s*['"]turso['"]/g, "dialect: 'sqlite'")
        fs.writeFileSync(drizzleCfg, cfg)
        ok('Fixed Drizzle dialect (turso → sqlite)')
      }
    }
  } catch { /* non-fatal */ }

  try {
    run('pnpm db:push')
    ok('Database schema up to date')
    dim('SQLite database: dentaliq.db (at repo root)')
  } catch {
    warn('db:push failed — run manually: pnpm db:push')
    dim('This is usually fine if the schema already exists from a previous run.')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 7 — Demo seed data
  // ────────────────────────────────────────────────────────────────────────────
  header('7 ·', 'Demo seed data')

  try {
    run('pnpm seed')
    ok('Demo data seeded')
    dim('Login: demo@dentaliq.dev  /  Demo1234!')
  } catch {
    warn('Seed failed (DB may already have data) — continuing')
    dim('To force re-seed: delete dentaliq.db then run: pnpm seed')
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STEP 8 — Launch all services
  // ────────────────────────────────────────────────────────────────────────────
  header('8 ·', 'Launching DentalIQ')

  const aiStatus = wantAI
    ? `${c.green}Enabled${c.reset} (${getEnvVal(fs.readFileSync(envPath,'utf-8'), 'OLLAMA_MODEL') || 'llama3.1:8b'})`
    : `${c.yellow}Disabled${c.reset} (static fallbacks)`
  const mailStatus = dockerRunning
    ? `${c.green}http://localhost:8025${c.reset}`
    : `${c.yellow}Terminal logs (no Docker)${c.reset}`

  console.log(`
${c.bold}  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │   🦷  DentalIQ is starting up...                   │
  │                                                     │
  │   Frontend      ${c.cyan}http://localhost:3000${c.reset}${c.bold}              │
  │   Auth API      ${c.cyan}http://localhost:3001${c.reset}${c.bold}              │
  │   Tenant API    ${c.cyan}http://localhost:3002${c.reset}${c.bold}              │
  │   Estimate API  ${c.cyan}http://localhost:3004${c.reset}${c.bold}              │
  │   Admin Portal  ${c.cyan}http://localhost:3005${c.reset}${c.bold}              │
  │   Agent Manager ${c.cyan}http://localhost:3006${c.reset}${c.bold}              │
  │                                                     │
  │   AI features   ${aiStatus}${c.bold}
  │   Email UI      ${mailStatus}${c.bold}
  │                                                     │
  │   Demo login    demo@dentaliq.dev                   │
  │   Password      Demo1234!                           │
  │                                                     │
  │   Press  Ctrl+C  to stop all services.              │
  │                                                     │
  └─────────────────────────────────────────────────────┘${c.reset}
`)

  const dev = spawn('pnpm', ['dev'], {
    stdio:  'inherit',
    shell:  isWin,
    cwd:    ROOT,
  })

  dev.on('close', (code) => {
    console.log(`\n  DentalIQ stopped (exit ${code}).`)
    process.exit(code ?? 0)
  })

  process.on('SIGINT',  () => dev.kill('SIGINT'))
  process.on('SIGTERM', () => dev.kill('SIGTERM'))
}

// ─────────────────────────────────────────────────────────────────────────────
main().catch((e) => {
  console.error(`\n  ${c.red}✗${c.reset}  Setup failed: ${e.message}`)
  process.exit(1)
})

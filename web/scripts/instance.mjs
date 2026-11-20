// Reads this community's instance/config.jsonc and generates the files the build
// needs: web/wrangler.jsonc and web/.env.production.local (public env vars, which
// Next inlines at build time). Run automatically before every build/deploy.
//
//   node scripts/instance.mjs            generate
//   MYCONET_INSTANCE_DIR=../other node … use another instance folder
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INSTANCE_DIR = resolve(WEB, process.env.MYCONET_INSTANCE_DIR ?? '../instance')

/** JSON with // and /* *\/ comments and trailing commas. */
function parseJsonc(text) {
  let out = '', inStr = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1]
    if (inStr) {
      out += c
      if (c === '\\') out += text[++i]
      else if (c === '"') inStr = false
    } else if (c === '"') { inStr = true; out += c }
    else if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n' }
    else if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2) + 1 }
    else out += c
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

export function loadInstance() {
  const file = resolve(INSTANCE_DIR, 'config.jsonc')
  if (!existsSync(file)) {
    throw new Error(`No instance config at ${file}. Copy instance.example/ to instance/ and fill it in.`)
  }
  const cfg = parseJsonc(readFileSync(file, 'utf8'))
  const problems = []
  if (!/^[a-z0-9-]+$/.test(cfg.id ?? '')) problems.push('id: lowercase letters, numbers and dashes')
  if (!cfg.displayName) problems.push('displayName is required')
  if (!/^https:\/\/[^/]+$/.test(cfg.appUrl ?? '')) problems.push('appUrl: https://host, no trailing slash')
  if (!/^[a-z0-9-]+$/.test(cfg.cloudflare?.workerName ?? '')) problems.push('cloudflare.workerName: lowercase letters, numbers and dashes')
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cfg.supabase?.url ?? '')) problems.push('supabase.url: https://<ref>.supabase.co')
  if (!cfg.supabase?.anonKey) problems.push('supabase.anonKey is required')
  const known = ['meetings', 'points']
  for (const m of cfg.modules ?? []) if (!known.includes(m)) problems.push(`modules: unknown module "${m}" (known: ${known.join(', ')})`)
  if (cfg.timeZone) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: cfg.timeZone }) } catch { problems.push(`timeZone: "${cfg.timeZone}" isn't a time zone (e.g. "America/Costa_Rica")`) }
  }
  if (cfg.knowledge?.repo && !/^[\w.-]+\/[\w.-]+$/.test(cfg.knowledge.repo)) problems.push('knowledge.repo: "owner/repo"')
  const mail = cfg.meetings?.notesEmail
  if (mail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.from ?? '')) problems.push('meetings.notesEmail.from: an email address')
    if (!mail.smtpHost) problems.push('meetings.notesEmail.smtpHost is required (e.g. "smtp.gmail.com")')
  }
  if (problems.length) throw new Error(`instance/config.jsonc:\n  - ${problems.join('\n  - ')}`)
  return cfg
}

function wranglerConfig(cfg) {
  return {
    $schema: 'node_modules/wrangler/config-schema.json',
    main: '.open-next/worker.js',
    name: cfg.cloudflare.workerName,
    ...(cfg.cloudflare.accountId ? { account_id: cfg.cloudflare.accountId } : {}),
    workers_dev: true,
    compatibility_date: '2026-05-11',
    compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
    vars: publicEnv(cfg),
    assets: { directory: '.open-next/assets', binding: 'ASSETS' },
    // Self-reference binding; must match the worker name (https://opennext.js.org/cloudflare/caching)
    services: [{ binding: 'WORKER_SELF_REFERENCE', service: cfg.cloudflare.workerName }],
    // Image optimization (https://opennext.js.org/cloudflare/howtos/image)
    images: { binding: 'IMAGES' },
  }
}

function gitSha() {
  try { return execSync('git rev-parse HEAD', { cwd: WEB, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

function publicEnv(cfg) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: cfg.supabase.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: cfg.supabase.anonKey,
    NEXT_PUBLIC_APP_URL: cfg.appUrl,
    NEXT_PUBLIC_COMMUNITY_NAME: cfg.displayName,
    // Optional modules that are on, e.g. "meetings" (core/lib/modules.ts)
    NEXT_PUBLIC_MODULES: (cfg.modules ?? []).join(','),
    // The look: "v4" = the pastel redesign (DESIGN-SYSTEM.md › v4). Empty = the current look.
    NEXT_PUBLIC_DESIGN: cfg.design ?? '',
    // The community's time zone, for dates said in meetings ("by Friday") and task times
    COMMUNITY_TIME_ZONE: cfg.timeZone ?? 'UTC',
    // The community's second brain on GitHub (meeting notes are saved there); the token is the
    // SECOND_BRAIN_GITHUB_TOKEN secret
    ...(cfg.knowledge?.repo ? { KNOWLEDGE_REPO: cfg.knowledge.repo, KNOWLEDGE_BRANCH: cfg.knowledge.branch ?? 'main', KNOWLEDGE_MEETINGS_FOLDER: cfg.knowledge.meetingsFolder ?? 'operations/meetings', KNOWLEDGE_BOARD_FOLDER: cfg.knowledge.boardFolder ?? 'operations/board' } : {}),
    // Meeting notes email (needs the MEETINGS_SMTP_PASSWORD secret)
    ...(cfg.meetings?.notesEmail ? {
      MEETINGS_EMAIL_FROM: cfg.meetings.notesEmail.from,
      MEETINGS_SMTP_HOST: cfg.meetings.notesEmail.smtpHost,
      MEETINGS_SMTP_PORT: String(cfg.meetings.notesEmail.smtpPort ?? 465),
      MEETINGS_EMAIL_ALWAYS_TO: (cfg.meetings.notesEmail.alwaysTo ?? []).join(','),
    } : {}),
    // The commit this build came from: /api/version reports it, and the deploy check compares it
    NEXT_PUBLIC_GIT_SHA: gitSha(),
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let cfg
  try { cfg = loadInstance() } catch (e) { console.error(`\n✖ ${e.message}\n`); process.exit(1) }
  const banner = `// GENERATED from instance/config.jsonc by scripts/instance.mjs — don't edit.\n`
  writeFileSync(resolve(WEB, 'wrangler.jsonc'), banner + JSON.stringify(wranglerConfig(cfg), null, 2) + '\n')
  writeFileSync(
    resolve(WEB, '.env.production.local'),
    `# GENERATED from instance/config.jsonc by scripts/instance.mjs — don't edit.\n` +
      Object.entries(publicEnv(cfg)).map(([k, v]) => `${k}=${v}`).join('\n') + '\n',
  )
  console.log(`MyCoNet instance: ${cfg.displayName} (${cfg.id}) → worker "${cfg.cloudflare.workerName}"`)
}

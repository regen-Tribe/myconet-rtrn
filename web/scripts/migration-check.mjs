#!/usr/bin/env node
// Migration numbers: core and a community share one list in the database (supabase_migrations.schema_migrations),
// so a community migration that takes a core number makes `supabase db push` skip the core one, silently. That
// happened twice on Protopia (2026-11-21): circles.icon and meeting_transcripts.team_id were missing for a while.
//
// The rule (supabase/migrations/README.md): a number is YYYYMMDDHHMMSS.
//   core (supabase/migrations/)        HH 00–89, e.g. 20261217000100_something.sql
//   a community (instance/migrations/) HH 90–99, e.g. 20261217900100_protopia_something.sql
// so the two can never meet, whatever order they're written or applied in.
//
//   node scripts/migration-check.mjs         the files: core vs instance (deploy-check runs this on every deploy)
//   node scripts/migration-check.mjs --db    also the linked database: a number applied under another file's
//                                            name, and core or instance migrations not applied yet
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..')
// Files numbered before the rule (2026-11-21) keep their numbers; they were reconciled by hand
const BEFORE_RULE = '20261217000000'

const list = dir => existsSync(dir)
  ? readdirSync(dir).filter(f => /^\d{14}_.+\.sql$/.test(f)).map(f => ({ version: f.slice(0, 14), name: f.slice(15, -4), file: f }))
  : []
const hour = v => Number(v.slice(8, 10))

/** The files alone: what deploy-check refuses (errors) or mentions (warnings) */
export function checkMigrationFiles(root = ROOT) {
  const core = list(join(root, 'supabase/migrations'))
  const own = list(join(root, 'instance/migrations'))
  const errors = [], warnings = []
  const coreBy = new Map(core.map(m => [m.version, m]))
  for (const m of core) {
    if (hour(m.version) >= 90 && m.version >= BEFORE_RULE) errors.push(`core migration ${m.file} uses a community number (HH 90–99). Core numbers keep HH 00–89.`)
  }
  for (const m of own) {
    const clash = coreBy.get(m.version)
    const old = m.version < BEFORE_RULE
    if (clash) (old ? warnings : errors).push(`instance/migrations/${m.file} has the same number as core's ${clash.file}: the database can hold only one of them.${old ? ' (From before the rule; reconciled by hand.)' : ' Renumber it into HH 90–99.'}`)
    else if (hour(m.version) < 90 && !old) errors.push(`instance/migrations/${m.file} uses a core number. A community's migrations use HH 90–99, e.g. ${m.version.slice(0, 8)}9${m.version.slice(9)}_${m.name}.sql.`)
  }
  return { core, own, errors, warnings }
}

/** The linked database's list (supabase CLI, linked project): version → name */
function applied() {
  const r = spawnSync('supabase', ['db', 'query', '--linked', 'select version, name from supabase_migrations.schema_migrations order by version'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  const m = (r.stdout || '').match(/"rows":\s*(\[[\s\S]*?\])\s*,\s*"warning"/) ?? (r.stdout || '').match(/(\[\s*\{[\s\S]*\}\s*\])/)
  if (r.status !== 0 || !m) return null
  return new Map(JSON.parse(m[1]).map(x => [String(x.version), String(x.name ?? '')]))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { core, own, errors, warnings } = checkMigrationFiles()
  const notApplied = []
  if (process.argv.includes('--db')) {
    const db = applied()
    if (!db) errors.push('Couldn’t read the linked database (supabase CLI linked to this community? `supabase link` first).')
    else {
      for (const m of [...core, ...own]) {
        const there = db.get(m.version)
        if (there === undefined) notApplied.push(m)
        else if (there && there !== m.name) {
          const mine = own.some(o => o.version === m.version && o.name === there) || core.some(c => c.version === m.version && c.name === there)
          if (!mine) errors.push(`the database has ${m.version} as “${there}”, but the file is ${m.file}: \`supabase db push\` thinks it's applied and skips it. Check its tables exist; apply the file by hand if not (\`supabase db query --linked -f <file>\`).`)
          else if (m.version < BEFORE_RULE) warnings.push(`${m.version}: the database has “${there}”; ${m.file} shares the number (from before the rule; reconciled by hand).`)
        }
      }
    }
  }
  for (const w of warnings) console.log(`  · ${w}`)
  if (notApplied.length) console.log(`\nNot applied to the database yet (${notApplied.length}):\n${notApplied.map(m => `  ${m.file}`).join('\n')}`)
  if (errors.length) { console.error(`\n✖ Migration numbers:\n${errors.map(e => `  • ${e}`).join('\n')}\n`); process.exit(1) }
  console.log(`\n✓ Migration numbers: ${core.length} core, ${own.length} for this community, no clashes.`)
}

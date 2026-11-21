#!/usr/bin/env node
// Keeps the three visual layers apart (DESIGN-SYSTEM.md › v4): interface icons are the marker-line set
// (<Icon> / <InlineIcon> from '@/core/components/v4'), never an emoji and never another icon library.
// Fails when a .ts or .tsx file under web/src has an emoji outside a comment, or imports lucide-react.
//   cd web && npm run icon-check
// Fix: use <Icon name="…" /> (add a drawing to core/components/v4/icons.ts if none fits). If the emoji
// really belongs there (words quoted from the past, data for communities without the v4 look), add the
// file to ALLOW_FILES below with the reason.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

/** Files where emoji are meant to be, with why. Paths from web/src. */
const ALLOW_FILES = {
  'app/changelog/page.tsx': 'release notes quote the names buttons had at the time',
  'modules/m04-blueprint/lib/circle-setup.ts': 'circle emoji, still shown by communities without the v4 look',
}

// Typographic marks that Unicode also lists as pictographs: fine in text ("↕ Soonest deadline", "© 2026").
const ALLOW_CHARS = new Set([...'↔↕↖↗↘↙↩↪©®™▪▫▶◀'])

const PICTO = /\p{Extended_Pictographic}/gu
const LUCIDE = /from\s+['"]lucide-react['"]|require\(\s*['"]lucide-react['"]\s*\)|import\(\s*['"]lucide-react['"]\s*\)/

/** Blanks out comments, keeping line numbers. A "//" right after ":" is a URL, not a comment. */
function withoutComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, (m, lead) => lead + ' '.repeat(m.length - lead.length))
}

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

const problems = []
for (const file of files(SRC)) {
  const rel = relative(SRC, file).split('\\').join('/')
  const text = readFileSync(file, 'utf8')
  // The stand-ins for the old lucide names live in lucide-compat.tsx and import nothing from the package
  text.split('\n').forEach((line, i) => {
    if (LUCIDE.test(line)) problems.push(`${rel}:${i + 1}: imports lucide-react. Use <Icon name="…" /> from '@/core/components/v4'.`)
  })
  if (ALLOW_FILES[rel]) continue
  withoutComments(text).split('\n').forEach((line, i) => {
    const found = [...new Set((line.match(PICTO) ?? []).filter(c => !ALLOW_CHARS.has(c)))]
    if (found.length) problems.push(`${rel}:${i + 1}: emoji ${found.join(' ')}. Use <Icon> or <InlineIcon> instead.`)
  })
}

if (problems.length) {
  console.error(`✗ icon-check: ${problems.length} place${problems.length === 1 ? '' : 's'} to fix\n`)
  for (const p of problems) console.error(`  ${p}`)
  console.error('\nInterface icons are the marker-line set, never an emoji (DESIGN-SYSTEM.md › v4). See the top of web/scripts/icon-check.mjs.')
  process.exit(1)
}
console.log('✓ icon-check: no emoji on screens, no lucide-react imports.')

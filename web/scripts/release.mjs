#!/usr/bin/env node
// Gives the pending changes their version, at release time.
//
// A change never picks its own version: it adds one note, changes/<slug>.md (see changes/README.md).
// This script reads the pending notes, takes the next free version after both the core tags and
// CHANGELOG.md, writes web/src/core/lib/version.ts, CHANGELOG.md and the ENTRIES list in
// web/src/app/changelog/page.tsx, and deletes the notes. `npm run ship` runs it; you rarely do.
//
//   node scripts/release.mjs             write the release
//   node scripts/release.mjs --dry-run   show the version and the text, change nothing
//   node scripts/release.mjs --check [base]   validate the notes (CI); with a base ref, also fail when
//                                             the diff edits the release files while notes are pending
//   --date YYYY-MM-DD   the release date (default: today, UTC)
//   --offline           use the tags already fetched instead of asking GitHub
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = resolve(WEB, '..')
export const CORE_REPO = 'regen-Tribe/myconet'
export const RELEASE_FILES = ['web/src/core/lib/version.ts', 'CHANGELOG.md', 'web/src/app/changelog/page.tsx']
const BUMPS = ['patch', 'minor', 'major']

const git = (args, root = ROOT) => {
  try { return execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trimEnd() } catch { return null }
}

/** The pending notes in changes/, oldest first. Throws with every problem found. */
export function readNotes(root = ROOT) {
  const dir = join(root, 'changes')
  if (!existsSync(dir)) return []
  const problems = []
  const notes = readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md').map(file => {
    const text = readFileSync(join(dir, file), 'utf8')
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
    const bad = why => { problems.push(`changes/${file}: ${why}`); return null }
    if (!m) return bad('no front matter (--- bump, title, public ---)')
    const meta = {}
    let list = null
    for (const line of m[1].split(/\r?\n/)) {
      const item = line.match(/^\s+-\s+(.*)$/)
      const pair = line.match(/^([a-z]+):\s*(.*)$/)
      if (item && list) meta[list].push(unquote(item[1]))
      else if (pair) { list = pair[2] ? null : pair[1]; meta[pair[1]] = pair[2] ? unquote(pair[2]) : [] }
      else if (line.trim()) return bad(`can't read the line "${line}"`)
    }
    const items = [meta.public].flat().filter(Boolean)
    if (!BUMPS.includes(meta.bump)) return bad('bump must be patch, minor or major')
    if (!meta.title || typeof meta.title !== 'string') return bad('title is missing')
    if (!items.length) return bad('public is missing (the line people read in the app at /changelog)')
    if (!m[2].trim()) return bad('the body is empty (it becomes the CHANGELOG.md text)')
    if (/^## v\d/m.test(m[2])) return bad('the body has a "## vX.Y.Z" heading: leave the version out, the release adds it')
    // Oldest first, by when the note was first committed (a note not committed yet goes last)
    const added = Number(git(['log', '--diff-filter=A', '--format=%at', '-1', '--', `changes/${file}`], root)) || Infinity
    return { file, bump: meta.bump, title: meta.title, items, body: m[2].trim(), added }
  }).filter(Boolean)
  if (problems.length) throw new Error(problems.join('\n'))
  return notes.sort((a, b) => a.added - b.added || a.file.localeCompare(b.file))
}

const unquote = s => {
  const t = s.trim()
  return /^(".*"|'.*')$/.test(t) ? t.slice(1, -1) : t
}
const parse = v => v.replace(/^v/, '').split('.').map(Number)
const cmp = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0 }

/** Every version already taken: core's tags (asked from GitHub unless offline) and CHANGELOG.md's headings. */
export function takenVersions(root = ROOT, { offline = false } = {}) {
  const remotes = (git(['remote', '-v'], root) ?? '').split('\n')
  const core = remotes.find(l => l.toLowerCase().includes(CORE_REPO.toLowerCase()))?.split(/\s+/)[0]
  let tags = null, source = 'the tags in this checkout'
  if (!offline && core) {
    const out = git(['ls-remote', '--tags', '--refs', core, 'v[0-9]*'], root)
    if (out !== null) { tags = out.split('\n').map(l => l.split('refs/tags/')[1]).filter(Boolean); source = `the tags on ${CORE_REPO}` }
  }
  tags ??= (git(['tag', '--list', 'v[0-9]*'], root) ?? '').split('\n').filter(Boolean)
  const changelog = [...readFileSync(join(root, 'CHANGELOG.md'), 'utf8').matchAll(/^## (v\d+\.\d+\.\d+)\b/gm)].map(m => m[1])
  const file = readFileSync(join(root, RELEASE_FILES[0]), 'utf8').match(/VERSION = '(v\d+\.\d+\.\d+)'/)?.[1]
  const all = [...tags, ...changelog, file].filter(v => /^v\d+\.\d+\.\d+$/.test(v ?? ''))
  return { all: new Set(all), newest: all.sort(cmp).at(-1) ?? 'v0.0.0', source }
}

export function nextVersion(newest, bump) {
  const [a, b, c] = parse(newest)
  return bump === 'major' ? `v${a + 1}.0.0` : bump === 'minor' ? `v${a}.${b + 1}.0` : `v${a}.${b}.${c + 1}`
}

/** What the release will say: version, title, the CHANGELOG.md section and the /changelog entry. */
export function plan(root = ROOT, { offline = false, date } = {}) {
  const notes = readNotes(root)
  if (!notes.length) return null
  const taken = takenVersions(root, { offline })
  const bump = BUMPS[Math.max(...notes.map(n => BUMPS.indexOf(n.bump)))]
  const version = nextVersion(taken.newest, bump)
  const title = notes.map(n => n.title).join('; ')
  const when = date ?? new Date().toISOString().slice(0, 10)
  const body = notes.length === 1 ? notes[0].body : notes.map(n => `**${n.title}.** ${n.body}`).join('\n\n')
  const q = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`
  return {
    version, bump, title, date: when, notes, newest: taken.newest, source: taken.source,
    changelog: `## ${version} — ${when} — ${title}\n\n${body}\n`,
    entry: `  {\n    version: ${q(version)},\n    date: ${q(when)},\n    title: ${q(title)},\n    items: [${notes.flatMap(n => n.items).map(q).join(', ')}],\n  },\n`,
  }
}

/** Writes the three release files and deletes the notes. */
export function write(p, root = ROOT) {
  const edit = (rel, fn) => {
    const file = join(root, rel), before = readFileSync(file, 'utf8'), after = fn(before)
    if (after === before) throw new Error(`Couldn't find where to write the release in ${rel}.`)
    writeFileSync(file, after)
  }
  edit(RELEASE_FILES[0], s => s.replace(/VERSION = 'v[\d.]+'/, `VERSION = '${p.version}'`)
    // The comment from when every change bumped the version itself; left for the first release to drop,
    // because a change next to the VERSION line would have conflicted with every open pull request
    .replace('// Bump on each deploy; add a matching entry to web/src/app/changelog/page.tsx.\n', ''))
  edit(RELEASE_FILES[1], s => s.replace(/^## v\d/m, m => `${p.changelog}\n${m}`))
  edit(RELEASE_FILES[2], s => s.replace(/^const ENTRIES = \[\n/m, m => m + p.entry))
  for (const n of p.notes) rmSync(join(root, 'changes', n.file))
}

// A line that only the release writes, per release file
const RELEASE_LINES = [/^[+-]export const VERSION = /m, /^[+-]## v\d+\.\d+\.\d+ /m, /^[+-]\s+version: 'v\d/m]

/** The release files whose release lines differ between `range` (e.g. "v4.81.0 HEAD", "origin/main...HEAD"). */
export function editedByHand(range, root = ROOT) {
  return RELEASE_FILES.filter((f, i) => RELEASE_LINES[i].test(git(['diff', ...range.split(' '), '--', f], root) ?? ''))
}

/** CI: the notes are valid, and nobody edited the release files by hand while notes are pending. */
function check(base) {
  const notes = readNotes()
  const byHand = base && notes.length ? editedByHand(`${base}...HEAD`) : []
  if (byHand.length) {
    throw new Error(`This change edits ${byHand.join(', ')} and also has a note in changes/.\n` +
      'Undo the edit to those files: the release writes them from the note (changes/README.md).')
  }
  console.log(notes.length
    ? `✓ ${notes.length} change note(s) ready for the next release: ${notes.map(n => n.file).join(', ')}`
    : '✓ No pending change notes.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const flag = name => args.includes(name)
  const value = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
  try {
    if (flag('--check')) {
      const base = value('--check')
      check(base && !base.startsWith('--') ? base : null)
    } else {
      const p = plan(ROOT, { offline: flag('--offline'), date: value('--date') })
      if (!p) {
        console.log('Nothing to release: no notes in changes/.')
      } else {
        const dry = flag('--dry-run')
        console.log(`${dry ? 'Dry run: would release' : 'Releasing'} ${p.version} (${p.bump}; the newest taken version is ${p.newest}, from ${p.source} and CHANGELOG.md)`)
        console.log(`  from: ${p.notes.map(n => `changes/${n.file}`).join(', ')}`)
        console.log(`\n── CHANGELOG.md ──\n${p.changelog}\n── /changelog (web/src/app/changelog/page.tsx) ──\n${p.entry}`)
        if (dry) {
          console.log(`Nothing was changed. Without --dry-run this writes ${RELEASE_FILES.join(', ')} and deletes the note(s).`)
        } else {
          write(p)
          console.log(`✓ Wrote ${RELEASE_FILES.join(', ')} and deleted ${p.notes.length} note(s). Commit them as "Release ${p.version}".`)
        }
      }
    }
  } catch (e) {
    console.error(`✗ ${e.message}`)
    process.exit(1)
  }
}

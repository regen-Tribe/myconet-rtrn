#!/usr/bin/env node
// Send this branch's core-file changes to MyCoNet core as a pull request.
// Run from a community repo, on a feature branch:  cd web && npm run upstream
// Takes everything outside instance/ that differs from the core release the
// branch is on, applies it to a new branch of core, and opens a PR there.
// Needs git and the GitHub CLI (gh), signed in with access to the core repo.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CORE_REPO = 'regen-Tribe/myconet'

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  if (r.status !== 0 && !opts.allowFail) {
    console.error(`✗ ${cmd} ${args.join(' ')}\n${r.stderr || r.stdout}`)
    process.exit(1)
  }
  return (r.stdout || '').trim()
}
const git = (args, opts) => run('git', args, opts)

const root = git(['rev-parse', '--show-toplevel'])
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root })
if (['main', 'master'].includes(branch)) {
  console.error('Run this on a feature branch, not main.')
  process.exit(1)
}
let id = 'community'
try {
  id = readFileSync(join(root, 'instance/config.jsonc'), 'utf8').match(/"id"\s*:\s*"([^"]+)"/)?.[1] ?? id
} catch { /* core itself has no instance/ */ }

if (!git(['remote'], { cwd: root }).split('\n').includes('upstream')) {
  git(['remote', 'add', 'upstream', `https://github.com/${CORE_REPO}.git`], { cwd: root })
}
git(['fetch', '--quiet', '--tags', 'upstream'], { cwd: root })
const base = git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', 'HEAD'], { cwd: root })

const pathspec = ['--', '.', ':(exclude)instance/**']
const files = git(['diff', '--name-only', base, 'HEAD', ...pathspec], { cwd: root })
if (!files) {
  console.log(`Nothing to send: only instance/ differs from core ${base}.`)
  process.exit(0)
}
const patch = git(['diff', '--binary', base, 'HEAD', ...pathspec], { cwd: root }) + '\n'

const tmp = mkdtempSync(join(tmpdir(), 'myconet-upstream-'))
try {
  const target = `upstream/${id}-${branch.replace(/[^A-Za-z0-9._-]+/g, '-')}`
  run('gh', ['repo', 'clone', CORE_REPO, tmp, '--', '--quiet'])
  git(['checkout', '--quiet', '-b', target, 'origin/main'], { cwd: tmp })
  writeFileSync(join(tmp, '.upstream.patch'), patch)
  const applied = spawnSync('git', ['apply', '--3way', '--index', '.upstream.patch'], { cwd: tmp, encoding: 'utf8' })
  rmSync(join(tmp, '.upstream.patch'))
  if (applied.status !== 0) {
    console.error(`✗ The change doesn't apply cleanly to core main (it was made on ${base}).\n${applied.stderr}`)
    console.error('Update this repo to the latest core release first, then try again.')
    process.exit(1)
  }
  const log = git(['log', '--format=- %s', `${base}..HEAD`], { cwd: root })
  git(['commit', '--quiet', '-m', `Upstream from ${id}: ${branch}`, '-m', log], { cwd: tmp })
  git(['push', '--quiet', '-u', 'origin', target], { cwd: tmp })
  const body = [
    `From the **${id}** community repo, branch \`${branch}\` (on core ${base}).`,
    '',
    '**Before merging, make it general** (CORE-EXTRACTION.md §4): community names and values become settings,',
    'new behaviour sits behind a switch, database changes are a numbered migration.',
    '',
    '### Commits', log, '', '### Core files changed', files.split('\n').map(f => `- \`${f}\``).join('\n'),
  ].join('\n')
  const url = run('gh', ['pr', 'create', '--repo', CORE_REPO, '--base', 'main', '--head', target,
    '--title', `Upstream from ${id}: ${branch}`, '--body', body], { cwd: tmp })
  console.log(`✓ Opened ${url}`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

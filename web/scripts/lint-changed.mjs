#!/usr/bin/env node
// Lint the web source files this branch changes. An error fails the check.
// Warnings are printed and do not fail it, because some files already warn
// for reasons that are not a one-line fix. Set LINT_BASE to the comparison
// ref (default origin/main).

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const web = join(dirname(fileURLToPath(import.meta.url)), '..')
const root = join(web, '..')
const base = process.env.LINT_BASE ?? 'origin/main'

const diff = spawnSync(
  'git',
  ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`, '--', 'web/src'],
  { cwd: root, encoding: 'utf8' },
)
if (diff.status !== 0) {
  console.error(diff.stderr || `Could not diff against ${base}.`)
  process.exit(1)
}

const files = diff.stdout
  .split('\n')
  .map(line => line.trim())
  .filter(file => /\.(ts|tsx|js|jsx|mjs)$/.test(file) && existsSync(join(root, file)))
  .map(file => file.slice('web/'.length))

if (files.length === 0) {
  console.log(`No web source files changed against ${base}.`)
  process.exit(0)
}

console.log(`Linting ${files.length} changed file${files.length === 1 ? '' : 's'} against ${base}.`)
const eslint = spawnSync(
  join(web, 'node_modules/.bin/eslint'),
  files,
  { cwd: web, stdio: 'inherit' },
)
process.exit(eslint.status ?? 1)

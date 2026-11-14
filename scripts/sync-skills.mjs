#!/usr/bin/env node
// Copy skills-src into the directories agents read.
// Author skills only under skills-src/, then run this script.
// --check writes nothing and exits 1 when a generated copy has drifted.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(root, 'skills-src')
const targets = ['.agents/skills', '.claude/skills', '.cursor/skills']
const check = process.argv.includes('--check')

function skip(name) {
  return name === '.DS_Store' || name === 'README.md'
}

function walk(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    if (skip(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else files.push(path)
  }
  return files
}

function skillNames(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => {
    if (skip(name)) return false
    return statSync(join(dir, name)).isDirectory()
  })
}

const skills = skillNames(sourceRoot)
if (skills.length === 0) {
  console.error('skills-src has no skills.')
  process.exit(1)
}

for (const name of skills) {
  const skillFile = join(sourceRoot, name, 'SKILL.md')
  if (!existsSync(skillFile)) {
    console.error(`skills-src/${name} has no SKILL.md`)
    process.exit(1)
  }
  const frontmatter = readFileSync(skillFile, 'utf8').match(/^---\n([\s\S]*?)\n---/)
  const declared = frontmatter?.[1].match(/^name:\s*(\S+)\s*$/m)?.[1]
  if (declared !== name) {
    console.error(`skills-src/${name}/SKILL.md declares name "${declared ?? ''}", expected "${name}"`)
    process.exit(1)
  }
}

let drifted = false

function differ(label) {
  drifted = true
  console.error(check ? `differs: ${label}` : `updated: ${label}`)
}

for (const targetRel of targets) {
  const targetRoot = join(root, targetRel)
  const expected = new Set(skills)

  for (const existing of skillNames(targetRoot)) {
    if (expected.has(existing)) continue
    differ(`${targetRel}/${existing} (removed from skills-src)`)
    if (!check) rmSync(join(targetRoot, existing), { recursive: true, force: true })
  }

  for (const name of skills) {
    const from = join(sourceRoot, name)
    const to = join(targetRoot, name)
    const sourceFiles = new Set(walk(from).map((file) => relative(from, file)))

    for (const file of walk(from)) {
      const rel = relative(from, file)
      const dest = join(to, rel)
      const body = readFileSync(file)
      if (existsSync(dest) && readFileSync(dest).equals(body)) continue
      differ(`${targetRel}/${name}/${rel}`)
      if (!check) {
        mkdirSync(dirname(dest), { recursive: true })
        writeFileSync(dest, body)
      }
    }

    if (!existsSync(to)) continue
    for (const file of walk(to)) {
      const rel = relative(to, file)
      if (sourceFiles.has(rel)) continue
      differ(`${targetRel}/${name}/${rel} (not in skills-src)`)
      if (!check) rmSync(file)
    }
  }
}

if (check && drifted) {
  console.error('Generated skills are stale. Edit skills-src and run: node scripts/sync-skills.mjs')
  process.exit(1)
}

if (check) console.log(`Skill copies match skills-src (${skills.length} skill${skills.length === 1 ? '' : 's'}).`)
else if (!drifted) console.log('Skill copies already match skills-src.')

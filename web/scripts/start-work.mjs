// Run at the start of every work session (Claude Code runs it automatically: .claude/settings.json):
//   cd web && npm run start-work
// 1. Brings this checkout up to date with GitHub (fast-forward only, never over your own changes).
// 2. Shows what others changed recently and what they're working on now (open PRs, fresh branches),
//    and warns when their files overlap with yours. Lists the community's newest log entries
//    (instance/log/, one file per entry).
// 3. Checks the live portal: is it running code that's on GitHub, and is it newer than yours?
// It never fails: it only reports. Deploys are guarded separately (scripts/deploy-check.mjs).
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT, compareVersions, git, inHistory, liveState, localVersion, repoState } from './git-state.mjs'

const lines = []
const say = (s = '') => lines.push(s)
const warn = s => lines.push(`⚠️  ${s}`)

const state = repoState()
say(`MyCoNet start-of-work check (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`)

// ── 1. Up to date with GitHub ────────────────────────────────────────────────
if (state.behind > 0) {
  if (state.current === state.branch && state.dirty.length === 0 && state.ahead === 0) {
    const before = git('rev-parse HEAD')
    git(`pull --ff-only --quiet origin ${state.branch}`, { allowFail: true })
    say(`✓ Pulled ${state.behind} new commit(s) from origin/${state.branch}:`)
    say(git(`log -15 --format="    %h %an, %ar: %s" ${before}..HEAD`, { allowFail: true }) ?? '')
  } else {
    warn(`origin/${state.branch} has ${state.behind} commit(s) you don't have. Before changing anything: commit or stash your work, then \`git pull --rebase origin ${state.branch}\`.`)
    say(git(`log -15 --format="    %h %an, %ar: %s" HEAD..origin/${state.branch}`, { allowFail: true }) ?? '')
  }
} else {
  say(`✓ Up to date with origin/${state.branch}.`)
}
if (state.ahead > 0) warn(`${state.ahead} local commit(s) not pushed yet. Push them (or open a PR) so others build on them.`)
if (state.current !== state.branch) say(`  You're on branch ${state.current} (the main branch is ${state.branch}).`)
const version = localVersion()
if (state.hasUpstream && state.newestCoreTag && version && compareVersions(state.newestCoreTag, version) > 0) {
  warn(`MyCoNet core ${state.newestCoreTag} is out (this repo has ${version}). Merge the open "Update MyCoNet core" PR before building on old core code.`)
}

// ── 2. What others are doing ─────────────────────────────────────────────────
say()
say('Recent changes on GitHub (last 3 days):')
say(git(`log origin/${state.branch} --since="3 days ago" --format="  %h %an, %ar: %s" -15`, { allowFail: true }) || '  (none)')

// The community's own log: one file per entry in instance/log/ (instance/log.md is the older archive)
const logDir = resolve(ROOT, 'instance/log')
if (existsSync(logDir)) {
  const entries = readdirSync(logDir).filter(f => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(f)).sort().reverse().slice(0, 5)
  say()
  say(`This community's newest log entries (instance/log/; older ones in instance/log.md):`)
  for (const f of entries) {
    const first = readFileSync(resolve(logDir, f), 'utf8').split('\n').find(l => l.trim()) ?? ''
    say(`  ${first.replace(/^#+\s*/, '') || f}`)
  }
  if (!entries.length) say('  (none yet)')
}

const myFiles = new Set(state.dirty.map(l => l.slice(3).trim()))
const others = []
try {
  const prs = JSON.parse(execSync('gh pr list --state open --json number,title,author,headRefName,updatedAt,files --limit 30', { stdio: ['ignore', 'pipe', 'ignore'] }).toString())
  for (const pr of prs) {
    if (pr.headRefName.startsWith('core-update/')) continue
    others.push({ what: `PR #${pr.number} "${pr.title}" by ${pr.author?.login ?? '?'} (updated ${pr.updatedAt.slice(0, 10)})`, files: (pr.files ?? []).map(f => f.path) })
  }
} catch { say('  (Install and sign in to the GitHub CLI, `gh`, to also see open pull requests.)') }
const branches = (git(`for-each-ref --sort=-committerdate --format="%(refname:short)|%(committerdate:relative)|%(authorname)|%(committerdate:unix)" refs/remotes/origin`, { allowFail: true }) ?? '')
  .split('\n').filter(Boolean).map(l => l.split('|'))
  .filter(([ref, , , ts]) => !/\/(HEAD|main|master)$/.test(ref) && !ref.includes('core-update/') && Date.now() / 1000 - Number(ts) < 3 * 86400)
for (const [ref, when, who] of branches) {
  const files = (git(`diff --name-only origin/${state.branch}...${ref}`, { allowFail: true }) ?? '').split('\n').filter(Boolean)
  others.push({ what: `branch ${ref.replace(/^origin\//, '')} by ${who} (${when})`, files })
}
say()
if (others.length) {
  say('Others working right now:')
  for (const o of others) {
    const overlap = o.files.filter(f => myFiles.has(f))
    say(`  • ${o.what}${o.files.length ? `: ${o.files.length} file(s)` : ''}`)
    if (overlap.length) warn(`  it changes files you're also changing: ${overlap.join(', ')}. Talk to them before going on.`)
  }
} else {
  say('No one else has open PRs or fresh branches.')
}

// ── 3. The live portal ───────────────────────────────────────────────────────
const live = await liveState()
if (live) {
  say()
  if (live.unreachable || !live.version) {
    warn(`Couldn't read the live version at ${live.appUrl}.`)
  } else {
    say(`Live: ${live.appUrl} runs ${live.version}${live.sha ? ` (commit ${live.sha.slice(0, 7)})` : ''}; this checkout has ${version}.`)
    if (live.sha && inHistory(live.sha) === false) {
      warn(`The live site runs commit ${live.sha.slice(0, 7)}, which isn't in this code: someone deployed work that isn't on GitHub. Find out whose it is and get it pushed before you deploy, or it will be lost.`)
    }
    if (version && compareVersions(live.version, version) > 0) warn(`The live site (${live.version}) is newer than this checkout (${version}). Pull before working.`)
    if (version && compareVersions(live.version, version) < 0) say(`  (The live site is behind this checkout: ${live.version} → ${version} goes out with the next deploy.)`)
  }
}

say()
say('Rules: AGENTS.md. Deploy only with `npm run deploy` (it refuses to deploy stale or unpushed code).')
console.log(lines.join('\n'))

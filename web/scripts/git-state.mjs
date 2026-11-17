// Shared by start-work.mjs and deploy-check.mjs: where this checkout stands against GitHub and
// against what's live. Read-only except `git fetch`.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const ROOT = resolve(WEB, '..')

export function git(args, opts = {}) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString().trimEnd()
  } catch (e) {
    if (opts.allowFail) return null
    throw e
  }
}

export function localVersion() {
  const src = readFileSync(resolve(WEB, 'src/core/lib/version.ts'), 'utf8')
  return src.match(/VERSION = '(v[\d.]+)'/)?.[1] ?? null
}

/** -1, 0, 1 for "v4.18.1"-style versions */
export function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number), pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0) ? -1 : 1
  return 0
}

export function defaultBranch() {
  const head = git('symbolic-ref --short refs/remotes/origin/HEAD', { allowFail: true })
  if (head) return head.replace(/^origin\//, '')
  return git('rev-parse --verify --quiet origin/main', { allowFail: true }) ? 'main' : 'master'
}

/** Fetches origin (and upstream if there is one) and says how this checkout compares */
export function repoState() {
  git('fetch --quiet origin', { allowFail: true })
  const hasUpstream = (git('remote', { allowFail: true }) ?? '').split('\n').includes('upstream')
  if (hasUpstream) git('fetch --quiet --tags upstream', { allowFail: true })
  const branch = defaultBranch()
  const current = git('rev-parse --abbrev-ref HEAD')
  const counts = git(`rev-list --left-right --count HEAD...origin/${branch}`, { allowFail: true }) ?? '0\t0'
  const [ahead, behind] = counts.split(/\s+/).map(Number)
  const dirty = (git('status --porcelain', { allowFail: true }) ?? '').split('\n').filter(Boolean)
  const newestCoreTag = hasUpstream
    ? (git('tag --list "v*" --sort=-v:refname', { allowFail: true }) ?? '').split('\n')[0] || null
    : null
  return { branch, current, ahead, behind, dirty, hasUpstream, newestCoreTag }
}

/** The live portal's version and commit, from instance/config.jsonc's appUrl (null in the core repo) */
export async function liveState() {
  let appUrl = null
  try {
    const { loadInstance } = await import('./instance.mjs')
    appUrl = loadInstance().appUrl
  } catch { return null }
  try {
    const res = await fetch(`${appUrl}/api/version`, { signal: AbortSignal.timeout(10_000) })
    if (res.ok) return { appUrl, ...(await res.json()) }
  } catch { /* fall through */ }
  // Older builds have no /api/version: read the version off the changelog page
  try {
    const html = await (await fetch(`${appUrl}/changelog`, { signal: AbortSignal.timeout(10_000) })).text()
    return { appUrl, version: html.match(/v\d+\.\d+\.\d+/)?.[0] ?? null, sha: null }
  } catch {
    return { appUrl, version: null, sha: null, unreachable: true }
  }
}

/** Is commit `sha` part of this checkout's history? */
export function inHistory(sha) {
  if (!sha) return null
  // Unknown commit (never pushed anywhere we fetched) or not an ancestor: both mean "not in this code"
  if (git(`cat-file -e ${sha}^{commit}`, { allowFail: true }) === null) return false
  return git(`merge-base --is-ancestor ${sha} HEAD`, { allowFail: true }) !== null
}

#!/usr/bin/env node
// The release queue: ships one core pull request, start to finish, one release at a time.
// Maintainers only (it merges into core). From a community repo or a core clone:
//
//   cd web && npm run ship -- <core PR number>
//
//   1. waits for the lock (/tmp/myconet-ship.lock), so two releases never run at once on this machine
//   2. merges the newest core main into the PR's branch; a real code conflict stops it, files named
//   3. runs the release (scripts/release.mjs): the next free version, from the PR's changes/ note
//   4. runs lint and the type check on the result
//   5. pushes the release commit, waits for the PR's checks, squash-merges and tags core
//   6. in a community repo: runs the Core update workflow, merges its PR (never one that touches
//      instance/), pulls the main checkout, stops if core added migrations since the community's
//      last update (apply them, then resume), deploys, checks the live version, writes the log entry
//
//   --dry-run              steps 2 to 4 in a throwaway worktree; pushes, merges and deploys nothing
//   --skip-checks          with --dry-run: skip lint and the type check
//   --no-deploy            stop after the community's update PR is merged
//   --core-only            stop after tagging core
//   --community <version>  only step 6, for a version already tagged (after a stop in step 6)
//   --migrations-applied   the migrations step 6 stopped for are applied: deploy
//
// The deploy command is `npm run deploy` in the main checkout's web/. To deploy another way (a wrapper
// that loads the right Cloudflare token), set MYCONET_DEPLOY_CMD to that command.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { hostname, tmpdir, userInfo } from 'node:os'
import { join, resolve } from 'node:path'
import { CORE_REPO, RELEASE_FILES, editedByHand, plan, write } from './release.mjs'
import { ROOT, WEB, defaultBranch, liveState } from './git-state.mjs'

const CORE_URL = `https://github.com/${CORE_REPO}.git`
const LOCK = '/tmp/myconet-ship.lock'
const args = process.argv.slice(2)
const flag = name => args.includes(name)
const DRY = flag('--dry-run')
const onlyCommunity = args.includes('--community') ? args[args.indexOf('--community') + 1] : null
const pr = args.find(a => /^\d+$/.test(a))

const MIGRATIONS_OK = flag('--migrations-applied')
const sleep = s => new Promise(r => setTimeout(r, s * 1000))
const say = s => console.log(s)
const step = s => console.log(`\n▸ ${s}`)
let cleanup = () => {}
function stop(message, code = 1) {
  console.error(`\n✖ Ship stopped: ${message}\n`)
  process.exit(code)
}
/** Runs a command; returns trimmed stdout, or null when it fails and `allowFail` is set. */
function run(cmd, cmdArgs, { cwd = ROOT, allowFail = false, show = false } = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: show ? 'inherit' : ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) {
    if (allowFail) return null
    stop(`${cmd} ${cmdArgs.join(' ')}\n${(r.stderr || r.stdout || '').trim()}`)
  }
  return (r.stdout || '').trim()
}
const git = (a, o) => run('git', a, o)
const gh = (a, o) => run('gh', a, o)

if (!pr && !onlyCommunity) {
  console.error('Usage: npm run ship -- <core PR number> [--dry-run] [--no-deploy] [--core-only]\n       npm run ship -- --community <version> [--migrations-applied]')
  process.exit(1)
}

// ── Where we are: a community repo (origin is the community, core is `upstream`) or a core clone ──
const originUrl = git(['remote', 'get-url', 'origin'], { allowFail: true }) ?? ''
const slug = url => url.match(/github\.com[:/]([^/]+\/[^/.]+?)(\.git)?$/)?.[1] ?? null
const community = existsSync(join(ROOT, 'instance/config.jsonc')) && slug(originUrl)?.toLowerCase() !== CORE_REPO.toLowerCase() ? slug(originUrl) : null
const mainCheckout = git(['worktree', 'list', '--porcelain']).split('\n')[0].replace(/^worktree /, '')
const deployCmd = process.env.MYCONET_DEPLOY_CMD || 'npm run deploy'

// ── The lock: one release at a time. Same folder and protocol as the older myconet-ship script ──
let locked = false
async function takeLock(owner) {
  for (;;) {
    try { mkdirSync(LOCK); break } catch { /* someone has it */ }
    const who = (() => { try { return readFileSync(join(LOCK, 'owner'), 'utf8').trim() } catch { return 'starting' } })()
    const m = who.match(/pid (\d+) on (\S+)/)
    const dead = m && m[2] === hostname() && spawnSync('kill', ['-0', m[1]]).status !== 0
    if (dead) { say(`  The lock was left by a release that's no longer running (${who}); taking it over.`); rmSync(LOCK, { recursive: true, force: true }); continue }
    say(`  Waiting for another release to finish (${who})…`)
    await sleep(30)
  }
  locked = true
  writeFileSync(join(LOCK, 'owner'), `${owner}, pid ${process.pid} on ${hostname()} (${userInfo().username})\n`)
}
process.on('exit', () => { cleanup(); if (locked) rmSync(LOCK, { recursive: true, force: true }) })
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130))

// ── Steps 2 to 5: the core release ───────────────────────────────────────────────────────────────
async function shipCore() {
  const info = JSON.parse(gh(['pr', 'view', pr, '-R', CORE_REPO, '--json', 'number,title,headRefName,isCrossRepository,state,isDraft']))
  if (info.state !== 'OPEN') stop(`core PR #${pr} is ${info.state.toLowerCase()}.`)
  if (info.isDraft) stop(`core PR #${pr} is a draft. Mark it ready for review first.`)
  if (info.isCrossRepository) stop(`core PR #${pr} comes from a fork: ship can only push the release to a branch of ${CORE_REPO}.`)
  const head = info.headRefName
  say(`Shipping core PR #${pr} "${info.title}" (branch ${head})${DRY ? ', dry run' : ''}`)

  step(DRY ? `Lock: a real run waits here for ${LOCK} (not taken in a dry run)` : `Taking the lock (${LOCK})`)
  if (!DRY) await takeLock(`PR ${pr}`)

  const wt = mkdtempSync(join(tmpdir(), 'myconet-ship-'))
  cleanup = () => { spawnSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT }); rmSync(wt, { recursive: true, force: true }) }
  let before = null   // the PR's branch on GitHub, before our release commit
  let pushed = null   // what we pushed there

  for (let attempt = 1; ; attempt++) {
    step('Merging the newest core main into the PR')
    git(['fetch', '--quiet', CORE_URL, '+refs/heads/main:refs/ship/main', `+refs/heads/${head}:refs/ship/pr`])
    before ??= git(['rev-parse', 'refs/ship/pr'])
    if (attempt === 1) git(['worktree', 'add', '--quiet', '--detach', wt, before])
    else git(['reset', '--quiet', '--hard', before], { cwd: wt })
    const hand = editedByHand('refs/ship/main...HEAD', wt)
    if (hand.length) {
      stop(`PR #${pr} sets its own version: it edits ${hand.join(', ')}.\n` +
        `  On branch ${head}: take those files back from main (git checkout origin/main -- ${hand.join(' ')}),\n` +
        '  put the text in changes/<slug>.md (changes/README.md), push, and run ship again.')
    }
    if (spawnSync('git', ['merge', '--no-edit', '--quiet', 'refs/ship/main'], { cwd: wt }).status !== 0) {
      const files = git(['diff', '--name-only', '--diff-filter=U'], { cwd: wt }).split('\n').filter(Boolean)
      stop(`core main and PR #${pr} changed the same lines. Nothing was pushed or merged.\n` +
        files.map(f => `    ${f}`).join('\n') +
        `\n  Someone has to decide which lines win: on branch ${head}, \`git merge origin/main\`, resolve those files,\n` +
        '  push, and run ship again.', 3)
    }
    say(`  ✓ ${git(['rev-parse', '--short', 'refs/ship/main'], { cwd: wt })} (core main) merges cleanly.`)

    step('Giving the release its version (scripts/release.mjs)')
    let p
    try { p = plan(wt) } catch (e) { stop(e.message) }
    if (!p) stop(`PR #${pr} has no note in changes/, so there's nothing to release. Add changes/<slug>.md (changes/README.md) and push.`)
    write(p, wt)
    say(`  ✓ ${p.version} (${p.bump}; the newest taken version is ${p.newest}): "${p.title}"`)
    say(`    from ${p.notes.map(n => `changes/${n.file}`).join(', ')}; wrote ${RELEASE_FILES.join(', ')}`)

    if (attempt === 1 && !(DRY && flag('--skip-checks'))) {
      step('Lint and type check on the result')
      const modules = [join(WEB, 'node_modules'), join(mainCheckout, 'web/node_modules')].find(existsSync)
      if (modules) symlinkSync(modules, join(wt, 'web/node_modules'))
      else { say('  No node_modules here: installing (npm ci)…'); run('npm', ['ci', '--silent'], { cwd: join(wt, 'web') }) }
      for (const [name, cmd] of [['lint', ['run', '--silent', 'lint']], ['tsc', ['exec', '--', 'tsc', '--noEmit']]]) {
        const r = spawnSync('npm', cmd, { cwd: join(wt, 'web'), encoding: 'utf8' })
        if (r.status !== 0) stop(`${name} fails on PR #${pr} merged with core main. Nothing was pushed or merged.\n${(r.stdout + r.stderr).trim().split('\n').slice(-30).join('\n')}`)
        say(`  ✓ ${name}`)
      }
      if (modules) rmSync(join(wt, 'web/node_modules'))
    }

    if (DRY) {
      step('Dry run: stopping here. A real run would now')
      say(`  • commit "Release ${p.version}" and push it to ${CORE_REPO}:${head}`)
      say(`  • retitle the PR "${p.version}: ${p.title}", wait for its checks, squash-merge it and tag ${p.version}`)
      if (community && !flag('--core-only')) {
        say(`  • run the Core update workflow on ${community} and merge its "Update MyCoNet core to ${p.version}" PR (unless it touches instance/)`)
        if (!flag('--no-deploy')) {
          say(`  • stop before deploying if core added migrations (supabase/migrations/) since ${community}'s current core version`)
          say(`  • pull ${mainCheckout} and deploy with: ${deployCmd}`)
          say(`  • check the live version is ${p.version}, then write and push instance/log/${p.date}-core-${p.version.replace(/\./g, '-')}.md`)
        }
      }
      say('Nothing was pushed, merged, tagged or deployed.')
      return null
    }

    step(`Pushing the release commit to ${head}`)
    git(['add', '-A'], { cwd: wt })
    git(['commit', '--quiet', '-m', `Release ${p.version}: ${p.title}`], { cwd: wt })
    const sha = git(['rev-parse', 'HEAD'], { cwd: wt })
    // The lease: only over what we saw there (the PR as it was, or our own earlier release commit)
    git(['push', '--quiet', `--force-with-lease=refs/heads/${head}:${pushed ?? before}`, CORE_URL, `HEAD:refs/heads/${head}`], { cwd: wt })
    pushed = sha
    gh(['pr', 'edit', pr, '-R', CORE_REPO, '--title', `${p.version}: ${p.title}`])

    step('Waiting for the PR\'s checks')
    await sleep(20)
    for (let i = 0; ; i++) {
      const checks = JSON.parse(gh(['pr', 'checks', pr, '-R', CORE_REPO, '--json', 'name,bucket'], { allowFail: true }) || '[]')
      const failed = checks.filter(c => ['fail', 'cancel'].includes(c.bucket))
      if (failed.length) stop(`checks failed on PR #${pr}: ${failed.map(c => c.name).join(', ')}. The release commit is on the branch; nothing was merged.\n  Fix the branch, then: git push, and run ship again (it redoes the release).`)
      if (checks.length ? checks.every(c => ['pass', 'skipping'].includes(c.bucket)) : i >= 4) break
      if (i >= 80) stop(`the checks on PR #${pr} are still running after 20 minutes. Nothing was merged.`)
      await sleep(15)
    }
    say('  ✓ checks passed')

    step(`Merging and tagging ${p.version}`)
    const taken = gh(['api', `repos/${CORE_REPO}/git/refs/tags/${p.version}`], { allowFail: true }) !== null
    const merged = !taken && gh(['pr', 'merge', pr, '-R', CORE_REPO, '--squash', '--subject', `${p.version}: ${p.title} (#${pr})`], { allowFail: true }) !== null
    if (!merged) {
      // Someone on another machine released in between: core main moved, or took this version
      if (attempt >= 3) stop(`core main kept moving while PR #${pr} was being released (3 tries). Nothing was merged. Run ship again.`)
      say(`  Core main moved while the checks ran${taken ? ` and ${p.version} is taken` : ''}: redoing the release on the new main.`)
      continue
    }
    const mergeSha = JSON.parse(gh(['pr', 'view', pr, '-R', CORE_REPO, '--json', 'mergeCommit'])).mergeCommit.oid
    gh(['api', '-X', 'POST', `repos/${CORE_REPO}/git/refs`, '-f', `ref=refs/tags/${p.version}`, '-f', `sha=${mergeSha}`])
    say(`  ✓ Core PR #${pr} merged (${mergeSha.slice(0, 7)}) and tagged ${p.version}`)
    return p
  }
}

// ── Step 6: the community takes the release and deploys it ───────────────────────────────────────
async function shipCommunity(version, title) {
  step(`Updating ${community} to core ${version}`)
  const main = defaultBranch()
  const resume = `npm run ship -- --community ${version}`
  const found = state => JSON.parse(gh(['pr', 'list', '-R', community, '--state', state, '--head', `core-update/${version}`, '--json', 'number,files,mergeCommit']))[0]
  // The core tags, to tell which core version the community had before this update
  git(['fetch', '--quiet', '--tags', CORE_URL], { allowFail: true })
  git(['fetch', '--quiet', 'origin', main])
  const coreTagOf = rev => git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', rev], { allowFail: true })
  // A resumed run: the update PR was merged by an earlier run that stopped before deploying
  let update = found('merged')
  let from
  if (update) {
    from = coreTagOf(`${update.mergeCommit.oid}^1`)
    say(`  ✓ Update PR #${update.number} is already merged`)
  } else {
    update = found('open')
    if (!update) {
      gh(['workflow', 'run', 'core-update.yml', '-R', community])
      for (let i = 0; i < 40 && !update; i++) { await sleep(15); update = found('open') }
    }
    if (!update) stop(`core ${version} is released, but no "Update MyCoNet core to ${version}" PR appeared on ${community} after 10 minutes.\n  Look at the Core update workflow's last run: it prints why it stopped (a core file changed in this repo, or the push was refused). Then: ${resume}`)
    const own = update.files.map(f => f.path).filter(f => f.startsWith('instance/'))
    if (own.length) stop(`update PR #${update.number} on ${community} touches instance/ (${own.join(', ')}), which a core update never should. Not merged.\n  Check it by hand, then: ${resume}`)
    from = coreTagOf(`origin/${main}`)
    gh(['pr', 'merge', String(update.number), '-R', community, '--merge'])
    say(`  ✓ Update PR #${update.number} merged (${from ?? 'unknown core version'} → ${version})`)
  }
  if (flag('--no-deploy')) { say('  --no-deploy: not deploying.'); return }

  // Every core migration between the community's last core version and this one, not only this release's:
  // a community that skips releases (v4.88.0 → v4.103.0) needs the ones in between too
  step('Checking for new migrations')
  const migrations = from
    ? git(['diff', '--name-only', '--diff-filter=d', from, version, '--', 'supabase/migrations/*.sql']).split('\n').filter(Boolean)
    : null
  if (!MIGRATIONS_OK) {
    if (!migrations) stop(`couldn't tell which core version ${community} had before ${version}, so ship can't list the migrations it needs. Core ${version} is merged but not deployed.\n  Compare supabase/migrations/ with what the database has (npm run migrations:check), apply what's missing, then: ${resume} --migrations-applied`)
    if (migrations.length) stop(`core ${from} → ${version} adds ${migrations.length} migration${migrations.length === 1 ? '' : 's'}. Core ${version} is merged on ${community} but not deployed:\n` +
      migrations.map(f => `    ${f}`).join('\n') +
      `\n  Apply them to ${community}'s database first (cd web && npm run migrations:check, then supabase db push or the Supabase MCP),\n  then: ${resume} --migrations-applied`)
    say(`  ✓ none since ${from}`)
  } else say(`  ✓ --migrations-applied: ${migrations?.length ? migrations.map(f => f.replace(/^supabase\/migrations\//, '')).join(', ') : 'none to apply'}`)

  step(`Deploying from ${mainCheckout}`)
  const at = { cwd: mainCheckout }
  if (git(['rev-parse', '--abbrev-ref', 'HEAD'], at) !== main) stop(`${mainCheckout} isn't on ${main}. Core ${version} is merged but not deployed.\n  Switch it to ${main}, then: ${resume}`)
  if (git(['status', '--porcelain'], at)) stop(`${mainCheckout} has uncommitted changes. Core ${version} is merged but not deployed.\n  Commit or remove them, then: ${resume}`)
  git(['pull', '--ff-only', '--quiet', 'origin', main], at)
  const sha = git(['rev-parse', '--short=8', 'HEAD'], at)
  const deployed = spawnSync(deployCmd, { cwd: join(mainCheckout, 'web'), shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (deployed.status !== 0) stop(`the deploy failed (${deployCmd}). Core ${version} is merged on ${community} but not live.\n${(deployed.stdout + deployed.stderr).trim().split('\n').slice(-15).join('\n')}\n  Fix it, then deploy from ${mainCheckout}/web and write the log entry (instance/log/).`)
  let live = null
  for (let i = 0; i < 12; i++) {
    live = await liveState()
    if (live?.version === version) break
    await sleep(10)
  }
  if (live?.version !== version) stop(`the deploy finished, but ${live?.appUrl ?? 'the live site'} still says ${live?.version ?? 'nothing'}, not ${version}. Check it and write the log entry (instance/log/) by hand.`)
  say(`  ✓ Live: ${live.appUrl} runs ${version}`)

  step('Writing the log entry')
  const date = new Date().toISOString().slice(0, 10)
  const rel = `instance/log/${date}-core-${version.replace(/\./g, '-')}.md`
  const migrationLine = migrations?.length
    ? `Migrations, applied before the deploy: ${migrations.map(f => `\`${f.replace(/^supabase\/migrations\//, '')}\``).join(', ')}.`
    : migrations ? 'No migration.' : 'Migrations: checked by hand before the deploy (--migrations-applied).'
  mkdirSync(join(mainCheckout, 'instance/log'), { recursive: true })
  writeFileSync(join(mainCheckout, rel), `# ${date} — Core ${version} via update PR #${update.number} (deployed, ${sha})${title ? `: ${title}` : ''}\n` +
    `- Shipped with \`npm run ship\` by ${userInfo().username}, from core ${from ?? '(unknown)'}. ${migrationLine}\n`)
  git(['add', rel], at)
  git(['commit', '--quiet', '-m', `log: core ${version} deployed`], at)
  if (git(['push', '--quiet', 'origin', main], { ...at, allowFail: true }) === null) say(`  ⚠️  Couldn't push the log entry (${rel}): pull and push ${main} in ${mainCheckout}.`)
  else say(`  ✓ ${rel}`)
}

if (onlyCommunity) {
  if (!community) stop('this isn\'t a community repo (no instance/config.jsonc, or origin is core).')
  if (!/^v\d+\.\d+\.\d+$/.test(onlyCommunity)) stop('--community takes a version, like v4.82.0.')
  await takeLock(`community ${onlyCommunity}`)
  await shipCommunity(onlyCommunity, '')
} else {
  const p = await shipCore()
  if (p && community && !flag('--core-only')) await shipCommunity(p.version, p.title)
  else if (p) say(community ? '\n--core-only: the community update and deploy are left to you.' : '\nThis is a core clone: each community takes the release with its own Core update.')
}
say(DRY ? '' : '\n✓ Done.')

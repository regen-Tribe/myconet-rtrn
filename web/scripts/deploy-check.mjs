// Runs first in `npm run deploy` / `upload` / `deploy:cf`. Refuses to deploy unless what goes live
// is exactly what's on GitHub and nothing newer is already live, so one person's deploy can't
// wipe out another's work. Override (rarely, and say why): MYCONET_DEPLOY_FORCE=1 npm run deploy
import { compareVersions, inHistory, liveState, localVersion, repoState } from './git-state.mjs'
import { checkMigrationFiles } from './migration-check.mjs'

const problems = []
const state = repoState()
// Files the build generates are fine; anything else uncommitted would go live without being on GitHub
const dirty = state.dirty.filter(l => !/(web\/wrangler\.jsonc|\.env\.production\.local|cloudflare-env\.d\.ts)$/.test(l))

if (state.current !== state.branch) problems.push(`You're on branch "${state.current}". Deploy from ${state.branch} (merge your work first).`)
if (dirty.length) problems.push(`Uncommitted changes would go live without being on GitHub:\n${dirty.map(l => `      ${l}`).join('\n')}\n    Commit and push them first.`)
if (state.behind > 0) problems.push(`origin/${state.branch} has ${state.behind} commit(s) you don't have: \`git pull --rebase origin ${state.branch}\`, then deploy.`)
if (state.ahead > 0) problems.push(`${state.ahead} commit(s) aren't pushed: \`git push origin ${state.branch}\` first, so GitHub matches what goes live.`)

// Core and community migration numbers must never meet (scripts/migration-check.mjs, v4.111.0)
const mig = checkMigrationFiles()
problems.push(...mig.errors.map(e => `Migration numbers: ${e}`))
for (const w of mig.warnings) console.log(`  · Migration numbers: ${w}`)

const version = localVersion()
const live = await liveState()
if (live && !live.unreachable && live.version) {
  if (live.sha && inHistory(live.sha) === false) {
    problems.push(`The live site runs commit ${live.sha.slice(0, 7)}, which isn't in your code: someone deployed work that isn't on GitHub. Get it pushed and pull it, or it's lost when you deploy.`)
  }
  if (version && compareVersions(live.version, version) > 0) {
    problems.push(`The live site is ${live.version}, newer than your ${version}. Deploying would roll it back. Pull first.`)
  }
}

if (problems.length) {
  console.error(`\n✖ Deploy stopped:\n${problems.map(p => `  • ${p}`).join('\n')}\n`)
  if (process.env.MYCONET_DEPLOY_FORCE === '1') {
    console.error('MYCONET_DEPLOY_FORCE=1: deploying anyway. Note why in a new instance/log/ entry.\n')
  } else {
    process.exit(1)
  }
} else {
  console.log(`✓ Deploy check: ${state.branch} matches GitHub${live?.version ? `; live ${live.version} → ${version}` : ''}.`)
}

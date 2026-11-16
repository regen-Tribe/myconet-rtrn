# AGENTS.md

Instructions for AI coding agents (Codex, Cursor, Claude Code, Copilot and others).
The full project context is in [`CLAUDE.md`](./CLAUDE.md); read it first.

## Rules

- **Check what changed before you start.** Pull, then look at what others did since the person
  you're working for last worked here: `git log --since=<date> --stat` in this repo; in a
  community repo also `git fetch upstream --tags && git log upstream/main -10` for core, and the
  top of `instance/log.md` and `instance/LOCAL-CHANGES.md`. Tell them about anything surprising
  (core files changed in a community repo, an unexpected migration, a change nobody logged).
- **Ask where each change belongs before writing code:** *"Should this go to MyCoNet core too
  (every community), or only <this community>?"*
  - **Core too:** change the core files on a branch and send them with `cd web && npm run upstream`
    (opens a PR on `regen-Tribe/myconet`). It reaches each community with the next core release.
  - **Only this community:** put it in `instance/` (config, theme, seed, `instance/migrations/`,
    docs) and log it in `instance/LOCAL-CHANGES.md`: date, who, what, why, files. If it can only
    be done by editing core files, say so before doing it. Prefer adding it to core behind a
    config switch that's off for other communities. A local edit to a core file is an exception:
    only with the person's explicit OK, logged in `instance/LOCAL-CHANGES.md` as **core exception**
    with the files, and the Core drift check fails until it's moved into core or undone.
- **Who pushes directly.** The maintainers are Oscar (`brucester`) and Sonia (`wensonia`). Working
  for one of them, commit and push a checked change (`cd web && npm run lint && npx tsc --noEmit`)
  straight to the community repo's `main` / `master`, and they may merge core PRs themselves.
  Anyone else: a branch (`<person>/<short-description>`) and a pull request (`gh pr create --fill`),
  then stop.
- **Don't deploy (`npm run deploy`) or apply migrations to a live database** unless the person
  you're working for explicitly asks you to in this session.
- **In a community repo, only `instance/` is that community's.** Everything else is MyCoNet core.
  Read `instance/CONTRIBUTING.md` if it exists.
- **Local dev uses the community's live database**: use test accounts and clean up test data.
- Never commit secrets (keys, tokens, passwords, `.env*` files) or real members' personal data.

## Checks before opening a PR

The `verify` skill in `skills-src/verify` is this checklist. Skills are authored in
`skills-src/` and copied into `.agents/skills`, `.claude/skills`, and `.cursor/skills`
by the sync script. Edit the source, then sync.

```sh
cd web && npm run lint && npx tsc --noEmit
node scripts/sync-skills.mjs --check
```

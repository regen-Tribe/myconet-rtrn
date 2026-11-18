# AGENTS.md

Instructions for AI coding agents (Codex, Cursor, Claude Code, Copilot and others).
The full project context is in [`CLAUDE.md`](./CLAUDE.md); read it first.

## Design goal: the community's second brain (every change passes this filter)

MyCoNet helps the community **keep its second brain organized and up to date** with what comes in from
**meetings** and from **people using the platform** (projects, tasks, agreements, decisions, governance,
Blueprint, members and circles). The second brain is part of what MyCoNet offers: the community works
with it **through MyCoNet or any agent tool** (Claude, ChatGPT, Cursor, Obsidian…), so it must stay
readable and well organized on its own, not only inside the portal. Before designing or changing
anything, answer these questions and say the answers in the PR:

1. **What knowledge does this change create or change?** (A decision, a task, a project, an agreement, a
   person's role, an event, a document.)
2. **Where does it land in the second brain?** The right folder, with front matter (circle(s),
   visibility, source, a link back to the portal) and links to related notes. If it doesn't land
   there yet, say why and add it to the plan as a follow-up.
3. **Does it stay current?** Update the existing note in place, never add a near-duplicate. When
   something is renamed, finished or archived, the note says so.
4. **Who may read it?** `visibility: members | circle`, as in the portal. Meeting transcripts only in
   their own file beside the note (leads-only in the assistant's library); never private messages or
   personal data.
5. **Can people see and undo what the agent did?** Every write is logged (`agent_actions`) and can be
   reverted (it's git).

Today only meetings are written (`web/src/modules/m18-meetings/lib/second-brain.ts`, the community's
`knowledge.meetingsFolder`: a note per meeting and its transcript). Each new feature should move the rest
of the platform toward the same, and toward agents reaching it through MyCoNet with the same permissions.

---

## Work log discipline (every change ends here)

**Any change, PR, push, release or deploy ends with the work logs updated, the same day.** A merge or deploy
that no log mentions looks like it never happened: the log is the handoff to whoever works next.

- **In this repo:** a core release goes in `CHANGELOG.md` (and `web/src/app/changelog/page.tsx`); a community's
  change, deploy, migration or new secret (names only) in its `instance/log.md`, and a community-only code change
  also in `instance/LOCAL-CHANGES.md`.
- **The team's work log**, if your team keeps one outside the repo (Oscar's team: the agnetO vault,
  `projects/active/myconet/WORKLOG.md` for the detail and the root `WORKLOG.md` as the index): after each working
  session, what changed with its PR number, tag, commit or deploy id; the gotchas; and the open items, each with
  **who it's waiting on**. Refresh the summary at the top when the status changes.
- A decision that matters beyond the session goes into the decisions log too, and, if it's a design rule, into
  this file.
- Never write that something is done unless a log or a live check says so; a half-finished change is logged as
  half-finished, with the blocker named.

---

## Rules

- **Start from the newest code, every session.** First run `cd web && npm run start-work`
  (Claude Code runs it for you when a session opens: `.claude/settings.json`). It pulls the latest
  `main` / `master` when that's safe, lists what others changed in the last 3 days, shows who is
  working right now (open PRs, fresh branches) and warns when their files overlap with yours, and
  checks that the live portal runs code that's on GitHub. Tell the person about every ⚠️ line before
  you change anything. If it says you're behind and couldn't pull, commit or stash, then
  `git pull --rebase`. In a community repo also look at the top of `instance/log.md` and
  `instance/LOCAL-CHANGES.md`, and mention anything surprising (core files changed in a community
  repo, an unexpected migration, a change nobody logged).
- **Someone else is working at the same time?** If start-work shows an open PR or a fresh branch
  touching the files you need, say so and agree who goes first. Keep your own work small and pushed
  often (a branch or PR per change) so others see it. Before you push, `git pull --rebase` again.
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
  you're working for explicitly asks you to in this session. Deploy only with `npm run deploy` from
  an up-to-date, pushed `main` / `master`: its check (`web/scripts/deploy-check.mjs`) refuses to
  deploy uncommitted or unpushed code, a checkout that's behind GitHub, or anything older than
  what's live, so one person's deploy can't wipe out another's. Never deploy from a branch or an old
  clone. `MYCONET_DEPLOY_FORCE=1` skips the check: only with the person's OK, and log why in
  `instance/log.md`. After deploying, add a line to `instance/log.md`.
- **Database changes go in a migration file** (`supabase/migrations/` for core,
  `instance/migrations/` for one community), committed with the code that needs them. Never create
  tables, buckets or policies by hand in the dashboard: the next person can't see or repeat them.
- **New secrets** (`npx wrangler secret put …`): say which in the PR and in `instance/log.md`
  (the name only, never the value).
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

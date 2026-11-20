# MyCoNet v2 — Claude Code Context

Read this first. It gives an AI coding agent (or a fresh contributor) everything needed to work effectively on this project.

---

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

## Rules for AI coding agents (read before changing anything)

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

---

## What this project is

**MyCoNet** is a **member portal for a single regenerative community project**. It is not a multi-community marketplace — it is one community's operating system. All users on the platform are members (or prospective members) of the same project.

New members join **by invitation only** — someone already in the community shares a link. The invite is tracked so the community always knows who brought who in.

### Member role journey

| Role | How they get it | What they can access |
|---|---|---|
| `explorer` | Invited → creates account | `/home` explainer, Blueprint (M04), browse member profiles (M01) |
| `joining` | Completes M05 Join onboarding | Above + can edit profile, propose collaboration on projects, propose new projects |
| `member` | First accepted agreement OR active project (auto-promotion) | Above + vote in Governance (M09), earn contribution points, full Network matching |
| `project_lead` | Assigned by admin | Member access + can manage all aspects of their own projects (drag any of their projects on the Kanban) |
| `circle_lead` | Assigned by admin, plus `lead_circles` set on `/admin/users` | Member access + can manage Blueprint / Join / Agreements + can drag any project in their assigned circles on the Kanban |
| `advisor` | Assigned by admin | Member access + reviews Governance proposals with admins (expert review) |
| `admin` | Assigned directly | Full edit access everywhere |

---

## Deployment

- **Platform:** Cloudflare Workers (NOT Vercel — migrated due to 60s timeout incompatibility with MiniMax M2.7)
- **This community** (live URL, Worker, repo, database, people): `instance/README.md`. Core is `regen-Tribe/myconet`; a community repo only changes `instance/` (see `INSTANCES.md`).
- **Deploy command:** `cd web && npm run deploy`
- **Config:** `instance/config.jsonc` (this community's settings). `web/wrangler.jsonc` and `web/.env.production.local` are **generated** from it by `web/scripts/instance.mjs` before every build/deploy: don't edit them
- **Adapter:** `@opennextjs/cloudflare` v1.19.9 (OpenNext)
- **Current version:** `web/src/core/lib/version.ts` (shown by `AppTopBar` and `LandingClient`)
- **Words:** `LEXICON.md` at the repo root. One term per idea on screens, emails, agent prompts and the second brain; change it there first.
- **Design system:** see `DESIGN-SYSTEM.md` at the repo root. Canonical reference implementation is `web/src/modules/m00-dashboard/DashboardPage.tsx`. All new module pages must match the dashboard's visual language.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.6 (App Router) |
| Database / Auth | Supabase (one project per community; see `instance/README.md`) |
| Hosting | Cloudflare Workers via OpenNext |
| AI model | MiniMax M2.7 (reasoning model) — used in Blueprint doc scanning only |
| Styling | CSS custom properties + inline styles; Tailwind utility classes are used sparingly. Responsive overrides live in `globals.css` |

---

## Repository structure (the part that matters)

```
myconet/
├── web/                              ← The live Next.js app — work here
│   ├── src/
│   │   ├── app/                      ← Thin route entry points (re-exports from modules)
│   │   │   ├── admin/users/page.tsx  ← Admin-only user editor (role + lead_circles)
│   │   │   ├── agreements/           ← /agreements + /agreements/[id]
│   │   │   ├── ops/                  ← /ops + /ops/new + /ops/[id]
│   │   │   ├── home/, dashboard/, blueprint/, join/, contributions/, governance/
│   │   │   ├── profile/edit/, u/[username]/
│   │   │   ├── api/scan/route.ts     ← MiniMax proxy (was /api/claude, renamed 2026-05)
│   │   │   ├── auth/                 ← Magic-link login, signup, callback, reset
│   │   │   ├── layout.tsx            ← Server: fetches role → AppShell
│   │   │   └── globals.css           ← Design system + responsive overrides
│   │   ├── core/                     ← Shared infrastructure imported by modules
│   │   │   ├── components/shell/     ← AppShell, AppTopBar, AppSideNav
│   │   │   ├── components/ui/        ← shadcn/ui primitives
│   │   │   ├── lib/supabase/         ← server.ts + client.ts
│   │   │   ├── lib/roles.ts          ← isFullMember, isCircleAdmin, isOpsAdmin, isAdmin
│   │   │   ├── lib/format.ts         ← fmtDate, formatDeadline, colorForId, initialForName
│   │   │   ├── lib/circles.ts        ← Circles come from the `circles` table (useCircles / loadCircles)
│   │   │   ├── lib/project-status.ts ← Kanban columns + isActiveProject() + isOpenForProposals()
│   │   │   ├── lib/promotions.ts     ← promoteToMemberIfEligible()
│   │   │   └── types/database.ts
│   │   └── modules/                  ← Feature modules — each has README.md
│   │       ├── admin/                ← UsersAdminClient (admin /admin/users page)
│   │       ├── home/, m00-dashboard/, m01-network/, m04-blueprint/
│   │       ├── m05-join/, m06-agreements/, m07-ops/, m08-contributions/, m09-governance/
│   ├── CONTRIBUTING.md               ← How to contribute to one module
│   └── wrangler.jsonc                ← GENERATED from ../instance/config.jsonc
│
├── archive/Modules/                  ← Pre-v2 standalone sources (reference only)
├── DOCS.md                           ← Index of every README in the repo
├── ARCHITECTURE.md, CLAUDE.md, README.md, CHANGELOG.md, EXECUTIVE-SUMMARY.md, …
├── instance/                         ← This community only: config, seed, history (instance/log.md)
```

See `DOCS.md` for the full index of explainer files.

---

## App Shell architecture

Every page (except `/` and `/auth/*`) is wrapped in `AppShell.tsx`:
- **AppTopBar** — logo + version badge + search bar + bell + user pill (→ `/profile/edit`) + profile completion bar
- **AppSideNav** — M00–M09 module links + Admin section (only when `isAdmin(role)`)
- **main** — page content

`ProfileCompletionProvider` wraps the shell. `layout.tsx` fetches the user's role once server-side and passes it down — no client-side role fetch.

---

## M07 Operations — the unified Kanban

This is the largest module. Both the main `/operations` board and each `/operations/[id]` project page render the same five-column model from `@/core/lib/project-status`:

```
Ideas → To do → In progress → Review → Done   (+ Paused on the main board)
```

- **Main board** cards = **projects**. Status drives the column.
- **Project detail** cards = **tasks** for that project (the `deliverables` table; status `backlog` shows as "To do"); the leftmost Ideas column shows pending collaboration proposals (visible to admin / project creator only).
- Drag-and-drop on both surfaces is permission-gated (`canMoveProject` / `canManage`).
- Accepting a proposal — by dragging Ideas → To do or clicking Accept — flips the agreement status to `'accepted'` and spawns a new `deliverables` row with `from_agreement_id` linking back.

See `web/src/modules/m07-ops/README.md` for the full module spec.

---

## AI document scanning — critical config

File: `web/src/app/api/scan/route.ts` (the route was renamed from `/api/claude`).

- **Model:** MiniMax M2.7 (reasoning model — always outputs `<think>...</think>` blocks)
- **`max_completion_tokens: 8192`** — do not raise (524 gateway timeout). Do not lower (JSON truncation).
- **`CHUNK_SIZE = 5000`** chars in `BlueprintClient.tsx` — do not increase
- **`CONCURRENCY = 4`** parallel chunk calls
- **No system message** — adding one makes M2.7 think harder, burning the token budget
- **`temperature: 0.3`**
- **No `export const runtime = 'edge'`** — breaks the OpenNext bundler
- The `extractJSON()` function on the server strips `<think>` blocks before parsing

### Environment variables
- `MINIMAX_API_KEY` — Cloudflare Worker secret via `wrangler secret put MINIMAX_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` — from `instance/config.jsonc` (supabase.url, supabase.anonKey, appUrl); inlined at build time
- Local dev: `.dev.vars` file in `/web` (gitignored)

### Email (auth magic links)
- **Provider:** Resend (configured in Supabase → Authentication → SMTP Settings)
- **From address:** `noreply@tribesplatform.app`
- **Domain verified:** `tribesplatform.app` DNS records via SiteGround DNS Zone Editor
- **SMTP host:** `smtp.resend.com`, port `465`, username `resend`, password = Resend API key

---

## Things NOT to do

- Do NOT add `export const runtime = 'edge'` to any route — breaks OpenNext
- Do NOT raise `max_completion_tokens` above 8192 for MiniMax calls — 524 timeout
- Do NOT increase `CHUNK_SIZE` above ~7000 chars — same timeout
- Do NOT add a system message to MiniMax calls — token budget burn
- Do NOT put secrets in `instance/config.jsonc` — use `wrangler secret put`
- Do NOT use `npm run deploy` — use `npm run deploy:cf`
- Do NOT hard-code role strings (`role === 'admin'`) — use the helpers in `@/core/lib/roles`
- Do NOT hard-code project status strings (`status === 'active'`) — that value no longer exists. Use `isActiveProject()` / `isOpenForProposals()` from `@/core/lib/project-status`.
- Do NOT import from `@/lib/`, `@/components/`, `@/contexts/`, or `@/types/` — those are legacy paths

---

## Common commands

```bash
# Deploy to Cloudflare
cd web && npm run deploy:cf

# Local dev
cd web && npm run dev

# Tail live Cloudflare logs
npx wrangler tail myconet --format=pretty

# Type check
cd web && npx tsc --noEmit
```

---

## Where to find docs

`DOCS.md` at the repo root is the index. The full set:

- **Root** — `README.md`, `EXECUTIVE-SUMMARY.md`, `ARCHITECTURE.md`, `EXECUTION-PLAN.md`, `CHANGELOG.md` (core releases), this file; the community's own history is `instance/log.md`
- **App** — `web/CONTRIBUTING.md`, `web/src/core/README.md`, `web/src/modules/README.md`
- **Modules** — `web/src/modules/mXX-name/README.md` (one per module)

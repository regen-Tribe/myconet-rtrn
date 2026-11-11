# MyCoNet v2 — Claude Code Context

Read this first. It gives an AI coding agent (or a fresh contributor) everything needed to work effectively on this project.

---

## Rules for AI coding agents (read before changing anything)

- **Never commit or push to `main` or `master`.** Create a branch (`<person>/<short-description>`),
  commit there, push it, and open a pull request for review (`gh pr create --fill`). Then stop.
- **Don't merge pull requests, deploy (`npm run deploy`), or apply migrations to a live
  database** unless the person you're working for explicitly asks you to in this session.
- **In a community repo, only `instance/` is that community's.** Other files are MyCoNet core:
  put core changes on a branch and send them with `cd web && npm run upstream`. The Core drift
  check fails a PR that edits core files. Read `instance/CONTRIBUTING.md` if it exists.
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
| `admin` | Assigned directly | Full edit access everywhere |

---

## Deployment

- **Platform:** Cloudflare Workers (NOT Vercel — migrated due to 60s timeout incompatibility with MiniMax M2.7)
- **This community** (live URL, Worker, repo, database, people): `instance/README.md`. Core is `regen-Tribe/myconet`; a community repo only changes `instance/` (see `INSTANCES.md`).
- **Deploy command:** `cd web && npm run deploy`
- **Config:** `instance/config.jsonc` (this community's settings). `web/wrangler.jsonc` and `web/.env.production.local` are **generated** from it by `web/scripts/instance.mjs` before every build/deploy: don't edit them
- **Adapter:** `@opennextjs/cloudflare` v1.19.9 (OpenNext)
- **Current version:** `web/src/core/lib/version.ts` (shown by `AppTopBar` and `LandingClient`)
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

This is the largest module. Both the main `/ops` board and each `/ops/[id]` project page render the same five-column model from `@/core/lib/project-status`:

```
Ideas → Backlog → In progress → Review → Done
```

- **Main board** cards = **projects**. Status drives the column.
- **Project detail** cards = **deliverables** for that project; the leftmost Ideas column shows pending collaboration proposals (visible to admin / project creator only).
- Drag-and-drop on both surfaces is permission-gated (`canMoveProject` / `canManage`).
- Accepting a proposal — by dragging Ideas → Backlog or clicking Accept — flips the agreement status to `'accepted'` and spawns a new `deliverables` row with `from_agreement_id` linking back.

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

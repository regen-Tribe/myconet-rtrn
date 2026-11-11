# MyCoNet

> The community portal for regenerative neighborhoods. Open sourced by The Regen Tribe Collective.

MyCoNet is one community's operating system: members, the Regenerative Neighborhood Framework
Blueprint, joining, agreements, operations, circles, calendar, bookings, contributions and
governance. Each community runs its own copy, with its own database and hosting, from this core.

## Core and communities

| Repo | What |
|---|---|
| [`regen-Tribe/myconet`](https://github.com/regen-Tribe/myconet) | **Core**: the same for every community. Tagged releases (`v4.x.y`). |
| [`regen-Tribe/myconet-rtrn`](https://github.com/regen-Tribe/myconet-rtrn) | RTRN (Regen Hood 0) |
| `protopia-community/myconet-protopia` | Protopia |

A community repo is core plus its own `instance/` folder (settings, seed data, history). It pulls
core releases and changes nothing outside `instance/`. How it works: [`INSTANCES.md`](./INSTANCES.md)
and [`CORE-EXTRACTION.md`](./CORE-EXTRACTION.md). **Starting a new community:**
[`instance.example/README.md`](./instance.example/README.md).

## Working on the code (people and AI coding agents)

**Never commit or push to `main` / `master`.** Every change goes on its own branch and in
a pull request that a maintainer reviews and merges. On a free private repo GitHub can't
enforce this, so it's up to you, and to your coding agent.

1. `git checkout main && git pull`, then `git checkout -b <your-name>/<short-description>`
2. Make the change; check it with `cd web && npm run lint && npx tsc --noEmit` and `npm run dev`
3. Commit, `git push -u origin <branch>`, and open a PR (`gh pr create --fill`) saying what
   changed, how you tested it, and a screenshot for anything visible
4. Stop there. A maintainer merges and deploys; don't merge your own PR, deploy, or run
   migrations against a live database unless a maintainer asks you to

In a **community repo**, change only `instance/` there. Anything else is a core change: build
it on your branch, then send it to core with `cd web && npm run upstream` (the **Core drift
check** fails a PR that edits core files). A community's own notes for contributors are in
its `instance/CONTRIBUTING.md`. Never commit keys, tokens, passwords or `.env*` files.

## The docs

| Document | What it's for |
|---|---|
| [`DOCS.md`](./DOCS.md) | Index of every README and explainer in the repo. |
| `EXECUTIVE-SUMMARY.md` | Platform overview: modules, agents, user journey, service model. |
| `ARCHITECTURE.md` | Implementation blueprint: module specs, schema, agent architecture, deployment. |
| [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) | Visual language: tokens, components, composition rules. |
| `CLAUDE.md`, `AGENTS.md` | Agent / new-engineer context: what's built, how to deploy, what not to do. |
| `INSTANCES.md`, `CORE-EXTRACTION.md` | Running several communities from one core. |
| [`CHANGELOG.md`](./CHANGELOG.md) | Core release notes, from v4.0.0. A community's own history is its `instance/log.md`. |
| `instance/README.md` | This community: live URL, accounts, people. (Not in the core repo.) |
| [`web/CONTRIBUTING.md`](./web/CONTRIBUTING.md) | Contributing to a single module. |

## Modules

| # | Module | Route |
|---|---|---|
| M00 | Dashboard | `/dashboard` |
| M01 | Members (profiles, AI matching) | `/network` |
| M04 | Blueprint (RNF wizard, AI document scan, circles setup) | `/blueprint` |
| M05 | Join | `/join` |
| M06 | Agreements | `/agreements` |
| M07 | Operations (projects, Kanban) | `/ops` |
| M08 | Contributions | `/contributions` |
| M09 | Governance (4-layer voting) | `/governance` |
| M14 | Calendar (events, tasks) | `/events` |
| M15 | Accommodation | `/stays` |
| M16 | Resources (tools, spaces) | `/bookings` |
| M17 | Circles (org chart) | `/org` |

Planned: M10 Genesis bot, M11 Quinn, M12 MycoNet agent, M13 Hive.

## Stack

Next.js 16 (App Router) on Cloudflare Workers (OpenNext) · Supabase (Postgres, Auth, RLS) ·
MiniMax M2.7 for the Blueprint scan. Module code in `web/src/modules/`, shared code in `web/src/core/`,
database in `supabase/migrations/`.

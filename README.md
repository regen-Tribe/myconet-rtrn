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

**Before you start:** pull, and read what changed since you last worked here (`git log --stat`,
core's latest releases, the community's `instance/log.md` and `instance/LOCAL-CHANGES.md`).

**For every change, decide first: core too, or only this community?**

- **Core too** (every community gets it): change core files on a branch, then send them to core
  with `cd web && npm run upstream`. It comes back to each community with the next core release.
- **Only this community:** change only `instance/` and log it in `instance/LOCAL-CHANGES.md`
  (date, who, what, why, files). Something that needs core code but should stay local goes into
  core behind a config switch, or, as a logged **core exception**, is edited locally; the
  **Core drift check** fails until it's resolved.

**Maintainers** (Oscar, Sonia) push checked changes (`cd web && npm run lint && npx tsc --noEmit`)
straight to a community repo's `main` / `master` and can merge core PRs themselves. **Everyone
else:** branch `<your-name>/<short-description>`, open a PR (`gh pr create --fill`) saying what
changed, how you tested it, and a screenshot for anything visible, then stop. Nobody deploys or
runs migrations against a live database without being asked. A community's own notes for
contributors are in its `instance/CONTRIBUTING.md`. Never commit keys, tokens, passwords or `.env*` files.

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
| M01 | Members (profiles, AI matching) | `/members` |
| M04 | Blueprint (RNF wizard, AI document scan, circles setup) | `/blueprint` |
| M05 | Join | `/join` |
| M06 | Agreements | `/agreements` |
| M07 | Operations (projects, Kanban) | `/operations` |
| M08 | Achievements | `/achievements` |
| M09 | Governance (4-layer voting) | `/governance` |
| M14 | Calendar (events, tasks) | `/calendar` |
| M15 | Accommodation | `/accommodation` |
| M16 | Resources (tools, spaces) | `/resources` |
| M17 | Circles (org chart) | `/circles` |

Planned: M10 Genesis bot, M11 Quinn, M12 MycoNet agent, M13 Hive.

## Stack

Next.js 16 (App Router) on Cloudflare Workers (OpenNext) · Supabase (Postgres, Auth, RLS) ·
MiniMax M2.7 for the Blueprint scan. Module code in `web/src/modules/`, shared code in `web/src/core/`,
database in `supabase/migrations/`.

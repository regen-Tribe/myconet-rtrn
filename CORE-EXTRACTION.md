# MyCoNet — Extracting the Core from RTRN

How we turn today's RTRN portal code into **MyCoNet core**, the master codebase that RTRN, Protopia and later communities are built from. How the instances run afterwards is in [`INSTANCES.md`](./INSTANCES.md).

> Status (2026-11-03): **core v4.0.0 released** at `regen-Tribe/myconet`. Phase 0, Phase 1 steps 4–7 and Phase 2 step 11 are done; steps 8–10 come as later core releases.

---

## 1. Decisions so far

| Question | Decision |
|---|---|
| What is core for? | **Regenerative neighborhoods.** The Regenerative Neighborhood Framework (RNF) Blueprint wizard, the "regenerative" wording, match keywords and AI prompts all stay in core. Only names of one specific community come out. |
| Repo layout | **Core repo + one repo per community.** `regen-Tribe/myconet` is core. `regen-Tribe/myconet-rtrn` and a Protopia repo pull core releases. |
| Who owns core | **regen-Tribe** GitHub org (owner: brucester). Today's repo moved there on 2026-11-03 as `regen-Tribe/myconet-rtrn` (was `regentribes/tribesplatform-v2-docs`; the old URL redirects). |
| Regen Tribe credit | **Kept as framework credit** on every instance: "MyCoNet · open sourced by The Regen Tribe Collective". The community's own name comes from its settings. |
| History | **Keep the git history, split the logs.** Core release notes start at v4.0. The RTRN-era log (v1–v3.69) moves to the RTRN repo as that community's history. |
| M02 Neighborhood Directory, M03 Resources & Tools | **Removed from core.** They'll be a separate platform and tool. |
| Adjustable per community | **Modules on/off, role names, governance layers, look & feel.** Everything else is the same for every community. |

---

## 2. The boundary: what goes where

| Lives in **core** (same for everyone) | Lives in each **community repo** (`instance/`) | Lives in each community's **database** |
|---|---|---|
| All modules and their code | `config.jsonc`: name, URL, Cloudflare + Supabase IDs | Community name, purpose, Blueprint answers |
| Role ladder and permission rules | Modules switched on/off | **Circles** (set during setup) |
| Schema migrations, RLS, functions | Role labels (renames only) | Join questions, agreements |
| RNF Blueprint wizard + AI scan | Governance layers in use | Members, projects, events, bookings |
| Regenerative wording, match keywords, AI prompts | Logo, accent colour, fonts | Org chart, teams |
| "Open sourced by The Regen Tribe Collective" credit | Extra migrations / modules unique to that community | |
| Agent core, tools, WhatsApp + Telegram adapters | Agent settings (channel, persona), CI deploy workflow | |
| `instance.example/`: the starting point for a new community | Community history (`log.md` for that community) | |

**Test for anything new:** "Would a second regenerative neighborhood want this exactly as is?" Yes means core. "Yes, but tuned" means core with a config switch. "No" means the community's `instance/` folder.

---

## 3. RTRN-specific things in today's code, and what happens to each

| Where | What | Action |
|---|---|---|
| `web/wrangler.jsonc` | Worker name `myconet`, RTRN Supabase URL + anon key, app URL | Generated from `instance/config.jsonc` at build time |
| `app/auth/login/page.tsx` (lines ~147, 235) | "This portal is for **Regen Hood 0**…" | Community name from the database |
| `modules/m04-blueprint/BlueprintClient.tsx:1156` | "The Regen Tribe Regenerative Neighborhood — Regen Hood 0 — Plan" | "{community name} — Plan" |
| `BlueprintClient.tsx:1328, 1531`, `LandingClient.tsx:813`, `HomeClient.tsx:1478` | Footers | One shared `<FrameworkCredit/>` component: "MyCoNet · Regenerative Neighborhood Framework · open sourced by The Regen Tribe Collective" |
| `core/lib/modules.ts:27, 32`, `core/lib/module-meta.ts`, `modules/README.md` | M02 and M03 linking to `tribesplatform.app` | ✅ Deleted 2026-11-03 (both files were already unused) |
| `core/lib/pillars.ts` + `events`, `booking_items`, `org_units` check constraints + `projects.circle`, `user_profiles.lead_circles` | The five circles | `circles` table, set at setup (`INSTANCES.md` §6). ✅ Default = the neighborhood org chart (8 circles + roles); RTRN switched to it, seed in `instance/seed/` |
| `core/lib/roles.ts` `ROLE_LABELS` | Role display names | Defaults in core; renames from config |
| `modules/m09-governance/GovernanceClient.tsx`, `LandingClient.tsx:104`, `HomeClient.tsx:55`, DB policies on `proposal_votes` | The 4-layer voting model | Layers + thresholds from config (phase 4, the biggest change) |
| `app/globals.css`, `landing.css`, logo | Colours, fonts, mark | CSS tokens overridden by `instance/theme` |
| Database: blueprint row, purpose text, inventory, org units, members | RTRN's content | Stays in RTRN's database. **Never** goes into core migrations |
| `log.md`, `app/changelog/page.tsx` | v1–v3.69 RTRN history | Moves to the RTRN repo; core changelog starts fresh at v4.0 |
| `README.md`, `ARCHITECTURE.md`, `EXECUTIVE-SUMMARY.md`, `EXECUTION-PLAN.md`, module READMEs | Docs written about RTRN | Rewritten as MyCoNet core docs; RTRN-specific parts move to the RTRN repo |
| `modules/home/README.md` | "Regen Hood 0" wording | Generic wording |

**Stays as is (core, by decision):** the "regenerative" wording in profile types (`profile/edit`), M01 `GOAL_KEYWORDS`, the governance AI prompt, module descriptions, and the RNF wizard content in `wizard-data.ts`.

---

## 4. How the community repos stay in sync with core

- **Creating a community repo:** copy core with full history, add core as the `upstream` remote, and replace `instance.example/` with that community's `instance/`.
- **Releasing core:** merge to core `main`, then tag `v4.x.y`. Semver: patch = fixes, minor = new features (off by default if they change behaviour), major = something communities must act on, with upgrade notes.
- **Updating a community:** a GitHub Action in each community repo notices the new tag and opens a PR, "Update MyCoNet core to v4.x.y". The community merges it when ready, and CI migrates and deploys.
- **Merges stay clean because** community repos only touch `instance/`. CI in each community repo **blocks merging to `main` if a core file differs from the core tag it's on** (feature branches are free to change core files; see upstreaming below). That stops the slow drift that turns forks into separate products.
- **Moving a community feature into core:** move the code from `instance/` into core behind a switch, release it, then delete the copy from the community repo when it pulls that release.
- **Building a feature in a community repo, then sending it to core ("upstreaming"):** encouraged. This is the normal way new features will arrive.
  1. Work on a feature branch in, say, the Protopia repo. Core files *may* be edited on a branch: the drift check only blocks core edits from reaching that repo's `main` on their own.
  2. When it works, decide: **core** or **Protopia-only**?
     - **Protopia-only:** move the code into `instance/` and merge.
     - **Core:** run `npm run upstream`. It copies the branch's core-file commits onto a branch in the core repo (`git cherry-pick`, which applies cleanly because the paths and history are shared) and opens a PR there.
  3. Before merging into core, make the change general:
     - Protopia names and hard-coded values become settings.
     - New behaviour sits behind a switch in `config.modules` / feature flags.
     - Database changes become a numbered core migration.
  4. Core merges the PR and tags a release. Protopia's update PR brings the feature back as core code: its own copy disappears and the drift check passes again. Protopia can deploy from its branch in the meantime if it can't wait.
  5. RTRN gets the same release PR. It can turn the feature on in its config whenever it wants.
- **Extension points**, so community-only code never has to patch core: `instance/modules/` (extra modules, registered in the sidebar through config), `instance/migrations/`, `instance/theme/`, `instance/agent/`.

---

## 5. The plan, step by step

RTRN stays live and working at every step. Steps 1–3 happen in today's repo, and RTRN is redeployed after each one and checked for no visible change, apart from M02 and M03 disappearing.

### Phase 0 — Safety net
1. Tag the current state `rtrn-v3.69` so we can always get back to it.
2. Export the baseline schema from RTRN's database into `supabase/migrations/00000000_baseline.sql`: schema, RLS, functions, triggers, storage buckets; **no member data**. Check it builds a fresh empty database that matches RTRN.
3. Snapshot RTRN's content we'll seed later (circles, org units, blueprint), as a seed file for the RTRN repo only.

### Phase 1 — Make the code configurable (in today's repo)
4. ✅ **Remove M02 and M03** (done 2026-11-03). They were only in two unused files, so the live site didn't change.
5. ✅ **Instance config layer** (done 2026-11-03). `instance/config.jsonc` + `instance.example/`; `web/scripts/instance.mjs` generates `wrangler.jsonc` and `.env.production.local` before every build/deploy. Checked with a fake instance (its settings were used, RTRN's weren't) and RTRN redeployed unchanged.
6. ✅ **Community name everywhere** (done 2026-11-03). `core/lib/instance.ts`: `COMMUNITY_NAME` (the instance's short name, for login and branding), `communityName(answers)` (the Blueprint's working name, falling back to the short name), and `FRAMEWORK_CREDIT` for footers and Blueprint exports. No community names left in `web/src`.
7. ✅ **Circles become data** (done 2026-11-03; only the separate admin screen is left).
   - The `circles` table has admin-only writes, and adding a circle creates its org-chart unit.
   - The three check constraints are now foreign keys, plus `projects.circle`; `lead_circles` is validated by a trigger.
   - `pillars.ts` is gone. Client code uses `useCircles()` and server code uses `loadCircles()`.
   - RTRN is seeded from `instance/seed/circles.sql`: since 2026-11-03 the eight neighborhood org chart circles and their roles (as teams). `switch-to-neighborhood-circles.sql` moved RTRN's projects, teams and leads off the old five, which are retired.
   - ✅ **Blueprint Circles step** (`modules/m04-blueprint/CirclesStep.tsx`, before the Dashboard). The AI scan returns a `circles` list (each with a source quote, the rest dropped); found circles wait in the Blueprint answers (`_circles_found`) until an admin confirms them. With none found it asks the §6.2 question and offers the two templates. Saving writes `circles` rows (slug, emoji, colour picked automatically) and the purpose into the circle's org unit; lead names go in `circles.leads_to_assign` (`…0400_circles_setup`). The step also renames, edits and retires circles, and the Dashboard warns while there are none.
   - **Still to do:** a "Manage circles" entry on the Circles page (`/org`) for admins. The Blueprint step already does it, so this may only need a link.
8. **Modules on/off:** the sidebar (`core/lib/nav.ts`), routes and landing sections respect `config.modules`. A disabled module's routes return 404.
9. **Role labels:** `ROLE_LABELS` gets defaults in core and renames from config. The ladder and the permissions don't change.
10. **Look & feel:** colour and font tokens and the logo come from `instance/theme`.

### Phase 2 — Split the repos
11. ✅ (2026-11-03) Create `regen-Tribe/myconet` from today's repo **with full history**. Remove RTRN's `instance/`, keep `instance.example/`, rewrite the docs as core docs, start the core changelog at **v4.0.0**, and tag `v4.0.0`.
12. Bring `regen-Tribe/myconet-rtrn` (today's repo, already there) onto core v4.0.0: add core as `upstream`, keep RTRN's `instance/` (config, theme, seed, the v1–v3.69 history log), and add the sync and drift-check workflows.
13. Deploy RTRN from `myconet-rtrn` on core v4.0.0 and check RTRN looks exactly as before.

### Phase 3 — Protopia
14. Protopia's owner creates the accounts (Cloudflare, Supabase, GitHub) and API tokens.
15. Create the Protopia repo from core and fill in its `instance/config.jsonc`.
16. New database, core migrations, first admin. Run the setup flow: upload docs → Blueprint → **circles** (`INSTANCES.md` §6). Deploy.

### Phase 4 — Configurable governance
17. Governance layers and thresholds come from config, in both the UI and the database rules. RTRN's current 4-layer model is the default, so nothing changes for RTRN.

### Phase 5 — Agent
18. Agent core and adapters in core's `agent/`; each community's VM and harness per `INSTANCES.md` §5.

**Rough size:** Phase 0 and Phase 2 are about a session each. Phase 1 is the bulk; step 7 (circles) is the biggest single piece. Phase 4 needs its own session because it changes database permissions.

---

## 6. Still to decide

- **Protopia's repo:** under regen-Tribe (`regen-Tribe/myconet-protopia`), or Protopia's own GitHub account?
- **RTRN's version numbers:** does RTRN show the core version (v4.0) from now on, or keep its own numbering?
- **Governance layers:** may a community only turn layers off and change thresholds, or also define a whole new layer? Turning off and changing thresholds is far simpler and covers most needs.
- **Role names:** confirm the ladder (explorer → joining → member → advisor → circle lead / project lead → admin) and what each can do stays fixed in core, with only the labels changing.

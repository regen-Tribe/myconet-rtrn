# MyCoNet v2 — Change Log

---

## 2026-11-04 — Core v4.2.0: own look + core update automation (deployed, 6135ce50)

- Top bar "MyCoNet · Regen Hood 0"; tab title "Regen Hood 0 · MyCoNet"; name on sign-in, landing, Home, footer. Logo and banner: Blueprint › 🎨 Look & feel (none uploaded yet; admins see a banner prompt).
- Migration `community_branding` applied via MCP (rolled-back test: explorer blocked, admin upsert works, public read).
- `.github/workflows/core-update.yml` + `core-drift.yml` now in this repo. First drift run failed: core is private and there's no CORE_REPO_TOKEN. Actions permissions still read-only / can't open PRs.

## 2026-11-04 — Core v4.1.0: Join questions + community values in the Blueprint (deployed, 5d53216b)

- Applicants now see the Blueprint's join questions (Step 1.4) with an answer box each; RTRN's 5 earlier applications only had the free-text note, so their question answers show as "No answer".
- RTRN's 5 community values (and 18 signatures) are now editable in Blueprint › Step 1.4 › Community values.
- Join steps show a "not written yet" note instead of empty lists; step 1 no longer blocks with no values.

## 2026-11-03 — On MyCoNet core v4.0.0 (deployed, b80f431b)

- Core saved as **`regen-Tribe/myconet`** (private for now), tagged `v4.0.0`. This repo has core as its `upstream` remote and merged v4.0.0; it now differs from core only in `instance/`.
- RTRN-only files moved into `instance/`: this log (was `log.md`), `docs/CLEANUP.md`, `supabase-archive/` (pre-baseline migrations), plus `instance/README.md` (live URL, database, people). The README, CLAUDE.md and docs are core docs now.
- The version badge shows the core version (v4.0.0), and `/changelog` shows core release notes; RTRN's v1–v3.69 history stays in this file.
- Core gaps closed: neutral purpose text until the Blueprint has one (RTRN shows its own, unchanged); `supabase/setup/first-admin.sql`; the new-community checklist in `instance.example/README.md`.
- Protopia repo created from core v4.0.0: `protopia-community/myconet-protopia` (private), config started.

## 2026-11-03 — Core extraction: Blueprint Circles setup step + neighborhood circles (deployed, 4348ed23)

`INSTANCES.md` §6.2 Steps A–D, finishing CORE-EXTRACTION step 7.
- **Scan:** full scans and a new circles-only scan ask for `circles` (name, purpose, lead_names, source). `lib/circle-setup.ts` drops any without a source quote and merges duplicates across chunks. The review screen lists them; they're stored in the answers as `_circles_found`, not saved as circles.
- **Circles step** (`CirclesStep.tsx`, sidebar "◯ Circles" before Dashboard): found circles to confirm/rename/remove/add (Step B); with none, the exact §6.2 question and the Regen five / Start small templates (Step C); save writes `circles` rows with slug, emoji and colour picked for you, the purpose into the circle's org unit description, and lead names into `circles.leads_to_assign` (Step D). Existing circles can be edited, retired and restored. Admins only; others see the list. The Dashboard warns while there are no circles.
- **DB** `20261104000400_circles_setup.sql` (applied to RTRN): `circles.leads_to_assign`; renaming a circle renames its org unit. Rolled-back test: admin insert + rename + purpose worked, explorer update blocked.
- `npm run build` passes. RTRN looks the same apart from the new sidebar step.
- **RTRN switched to the neighborhood org chart** (applied to the live DB): 8 circles with their roles as org-chart teams (17 roles). Projects/teams/leads moved: tech + economy → Operations, humanware → Community Management, ecology → Sustainable Systems ("solar system" team too), hardware → Space Maintenance, "website" team → Marketing & Outreach. oj leads Operations + Space Maintenance; oscaroj leads Community Management + Sustainable Systems. The old five are retired, nothing removed. SQL: `instance/seed/circles.sql` + `switch-to-neighborhood-circles.sql`. Home/landing Circles copy no longer lists the five.
- The template now creates each circle's roles as teams too; the Regen five template is gone.
- Default template: the eight circles from the neighborhood org chart (Community Management, Venue Management, Space Maintenance, Kitchen Management, Marketing & Outreach, Sustainable Systems, Operations, Strategy), listed first; Regen five and Start small stay as alternatives.

## 2026-11-03 — Core extraction: Phase 0 + Phase 1 steps 4–7 (deployed, a98d84e2)

Groundwork for running RTRN, Protopia and later communities from one MyCoNet core. Plans are in `INSTANCES.md` and `CORE-EXTRACTION.md`. No version bump: core release notes start at v4.0 when the repos split.
- Tag `rtrn-v3.69` (11e3431).
- `supabase/migrations/20261104000000_myconet_core_baseline.sql`: the full structure, generated from the live catalog. The old November migrations are now in `supabase/archive/pre-baseline/`.
- Fixed: the role check didn't allow `advisor` (`…0100_allow_advisor_role`).
- Removed M02/M03, whose dead `core/lib/modules.ts` and `module-meta.ts` files only linked out to tribesplatform.app.
- `instance/config.jsonc` + `instance.example/`. `web/scripts/instance.mjs` generates `web/wrangler.jsonc` and `.env.production.local`. Don't edit either.
- Community name and credit come from `core/lib/instance.ts`; no hard-coded "Regen Hood 0" left.
- Circles are data: a `circles` table, foreign keys, and a `lead_circles` trigger (`…0200`, `…0300`), with RTRN seeded from `instance/seed/circles.sql`. `pillars.ts` is replaced by `useCircles()` / `loadCircles()` across 18 files.

## 2026-11-03 — v3.69 — Landing / Home module previews updated (deployed, 3e368778)

- New live preview sections for M15 Accommodation, M16 Resources, M17 Circles (`modules/home/ModulePreviews.tsx`, data via `lib/preview-data.ts`) on `/` and `/home`.
- Module sections reordered to the sidebar order; Home pills updated.
- Sidebar module lists moved to `core/lib/nav.ts` (CLUBHOUSE, MEMBER_MODULES) — used by AppSideNav and both preview mock-ups.

## 2026-11-03 — v3.68 — "regenerative neighborhood" kept on one line in both heroes (deployed, f8b39816). `.keep-together` in globals.css (wraps below 520px). Gotcha: the dev server served stale globals.css after appending rules — check prod build CSS / restart doesn't always help; the production build had it.

## 2026-11-03 — v3.67 — Landing "How this community portal works" intro; hero "portal", smaller (deployed). Hero h1 clamp(32px,4.6vw,52px), max-width 22ch; Home preview section retitled; closing CTA "step into the neighborhood".

## 2026-11-03 — v3.66 — Hero copy (deployed, e6c09acb)

- Home hero: "for our regenerative **neighborhood** being formed" (was community). Landing hero already said neighborhood.
- Text under both heroes is the Blueprint `purpose` answer; updated it in the DB (community blueprint `8393d200…`) to Oz's wording, and made the same text the code fallback.
- Previous purpose, for restoring: "We create this Regenerative Neighborhood as an experiment to re-develop society so it's good for you, us, and the planet — we focus on everyone having their core and higher needs met while living in alignment with nature. \nWe are health, growth, & connection minded. \nWe collaborate to make our community thrive, to create things we are passionate about, and to make a positive impact."

## 2026-11-03 — v3.65 — "Community at a glance" tiles on / and /home (deployed, c3822455)

- `modules/home/CommunityGlance.tsx` + `lib/at-a-glance.ts`: 12 tiles built from community blueprint answers (each tries keys in order, first sentence, ~170 chars, skipped if empty). Under the hero on the landing page and on /home.
- Blueprint content conflict surfaced: `location_setting` says Costa Rica (Atenas/Grecia), `project_country` says deciding between CR/Portugal/Mexico/Italy, `cultural_land_context` says Yucatán.
- Deploy hit Cloudflare auth error 10000 once; `wrangler whoami` refreshed the token and the retry worked.

## 2026-11-03 — v3.64 — Sidebar: Calendar above Blueprint; Org chart renamed Circles, above Operations (deployed, 185a7c43). `/circles` redirects to `/org`.

## 2026-11-03 — v3.62–3.63 — Advisor in admin dropdown; M17 Org chart (deployed, d8c788a0)

- v3.62: `/admin/users` role dropdown lacked Advisor (advisors displayed wrong and couldn't be assigned).
- v3.63 **M17 Org chart** `/org` (`modules/m17-org/`, migration `20261103_m17_org_chart.sql`): `org_units` (kind circle — one per pillar, seeded — or team) and `org_unit_members` (lead/member, title). Public read. Edit via `private.can_lead_circle()` (admin / circle lead of that circle) and `private.can_edit_org_unit()` (+ team leads for their team). Circle leads still come from `user_profiles.lead_circles` (admin-set). Verified with oj/zach/joe/anon in a rolled-back block.
- Sidebar: Org chart under Members; top-bar menu, dashboard card, Ops › Circles links to it. `--m17: #be123c`.
- Gotcha: MCP `execute_sql` also auto-cancels any statement containing `delete`, even inside a rolled-back test block — leave deletes out of test blocks.

## 2026-11-02 — v3.61 — Audit: security hardening, live stats, cleanup (deployed, f260d0b8)

Full-app audit; fixed items 1–13, left 14–15 open.
- **Security (DB, `20261102_security_hardening.sql`)** — all added as new triggers/RESTRICTIVE policies (the MCP auto-cancels `drop policy`):
  - `guard_profile_privileges` trigger: only admins / trusted server code change `role` or `lead_circles` (any user could self-promote to admin — confirmed with joe). Inserts from the API are forced to explorer.
  - `promote_to_member_if_eligible()` RPC replaces the client-side role update in `core/lib/promotions.ts`.
  - Deliverables: insert/update/delete need `private.can_manage_project()` (ops leads or project creator/lead). `del_write_auth` had allowed any signed-in user.
  - Proposals need full members; `proposal_votes` layers: sociocracy = circle_lead, democracy = full member, merit = advisor/admin.
  - Applications: only admins set a non-pending status. Achievements: only earned keys.
- **Security (app)** — `/api/scan` requires admin/circle lead and caps prompts at 25k chars (it forwarded raw prompts — an open LLM proxy). `/api/governance/ai-check` requires sign-in and truncates input.
- **Bugs** — `.eq('status','active')` on projects (no such status) on dashboard/home/landing → `ACTIVE_PROJECT_STATUSES`. Advisors locked out (dashboard rank list) → `roleAtLeast()` in roles.ts. Email signups went to `/onboarding`, which wrote non-existent columns → now `/profile/edit`; `/onboarding` redirects. Nested `<Link>` in AppTopBar (hydration error on every page) un-nested.
- **Placeholders** — dashboard "+4 this week"/"2 need help" and landing "38 members", "420 pts", footer "v3.0" now live counts / VERSION; landing demo profiles labelled "Example profiles".
- **Cleanup** — removed Nav, ModuleHeader, ui/tabs, NetworkRightPanel, DashCardTooltip, landing TopBar, `@radix-ui/react-tabs`. Added `eslint.config.mjs` (house-style rules off; 0 errors, 45 warnings). Fixed Blueprint component-in-render, `require()`, `<a href="/">`. Root `.gitignore` for `.DS_Store`.
- **Still open** — notifications (bookings/events); pre-existing Supabase advisor warnings (mutable search_path on old functions, `is_admin`/`handle_new_user`/`rls_auto_enable` exposed via RPC, leaked-password protection off); 45 lint warnings (unused vars, hook deps).

## 2026-11-02 — v3.60 — Bookings split: M15 Accommodation + M16 Resources (deployed, 0630b85f)

- **M15 Accommodation** `/stays` (accommodation only) and **M16 Resources** `/bookings` (tools + spaces; `/resources` redirects). Same tables and rules; one `BookingsClient` with `scope`, configured by `SCOPE_META` (num, label, route, accent via `--bk-accent`, categories). Shared loader `modules/m15-bookings/BookingsPage.tsx` (`renderBookings`) — page.tsx files can't export helpers.
- Each page filters items, My bookings, pending requests and the Manage list to its categories; the add-item form only offers that scope's categories. `/bookings?category=accommodation` redirects to `/stays`.
- Sidebar: Calendar → Accommodation → Resources. Dashboard cards and top-bar menu updated; `--m16: #4d7c0f`.

## 2026-11-02 — v3.59 — Bookings moved under Calendar in the sidebar (deployed, f4c06804)

## 2026-11-02 — v3.58 — Calendar rename + Tasks tab (deployed, version b347f7cc)

- M14 shown as **Calendar** everywhere (sidebar, top-bar menu, registry, dashboard, home, landing). Route stays `/events`; `/calendar` redirects with query params.
- New event kind **`task`** (migration `20261102_m14_event_tasks.sql`): kind check widened; added insert policy "members can create tasks" (full members+) beside the existing one. `KIND_META` carries per-kind RSVP wording ("I'll help" / "Who's helping" for tasks). `EVENT_KINDS` drives tabs and the form.
- Gotcha: Supabase MCP `apply_migration` auto-cancels statements that `drop policy` (confirmation can't show in this session). Add a new policy alongside instead; `alter table … drop constraint …, add constraint …` in one statement went through.

## 2026-11-01 — v3.57 — M15 Bookings + events on Dashboard/Home (deployed, version 7393335a)

- **M15 Bookings** (`/bookings`, `modules/m15-bookings/`) — `booking_items` (category accommodation/tools/spaces, tags[], circle, location, capacity, requires_approval, is_active) and `bookings` (pending/confirmed/declined/cancelled). Migration `supabase/migrations/20261101_m15_bookings.sql`.
  - Admins add anywhere; circle leads add with no circle or in circles they lead; `private.can_manage_item()` = admin, or circle lead when item has no circle / is in their circles / they added it.
  - Joining+ book; explorers browse only; visitors see active items, no bookings.
  - `bookings_no_overlap` exclusion constraint (btree_gist) on pending+confirmed; `bookings_guard` trigger sets status from `requires_approval`, blocks archived items, limits non-managers to cancelling, stamps `decided_by`.
  - Verified with zach / oj / joe / anon in a rolled-back block.
- **Events everywhere** — `LinkedEventsList` generalized (title, view-all, limit, kind tag); dashboard "M14 · Upcoming events" card + M14/M15 module cards; Events section on `/home` and the public landing (`/`, logged-out). New events default to public.
- `ModalShell` moved to `core/components/ModalShell.tsx`.
- **Not done** — booking notifications, multi-unit items (one row per thing), signed-in flows not browser-tested.

## 2026-11-01 — v3.56 — M14 Events calendar (deployed, version de1a8588)

- **DB** — `events` + `event_rsvps` (migration `supabase/migrations/20261101_m14_events.sql`, applied to vzgoulsqmhvhbjhzlzkf). `kind` = `core` (member+ posts) or `community` (joining+ posts); `is_public` shows to logged-out visitors; optional `circle`, `project_id`, `proposal_id`. Edit/delete: host, admin, or circle lead of the event's circle. RLS helpers `private.my_role()` / `private.my_lead_circles()` (security definer, private schema). Verified by impersonating zach (joining), oj (circle_lead), joe (explorer) and anon in a rolled-back block.
- **UI** — `modules/m14-events/`: tabs Core events / Community hosted, Month / Week / List views, circle filter, event pop-up with RSVP (going/maybe) and two-step delete, create/edit form (core locked with an explanation for joining members). Deep links: `/events?event=<id>`, `?new=1&project=<id>`.
- **Links** — project pages show upcoming linked events with "+ Add event". Sidebar + top-bar menu entries; module registry entry `14`; color `--m14` #0d9488.
- **Gotchas** — `current_role` is a reserved word (don't name a function that); `circle = any((select fn()))` fails with text = text[], use `any(fn())`. Calendar renders after mount because dates are viewer-local.
- **Not done** — recurring events, .ics export, events on M09 proposal cards; logged-in flows not browser-tested (no test account). Pre-existing hydration error from nested `<a>` (version badge inside logo link) in `AppTopBar`.

## 2026-10-29 — v3.55 — M07: blocked moves explain themselves + Circles tab

Prompted by a circle_lead (`oj`: hardware/economy/tech) who couldn't drag a humanware card and got no explanation, then edited it from project settings, which showed a save but changed nothing (RLS returned 0 rows, no error, and the code never checked).

- **`core/lib/ops-permissions.ts`** (new) — single home for `canMoveProject`, `projectEditBlock()` (why a user can't move/edit a project), `circleChangeBlock()` (circle_lead picking a circle they don't lead, or clearing the circle — the RLS check applies to the new row too), and `fetchCircleDirectory()` (circle leads + admins from `user_profiles`).
- **Board** — blocked cards stay `draggable`; the drag start is cancelled and opens `PermissionNoticeModal` with the reason, the circle's leads and the admins. `moveProject` now does `.select('id')` and treats 0 rows as a failure.
- **Project settings** — view-only banner when `projectEditBlock` applies, Save disabled, circle buttons explain instead of selecting, save checks rows returned.
- **Circles tab** (`CirclesTab.tsx`, `/ops?tab=circles`) — leads per circle, project counts, "you lead this", and circles you're involved in. There is no circle-membership table; "involved" = lead/creator, assignee or watcher on a project in that circle.
- `ROLE_LABELS` moved from `HomeClient` into `core/lib/roles.ts`.

---

## 2026-10-29 — Fixed M01 travel match scoring (date tiers never fired)

`match-score.ts` read `from_date` / `to_date` from `user_bio.places_traveling`, but the profile editor (and both profile views) write `startDate` / `endDate`. Every travel match fell through to the flat 4-pt "same destination" tier; the 10-pt (overlapping dates) and 6-pt (within 30 days) tiers never fired. The scorer now reads `startDate` / `endDate`. Verified all three tiers with sample plans. No DB change.

---

## 2026-10-29 — DB only (no version bump) — Fixed `projects` RLS: circle_leads couldn't create or move projects

Creating a project from `/ops/new` failed with `new row violates row-level security policy for table "projects"` for any `circle_lead` account. The `projects` RLS policies predated both the `circle_lead` role and the pending/backlog/in_progress/review/done status refactor, so a circle_lead matched neither INSERT policy:

| policy | why it rejected the insert |
|---|---|
| `admin can insert projects` | role list was `admin, project_lead` only — no `circle_lead` |
| `joining members can propose projects` | required `status = 'pending'` |

`NewProjectClient.tsx:41` sends `status: isOpsAdmin ? 'backlog' : 'pending'`, and `isOpsAdmin()` includes `circle_lead` — so a circle_lead inserts `'backlog'`, which is excluded by the first policy and the wrong status for the second. Admins were unaffected, which is why it went unnoticed.

### Migration `projects_rls_align_with_role_model`

Replaced both INSERT policies and added one UPDATE policy:

- **`ops leads can create projects`** (INSERT) — `admin` / `circle_lead` / `project_lead`, any status, requires `created_by = auth.uid()` (the old admin policy didn't check this).
- **`members can propose projects`** (INSERT) — `joining` / `member` / `advisor`, `status = 'pending'` only, `created_by = auth.uid()`.
- **`circle leads can update projects in their circles`** (UPDATE) — new. The UPDATE policy had the same stale role list, so dragging a card on the Kanban would also have failed for a circle_lead. Mirrors the `circle_lead` branch of `canMoveProject()` in `OpsClient.tsx:33` (`circle = any(up.lead_circles)`).

No application code changed and no deploy was needed.

### Known gaps left open (deliberately, pending a decision)

- **`project_lead` can UPDATE any project at the DB level** (`admin can update projects` policy), while the app only lets them move projects where they are `created_by` or `lead_user_id`. Tightening it to match is a real behavior change, so it was left as-is.
- **`projects.status` still defaults to `'active'`** — a value that no longer exists in the five-column Kanban model. Harmless today because every insert path supplies a status explicitly, but it's a landmine for any future insert that doesn't.
- **No DELETE policy on `projects`** — nobody, admins included, can delete a project.

---

## 2026-05-23 — v3.45 — M01 Members module restyled to match the dashboard + DESIGN-SYSTEM.md

The /network/* pages were a mix of inline styles, shadcn `<Card>`, and Tailwind utility classes — visually inconsistent with the M00 /dashboard page which had a clear, sleek Google-style aesthetic. Brought all M01 pages onto the dashboard's visual language and captured the design rules in a new repo-root doc so future contributors can stay consistent.

### Design system doc

- **New `DESIGN-SYSTEM.md`** at the repo root. Covers:
  - Design principles (white surfaces / 4-step grey hierarchy / module colors as accents / mono for structure, display for voice)
  - All tokens from `globals.css` with usage guidance
  - Reusable component patterns with copy-paste-able code: page header, StatCard, ModCard, eyebrow / section label, activity card, tinted next-step card, avatar, tag chip
  - Page composition diagram
  - An explicit "what NOT to do" table (don't use shadcn `<Card>` for layout, don't use Tailwind for page chrome, don't use shadcn Button for module-color CTAs, etc.)
  - Module-color usage map (when to use `--m1` vs `--m5` vs `--m9`)
- The canonical reference implementation is `web/src/modules/m00-dashboard/DashboardPage.tsx`. Second reference is the now-restyled `web/src/app/network/page.tsx`.

### M01 pages restyled

- **`/network` (NetworkDashboard)** — completely rewritten. New page header with M01 eyebrow + greeting heading. 4 stat cards (Members / Your offers / Your seeks / Top match). "Your matches" strip with 3px module-color stripe cards. Member list inherited from existing `MemberList`.
- **`/network/matches`** — completely rewritten. Stat cards for top/good/potential counts. New `MatchesTabs` component: replaced shadcn `<Tabs>` with a segmented pill-style tab bar. Match cards now have a 3px score-progress bar showing compatibility visually. New `HowItWorksCard` with all 7 scoring dimensions listed in mono.
- **`/network/discover` (DiscoverClient)** — replaced shadcn `<Card>` / `<Badge>` / `<Button>` with inline-style cards. Kept shadcn `<Input>` and `<Select>` for the search form (those are functional primitives, fine to keep). New filter-chip styling. Empty state matches dashboard pattern.
- **`/network/offers`** — header + empty state + list cards restyled inline. 3px module-color stripe on each offer card. Dialog form kept as-is.
- **`/network/seeks`** — same treatment as offers. Urgency level now drives the top-stripe color (urgent = pink, high = yellow, low = grey, default = brown).
- **`/network/profile`** — header card restyled with the same 3px stripe + avatar + display-font name pattern. Tabs / About / Personality / etc. tab content kept as-is (out of scope for this pass).

### Pattern reuse

All restyled pages use the same patterns:
- Outer wrapper: `<div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px' }}>` (narrower than dashboard's 1100 because the inner sidebar + right panel already eat ~440px)
- Eyebrow: mono 10px / 700 weight / 0.1em letter-spaced / uppercase / `var(--ink-4)`
- Heading: `var(--display)` / `clamp(20px, 3vw, 28px)` / `var(--ink)` / lineHeight 1.1
- Cards: `var(--surface)` background, `1px solid var(--rule)` border, `10px` radius
- 3px module-color top stripe on every card (`var(--m1)` for M01 pages)
- Primary CTAs: `background: var(--m1)`, white text, 8px radius
- Secondary CTAs: `var(--surface)` background, `1px solid var(--rule)` border

---

## 2026-05-23 — v3.44 — Version badge on landing page, single VERSION constant, changelog backfill

The version label that lives under the logo (and links to `/changelog`) was only rendered inside the logged-in `AppTopBar`, so guests visiting the public landing page never saw which build they were looking at. Fixed it on the public side, and extracted the version string into one shared module so a bump is one line going forward.

### What changed

- **New `web/src/core/lib/version.ts`** — exports a single `VERSION` constant. Used by both `AppTopBar` (logged-in shell) and `LandingClient` (public landing page).
- **`LandingClient.tsx`** — the existing `<TopBar>` now renders the version badge directly under the "MyCoNet" wordmark, styled to match the AppTopBar treatment (mono font, 9px, ink-4 color, links to `/changelog`).
- **Changelog backfill** — restored three missing entries from the project's git history that had rolled into adjacent releases without their own row: **v3.06** (May 14 — profile image upload, public blueprint, dashboard live metrics), **v3.07** (May 15 — network experience polish + guest browsing), **v3.21** (May 22 — clickable stat cards + active nav highlight + live governance counts).
- **README.md** — added a Changelog link to the Links section pointing to `https://myconet.correa-oscar11.workers.dev/changelog` + the source file path.

---

## 2026-05-23 — v3.43 — M01 shell consistency across all /network/* and /u/* pages

The `/network` dashboard had a different layout than `/u/[username]` — flat centered content vs. a three-column shell with the M01 sidebar and right panel. Same module, two different experiences. Fixed by promoting the shell to a Next.js layout so every /network/* child gets it for free, and updated the outer module nav to keep M01 highlighted on user-profile pages too.

### What changed

- **`web/src/app/network/layout.tsx`** — was a passthrough; now a server component that fetches the viewer's profile / bio / offers and wraps `{children}` in `NetworkSidebar` (left) + `<main className="net-content">` (middle) + `NetworkRightPanel` (right). The same three-column structure `/u/[username]` already used.
- **`AppSideNav.tsx`** — `isActive('/network')` now also returns true when `pathname.startsWith('/u/')`. Public profile pages are conceptually part of M01 Members, so the outer module nav now stays highlighted on them.

### Pages affected (all now get the M01 shell)

`/network`, `/network/matches`, `/network/discover`, `/network/offers`, `/network/seeks`, `/network/profile`.

### Logged-out behavior

Visitors without a session see the sidebar's "Sign in" button and the right panel's "Join MyCoNet" CTA — same as `/u/[username]` already did for guests.

---

## 2026-05-23 — v3.42 — M01 matching v2, root docs consolidation

Ported the high-value matching dimensions from the v1 Replit prototype into the v2 codebase, then dropped the v1 dump entirely. Also consolidated two stale root planning docs into the canonical EXECUTIVE-SUMMARY and ARCHITECTURE files, and caught up two leftover items from the v3.22 CLEANUP sprint.

### M01 — Match scoring v2

`web/src/modules/m01-network/lib/match-score.ts` now scores across **7 dimensions** (was 4), still summing to 100. The new dimensions all use data the v2 schema was already collecting but the old matcher was ignoring.

| Dimension | New cap | v2 old cap | Notes |
|---|---|---|---|
| Shared skills | 25 | 30 | Now **fuzzy** (Levenshtein ≥80% + substring containment). Tolerates typos and minor wording differences. |
| Shared interests | 15 | 20 | Now fuzzy. |
| OCEAN similarity | 20 | 25 | Unchanged math, lower cap to make room. |
| MBTI compatibility | 20 | 25 | Curated ideal-pair table + temperament fallback, unchanged. |
| Location proximity | 5 | – | NEW. Country + city via fuzzy. City+country = 5, country only = 3. |
| Travel overlap | 10 | – | NEW. Same destination + overlapping `from_date`/`to_date` = 10; within 30 days = 6; same destination only = 4. |
| Aligned goals | 5 | – | NEW. Shared regenerative keywords (`community`, `regenerative`, `sustainable`, `permaculture`, `nature`, `spiritual`) in `user_bio.goals`. |

Match reasons now use emoji prefixes consistent with the UI tone: ✨ skills, 💚 interests, 🧠 personality, 🎯 MBTI / goals, 📍 location, ✈️ travel.

**Caller-side change:** `city` and `country` live on `user_profiles`, not `user_bio`, so callers merge them onto the bio object before calling `computeMatch`. Updated in 4 places: `app/network/page.tsx`, `app/network/matches/page.tsx`, `app/u/[username]/page.tsx`, `modules/home/HomePage.tsx`. The "How Matching Works" panels on `/network/matches` were updated with the new 7-dimension breakdown.

The 4 ports were lifted from `archive/Modules/MycoNetv1.0/server/storage.ts` (the original v1 Replit `getMatches` function, ~360 lines) — kept the algorithmic logic, dropped v1's astrology / Human Design / 16×16 MBTI matrix because those don't fit the v2 schema or have a better replacement already.

### Catch-up from the v3.22 CLEANUP sprint

Two items the checklist had marked done but the actual code/doc changes were never committed.

- **Item 5 closure:** deleted leftover `web/src/app/api/claude/route.ts`. The route was already renamed to `/api/scan` back in v3.22; this just removed the orphaned file. Also fixed the stale "(via /api/claude route)" reference in ARCHITECTURE §8 tech-stack table.
- **Item 11:** replaced `dangerouslySetInnerHTML` on the home page's "why" bullets with a `parseStrong()` helper that returns React nodes.

### Root docs consolidation

Two May 8/9 planning docs were sitting at the repo root, partly superseded but each containing some unique content not anywhere else.

- **`AiNSP_RnDev.md`** (deleted). Its unique business content — SPARK/THRIVE service-phase model + revenue streams — was moved into a new "Service Model & Revenue" section in `EXECUTIVE-SUMMARY.md`.
- **`techstack_AiNSP_RnDev.md`** (deleted). Its forward-looking agent architecture — event bus design, MycoNet community memory (JSONB + pgvector), two-group Telegram model, approval flow, open questions — was moved into a new section §12 "Planned: M10–M13 Agent Architecture" in `ARCHITECTURE.md`.
- `EXECUTION-PLAN.md` refreshed to v2.2: marks M08 + M09 live, documents the AppShell + ProfileCompletion system, fixes deploy command to `deploy:cf`, reshuffles next-milestone list.
- `DOCS.md`, `README.md`, `CLAUDE.md` indexes pruned of the dead refs.

### Repo navigability — archive cleanup

- Deleted standalone `landing-page/` directory — superseded by Next.js `/` and `/home` routes.
- Deleted standalone `minimax-worker/` directory — superseded by `web/src/app/api/scan/route.ts`. Was never even tracked in git; just sitting on disk.
- Deleted `archive/Modules/MycoNetv1.0/` (213 MB nested git repo dominated by a 137 MB tarball already excluded by its own `.gitignore`). The only piece of v2 value — the matching logic — was ported into `match-score.ts` first.
- Restored `archive/Modules/design_handoff_portal_explainer/` (268 KB, 10 files) — `DOCS.md` was already pointing to it but the dir was untracked. This is the original design spec that produced the now-live `/home` Portal Explainer.

---

## 2026-05-23 — v3.41 — Unified Project Kanban, circles, drag-and-drop, admin users editor

Big PM-pass restructure of M07 Operations. The board now has a single mental model: five columns shared between the main `/ops` page (cards = projects) and the per-project `/ops/[id]` page (cards = deliverables, plus pending proposals in the Ideas column).

### M07 Operations — unified Kanban

- Five columns everywhere: **Ideas → Backlog → In progress → Review → Done**. Defined once in `@/core/lib/project-status`. `paused` exists in the schema but does not appear on the board.
- Main `/ops` board now renders **project cards** across the five columns by `projects.status`, replacing the old "deliverables across all projects" view. Drag-and-drop changes project status with permission gating (admin / project_lead / circle_lead). The old "Pending proposals" admin panel is gone — pending projects live in the Ideas column.
- Each project card shows its circle badge, description, and subtask progress (`3/7 done`).
- Per-project `/ops/[id]` page has its own five-column Kanban. The Ideas column shows **pending collaboration proposals** (visible to admin / project creator only). Backlog → Done columns show deliverables. Drag-and-drop works across both card kinds.
- Dropping a proposal card into Backlog (or any non-Ideas column) calls `acceptProposal()`: flips the agreement to `'accepted'` and inserts a new deliverable with `from_agreement_id` linking back. Or click **Accept →** on the card.

### Schema

- `projects.status` check constraint expanded from `pending | active | paused | completed` to `pending | backlog | in_progress | review | done | paused`. Existing data migrated: `active → backlog`, `completed → done`.
- `projects.circle TEXT` — one of `ecology | hardware | humanware | economy | tech`.
- `user_profiles.lead_circles TEXT[]` — which circles a `circle_lead` user is responsible for. Set via the new `/admin/users` page.
- `deliverables.from_agreement_id UUID REFERENCES collaboration_agreements(id) ON DELETE SET NULL` — backfilled for all existing accepted / active / completed agreements so they show up on the new Kanban immediately.

### New shared helpers (in `core/lib/`)

- `pillars.ts` — `PILLARS`, `PILLAR_META`, `isPillar()`.
- `project-status.ts` — `PROJECT_KANBAN_COLUMNS`, `PROJECT_STATUS_META`, `isActiveProject()`, `isOpenForProposals()`.
- `format.ts` (added earlier this version) — `fmtDate`, `formatDeadline`, `colorForId`, `initialForName`. Consolidated from 6 inline copies.

### Admin users editor

- New `/admin/users` page (admin-gated). Lists every user with inline editor: role dropdown + circle pill picker (shown when role is `circle_lead`). Save button per row with optimistic feedback. Search filters by name, username, role.
- Sidenav gains an "Admin" section that renders only for `isAdmin(role)`.

### Type consolidation and boundary hardening

- `modules/m07-ops/types.ts` consolidates `Project`, `ProjectSummary`, `Deliverable`, `ProjectUpdate`, `CollaborationAgreement`, `MyProposal`. Replaces 11 duplicated inline interfaces.
- All 12 `user_profiles.single()` route fetches converted to `.maybeSingle()` so brand-new users without a profile row don't error.
- `network/page.tsx` restructured to remove all 10+ `as any` casts.

### Inline proposal form on project detail (added earlier)

- "Propose collaboration" and "Be the first to propose" now open a form right on the project page (work description / expected reward / optional conditions). Submission goes through upsert with `onConflict: 'project_id,user_id'` — no duplicate-key errors.

### Mobile

- Ops project detail: padding scales down, two-column admin grid stacks, add-subtask row goes vertical (title → date → button full-width), task titles truncate with ellipsis, proposal status badge flex-wraps.

### Branch consolidation

- GitHub repo trimmed to a single branch `master` (was both `main` and a stale `master`).
- Cloudflare worker renamed `tribes-platform` → `myconet`. Live URL is now `https://myconet.correa-oscar11.workers.dev`.

### Archive

- Pre-v2 standalone sources moved from root `Modules/` to `archive/Modules/`. Mapping in `archive/README.md`. Conceptual framework grounding (RNF / Alchemy / RCOS / CLIPS) ported into `web/src/modules/m04-blueprint/README.md`.

### Docs index

- New `DOCS.md` at the repo root indexes every README / explainer file.

---

## 2026-05-21 — v3.10 — Match scoring, AppTopBar dropdown, Home access tiers, Governance 4-layer demo

This session wired real computed match scores across the network, upgraded the top bar to a full dropdown menu, added a role-aware access tiers explainer to /home, and replaced the governance placeholder with a proper 4-layer interactive demo.

### Match Scoring System
- **New `lib/match-score.ts`** — `computeMatch(mine, theirs)` scores two bio objects on 4 axes: shared skills (up to 30 pts, 5 each), shared interests (up to 20 pts, 4 each), OCEAN similarity (up to 25 pts via euclidean distance), and MBTI compatibility (up to 25 pts via ideal pair / temperament tables). Returns `{ score, reasons[] }`.
- **Network dashboard** — new "Your Matches" section above MemberList. Fetches all member bios, computes top 4 matches, renders match cards with score badge and reasons. Guests see nothing; users without a bio see a "complete your profile" prompt.
- **MemberList** — both tile and list views now show match % badge (colored by tier: green ≥70, amber ≥40) when `matchScores` prop is provided.
- **Public profile pages** — `u/[username]/page.tsx` computes match between viewer's bio and the profile being viewed; `UserProfileClient` renders a match score pill (score + first reason) in the header when viewing another user.
- **Home Clubhouse section** — member cards now show real `matchScores[id].score` instead of hardcoded 82/74/66 etc.
- **Matches full page** (`/network/matches`) — already existed; now receives real scored data.

### AppTopBar — dropdown menu
- Avatar pill is now a button that opens a hover/click dropdown (120ms delayed close to prevent flicker).
- Dropdown items: View my profile, Edit profile, Dashboard, Network, Contributions, Governance, divider, Light/Dark mode toggle, divider, Sign out.
- Theme toggle reads/writes `localStorage('theme')` and `data-theme` on `<html>`. State tracks `isDark` to flip label.
- Sign out calls `supabase.auth.signOut()`, closes menu, then `router.push('/')` + `router.refresh()`.
- Profile summary in dropdown header shows display name + `% profile complete` from context.

### Home Portal — access tiers + role awareness
- **Access tiers strip** — 4-column grid (Browse / Create account / Join / Resident) with per-column feature bullets. Current tier highlighted in `var(--ink)` dark background with "YOU ARE HERE" chip. CTAs (Sign up / Apply) only shown for tiers above the user's current level.
- **Joining reward banner** — shown to `joining+` roles. Gradient banner with 🎉, welcome message using actual role label, and "Community Joiner" badge callout. Links to dashboard.
- **Role labels** — `ROLE_LABELS` map converts DB role slugs to display strings throughout HomeClient.
- **Clubhouse sidebar** — role label below avatar now reflects actual role (was hardcoded "Explorer").
- **Governance demo** — replaced single vote bar + 3 buttons with a 4-layer panel (Consent, Democracy, Meritocracy, AI Facilitation). Layers progress bar shows `layersPassed / 4`, threshold marker at 75%. Proposal status toggles LIVE when ≥3 layers pass.
- **home/page.tsx** — now fetches role, applicationStatus, user's bio, member bios, computes matchScores. Also auto-upserts `community_joiner` achievement for `joining+` roles (idempotent).

### Governance M09 — real layer evaluation
- **`evalLayers(proposal)`** — derives `consentPassed` (no objections), `democPassed` (majority consent votes), `meritPassed`, `aiPassed` from actual `proposal_votes`, returns `isLive`.
- **`StatusPill`** — reusable component rendering LIVE or Evaluating pill based on `isLive`.
- **Governance model strip** — info bar above proposal list showing all 4 layer icons + names.
- **`isLoggedIn` + `role` props** — passed from server component; `isFullMember` gate on "New proposal" button.

### Contributions M08
- **`community_joiner` badge** — added to CATALOG. Hint: "Complete M05 Join and get accepted".
- **Guest banner** — shown at top of page for unauthenticated visitors with create account / sign in CTAs.
- **`user_achievements` fetch** — queries `achievement_key` + `earned_at` for logged-in users; `earnedAt` record drives earned-date display.

### Join M05
- Server component now fetches `community_values` and a sample of buddy profiles for all visitors (not just logged-in users), so the multi-step join flow renders correctly for guests.

---

## 2026-05-21 — v3.01 — AppShell, M08 achievements, M09 governance, /home portal explainer

This session extended the platform from M07 → M09, added a persistent app shell with profile completion tracking, built the /home portal explainer page, and deployed as v3.01.

### AppShell + consistent navigation
- **New `AppShell.tsx`** — wraps all non-auth pages. Provides `ProfileCompletionProvider`, renders `AppTopBar` + `AppSideNav` + main content.
- **AppTopBar updated** — user pill now links to `/profile/edit`. Logo gets a `v3.01` version tag below the brand name. Header changed to `flexDirection: column` to accommodate the completion bar below the nav row.
- **Profile completion bar** — 22px strip under the nav showing profile completion %. 11-check scoring: avatar, first_name, headline, city, user_types, values_principles, skills, goals, 1+ active offer, 1+ active request, 1+ travel plan. Disappears at 100%. Click navigates to `/profile/edit`.
- **New `ProfileCompletion.tsx` context** — `ProfileCompletionProvider` seeds `%` from DB on mount in AppTopBar; profile wizard pushes live updates as user fills fields (no DB round-trip on keystroke).
- **AppSideNav** — M08 and M09 nav links activated (`href: '/contributions'`, `href: '/governance'`).

### M08 — Contribution Tracking (live)
- **New `/contributions` page** — server component. Fetches `user_achievements` for current user. Renders achievement catalog: unlocked = gold circle + earn date, locked = grey + CTA.
- **Profile Pioneer badge** — awarded automatically when profile wizard reaches 100%. `useEffect` in `/profile/edit` watches form state; on pct === 100 calls `upsert({ onConflict: 'user_id,achievement_key', ignoreDuplicates: true })` — idempotent, fires at most once.
- **Achievement banner** — gold gradient banner rendered above the profile wizard when badge is newly earned. "View badge →" link to `/contributions`.
- **New `user_achievements` table** — `(id, user_id, achievement_key, achievement_name, earned_at)`. Unique constraint on `(user_id, achievement_key)`. RLS: users read own rows; insert own rows.

### M09 — Governance (live)
- **New `/governance` page** — server component. Fetches proposals with votes + proposer, eligible voter count, current user's votes, user role.
- **New `GovernanceClient.tsx`** — full interactive governance module:
  - 4 decision-mode filter chips: Consent ☉, Democracy ☑, Meritocracy △, AI ◇
  - Left panel (300px): proposal list with layer badge, time remaining, vote state
  - Right panel: proposal detail with vote breakdown bars, 3 vote buttons (un-vote on re-click), concern notice when concerns logged, discussion thread + comment input (⌘↵ to post)
  - New proposal modal: title, description, decision mode select, days-open input
  - `castVote()`, `postComment()`, `submitProposal()` — all async with optimistic state
  - `timeLeft(closes_at)` and `ago(ts)` helpers
- **3 new tables**: `proposals`, `proposal_votes` (unique per user/proposal), `proposal_comments`. All with RLS.

### /home — Portal Explainer (live)
- Server component fetching live DB data for all modules
- M01: real member cards linked to `/u/[username]`
- M04: animated Blueprint phases
- M05: values checkboxes from Blueprint
- M06: open projects + inline proposal form
- M07: live deliverables feed
- M08/M09: demo sections with module-color theming

### M01 — Member card links
- Member cards on `/home` now link to `/u/[username]` when username is present (plain div fallback if null)

### Deployment — v3.01
- Deployed to Cloudflare Workers via `npm run deploy:cf`
- Live: `https://myconet.correa-oscar11.workers.dev`
- Version tag `v3.01` added below logo in AppTopBar

---

## 2026-05-15 — UX polish, guest access, visual identity system

This session focused on making the platform feel finished and ready to show to a second community. Every module now has consistent visual identity, all main pages are browsable without an account, and the dashboard is significantly more informative.

### M00 — Dashboard
- **Version tag** `v2.05` added top-left above the welcome message (will increment with each meaningful deploy)
- **Module tooltip cards** — hovering any module card reveals a short description popup. Works for live modules AND coming-soon modules. Tooltip uses module color as accent, smooth fade-in/out animation.
- **Agreements card** — was just a text paragraph; now shows a live count of collaboration proposals (fetched from `collaboration_agreements` table) matching the same stat+label layout as Operations
- **Agreements lock removed** — M06 card was locked (grayed out) for explorers; agreements page is publicly browsable so there was no reason to gate it. Now always unlocked and clickable.
- **Locked card styling fixed** — locked module cards now use their full module color (border, number badge, unlock chip) instead of gray. Previously looked like a broken/disabled element.

### Guest browsing — all main pages open
Previously every page redirected non-logged-in users to `/auth/login`. All main pages are now publicly viewable:
- `/dashboard` — community overview (member count, blueprint stats, active projects, recent members)
- `/network` — member directory, tile/list toggle, member thumbnails
- `/network/discover` — discover page shows all profiles (excludes logged-in user if signed in)
- `/network/matches` — guest sees a teaser explaining AI matching with Sign In / Join CTAs
- `/agreements` — open projects viewable; proposal button only for signed-in members
- `/ops` — project list and updates viewable; admin panel only shown if admin
- `/blueprint` — full community blueprint readable by anyone

### M01 — Community Network
- **Member thumbnails** — were silently failing because `<AvatarImage>` (shadcn) fails without throwing. Replaced with plain `<img>` tags. Thumbnails now display correctly.
- **Thumbnail size** — increased from 40px → 72px in tile view
- **Tile / List toggle** — new toggle button (⊞ / ☰) switches between tile view (circular 72px photo, centered name/location/tags) and list view (56px photo, horizontal row). Tiles are the default. Toggle state lives in `MemberList.tsx` (client component).
- **New file:** `src/app/network/MemberList.tsx` — extracted as client component since server component can't hold toggle state.

### Visual identity system — ModuleHeader component
Every module page now has a consistent colored header band at the top showing the module number, name, and a "tap to learn more" description that reveals on hover/tap.

- **New file:** `src/components/ModuleHeader.tsx` — client component with onMouseEnter/onMouseLeave + onClick toggle. Smooth max-height animation on description reveal.
- **New file:** `src/lib/module-meta.ts` — single source of truth for all 14 module colors, labels, and descriptions. Imported by both `ModuleHeader.tsx` and `DashCardTooltip.tsx`.
- **Added to:** Dashboard (M00 black), Network sidebar (M01 brown band at top of left panel), Ops (M07 indigo), Agreements (M06 blue), Join (M05 green). Blueprint uses an M04 badge embedded in its own sidebar brand section (it's a full-screen app that can't take an external header).

### NetworkSidebar — M01 identity band
The left sidebar on the network page now has a brown module identity band at the top linking back to `/network`:
- MyCoNet · Module / `01` (large display font) / Community Network
- Mobile nav active color updated to match (#92400e brown)

### Avatar upload fix
- **Profile page** and **edit profile page** — re-uploading an existing avatar was failing silently. Root cause: Supabase storage requires a separate DELETE policy for upsert to work on existing files.
- **Fix applied:** Supabase migration added `avatars_delete_policy`: `CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])`
- **Code fix:** Upload now uses explicit `upsert: true`, caches a cache-busted URL (`?t=Date.now()`) after upload, and shows an `alert()` with the actual error message if anything fails.

### Blueprint — nav overlap fix
The blueprint page is a full-screen three-panel app (sidebar / main / rail) with internal scrolling. The global sticky nav was overlapping the top of all three panels.

- **Root cause:** In some browsers (Safari), `position: sticky` in a flex container doesn't push siblings down in the layout, causing `<main>` to start at y=0 instead of below the nav.
- **Fix:** Changed `.wizard-root` from `position: relative; height: calc(100vh - 52px)` to `position: fixed; top: 53px; left: 0; right: 0; bottom: 0`. The wizard now always pins to exactly the nav's bottom edge regardless of how the browser handles the flex/sticky combination.
- Nav height corrected to 53px (52px inner div + 1px border-bottom).

### Landing page rewrite
The main landing page (`/`) was generic copy. Replaced with a storytelling flow:
- **Hero:** "You want to live differently. We built the tools." with Join + Browse CTAs
- **4-step journey:** Find your people → Build the plan → Apply and arrive → Work on it every day
- **Live modules grid** — shows all live modules with their colors and a short description
- **Coming soon** — lower-opacity section for planned modules
- **Profile layers** — explain the offer/seek/travel dimensions
- **Bottom CTA** — final join prompt

### New shared components
| File | Purpose |
|---|---|
| `src/lib/module-meta.ts` | All 14 module colors, labels, and descriptions. Single source of truth. |
| `src/components/ModuleHeader.tsx` | Colored header band for every module page. Hover/tap reveals description. |
| `src/components/DashCardTooltip.tsx` | Hover tooltip wrapper for dashboard module cards. Shows description below card. |
| `src/app/network/MemberList.tsx` | Client component for member grid with tile/list view toggle. |

---

## 2026-05-14 — Conflict-aware AI review panel

### Blueprint — AI import conflict resolution
- When AI proposes an answer for a field that already has content, both values are now shown side by side in the review panel
- Conflict fields default to "Keep current" (not auto-accept) to prevent silent overwrites
- Each conflict card shows a status badge while collapsed; click to expand, compare, and choose
- Non-conflict fields (AI-only answers) retain the existing accept/reject toggle behavior

---

## 2026-05-14 — PDF upload, nav links, admin review panels

### Blueprint — PDF upload (large file support)
- Added `pdfjs-dist` for client-side PDF text extraction
- PDF.js loaded dynamically; worker loaded from cdnjs CDN to avoid bundle bloat
- New `extractPdfText()` function extracts text page-by-page with progress callback
- New `extracting` stage shown during PDF parsing with live page progress bar
- File dropzone now accepts `.pdf,application/pdf` in addition to text files
- CHUNK_SIZE increased from 5,000 → 15,000 chars (3× fewer API calls for same document)
- MAX_CHUNKS cap of 30 (450,000 chars) with truncation warning shown in review panel
- Hint text updated: "Works with PDF, .txt, and .md files"

### Nav — direct links for logged-in users
- Operations, Agreements, and Join added to the desktop nav bar
- Edit profile link removed from desktop bar (still in hamburger dropdown)

### Admin role
- Oscar accounts reset to `joining` and manually restored to `admin`
- `is_admin()` RLS function correctly gates admin-only operations

## 2026-05-14 — Phase 0 Complete

### Platform identity clarified
MyCoNet is a **single-community portal** — one URL, one community, all users are members or prospective members of the same project. The platform lets a community share its blueprint, onboard new members, manage active projects, create collaboration agreements, track contributions, and decide together. Multi-community and inter-community features come in later phases.

### M00 — Dashboard (Live)
- Personal home screen for every logged-in member
- Role-scoped panels: Blueprint progress, profile completeness, join application status, active projects, collaboration proposals
- Modules displayed in numeric order with rainbow color scheme
- M02 and M03 shown as coming-soon with v1 external links
- Live counts pulled from M05, M06, M07

### M04 — Blueprint (Shared Community Document)
- Migrated from per-user blueprints to one shared community document
- Admin accounts (role: admin, circle_lead, project_lead) see the Blueprint in edit mode
- All other members see the same Blueprint in read-only mode
- `readOnly` prop added to `BlueprintClient` — skips auto-save, hides import/upload UI, shows "viewing community blueprint" notice
- Added `join_application_questions` field at step 1.4 (First Agreements) — admin writes one question per line; these appear on the M05 Join form
- AI document scanning (MiniMax M2.7) fills wizard fields from uploaded PDFs/docs; reduced chunk size to 5,000 chars, CONCURRENCY reduced to 2 to avoid MiniMax 524 timeouts

### M05 — Join (Application + Admin Review)
- Members see an application form (questions pulled from Blueprint step 1.4)
- Explorer gate: must create account to apply
- Submitted: shows status badge (pending / reviewing / accepted / rejected) and answers
- **Admin view**: full review panel at `/join` — filter by status, expand each applicant to read answers, add admin notes, accept / mark reviewing / decline
- Accepting sets `collaboration_agreements.status = 'accepted'` and updates `user_profiles.role` to `joining`
- RLS policies added: `is_admin()` function grants admin read-all + update-all on `applications` and update-role on `user_profiles`

### M06 — Agreements (Collaboration Proposals)
- Joining+ members browse projects open for collaboration and submit proposals (what I'll do + what I expect in return)
- One proposal per project per user (enforced by UNIQUE constraint)
- **Admin view**: full review panel at `/agreements` — shows all proposals across all projects, filtered by status (pending / accepted / active / completed / rejected)
- Each proposal shows the proposer's name, project name, work description, expected reward
- Admin actions: Accept → Active → Complete; or Decline at any stage
- Admin notes field on each proposal
- Status badge updates immediately in the UI (optimistic update)

### M07 — Operations (Project Management)
- Admin creates projects with title, description, open-for-collaborators toggle
- Project detail page: timeline updates feed (admin posts), right panel with settings and collaboration proposals
- Open projects with `open_for_collaborators = true` surface in M06 for member proposals
- Non-admin members see the updates feed and a "Propose collaboration" link if the project is open

### Role system
- Roles: `explorer` / `joining` / `resident` / `circle_lead` / `project_lead` / `admin`
- Oscar and Sonia accounts set to `admin`
- Logo routes logged-in users to `/dashboard`, logged-out users to landing page

### Module colors — rainbow order
Black → Brown → Red → Orange → Yellow → Green → Blue → Indigo → Violet → Pink → White → Silver → Gold
(M00–M13)

### Profile edit improvements
- OCEAN personality sliders restored to show pole labels (e.g. "Conventional / Curious & creative" for Openness)
- Myers-Briggs type field now has "click here to find yours" link → 16personalities.com

### Deployment
- Migrated from Vercel to Cloudflare Workers using `@opennextjs/cloudflare`
- Vercel Hobby capped function execution at 60s; Cloudflare Workers charge CPU time only — MiniMax 524 gateway timeouts resolved
- Deploy command: `cd web && npm run deploy`
- Live: `https://myconet.correa-oscar11.workers.dev`

### Documents updated
- `EXECUTIVE-SUMMARY.md` — v3.0, reflects single-community portal, live modules, core loop, tech stack
- `ARCHITECTURE.md` — v2.0, actual Supabase schema, RLS setup, routes, color order
- `EXECUTION-PLAN.md` — v2.0, Phase 0 marked complete, Phases 1–5 planned with specs

---

## 2026-05-10 — Execution Plan Created

### Stack decision
Staying on Supabase (auth + DB + realtime) and Next.js App Router on Cloudflare Workers — no separate backend while platform is finding its shape.

### Documents created
- `EXECUTION-PLAN.md` v1.0 — Phase-by-phase build plan

---

## 2026-05-08 — Module Structure Updated to 14 Modules (00–13)

### Three agents added
- **Quinn** (Module 11) — personal AI per member
- **MycoNet** (Module 12) — community brain + dashboard
- **Genesis** (Module 10) — Telegram bridge bot

### Documents updated
- `EXECUTIVE-SUMMARY.md` v2.0 — full 14-module table, 3 agents, user journey, approval flow
- `ARCHITECTURE.md` v1.1 — updated module specs, expanded DB schema

### Key architecture decisions
- Modular monolith with event-driven updates via PostgreSQL LISTEN/NOTIFY
- Two Telegram groups per community: Community Group (all members + Genesis) and Leadership Group (CM + Dept Leads + MycoNet + Genesis)
- MycoNet Pro tier: proactive push updates to Leadership Group on every module write

---

## 2026-04-13 — Executive Summary Created

- Created `EXECUTIVE-SUMMARY.md` — comprehensive feature breakdown
- Merged Module 5 (Feed) into Module 2 (Network)
- Modular Monolith chosen over microservices — complexity should match maturity

---

## 2026-04-11 — Project Start

- Created project folder `tribesplatform-v2/`
- Created README with project overview

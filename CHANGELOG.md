# MyCoNet core: changelog

Core releases. Semver: patch = fixes; minor = new features (off by default when they
change behaviour); major = something communities must act on, with upgrade notes.
A community's history before v4.0.0 is in its own `instance/log.md`. The same notes
are shown in the app at `/changelog` (`web/src/app/changelog/page.tsx`).

## v4.2.1 — 2026-11-04

**Migration:** `20261104000600_function_hardening.sql` (run `supabase db push`).

- Supabase security advisor fixes: `search_path` pinned on six functions; `handle_new_user()` and
  `rls_auto_enable()` no longer executable by `anon`/`authenticated` (they run as triggers).
- Left callable on purpose: `is_admin()` (used by RLS policies) and `promote_to_member_if_eligible()`
  (called by the app). Also recommended per community: Auth › Leaked password protection (paid plans).

## v4.2.0 — 2026-11-04

**Migration:** `20261104000500_community_branding.sql` (run `supabase db push`).

- **Community look.** `community_settings` (one row: `logo_url`, `banner_url`; public read, admin
  write) and a public `branding` storage bucket (admin upload, 5 MB, images only). Loaded once per
  request (`loadBranding`) and provided to client code (`useBranding()`).
- **Name and logo in the shell.** Top bar "MyCoNet · {displayName}" with the logo; the name in the page
  title, footer, sign-in and reset-password pages, landing hero and Home.
- **Banner image** (`BannerImage`) on the landing page, Home and the Dashboard; admins see a prompt
  while there is none.
- **Blueprint › Look & feel** setup step (`BrandingStep`) for the logo and banner. The Blueprint
  dashboard's setup notice is now a checklist (circles required; logo and banner optional).
  `BlueprintClient`'s `canEditCircles` prop is now `isAdmin`.
- **Core updates for community repos** (`.github/workflows/`, skipped in core itself):
  `core-update.yml` opens "Update MyCoNet core to vX" PRs (keeps `instance/`); `core-drift.yml` fails
  when a core file differs from the core release. `cd web && npm run upstream` sends a branch's core
  changes to core as a PR. See `instance.example/README.md` for the repo settings they need.
- `.gitignore`: `supabase/.temp/`.

## v4.1.0 — 2026-11-04

Join setup lives in the Blueprint. No database changes.

- **Application questions** (`join_application_questions`, Blueprint Step 1.4) now appear on the
  application form, one answer box each. Saved as `answers.q0…qN` plus `answers._questions` (the
  wording shown) and `answers.extra`; the admin review panel shows all of them.
- **Community values** are edited in Blueprint Step 1.4 (`CommunityValuesEditor`, table
  `community_values`; admins and circle leads). Removing a value removes its signatures.
- **Same flow without content:** Join step 1 and step 3 show a "no values / no questions yet — an admin
  adds them in the Blueprint" note with a link, instead of an empty list. Step 1 no longer blocks when
  there are no values.
- `/blueprint?step=<id>` opens the Blueprint on that step.

## v4.0.0 — 2026-11-03

First core release, extracted from RTRN's portal (RTRN v3.69).

- **Instances.** Each community's settings are in `instance/config.jsonc`;
  `web/scripts/instance.mjs` generates `web/wrangler.jsonc` and the public env vars
  before every build. `instance.example/` is the template, and its README is the
  new-community checklist.
- **Community name and credit** from settings (`core/lib/instance.ts`); no community
  names in core code. A neutral purpose text shows until the Blueprint has one.
- **Circles are data.** `circles` table (admin-write, retire with `archived_at`);
  events, booking items, org units and projects reference it; `lead_circles` checked
  by a trigger. Client: `useCircles()`; server: `loadCircles()`.
- **Blueprint › Circles setup step** (`INSTANCES.md` §6.2). The AI scan returns circles
  with a source quote; the admin confirms them, or starts from a template. The default
  template is the neighborhood org chart (8 circles, their roles created as teams).
  Lead names are kept as a note (`circles.leads_to_assign`) until people have accounts.
- **Database.** `supabase/migrations/` starts from one baseline
  (`20261104000000_myconet_core_baseline.sql`). `supabase/setup/first-admin.sql`
  makes a new community's first admin.
- **Removed:** M02 Neighborhood Directory and M03 Resources & Tools links.
- **Fixed:** the role check didn't allow `advisor`.

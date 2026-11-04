# MyCoNet core: changelog

Core releases. Semver: patch = fixes; minor = new features (off by default when they
change behaviour); major = something communities must act on, with upgrade notes.
A community's history before v4.0.0 is in its own `instance/log.md`. The same notes
are shown in the app at `/changelog` (`web/src/app/changelog/page.tsx`).

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

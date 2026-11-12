# MyCoNet core: changelog

Core releases. Semver: patch = fixes; minor = new features (off by default when they
change behaviour); major = something communities must act on, with upgrade notes.
A community's history before v4.0.0 is in its own `instance/log.md`. The same notes
are shown in the app at `/changelog` (`web/src/app/changelog/page.tsx`).

## v4.12.2 — 2026-11-12

**Database:** `20261113000000_auth_email_log.sql` (new `auth_email_log`, admin-read; written by the
portal's server with `CALENDAR_SYNC_SECRET`; without that secret resets still work, unlogged).

- **Change password** (`/account/password`, in the user menu) while signed in; asks for an emailed code
  only when Supabase requires a fresh sign-in.
- **Reset page** accepts `?code=` (PKCE, from the site) and `#access_token=` links (admin or dashboard
  resets), and explains expired or used links (once, one hour, same browser).
- **"Forgot password?"** goes through `/api/auth/forgot`, which records each request: what was typed,
  exact account match, a Gmail-spelling near-match (dots, +tags, googlemail), and any error.

## v4.12.1 — 2026-11-12

- **Calendar filters are checkboxes**: tick any mix of Daily events, Core events, Community hosted and
  Tasks, and untick categories ("Food"…) to hide them. Everything is ticked by default. The URL is now
  `?show=daily,core`; old `?tab=core` links still work.

## v4.12.0 — 2026-11-12

**Database:** `20261112000000_event_categories.sql` (kind `daily`, `events.category`, `calendar_feeds.rules`;
`calendar_feeds_claim` recreated, `calendar_feed_apply` replaced).

- **Daily events**: a new calendar tab, first in the list, for the community's rhythm (meals, movement,
  focus hours). Posted by the same people as core events.
- **Categories** ("Food", "Movement", "Focus hours"…) on any event: filter chips in each tab, a colour per
  category, a badge on the event, and a field on the form for daily events.
- **Sorting rules** for linked calendars: "titles containing breakfast, lunch, dinner → Daily events, Food".
  The first matching rule wins; everything else uses the feed's own calendar.

## v4.11.0 — 2026-11-11

**Database:** `20261111000000_calendar_feeds.sql` (new `calendar_feeds` table; `events.feed_id`,
`events.external_uid`; sync functions). **Setup:** optional `CALENDAR_SYNC_SECRET` Worker secret and
`supabase/setup/calendar-sync-key.sql` for hourly refresh; without it, admins sync with "Sync now".

- **Linked calendars** (Calendar › 🔗 Linked calendars, admins): link a Google Calendar or any iCal
  feed and its events show on the community calendar for the next 90 days. Repeating events,
  time zones, one-off changes and cancellations follow the source; events named like a circle
  ("Farming Circle") go in that circle. Choose which calendar tab they show in and whether
  visitors can see them. Refreshes about hourly when someone opens the calendar, or on "Sync now".
  Linked events can't be edited in MyCoNet; change them in the source calendar.
- Setup checklist: set up custom SMTP, since Supabase's built-in mailer sends only ~2 emails an hour.

## v4.10.1 — 2026-11-11

No database changes.

- **Working rules for contributors and AI coding agents**: a "Working on the code" section in
  `README.md`, a rules block at the top of `CLAUDE.md`, and a new `AGENTS.md`. Work on a branch,
  open a pull request, never push to `main`; agents don't merge, deploy or run live migrations
  unless asked; community repos change only `instance/`.

## v4.10.0 — 2026-11-05

No database changes.

- **Module overview** (`modules/home/ModuleOverview.tsx`, data in `modules/home/lib/module-guide.ts`) on
  the landing page and Home: every module with a one-line explanation, "See it ↓" (scrolls to its
  preview section) and "Open →"; plus an "Ask <community>" card.
- **Ask section** (`modules/home/AskSection.tsx`) with example questions that open the assistant.
- Fixed core leftovers from RTRN: demo panels said "Greenhollow Commons" (now the community name), and
  the landing Join preview always showed RTRN's values (now the community's `community_values`, else
  labelled examples).

## v4.9.0 — 2026-11-05

**Migration:** `20261105000200_assistant_questions.sql` (run `supabase db push`).

- **Question log** `assistant_questions` (question, answer, `answered`, `status` open/resolved/dismissed,
  `admin_note`, `user_id` or null for visitors). Admin-only read/update; written by
  `assistant_log_question()` from `/api/assistant` when an answer finishes.
- **Uncovered answers:** the assistant ends replies the sources don't cover with `[[NOT_COVERED]]`; the
  route strips it from the stream (held back across chunks) and logs `answered = false`. Tested on the
  handbook: 5/5 correct, incl. a Spanish question.
- **Admin › Questions** (`app/admin/questions`, `modules/admin/QuestionsAdminClient.tsx`) with
  `AdminTabs` (Users | Questions, open-question badge) and a sidebar link.

## v4.8.0 — 2026-11-05

No database changes.

- **Top bar search** (`core/components/shell/TopBarSearch.tsx`), replacing a placeholder that did nothing:
  pages (`core/lib/nav.ts`) and circles match instantly; members (username, first name, headline),
  projects, proposals and events are queried with the viewer's session (RLS) after 200 ms. The last item
  sends the text to the assistant (`ASK_EVENT` in `modules/assistant/AssistantChat.tsx`). ⌘K/Ctrl+K,
  arrows, Enter, Esc.

## v4.7.0 — 2026-11-05

**Migration:** `20261105000100_share_image.sql` (run `supabase db push`).

- **Top bar** height is `--topbar-h` (68px; 60px on phones), was 56px; logo 44px tall, community name 18px.
- **Link previews:** root layout `generateMetadata` adds Open Graph + Twitter card tags (`metadataBase` from
  `NEXT_PUBLIC_APP_URL`); image = `community_settings.share_image_url`, else `banner_url`. The logo is the
  favicon. Look & feel has a "Link preview" upload (1200 × 630).

## v4.6.0 — 2026-11-05

**Migration:** `20261105000000_portal_assistant.sql` (run `supabase db push`).

- **Portal assistant** (`modules/assistant/`, `app/api/assistant`): streamed answers from the Blueprint
  and the document library via MiniMax-M3.1-Flash (low reasoning); cites sources; 2 questions for
  visitors (per hashed IP, 30 days), 200/day signed in. See `modules/assistant/README.md`.
- **Document library** `community_documents` (`everyone` | `leads`; RLS: leads = admins + circle
  leads read/write all, others read `everyone`). `private.assistant_usage` + `assistant_count_question()`.
- **Every upload asks** "What kind of document is this?" (Shareable / Sensitive / for the Blueprint
  import also "Don't add it"); Blueprint › 📚 Documents to manage the library.
- `extractPdfText` moved to `m04-blueprint/lib/pdf-text.ts`.
- Tested: RLS (visitor and member see shareable only, circle lead sees both; counter 1/2/3) and answers
  on the Protopia handbook (first words in 1–2 s, page-cited, answers in Spanish, declines off-topic).

## v4.5.0 — 2026-11-05

No database changes.

- **Two models.** `/api/scan` takes `mode`: `fast` = MiniMax-M3.1-Flash with `reasoning_effort: 'low'`
  (quote gathering), default `full` = MiniMax-M3 (answers, image choice). With full reasoning, M3 and
  Flash both spent the whole 24k-token reply thinking on a 70-page, 110k-character handbook and never
  produced the JSON; Flash at low reasoning returned 42 questions' evidence, 9 circles and a summary
  in 19 s. M3 ignores `reasoning_effort`.
- **Evidence per framework phase** (parts × phases, in parallel), so one reply never carries quotes for
  all ~150 questions. The first phase's request also writes the summary and finds circles.
- **Smoother import.** Choosing a file starts the scan; the PDF image search runs alongside it.
  `scanDocument` reports `{ step, done, total, finished, found }`; the modal shows a live checklist
  (read → quotes → answers → logo & banner) with an elapsed timer.
- **Answers in groups of ≤20 questions**, requests pooled (6 in flight). Handbook dry run (70 pages,
  148 questions): 136 s, 96 answered (83 high / 13 medium confidence), 26 gaps, 8 circles, 0 failures.

## v4.4.0 — 2026-11-05

No database changes. Uses **MiniMax-M3** (`/api/scan`, `/api/governance/ai-check`).

- **Two-pass document scan** (`modules/m04-blueprint/lib/doc-scan.ts`). Pass 1 (evidence): the
  document is read in parts of ≤150k characters (most documents: one part); per question, up to 3
  verbatim quotes with page numbers, plus a summary and circles. Pass 2 (answers): one request per
  framework phase, in parallel, writing each answer from all its quotes with `confidence`
  (high/medium/low), `pages`, `conflict` and `why`. Unanswered written questions are returned as gaps.
  Each request is retried once; failures leave the rest of the results in place.
- PDF text carries `[Page N]` markers; the review shows confidence, pages and conflicts per answer,
  low-confidence answers start unticked, and a "not covered" list shows the gaps.
- `/api/scan`: prompt limit 200k characters (was 25k, which made every full-catalog scan fail with
  "Prompt too long"); optional `images` (≤12 small data URLs) and `maxTokens`.
- **Images:** `aiPickBranding()` asks M3 (vision) to pick the logo and banner from the rule-ranked
  candidates. Extraction scales images while drawing, skips raw images over 12 MP, reads at most 30 pages
  or 60 s, and can be skipped.
- Tested against M3: a 3-page sample (8/9 answered with pages, conflict flagged) and a 100-page,
  148-question document (1 evidence call + 4 answer calls, 0 failures, ~4 min).

## v4.3.1 — 2026-11-04

- `core-update.yml`: opens the PR against the repo's default branch (runners have no `origin/HEAD`,
  so v4.3.0's run pushed its branch but couldn't open the PR), and retries reuse a leftover branch
  instead of assuming the PR exists.

## v4.3.0 — 2026-11-04

No database changes.

- **Logo and banner from imported PDFs.** Full Blueprint imports by admins run `lib/pdf-images.ts`
  after the text: pdf.js image objects from the first 20 pages (up to 40 images, 48 px minimum),
  de-duplicated by an 8×8 average hash, scaled to 2400 px max and kept under the upload limit.
  `suggestBranding()` ranks banners (≥ 800 px wide, aspect ≥ 1.3, by size) and logos (repeated across
  pages, on the cover, transparent; large single photos penalised). The review shows up to six of each;
  best guesses are preselected only where the community has no logo/banner yet.
- `lib/branding-upload.ts` (`setBrandingImage`, `clearBrandingImage`) is shared by the Look & feel step
  and the import.

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

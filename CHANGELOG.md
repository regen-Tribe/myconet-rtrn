# MyCoNet core: changelog

Core releases. Semver: patch = fixes; minor = new features (off by default when they
change behaviour); major = something communities must act on, with upgrade notes.
A community's history before v4.0.0 is in its own `instance/log.md`. The same notes
are shown in the app at `/changelog` (`web/src/app/changelog/page.tsx`).

## v4.33.5 — 2026-11-18

- **Closing a loose task goes back to the board, not the chores page** (Oscar). A circle's one-off tasks live in its
  hidden chores project; opening one shows its pop-up over that project's page. Closing it (×, Esc, Cancel, Save,
  Delete) now goes back to where it was opened: the board with its filter, the meeting page, the calendar or the task
  list (in-app links carry `?back=1`), or to the board filtered to the task's circle (a link from an email). A chores
  project's page opened on its own goes straight to the board. Tasks in real projects behave as before.

## v4.33.4 — 2026-11-18

- **The task pop-up fits the screen** (Oscar: too long to see everything, on web or a phone). It's never taller than the
  window (`100dvh`, so a phone's browser bars count): the middle scrolls, while the header (×) and the Save / Delete
  buttons stay in view. The New task pop-up gets the same height limit. Both get a lighter, blurred backdrop
  (DESIGN-SYSTEM.md principle 0: minimal and modern, like Apple).

## v4.33.3 — 2026-11-18

- **A meeting's summary looks like a summary** (Oscar: "looks ugly"): Fireflies writes it as "- **Topic:** …" bullets,
  which the page showed as raw text with the `-` and `**`. Each topic is now a card with its heading, two or more to a
  row on a wide screen, one on a phone, topped in the circle's colour (`m18-meetings/SummaryCards.tsx`). A summary in
  another shape is shown formatted as a note (`NotesText`).

## v4.33.2 — 2026-11-18

- **Slide a draft on the meeting page too** (Oscar): the tasks under a meeting get the same Draft pill as the board
  (right to approve, left to decline, with Undo). Only an admin, the project's circle lead or its project lead can
  slide it (worked out in `app/meetings/[id]/page.tsx`, as `core/lib/ops-permissions.ts` does on the board).

## v4.33.1 — 2026-11-18

- **The 🧭 Project manager panel starts collapsed** on the operations page (Oscar); **Show** opens it. A circle
  page's "🧭 Project manager" button (`/ops?circle=…#pm`) still opens it straight away.

## v4.33.0 — 2026-11-18

- **Approve or decline a draft from its pill** (Oscar: "slide left to decline, slide right to approve"). On the board,
  the task list and the project page, a lead or admin slides a task's **Draft** pill right to approve it (it stays,
  no longer a draft) or left to decline it (deleted after 5 seconds, with **Undo**); the arrow keys do the same.
  Sliding the pill doesn't drag the card or open the task. Everyone else sees the plain pill (`m07-ops/DraftSwipe.tsx`).
- **A declined or deleted task stays gone**: its meeting link now stays without a task, so running the meeting
  again (e.g. when Fireflies' summary arrives) doesn't draft it again. **Migration**
  `20261203000000_declined_drafts_stay_declined.sql` (`meeting_action_links.deliverable_id` → on delete set null).
- **Sign-up says when an address already has an account** (Sonia, #29; two Protopia people said "the link never came"):
  instead of "Check your inbox" (Supabase sends nothing then), it offers **Sign in** and **Send me a reset link**.
  "Check your inbox" gets **Send it again**, and sign-in's "Email not confirmed" offers to resend the link. A resent
  link (no PKCE code, `#access_token=`) signs in on `/auth/login`, as `/auth/reset-password` does. No migration.

## v4.32.1 — 2026-11-18

- **The meeting agent runs only in the sweep, with its full time** (Sonia; a 40-minute Protopia meeting timed out and
  waited for a lead). The three Fireflies routes (`/api/fireflies-ingest`, `/api/fireflies-webhook`,
  `/api/fireflies-events`) no longer run the pipeline in `after()` with 22 s for the AI: they save the notes and the
  meeting waits (`processed_at` null, `sweep_attempts` 0; `queueForAgent()` in `lib/refresh.ts`). The sweep gives the AI
  150 s (was 90 s) and runs **every 2 minutes** (was 10). A lead's "let the agent read it" gets 120 s (was 60 s).
- **A meeting the AI couldn't read is tried again**: when the AI gives no answer (too slow, down, unreadable), the
  pipeline leaves `processed_at` null instead of parking the meeting, so the sweep tries again, at most 3 times in all.
  A meeting the agent judged not a community meeting still waits for a lead as before.
- **`/api/fireflies-ingest` refreshes a meeting it already has** instead of skipping it: an upload (its id as
  `client_reference_id`) or the same Fireflies id gets the newest notes, and the agent reads it again when the summary is
  new. A community filter in front of the ingest (Protopia: Sonia's divider) can then be the only webhook Fireflies needs;
  `/api/fireflies-events` stays for communities that use it.
- The meetings list shows **Agent reading soon** for a meeting that has just come in. **Migration**
  `20261202000000_meetings_sweep_every_2_min.sql` (reschedules `myconet-meetings-sweep`).

## v4.32.0 — 2026-11-18

- **`npm run upstream` no longer corrupts a patch** (Sonia): the script trimmed the diff, which could cut a last
  context line that is a single space. It now sends the diff as git wrote it, and stops if `git diff` fails.
- **A priority on each task**: a four-step slider in the task pop-up (None · Low · Med · High; leads set it), shown
  as a badge on the board card, the task list and the project page. The project manager reads it and the circle's
  `board.md` shows it; Ask / Do can set it. `deliverables.priority` (default `none`).
- **Assign a task to someone who isn't on MyCoNet yet** (asked for in Protopia: some people haven't made accounts).
  The pop-up's **Assigned to** gets "✏️ Type a name…": the name is only a tag on the task (no account, no invite),
  shown dotted on the board, the task list, the project page and the calendar. Choosing their account later clears
  it (trigger `deliverables_one_assignee`). **Meetings** now put a name without an account there instead of
  "(for Luis)" in the title, and the migration moves the old "(for …)" titles across. The project manager sees these
  names and may suggest the account once that person joins; Ask / Do can set one. **Migration**
  `20261201000000_task_name_tag_priority.sql` (`deliverables.assignee_name`, `deliverables.priority`).

## v4.31.0 — 2026-11-18

- **The task pop-up** (asked for in Protopia: opening a draft from a meeting should let you set its status and who
  has it, and add notes): **Status**, **Assigned to** (everyone, shared admin accounts left out; "Me" first) and
  **Notes**. Leads (admins, circle leads, project leads) edit everything as before, and saving a draft confirms it.
  **The person a task is assigned to** can change its status and notes, nothing else
  (`update_my_task()`, security definer). A task's notes also show under it in the circle's `board.md`; Ask / Do can
  set notes. **Migration** `20261130000000_task_notes.sql` (`deliverables.notes`, `update_my_task`).

## v4.30.0 — 2026-11-17

- **Every circle has its space in the second brain** (Oscar: "while you use the operating system, it also keeps
  your second brain up to date"; the second brain's structure should stay functional and organised for the agents
  that scan it). `circles.brain_folder` (null = the slug); `m07-ops/lib/circle-space.ts` keeps `<folder>/README.md`
  (the circle's index: purpose, leads, board and meeting links, projects with open counts, recent meeting notes,
  what's in the folder; written whole when missing, otherwise only the part between the `myconet:circle` markers)
  and `<folder>/board.md` (the board status, moved from `knowledge.boardFolder/<Circle>.md`, the old copy removed).
  A new folder gets a line in the second brain's README map. Trigger `circles_request_brain_update` queues a review
  for a new, renamed, retired or moved circle, so it gets its space within 10 minutes whichever way it was made.
  Board status names tasks by title (no more "T3"). Ask / Do can set a circle's folder.
- **Migration** `20261129000000_circle_folders.sql`.

## v4.29.0 — 2026-11-17

- **Ask / Do: anything the person may do** (Oscar: "the MyCoNet agent should be able to do anything on MyCoNet that
  that user's permissions allow"; it couldn't assign a circle lead). New general changes (`lib/do-catalog.ts`):
  update any catalogued field (people's role and `lead_circles`, circles, org-chart units, projects, tasks) and
  add / remove org-chart members. Made **with the person's own Supabase session**, so RLS and the profile guard
  trigger decide; the card shows before → after; Undo restores as the person. Logged `do_update` /
  `do_add_member` / `do_remove_member` with `as_user`. Next for the catalogue: events, bookings, governance.

## v4.28.0 — 2026-11-17

- **Ask / Do: create a circle** (asked for in Protopia): admins **and circle leads** can tell the agent to create a
  circle (name, one-line purpose → its org-chart description, emoji). It's made like **+ Add circle** (free slug and
  colour, org-chart unit by the trigger); the agent asks when the purpose isn't clear; **Undo** retires it
  (`archived_at`), circles are never deleted. No database change.

## v4.27.0 — 2026-11-17

- **+ Add circle** for admins on Operations › Circles and the `/org` chart (asked for in Protopia, for an Incubator
  circle): name, one-line purpose (the org-chart description the meeting agent and the project manager read), emoji;
  a free colour; its org-chart unit is made by the existing trigger. Before, circles were added only in Blueprint ›
  ◯ Circles. No database change.

## v4.26.0 — 2026-11-17

- **Ask / Do** (Phase 7 step 3; asked for in Protopia: "message the agent from MyCoNet to tell it to group the 4
  element project and 5 senses project"). Signed-in members get a **Do** tab in the assistant: an instruction in
  plain words → `/api/agent/plan` proposes changes on a **confirm card** (described by MyCoNet, not the AI; changes
  this person may not make are marked) → **Do it** → `/api/agent/do` re-checks every change with the person's own
  rights, makes it, logs it in `agent_actions` with the rows' previous values → **Undo** on the card or in the 🧭
  panel. Changes: merge / rename / create projects, move tasks (into a project or onto the main board), rename,
  assign, date, status, confirm drafts. No database change. Details: `web/src/modules/assistant/README.md`.

## v4.25.1 — 2026-11-17

- Project manager: shared accounts (a name or username with "admin") are never suggested to take a task; board
  notes' file names collapse spaces ("Vision & Strategy" → `Vision Strategy.md`).

## v4.25.0 — 2026-11-17

- **The project manager** (asked for in Protopia: "review existing tasks every time new tasks come in and manage
  like a professional project manager"). When a meeting adds tasks to a circle, the agent reviews that circle's
  whole board (one AI call per circle, every 10 minutes for waiting circles: `private.board_review_sweep()` →
  `/api/ops/board-review`).
  - **Does the safe things itself**, logged and undoable: merges duplicates that are both its own drafts; files a
    board task or a draft into a project of the circle when very sure (with a reason).
  - **Suggests the rest** to the circle's leads: new projects for groups of tasks, other merges and moves, who could
    take a task nobody has. **🧭 Project manager** panel on the board (Accept / Dismiss, Undo for its changes);
    a **🧭 Project manager (N)** button on each circle in Operations › Circles and `/org` for its leads.
  - **Second brain:** `knowledge.boardFolder/<Circle>.md` (default `operations/board`): status, projects and their
    tasks, the board, open suggestions; rewritten in place each review.
- **Migration** `20261128000000_board_review.sql`: `agent_suggestions`, `board_reviews`,
  `agent_actions.undone_by`, `private.board_review_sweep()` and its schedule (same Vault secrets as the meetings
  sweep).

## v4.24.3 — 2026-11-17

- **Meeting tasks and projects** (Oscar: "group things when you are very sure"): the main board stays the default,
  but the agent may put a task into an open project of the same circle when it is very sure it's part of that
  project's work (the meeting names it, or the work is unmistakably a piece of it). It must give a
  `project_reason` (logged in `agent_actions`); without one, or for another circle's project, the task goes on
  the main board.

## v4.24.2 — 2026-11-17

- **Fix:** Fireflies' action-item headings that aren't people ("Unassigned", "Everyone", "Team", "<Name> Circle")
  were taken for a person, so tasks got "(for Unassigned)" in their title. They now mean no person, in the AI's
  answer and without it. (Protopia: 73 existing titles cleaned in the database.)

## v4.24.1 — 2026-11-17

- **Meeting tasks always on the main board** (asked for in Protopia): the agent no longer files a task into a
  matching project (where it was a subtask); every meeting task goes to its circle's Chores, i.e. a card on the
  main board tagged with its circle (v4.24.0). Open projects stay in the prompt as context only.

## v4.24.0 — 2026-11-17

- **Circle tasks on the main board** (asked for in Protopia): the tasks in a circle's Chores project (from meetings
  or **+ Task**) were hidden inside one "<Circle> Chores" card. Now each is a card of its own on the main board, in
  its own status column, with its circle's tag, person, date and Draft badge; the circle, My role and At risk
  filters apply; drag it with the same rights as the project; it opens the task pop-up. Chores projects aren't
  shown or counted as projects. No database change: the tasks already there show up as cards.

## v4.23.1 — 2026-11-17

- **Fix:** the real reason meetings stopped before their note: a Worker may make only **50 outside calls per
  request** (Cloudflare free plan) and the pipeline made about five per task. Tasks, their links and their log
  entries are now written in one call each; a renamed meeting's old files are found with one repo listing; the
  sweep does one meeting per request, and the database sends one request per waiting meeting (migration
  `20261127000000_meetings_sweep_per_meeting.sql`).

## v4.23.0 — 2026-11-17

- **Meeting names:** the agent names each meeting from the title people gave and the content, after the date:
  `17.11.2026 Kitchen lead handover and stock routines`. `original_title` keeps what they called it.
- **The whole meeting in the second brain:** the note now has topics, keywords, Fireflies' bullet points, notes and
  outline as well as the summary, tasks and action items, and links the **transcript**, saved in
  `transcripts/` beside it (asked for by Oscar; the assistant's library has it leads-only). The folder is a setting,
  `knowledge.meetingsFolder` (default `operations/meetings`). A renamed meeting or moved folder moves the note: the
  agent removes its own old files (never a person's).
- **The sweep:** webhooks' runs could stop before the note (a Worker gets about 30 s after replying; Protopia's
  first six direct meetings have tasks but no note). `/api/meetings/sweep` (secret `MEETINGS_SWEEP_SECRET`) is
  called every 10 minutes by the database (pg_cron + pg_net; URL and key in Vault, see the migration) when a
  meeting is unprocessed or its note is older, refreshes missing Fireflies notes and gives the AI 90 s.
- A Fireflies heading such as "Kitchen Circle" is no longer taken for a person ("(for Kitchen Circle)").
- **Migration** `20261126000000_meeting_names_and_sweep.sql`: `original_title`, `notes_version`,
  `sweep_attempts`; pg_net + pg_cron; `private.meetings_sweep()` and its schedule (does nothing until the
  Vault secrets exist).
- Design goal: the second brain is part of the offering, used **through MyCoNet or any agent tool**.

## v4.22.1 — 2026-11-17

- **Fix (privacy):** `/api/fireflies-events` added any meeting it didn't know, so a Fireflies account that also
  records other calls (Protopia's: Sonia's account behind her filter) would have sent all of them in, past the
  filter. It now only updates meetings already in (an upload, or one `/api/fireflies-ingest` let in); anything
  else gets `skipped` and is never fetched or saved. A malformed `client_reference_id` no longer errors.
- `/api/fireflies-ingest` also stores Fireflies' extra notes (the tabs), for meetings forwarded after the summary.

## v4.22.0 — 2026-11-17

- **Meeting documents in tabs** (asked for in Protopia): the meeting page's Transcript box becomes a row of tabs, one
  per document there is: Fireflies' **Notes**, **Outline**, **Bullet points**, **Topics & keywords**, the
  **Second brain** note (read from the repo as it is now) and the **Transcript**. The first document opens; the
  transcript only when asked.
- Fireflies' extra notes are fetched by `/api/fireflies-events` (`meeting.summarized`) in a query of their own, so
  a field Fireflies doesn't fill can't stop the transcript and summary. New column `fireflies_notes`
  (**migration** `20261125000000_meeting_fireflies_notes.sql`; `supabase db push`). Meetings already in get theirs
  on Fireflies' next webhook, or when it's sent again.
- `NotesText.tsx`: their markdown as React elements, never HTML.

## v4.21.2 — 2026-11-17

- **Fireflies summaries arrive after the transcript.** The upload and ingest webhooks fire when the transcript is
  ready, before Fireflies has written the summary and action items, so meetings came in with the transcript only
  (Protopia's first two had no summary and no action items). New `/api/fireflies-events` for Fireflies
  **Webhooks V2** (`meeting.transcribed`, `meeting.summarized`, HMAC-signed with the new secret
  `FIREFLIES_SIGNING_SECRET`): it fetches the notes again (never blanking ones already in), adds a direct
  recording that isn't in yet, and runs the meeting pipeline again (no duplicate tasks; the note is updated; the
  email still goes once). Set it up in Fireflies: `app.fireflies.ai/integrations/api/webhook`. Details:
  `web/src/modules/m18-meetings/README.md`.

## v4.21.1 — 2026-11-17

Review of v4.20.0–v4.21.0:
- **Fix:** a lead who sets the circle on a meeting the agent skipped now gets its tasks; the agent can no longer
  answer "not a community meeting" over a person's choice.
- **Fix:** clearing a meeting's circle also turns off Circle only (it would have hidden the meeting from everyone but
  admins).
- **Fix:** dates without a time (Home's task list, the board's At risk count, a project's deadline) were read as
  midnight UTC, a day early west of UTC; they now use `core/lib/tasks.ts` like the rest.
- Less duplication: one `one()` for PostgREST embeds (`core/lib/rows.ts`), one `DraftBadge`
  (`core/components/DraftBadge.tsx`), one `NotesTask` shape for the note and the email, one `transcriptFields()`
  for both Fireflies routes; the unused `email: 'skip'` is gone.
- Web/mobile check: the circle's **Meeting notes** button sits under the circle name in Operations › Circles (it
  squeezed long names), the org chart's steward circle has one too, and both use one `MeetingNotesLink`.

## v4.21.0 — 2026-11-17

- **The meeting pipeline** (Phase 7 step 4 of the agent plan; rewrites the goals of Sonia's Protopia PR #53). Most
  meetings arrive straight from Fireflies; when the notes are in, the MyCoNet agent makes sense of them and puts the
  work on the board. Details: `web/src/modules/m18-meetings/README.md`.
  - **The agent reads the whole meeting** (action items + summary + transcript) against the circles, open projects
    and open tasks (MiniMax M3.1-Flash, one call): is it a community meeting (no or unsure → it waits for a lead,
    nothing is posted or emailed), its main circle or community-wide, and the tasks, **each in its own circle**'s
    best-matching project or Chores, with the person and any date/time said. Skips what's on the board; adds what
    was agreed but missed. Drafts (`needs_review`, `source='meeting'`). A circle a person chose is kept.
  - People without an account keep "(for Name)" in the task title; the email lists them as not on MyCoNet yet.
  - **Second brain note** (`knowledge.repo` + `SECOND_BRAIN_GITHUB_TOKEN`): summary + tasks grouped by circle with
    links, never the transcript.
  - **Notes email** to the leads of the circles involved, at their account email (+ `alwaysTo`), over SMTP from the
    Worker (Sonia's `lib/smtp.ts`, unchanged). Needs `meetings.notesEmail` + `MEETINGS_SMTP_PASSWORD`.
  - **Circle only** meetings: just the circle's members (its teams), its leads and admins can read them (RLS).
  - `/meetings`: circle chips, My circles, All, search, Needs review. **📝 Meeting notes (N)** on each circle (/org,
    Operations › Circles). Meeting page: the agent's circle choice and reason, the tasks on the board, and for leads:
    circle, Circle only, let the agent read it / look again, confirm all drafts, email again. Upload: circle optional
    ("let the agent choose"). Board: **Drafts** card; Deliverables tab links each task and filters drafts; a task
    shows "📝 From a meeting".
  - `agent_actions`: everything the agent did (admins read it).
  - New settings: `timeZone`, `knowledge`, `meetings.notesEmail`. Migration `20261124000000_meeting_pipeline.sql`.

## v4.20.0 — 2026-11-17

- **Task data, for the agent and the calendar** (first step of the MyCoNet agent plan). Tasks stay on the task board and
  events stay on the calendar; the calendar only *shows* dated tasks.
  - Board tasks (`deliverables`) get `due_time` (local time of day, only with a date), `circle` (defaults to the
    project's circle, by trigger), `source` (`person` · `agent` · `meeting`), `source_meeting_id` + `source_item`
    (a meeting's action item), `needs_review` (a draft a lead confirms) and `created_by`.
  - **Chores projects:** `projects.is_chores`, one per circle (unique), made the first time someone adds a one-off
    task through `public.chores_project(circle)` (admins, circle leads, project leads: the same people who can add
    tasks). The board's new **+ Task** button uses it ("kitchen clean-up Saturday 4 PM" → Kitchen chores).
  - Task pop-up on a project: time, circle, "Draft" badge (saving confirms it); cards and the Deliverables tab show the
    time. `/ops/<project>?task=<id>` opens a task.
  - **Calendar Tasks layer:** the Tasks checkbox now shows dated board tasks (☐ / ✓, all day without a time, a
    30-minute slot with one); clicking one opens it on the board. New events can no longer be calendar "tasks"
    (the form points to the board); existing task-kind events still show and can be edited.
  - Task dates are read as local dates (`core/lib/tasks.ts`); `new Date('2026-11-21')` showed the day before west
    of UTC.
  - Migration `20261122000000_task_data.sql` (safe to re-run; backfills task circles from their projects).

## v4.19.0 — 2026-11-17

- **Meetings (M18, Sonia's)**, recovered from the build she deployed to Protopia on Nov 16 (from an old checkout,
  which rolled Protopia back to v4.10.0). Optional module: `instance/config.jsonc` `"modules": ["meetings"]` →
  `NEXT_PUBLIC_MODULES` (`core/lib/modules.ts`); off means no sidebar entry and 404s. Pages `/meetings`,
  `/meetings/[id]`, `/meetings/upload`; routes `/api/meetings/upload`, `/api/fireflies-webhook`,
  `/api/fireflies-ingest`. Changes from her build: webhook URL from `NEXT_PUBLIC_APP_URL` (was hard-coded),
  Supabase URL from env, uploads need joining or above (as the pages do), the webhook always needs its secret.
  Migration `20261121000000_meetings.sql` (safe to re-run over her hand-made table and bucket); reading is now
  joining members and above (was every signed-in person).
- **Newest code for everyone working on it:** `npm run start-work` (run automatically by Claude Code's
  SessionStart hook in `.claude/settings.json`) pulls when safe, lists others' recent commits, open PRs and fresh
  branches with file overlaps, and checks the live portal's commit. `npm run deploy` / `upload` / `deploy:cf` now
  run `scripts/deploy-check.mjs` first: refuses a dirty, unpushed, behind or non-main checkout, live code that
  isn't in your history, or a version older than live (`MYCONET_DEPLOY_FORCE=1` to override). `/api/version`
  reports `{ version, sha }` (`NEXT_PUBLIC_GIT_SHA` from `scripts/instance.mjs`). AGENTS.md / CLAUDE.md rules
  updated (start-work, concurrent work, deploys, migrations only, logging new secrets).

## v4.18.2 — 2026-11-16

- Working rules for people and AI agents (`CLAUDE.md`, `AGENTS.md`, `README.md`): check what others changed before
  starting; ask "core too, or only this community?" for every change; community-only changes go in `instance/` and
  are logged in `instance/LOCAL-CHANGES.md` (new; starter in `instance.example/`). Maintainers (Oscar, Sonia) push
  checked changes straight to a community repo's main and may merge core PRs. Docs only, no app changes.

## v4.18.1 — 2026-11-16

- Events Week view (`CalendarViews.tsx`): wider than 640px it's a Google-style time grid (`WeekGrid`, 44px per hour,
  overlap columns, all-day/multi-day strip, now line, sticky day header and hour gutter, scrolls to 7am or the week's
  earliest event). Phones keep the day cards (`WeekCards`); switched by `.ev-week-grid` / `.ev-week-cards` in globals.css.

## v4.18.0 — 2026-11-16

- Events: **Add from a photo** (`PhotoImportModal.tsx`, `/api/events/photo`). The photo is shrunk to 2000px in the browser,
  read by MiniMax-M3.1-Flash (low reasoning, with the week's event titles and circle names as spelling hints), reviewed
  row by row, inserted as the signed-in person, then pushed to Google via `/api/calendar-push` (`saved`).
- Migration `20261120000000_events_from_photo.sql`: `circles.hosts_events` and `public.can_add_events_from_photo()` —
  admins, account leads of the hosting circle, and anyone in that circle or its teams (`org_unit_members`).
  Admins choose the circle at the bottom of Linked calendars. Off (admins only) until a circle is chosen.

## v4.17.7 — 2026-11-15

- Events: weeks start on Monday (`startOfWeek` in `m14-events/lib/calendar.ts`; month header uses `WEEK_LABELS`).

## v4.17.6 — 2026-11-14

- Reverts v4.17.5: the category checkbox row above the calendar is back.
- Event form: Category is a select of `DAILY_CATEGORIES` (plus the event's own old category when editing), not free text,
  so members can't create new categories. Linked-calendar rules can still set categories.

## v4.17.5 — 2026-11-14

- Events: the category checkbox row above the calendar is removed (adding an event category no longer adds a filter there).
  Categories still colour events and appear in the legend.

## v4.17.4 — 2026-11-14

- Profile › Edit step 3: the OCEAN / Big Five section links to https://bigfivepersonality.me/ (like the Myers-Briggs link).

## v4.17.3 — 2026-11-14

- The website crawl's first request (home page + sitemap) times out after 60s with a clear message. A JavaScript-only
  site (e.g. rtrn-chat.vercel.app, a React app) has no server-side text and now fails fast with "no readable text".

## v4.17.2 — 2026-11-14

- Website crawl (`m04-blueprint/lib/site-crawl.ts`): caps addresses tried (450) and time (5 minutes) as well
  as pages read, and times out a batch after 45s. Failed addresses used not to count, so a large sitemap of
  dead or non-HTML links kept an RTRN scan going for 72 minutes. Progress shows pages read and tried.
  Tested: ic.org stops at 121 pages in 62s (text cap).

## v4.17.1 — 2026-11-14

- Event detail: "🕒 Change time" is an outlined button instead of a small text link.

## v4.17.0 — 2026-11-14

- **MyCoNet → Google Calendar**: `m14-events/lib/google-calendar.ts` (service-account JWT with WebCrypto;
  move a feed event or one date of a repeat; add/update/delete a MyCoNet event) and `POST /api/calendar-push`
  (`times` / `saved` / `delete`; the MyCoNet change runs as the signed-in user, Google never blocks it).
  Migration `20261119000000_calendar_push.sql`: `events.google_event_id`/`google_ical_uid` (only settable via
  `calendar_push_mark()` with CALENDAR_SYNC_SECRET; a trigger keeps API users from setting them),
  `calendar_feeds.push_new_events`, `calendar_push_feeds()`, and `calendar_feed_apply()` skips pushed events.
  Needs the worker secret `GOOGLE_SERVICE_ACCOUNT_JSON`; see the m14 README for setup.

## v4.16.5 — 2026-11-14

- Blueprint: applying an import (`applyImport`) saves at once instead of waiting for the autosave pause,
  and a toast confirms "✓ Blueprint updated: N answers saved" (or that the save was refused).

## v4.16.4 — 2026-11-14

- **Event times for everyone signed in**: `event_set_times(event, starts_at, ends_at, all_day?)` (security
  definer; any signed-in user, on events they can read; end not before start) sets `times_set_by`/`times_set_at`
  (new columns). `calendar_feed_apply()` keeps the times of an event with `times_set_by`. Event detail gets
  "Change time" and "Time changed by … on …". Migration `20261118000000_event_times_everyone.sql`.

## v4.16.3 — 2026-11-13

- **Blueprint import combines answers**: `mergeAnswers()` in `m04-blueprint/lib/doc-scan.ts` asks M3 (12
  questions per call) for one answer from the current and proposed text. The review's choices are Keep current /
  Combine (default, shows the result) / Replace it; Apply falls back to appending if a combine failed.
  A "Combining with the answers you already have" row shows progress.

## v4.16.2 — 2026-11-13

Community PRs brought into core (Max Sivry: protopia #28–#32; Sonia Wendorff: protopia #36, core #2, #3).

- **Website import reads the whole site**: `/api/site-text` now has a start call (home + sitemap/links) and a
  batch call (≤8 pages); `lib/site-crawl.ts` loops in the browser (cap 300 pages / 1.2M chars, Stop here).
  Tested: regentribe.co 32 pages in 3s; findhorn.org 161 pages in 20s.
- **Shell** (Sonia): desktop sidebar collapse (`nav-collapsed`, localStorage `navCollapsed`); the mobile ✕ no
  longer leaks onto desktop; grid children get `min-width:0` and inline `1fr 1fr`/`1.4fr 1fr` grids stack
  ≤640px; `<main>` reserves 84px for the assistant bubble; even 2×2 dashboard stats on tablets.
- **Avatar** (Sonia): Use photo button uses `--accent-color`; `avatar_url` is saved with `?v=<timestamp>`.
- **M08 label** (Sonia): "Achievements" in nav, search and breadcrumb (route and folder unchanged).
- **Join** (Max): decision buttons admin-only (`canDecide`), matching the `applications` policy; UI changes
  only when the update returns the row.
- **Governance** (Max): `proposals_guard_status` trigger: status changes by admins, the proposer withdrawing an
  open proposal, or non-API roles. Migration `20261117000100_proposal_status_admin_only.sql`.
- **Agreements** (Max): insert must be `pending`; the owner's pending update gets a with check (stays pending).
  Migration `20261117000200_agreements_insert_pending_only.sql`.
- **Tooling** (Max): lint cleanup to 0 errors; `.github/workflows/lint.yml`, `npm run lint:changed`;
  `skills-src/` → `.agents|.claude|.cursor/skills` via `scripts/sync-skills.mjs` (+ `skills.yml` check);
  `verify` skill.

## v4.16.1 — 2026-11-13

- Phone top bar (≤640px): "MyCoNet" is no longer hidden; it stacks above the community name and the
  version badge (`.topbar-brand-names` column, `.topbar-brand-myconet` 11px). The "·" stays hidden.

## v4.16.0 — 2026-11-13

- **Blueprint import from a website**: new `POST /api/site-text` (admin/circle_lead) and
  `m04-blueprint/lib/site-text.ts`. It reads the page plus up to 7 same-site links (useful paths first),
  strips scripts/nav/footer, and returns text with `[Page n]` markers; the review cites pages by path.
  Public URLs only (no localhost/IP literals/internal TLDs/credentials/non-default ports; each redirect re-checked).
- **Imports add, not overwrite**: existing written answers get Keep current / Add to it (default) / Replace it;
  existing scores and yes/no answers are kept unless replaced.
- **Every import goes into the library**: the "Don't add it" choice is gone (`DocumentKindPicker` loses `allowSkip`).

## v4.15.8 — 2026-11-13

- **Blueprint editing: admins and circle leads only**, in the database too. Migration
  `20261117000000_blueprint_leads_edit.sql` replaces the owner-only `blueprints` insert/update
  policies with `private.my_role() in ('admin','circle_lead')`. Before, only the row's `user_id`
  (whoever first opened the blueprint) could save, so other leads' edits were silently dropped.
- BlueprintClient's autosave checks the returned rows and shows "Your changes aren't being saved…"
  when an update is refused. m04 README: project leads are read-only (the README said otherwise).

## v4.15.7 — 2026-11-13

- Profile › Edit step 3: the Myers-Briggs question's small "click here to find yours" link is now a
  visible invitation linking to https://www.16personalities.com/.

## v4.15.6 — 2026-11-13

- **Calendar Day view, the default**: `EventsView` gains `day`; `/events` opens on it (today) unless
  `?view=` says otherwise. `DayView` (CalendarViews.tsx) lists the day's events with the List view's row,
  now a shared `EventRow`; past events are dimmed; an empty day links to the next day with events.
  ‹ › step one day; Month's day click opens Day (was Week). View order: Day, Week, Month, List.

## v4.15.5 — 2026-11-13

- **Avatar cropper** (Sonia Wendorff, from protopia-community/myconet-protopia#22): picking a profile
  photo opens `core/components/AvatarCropper.tsx` (drag, zoom; no new dependencies); the chosen square is
  saved as a 512×512 JPEG at `avatars/<uid>/avatar.jpg` through `core/lib/avatar.ts`
  (`uploadAvatarBlob`). Used by Profile › Edit and the M01 profile page. Added in core: a message
  when the browser can't decode the file (HEIC outside Safari) instead of a spinner, and the wheel zooms
  without scrolling the page. No database change.

## v4.15.4 — 2026-11-13

- Mobile top bar keeps the full-size logo (44px); the bar grows to fit it instead. Replaces v4.15.3's
  smaller phone logo; its app changelog entry is now listed under v4.15.4.

## v4.15.3 — 2026-11-13

- **Mobile top bar**: at ≤768px the shell's first grid row is `auto` instead of a fixed 60px, so the bar
  (Modules button, logo, name + version, profile-completion bar) no longer overflows its white
  background. `AppTopBar` measures the header into `--topbar-h` (ResizeObserver; the CSS value stays the
  fallback) so the mobile drawer opens right under it. Smaller logo and padding on phones; the user pill
  shows the avatar only at ≤640px.

## v4.15.2 — 2026-11-13

- **Core update check fixed**: `.github/workflows/core-update.yml` passes `--repo "$GITHUB_REPOSITORY"` to
  `gh pr list` / `gh pr create`. With the `upstream` remote added, gh picked the core repo, so the
  "already open" check never matched and creating the PR failed with "Resource not accessible by
  integration" (a daily failure email). Communities also need Org › Settings › Actions › "Allow GitHub
  Actions to create and approve pull requests". This release changes a workflow file, which the check's
  token can't push, so its update PR is opened by hand.

## v4.15.1 — 2026-11-13

- **One lead per circle everywhere**: new `core/components/CircleLeadName.tsx` shows and (for admins)
  edits `circles.leads_to_assign`, used by `/org`, Ops › Circles and Blueprint › Circles. `CirclesProvider`
  now keeps the rows in state and exposes `usePatchCircle()`, so a save on one screen shows on the others
  without a reload; `CircleSet.get(slug)` returns the full row. Ops › Circles and the Blueprint list also
  show account leads (circle_lead + `lead_circles`), and Ops labels the steward circle. No database change.

## v4.15.0 — 2026-11-13

**Database:** `20261116000000_steward_circle.sql` (`circles.is_steward`, at most one active).

- **Lead names on the org chart**: `circles.leads_to_assign` (typed in setup) shows as "Lead: …" on each
  circle card; admins add or edit it inline. Account leads (circle_lead role) still show as chips.
- **Steward circle**: Blueprint › Circles › Edit › "Community stewards" marks the circle that looks after
  every circle. `/org` puts it at the top (name, purpose, lead, leads, admins) instead of the plain
  "Community stewards" box, and leaves it out of the columns. `CIRCLE_SELECT` now includes
  `leads_to_assign` and `is_steward`.

## v4.14.1 — 2026-11-13

**Database:** `20261115000200_growth_privacy.sql` (new `user_growth`; `user_bio.fears` and `traumas`
moved there and dropped).

- **Growth & Healing privacy**: `user_growth.visibility` is `only_me`, `full_members` (default; existing
  answers get it), `joining`, `explorers` or `anyone` (visitors too), enforced by RLS. Profile › Edit step 5
  has the choice; the profile shows the card only to those people, and tells the owner who it's shared with.
- **Circle matching** for linked calendars: a title's first word may start the circle's first word or the
  reverse (4+ letters), so "Clean Circle" → Cleaning.
- v4.14.0 was not deployed on its own; communities get both in this update.

## v4.14.0 — 2026-11-13

**Database:** `20261115000000_is_admin_means_admin.sql`, `20261115000100_public_profiles.sql`.
Based on Max Sivry's community PRs (myconet-protopia #7, #8), brought into core.

- **`is_admin()` means admin**: it also matched circle and project leads, so leads could edit any profile
  (not roles: `guard_profile_privileges` already blocked those) and project leads read every join
  application. Circle leads keep application reads through `"circle admins read applications"`.
- **Public profiles**: new `user_profiles.public_bio`, `website_url` (http/https only), `instagram`,
  `linkedin`, `twitter` (Profile › Edit, step 1). Visitors (`anon`) get column grants for the public card
  only (`PUBLIC_PROFILE_COLUMNS` in `core/lib/public-profile.ts`); `user_bio`, `user_offers` and
  `user_requests` are readable by signed-in people only. Public pages ask for `profileColumns(signedIn, …)`.
  `/u/[username]` shows the bio and links to everyone and shaded sections with Sign up for visitors.
  Leads, voter counts and vote roles come from `public_circle_directory()`, `eligible_voter_count()` and
  `open_proposal_voter_roles()`.
- `/auth/login?mode=register` opens the sign-up form.

## v4.13.2 — 2026-11-12

- **A colour per calendar** (`KIND_META[kind].color`): Daily `#059669`, Core `#4f46e5`, Community
  `#db2777`, Tasks `#ea580c`, on chips, week/list cards, checkboxes, the pop-up badge and the legend.
  Categories become a dot on the chip (palette chosen not to clash: Food amber, Movement sky, Focus violet).
  Circles no longer colour events; they still show as a badge in the pop-up and in list view.

## v4.13.1 — 2026-11-12

- Comments and linked-event descriptions are for **full members** (member and above) only; v4.13.0 let
  joining members write them. v4.13.0 was never deployed, so its migration is corrected in place.

## v4.13.0 — 2026-11-12

**Database:** `20261114000000_event_notes_comments.sql` (`events.notes/notes_by/notes_at`,
`event_set_notes()`, new `event_comments` table with RLS).

- **Comments** on every event: signed-in people who can see the event read them; joining members and
  above write; authors and admins delete.
- **Descriptions on linked events**: `events.notes`, set through `event_set_notes()` by anyone who could
  post that kind of event (joining+ for community, full members+ for core/daily). Feed syncs never touch it.
  Events created here keep using their own description field.

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

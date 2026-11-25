# MyCoNet core: changelog

Core releases. Semver: patch = fixes; minor = new features (off by default when they
change behaviour); major = something communities must act on, with upgrade notes.
A community's history before v4.0.0 is in its own `instance/log.md`. The same notes
are shown in the app at `/changelog` (`web/src/app/changelog/page.tsx`).

## v4.137.0 — 2026-11-25 — Why a draft is suggested, in a small pop-up

Oscar: "on the drafts to confirm section, on the operations page - when im looking at a draft - id like to be able to
see a simple pop up that shows why this is being suggested with out taking me to another page". `DecisionList` (M07):
a **Why?** button on a row's source line opens `ModalShell` in a portal with the task, the action item's text and its
speaker, the meeting (title and date), the meeting's `summary` (read from `meeting_transcripts` when the pop-up opens,
cut at 900 characters) and the reasons of any suggestion on the task. A link to the meeting's notes stays at the bottom
for whoever wants it. No migration.

## v4.136.0 — 2026-11-25 — A task opens over the list you're on

Oscar: "when I click on a task in the drafts to confirm section, id like the pop up to happen with the existing screen in
the background. Currently its taking me to another page". `DecisionList` (M07) catches a plain click on a row's title,
loads the task (the board's select) and opens `TaskModal` in a portal over the page. Cmd/Ctrl/Shift-click and middle-click
still follow the link. Saving updates the row and remounts its Edit fields; saving a draft in the window confirms it, so
its pill reads Approved and the Drafts to confirm count drops, as with a slide right. Deleting the task removes the row
and takes it out of the counts. No migration.

## v4.135.0 — 2026-11-25 — Before joining, the Dashboard shows only the way in; A friendlier skills and interests picker, in pastels

**Before joining, the Dashboard shows only the way in.** Sonia's phone test of the two-step join (decision #94). `DashboardV4`: with the joining checklist or the "With the stewards"
card, no featured task, next event, proposals or circles column (`.nc-only`). `DESCRIBES` in `core/lib/skills-interests.ts`
is the earlier "Who are you in this network?" list, flattened, with the same stored values (`label` added). Start joining and
Edit profile ask "Where do you call home?". No migration.

**A friendlier skills and interests picker, in pastels.** Sonia, 25 Nov: "take it as Spotka has it", "popular here should just have a fire emoji", "more pastel colours" (decision
#95). `PillPicker` rebuilt after Spotka's full-size picker (sponic repo, `apps/garden/app/app.js`): Your picks · N with
Review, Search all, one pastel card per group (name, one line, N picked, chevron), one open at a time, a dashed Something
else? Each group has `desc`, `bg` and `line` in `core/lib/skills-interests.ts`; `pastel(i)` tints the describes-you cards.
A `flame` icon (no emoji on screens) marks pills 3+ people have. On `/design`. No migration.

## v4.134.0 — 2026-11-25 — Stewards see what the applicant told us

Found in Sonia's live test of the two-step join (decision #93): with no Blueprint questions, an application showed only a
name. `applications-server.ts` now loads each applicant's line, About, photo, place, what best describes them, skills,
interests, values, offers and requests (`profile_details()` for place and kinds, as #71 allows stewards); `JoinAdminClient`
shows them above any written answers, with "Open their profile →". The filter row uses the shared `Chip` (the chosen one
was white on pale). `FocusShell` says "Back to Dashboard" once every join step is done. No migration.

## v4.133.0 — 2026-11-25 — A note on a task, right where you edit it

Oscar: "I would also like to be able to add a note in the area where I can update the fields for suggested tasks".
`TaskQuickEdit` (M07) gets a Note box under the field grid, written to the task's existing `deliverables.notes`
(the same field as the task pop-up's Notes). It saves on blur when the text changed, and, like every other field
there, saving it confirms a draft. `EditableTask`, `TaskChange` and `EDITABLE_SELECT` (`lib/task-edit.ts`) carry
`notes`; the decisions loader (`lib/decisions.ts`) reads it, and `MeetingTask` has an optional `notes`. If the
assistant changes the note, the box is marked like the other fields. No migration.

## v4.132.1 — 2026-11-25 — Declining a draft lowers the count

Oscar: "when I decline something by sliding the pill left, on drafts to confirm, the count on the top row holding
the suggestions should decrease". The panel head (`ToDecidePanel`, M07 `DecisionList.tsx`) counted drafts from the
rows it was loaded with, so a pill slid in the list below never reached it. `DecisionList` now takes `onPill` and
tells the panel when a pill is approved, declined or undone; the head leaves those out of its count. Each meeting
group's own count also leaves out declined drafts (approved ones already dropped). No migration.

## v4.132.0 — 2026-11-25 — Joining in two steps: Send at the end of About you

Sonia, 25 Nov: "'Anything else?' why would we ask that?" The website form and About you already ask everything, so
the Apply step goes (decision #93, option B). With the design review: `join-path.ts` gives two steps; About you's last
screen ends with Send application, shows the Blueprint's own questions if a community has any, and waits for the values
with a link to step 1. Old `?step=application` links open that screen. The menu, Dashboard, Welcome and About's
"Step 1 of 2" say two steps. Without the design review, three steps as before. No migration.

## v4.131.0 — 2026-11-25 — Good at, curious about: one picker, and a profile in seven tabs; A Welcome for visitors, and Start joining as one focused flow

**Good at, curious about: one picker, and a profile in seven tabs.** Sonia, 25 Nov (Protopia join questions): people reach MyCoNet after the community's own website form, so
joining asks only about you, each thing once. Design review only (`designReview`); communities without it keep
the old pages. Decisions #89–#92 in `design/decisions.md`; words in `LEXICON.md`.

- `core/lib/skills-interests.ts`: twelve groups of pills, shared by skills and interests; suggestions from what
  people here pick together; "What best describes you?" words; values as names (`valueList`).
- `core/components/v4/PillPicker.tsx` (+ `pill-picker.css`): groups first, then pills; your own; share → offers.
- `m05-join/JoinReview.tsx`: About you as three screens (`?step=profile&part=2`), each saved on Continue.
- `m01-network/ProfileReview.tsx` and `app/profile/edit/page.tsx`: the same seven tabs.
- `m01-network/lib/match-score.ts`: a skill meeting a curiosity (up to 10) and the same group (up to 3).
- Blueprint: the values prompt asks for "Name — two or three sentences" per line; Community values' fields are
  Name and What it means; About splits a values answer on lines when it has them.

No migration, no new secret. Stored as before: `user_bio.skills`, `interests`, `values_principles` (one name per
line), `user_profiles.user_types`, `user_offers`, `user_requests`.

**A Welcome for visitors, and Start joining as one focused flow.** Sonia's design review, 24 Nov: decisions #86–#88 (replace #69 and #80's "sign on About"). A Welcome at `/` for visitors;
Start joining in a focused shell (no menu around it), step 1 shows and signs the values in place, About opens in a
new tab, Apply says next to Send why it waits; the mark on sign-in. Design review only. No migration.

## v4.130.2 — 2026-11-25 — A decided draft stays decided when you fold its meeting

Oscar: "I just declined two suggestions in Vision circle… and when I collapse the row they turn back to draft". The
decisions were saved: the declined tasks were gone and the confirmed ones confirmed. Only the label came back. Folding a
meeting's group in Drafts to confirm / To decide unmounts its rows, and the Draft pill (`DraftSwipe`) kept what was
decided in its own state, so a row drawn again started as "Draft".
- The list (`DecisionList`, and the List's drafts in `DeliverablesTab`) keeps each pill's decision, Approved or
  Declined with the log entry Undo needs, and hands it back through a new `decided` prop. A row drawn again reads
  "Approved · Undo" or "Declined · Undo" until the page is reloaded.
- `onDeclined` now passes the decline's log id.

No migration.

## v4.130.1 — 2026-11-24 — Working at the same time without clashing

On 2026-11-20/21 about ten sessions and Oscar kept conflicting on the same three release files and twice claimed
the same version (v4.65.0, v4.80.0). Nothing changes on screen.
- **A change no longer picks its version.** It adds one note, `changes/<slug>.md` (`bump`, `title`, `public`, and the
  CHANGELOG text). `web/scripts/release.mjs` (`npm run release`) takes the next free version after both the core tags
  and `CHANGELOG.md`, writes `version.ts`, `CHANGELOG.md` and the `/changelog` entries, and deletes the notes.
  `--dry-run` shows the result. `npm run upstream` refuses a change that edits those files or has no note, and the
  new **Change notes** check does the same on pull requests.
- **A release queue anyone can run:** `npm run ship -- <core PR>` (`web/scripts/ship.mjs`): one release at a time
  (the lock `/tmp/myconet-ship.lock`), the newest core `main` merged into the PR, the release written, lint and type
  check, merge, tag, the community's update PR, deploy, and a log entry. A real code conflict stops it with the
  files named. `--dry-run` goes as far as the checks and changes nothing. If core added migrations since the
  community's last core version (all of them, also from skipped releases), it stops before deploying and prints
  the files and the resume command, `npm run ship -- --community <version> --migrations-applied`.
- **The community's Core update** pushes its branch with `CORE_REPO_TOKEN` when it's set (it needs the `workflow`
  scope: a release that changes `.github/workflows/` can't be pushed otherwise), prints the real error when the
  push fails, and cuts long release notes so the PR body stays under GitHub's 65,536 characters.
- **One file per log entry:** a community's new entries go in `instance/log/<date>-<slug>.md`; `instance/log.md`
  stays as the archive. `npm run start-work` shows the newest entries.
- **Rules written down:** module styles live in the module's folder (`DESIGN-SYSTEM.md`, `web/CONTRIBUTING.md`), and
  "Working at the same time" in `CLAUDE.md` / `AGENTS.md`: one session per module, a draft PR before touching the
  shell, `roles.ts`, `LEXICON.md` or migrations.

No migration.

## v4.130.0 — 2026-11-24 — Undo a decline until you reload; each draft shows its source

Oscar: "after something is declined (slide left of draft pill) leave the undo button until the page is refreshed".
- **Declining** a draft in Drafts to confirm / To decide, on a meeting's page and in the List's drafts goes through a
  new route, `POST /api/ops/drafts/[id]`. It deletes the task as before, with the person's own session, but first keeps
  the whole task in `agent_actions` (`draft_declined`), with its meeting links and followers.
- **The pill reads "Declined · Undo" until the page is reloaded.** Undo puts the task back exactly: the row, its link to
  the meeting's line, and its followers. Only the person who declined it can undo it.
- **Approving** a draft there now keeps its pill too, reading "Approved · Undo". Before, the pill disappeared at once.
- The board's cards keep their few seconds' Undo before a declined draft goes.
- **Each draft's source** shows under its row: "From <the meeting> · date · said by <who>". The meeting links to its notes,
  and the speaker is Fireflies' speaker on that action item (Oscar: "I don't see… the source of inspiration… on the row
  with the draft I'm confirming"). The project manager's suggestions keep their own "Based on".

No migration.

## v4.129.0 — 2026-11-24 — Tasks remember when and by whom they last changed

Oscar: "add tracking". Drafts he had confirmed seemed to come back, and nothing showed which tasks had changed:
`deliverables.updated_at` was never kept current (projects' was), and no one was recorded.
- Migration `20261226000000_change_tracking.sql`:
  - `deliverables` and `projects` get `updated_by`.
  - One trigger (`private.stamp_change`) stamps `updated_at` with the time and `updated_by` with the signed-in person
    on every change. Null means the assistant or a background job.
  - It replaces projects' own `set_projects_updated_at`.
- Nothing changes on screen yet. It makes a task's history traceable.

## v4.128.0 — 2026-11-24 — Each suggestion says what it's based on

Oscar: "when I'm reading suggestions in the drafts to confirm section… I'd like to be able to see why it's suggesting
this, and click a link to meeting notes explaining why". Under each project manager suggestion in Drafts to confirm /
To decide (and on a meeting's page), below its **Why**, there's now **Based on**. For each task it's about:
- the meeting it came from, as a link to that meeting's notes, with its date;
- the line that was said, and who said it;
- or, for a task added by hand, who added it and when.

A meeting the viewer may not open shows without its name. No migration.

## v4.127.0 — 2026-11-24 — Done on the far right, a subcircle filter, and new subcircles from a task

Three Operations changes (M07, v4 look), from Oscar:
- **Done is on the far right of the board** ("we should be able to see the done column on the far right"). The order is
  Later · Ideas · To do · In progress · Review · Paused · **Done**. On a computer every column sits on one row, and a
  narrow window scrolls the board sideways instead of wrapping Done and Paused onto a second row. Phones are
  unchanged.
- **A subcircle filter** ("to operations page plz add a subcircle filter"). Next to Circles, a **Subcircle** picker lists
  the chosen circles' subcircles, or all of them grouped by circle. It narrows the board to tasks given to that
  subcircle, and to subtasks given to it or inside one of its tasks. Changing the circles clears it if it no longer
  fits.
- **Make a subcircle from a task's fields** ("add a new subcircle from the drop downs in drafts to confirm"). The
  **Subcircle** picker in Drafts to confirm, a meeting's action items and the project manager's suggestions ends with
  **+ New subcircle…**. Type a name and the subcircle is made in the task's circle, with the task in it. Admins and that
  circle's leads may; the database checks. The other rows offer it at once.

No migration.

## v4.126.0 — 2026-11-24 — Design review: the phone menu as a sheet, a calmer tab bar, "Dashboard"

Only for communities with `"designReview": true`; nothing changes for the others. Decisions #82–#85.
- **Phones:** the Menu tab opens a sheet that rises above the tab bar and lists only what isn't a tab (next step,
  About, Circles, The space, Meetings, Governance, Admin, you). It closes with the Menu tab again, a pull down from
  its top, a tap above it or Escape. The shade behind it now shows (it never did on phones).
- **Phones:** a calmer tab bar: no rule line, grey icons and names, the page you're on in ink with a soft pill.
- **Computers:** the community's mark and name stay at the top of the menu when the menu scrolls.
- **Words:** "My dashboard" is **Dashboard** (menu, top bar, page, phone tab; `LEXICON.md`).

## v4.124.0 — 2026-11-24 — The design review (off unless a community turns it on)

Sonia's UI/UX review of 22–23 Nov 2026, as one release behind a new switch: `"designReview": true` in
`instance/config.jsonc` (default off; `instance.example` has it false). With it off nothing changes. Rules:
`DESIGN-SYSTEM.md` › design review layer (13 rules); decisions #1–#81 in `design/decisions.md`; words in `LEXICON.md`.
- **Shell:** the page name lives only in the top bar, with ‹ Back (the last page; from outside, one level up). Pages
  outside the menu are named by their own heading. The profile bar is gone; the menu's next step says what's next.
- **Look:** six text sizes; pill families (Status for tasks only, Result, Tag with circle seal, Filter/Count); no
  outlines, one soft control fill (`--ctl`), black when chosen, dark green main buttons; yellow means waiting, red only
  Declined; icons in ink; initials on grey; circle seals.
- **Pages:** Operations (one view switch, phone Filter sheet, "Drafts to confirm" for leads, Later column kept),
  Members (people first), Calendar (calm on phones, colours per event type kept), The space (one row + Filter),
  Governance (Voting · Decided, checks in words), Meetings (one row of controls), a task's page, a person's profile
  and Edit profile, welcome / sign in / create account, About.
- **Newcomers:** three steps, Get to know us (sign the values at the end of About) · About you (a short form) · Apply;
  My dashboard's checklist, waiting and welcome-in states. Before joining, each lock says how to open it (#79):
  public profile card and offers, read-only Operations, RSVP needs an account, Governance for signed-in people,
  Meetings and booking at joining.
- **Not in this release:** migration `newcomer_access` (the database side of #71/#73/#74) waits for review; the screens
  work without it.
- My dashboard: Next event skips events that are over; open proposals follow Governance's Voting rule.

## v4.123.0 — 2026-11-23 — Later is a status, with its own column

Oscar: "later button moves it to the later column (create the column one position left of idea column) and you can
set that as the status. lets not longer hide them. its just a new status - later. and the ai should still have access to
data in there in case it relates to new things coming in".
- **A Later column** on the board, left of Ideas: Later · Ideas · To do · In progress · Review · Done (· Paused). It's
  for tasks and for tasks with subtasks, and a task's own page has it for its subtasks too.
- **Later is in every status picker**: To decide and a meeting's action items, the Tasks list, the task card, and a
  task's page. Drag a card there, or set it.
- **The Later button** in To decide sets the status to Later. Undo puts back the status it had.
- **Nothing is hidden any more.** v4.114.0's "Ideas for later" list and chip are gone; those tasks are simply in
  the Later column.
- **The project manager reviews Later and Idea tasks too.** It won't move them into active work on its own, but when a
  new task clearly relates to one it suggests a merge, a move or a new project with both. The assistant knows "later".
- A Later task isn't counted as late.
- **Fixed from v4.122.0:** on a task's own page, the Ideas column now shows subtasks set to Idea, not only proposals
  waiting for a lead.
- Migration `20261225000000_later_status.sql`:
  - `deliverables` and `projects` accept `later`, and `update_my_task` accepts it.
  - Tasks set aside with `later_at` become status `later`; neither community had any.
  - `later_at` stays in the database, unused.

## v4.122.0 — 2026-11-23 — A task can be an Idea

Oscar: "in the status drop down of the to decide section on operations… there should be an idea option so it's put in
their column". Until now only a task with subtasks could sit in the board's Ideas column; a task of its own could not.
- Every status picker now starts with **Idea**: To decide and a meeting's action items (`TaskQuickEdit`), the Tasks list,
  and the task card. A task of its own set to Idea sits in the board's **Ideas** column, and can be dragged there and
  back.
- The **All subtasks** board shows the Ideas column too.
- An idea isn't counted as late.
- The assistant knows it: "make it an idea" sets the status.
- Migration `20261224000000_task_ideas.sql`: `deliverables.status` accepts `pending`, the same word as for projects.
  The assignee's own update (`update_my_task`) accepts it too.

Ideas are still on the board. **Later** (v4.114.0) takes a task off the board onto Ideas for later.

## v4.121.0 — 2026-11-23 — Second-brain notes save when two writes meet

The project manager's review of a circle sometimes failed to save its notes to the second brain. On Protopia, Cleaning,
Art, Kitchen, Space Holding and Vision showed "second brain: GitHub 409 … is at <sha> but expected <sha>". To update a
file, GitHub needs its current version. MyCoNet read that version just before saving, but GitHub can serve a version a
few seconds old right after another write: a circle's README and the second brain's map, or two reviews at once. The
save was then refused, and the circle's board note and README stayed out of date. Its suggestions were unaffected.
- `saveNote` and `deleteFile` (`m18-meetings/lib/second-brain.ts`) read the file's version past any cache. On a 409
  they retry, up to three times, with the version GitHub's refusal names, or a fresh read of it.

No migration.

## v4.120.0 — 2026-11-23 — Review again

Oscar: "click a review all pending things and re suggest how to handle it… as the user accepts things, new suggestions
might become clear for the PM agent… that function will evaluate everything pending taking into account the recent
things the user has updated".
- **Review again** in the board's To decide panel (M07), for circle leads and admins. It asks the project manager to
  review now, without waiting for its 10-minute check, each circle the person may decide (following the circle
  filter), three at a time with progress. It reads the boards as they are after what was just approved, declined,
  edited or set aside for later, and replaces each circle's open suggestions. The page then reloads with them, and
  says how many suggestions and changes it made.
- **The review builds on recent decisions.** Besides what leads turned down (60 days, with what they wanted
  instead), it now gets what they **accepted** in the last two weeks and its own changes they **undid**. It's told to
  build on the first and never redo the second.
- New route `POST /api/ops/board-review/now` (one circle, the circle's leads and admins), next to the sweep's.

No migration.

## v4.119.0 — 2026-11-22 — "Part of" offers only the task's own circle or subcircle

Oscar: "tasks with subtasks should usually belong to a circle and sometimes to a sub circle. the drop down options under
part of should only display options that are in the same circle or sub circle as are selected". Everywhere a task's
parent is picked, the same rule (`lib/task-edit.ts` `partOfChoices`) applies: To decide and a meeting's action items
(`TaskQuickEdit`), the Tasks list, and the task card.
- **With a subcircle:** only that subcircle's open tasks.
- **With a circle:** only that circle's.
- **With neither:** every open task, and picking one sets the circle.

The task's current parent always stays listed. Choosing a parent in a subcircle brings the subcircle too, and choosing
another subcircle takes the task out of a parent that isn't that subcircle's. `loadTaskOptions` now reads projects'
`team_id`. No migration.

## v4.118.0 — 2026-11-22 — Approve people before they show in Members

Sonia, after placeholder profiles were added on Protopia for guests with a stay: "leave them in calendar and the
bookings - we should approve them before they show up on members though".
- `user_profiles.approved` (boolean, default true; migration `20261223000000_profiles_awaiting_approval.sql`). False
  means an admin added the profile and it is waiting. Nothing changes for a community that never sets it.
- Left out while waiting: Members (list, newest, count), Discover, Matches, top-bar search, the people on Home, the
  dashboard and the landing page, and the "buddies" on Join. Each of those queries adds `.eq('approved', true)`.
- Unchanged: bookings and the bookings calendar, pickers (task assignee, circle members), and the profile page at
  its own address. It is a listing switch, not a security boundary: the row stays readable.
- Admin › Permissions: a "Waiting for approval" chip when anyone is waiting, "Not in Members yet" on the card, and
  an Approve button (saved straight away). Only admins: `guard_profile_privileges` refuses the change from anyone
  else, and visitors get read access to this one column so the public pages can filter on it.
- There is no screen yet to set someone back to waiting or to add a waiting profile; that is done in the database.
- **Apply the migration before deploying**: the lists filter on the new column.
- Not checked: the guard change on a local database (the repo has no boundary harness yet), and the screens signed in.

## v4.117.0 — 2026-11-22 — The bell opens

Sonia: "i cannot click the notifications center". The bell in the top bar was a picture with a red dot that was always
on; the redesign prototype's bell card (`design/redesign-prototype/app.js`, `bell()`) never reached the app.
- The bell opens a card (`core/components/shell/BellPanel.tsx`, items from `core/lib/bell.ts`) with two sections:
  - **Needs you** (the number on the bell): open proposals you haven't voted on, your tasks late or due within 3 days,
    pending offers of help on projects you lead or started, join applications (leads) and booking requests (admins).
  - **Activity** (last 7 days): proposals you voted on that were approved, your offers accepted or declined, meeting
    notes from your circles (the newest two, then "N more"), and events you're going to in the next 2 days.
- Nothing is stored for the bell: every item is read from the pages' own tables with the viewer's session (RLS).
  Approval isn't stored either, so its time is the proposal's latest vote.
- Governance's approval rule moved to `core/lib/proposal-checks.ts`, used by the Governance page and the bell.
- `/governance?p=<id>` opens one proposal (the bell's vote links).
- On phones the card spans the screen under the top bar.

Second brain: no knowledge changes; it reads what the pages already hold. No migration.

## v4.116.0 — 2026-11-22 — Photos first in Amenities & tools

Sonia: "move the ones with generated images to the bottom". A community can fill a card with an illustration until
someone takes a real photo; those cards opened the page because the list was by name.
- New `photo_drawn` on `booking_items` and `places` (`supabase/migrations/20261222000000_photo_drawn.sql`): the cover
  is a drawing, not a photo. A community sets it in its own migration.
- Amenities & tools shows cards with a real photo first (things to book, then places from the Map), then the ones
  with a drawing or no picture. An item that shows its place's picture follows that place's mark.
- Uploading a photo in the item form clears the mark.
- Read on its own, so a database without the column still loads (nothing sorts last).

Second brain: no knowledge changes; it is an order on one screen. Migration: yes, additive.

## v4.115.0 — 2026-11-22 — Lines you can see again (v4)

Oscar: "there are no lines in between content, just white". Since v4.82.0's calmer page (Sonia), the page is nearly
white, cards are white with no edge, and the line between rows was 5% grey, so content ran together. Sonia's page
colour stays. Only the separations come back:
- `--rule` goes from 9% to 14%, `--rule-soft` from 5% to 10%, and `--border` follows.
- `.v4-card` and `.v4-list` get a faint outline.
- The line between rows uses the stronger `--rule-soft`.

Only communities with "design": "v4". No migration.

## v4.114.0 — 2026-11-21 — One list of everything to decide

Oscar: "all the things that need to be decided should show up on one list. in that list users should be able to see
the fields, change any of them, tell the agent to do something, and a draft label that swipe right to accept or left to
decline. and the label switches to approved or declined… idea for later list… this list should follow the style of the
action items section".
- **To decide** replaces the project manager panel on the board (Operations) and the two sections on a meeting's page.
  It's one list, in the action items' style, of every task waiting on a decision: the drafts still to confirm, and the
  tasks the project manager has open suggestions about, each once. The board groups it by meeting; a meeting's page
  shows its own action items.
- **Each row** is a task with:
  - its fields, changed right there, and "✦ What should the assistant do?"
  - the **Draft** pill: slide right to approve, left to decline. It then reads **Approved** (with Undo) or **Declined**.
    A row with only a suggestion has no pill.
  - **Later**: sets the task aside on **Ideas for later**, a new chip in Operations. It's off the board and out of the
    project manager's review until someone brings it back.
  - the project manager's **suggestions about it**, inside the row, with Accept, Dismiss and Put it in. A suggestion
    about several tasks shows on each of them.
- **Rows stay**, showing what was decided, until the page is reloaded. Below the list is what the assistant changed
  itself in the last two weeks, with Undo.
- Migration `20261218000000_task_later.sql` adds `deliverables.later_at`. It's read on its own, so a community that
  hasn't applied it keeps its board.

## v4.113.0 — 2026-11-21 — Places you don't book are listed under Spaces

Sonia: "add the shared restroom… and any other shared area… and waterfalls and such to spaces too".
- Amenities & tools (M15) Browse lists, under Spaces and All, the Map's places (`places`) that have a photo and no
  bookable thing of their own (none pinned on them, none with the same name). One source: no copy in `booking_items`.
  The card shows the photo, the kind and the description, and opens `/map?place=<slug>`. The Spaces count includes them.
- Signed-out visitors don't see them: `places` is for signed-in people.

## v4.112.1 — 2026-11-21 — Grouped cards: just the number when the title says what they are

Amenities & tools (M15): a group named from its stem ("Private Room 1…9" → "Private Rooms 1–9") shows buttons
1, 2, 3 instead of "Private room 1". Groups split at a dash ("Male dorm – bed 3") keep "Bed 3". It was tied to
the word "room" before.

## v4.112.0 — 2026-11-21 — The bookings calendar scrolls sideways through the dates

Sonia, looking at Protopia's calendar once its stays were in: "you should be able to scroll to the side to reveal
more dates". The calendar in Admin › Bookings (`m15-bookings/BookingsV4.tsx`, `BookingsCalendar`) was a fixed
two-week window moved by Earlier / Later. It is now one strip of days, from two weeks back to a week past the last
booking (at least eight weeks ahead, at most 400 days), in a sideways scroller that opens on today. The item names
stay put (sticky), a guest's name stays in view inside a long bar, the first of a month shows the month's name, and
the heading names the dates in view. Earlier, Later and Today scroll it by a week. Also fixes weekend shading in
rows that have a stay: the day cells were placed by the grid, so they slid past the columns a bar covered. No
migration. Second brain: nothing new is written (a display change; stays still aren't in the second brain).

## v4.111.0 — 2026-11-21 — Core and community migrations never take the same number

Oscar: "add instructions in the places they need to be so the numbering issue doesn't happen - it's important we stay
in sync with working with core and other instances like RTRN". A community's database keeps one list of migrations
for core's and its own together, and `supabase db push` skips any number already in it. Three Protopia migrations had
taken core numbers, so three core changes were skipped without a word. Two columns were missing until it was found:
`circles.icon` and `meeting_transcripts.team_id`.
- **The rule:** a number is `YYYYMMDDHHMMSS`. **Core uses the hour 00–89, and a community's `instance/migrations/` uses
  90–99**, e.g. `20261217900100_protopia_x.sql`. They can't meet, whatever order they're written or applied in. It's
  written where people and agents look:
  - `supabase/migrations/README.md` (new: the why and how)
  - `instance.example/migrations/README.md` (new)
  - `CLAUDE.md` and `AGENTS.md` (Rules for AI coding agents)
  - `INSTANCES.md`, which used to say "numbered after the core ones" (the cause)
  - `instance.example/README.md`
- **`web/scripts/migration-check.mjs`:**
  - Every `npm run deploy` (`deploy-check.mjs`) now checks the files and **stops on a clash**: a community migration
    with a core number, or in core's range.
  - **`npm run migrations:check`** also reads the linked database. It lists a number applied under another file's
    name, and what isn't applied yet. Run it before `supabase db push`.
  - Files numbered before 2026-12-17 keep their numbers, and their clashes are listed as notes.

No migration.

## v4.110.0 — 2026-11-21 — Several photos for a bookable thing and for a place

Sonia: "you can also add more than 1 image".
- Migration `20261217000000_more_photos.sql`: `booking_items.photos` and `places.photos` (text[], default empty).
  `photo_url` stays the cover on cards and pins. Both are read separately, so a database without the columns
  still loads its pages.
- New `core/components/PhotoStrip.tsx`: the cover and the rest as a strip you swipe (scroll-snap), with arrows and
  a "2 / 5" count. In the item's window (its own photos; without any, its place's) and in the place's card on the Map.
- Not yet: adding or removing the extra photos in the edit forms. For now they are set by a community's migration.

## v4.108.0 — 2026-11-21 — Subcircles have their own page, and their own meetings

Oscar: "sub circles should have a subpage the same abilities as a circle subpage… like a russian doll effect so it's
familiar… and a bread crumb on top so users can see their way back", and "set subcircles for meetings also so
subcircles get their transcripts in their section".
- **A subcircle's page** (M17, v4 look), at `/circles?c=<circle>&t=<subcircle>`, works like its circle's page one
  level in. Its tabs:
  - **Overview:** lead, people, open tasks, meeting notes and purpose.
  - **People:** leads and members. Those who may manage it add people here.
  - **Tasks:** the tasks and projects given to it.
  - **Meetings:** the meeting notes set to it.

  **Edit** is for those who may manage it. Every link to a subcircle now opens its page: the circle's Overview and
  Subcircles tabs, and the subcircle list on each card (v4.104.0).
- **A breadcrumb** on a circle's page (Circles › Kitchen) and on a subcircle's (Circles › Kitchen › Bakery) replaces
  the "← Circles" link.
- **Meetings can belong to a subcircle.** On a meeting's page, under Review this meeting, the leads now have a
  **Subcircle** picker next to the circle, offering the chosen circle's subcircles or the whole circle. The meeting
  then shows on that subcircle's page.
- Migration `20261216000000_meeting_teams.sql` adds `meeting_transcripts.team_id` (subcircles only). Like a project's
  subcircle, it sets the meeting's circle, and moving the meeting to another circle takes it off its subcircle
  (`private.meeting_team_circle`). It's read on its own, so a community that hasn't applied it keeps its meeting and
  circle pages.

## v4.107.0 — 2026-11-21 — A meeting's page has the project manager too

Oscar: "a privileged user [should] see project manager suggestions for all the things pending and have the same
functionality in the meetings section, there should also be the ability to type to the agent what to do with it… that
agent should be able to understand… circle, sub circle, person assigned, priority, date, status etc and change it".
- **A meeting's page** (M18, v4 look) shows **Project manager · about these action items**, open, above the action
  items. These are the board's open suggestions about this meeting's tasks, with the same Accept, Dismiss, Put it in,
  field editing and Tell the assistant. Circle leads (for their circles) and admins decide; everyone else sees them.
- **The board's project manager panel lists meetings' drafts too.** Under its suggestions, **Drafts to confirm** groups
  every draft still waiting by meeting, newest first, with the meeting's circle and a count. Opening a meeting shows its
  action items as the same rows as on its page (`ActionItemList`, shared), with the same fields, assistant line and
  draft pill, plus a link to the meeting. They're loaded by one helper, `m18-meetings/lib/action-items.ts`, for both
  pages, and only the drafts the viewer may change are listed.
- **✦ What should the assistant do?** sits under a task's fields wherever they can be changed: in the project manager
  panel and in a meeting's action items. Type what to do, like "give it to Ana, high priority, due Friday". The assistant
  makes the change right there, with no chat pop-up. The fields reload with what changed marked, and a short list says
  what it did. **Keep** it, or **Undo** puts it all back.
- **The assistant (Do)** already changes a task's circle, subcircle, person, priority, due date and time, status and the
  task it's part of. Now a change to a draft confirms it there too (Undo makes it a draft again), and on its cards a
  team reads "subcircle".

No migration.

## v4.106.0 — 2026-11-21 — The project manager's tasks are editable at a glance

Oscar didn't find the fields from v4.105.0 in the project manager panel: they were behind the "✎ Edit its tasks ·
where they come from" link. Now, for a circle's leads and admins, each suggestion shows its tasks' fields (circle,
subcircle, part of, person, priority, due, status) straight away, under what it suggests, marked "Draft · edit to
confirm" for a draft. **Where this comes from** is back to a read-only view of each task's source. No migration.

## v4.105.0 — 2026-11-21 — Change a task right where you review it

Oscar: "on the project manager functionality, I want to be able to edit all the fields like circle, sub circle,
person assigned to, priority, etc so we can edit it right away and move it along. i also want that same
functionality in the meetings page - action items to confirm".
- **New `TaskQuickEdit`** (M07): a task's Circle, Subcircle, Part of, Person, Priority, Due and Status as pickers.
  Each change saves straight away and confirms a draft. Its placement rules live in `lib/task-edit.ts`, shared with
  the Tasks list (v4.84.0) and the same as the task pop-up's: a subcircle or task brings its circle, and what no longer
  fits the new circle is cleared.
- **Project manager panel:** for a circle's leads and admins, **✎ Edit its tasks · where they come from** opens the
  suggestion's tasks with their fields, next to the meeting each came from. Everyone else still sees the read-only
  view.
- **A meeting's action items** (v4 look): for those who may change a task, a draft shows its fields straight away, and
  a confirmed one opens them with **Edit**. A changed or approved item stays in the list with its new values until the
  page is reloaded.

No migration.

## v4.104.0 — 2026-11-21 — Subcircles on each circle's card, one click away

Oscar: "showing the number of subcircles on each circle on the circles page… click the subcircle bubble and see the
sub circles to be able to pick one directly and go to its page. or add a new subcircle". On the Circles page (M17,
v4 look):
- Each circle's card shows **N subcircles** beside open tasks and meetings, including 0, for everyone. Tasks and
  meetings still need sign-in. The count used to be in the small line under the name, and only when there were some.
- **Clicking the count** opens a small list of the circle's subcircles. Picking one opens the circle's Subcircles
  tab (`?tab=subcircles&sub=<id>`), scrolled to that subcircle and outlined.
- For the circle's leads and admins, the list ends with **Add a subcircle**. It opens the same tab with the
  add form ready (`&add=1`).
- Escape or a click outside closes the list. No migration.

## v4.103.0 — 2026-11-21 — A merged task is deleted, not paused

Oscar: "why are merged tasks in the pause column, lets just delete them". When the assistant merges one task into
another (Do: `merge_projects`), the merged-away task used to be set to Paused with "(merged into …)" in its title.
Now:
- Its subtasks move into the other task, along with its updates, agreements, events and places.
- Then it's deleted.
- **Undo** puts it back whole, with everything that came from it.

No migration. Protopia's two leftover merged tasks were empty and have been deleted by hand.

## v4.102.0 — 2026-11-21 — The space: Amenities & tools and the Map behind one menu item

Sonia: "we should also put the map and amenities and tools into 'the space' so we have less things on the side".
- `nav.ts`: one item **The space** (`/amenities`, highlighted on `/map` too) replaces "Amenities & tools" and "Map".
- New `core/components/SpaceTabs.tsx`: a switch under the heading of both pages (Amenities & tools | Map). It
  replaces the "See the map" button in Browse. The pages keep their own headings and addresses.

## v4.101.0 — 2026-11-21 — Home follows the menu (v4)

Sonia: "this should be organized by the nav bar: community, then working together, and be less busy visually with
different sizes but same colors; start from most attractive: meet members, calendar of events". In `HomeV4`
(`web/src/modules/home/HomeV4.tsx`):
- The pages come straight from `menuGroups` (`core/lib/nav.ts`), in its two groups with their labels and lines, and
  with the menu's names and icons. A page added to the menu needs one line in `LINE` to show on Home.
- Two sizes. Large first: Members (faces, head count), Calendar (the next three events), Operations (three projects
  under way) and Governance (the open proposals and when they close). The rest are small rows; pages that open on
  joining show a lock.
- One colour: every icon tile and date block is the same grey.
- "Happening now" is gone as a block; its events and votes live in the Calendar and Governance tiles.

No migration.

## v4.100.0 — 2026-11-21 — Meetings: names without the date; only real tasks (from Protopia, Sonia)

- The assistant names a meeting without its date ("Kitchen lead handover", not "17.11.2026 Kitchen lead handover"):
  the date is shown beside it. `lib/title.ts` (`withoutDate`) takes a date off the start or end of older or typed
  names on the list, the meeting page and the second-brain note.
- **Migration** `20261215000100_meeting_titles_without_date.sql`: takes the leading date off existing meeting names.
- The assistant keeps a task only when it has a visible result, someone agreed to it, it is still to do, it is the
  community's work and it isn't on the board yet. Fireflies' action items are checked against the transcript; when in
  doubt, it's left out. The quote kept with a task is where it was agreed.

## v4.99.0 — 2026-11-21 — A clearer menu: no look-alike arrows

Sonia, on the slim menu: "the arrows are confusing". v4 only (`MenuV4`); `AppSideNav` is unchanged.
- The open/slim switch is a `sidebar` icon (new in `v4/icons.ts`), the same in both states, with `aria-expanded`.
  Open, it sits top right; in the rail it sits at the foot, above your photo. The rail's next step is a round
  light-green `flag` button. Arrows now only mean "go there" (the next-step card, your name).
- `.menu-v4 > * { flex-shrink: 0 }`: a rail taller than the window scrolls instead of flattening the next-step
  button into an oval. Slightly tighter rail spacing.
- The rail's names: one fixed label beside the hovered or focused icon (`.mv4-tip`, placed by `MenuV4`), instead
  of the browser's slow `title` tooltip. Rail links carry `aria-label`, since their text is hidden.
- The slim/open choice moved from `localStorage` to a `navCollapsed` cookie that `layout.tsx` reads, so the page
  arrives slim instead of opening wide and shrinking. An older choice is moved over once.
- Phone drawer (both menus): closes on Escape and when the page changes (back and forward too); in v4 the
  keyboard focus moves to its close button when it opens.
- No migration, no new setting, no new secret.
- Second brain: this changes no knowledge (no decision, task, project, agreement, role, event or document), so
  nothing lands there.

## v4.98.0 — 2026-11-21 — Amenities & tools as a gallery

Sonia, on a page of 20 near-identical dorm-bed cards: "this looks bad… the gallery needs to look amazing".
- Browse cards lead with a 4:3 photo (the item's own, else its place's; without either a tinted tile with the
  category's icon), with the availability as a badge on it and the name, facts and tags under it (`ItemMedia`).
- Three or more items of one category whose names differ only in their last number show as one card
  (`groupItems` in `BookingsV4.tsx`): "Dorm 1 – bed 1…10" is **Dorm 1** with 10 beds, "Room 1…9" is **Rooms 1–9**,
  with "n of m free now" and a button per bed or room that opens it to book. No data changes.

## v4.97.0 — 2026-11-21 — icon-check: one icon set, kept that way

- **`cd web && npm run icon-check`** (`web/scripts/icon-check.mjs`): fails when a `.ts` or `.tsx` file under `web/src`
  has an emoji outside a comment, or imports `lucide-react`. Allow list, with reasons, at the top of the script: the
  changelog page (quotes old button names) and `m04-blueprint/lib/circle-setup.ts` (circle emoji for communities
  without the v4 look). Text marks and arrows (✓ ✗ ☐ → ↕) pass.
- Runs in the **Lint workflow** (step "Icons") and is part of the `verify` skill.
- **`lucide-react` removed** from `web/package.json`: nothing imported it since v4.78.0 (`v4/lucide-compat.tsx` draws
  the old names from the marker-line set).
- New icon `info`; the two ℹ notes in Agreements use it. DESIGN-SYSTEM.md › v4 names the check. No migration.

## v4.96.0 — 2026-11-21 — The last emoji on screens become icons

v4.78.0 replaced emoji with the marker-line icons on most screens; these are the files it skipped. Every community.
- **Screens:** the Blueprint editor (`BlueprintClient.tsx`: import buttons, warnings, fact tiles, side list, phone tabs,
  light/dark switch), the older Home (`HomeClient.tsx`: module pills, access steps, badges, facts, the governance demo),
  the older Governance body (`GovernanceClient.tsx`), the older Bookings screens (`BookingsClient`, `ItemModal`,
  `ItemFormModal`), the older account menu (`AppTopBar.tsx`), the older dashboard's lock, the landing page's four
  checks, and "Change time" on an event.
- **The four governance checks** have one icon each everywhere: circles (consent), vote (majority), shield (expert
  review), spark (AI check). They were ☉ ☑ △ ◇.
- `CATEGORY_META` (`m15-bookings/lib/inventory.ts`): `emoji` is now `icon`, a name from the icon set (bed, wrench, building).
- **Match reasons** on Members (`m01-network/lib/match-score.ts`) are words only ("Shared skill: carpentry").
- **`InlineIcon` stays in its line of text:** `.v4-inl` is `inline-block`. The CSS reset makes every svg a block, so
  outside a flex row the icon sat on a line of its own (place names in the calendar, among others).
- Kept: text marks (✓ ✗ ☐ → ←), and circle emoji from the database for communities without the v4 look
  (`circle-setup.ts`). No content, setting or permission changed. No migration.

## v4.95.0 — 2026-11-21 — Admins choose a circle's seal

The picker v4.81.0 left open ("set `circles.icon` in a community migration for now"). v4 only.
- **`GlyphPicker`** (`core/components/v4/GlyphPicker.tsx`): every stamp as a seal in the circle's colour, or its first
  letter. In **Blueprint › Circles › Edit** (`CirclesStep.tsx`, where v4 showed an emoji picker that no screen used)
  and in the **circle's Edit window** on the Circles page (`UnitEditModal.tsx`, admins only: the `circles` table is
  theirs to edit). The shared list is patched (`usePatchCircle`), so every screen shows the new seal at once.
- **A new circle gets a first guess** from its name (`glyphFor`: "Kitchen" → pot, "Farming" → wheat); null shows the initial.
- **Without the migration nothing breaks:** where `circles.icon` isn't there yet (`20261215000000_circle_icons.sql` not
  applied) the picker doesn't show and `icon` is never sent; a failed write for that reason is skipped quietly
  (`isMissingIconColumn`), and the rest of the circle still saves.
- Blueprint › Circles shows each circle's seal in the list (v4); other communities keep the emoji and its picker.
- `/design`: the picker with sample values. No migration, no new setting.

## v4.93.0 — 2026-11-21 — Circle seals are stamps; the whole icon set on /design

Sonia: "custom cool icons for each circle in the right colour … distinct from the nav bar icons".
- **Circle glyphs redrawn as stamps** (`core/components/v4/circle-glyphs.ts`): solid cream shapes with details cut
  out in the circle's colour, instead of the thin line the interface icons use. Same 13 keys (spiral, wheat, hammer,
  pot, key, fire, megaphone, coins, broom, brush, ring, egg, bag), so nothing stored changes. `CIRCLE_GLYPH_LABEL`
  names them for the pickers to come.
- `Seal` (`CircleSeal.tsx`): the seal for a colour and a glyph you already have; `CircleSeal` uses it.
- **`/design` shows every icon** at 16, 24 and 40px with its name, and every seal at 16, 24, 40 and 64px.
- Icon review: `moon` redrawn (it was a thin sliver). The other twelve added in v4.78.0 hold up beside the originals.
- DESIGN-SYSTEM.md › v4 › three layers: seals are stamps. No migration.

## v4.88.0 — 2026-11-21 — Agents read the handoff notes first

Oscar: "make sure sonias agent receives our messages and tells her so she cant miss it". `CLAUDE.md` and
`AGENTS.md` now open with **Session start: handoff notes**. Every session first reads the community's
`instance/handoff/open/`, and the agent's first reply tells the person who each note is from, quoting every line
addressed to them, before anything else. Notes it has dealt with move to `done/`. Docs only.

## v4.87.0 — 2026-11-21 — A tidier circle page

Sonia, on the live v4.63.0 circle page: "this is messed up" (Overview) and "what are these" (Manuals & guides). v4 only.
- Overview: Tasks and Coming up side by side; Purpose (when longer than its first line) and Subcircles (small cards)
  below. The meeting-notes and project-manager links left the Overview (Meetings has "All notes →", Tasks the PM link).
- Manuals & guides: a line saying they are the circle's notes in the second brain, grouped by topic (first subfolder)
  with readable names ("running-at-100" → "Running at 100"); a topic's README is its "About …" entry.
- A guide's page takes its title from the note's first heading and doesn't repeat it.

## v4.84.0 — 2026-11-21 — Sort drafts right in the list

Oscar: "on the drafts to confirm task board… set the status… talk with an ai in the bar… see circle, sub circle,
task… and be able to change any of those. when user changes any of those, it is no longer a draft… leave the ones
that are there showing the new status until a refresh".
- In Operations › Tasks (M07), the list has **Circle**, **Subcircle** and **Part of** columns. For anyone who may
  edit the task, those and **Status** are pickers right in the row. They follow the task pop-up's rules: a
  subcircle or task brings its circle, and what no longer fits the new circle is cleared.
- **✦ Tell the assistant** on each row sends a request to the assistant bar about that task.
- Changing a draft confirms it. That covers the row's pickers, and changes the assistant makes to a draft task
  (Do: rename, assign, date, status, move). Undoing a Do change makes it a draft again.
- With **Only drafts to confirm** on, a confirmed or changed draft stays in the list, marked ✓ Confirmed with its new
  values, until the page is reloaded. No migration.

## v4.83.0 — 2026-11-21 — About reads as chapters

Only for communities with `"design": "v4"` (`AboutV4`). No migration.
- **Chapters.** Each chapter of About has its heading, a short intro and a photo of a place from the Map in a column
  that stays in view on a computer, beside its topics: tidy rows (icon, title, first sentence) that open to the
  whole answer. They replace the grids of text cards and "Read more". A day here is a timeline read from the
  daily-rhythm answer; values are a numbered list. Place photos show to signed-in people only, as on the Map.
- **At a glance.** The tiles under the photo each lead with a figure and say what it means in a line, read from
  the Blueprint (`glance()` in `lib/about-text.ts`): the land, people, places to sleep, climate, since, off-grid.
  A tile without a figure shows the answer's short form; each has a faint colour of its own and jumps to its
  whole answer, which opens and lights up.
- **The heading.** The photo is a fixed wide frame (at most 460px or 58% of the screen; taller on phones), the name
  is sized to the frame, and a shade sits only behind the words so the place stays visible. Under the name, the
  Project name's tagline, else the start of What we are. The place tag prefers a place with its country. On narrow
  phones Ask is a round icon beside Start joining. The chapter bar fades at its edge.

## v4.82.0 — 2026-11-21 — A calmer page colour (v4)

Sonia picked "Half the wash" from the cobalt study: the v4 page was tinted blue all over, so the cobalt drawings
blended into it. Only for communities with `"design": "v4"`.
- **Page half as blue:** `--bg` `#E9EFFD` → `#F1F4FC`, `--bg-2` `#EEF3FF` → `#F5F7FD`, `--bg-3` `#E2E9FA` → `#E8ECF5`
  (and `--background`, the Blueprint editor's copy, and the CSS fallbacks).
- **Neutral hairlines:** `--rule` `rgba(35,80,176,.13)` → `rgba(17,19,23,.09)`, `--rule-soft` → `rgba(17,19,23,.05)`;
  the circle-filter pill buttons lose their blue tint too.
- Unchanged: cobalt and cream for drawings, black main buttons, the green next step, status colours. No migration.

## v4.81.0 — 2026-11-21 — Circle seals

Sonia: "redo icons for circles in colours so they are distinct from the rest of icons". v4 only.
- Migration `20261215000000_circle_icons.sql`: `circles.icon` (a glyph key, checked format; null shows the
  initial). Who may change it: the existing "admins edit circles" policy. `loadCircleRows` falls back to the old
  select, so a community that hasn't applied it keeps its circles.
- `CircleSeal` (`core/components/v4/CircleSeal.tsx`) and 13 glyphs (`circle-glyphs.ts`: spiral, wheat, hammer,
  pot, key, fire, megaphone, coins, broom, brush, ring, egg, bag). Shown on circle cards and the circle page,
  in `CircleFilter` (list and pills), on project cards on the board, on a project page and in the calendar.
- In v4 `circles.meta().emoji` is empty and `label()` is the name: no emoji in text.
- DESIGN-SYSTEM.md › v4: the three visual layers (ink icons, circle seals, status pills).
- Not yet: a glyph picker for admins (set `circles.icon` in a community migration for now).

## v4.80.0 — 2026-11-21 — A calm Home (v4 look), for everyone

Sonia: "it should be clear giving a nice orientation to the app: purpose of Protopia MyCoNet, what can be found,
how to use it… because now it is overwhelming", then "shouldn't be long", "too little background", "seems a little
flat" and "it should say this is your portal". With `design: "v4"`, `/home` is now `HomeV4`
(`web/src/modules/home/HomeV4.tsx`), about two screens instead of twelve:
- A photo hero (the community banner): "Welcome to {community}" (or "Welcome, {name}"), the first clause of the
  Blueprint's description, and two ways in.
- **Start here** on the hero's edge: three steps for where you are (visitor, explorer, joining), ticked as they're
  done. Members don't see it; on phones they get their next step instead.
- **About {community}** (the Blueprint's what and why) beside **Your portal** (cobalt): what MyCoNet is, the ask
  bar, the menu, and that looking around breaks nothing.
- **What we do on MyCoNet**: the menu's own pages as tiles with live numbers (people, events, circles, projects,
  open proposals), locked ones saying when they open.
- **Happening now**: the next events and the open vote.

**Everyone lands on Home again** (Sonia: "everyone sees Home"). This undoes v4.78.0's "Home is the dashboard": `/home`
renders `HomeV4` instead of redirecting, a signed-in `/` goes to `/home`, and the v4 menu's logo links to `/home`.
My dashboard stays in the menu. The old module-by-module tour stays at `/home?tour=1`. Communities without v4 keep
the old Home. No migration.

## v4.79.1 — 2026-11-21 — A bigger Draft pill to slide

Sonia: "make slideable draft buttons slightly bigger so it is easier to drag both on mobile and desktop". The
Draft pill (`DraftSwipe`, M07, also on M18 meeting pages) is 11px text instead of 9px with 5×11px padding instead
of 1×5px (about 23px tall instead of 13px), rounder, and centred on the title's line. "Declined · Undo" matches.
The slide distance (36px) is unchanged. No migration.

## v4.79.0 — 2026-11-20 — Open a suggestion's task, and deciding confirms a draft

Oscar: "i should be able to click the name of the task and open the card… make the task stop showing draft".
- In the 🧭 Project manager panel (M07), a task's name in a suggestion opens its card on the board, and so does
  "Open task →" in Where this comes from. Saving the card confirms a draft, as before.
- Accepting a suggestion confirms the drafts it touches: the task given to someone, the tasks moved or put in a new
  task, and the one kept in a merge. The change is logged with `confirmed`, and **Undo** makes them drafts again.
  No migration.

## v4.78.0 — 2026-11-21 — The v4 look on every screen

Sonia: "let's fix all the changes so v4 reaches all screens". Only for communities with `"design": "v4"`; others
keep their look apart from the icons.
- **Home is the dashboard.** In v4, `/home` and a signed-in `/` go to `/dashboard`, and the menu's logo links
  there (the v4 menu has no Home item). `HomeClient` stays for other communities.
- **One style layer for the older screens.** The v4 bridge in `globals.css` now covers everything inside the shell
  (`<main class="v4-main">`, AppShell) instead of only `.v4-page` screens. It adds: the quiet eyebrow for the
  coloured module pill, the v4 title for `h1` set in the display font, the v4 page padding for the 48px frames,
  and the v4 veil and card for pop-ups that draw their own backdrop.
- **One icon set.** `lucide-react` imports point at `core/components/v4/lucide-compat.tsx`, which keeps the names
  and props and draws the marker-line icons. New icons: zoom-in, zoom-out, loader (spins), help, briefcase, at,
  up, sun, moon, check-circle, image, bowl, key. `InlineIcon` puts an icon in a line of text.
- **Emoji out of the screens** (sign-in, landing, calendar, event pop-up, task board, agreements, join,
  achievements, meetings, assistant, admin): replaced with icons. "The community at a glance" tiles carry an
  icon name instead of an emoji (`GlanceTile.icon`).
- Not yet: the old Governance body and Blueprint editor for non-v4 communities, and circle emoji (circle seals
  come next). No migration.

## v4.77.0 — 2026-11-20 — Where the project manager's suggestion comes from

Oscar: "click something that shows me where the project manager is pulling this info from… what meeting it came
from, date, who said it, any other facts about it". Each suggestion in the 🧭 Project manager panel (M07) has
**Where this comes from**. For each task it's about, that shows:
- The task's status, its project, who's on it, the due date and the priority.
- Where it came from. For a meeting, that's the meeting's name (a link), its date, its circle, the line that was
  said and who said it (Fireflies' speaker on that action item), and who was there. Otherwise, who added it by
  hand and when.
- The task's notes.
- When the project manager reviewed the board.

It's read with the person's own session, so a meeting they may not open shows as "a meeting you can't open". No
migration.

## v4.76.0 — 2026-11-20 — A photo of its own for each bookable thing

Sonia: "these photos should actually represent the accommodation".
- Migration `20261214000000_booking_item_photos.sql`: `booking_items.photo_url` (https only). Who may change it:
  the existing item policies. Read separately, so a community that hasn't applied it keeps its bookings page.
- Admins add, replace or remove an item's photo in its edit form (the public `branding` bucket, which only
  admins upload to; the file is `item-<id>-<time>.<ext>`, the old one is removed).
- Cards and the item's window show its own photo first, else the place's photo (v4.75.0). In the list each
  picture shows once, on the first card that has it (the 20 dorm beds share one).

## v4.75.1 — 2026-11-20 — A place's photo shows once

Sonia: "show the photo once per place". In Amenities & tools (M15) Browse, a place's photo shows on the first card
of that place in the list only (items sharing a place, like 20 dorm beds, no longer repeat it). The item's window
still shows the photo.

## v4.75.0 — 2026-11-20 — One map, and place photos on bookable things

Sonia: "I don't see accommodation photos, also map in both places is redundant".
- Amenities & tools (M15) Browse drops its Map / List switch and is a list, with a "See the map" button to `/map`
  (M19). The Map page already shows every bookable thing in its place's card. Admin › Bookings › Map (putting
  items' pins) stays: it's where items are placed.
- An item belongs to the place its pin sits in (within `NEAR`, 3% of the picture; the closest wins). Its card and
  its window show that place's photo, and the window links to `/map?place=<slug>`. Read separately, so a
  community without the `places` table still gets its bookings page. No migration.

## v4.74.0 — 2026-11-20 — Ask and Do read the second brain

Off by default: a community turns it on with `"assistant": { "secondBrain": true }` (needs `knowledge.repo` and
`SECOND_BRAIN_GITHUB_TOKEN`). Oscar: "give the ask do function access to read the second brain".
- New `modules/assistant/lib/brain.ts`. Ask answers from the notes this person may read, cited as
  (Second brain · <title>); Do's planner gets a few matching notes to understand requests ("the tasks from last
  week's kitchen meeting"). The notes change nothing by themselves.
- Who reads what (Oscar: tiered): visitors nothing; joining members and up the notes marked `visibility: members`
  (meeting notes, boards, circle pages MyCoNet writes), `visibility: circle` only for that circle's people and
  admins; circle leads, project leads and admins also the notes with no visibility (written by hand) and
  `visibility: leads`; any other value admins only. Never: transcripts, `AGENTS.md`, hidden folders, files over 150 KB.
- Light for the Workers free plan: one call lists the repo (kept 3 min), at most 10 matching notes are fetched for
  Ask and 5 for Do (each kept by its git sha). Ask gives the brain up to 90k characters, the documents the rest.
  A GitHub error just means no brain in that answer. No migration.

## v4.73.0 — 2026-11-20 — Community-wide meetings show in My circles (from Protopia, Sonia)

- A meeting the assistant judges community-wide (no single circle, e.g. a morning sync) now shows in the
  “My circles” view as well as “All”, and counts in the My circles chip, so it no longer looks missing.
  A meeting still being classified (“No circle yet”) is unaffected, and single-circle filters are unchanged.

## v4.72.0 — 2026-11-20 — About: a calm overview with a sticky chapter heading; the Blueprint editor in the v4 look (from Protopia, Sonia)

- The fact strip under the About photo is for a glance: label on top, the short fact, even rows at every width (one row,
  two, then pairs on a phone). A tile no longer opens in place; it jumps to the whole answer, which now lives once in its
  chapter (the land, living here, why we're here) and lights up when you arrive.
- A sticky chapter heading: the community's name once the photo has scrolled away, the chapters with the one you're
  reading in soft blue, and Edit for those who may edit the Blueprint.
- Chapters in the order a visitor asks: why we're here, our story, what we value, the land, a day here, how we decide,
  people, where we're going, living here ("Join us" for explorers), then the Blueprint.
- The Blueprint editor (`/about?edit=1`) takes the v4 look when a community uses it (Inter, the pale blue page, green
  actions; no more missing serif font), and its dashboard shows "<name> — Plan" and short facts instead of whole answers.
- About's styles move from `globals.css` to `modules/m04-blueprint/about-v4.css`.

## v4.71.0 — 2026-11-20 — Meetings: the leads' review as numbered steps (from Protopia, Sonia)

- v4 meeting page: the leads' strip under Files is now a "Review this meeting" card at the top of the right column,
  with four numbered steps: Circle (circle and Circle only), Tasks on the board (confirm drafts / put tasks on the
  board / look again), Email the notes (to the leads of the meeting's circle, when last sent) and Second brain (the
  note's path and who can read it; the transcript sits beside it, leads only). A finished step is ticked, and only
  the first unfinished one gets the green button. Same actions and permissions as before; the old design is unchanged.
- Meetings words: a meeting's task inside a bigger one reads "subtask of “…”"; the leads-only error names task leads.
- Fix: the meeting page showed a date-only meeting a day early (read as UTC); it now reads it as a local day.

## v4.70.1 — 2026-11-20 — a small mark beside the community's name in the menu (from Protopia, Sonia)

- v4.68.2 put the whole logo in the v4 menu, which hid the name. The menu is back to the mark plus "<name> on MyCoNet",
  and the mark can now be an image: `brandMark` in `instance/config.jsonc` (a square image URL, passed as
  `NEXT_PUBLIC_BRAND_MARK`). Without it, the first letter as before.

## v4.70.0 — 2026-11-20 — Map: the land with every place on it (from Protopia, Sonia)

- New module **M19 Map** at `/map` (v4 menu › Community, after Amenities & tools): the community's picture of the
  land (`community_settings.site_map_url`, the Amenities map's picture) with a pin per place. A place has a kind
  (accommodation, shared space, amenity, food & gardens, water, forest & trails, gathering spot, other), a photo,
  a description, a circle that looks after it and a task. Its card opens beside the pin, or under the map on a phone,
  with "Book …" for the bookable things whose pin sits on it, the circle and the task. Filter by kind;
  `/map?place=<slug>` opens a card. Admins and circle leads (their circles) add and move places with "Edit places".
- **Migration** `20261211000000_places.sql`: table `places` (slug, name, kind, map_x/map_y, photo_url, description,
  circle, project_id). Signed-in people read; admins, and circle leads for their circles, write. Without it the
  page still shows the bookable things.
- The Amenities map's engine is now the shared `core/components/v4/SiteMap.tsx` (same behaviour). On phones, pins
  are smaller until you zoom in. New icons `drop` and `tree`.
- Second brain: places aren't written there yet (follow-up in `m19-map/README.md`).

## v4.69.0 — 2026-11-20 — every Members screen in the v4 look (from Protopia, Sonia)

v4 only; the classic look is unchanged.
- **Matches** (`/members/matches`): uniform cards (match %, why, skills), chips All / Top / Good / Potential,
  "How matching works" folded underneath; the visitor view keeps it open.
- **My offers / My requests**: page header with "+ Add offer / request", calm cards with edit and delete; the same
  form (now one `form` const, shared by both looks). Urgent and high requests are marked "Urgent" / "Soon".
- **Discover**: one search box that searches as you type, member types as chips, the same cards. Visitors still see
  only the public card (no skills, no score).
- **My profile** (`/members/profile`) goes to your own `/u/<username>` (already v4, with Edit profile on it).
- **Edit profile**: page header, Save draft, a progress bar, the 8 steps as chips with a tick, a calm card, and
  "Next: <step>" buttons. Same fields and saving.
- New `m01-network/PersonCardV4.tsx` (card + "How matching works"), `MatchesV4.tsx`, `lib/match-dimensions.ts`.

## v4.68.2 — 2026-11-20 — the community's logo in the menu (from Protopia, Sonia)

- The v4 menu (`MenuV4`) showed the first letter of the community's name. It now shows the logo set in the Blueprint
  (`community_settings.logo_url`, via `useBranding`), up to 56px tall in the open menu and 38px in the slim rail; the
  name stays for screen readers. Communities without a logo keep the letter.

## v4.68.1 — 2026-11-20 — Members and profile take less room (from Protopia, Sonia)

- `/members` (v4): your best matches are compact rows (avatar, name, reason, %), not tall cards; "Lately" is now
  "Members activity"; the offers/requests box is gone (the My offers / My requests tabs stay).
- Your own profile (v4) listed your circles twice. `MyCircles` takes `askOnly`: there it shows only circles you've
  asked to join (with Withdraw) and "Ask to join a circle".

## v4.68.0 — 2026-11-20 — one circle filter everywhere: "Circles ▾" (from Protopia, Sonia)

- New shared `CircleFilter` (`core/components/v4/CircleFilter.tsx`, styles `.v4-cf*` in globals.css): a "Circles ▾"
  button opens every circle with its colour dot, a count and a search box; pick one or several; the chosen ones show
  as pills with ✕ and a Clear. A pop-over on a computer, a sheet from the bottom on a phone (on `<body>`, above the
  assistant button). Nothing scrolls sideways any more. "My circles" at the top when the viewer has circles.
- v4 pages use it instead of a sideways chip row or a dropdown: Members, the Operations board, Meetings and the
  Calendar. Each page keeps its choice in the address (`?circle=a,b`); one slug still works as before, and
  Meetings still takes `mine` / `all` and opens on My circles.
- Several circles at once: Operations' project manager panel (`circle` prop now takes a list) and the Calendar
  filter by any of them; new tasks and events start in the circle only when exactly one is chosen.
- Helpers `parseCircleParam` / `setCircleParam` for pages that want `?circle=` in the URL.

## v4.67.1 — 2026-11-20 — Operations no longer crashes without the service key; requests show again

- `m07-ops/lib/pm-data.ts`: the project manager's recent changes are read with the service key; a community
  without `SUPABASE_SERVICE_ROLE_KEY` got "This page couldn't load" on Operations for every signed-in person
  (RTRN). Now the panel is just empty and the Worker logs `[pm-data] recent agent actions skipped`.
- `user_requests` has `request_text`, not `title`: Members, Home and Members (v4) asked for `title`, so the
  latest requests never showed. They now read `title:request_text`. No migration.

## v4.67.0 — 2026-11-20 — Members in the v4 look: matches first (from Protopia, Sonia)

- `/members` (v4 only): your best 3 matches lead, with your profile progress, your offers and requests and
  "Lately" beside them; then everyone as uniform compact cards with your match % on each. One search box
  with a clear button and a result count; circle chips filter. Visitors still see only the public card.
- The Members "Search" tab is called "Discover". "Project leads" reads "task leads" on the profile editor.
- New `m01-network/members-v4.css` (`.mb4-*`); `MembersV4` takes `offersCount`, `requestsCount`, `matchScores`.

## v4.66.0 — 2026-11-20 — a community can make the Blueprint admins-only (from Protopia, Sonia)

Off by default: nothing changes unless a community turns it on.
- New `"blueprintEditors": "admins"` in `instance/config.jsonc` (`NEXT_PUBLIC_BLUEPRINT_EDITORS`). With it, only
  admins see Edit Blueprint on About and can edit the wizard (answers, values, documents, circles step); circle
  leads read it like everyone else. Without it, circle leads and admins edit, as before.
- `core/lib/roles › canEditBlueprint` and `BLUEPRINT_EDITORS_LABEL` ("Admins edit these" vs "Admins and circle
  leads edit these") replace `isCircleAdmin` on About and `/blueprint`.
- The database still allows circle leads unless the community narrows the policies in its own
  `instance/migrations/` (Protopia: `20261210100000_blueprint_admins_only.sql`).

## v4.65.0 — 2026-11-20

- **The assistant changes calendar events** (Oscar: "we want the agent to be able to change events on the calendar -
  update time, date, notes in it"). Do gets `change_event` (`modules/assistant/lib/do-events.ts`): date, start, end,
  all day, title, description (notes), place, online link, in the community's time zone; "move this to 7" works on
  an event open on the Calendar. Same rules as the Calendar, with the person's own session: anyone joining and up may
  move an event (`event_set_times`); its details only its host, an admin or a lead of its circle; events from the
  linked Google calendar take only a new time and notes (`event_set_notes`). Google follows: the push code moved from
  `/api/calendar-push` to `m14-events/lib/google-push.ts`, shared by both. Undo puts it back, in Google too. No migration.

## v4.64.0 — 2026-11-20 — About shows the whole Blueprint (from Protopia, Sonia)

Only with the v4 look. Sonia: is all the Blueprint on About, and is it the clearest overview?
- **Nothing hidden any more.** The Blueprint's checklist notes now show: the land's **Day to day** (getting here,
  internet and work, waste, when the weather turns), the food / water / energy / buildings notes under each
  system, **How we decide › In practice** (how we meet, how we talk, deciding day to day, when we disagree) and
  **Living here** (before you join, money, when someone leaves). Answers that only showed when their partner was
  empty now show beside it (why the world needs it, the personal why, the ecological assessment). The values
  answer shows in full when the values list is short.
- **Fact tiles**: the label sits on top, the facts read cleaner ("2 dorms with 4 bunk beds each", "Regenerative
  farm and co-living laboratory"), and each tile opens to the whole answer.
- Long mission, vision and why texts open with Read more.

## v4.63.0 — 2026-11-20 — Circles at a glance, and a circle in tabs (from Protopia, Sonia)

Only with the v4 look; the classic org chart keeps working (its words now say subcircle).
- **/circles**: a card per circle with what matters first: its purpose in one sentence, its lead, its members'
  photos, and (signed in) its open tasks and meetings with the next date.
- **A circle's page** (`/circles?c=<slug>&tab=…`) has tabs: **Overview** (lead, members, open tasks, next
  meeting; its subcircles, first tasks and coming meetings), **Manuals & guides**, **People** (cards with photos
  and the subcircles each person is in; join requests on top for leads), **Subcircles** (each one a small circle:
  purpose, lead, people, tasks, Edit), **Tasks** (tasks with their open subtasks, tasks of their own, subtasks due
  first) and **Meetings** (coming calendar events tagged with the circle, meeting notes).
- **Manuals & guides** are the notes in the circle's folder of the second brain (`circles.brain_folder`, else the
  slug; not its README, board or meetings), read inside MyCoNet at `/circles/guide` by joining members and up.
  Front matter `visibility: circle` / `leads` limits who can open one.
- Everything stays: Edit, + Add subcircle, + Add member, ask to join / withdraw, accept / decline, the lead name,
  meeting notes, the project manager, admins.
- The Circles CSS moves from `globals.css` to `web/src/modules/m17-org/circles-v4.css`.

## v4.62.0 — 2026-11-20 — Operations is the Task board (from Protopia, Sonia)

Only with the v4 look, except the words. Sonia picked option A, "calm Kanban", from three mock-ups.
- **/operations** is titled **Task board**. One summary line ("N tasks on the go · N open subtasks · N done")
  replaces the six stat boxes; **Late** and **Drafts to confirm** are chips. One chip row picks what the page shows:
  Tasks (the board), All subtasks (the board of every subtask), List, Updates, Circles. The circle filter is a
  dropdown; Everything / I lead / I'm in / I watch stays.
- **Cards as the prototype**: name, circle dot and subcircle, a progress bar of subtasks, the due date (red when
  late), the lead and the people with a subtask as avatars, how many watch it. A task of its own says so.
  Buttons: "New task" (green) and "Task of its own" for admins and leads, "Suggest a task" for others.
- **Phones**: the board scrolls sideways one column at a time.
- **Words across Operations** (every look): task, subtask, task of its own, subcircle and "offer to help" on the
  board, the task page, the pop-up, the suggest form, the List, Circles and the project manager's suggestions.
- Unchanged: drag-and-drop and its permissions, offers to help → agreements → subtasks, drafts from meetings,
  the project manager, watching, events, subcircles and deadlines. Styles in `m07-ops/ops-v4.css`.

## v4.61.0 — 2026-11-20 — subcircles, and tasks with subtasks instead of projects (from Protopia, Sonia)

Words only; no table, column, route or data changes. `LEXICON.md` changed first (Sonia, 20 Nov):
- **team → subcircle**: a smaller, lasting group inside a circle.
- **project → task**, and a project's tasks → **subtasks**. Projects are parked in a new "For later" section of the
  lexicon. In the data, the `projects` table holds tasks (the ones that can have subtasks) and `deliverables`
  holds subtasks; a deliverable with no project is a task of its own. The role label "Project lead" is "Task lead"
  (the role value `project_lead` stays).
- Changed in the shared places: menu and next step, top-bar search, board permission messages, Dashboard, Home and
  the landing page, sign-in, Agreements ("an offer to help on a task", "Find a task", "Suggest a task"), Join,
  Achievements, Calendar labels, admin role labels, and the assistant (its Do confirmations, and both prompts now
  use task, subtask and subcircle). The Operations, Circles, Members, Governance and Meetings screens change in
  their own module releases. "Project" where it means the whole community (the Blueprint's "project document",
  "where the project stands") stays.

## v4.60.0 — 2026-11-20 — Meetings clear at a glance (from Protopia, Sonia)

Only with the v4 look. Sonia: the circle needs more than a colour, and the list should read at first glance.
- **/meetings**: each row has a date box (month, day, weekday), the circle as a named tag on its colour (or
  "Community-wide" / "No circle yet"), the title without a leading date ("19.11.2026 …"), the summary's first
  point as plain text, and a short counts line (action items, tasks on the board, people; names on hover).
  Meetings are grouped under This week, Last week, then month. Circle chips carry the circle's dot;
  **Needs review** is a chip with its count. On phones the status pill moves into the circle line.
- **Meeting page**: the circle tag in the header uses the same named style.
- The `.mt4-*` rules moved from `globals.css` to `web/src/modules/m18-meetings/meetings-v4.css`.
- Second brain: unchanged (display only; meeting notes are written as before).

## v4.59.0 — 2026-11-20 — green actions, soft toggles, and more calendar on the first screen (from Protopia, Sonia)

Only with the v4 look. Sonia: actions stay green and stand out most; tab and filter toggles get a delicate colour,
not black; Tasks off by default; more of the calendar when you land.
- **Buttons**: the main action button (`v4-btn--primary`) is green. Selected chips and segmented toggles
  (`v4-chip--on`, `v4-seg .on`) are soft blue instead of black.
- **Calendar**: Tasks are off until ticked (`?show=` still wins). The header is shorter, **+ Add event** is the
  green next-step button, the event kinds and categories share one row, and the week fills the screen and opens
  at the morning (events before 5 am don't pull it to midnight).

## v4.58.0 — 2026-11-20 — The v4 look on phones (from Protopia, Sonia)

Only with the v4 look, and only at phone widths (a new `web/src/app/v4-mobile.css`, every rule under
`html[data-design="v4"]` and a max-width media query, imported after `globals.css`).
- **Kanban boards** (Operations, a project's tasks) scroll sideways inside their own box, one column at a time;
  each column scrolls on its own.
- **Off-centre labels** fixed: text-only links stretched to 44px by the tap-size rule get their text centred.
- **Stacking**: search pills, the project header, Governance's four checks and the Achievements badges.
- **Fields are 16px** (no iPhone zoom on tap); bottom-sheet modals keep clear of the home bar.
- **Lighter first load**: the Geist fonts (Blueprint wizard only) are no longer preloaded; avatar lists load lazily.

## v4.57.0 — 2026-11-20 — details the prototype layouts had dropped, back (from Protopia, Sonia)

Only with the v4 look. Sonia: keep the app's important features where the prototype is thinner.
- **Meetings**: the list shows who was there and how many tasks are still drafts; a meeting's action items show
  the line from the meeting they came from.
- **Governance**: the proposal page has the "people checks passed" bar with the approval mark again, the members'
  vote shows yes and no counts, and each card says who proposed it.
- **Project page**: an overdue deadline shows as overdue.
- **Circles**: team members' titles show on the team row.

## v4.56.0 — 2026-11-20 — the calendar opens on the week (from Protopia, Sonia)

Only with the v4 look. Sonia: the calendar as it was is better than the prototype's list; open on the whole week
with its time slots.
- The calendar opens on **Week** (Day, Week, Month, List in their usual order). The prototype-style list from
  v4.53.0 (`AgendaV4`) is removed; List is the calendar's own list again.
- **List › Upcoming** starts at the beginning of today: events that are already over today stay in place,
  greyed out. **Past** shows everything over, greyed out.
- The week title reads "Nov 16 – 22, 2026" (some browsers printed "Nov 16 – 2026 (day: 22)").

## v4.55.0 — 2026-11-20 — Profile, Join and the project page laid out as the prototype (from Protopia, Sonia)

Only with the v4 look; the classic look is unchanged.
- **Profile** (`/u/<name>`, `pProfile`): back to Members, a big avatar and name with their circles (and match, for
  others) as tags, Edit profile on your own, the headline and public bio in a card, the About / Personality / Offers
  / Requests / Travel tabs as chips, and their circles on the right (lead or member; on your own, Ask to join).
  Visitors still see the public card and the sign-up invitation.
- **Join** (`pJoin`): the application is one card with "Join · step N of 3", a step bar and the step's title, and the
  three steps listed beside it. Signing values, the buddy step and sending the application work as before.
- **Project page** (`pProject`): a hero in the circle's colour with the circle (and team), the lead and the
  calendar at hand, the big title, tags for status, open for helpers, lead, tasks and due date, and the green
  **Offer to help · start an agreement** button. The board, updates and settings below are unchanged.

## v4.54.0 — 2026-11-20 — Meetings, Governance and Agreements laid out as the prototype (from Protopia, Sonia)

Only with the v4 look; the classic look is unchanged.
- **Meetings** (`pMeetings` / `pMeeting`): the list is rows with a chat tile, date, circle, action items and tasks on
  the board, the summary's first lines and the status (Needs review, to confirm). A meeting's page has circle, date
  and people tags, the summary in a card, its action items as rows (draft swipe or "On the board"), Fireflies' own
  list folded, the documents, and on the right the files (notes, transcript), the second-brain link and the leads'
  tools.
- **Governance** (`pGovernance` / `pProposal`): proposal cards with their state and a pill per check, then a page
  per proposal with the description, **Your vote** (yes / no), the discussion, and the **4 checks** as rows with
  their state, the vote bar, and the same consent and review buttons for circle leads, admins and advisors. The
  new proposal form opens in the shared pop-up.
- **Agreements** (`pAgreements`): Yours / Find a project chips; your agreements as rows ("Project: what you give",
  what you'd like back, status). Finding and offering on a project is unchanged.

## v4.53.0 — 2026-11-20 — Circles and the Calendar list laid out as the prototype (from Protopia, Sonia)

Only with the v4 look. Sonia: compare every page with the prototype.
- **Circles** (`m17-org/CirclesV4.tsx`, `design/redesign-prototype/app.js › pCircles / pCircle`): a card per circle
  (its emoji, leads, member and team counts, purpose, avatars, "You're in it", how many are asking to join; the
  stewards circle first with "Looks after every circle"), the admins below. Each card opens the circle's own page
  (`/circles?c=slug`): its purpose, Edit, **Ask to join** / withdraw (members), who's asking (Accept / Decline for
  its leads), members with leads first, + Add member, the lead name, teams (+ Add team, Edit, their projects),
  the circle's open projects with their status, meeting notes and the project manager. The classic org chart stays
  for everyone else.
- **Calendar** (`m14-events/AgendaV4.tsx`, `pCalendar`): opens on the List view. Each event gets a date box, its
  day, time, place, how many are going and its circle, with a one-tap **RSVP** (tap again to undo). A small month
  sits beside it with dots on the days that have something; picking a day opens the Day view. Shows 12 at first,
  "See all" for the rest. Day, Week and Month are unchanged.

## v4.52.0 — 2026-11-20 — About {community} laid out as the prototype (from Protopia, Sonia)

Only with the v4 look. Sonia: "this is not the design". `AboutV4.tsx` now follows
`design/redesign-prototype/app.js › pAbout`, filled from the community's own data:
- **Hero**: the banner full-bleed with a dark fade, a place tag (from the Blueprint's working name or country), the
  name very large in white, the tagline, Start joining (explorers), **Ask about {community}** (opens the assistant)
  and Edit Blueprint (circle leads).
- **Facts strip** with short facts (lead-ins dropped, number words as digits), chapter chips that stay on top.
- **Chapters**: Why we're here (the purpose as a big quote, mission and vision cards), Our story, The land (with the
  Amenities map picture when there is one, and food / water / energy / shared-spaces cards), A day here (times when
  the rhythm has them), What we value (numbered pastel cards from the community values, agreements banner), How we
  decide, Living here (ways to stay, how joining works as numbered steps), People (circle leads and admins), Where
  we're going, and **Blueprint progress** (readiness, gates and the five pillars, from the wizard's own scoring).
- Long answers show their first sentences with **Read more**; every other answered field stays under "The whole
  Blueprint". Uses `community_settings.site_map_url` when present (read forgivingly).

## v4.51.0 — 2026-11-20 — the insides of the older pages in the v4 look (from Protopia, Sonia)

Only with the v4 look. A scoped layer in `globals.css` restyles the inline-styled patterns the older pages share,
only inside v4 page frames and pop-ups (`.v4-page`, `.v4-members`, `.v4-gov`, `.modal-shell__dialog`): bordered
cards become soft white cards, underline tabs become chips, module-coloured buttons become black pills, outlined
buttons become white pills, monospace capital labels become light capitals, fields get the shared field look, and
thick coloured card edges go. Covers Agreements, Meetings, Governance, Join, Achievements, the Members sub-pages,
Operations and the pop-ups (task, project, event). Matches React's style text both as server-rendered (`prop:val`)
and after hydration (`prop: val`). The building blocks are untouched. Pages still get proper rebuilds over time.

## v4.50.0 — 2026-11-20 — Join, Achievements, sign in and the landing page in the v4 look (from Protopia, Sonia)

Only with the v4 look.
- **Join** and **Achievements**: the shared page header in the v4 page frame.
- **Sign in** (`app/auth/login`): the shared field (white, rounded, hairline) and the black pill button; headings in
  the v4 type.
- **The landing page** (`/`, `landing.css`): a scoped layer in `globals.css` (`[data-design="v4"] .lp…`): headings in
  the v4 type, black and white pill buttons, light-capital eyebrows without module dots, soft cards.

## v4.49.0 — 2026-11-20 — Operations in the v4 look; the phone top bar as in the prototype (from Protopia, Sonia)

Only with the v4 look.
- **Operations** (`m07-ops/OpsClient.tsx`): the shared page header (Suggest a project, Task, Project), the numbers as
  soft cards (At risk and Drafts still filter when clicked), Board · Tasks · Updates · Circles as chips, and the
  filters as one row (Projects | All tasks, circles with their colour dot, Everything | I lead | I'm in | I watch).
- **The board and the project page**: columns on a soft panel, cards as white rounded cards without the coloured
  edge; the project title in the v4 type (`ops-col`, `ops-card`, `ops-detail-*` hooks in `globals.css`). Dragging,
  permissions, drafts and pop-ups are unchanged.
- **Phone top bar** (`AppTopBar.tsx`): a menu button and the name of the page you're on, on the page colour, then the
  bell and your account (the logo is in the menu).
- Slim menu mode applies on desktop only.

## v4.48.0 — 2026-11-20 — the menu as in the prototype, with a slim mode (from Protopia, Sonia)

Only with the v4 look.
- **Full-height menu** (`MenuV4.tsx`, `AppShell.tsx`), like `design/redesign-prototype`: the community's letter mark
  and name ("on MyCoNet") on top, the next step, You / Community / Working together / Admin, and you at the foot
  (photo, name, role → your profile) with the version under it. The top bar sits over the page only, on the page
  colour, with search, the bell and your account; the logo moves into the menu.
- **Slim mode** instead of hiding the menu: the arrow beside the name makes it a 76px rail of icons (names on hover,
  a red dot for counts, the next step as a round green button); the arrow brings it back. Remembered per browser.
- Active page in the prototype's style (page colour with a hairline). On phones the menu opens full, with a close
  button.
- `layout.tsx` passes who's signed in (`MenuState.me`).

## v4.47.0 — 2026-11-20 — Circles, Agreements, Meetings and Governance headers in the v4 look (from Protopia, Sonia)

Only with the v4 look; release 7 continues (a first pass on these four pages).
- **Circles** (`m17-org/OrgChartClient.tsx`): the shared page header ("Circles", where you sit, Add circle for
  admins) and soft white cards for the stewards and every circle, no coloured stripes. Editing is unchanged.
- **Agreements**, **Meetings** and **Governance**: the shared page header with their main action (Propose a new
  project, Upload recording, New proposal) as a shared button, inside the v4 page frame.
- Their lists, tabs and pop-ups keep their current inside for now (next passes).

## v4.46.0 — 2026-11-20 — Calendar in the v4 look (from Protopia, Sonia)

Only with the v4 look; release 7 continues.
- **Calendar** (`m14-events/EventsClient.tsx`): the page header (Linked calendars, Add from a photo, New event as
  shared buttons), the event kinds and categories as chips you switch on and off, and one toolbar (previous /
  Today / next, the circle filter, Day · Week · Month · List).
- **Event rows** (List and Day views, `CalendarViews.tsx`): time, title, where, online, circle, project and Public
  with icons, who's going, and your answer as a status label. Month and week grids get the soft frame.
- Same events, filters, links (`?show=`, `?view=`), RSVPs, pop-ups and permissions as before.

## v4.45.0 — 2026-11-20 — Members in the v4 look (from Protopia, Sonia)

Only with the v4 look. Release 7 of DESIGN-SYSTEM.md › v4 starts here: the existing pages move to `core/components/v4`.
- **Members** (`modules/m01-network/MembersV4.tsx`, `MembersGridV4.tsx`): everyone as cards (avatar, headline, their
  circles, what they offer and what they're looking for), filtered by circle or searched. The classic page listed
  only the newest eight. Kept from the classic page: "Finish your profile" (now the green next step), your best
  matches, and what's new lately; the visitor note with Sign in / Create account.
- **One row of tabs** for the Members pages (Everyone, Matches for you, My offers, My requests, Search, My profile)
  instead of their own side menu (`MembersTabsV4.tsx`, in `app/members/layout.tsx`). The sub-pages keep their
  current inside for now.

## v4.44.0 — 2026-11-20 — the Amenities map is interactive (from Protopia, Sonia)

- **Zoom and move around** (`AmenitiesMap.tsx`): + / − and a reset button, double click, ⌘/Ctrl + scroll or a
  trackpad pinch, drag to pan, two fingers on a phone. A plain scroll still scrolls the page. Pins keep their size.
- **A card for each pin**: what it is, where, how many people, "Free now" or "In use until…", whether it needs
  approval, and **See and book** (opens the booking pop-up). Beside its pin on wide screens, kept inside the map;
  under the map on phones. Escape or a click on the map closes it.
- **The list beside the map**: hovering a name lights up its pin; clicking it flies there and opens its card.
- Pins opt out of the phone 44px button minimum (`no-min-height`) with a larger invisible tap area.

## v4.43.1 — 2026-11-20 — fix: the map pin check (from Protopia)

- **Migration `20261210000100_amenities_map_pin_check.sql`**: v4.43.0's pin check let a half pin through (one
  coordinate set, the other empty), because a CHECK that comes out NULL counts as passed. Now both are set and
  between 0 and 100, or both are empty. Apply it with the v4.43.0 migration (found in Protopia's dry run, before
  anything was applied). The app always saves both together, so no data was affected.

## v4.43.0 — 2026-11-20 — the Amenities map (from Protopia, Sonia)

- **A map on Amenities & tools** (v4 look): the community's picture of the land (an aerial photo or a drawn plan)
  with a pin for each room, tool and space that has one. Map | List switch; a pin opens the item. Items without
  a pin are listed under the map. `modules/m15-bookings/AmenitiesMap.tsx`.
- **Admin › Bookings › Map**: admins upload or replace the picture (public `branding` bucket, like the banner);
  admins and circle leads place, move or remove the pins of the items they manage ("Place", then click on the map).
- **Migration `20261210000000_amenities_map.sql`**: `community_settings.site_map_url`, `booking_items.map_x` and
  `map_y` (percent of the picture, 0–100, both or neither). No new policies: the existing ones decide who edits
  (admins for the picture; the "leads edit items" policy for pins). The page reads pins and the picture on their
  own, so a community that hasn't applied the migration yet keeps a working bookings page without the map.

## v4.42.1 — 2026-11-20 — the booking pop-up and item form in the v4 look (from Protopia, Sonia)

Only with the v4 look. Same fields, rules, checks and messages; only the view changed.
- **Booking pop-up** (`m15-bookings/ItemModal.tsx`): the item's icon tile in the title, tags and circle as tags,
  location, capacity and approval as an icon list, booked times as soft rows ("You" in the action green), the
  booking form with the shared fields, the overlap warning, and Archive / Edit item at the bottom.
- **Add or edit an item** (`ItemFormModal.tsx`): category and circle as chips, tags you can remove, suggested tags,
  the approval checkbox, Cancel / Save.
- **Shared form styles** for any v4 pop-up (`globals.css`): `.v4-modal`, `.v4-form`, `.v4-field`, `.v4-input`,
  `.v4-check`, `.v4-done`, `.v4-warn`, `.v4-error-box`, `.v4-hint`. No migration.

## v4.42.0 — 2026-11-20 — the v4 menu (from Protopia, Sonia)

Only with the v4 look (`"design": "v4"`); every other community keeps today's menu and addresses. Release 2 of
DESIGN-SYSTEM.md › v4, from the menu Sonia decided on 19 Nov (`design/redesign-prototype/app.js › NAV`), with the
orientation review's proposals she picked (O3, O5, O7, O8, O9 below).

- **The menu** (`core/components/shell/MenuV4.tsx`; AppShell picks it, `AppSideNav` is unchanged): **Your next step**
  on top in the action green, then **You** (My dashboard, with your open-task count), **Community** (About
  {community}, Members, Calendar, Circles, Amenities & tools), **Working together** (Operations, Agreements, Meetings,
  Governance) and **Admin** for circle leads and admins (Applications and Bookings with their waiting counts,
  Permissions). Plain names and one icon each (the shared `Icon` from `core/components/v4`). One list feeds the menu,
  the phone tab bar and search: `core/lib/nav.ts › menuGroups()`.
- **The next step** (`core/lib/menu-server.ts`, loaded in `layout.tsx` with the viewer's session): signed out,
  Create account (Sign in beside it); explorer, Start joining (or "Your application is in"); joining member, Your
  first agreement (or "Waiting for an answer"); admin, booking requests then join applications; circle lead, join
  applications; then your next task by due date, else "Find a project to help on". For explorers and joining
  members it shows **Explorer · Joining member · Member** with "Step N of 3" (O3), and each group has a line
  under its label (O7). It hides on My dashboard, which has its own next step (`DashboardV4`).
- **Locked items say why** (O5): below joining member, Agreements and Meetings show a lock, aren't links, and say
  "Opens when you're a joining member" on hover and to screen readers. Amenities & tools isn't locked.
- **Phone tab bar** (`TabBarV4.tsx`): Dashboard, Operations, Calendar, Members and Menu, each named under its
  icon (O9). Explorers and joining members get About instead of Operations (O8). Menu shows the name of the
  page you're on when it isn't one of the four, and opens the menu above the bar. The assistant's dot moves up.
- **New pages and addresses**: `/about` (the Blueprint page), `/amenities` (all bookable things on one page: a
  third booking scope, `amenities`; Browse, My bookings, Manage), `/admin/applications` (join applications, moved
  out of the Join page; circle leads review, admins decide), `/admin/bookings` (booking requests and the
  inventory) and `/admin/permissions` (`UsersAdminClient` with `readOnly` for circle leads). They exist for every
  community; with v4, `/blueprint`, `/accommodation`, `/resources`, `/stays`, `/bookings` and `/admin/users`
  redirect to them permanently (`next.config.ts`, read from `NEXT_PUBLIC_DESIGN`).
- **The user menu** (under your name) with v4: View my profile, Edit profile, Change password, Achievements, Sign
  out. Achievements stays here until badges show on profiles; no dark-mode switch (v4 is light only).
- **The version** under the logo is small plain text with v4 (11px, `--ink-4`), not a pill.
- Booking for explorers says "Booking opens when you're a joining member" (all communities).
- **LEXICON.md**: the v4 menu's names and addresses (My dashboard, About {community}, Amenities & tools,
  Applications, Bookings, Permissions).
- **About {community} in the v4 look** (`modules/m04-blueprint/AboutV4.tsx`): the Blueprint as a page to read. The
  banner and logo, the community's name with the working name's sentence as a tagline, short facts, and chapters
  from the Blueprint answers (why we're here, mission and vision, values with the community values, the land, how we
  live, decide and share, joining, where we're going). Every other answered field is folded under "The whole
  Blueprint", so nothing is hidden. `?edit=1` and old `/blueprint?step=…` links open the wizard; everyone gets a
  link to it (read-only below circle lead).
- **Amenities & tools and Admin › Bookings in the v4 look** (`modules/m15-bookings/BookingsV4.tsx`, only the view:
  `BookingsClient` keeps the state, rules and writes). Category filters with counts, search, tag filters, cards with
  "Free now"; My bookings and Manage as lists. Admin › Bookings has **Calendar** (two weeks of rooms, and any tool or
  space booked, with who and waiting requests in yellow; earlier/later), Requests and Inventory.
- **Admin › Permissions in the v4 look** (`UsersAdminClient › PermissionsV4`): filter by role, "What can each role
  do?", each person's role, the circles they lead and the circles they're in (same saves), and **Community settings**:
  one list of what only admins change (look and feel, circles, documents, community values, the Blueprint), each
  opening where it lives.
- Not yet: the map of amenities (items have no position yet), the booking pop-up's inside, a vote as the menu's next step (My dashboard has it). The counts refresh when a page loads, not as you click
  around. No migration.

## v4.41.0 — 2026-11-19

- **v4 building blocks** (`core/components/v4`, DESIGN-SYSTEM.md › v4, release 2): `Button` (primary, secondary, quiet,
  danger, next), `StatusPill` (+ `statusFromDb`, lexicon labels), `Chip`/`ChipRow`, `Card`, `List`/`ListRow`, `IconTile`,
  `PageHeader` (eyebrow without module numbers, title, line, actions, back link), `NextStep`, `SectionHead`, `EmptyState`,
  `Tag`, and `Icon` with Sonia's 66 marker-line icons (`core/components/v4/icons.ts`). Styles are the `.v4-*` rules in
  `globals.css`; they read the v4 tokens with fallbacks, so they work where v4 is off. Nothing uses them yet except
  `/design`, a reference page with every block (sample words, noindex).
- **My dashboard in v4** (`m00-dashboard/DashboardV4.tsx`, shown only when v4 is on; DESIGN-SYSTEM.md › v4 release 3):
  "Hey {name}, welcome home", one next step by role (Start joining / your application / your first agreement / join
  applications to answer / a proposal to vote on / your next task), your project and the next event, **Your tasks** with
  status filters (`YourTasks.tsx`; My tasks lives here now), open proposals (with "You voted"), your circles, and a
  "Start here" list for explorers. Built only from `core/components/v4`; no module numbers.
- **ModalShell** gets class names; under v4 its backdrop is light and blurred and it opens as a bottom sheet on phones.
  Unchanged where v4 is off. No migration.


### the lexicon's words on the remaining screens

- **Governance** (`LEXICON.md`): every proposal gets **4 checks**, each named who · how (Circle leads · consent, All
  members · majority vote, Admins & advisors · expert review, AI · Blueprint check); **Approved** / **Not approved**
  instead of "live" / "Rejected"; "Waiting for circle leads" instead of "Awaiting CL"; no "layers", "L01–L04" or
  "threshold". Same words in the home and landing demos and the sign-in page.
- **Governance: the AI · Blueprint check is advice** (Sonia, 2026-11-19). It always counted as passed and was never
  saved, so "3 of 4" really meant 2 of the 3 people checks. The rule now says so: **Approved when 2 of the 3 people
  checks pass** (circle leads, all members, admins & advisors); the screen counts "N / 3 people checks passed". The AI
  panel says "Advice" and, when the check fails, "Couldn't check" instead of a made-up 75% "✓ Cleared". No proposal
  changes status. `LEXICON.md` and the M09 README state the rule.
- **Operations**: the board title is "Operations" when no sprint is set (was "Community Projects"); "27 active ·
  262 tasks" (was deliverables); home "Latest tasks".
- **Members**: "Your requests", "No requests yet" (were seeks).
- Text only: no data, address or behaviour changes.

### no module numbers in the v4 look

- **The v4 look shows no module numbers** (Sonia, 19 Nov: "only in the new look"). With `"design": "v4"`, labels
  like "M01 · Members" or "Module 07 · Operations" read just "Members" / "Operations", and number badges ("M08") are
  hidden. The current look is unchanged. Text labels go through `modLabel()` (`core/lib/module-label.ts`); number-only
  badges carry the `mod-num` class, hidden under v4 in `globals.css`. The sidebar's own numbers are left to the menu
  rebuild.

- No data or address changes; the only behaviour change is the AI check's failure answer (`confidence: null`).

## v4.40.0 — 2026-11-19 — one vocabulary (from Protopia, Sonia)

- **`LEXICON.md`**: one word per idea, for screens, emails, agent prompts and the second brain. Approved by Sonia
  on 2026-11-18. `AGENTS.md`, `CLAUDE.md` and `DOCS.md` point to it.
- **Every module's address matches its name**: `/members`, `/operations`, `/achievements`, `/calendar`,
  `/accommodation`, `/resources`, `/circles`; `/network/seeks` becomes `/members/requests`. The old addresses
  redirect permanently (`web/next.config.ts`), so links in second-brain notes and emails keep working. New links
  from the project manager and meetings use the new addresses. Profiles stay at `/u/{username}`. The assistant's Do still finds the project from either address.
- **Task**, not deliverable or subtask: the Operations tab and stat, the project page ("Tasks · N", "New task…"),
  board cards ("no tasks"), the landing page and home. `?tab=deliverables` still opens the Tasks tab. The table
  keeps its name.
- **Words**: board column "Backlog" → "To do" (Paused stays); "Seeks" → Requests; "Community Network" / "Network" → Members;
  "Contributions" → Achievements as the module name; role labels in sentence case ("Circle lead"); "Collaboration
  proposals" → "Agreements waiting for you"; "+ Propose project" → "+ Suggest a project"; join applications say
  "Declined" not "Rejected"; "the agent" → "the assistant" ("Tell the assistant", task drafts, project-manager panel; Meetings not yet) and "library" → Documents on screen; "org chart" →
  Circles; buttons follow the lexicon ("Start joining →", "Create account", "Open {Page} →", "See all … →").
- **Points log, off by default**: a new `points` switch in `instance/config.jsonc` `modules`. Points are always
  recorded in `points_log` (one row per award, undone with `undo_points()`, never deleted); accepting an agreement
  with a `points_value` logs it. With the switch off, no screen mentions points, reputation or the points demo;
  with it on, Achievements shows your total (`points_total()`). **Migration** `20261209000000_points_log.sql`.
- **Meetings say "the assistant" too** (`LEXICON.md`): the meetings list, a meeting's page, the upload form, the
  notes email and the "couldn't read this meeting" note. The agent's own prompt and second-brain notes are unchanged.

## v4.39.0 — 2026-11-19

- **A switchable new look, "v4"** (Sonia's redesign; prototype in her UI/UX review). Off by default: a community
  turns it on with `"design": "v4"` in `instance/config.jsonc` (`NEXT_PUBLIC_DESIGN`, `core/lib/instance.ts › DESIGN`,
  `data-design="v4"` on `<html>`). It re-points the existing tokens in `globals.css`: a pale blue page with white cards,
  Inter and Inter Tight (`next/font`), labels in light sans capitals instead of mono, black main buttons, module colours
  no longer branding modules, pastel primaries for status (`--st-*`), one soft green action colour (`--action`), rounder
  radii. Pages that hard-code colours and sizes move over module by module in the next releases (DESIGN-SYSTEM.md › v4).
  Light mode only. No migration.

## v4.38.4 — 2026-11-19

- **Suggestions say what accepting does** (Oscar: "its not clear to me what the suggested action is"). Each
  project-manager suggestion is now a plain sentence ("Give the task *Create a recruitment project space* to *Sonia
  Wendorff*"; "These look like the same piece of work. Keep *A* and fold *B* into it…"), the reason follows as "Why:",
  and the button names the action: **Give it to Sonia**, **Merge them**, **Move it**, **Create the project**. Clearer
  headings: Same task twice · Belongs in a project · Start a project · Who could take it. No migration.

## v4.38.3 — 2026-11-19

- **Put a suggestion somewhere else before accepting it** (Oscar). On a project-manager suggestion for a new
  project, **Put it in…** offers a new project in another circle or one of its teams, or adding the tasks to an
  existing project. Choosing a project warns first ("No new project: these 3 tasks move into Cacao Pilot
  Initiative"), and Accept becomes **Move them in**. A "move into a project" suggestion can pick a different project.
  The tasks' circle and team follow the project they land in; only leads of the target circle (and admins) can put
  them there. Undo puts the tasks back in their project and circle. No migration.

## v4.38.2 — 2026-11-19

- **Clicking the module you're in reloads it** (Oscar). In the side menu, the module you're already on now loads
  afresh: its front page, filters and pop-ups reset, the latest data. Cmd/Ctrl-click still opens a new tab. No
  migration.

## v4.38.1 — 2026-11-19

- **A circle's leads are its members** (Oscar: "if you are a lead of a circle, you are automatically a member").
  Trigger `circle_leads_are_members` on `user_profiles`: whoever leads a circle (role circle_lead + lead_circles) is in
  its circle unit as 'lead'; a circle they stop leading keeps them as a member. Today's leads were added (Protopia: 41
  memberships). The member lists on the Circles page and in Ops › Circles show the other members (leads have their own
  row); Admin › Users, My circles and the second brain count leads as members. **Migration**
  `20261208000000_leads_are_members.sql`.

## v4.38.0 — 2026-11-19

- **Two board views** (Oscar: see just tasks, all of them even those in projects; or the projects, with the tasks that
  have no project yet). A **Projects | All tasks** switch at the top of the board. **Projects** is the board as before:
  project cards, plus the tasks with no project. **All tasks** shows every task as its own card, each tagged with its
  project (▣), in Backlog / In progress / Review / Done; drag them between columns and open them in their pop-up right
  there. The circle, role and overdue filters work in both. The view is in the address (`/ops?view=tasks`), so a
  reload or a shared link keeps it. No migration.

## v4.37.0 — 2026-11-19

- **Projects belong to a team, or to the whole circle** (Oscar: "a link between the teams that are added to circles
  and projects… tagged to a team in a circle or the circle alone"). `projects.team_id` → `org_units` (teams only;
  trigger `projects_team_circle`: a team sets the circle, another circle takes it off the team), chosen with chips
  ("Whole circle" or a team) on the new-project form and in the project's settings (`m07-ops/TeamPicker.tsx`). The
  team shows on the board card and the project page; a new task in a project starts on its team (trigger
  `deliverables_default_team`). Team cards on the Circles page list their projects, and each circle's README in the
  second brain lists each team's projects. Ask / Do can set a project's team.
- **Ops › Circles: open a circle to see its projects** (Oscar), grouped into the whole circle's and each team's,
  each linked with its status.
- **Migration** `20261207000000_project_teams.sql`. Dry run on Protopia (rolled back): giving a project the Website
  team put it in Marketing; a new task in it started on Website; another circle took it off the team; a whole circle
  was refused as a team.

## v4.36.1 — 2026-11-19

- **An accepted suggestion stays until you reload** (Oscar: leave it as accepted so you can click it and open the
  project; after a refresh it doesn't have to come back). Accepting marks it **✓ Accepted** in place with
  **Open project →** (or **Open task →**) to where it went; the accept route now returns that (`result`). No migration.

## v4.36.0 — 2026-11-19

- **Tell the agent what to do instead of a suggestion** (Oscar: on "cacao import and export operations" he wants to
  say "add this to the incubator cacao project tasks"). Each project-manager suggestion gets **✦ Tell the agent…**
  next to Accept and Dismiss: the lead's words go to the agent with the suggestion attached (what it proposed, its
  tasks, its reason), the agent shows the changes on its confirm card, and once they're made the suggestion is closed
  with the instruction kept (`agent_suggestions.decided_note`). The project manager reads those notes, so it learns
  what each circle wanted.
- **The agent is a floating dot on every page** (Oscar: "always talk with the myconet agent to instruct it to do
  things… a floating dot people can click to interact with things on the page theyre seeing"). The "Ask …" pill is
  now a small ✦ dot; signed in, it opens on Do. Every Do request says what's on screen (`core/lib/agent-context.ts`
  → `assistant/lib/do-context.ts`): the page, the project page you're on, the task whose pop-up is open, the meeting
  and its tasks, the circle the board is filtered to. So "give this to Sonia", "move these here" and "confirm the
  drafts from this meeting" work. `instructAgent()` lets any page hand it an instruction.
- **Migration** `20261206000000_suggestion_notes.sql` (`agent_suggestions.decided_note`).

## v4.35.0 — 2026-11-18

- **Circle members, in four places** (Oscar: "a way to include users as circle member"; "add members on the circle
  page similar to how you can add team"). A circle's members are `org_unit_members` of its circle unit, as before;
  the database decides who adds them (admins and the circle's leads).
  - **Circles page** (`/org`): "+ Add member" under each circle's members, like "+ Add team"
    (`m17-org/AddCircleMember.tsx`, a quick people search).
  - **Ops › Circles**: each circle shows its members, with the same "+ Add member" for its leads and admins.
  - **Admin › Users**: "Member of" circle chips per person, saved straight away.
  - **Ask to join**: "My circles" on your own profile (`m17-org/MyCircles.tsx`) shows your circles and lets you
    ask to join another (with a line for the leads) or withdraw. The circle's leads and admins see the requests on
    the Circles page (`JoinRequests.tsx`) and approve (they become a member) or decline: `decide_circle_join()`.
- **The second brain knows who's in each circle**: the circle's README lists its members and its teams with their
  people, and joining or leaving refreshes it on the next board review (trigger on `org_unit_members`).
- **Migration** `20261205000000_circle_join_requests.sql` (`circle_join_requests`, `decide_circle_join()`, the
  trigger). Dry run on Protopia (rolled back) as real roles: an explorer asks and can't approve their own request;
  the circle's lead sees and approves it; the explorer becomes a member; the second-brain refresh is queued.

## v4.34.0 — 2026-11-18

- **A task needs no project** (Oscar: "its better that a task can be created without having any project assigned").
  `deliverables.project_id` is now nullable: a task with no project is on the main board, tagged with its circle.
  The hidden per-circle **chores projects are gone**: their tasks moved onto the board (Protopia: 150) and the 12
  projects were deleted, with `chores_project()` / `chores_project_for_server()`. "+ Task" on the board, meetings
  (a task the agent isn't very sure belongs to a project) and Ask / Do's "move to the board" all make tasks with no
  project. Permissions are unchanged: `private.can_manage_project(null)` is the role check (admins, circle leads,
  project leads), as for the chores tasks.
- **One task pop-up, on the board too** (`m07-ops/TaskModal.tsx`, shared by the board and project pages). A task with
  no project opens right on the board (`/ops?task=<id>`), and closing it leaves you there. New in it: **Project**
  (see which project a task is in, file it into another, or "No project · on the board") and **Team** (one of its
  circle's teams from the org chart; choosing a team sets the circle, another circle takes it off the team).
  `deliverables.team_id` → `org_units` (teams only, trigger `deliverables_team_circle`). Ask / Do can set both.
- `m07-ops/lib/task-options.ts` loads the pop-up's people, open projects and teams for both pages.
- **Migration** `20261204000000_tasks_without_projects.sql`. Dry run on Protopia (rolled back): 150 tasks onto the
  board, none without a circle; a circle lead can add a task with no project, an explorer can't; the team rules hold.

## v4.33.6 — 2026-11-18

- **A Paused column on the main board** (Oscar), after Done: paused projects (including ones merged into another)
  are visible, and a lead can drag a project there to pause it or out of it to restart it. Projects only: a task
  can't be dropped there. The task board inside a project is unchanged.

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

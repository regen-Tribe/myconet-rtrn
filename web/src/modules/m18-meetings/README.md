# M18 — Meetings (optional)

Built by Sonia for Protopia (Nov 16). Meeting recordings are transcribed and summarised by
[Fireflies.ai](https://fireflies.ai); the notes (summary, action items by person, transcript) show at
`/meetings`. **Off unless the community turns it on** in `instance/config.jsonc`: `"modules": ["meetings"]`.

## Two ways in

1. **Upload** (`/meetings/upload`, joining members and above): the browser puts the audio in the private
   `meeting-audio` bucket under the person's id → `/api/meetings/upload` records the meeting
   (`status: processing`) and sends Fireflies a 2-hour signed link → Fireflies calls
   `/api/fireflies-webhook?key=FIREFLIES_WEBHOOK_SECRET` when done → the row gets the summary,
   action items and transcript (`status: done`, or `error`).
2. **Recorded in Fireflies directly**: Fireflies' webhook calls
   `/api/fireflies-ingest?key=PROTOPIA_INGEST_SECRET` → a new row with `source: fireflies_direct`,
   `needs_review: true`. A meeting already in (an upload, by its `client_reference_id`, or the same Fireflies id)
   gets its notes refreshed instead, and is read again when the summary is new (v4.32.1), so a community's filter
   can be the only webhook Fireflies needs.
3. **The summary comes later** (Webhooks V2, v4.21.2): Fireflies writes the summary and action items a few
   minutes after the transcript, so the two webhooks above often get the transcript only. Its V2 webhook
   (`app.fireflies.ai/integrations/api/webhook`, events **meeting.transcribed** and **meeting.summarized**,
   URL `/api/fireflies-events`, signing secret = `FIREFLIES_SIGNING_SECRET`) fetches the notes again and runs
   the pipeline again, **only for meetings already in** (an upload, or one the ingest let in). It never adds a
   meeting: the Fireflies account may record other calls, and what comes in is decided by 1 and 2 alone
   (Protopia: Sonia's filter in front of the ingest). Notes already in are never blanked. Unsigned or wrongly signed calls get a 401.

**Meeting documents** (v4.22.0): at the bottom of a meeting page, one tab per document there is: Fireflies'
**Notes**, **Outline**, **Bullet points**, **Topics & keywords** (`fireflies_notes`, fetched by
`/api/fireflies-events` in a query of its own, `fetchFirefliesNotes()`, so a field Fireflies doesn't fill never
stops the transcript), the **Second brain** note (read from the repo as it is now, `readNote()`, front matter
off) and the **Transcript**. `NotesText.tsx` shows their markdown as React elements, never HTML.

## Secrets (Cloudflare, `npx wrangler secret put …`)

`FIREFLIES_API_KEY`, `FIREFLIES_WEBHOOK_SECRET`, `FIREFLIES_SIGNING_SECRET` (the V2 webhook's signing secret), `PROTOPIA_INGEST_SECRET` (the ingest key; the name is
historical), `SUPABASE_SERVICE_ROLE_KEY` (the webhooks write with it: `core/lib/supabase/service.ts`).

## Files

| File | Purpose |
|------|---------|
| `MeetingsList.tsx`, `MeetingDetail.tsx`, `UploadForm.tsx` | The three pages' UI |
| `NotesText.tsx` | The documents' markdown (headings, bullets, bold, links) as React elements |
| `lib/fireflies.ts` | Fireflies GraphQL: `uploadAudio`, `fetchTranscript`, transcript text, action-item parsing |
| `lib/access.ts` | Pages: module on + joining or above |
| `app/meetings/**`, `app/api/meetings/upload`, `app/api/fireflies-webhook`, `app/api/fireflies-ingest`, `app/api/fireflies-events` | Routes |

## The meeting pipeline (v4.21.0)

Most meetings come **straight from Fireflies** (`/api/fireflies-ingest`); uploads (`/api/fireflies-webhook`)
work the same way. When the notes are in, the meeting waits (`processed_at` null) and **the sweep** runs
`lib/pipeline.ts` (service role) within about 2 minutes, with 150 s for the AI (v4.32.1). The webhooks never run
the AI themselves: a Worker gets only about 30 s after replying, too little for a long meeting.

1. **The agent reads the meeting** (`lib/draft-tasks.ts`, MiniMax M3.1-Flash, low reasoning, one call) against
   the community's circles (with their org-chart descriptions), the open projects and the open tasks:
   - **Is it a community meeting?** The same Fireflies account may record other calls. No, or not sure →
     nothing goes on the board, to the second brain or by email; the meeting waits as *Needs review* with the
     agent's reason (`agent_note`), and a lead can set the circle to go on.
   - **Its main circle** (most of the discussion and work), or none for a community-wide meeting (a morning
     sync with circle reports). A circle a person chose (at upload or on the meeting page) is kept.
     `circle_source` says who chose it.
   - **The tasks:** one per agreed piece of work, from the action items, summary and transcript (first 40k
     characters); adds what was agreed but missed by Fireflies, skips what's on the board. **Each task has its
     own circle**, a person, a date/time if one was said (relative to the meeting day, in
     `COMMUNITY_TIME_ZONE`), and goes on the **main board** tagged with its circle (in that circle's **Chores**, shown on the board as cards of their own since v4.24.0), or in an open project of the same circle **only when the agent is very sure** it's part of that project's work, with its reason logged (`project_reason` in `agent_actions`, v4.24.3). Drafts: `needs_review=true`, `source='meeting'`, `source_meeting_id`, `source_item`.
   - Without the AI (no key, over budget, unreadable): the action items go on as they are, but only when a
     person set the circle; otherwise the meeting waits for a lead.
2. **People:** `lib/people.ts` matches the name to a member (full name, username, a first name only one
   member has). No match is normal (not everyone has an account): the task keeps "(for Name)" and no
   assignee, and the email lists them as "not on MyCoNet yet".
3. **No duplicates:** `meeting_action_links` (meeting + normalised title) is claimed before each task is
   written, so a re-run or a repeated webhook adds only new tasks. A task a lead declines or deletes keeps its link
   (with no task, v4.33.0), so it isn't drafted again.
4. **Name** (v4.23.0): the same AI call names the meeting from the title people gave and the content;
   the title becomes `17.11.2026 <name>` (date in `COMMUNITY_TIME_ZONE`), what they called it stays in
   `original_title` (shown small on the meeting page; the AI reads it, not its own earlier name).
   **Second brain** (`lib/second-brain.ts`): `<knowledge.meetingsFolder>/YYYY-MM-DD <name>.md` in `knowledge.repo`
   (default `operations/meetings`; Protopia `community coordination operations/meetings`), committed by
   "MyCoNet agent" (`SECOND_BRAIN_GITHUB_TOKEN`): front matter (main circle or `community`, `circles: […]`,
   `visibility: members|circle`, `source: myconet-meeting`), who was there, topics, keywords, the summary,
   Fireflies' bullet points, notes and outline, the tasks grouped by circle with links, Fireflies' action
   items, and a link to the **transcript** in `transcripts/<same name>` beside it. A renamed meeting (or a
   moved folder) **moves**: the agent removes its own old files (only files with `source: myconet-meeting…`,
   never a person's note). `notes_version` = `NOTES_VERSION`: the sweep rewrites older notes.
   **The sweep** (`/api/meetings/sweep`, `MEETINGS_SWEEP_SECRET`) is where the agent runs. Every 2 minutes the database (`private.meetings_sweep()`,
   pg_cron + pg_net, URL + key in Vault: `myconet_url`, `meetings_sweep_secret`) calls it when a meeting is
   unprocessed or its note is older, **one request per meeting** (a Worker may make only 50 outside calls per
   request on the free plan, so the pipeline writes tasks, links and logs in batches); it refreshes missing
   Fireflies notes, runs the pipeline with 150 s for the AI, at most 3 tries a meeting. When the AI gives no answer
   (too slow, down, unreadable) the meeting stays unprocessed, so the next sweep tries again.
5. **Email** (`lib/notes-email.ts`, based on Sonia's; `lib/smtp.ts` is hers unchanged): to the **leads of every
   circle involved, at the email on their account**, plus `meetings.notesEmail.alwaysTo` usernames. Not to
   outside attendees. Once automatically; "Email the notes again" sends again.
6. **Log:** circle choice, skips, every task, note and email in `agent_actions` (admins read it).

Leads (admins, circle leads, project leads) on the meeting page: change the circle or Circle only, let the agent
read it / look for new tasks again, confirm all drafts, email again: `POST /api/meetings/[id]` with
`action: settings | process | email | confirm`. Changing the circle later doesn't move tasks already on the board.

**Who reads meetings:** joining members and above, as before, except **Circle only** meetings
(`visibility='circle'`): only that circle's members (its teams in /org), its leads and admins
(`private.in_circle()`, restrictive RLS).

**Where people find them:** `/meetings` (circle chips, *My circles*, *All*, search, *Needs review* for leads;
`?circle=<slug>|mine|all`), a **📝 Meeting notes (N)** button on each circle in `/org` and in Operations ›
Circles, and a "📝 From a meeting" link in a task's pop-up. The board gets a **Drafts** card that opens the
Deliverables tab filtered to drafts.

## Settings (instance/config.jsonc)

```jsonc
"timeZone": "America/Costa_Rica",
"knowledge": { "repo": "owner/second-brain", "branch": "main" },          // + SECOND_BRAIN_GITHUB_TOKEN
"meetings": { "notesEmail": { "from": "x@gmail.com", "smtpHost": "smtp.gmail.com", "smtpPort": 465, "alwaysTo": [] } }  // + MEETINGS_SMTP_PASSWORD
```
Each part is off until its settings and secret exist. SMTP needs the Worker runtime (`cloudflare:sockets`):
under `next dev` a send reports an error.

## Database

Migration `supabase/migrations/20261121000000_meetings.sql`: `meeting_transcripts` (read: joining members
and above; writes through the server routes) and the private `meeting-audio` bucket (each person's own folder).
Migration `20261124000000_meeting_pipeline.sql`: meeting `visibility` + pipeline columns, `private.in_circle()`
and the Circle-only policy, `meeting_action_links`, `agent_actions`, `chores_project_for_server()` (service role).
Migration `20261125000000_meeting_fireflies_notes.sql`: `fireflies_notes` jsonb (the documents' tabs).

# Portal assistant

"Ask <community>" chat on every portal page (`AssistantChat.tsx`, mounted in `AppShell`). It answers
from the community Blueprint's answers and the documents in its library, cites sources
("Handbook p. 12", "Blueprint · 1.1 Finding Your Why"), and says when the material doesn't cover a question.

| Piece | What |
|---|---|
| `app/api/assistant/route.ts` | POST `{ messages }` → streamed answer (MiniMax-M3.1-Flash, low reasoning). Visitors: 2 questions per IP per 30 days (`X-Assistant-Remaining`), then 401 `needLogin`. Signed in: 200/day. |
| `lib/context.ts` | Blueprint answers as text; documents in full when ≤300k characters, else the pages that best match the conversation; the instructions (`assistantPrompt`). |
| `lib/library.ts`, `DocumentKindPicker.tsx` | The library (`community_documents`): every upload is asked to be **Shareable** (anyone using the assistant) or **Sensitive** (admins and circle leads only). |
| `m04-blueprint/DocumentsStep.tsx` | Blueprint › 📚 Documents: list, add, rename, re-classify, remove. The Blueprint import also asks and adds the document. |

**Who sees what is enforced by RLS**, not by the app: the assistant loads documents with the asker's own
session, so visitors and members only ever get shareable documents into their answers.
Usage counting: `assistant_count_question()` over `private.assistant_usage`.

**Question log:** every question and answer is saved (`assistant_questions`, admins only); answers the sources don't cover end with a hidden `[[NOT_COVERED]]` marker, stripped from the stream and logged as `answered = false`. Admins triage them in Admin › Questions.

## Ask / Do (v4.26.0)

Signed in (joining members and above), the pop-up has **Ask | Do** tabs. In **Do** a person tells the agent what to
change on the board in plain words ("merge the 4 elements project into the 5 senses project"):

1. `POST /api/agent/plan { instruction, history }` → `lib/do-plan.ts` (MiniMax Flash, one call) reads the request
   against the board (projects P1…, open tasks T1…, people, circles) and proposes changes (`DoAction`s with real ids),
   or asks one question when it's unclear. **Nothing changes yet.**
2. The **confirm card** lists each change in plain words written by MyCoNet (`describe()` in `lib/do-actions.ts`, not
   by the AI), and marks the ones this person may not make (`blocked()`). **Do it** / **Cancel**.
3. `POST /api/agent/do { actions, instruction }` reads the board again, checks each change again with the person's
   rights (nothing from the card is trusted), makes it (`execute()`), and logs it in `agent_actions`
   (`actor: 'agent-do'`, `do_<kind>`, `requested_by`, `detail.rows` = every changed row's values before,
   `detail.created`). The circles touched get a project-manager review (their board notes stay current).
4. **Undo** on the card (and in the board's 🧭 panel): `/api/ops/agent-actions/[id]` puts the rows back and removes a
   project it made when empty. The person who asked, the circle's leads and admins can undo.

| Change | Who may (besides admins) |
|---|---|
| `create_circle` (name, purpose → its org-chart description, emoji; undo retires it) | circle leads |
| `merge_projects` (tasks move, the other project is set aside as paused), `rename_project` | the projects' leads/creators, the circle's leads |
| `create_project` (+ its tasks), `move_tasks` (into a project, or onto the main board) | the circle's leads; moves also the projects' leads |
| `rename_task`, `assign_task`, `confirm_drafts` | the task's circle or project leads |
| `set_task_date`, `set_task_status` | also the person on the task |

### What's on screen, and instructions from other pages (v4.36.0)

The chat is a small floating ✦ dot; signed in, it opens on Do. Each Do request sends `context`: the address, plus
what pages and pop-ups set with `setAgentContext()` (`core/lib/agent-context.ts`: a project page its `project_id`,
the task pop-up its `task_id`). `lib/do-context.ts` turns it into lines for the planner with the same T/P
references (the project or task open, a meeting and its tasks, the board's circle filter). Any page can hand the
agent an instruction with `instructAgent(text, ctx)`; the project manager's **✦ Tell the agent…** sends one with
`suggestion_id`, and once the changes are made the suggestion is closed as `dismissed` with the instruction in
`agent_suggestions.decided_note` (the project manager reads those notes).

### General changes: anything the person may do (v4.29.0)

"The agent can do anything on MyCoNet this person's permissions allow." Besides the board changes above, the agent
can change any field in the catalogue (`lib/do-catalog.ts`: people's role and circle leadership, circles, org-chart
units, projects, tasks) and add or remove people in the org chart. These are made **with the person's own session**,
so the database's own rules (RLS, the `guard_profile_privileges` trigger) decide, exactly as for their own clicks;
MyCoNet adds no rights. The card shows each field before → after; Undo puts the old values back, again as the
person. Example: "make Sonia a circle lead of Kitchen" → *Person "Sonia Wendorff": role member → circle lead;
leads the circles — → Kitchen* (admins only, like Admin › Users). An admin made circle lead stays admin. To reach
more of MyCoNet, add tables and fields to `CATALOG` (bookings and governance are next). At most 8 changes
per request (Cloudflare's 50 outside calls per request).

### Calendar events (v4.65.0)

Oscar: "we want the agent to be able to change events on the calendar - update time, date, notes in it".
`lib/do-events.ts` adds one change, `change_event`: the date, start, end and all-day; the title, description
(notes), place and online link. The planner sees the events from a week back to two months ahead (daily ones only
for the next week) as E-refs in the community's time zone, plus the one open on the Calendar (`/calendar?event=…`,
so "move this to 7" works). A new date keeps the times; a new start keeps the length; an end before the start
means past midnight. The same rules as the Calendar, made with the person's own session:
- **time**: `event_set_times` (joining members and up, as on the Calendar); an event from the linked Google
  calendar moves there too
- **title, description, place, link**: an update under the events RLS (its host, an admin, or a lead of its
  circle); refused on events from the Google calendar, whose description is their notes (`event_set_notes`, full
  members)
- then the Google copy follows (`m14-events/lib/google-push.ts`, the code `/api/calendar-push` uses). The card shows
  before → after and says first when the person can't; Undo puts the old values back, as the person, and in Google.

